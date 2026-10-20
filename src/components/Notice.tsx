export default function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      {children}
    </div>
  );
}

export function SetupNotice() {
  return (
    <Notice>
      Supabase isn&apos;t configured. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> in{' '}
      <code>.env</code>, then restart <code>npm run dev</code>.
    </Notice>
  );
}
