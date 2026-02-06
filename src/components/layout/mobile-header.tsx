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
            <div className="h-16 border-b bg-slate-900 text-white flex items-center justify-between px-4 z-50 relative">
                <span className="font-bold text-lg tracking-tight">Brownstreet</span>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-white hover:bg-slate-800">
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div
                        className="absolute top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-slate-900 shadow-xl overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Sidebar user={user} />
                    </div>
                </div>
            )}
        </div>
    );
}
