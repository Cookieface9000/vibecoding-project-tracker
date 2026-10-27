import SignInForm from '@/components/SignInForm';
import { SetupNotice } from '@/components/Notice';
import { getSignedInUser } from '@/lib/current-user';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const metadata = { title: 'Sign in · Vibe Tracker' };
export const dynamic = 'force-dynamic';

// The only page signed-out visitors can see (src/proxy.ts). Existing users only: no registering.
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/' } = await searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <main className="p-6">
        <SetupNotice />
      </main>
    );
  }

  // Shown before signing in, so only what's needed to pick someone: no emails.
  const [{ data }, current] = await Promise.all([
    supabase().from('members').select('id, name, username, avatar').not('username', 'is', null).order('created_at', { ascending: true }),
    getSignedInUser(),
  ]);
  const users = (data ?? []) as { id: string; name: string; username: string; avatar: string | null }[];

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-[14px] font-bold text-brand-fg" aria-hidden>
            V
          </span>
          <span className="text-[18px] font-semibold tracking-[-0.01em] text-fg">Vibe Tracker</span>
        </div>
        <SignInForm users={users} next={next} currentName={current?.name ?? null} />
      </div>
    </main>
  );
}
