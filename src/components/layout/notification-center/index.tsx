'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X, Info, AlertTriangle, AlertCircle, Rocket } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    link_url?: string;
    created_at: string;
}

export function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const markRead = async (id: number) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        } catch {
            toast.error('알림 처리에 실패했습니다.');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'deployment': return <Rocket className="w-4 h-4 text-purple-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-rose-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'success': return <Check className="w-4 h-4 text-emerald-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const deploymentActive = notifications.some(n => n.type === 'deployment');

    return (
        <div className="relative z-50">
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <Bell className={`w-5 h-5 ${deploymentActive ? 'text-purple-500 animate-pulse' : 'text-slate-500'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">알림 센터</h3>
                            {unreadCount > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold">{unreadCount}</span>}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    새로운 알림이 없습니다.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {notifications.map(n => (
                                        <div key={n.id} className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 ${n.type === 'deployment' ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                                            <div className="mt-0.5 shrink-0">
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                                        className="text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
                                                    >
                                                        읽음 처리
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
