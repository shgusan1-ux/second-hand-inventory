import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: '(주)에이치엠이커머스 온라인 재고관리 시스템',
  description: '(주)에이치엠이커머스 중고의류 재고 관리 시스템',
};

import { getSession } from '@/lib/auth';

// ...

import { MobileHeader } from '@/components/layout/mobile-header';

// ...

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="ko">
      <body className={cn(inter.className, outfit.variable)}>
        <div className="flex h-screen bg-slate-50 flex-col md:flex-row">
          <MobileHeader user={session} />
          <aside className="hidden md:flex flex-shrink-0 h-full">
            <Sidebar user={session} />
          </aside>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
