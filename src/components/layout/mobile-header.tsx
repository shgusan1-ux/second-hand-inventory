'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Menu, X, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeatherLogo } from '@/components/ui/weather-logo';

export function MobileHeader({ user }: { user?: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize search query from URL
    useEffect(() => {
        const q = searchParams?.get('q');
        if (q) setSearchQuery(q);
    }, [searchParams]);

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false);
        // Don't close search on route change immediately if it's the search action itself, 
        // but typically we might want to keep it or close it. closing it is safer for UI.
        // setIsSearchOpen(false); 
    }, [pathname]);

    // Focus input when search opens
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            // If empty, remove query param
            router.push(pathname);
            setIsSearchOpen(false);
            return;
        }

        // Preserve existing params if needed, but for now simple search
        // We probably want to search on the smartstore page if we are not there?
        // User is likely on smartstore page.
        // If we want to be safe, assume we search on current page if it supports it, OR redirect to smartstore?
        // Let's stick to current page for now as per "filter" behavior context.
        const params = new URLSearchParams(searchParams?.toString());
        params.set('q', searchQuery);
        router.push(`${pathname}?${params.toString()}`);
        setIsSearchOpen(false);
    };

    return (
        <div className="md:hidden flex flex-col fixed top-0 left-0 right-0 z-50">
            {/* Header Bar */}
            <div className="h-14 border-b border-slate-700/50 bg-black/80 backdrop-blur-md flex items-center px-3 relative transition-all overflow-visible">
                {isSearchOpen ? (
                    <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 w-full">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-white shrink-0">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="상품명, 브랜드..."
                                className="w-full bg-slate-800/80 text-white text-sm rounded-full px-4 py-1.5 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
                            />
                        </div>
                        <Button type="submit" variant="ghost" size="icon" className="text-blue-400 hover:text-blue-300 shrink-0">
                            <Search className="h-5 w-5" />
                        </Button>
                    </form>
                ) : (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-white hover:bg-white/10 active:bg-white/20 shrink-0">
                            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>

                        <div className="flex-1 flex items-center justify-center gap-2">
                            {/* 로고: 날씨 반응형 (WeatherLogo) */}
                            <WeatherLogo className="h-4 invert opacity-90" />
                            <span className="text-white/80 text-[10px] font-semibold tracking-tight uppercase">Access v2.1</span>
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="text-white hover:bg-white/10 active:bg-white/20 shrink-0">
                            <Search className="h-5 w-5" />
                        </Button>
                    </>
                )}
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
