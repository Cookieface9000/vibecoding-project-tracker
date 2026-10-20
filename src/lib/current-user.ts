import 'server-only';
import { cache } from 'react';
import { supabase } from './supabase';

// Until sign-in exists, the current user is the placeholder member "Me".
// Swap this one function for the authenticated user when auth is added.
export const CURRENT_USER_NAME = 'Me';

export interface CurrentUser {
  id: string;
  name: string;
  teamIds: string[];
}

/** The current user and the teams they belong to (cached per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const db = supabase();
  const { data: me, error } = await db.from('members').select('id, name').eq('name', CURRENT_USER_NAME).single();
  if (error || !me) throw new Error(`Current user "${CURRENT_USER_NAME}" not found in members`);
  const { data: memberships, error: tmError } = await db.from('team_members').select('team_id').eq('member_id', me.id);
  if (tmError) throw new Error(`Failed to load teams: ${tmError.message}`);
  return { id: me.id, name: me.name, teamIds: (memberships ?? []).map((m) => m.team_id as string) };
});

/** Can the current user see (and work in) this project? Creator, or member of its team. */
export function canSee(user: CurrentUser, project: { created_by: string | null; team_id: string | null }) {
  return project.created_by === user.id || (project.team_id !== null && user.teamIds.includes(project.team_id));
}
