import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

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
        <div className="flex h-screen bg-slate-50 flex-col md:flex-row">
          <MobileHeader user={session} />
          <aside className="hidden md:flex flex-shrink-0 h-full">
            <Sidebar user={session} />
          </aside>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <Providers>
              {children}
            </Providers>
          </main>
        </div>
      </body>
    </html>
  );
}
