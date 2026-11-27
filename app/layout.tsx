import './globals.css';

import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from 'next/font/google';

import { Analytics } from '@vercel/analytics/next';

import { AppProvider } from '@/context/AppContext';

// One family in two cuts, drawn so 0/O and 1/l/I never get confused in filenames and hex values
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson' });
const atkinsonMono = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-atkinson-mono' });

export const metadata: Metadata = {
  title: 'svg-icon-diff',
  description: 'Compare SVG icons visually and as code, and review the icons in a GitHub pull request',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${atkinson.variable} ${atkinsonMono.variable}`}>
      <body className="bg-background text-foreground antialiased">
        <AppProvider>{children}</AppProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
