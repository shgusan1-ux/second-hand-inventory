'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { processImageWithBadge } from '@/lib/image-processor';
import { toast } from 'sonner';

interface LogEntry {
    id: string;
    message: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    timestamp: string;
}

export default function BatchProgressPage() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const [ids, setIds] = useState<string[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [total, setTotal] = useState(0);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (idsParam) {
            const parsedIds = idsParam.split(',').filter(Boolean);
            setIds(parsedIds);
            setTotal(parsedIds.length);
            setLogs(parsedIds.map(id => ({
                id,
                message: '대기 중...',
                status: 'pending',
                timestamp: new Date().toLocaleTimeString()
            })));
        }
    }, [idsParam]);

    const addLog = (id: string, message: string, status: 'pending' | 'processing' | 'success' | 'error') => {
        setLogs(prev => prev.map(log =>
            log.id === id ? { ...log, message, status, timestamp: new Date().toLocaleTimeString() } : log
        ));
    };

    const startBatch = async () => {
        if (isProcessing || ids.length === 0) return;
        setIsProcessing(true);

        // Get all products data first to have thumbnailUrl and grade
        // We can fetch them one by one or get a chunk.
        // For simplicity, we'll fetch details as we go or expect them to be passed?
        // Passing full data in URL is bad. Let's fetch the list again or use a temporary storage.

        // Better: Fetch all products once here
        const res = await fetch('/api/smartstore/products?cacheOnly=true');
        const allData = await res.json();
        const productsMap = new Map();
        if (allData.success && allData.data?.contents) {
            allData.data.contents.forEach((p: any) => productsMap.set(String(p.originProductNo), p));
        }

        let successCount = 0;

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            setCurrent(i + 1);
            const product = productsMap.get(id);

            if (!product) {
                addLog(id, '상품 정보를 찾을 수 없음', 'error');
                continue;
            }

            if (!product.thumbnailUrl) {
                addLog(id, '썸네일 URL 없음', 'error');
                continue;
            }

            const grade = product.descriptionGrade || product.classification?.visionGrade || 'B';
            addLog(id, `이미지 작업 중... (등급: ${grade})`, 'processing');

            try {
                // 1. Process Image
                const blob = await processImageWithBadge({
                    imageUrl: product.thumbnailUrl,
                    grade: grade
                });

                // 2. Upload to Vercel/Local
                const formData = new FormData();
                formData.append('file', blob, `${id}.jpg`);
                formData.append('productNo', id);

                const uploadResp = await fetch('/api/smartstore/images/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResp.ok) throw new Error('업로드 실패');
                const uploadData = await uploadResp.json();
                const newUrl = uploadData.url ? `${uploadData.url}?t=${Date.now()}` : `/thumbnails/generated/${id}.jpg?t=${Date.now()}`;

                // 3. Naver Update
                addLog(id, '네이버 동기화 중...', 'processing');
                const updateRes = await fetch('/api/smartstore/products/update-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originProductNo: id, imageUrl: newUrl })
                });

                if (!updateRes.ok) throw new Error('네이버 업데이트 실패');

                addLog(id, '완료 ✓', 'success');
                successCount++;
            } catch (err: any) {
                addLog(id, `오류: ${err.message}`, 'error');
            }

            // Cool-off to prevent rate limit
            await new Promise(r => setTimeout(r, 500));
        }

        setIsProcessing(false);
        toast.success(`작업 완료! 성공: ${successCount}/${ids.length}`);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <span className="bg-blue-600 px-3 py-1 rounded-lg text-sm align-middle">BATCH</span>
                            대량 썸네일 등록
                        </h1>
                        <p className="text-slate-400 mt-2">총 {total}개의 상품을 처리합니다.</p>
                    </div>
                    {!isProcessing && current === 0 && (
                        <button
                            onClick={startBatch}
                            className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95"
                        >
                            작업 시작하기
                        </button>
                    )}
                </div>

                {/* Status Card */}
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-xl">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400 font-medium">진행률</span>
                        <span className="text-white font-bold">{Math.round((current / total) * 100) || 0}% ({current}/{total})</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            style={{ width: `${(current / total) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 sticky top-0 backdrop-blur-xl">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">상품코드</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">상태 메시지</th>
                                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">시간</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 font-mono text-sm text-blue-400 font-bold">{log.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {log.status === 'processing' && (
                                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                )}
                                                {log.status === 'success' && <span className="text-emerald-400 font-bold">●</span>}
                                                {log.status === 'error' && <span className="text-red-500 font-bold">●</span>}
                                                {log.status === 'pending' && <span className="text-slate-600 font-bold">○</span>}
                                                <span className={`text-sm ${log.status === 'success' ? 'text-emerald-400' :
                                                        log.status === 'error' ? 'text-red-400' :
                                                            log.status === 'processing' ? 'text-white' : 'text-slate-500'
                                                    }`}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right text-xs text-slate-600 font-mono">{log.timestamp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
