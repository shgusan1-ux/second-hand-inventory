'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileHeader } from './mobile-header';
import { NotificationCenter } from './notification-center';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GlobalVoiceAssistant } from '@/components/voice/global-voice-assistant';

export function AppShell({ children, user }: { children: React.ReactNode, user: any }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Standalone pages that don't need the sidebar/header
    const isStandalone = pathname === '/smartstore/vision-analyzer' || pathname === '/smartstore/fitting-editor' || pathname === '/inventory/product-editor' || pathname === '/admin/supplier';

    if (isStandalone) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 flex-col md:flex-row relative">
            <MobileHeader user={user} />

            {/* Sidebar Desktop */}
            <aside className={cn(
                "hidden md:flex md:h-screen md:sticky md:top-0 flex-shrink-0 transition-all duration-300 ease-in-out relative group",
                isCollapsed ? "w-0 overflow-hidden" : "w-64"
            )}>
                <Sidebar user={user} />

                {/* Collapse Button (Inside Sidebar) */}
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-12 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-full flex items-center justify-center z-50 transition-opacity opacity-0 group-hover:opacity-100 shadow-lg"
                    title="사이드바 접기"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </aside>

            {/* Expand Button (Floating when collapsed) */}
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="hidden md:flex fixed top-1/2 left-4 transform -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-full items-center justify-center z-[100] shadow-2xl hover:scale-110 active:scale-95 transition-all border border-slate-700"
                    title="사이드바 펼치기"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            )}

            <main className={cn(
                "flex-1 overflow-x-hidden p-3 md:p-8 w-full transition-all duration-300",
                "pt-16 md:pt-8",
                isCollapsed ? "md:max-w-full" : ""
            )}>
                {/* Desktop Notification Center (Absolute Top Right) */}
                <div className="absolute top-4 right-6 z-40 hidden md:block">
                    <NotificationCenter />
                </div>

                <div className="max-w-full overflow-x-hidden">
                    {children}
                </div>
            </main>

            {/* Global Antigravity AI */}
            <GlobalVoiceAssistant />
        </div>
    );
}
