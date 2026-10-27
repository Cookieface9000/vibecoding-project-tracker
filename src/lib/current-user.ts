import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { supabase } from './supabase';

// There's no sign-in yet. The current user is whichever member was picked in the sidebar's
// user switcher (a cookie holding their member id), falling back to the placeholder "Me".
// AI connections act as the member who created them (see runAsMember).
// Swap this file for the authenticated user when auth is added.
export const CURRENT_USER_NAME = 'Me';
export const CURRENT_USER_COOKIE = 'vt_member';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CurrentUser {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  teamIds: string[];
}

// Set while an AI connection's request runs, so everything it does happens as that member.
const actingAs = new AsyncLocalStorage<string>();

/** Run `work` as the given member, ignoring the switcher cookie. */
export function runAsMember<T>(memberId: string, work: () => Promise<T>): Promise<T> {
  return actingAs.run(memberId, work);
}

async function chosenMemberId(): Promise<string | null> {
  const forced = actingAs.getStore();
  if (forced) return forced;
  try {
    const id = (await cookies()).get(CURRENT_USER_COOKIE)?.value;
    return id && UUID.test(id) ? id : null;
  } catch {
    return null; // outside a request (no cookies available)
  }
}

/** The current user and the teams they belong to (cached per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const db = supabase();
  const columns = 'id, name, username, avatar';
  const chosen = await chosenMemberId();
  let me = chosen ? (await db.from('members').select(columns).eq('id', chosen).maybeSingle()).data : null;
  // Unknown or removed member in the cookie: fall back to the placeholder user.
  if (!me) me = (await db.from('members').select(columns).eq('name', CURRENT_USER_NAME).maybeSingle()).data;
  if (!me) throw new Error(`Current user "${CURRENT_USER_NAME}" not found in members`);

  const { data: memberships, error: tmError } = await db.from('team_members').select('team_id').eq('member_id', me.id);
  if (tmError) throw new Error(`Failed to load teams: ${tmError.message}`);
  return { id: me.id, name: me.name, username: me.username, avatar: me.avatar, teamIds: (memberships ?? []).map((m) => m.team_id as string) };
});

/**
 * Can the current user see (and work in) this project?
 * Team projects: members of that team only (leaving a team hides its projects, even ones you created).
 * Personal projects: their creator. The Demo Board: everyone.
 */
export function canSee(user: CurrentUser, project: { created_by: string | null; team_id: string | null; is_demo?: boolean }) {
  if (project.is_demo) return true;
  if (project.team_id !== null) return user.teamIds.includes(project.team_id);
  return project.created_by === user.id;
}
