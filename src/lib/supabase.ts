import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client using the SECRET key (bypasses RLS).
// The `server-only` import makes the build fail if this is ever pulled into
// client code, so the key can't leak into the browser bundle.

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  return Boolean(url && !url.includes('YOUR-PROJECT-REF') && process.env.SUPABASE_SECRET_KEY);
}

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_SECRET_KEY in .env');
  }
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
