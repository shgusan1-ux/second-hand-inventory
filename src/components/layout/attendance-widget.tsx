'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { checkIn, checkOut, getTodayAttendance } from '@/lib/member-actions';
import { Clock, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function AttendanceWidget({ userId }: { userId: string }) {
    const [status, setStatus] = useState<'none' | 'checked_in' | 'checked_out' | 'loading'>('loading');
    const [workTime, setWorkTime] = useState<string>('');

    useEffect(() => {
        loadStatus();
    }, []);

    async function loadStatus() {
        if (!userId) {
            setStatus('none');
            return;
        }
        try {
            const att = await getTodayAttendance(userId);
            if (!att) setStatus('none');
            else if (att.check_out) setStatus('checked_out');
            else {
                setStatus('checked_in');
                // Could calc elapsed time here
            }
        } catch (e) {
            setStatus('none');
        }
    }

    async function handleCheckIn() {
        const res = await checkIn();
        if (res.success) {
            // toast.success('출근 처리되었습니다.');
            setStatus('checked_in');
        } else {
            alert('출근 처리 실패: ' + res.error);
        }
    }

    async function handleCheckOut() {
        const res = await checkOut();
        if (res.success) {
            // toast.success('퇴근 처리되었습니다.');
            setStatus('checked_out');
        } else {
            alert('퇴근 처리 실패: ' + res.error);
        }
    }

    if (status === 'loading') return <div className="h-10 animate-pulse bg-slate-800 rounded"></div>;

    return (
        <div className="mt-auto pt-4 border-t border-slate-800">
            {status === 'none' && (
                <Button onClick={handleCheckIn} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex gap-2">
                    <Clock className="w-4 h-4" /> 출근하기
                </Button>
            )}
            {status === 'checked_in' && (
                <div className="space-y-2">
                    <div className="text-center text-xs text-emerald-400 font-bold mb-1">업무 중</div>
                    <Button onClick={handleCheckOut} variant="destructive" className="w-full flex gap-2">
                        <LogOut className="w-4 h-4" /> 퇴근하기
                    </Button>
                </div>
            )}
            {status === 'checked_out' && (
                <div className="text-center p-2 bg-slate-800 rounded text-slate-400 text-sm">
                    오늘 업무 마감
                </div>
            )}
        </div>
    );
}
