import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { LOCALE } from '@/editor/i18n';
import './globals.css';

// CUSTOMIZATION: font. Loaded here and exposed as --font-roboto; globals.css hands it to CE.SDK's
// theme (`--ubq-typography-font_family`) and to the React screens.
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-roboto' });

export const metadata: Metadata = {
  title: 'Comic Studio · CE.SDK PoC',
  description: 'Proof of concept: AI-generated comic assets (backgrounds and objects) with IMG.LY CE.SDK',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={LOCALE} className={`${roboto.variable} h-full antialiased`}>
      <body className="h-full flex flex-col font-sans text-(--cs-text) bg-(--cs-canvas)">{children}</body>
    </html>
  );
}
