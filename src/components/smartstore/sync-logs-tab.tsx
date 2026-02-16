'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock, User, Tag } from 'lucide-react';

interface SyncLog {
    id: number;
    product_no: string;
    product_name: string;
    target_category: string;
    status: 'SUCCESS' | 'FAIL';
    error_message?: string;
    synced_by?: string;
    created_at: string;
}

export function SyncLogsTab() {
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAIL'>('ALL');
    const [page, setPage] = useState(0);
    const LIMIT = 50;

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['sync-logs', statusFilter, page],
        queryFn: async () => {
            const url = new URL('/api/smartstore/exhibition/logs', window.location.origin);
            url.searchParams.set('limit', LIMIT.toString());
            url.searchParams.set('offset', (page * LIMIT).toString());
            if (statusFilter !== 'ALL') {
                url.searchParams.set('status', statusFilter);
            }
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        }
    });

    const logs: SyncLog[] = data?.data?.logs || [];
    const total = data?.data?.total || 0;
    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">동기화 전송 기록</h2>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(['ALL', 'SUCCESS', 'FAIL'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => { setStatusFilter(f); setPage(0); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === f
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {f === 'ALL' ? '전체' : f === 'SUCCESS' ? '성공' : '실패'}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2 hover:bg-slate-100 rounded-full transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">상태</th>
                                <th className="px-6 py-4">상품 정보</th>
                                <th className="px-6 py-4">대상 카테고리</th>
                                <th className="px-6 py-4">실행자 / 일시</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">기록 로드 중...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">로그 기록이 없습니다.</td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {log.status === 'SUCCESS' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>성공</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                                                        <XCircle className="w-4 h-4" />
                                                        <span>실패</span>
                                                    </div>
                                                    {log.error_message && (
                                                        <p className="text-[10px] text-rose-400 max-w-[200px] leading-tight break-words">
                                                            {log.error_message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{log.product_name}</span>
                                                <span className="text-[11px] font-mono text-slate-400">#{log.product_no}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[11px] font-bold w-fit">
                                                <Tag className="w-3 h-3" />
                                                {log.target_category}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <User className="w-3 h-3" />
                                                    {log.synced_by || '시스템'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px]">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(log.created_at).toLocaleString('ko-KR')}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 border-t">
                        <button
                            onClick={() => setPage(prev => Math.max(0, prev - 1))}
                            disabled={page === 0}
                            className="px-3 py-1 text-xs font-bold border rounded bg-white disabled:opacity-30"
                        >
                            이전
                        </button>
                        <span className="text-xs font-bold text-slate-600">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={page === totalPages - 1}
                            className="px-3 py-1 text-xs font-bold border rounded bg-white disabled:opacity-30"
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
