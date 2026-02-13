'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function ClockWidget() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 text-slate-400 bg-slate-900/50 rounded-md mb-4 border border-slate-800 animate-pulse h-10">
                {/* Skeleton */}
            </div>
        );
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // 24-hour format
        });
    };

    return (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-emerald-400 bg-slate-950 rounded-md mb-4 border border-slate-800 shadow-inner">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-lg font-bold tracking-widest">
                {formatTime(time)}
            </span>
        </div>
    );
}
