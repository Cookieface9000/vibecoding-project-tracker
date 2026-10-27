import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { getCurrentUser } from '../current-user';
import { listProjects } from '../data';
import { supabase } from '../supabase';
import { InvalidInput, UUID } from '../task-ops';

// AI connections. Each one has a secret that becomes the last part of its connector URL.
// Only a SHA-256 hash of the secret is stored, so the database alone can't produce a working URL.

/** Who is calling a tool, and what they may do. */
export interface CallerContext {
  caller: string; // shown in history, e.g. "Reviewer – Claude (AI)"
  connectionId: string | null; // null = the in-app Try it panel
  memberId: string | null; // the user it acts as: the connection's creator, or the current user
  canWrite: boolean;
  projectId: string | null; // null = every project the current user can see
}

export interface McpConnection {
  id: string;
  name: string;
  hint: string;
  canWrite: boolean;
  projectId: string | null;
  projectLabel: string | null; // "Demo Board (#DEMO)"
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  state: 'active' | 'expired' | 'revoked';
}

export interface McpCall {
  id: string;
  caller: string;
  tool: string;
  summary: string;
  ok: boolean;
  detail: Record<string, unknown> | null;
  at: string;
}

export const EXPIRY_DAYS = [1, 7, 14, 30] as const;
const RATE_LIMIT_PER_MINUTE = 60;

export const callerName = (connectionName: string) => `${connectionName} (AI)`;

export function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

/** Create a connection. The secret is returned once and never stored. */
export async function createConnection(input: { name: string; canWrite: boolean; projectId: string | null; days: number }) {
  const name = input.name.trim();
  if (!name) throw new InvalidInput('Give the connection a name.');
  if (name.length > 60) throw new InvalidInput('Name must be 60 characters or fewer.');
  if (!EXPIRY_DAYS.includes(input.days as (typeof EXPIRY_DAYS)[number])) throw new InvalidInput('Choose how long it lasts.');
  if (input.projectId) {
    if (!UUID.test(input.projectId)) throw new InvalidInput('Choose a valid project.');
    const visible = await listProjects();
    if (!visible.some((p) => p.id === input.projectId)) throw new InvalidInput('Choose a project you can see.');
  }

  const secret = 'vt_' + randomBytes(32).toString('base64url');
  const user = await getCurrentUser();
  const { error } = await supabase()
    .from('mcp_connections')
    .insert({
      name,
      token_hash: hashSecret(secret),
      token_hint: secret.slice(0, 7),
      can_write: input.canWrite,
      project_id: input.projectId,
      created_by: user.id,
      expires_at: new Date(Date.now() + input.days * 86_400_000).toISOString(),
    });
  if (error) throw new Error(`Couldn't create the connection: ${error.message}`);
  return secret;
}

/** The current user's connections, newest first. */
export async function listConnections(): Promise<McpConnection[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase()
    .from('mcp_connections')
    .select('id, name, token_hint, can_write, project_id, created_at, expires_at, last_used_at, revoked_at, project:projects(name, code)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load connections: ${error.message}`);
  type Row = {
    id: string;
    name: string;
    token_hint: string;
    can_write: boolean;
    project_id: string | null;
    created_at: string;
    expires_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
    project: { name: string; code: string } | null;
  };
  const now = Date.now();
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    hint: r.token_hint,
    canWrite: r.can_write,
    projectId: r.project_id,
    projectLabel: r.project ? `${r.project.name} (#${r.project.code})` : null,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    lastUsedAt: r.last_used_at,
    state: r.revoked_at ? 'revoked' : Date.parse(r.expires_at) <= now ? 'expired' : 'active',
  }));
}

export async function revokeConnection(id: string) {
  if (!UUID.test(id)) throw new InvalidInput('Invalid connection.');
  const user = await getCurrentUser();
  const { error } = await supabase()
    .from('mcp_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', user.id)
    .is('revoked_at', null);
  if (error) throw new Error(`Couldn't revoke: ${error.message}`);
}

/** The caller behind a secret, or null if it's unknown, revoked or expired. */
export async function authenticate(secret: string): Promise<CallerContext | null> {
  if (!/^vt_[A-Za-z0-9_-]{43}$/.test(secret)) return null;
  const db = supabase();
  const { data } = await db
    .from('mcp_connections')
    .select('id, name, can_write, project_id, created_by, expires_at, last_used_at, revoked_at')
    .eq('token_hash', hashSecret(secret))
    .maybeSingle();
  if (!data || data.revoked_at || Date.parse(data.expires_at) <= Date.now()) return null;

  // "Last used" only needs minute precision; skip the write on rapid calls.
  if (!data.last_used_at || Date.now() - Date.parse(data.last_used_at) > 60_000) {
    await db.from('mcp_connections').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  }
  return { caller: callerName(data.name), connectionId: data.id, memberId: data.created_by, canWrite: data.can_write, projectId: data.project_id };
}

/** True when a connection has made too many tool calls in the last minute. */
export async function isRateLimited(connectionId: string) {
  const { count } = await supabase()
    .from('mcp_calls')
    .select('id', { count: 'exact', head: true })
    .eq('connection_id', connectionId)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString());
  return (count ?? 0) >= RATE_LIMIT_PER_MINUTE;
}

export async function recordCall(ctx: CallerContext, call: { tool: string; summary: string; ok: boolean; detail?: Record<string, unknown> }) {
  await supabase()
    .from('mcp_calls')
    .insert({
      connection_id: ctx.connectionId,
      member_id: ctx.memberId,
      caller: ctx.caller,
      tool: call.tool,
      summary: call.summary,
      ok: call.ok,
      detail: call.detail ?? null,
    });
}

/** The current user's recent tool calls (their connections and Try it), newest first. */
export async function listRecentCalls(limit = 30): Promise<McpCall[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase()
    .from('mcp_calls')
    .select('id, caller, tool, summary, ok, detail, created_at')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load AI activity: ${error.message}`);
  return (data ?? []).map((c) => ({ id: c.id, caller: c.caller, tool: c.tool, summary: c.summary, ok: c.ok, detail: c.detail, at: c.created_at }));
}
