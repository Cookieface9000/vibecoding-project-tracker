import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import Script from 'next/script';
import AppShell from '@/components/AppShell';
import SettingsProvider from '@/components/settings/SettingsProvider';
import { THEME_COOKIE } from '@/lib/theme';
import './globals.css';

// UI typeface from the UI/UX Pro Max design system: friendly, modern, professional.
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Vibe Tracker',
};

// Applies saved (or OS) theme and accessibility settings before first paint, so
// there's no flash of the wrong colours. The theme is also kept in a cookie (lib/theme.ts),
// so the server renders it too: it carries through signing out and in, and the sign-in page.
const initScript = `(() => {
  try {
    const root = document.documentElement;
    const cookie = (document.cookie.match(/(?:^|; )vt_theme=(dark|light)/) || [])[1];
    const saved = localStorage.getItem('vibetracker.theme') || cookie;
    if (saved && saved !== cookie) document.cookie = 'vt_theme=' + saved + '; path=/; max-age=31536000; samesite=lax';
    const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', dark);
    const prefs = JSON.parse(localStorage.getItem('vibetracker.prefs') || '{}');
    if (prefs.colorVision && prefs.colorVision !== 'none') root.setAttribute('data-cvd', prefs.colorVision);
    if (prefs.reduceMotion) root.setAttribute('data-motion', 'reduce');
  } catch {}
})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const dark = (await cookies()).get(THEME_COOKIE)?.value === 'dark';
  return (
    <html lang="en" suppressHydrationWarning className={`${body.variable} ${mono.variable}${dark ? ' dark' : ''}`}>
      <body>
        <Script id="init-prefs" strategy="beforeInteractive">
          {initScript}
        </Script>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-fg"
        >
          Skip to main content
        </a>
        <SettingsProvider>
          {/* The sidebar stays mounted across pages; only the page inside it changes. */}
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
