import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '(주)에이치엠이커머스 온라인 재고관리 시스템',
  description: '(주)에이치엠이커머스 중고의류 재고 관리 시스템',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'InventoryAI',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang='ko'>
      <body className={cn(`${geistSans.variable} ${geistMono.variable} antialiased`)}>
        <Providers>
          <AppShell user={session}>
            {children}
          </AppShell>
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
