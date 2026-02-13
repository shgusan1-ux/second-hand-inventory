'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileHeader } from './mobile-header';

export function AppShell({ children, user }: { children: React.ReactNode, user: any }) {
    const pathname = usePathname();
    // Standalone pages that don't need the sidebar/header
    const isStandalone = pathname === '/smartstore/vision-analyzer';

    if (isStandalone) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-slate-50 flex-col md:flex-row">
            <MobileHeader user={user} />
            <aside className="hidden md:flex flex-shrink-0 h-full">
                <Sidebar user={user} />
            </aside>
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-8">
                {children}
            </main>
        </div>
    );
}
