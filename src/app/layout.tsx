import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import SettingsProvider from '@/components/settings/SettingsProvider';
import './globals.css';

// UI typeface from the UI/UX Pro Max design system: friendly, modern, professional.
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Vibe Tracker',
};

// Applies saved (or OS) theme and accessibility settings before first paint, so
// there's no flash of the wrong colours.
const initScript = `(() => {
  try {
    const root = document.documentElement;
    const saved = localStorage.getItem('vibetracker.theme');
    const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', dark);
    const prefs = JSON.parse(localStorage.getItem('vibetracker.prefs') || '{}');
    if (prefs.colorVision && prefs.colorVision !== 'none') root.setAttribute('data-cvd', prefs.colorVision);
    if (prefs.reduceMotion) root.setAttribute('data-motion', 'reduce');
  } catch {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${body.variable} ${mono.variable}`}>
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
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
