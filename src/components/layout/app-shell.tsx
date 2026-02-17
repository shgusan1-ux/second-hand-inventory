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
        <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row">
            <MobileHeader user={user} />
            <aside className="hidden md:flex md:h-screen md:sticky md:top-0 flex-shrink-0">
                <Sidebar user={user} />
            </aside>
            <main className="flex-1 overflow-x-hidden p-3 pt-16 md:p-8 md:pt-8 w-full">
                {children}
            </main>
        </div>
    );
}
