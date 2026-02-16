'use client';

import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
    id: string;
    name: string;
    job_title: string;
    check_in: string | null;
    check_out: string | null;
    work_date: string | null;
}

interface AttendanceSummaryWidgetProps {
    records: AttendanceRecord[];
}

export function AttendanceSummaryWidget({ records }: AttendanceSummaryWidgetProps) {
    const getStatus = (record: AttendanceRecord) => {
        if (!record.check_in) return { label: '미출근', color: 'text-slate-400 bg-slate-100 dark:bg-slate-800', icon: Clock };

        // Parse check_in time (KST ISO string)
        // Extract HH:mm
        const checkInTimeStr = record.check_in.includes('T') ? record.check_in.split('T')[1].substring(0, 5) : '';
        const isLate = checkInTimeStr > '09:10';

        if (record.check_out) {
            return {
                label: '퇴근완료',
                color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
                icon: CheckCircle2,
                time: checkInTimeStr
            };
        }

        if (isLate) {
            return {
                label: '지각',
                color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
                icon: AlertCircle,
                time: checkInTimeStr
            };
        }

        return {
            label: '정상출근',
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
            icon: CheckCircle2,
            time: checkInTimeStr
        };
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white">오늘의 근태 현황</h3>
                </div>
                <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">
                    기준: 09:10
                </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <tr className="border-b border-slate-100 dark:border-slate-700">
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">이름</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">상태</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">출근시간</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {records.map((record) => {
                            const status = getStatus(record);
                            const StatusIcon = status.icon;

                            return (
                                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{record.name}</span>
                                            <span className="text-[10px] text-slate-400">{record.job_title || '직원'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold leading-none",
                                            status.color
                                        )}>
                                            <StatusIcon className="w-3 h-3" />
                                            {status.label}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={cn(
                                            "text-xs font-mono font-medium",
                                            record.check_in ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600 italic"
                                        )}>
                                            {status.time || '--:--'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
