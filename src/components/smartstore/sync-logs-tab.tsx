'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { RefreshCw, Search, FileText, Download, HelpCircle, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

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

interface SyncSummary {
    batch_time: string;
    started_at: string;
    ended_at: string;
    target_category: string;
    synced_by: string;
    total_count: number;
    success_count: number;
    fail_count: number;
}

export function SyncLogsTab() {
    const [selectedBatch, setSelectedBatch] = useState<SyncSummary | null>(null);

    const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary, isFetching: isSummaryFetching } = useQuery({
        queryKey: ['sync-logs-summary'],
        queryFn: async () => {
            const res = await fetch('/api/smartstore/exhibition/logs/summary');
            if (!res.ok) throw new Error('Failed to fetch summary');
            const json = await res.json();
            return json;
        }
    });

    const summaries: SyncSummary[] = summaryData?.data?.summaries || [];

    const { data: detailData, isLoading: isDetailLoading } = useQuery({
        queryKey: ['sync-logs-detail', selectedBatch?.batch_time, selectedBatch?.target_category, selectedBatch?.synced_by],
        queryFn: async () => {
            if (!selectedBatch) return null;
            const url = new URL('/api/smartstore/exhibition/logs', window.location.origin);
            url.searchParams.set('batch_time', selectedBatch.batch_time);
            url.searchParams.set('target_category', selectedBatch.target_category);
            if (selectedBatch.synced_by) url.searchParams.set('synced_by', selectedBatch.synced_by);
            url.searchParams.set('limit', '500'); // 충분히 많이 가져옴

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Failed to fetch details');
            return res.json();
        },
        enabled: !!selectedBatch
    });

    const detailLogs: SyncLog[] = detailData?.data?.logs || [];

    const successLogs = useMemo(() => detailLogs.filter(l => l.status === 'SUCCESS'), [detailLogs]);
    const failLogs = useMemo(() => detailLogs.filter(l => l.status === 'FAIL'), [detailLogs]);

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleString('ko-KR', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).replace(/\. /g, '-').replace('.', '');
    };

    const calculateDuration = (start: string, end: string) => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diff = Math.max(0, e - s);
        const sec = Math.floor(diff / 1000);
        const m = Math.floor(sec / 60);
        const s_rem = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s_rem).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] gap-4">
            {/* 상단 리스트 영역 */}
            <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">전송 작업 내역</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {summaries.length} entries
                        </span>
                    </div>
                    <button
                        onClick={() => refetchSummary()}
                        disabled={isSummaryFetching}
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isSummaryFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-[11px] border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10 border-b text-slate-600 font-bold text-center">
                            <tr>
                                <th className="p-2 border-r w-8"><input type="checkbox" className="rounded" /></th>
                                <th className="p-2 border-r w-14">상세</th>
                                <th className="p-2 border-r w-24">ID</th>
                                <th className="p-2 border-r text-left px-4">쇼핑몰 / 구분</th>
                                <th className="p-2 border-r">작업자</th>
                                <th className="p-2 border-r">시작시간</th>
                                <th className="p-2 border-r">종료시간</th>
                                <th className="p-2 border-r">소요시간</th>
                                <th className="p-2 border-r">상태</th>
                                <th className="p-2 border-r w-24">진행률</th>
                                <th className="p-2 text-right px-4">결과</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                            {isSummaryLoading ? (
                                <tr><td colSpan={11} className="p-12 text-center text-slate-400">데이터를 불러오는 중입니다...</td></tr>
                            ) : summaries.length === 0 ? (
                                <tr><td colSpan={11} className="p-12 text-center text-slate-400">조회된 기록이 없습니다.</td></tr>
                            ) : (
                                summaries.map((s, idx) => {
                                    const isSelected = selectedBatch?.batch_time === s.batch_time && selectedBatch?.target_category === s.target_category;
                                    return (
                                        <tr
                                            key={idx}
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => setSelectedBatch(s)}
                                        >
                                            <td className="p-2 text-center border-r" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded border-slate-300" /></td>
                                            <td className="p-2 text-center border-r">
                                                <button className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] hover:bg-slate-100 shadow-xs">상세</button>
                                            </td>
                                            <td className="p-2 text-center border-r font-mono text-slate-400">{String(1000000 + idx).slice(1)}</td>
                                            <td className="p-2 text-left border-r px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-800 font-bold">[{s.target_category}]</span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-center border-r font-medium">{s.synced_by || '시스템'}</td>
                                            <td className="p-2 text-center border-r text-slate-500 font-mono">{formatTime(s.started_at)}</td>
                                            <td className="p-2 text-center border-r text-slate-500 font-mono">{formatTime(s.ended_at)}</td>
                                            <td className="p-2 text-center border-r text-slate-500 font-mono">{calculateDuration(s.started_at, s.ended_at)}</td>
                                            <td className="p-2 text-center border-r">
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">완료</span>
                                            </td>
                                            <td className="p-2 text-center border-r">
                                                <div className="w-full bg-slate-100 h-2 rounded-full relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-blue-500 w-[100%]"></div>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white font-bold">100%</span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right px-4 font-bold">
                                                <span className="text-blue-600">{s.success_count}건 성공</span>
                                                <span className="text-slate-300 mx-1">/</span>
                                                <span className={s.fail_count > 0 ? "text-rose-500 font-black" : "text-slate-400"}>{s.fail_count}건 실패</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 하단 상세 영역 (ERP 스타일) */}
            <div className="bg-slate-50 border rounded-xl overflow-hidden flex flex-col h-[280px] shadow-inner">
                <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black text-slate-800">상세 내용</h3>
                        {selectedBatch && (
                            <div className="mt-1 flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 font-bold">
                                    작업명: <span className="text-slate-800">&lt;{selectedBatch.batch_time}&gt; 네이버 - [{selectedBatch.target_category}]</span>
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    작업결과: <span className={selectedBatch.fail_count > 0 ? "text-rose-600 font-black text-xs" : "text-blue-600 font-black text-xs"}>
                                        {selectedBatch.fail_count > 0 ? "실패 포함" : "성공"}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                    {selectedBatch && (
                        <div className="flex gap-1.5">
                            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-xs">
                                <HelpCircle className="w-3 h-3" /> 작업결과 1:1 문의
                            </button>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-xs">
                                <Search className="w-3 h-3" /> 작업결과 쿼리검색
                            </button>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-xs">
                                <Download className="w-3 h-3" /> 작업결과 EXCEL 다운로드
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex divide-x overflow-hidden">
                    {/* 실패 목록 */}
                    <div className="flex-1 flex flex-col bg-rose-50/20">
                        <div className="p-2 px-6 border-b bg-rose-50/50 flex items-center gap-2">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">실패 {failLogs.length}건</span>
                        </div>
                        <div className="flex-1 overflow-auto p-4 px-6 space-y-2 custom-scrollbar">
                            {!selectedBatch ? (
                                <div className="h-full flex items-center justify-center text-slate-300 text-[11px]">작업을 선택해주세요</div>
                            ) : isDetailLoading ? (
                                <div className="h-full flex items-center justify-center text-slate-300 text-[11px]">로딩 중...</div>
                            ) : failLogs.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-300 text-[11px]">실패 기록 없음</div>
                            ) : (
                                failLogs.map((log, i) => (
                                    <div key={i} className="flex flex-col gap-1 p-2 bg-white border border-rose-100 rounded-lg shadow-xs group hover:border-rose-300 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-blue-500 text-[11px] font-bold hover:underline cursor-pointer">{log.product_no}</span>
                                            <span className="text-[10px] text-slate-400 font-mono italic">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-700 truncate">{log.product_name}</p>
                                        <p className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{log.error_message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 성공 목록 */}
                    <div className="flex-1 flex flex-col bg-emerald-50/10">
                        <div className="p-2 px-6 border-b bg-emerald-50/30 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">성공 {successLogs.length}건</span>
                        </div>
                        <div className="flex-1 overflow-auto p-4 px-6 flex flex-wrap gap-2 content-start custom-scrollbar">
                            {!selectedBatch ? (
                                <div className="h-full w-full flex items-center justify-center text-slate-300 text-[11px]">작업을 선택해주세요</div>
                            ) : isDetailLoading ? (
                                <div className="h-full w-full flex items-center justify-center text-slate-300 text-[11px]">로딩 중...</div>
                            ) : successLogs.length === 0 ? (
                                <div className="h-full w-full flex items-center justify-center text-slate-300 text-[11px]">성공 기록 없음</div>
                            ) : (
                                successLogs.map((log, i) => (
                                    <div key={i} title={log.product_name} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:border-blue-400 transition-colors cursor-default shadow-xs">
                                        <span className="text-blue-500 font-bold">{log.product_no}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="text-slate-400 font-mono text-[9px]">{new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
