'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AttendanceClockWidget } from './attendance-clock-widget';
import { ChatWidget } from './chat-widget';
import { LayoutDashboard, Package, PlusCircle, Settings, Shirt, RotateCcw, BarChart3, Megaphone, Archive, ShoppingBag, Users, LogOut, LogIn, Briefcase, Lock, Truck, CreditCard, Shield } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions';

// 1. Dashboard
const mainNav = [
    { name: '대시보드', href: '/', icon: LayoutDashboard },
];

// 2. Inventory Management
const inventoryManagement = [
    { name: '통합 재고 관리', href: '/inventory', icon: Package },
    { name: '반품 관리', href: '/returns', icon: RotateCcw },
    { name: '스마트스토어 관리', href: '/smartstore', icon: ShoppingBag },
    { name: '통계', href: '/statistics', icon: BarChart3 },
];


// 4. Admin & Business Support (User skipped 3?)
const adminSupport = [
    { name: '임직원 소통', href: '/members', icon: Users },
    { name: '경영지원', href: '/business', icon: Briefcase },
    { name: '보안/계정관리', href: '/security', icon: Lock },
    { name: '매출/매입관리', href: '/sales', icon: CreditCard },
];

export function Sidebar({ user }: { user?: any }) {
    const pathname = usePathname();
    const isAdmin = user && ['대표자', '경영지원'].includes(user.job_title);

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
            <div className="flex h-16 items-center px-4 border-b border-slate-800">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <span className="text-sm font-bold tracking-tight">(주)에이치엠이커머스<br /><span className="text-[10px] font-normal opacity-80">관리자 시스템</span></span>
                </Link>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {/* 1. Dashboard */}
                {mainNav.map((item) => {
                    const isActive = pathname === item.href;
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

                {/* 2. Inventory Management */}
                <div className="pt-4 pb-2">
                    <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">재고 관리</div>
                    {inventoryManagement.map((item) => {
                        const isActive = pathname.startsWith(item.href);

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
                </div>


                {/* 4. Admin & Business Support */}
                {isAdmin && (
                    <div className="pt-4 pb-2">
                        <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">관리 및 경영지원</div>
                        {adminSupport.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    pathname.startsWith(item.href)
                                        ? 'bg-slate-800 text-emerald-400'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0',
                                        pathname.startsWith(item.href) ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        ))}
                    </div>
                )}

                {/* 5. Settings */}
                <div className="pt-4 pb-2 border-t border-slate-800 mt-4">
                    <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">환경설정</div>
                    <Link
                        href="/settings"
                        className={cn(
                            'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            pathname.startsWith('/settings')
                                ? 'bg-slate-800 text-emerald-400'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        )}
                    >
                        <Settings
                            className={cn(
                                'mr-3 h-5 w-5 flex-shrink-0',
                                pathname.startsWith('/settings') ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                            )}
                        />
                        설정
                    </Link>
                </div>
            </nav>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <AttendanceClockWidget userId={user?.id} />
                {user && <ChatWidget currentUser={user} />}

                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-300 truncate max-w-[150px]">{user?.name || '방문자'}</span>
                        <span className="text-[10px] text-slate-500">{user?.job_title || '로그인 필요'}</span>
                    </div>
                    {user ? (
                        <form action={logout}>
                            <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800" title="로그아웃">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </form>
                    ) : (
                        <Link href="/login">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800" title="로그인">
                                <LogIn className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>



                <p className="text-[10px] text-slate-500 text-center mt-4 leading-tight">
                    (주)에이치엠이커머스<br />
                    <span className="text-[9px] opacity-70">우리는 남들과 다른 기적을 만드는 사람들</span>
                </p>
            </div>
        </div>
    );
}
