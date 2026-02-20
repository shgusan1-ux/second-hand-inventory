'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function SystemStatus() {
    const [status, setStatus] = useState<'normal' | 'deploying' | 'error'>('normal');

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                const hasDeployment = data.some((n: any) => n.type === 'deployment');
                const hasError = data.some((n: any) => n.type === 'error');

                if (hasDeployment) setStatus('deploying');
                else if (hasError) setStatus('error');
                else setStatus('normal');
            }
        } catch {
            setStatus('error');
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm group transition-all hover:bg-white dark:hover:bg-slate-800">
            <div className="relative flex h-2.5 w-2.5">
                {status === 'deploying' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                )}
                {status === 'normal' && (
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                )}
                <span className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5",
                    status === 'normal' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" :
                        status === 'deploying' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" :
                            "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                )}></span>
            </div>
            <span className={cn(
                "hidden sm:inline-block text-[10px] font-black tracking-widest uppercase transition-colors",
                status === 'normal' ? "text-emerald-600 dark:text-emerald-400" :
                    status === 'deploying' ? "text-rose-600 dark:text-rose-400" :
                        "text-amber-600 dark:text-amber-400"
            )}>
                {status === 'normal' ? 'System Stable' : status === 'deploying' ? 'Deploying...' : 'Review Needed'}
            </span>
        </div>
    );
}
