import { Instrument_Sans } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pairly — Найди игру',
  description: 'Приложение для поиска партнеров по падлу, теннису и другим видам спорта',
  icons: {
    icon: '/logo-mark.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${instrumentSans.variable} font-[family-name:var(--font-instrument)]`}>
        <div className="mesh-bg" aria-hidden="true" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
