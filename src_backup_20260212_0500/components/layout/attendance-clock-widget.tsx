'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { checkIn, checkOut, getTodayAttendance } from '@/lib/member-actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceClockWidgetProps {
    userId?: string;
}

export function AttendanceClockWidget({ userId }: AttendanceClockWidgetProps) {
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [status, setStatus] = useState<'none' | 'checked_in' | 'checked_out' | 'loading'>('loading');
    const [checkInTime, setCheckInTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

    // 1. Clock Tik
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            if (status === 'checked_in' && checkInTime) {
                const diff = now.getTime() - checkInTime.getTime();
                if (diff >= 0) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setElapsedTime(
                        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                    );
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [status, checkInTime]);

    // 2. Load Status
    useEffect(() => {
        if (!userId) {
            setStatus('none');
            return;
        }
        loadStatus();
    }, [userId]);

    async function loadStatus() {
        try {
            const att: any = await getTodayAttendance(userId!);
            if (!att) {
                setStatus('none');
            } else if (att.check_out) {
                setStatus('checked_out');
            } else if (att.check_in) {
                setStatus('checked_in');
                // Fix timezone issue: Treat stored KST-ISO as local time by stripping Z
                setCheckInTime(new Date(att.check_in.replace('Z', '')));
            }
        } catch (e) {
            console.error(e);
            setStatus('none');
        }
    }

    const handleClockClick = async () => {
        if (!userId) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        if (status === 'none' || status === 'checked_out') {
            if (!confirm('출근 하시겠습니까?')) return;

            const res = await checkIn();
            if (res.success) {
                toast.success('출근 완료! 오늘도 화이팅하세요.');
                setStatus('checked_in');
                setCheckInTime(new Date());
                loadStatus();
            } else {
                toast.error(res.error || '출근 실패');
            }
        } else if (status === 'checked_in') {
            if (!confirm('퇴근 하시겠습니까?')) return;

            const res = await checkOut();
            if (res.success) {
                toast.success('퇴근 완료! 고생하셨습니다.');
                setStatus('checked_out');
            } else {
                toast.error(res.error || '퇴근 실패');
            }
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    if (status === 'loading') {
        return (
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 rounded-md mb-4 border border-slate-800 animate-pulse h-[54px]" />
        );
    }

    const isWorking = status === 'checked_in';
    const isDone = status === 'checked_out';

    return (
        <div
            onClick={handleClockClick}
            className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-md mb-4 border shadow-inner cursor-pointer transition-all active:scale-95 select-none relative group",
                isWorking
                    ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                    : isDone
                        ? "bg-slate-900 border-slate-800 text-slate-500"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-900/50"
            )}
            title={isWorking ? "클릭하여 퇴근" : isDone ? "오늘 업무 마감" : "클릭하여 출근"}
        >
            {isWorking ? (
                <>
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-emerald-900 text-emerald-100 px-1.5 py-0 rounded border border-emerald-700 shadow-sm animate-pulse">
                        WORKING
                    </span>
                    <Clock className="w-4 h-4 animate-spin-slow" style={{ animationDuration: '4s' }} />
                    <span className="font-mono text-lg font-bold tracking-widest leading-none">
                        {elapsedTime}
                    </span>
                </>
            ) : (
                <>
                    <span className={cn(
                        "absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0 rounded border transition-colors shadow-sm",
                        isDone ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-slate-800 text-slate-400 border-slate-700 group-hover:bg-emerald-900 group-hover:text-emerald-100 group-hover:border-emerald-700"
                    )}>
                        {isDone ? 'DONE' : 'CLOCK IN'}
                    </span>
                    <Clock className={cn("w-4 h-4", isDone ? "opacity-50" : "")} />
                    <span className="font-mono text-lg font-bold tracking-widest leading-none">
                        {formatTime(currentTime)}
                    </span>
                </>
            )}
        </div>
    );
}
