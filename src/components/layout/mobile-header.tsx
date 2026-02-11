'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Menu, X, Search } from 'lucide-react';
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
        <div className="md:hidden flex flex-col fixed top-0 left-0 right-0 z-50">
            {/* Header Bar */}
            <div className="h-14 border-b border-slate-700/50 bg-black/50 backdrop-blur-md flex items-center px-3 relative">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-white hover:bg-white/10 active:bg-white/20 shrink-0">
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                <div className="flex-1 flex items-center justify-center gap-2">
                    {/* 로고: 흰색 반전 (invert) + 높이 조절 */}
                    <img src="/logo.png" alt="Brownstreet" className="h-4 invert opacity-90" />
                    <span className="text-white/80 text-[10px] font-semibold tracking-tight uppercase">Access</span>
                </div>

                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 active:bg-white/20 shrink-0">
                    <Search className="h-5 w-5" />
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 top-14 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div
                        className="absolute top-0 left-0 w-64 h-[calc(100vh-3.5rem)] bg-slate-900 shadow-2xl overflow-y-auto border-r border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Sidebar user={user} />
                    </div>
                </div>
            )}
        </div>
    );
}
