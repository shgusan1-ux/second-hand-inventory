'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileHeader({ user }: { user?: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <div className="md:hidden flex flex-col">
            {/* Header Bar */}
            <div className="h-14 border-b border-slate-700 bg-black flex items-center px-3 z-50 relative">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-white hover:bg-slate-800 active:bg-slate-700 shrink-0">
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <div className="flex-1 flex items-center justify-center gap-2">
                    <img src="/logo.png" alt="Brownstreet" className="h-5" />
                    <span className="text-white text-xs font-semibold tracking-tight">관리자 시스템</span>
                </div>
                <div className="w-10 shrink-0" />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div
                        className="absolute top-0 left-0 w-64 h-full bg-slate-900 shadow-xl overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Sidebar user={user} />
                    </div>
                </div>
            )}
        </div>
    );
}
