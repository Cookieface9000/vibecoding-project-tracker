import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { supabase } from './supabase';

// Demo sign-in: there are no passwords or accounts to create. Signing in picks an existing
// member and stores their id in a cookie; signing out deletes it, and src/proxy.ts then sends
// every page to /sign-in. AI connections act as the member who created them (runAsMember).
// Swap this file for real authentication when it's added.
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

/** Run `work` as the given member, ignoring the sign-in cookie. */
export function runAsMember<T>(memberId: string, work: () => Promise<T>): Promise<T> {
  return actingAs.run(memberId, work);
}

async function signedInMemberId(): Promise<string | null> {
  const forced = actingAs.getStore();
  if (forced) return forced;
  try {
    const id = (await cookies()).get(CURRENT_USER_COOKIE)?.value;
    return id && UUID.test(id) ? id : null;
  } catch {
    return null; // outside a request (no cookies available)
  }
}

/** The signed-in user and the teams they belong to, or null when signed out (cached per request; one query). */
export const getSignedInUser = cache(async (): Promise<CurrentUser | null> => {
  const id = await signedInMemberId();
  if (!id) return null;
  // The member and their team memberships together, so every page starts one round trip sooner.
  const { data } = await supabase().from('members').select('id, name, username, avatar, team_members(team_id)').eq('id', id).maybeSingle();
  if (!data) return null; // the member was removed: treat as signed out
  const me = data as { id: string; name: string; username: string | null; avatar: string | null; team_members: { team_id: string }[] };
  return { id: me.id, name: me.name, username: me.username, avatar: me.avatar, teamIds: me.team_members.map((m) => m.team_id) };
});

/** The signed-in user. Pages and actions that need one send signed-out visitors to /sign-in. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const user = await getSignedInUser();
  if (!user) redirect('/sign-in');
  return user;
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
