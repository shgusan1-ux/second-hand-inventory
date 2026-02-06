'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, PlusCircle, Settings, Shirt, RotateCcw, BarChart3, Megaphone, Archive, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
    { name: '대시보드', href: '/', icon: LayoutDashboard },
    { name: '재고 목록', href: '/inventory', icon: Package },
    { name: '재고 등록', href: '/inventory/new', icon: PlusCircle },
    { name: '반품 등록', href: '/returns/new', icon: RotateCcw },
    { name: '폐기 관리', href: '/inventory/discarded', icon: Archive },
    { name: '스마트스토어', href: '/smartstore', icon: ShoppingBag },
    { name: '통계', href: '/statistics', icon: BarChart3 },
    { name: '광고 관리', href: '/ads', icon: Megaphone },
    { name: '설정', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
            <div className="flex h-16 items-center px-4 border-b border-slate-800">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Shirt className="h-6 w-6 text-emerald-400" />
                    <span className="font-bold tracking-tight">Brownstreet</span>
                </Link>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-slate-800 text-emerald-400'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    'mr-3 h-5 w-5 flex-shrink-0',
                                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-300">(주)에이치엠이커머스</span>
                        <span className="text-[10px] text-slate-500">Inventory System</span>
                    </div>
                </div>
                <p className="text-[10px] text-slate-600 text-center">
                    &copy; 2026 Brownstreet
                </p>
            </div>
        </div>
    );
}
