'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Database, BrainCircuit, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';

interface SystemStatus {
    database: { status: 'healthy' | 'degraded' | 'down'; latency: number };
    naverApi: { status: 'healthy' | 'degraded' | 'down'; lastSync: string };
    aiService: { status: 'healthy' | 'degraded' | 'down'; credits: number; todayUsage: number };
    server: { status: 'healthy' | 'degraded' | 'down'; uptime: string; memory: string };
}

export function SystemMonitorWidget() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/system/status');
            if (!res.ok) throw new Error('Status fetch failed');
            const data = await res.json();

            setStatus(data);
            setLoading(false);
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
            // Fallback
            setStatus({
                database: { status: 'down', latency: 0 },
                naverApi: { status: 'down', lastSync: 'Error' },
                aiService: { status: 'down', credits: 0, todayUsage: 0 },
                server: { status: 'down', uptime: 'N/A', memory: 'N/A' }
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000); // 1분마다 갱신
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'degraded': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            case 'down': return <XCircle className="w-4 h-4 text-rose-500" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'degraded': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'down': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    if (!status && loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 h-[180px] animate-pulse">
                <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-slate-50 dark:bg-slate-800 rounded-lg"></div>
                    <div className="h-16 bg-slate-50 dark:bg-slate-800 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">시스템 모니터링</h3>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Admin Page Performance */}
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Database className="w-3.5 h-3.5" />
                            <span>관리자 응답속도</span>
                        </div>
                        {getStatusIcon(status?.database.status || 'unknown')}
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-slate-900 dark:text-white">{status?.database.latency}ms</span>
                            <span className="text-[10px] text-slate-400">현재 응답속도</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-400">적정 응답속도</span>
                            <span className={`text-[10px] font-bold ${(status?.database.latency || 999) <= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                50ms 이하
                            </span>
                        </div>
                    </div>
                </div>

                {/* AI Service */}
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <BrainCircuit className="w-3.5 h-3.5" />
                            <span>AI 크레딧</span>
                        </div>
                        {getStatusIcon(status?.aiService.status || 'unknown')}
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{status?.aiService.credits.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400">잔여량</span>
                    </div>
                    <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${(status?.aiService.credits || 0) / 100}%` }}></div>
                    </div>
                </div>

                {/* Server */}
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Server className="w-3.5 h-3.5" />
                            <span>서버 상태</span>
                        </div>
                        {getStatusIcon(status?.server.status || 'unknown')}
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{status?.server.uptime}</span>
                        <span className="text-[10px] text-slate-400">가동중</span>
                    </div>
                </div>

                {/* Naver API */}
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="font-bold text-green-500">N</span>
                            <span>네이버 연동</span>
                        </div>
                        {getStatusIcon(status?.naverApi.status || 'unknown')}
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{status?.naverApi.lastSync}</span>
                        <span className="text-[10px] text-slate-400">마지막 동기화</span>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 정상
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1"></span> 지연
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1"></span> 장애
                </span>
            </div>
        </div>
    );
}
