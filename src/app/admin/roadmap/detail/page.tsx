'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit3, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function RoadmapDetailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [node, setNode] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // State for editable fields
    const [content, setContent] = useState('');
    const [detailedPlan, setDetailedPlan] = useState('');
    const [status, setStatus] = useState('TODO');

    const fetchNodeDetail = useCallback(async () => {
        if (!id) return;
        try {
            // Assuming we have an endpoint to fetch single node or just use all and find
            // Better to have single fetch: GET /api/roadmap?id=...
            // Just re-using list for now and filtering if API doesn't support single
            const res = await fetch('/api/roadmap');
            const data = await res.json();
            const target = data.items.find((n: any) => n.id === id);
            if (target) {
                setNode(target);
                setContent(target.content);
                setDetailedPlan(target.detailed_plan || ''); // Assuming we will add this column
                setStatus(target.status || 'TODO');
            } else {
                toast.error('항목을 찾을 수 없습니다.');
                router.push('/');
            }
        } catch (e) {
            toast.error('로드 실패');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchNodeDetail();
    }, [fetchNodeDetail]);

    const handleSave = async () => {
        try {
            const res = await fetch('/api/roadmap', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    content,
                    status,
                    detailed_plan: detailedPlan // We need to add this column to DB
                })
            });

            if (!res.ok) throw new Error();

            toast.success('저장되었습니다.');
            setIsEditing(false);
            fetchNodeDetail();
        } catch {
            toast.error('저장 실패');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">로딩 중...</div>;
    if (!node) return null;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                돌아가기
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                {/* Header Section */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/50">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${node.term === 'short' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                        node.term === 'mid' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            'bg-violet-50 text-violet-600 border-violet-200'
                                    }`}>
                                    {node.term === 'short' ? 'SHORT TERM' : node.term === 'mid' ? 'MID TERM' : 'LONG TERM'}
                                </span>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status === 'DONE' ? 'bg-emerald-500 text-white border-emerald-600' :
                                        status === 'IN_PROGRESS' ? 'bg-blue-500 text-white border-blue-600' :
                                            'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                    {status === 'DONE' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {status === 'IN_PROGRESS' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                                    {status === 'TODO' && <Circle className="w-3.5 h-3.5" />}
                                    <span>
                                        {status === 'DONE' ? '완료됨' : status === 'IN_PROGRESS' ? '진행중' : '대기중'}
                                    </span>
                                </div>
                            </div>

                            {isEditing ? (
                                <input
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full text-3xl font-black bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-slate-100 outline-none py-2"
                                />
                            ) : (
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                    {content}
                                </h1>
                            )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    수정하기
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        저장 완료
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                    <div className="mb-8">
                        <h2 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-4 h-0.5 bg-slate-300 rounded-full"></span>
                            상세 실행 계획 (Deep Dive)
                        </h2>

                        {isEditing ? (
                            <textarea
                                value={detailedPlan}
                                onChange={e => setDetailedPlan(e.target.value)}
                                placeholder="구체적인 실행 계획, 목표, 메모 등을 자유롭게 기록하세요..."
                                className="w-full h-[400px] p-6 text-sm leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent outline-none resize-none placeholder:text-slate-400"
                            />
                        ) : (
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[200px]">
                                {detailedPlan || (
                                    <span className="text-slate-400 italic">아직 작성된 상세 계획이 없습니다.</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status Selection (Only visible in edit mode) */}
                    {isEditing && (
                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">상태 변경</h3>
                            <div className="flex gap-3">
                                {['TODO', 'IN_PROGRESS', 'DONE'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${status === s
                                                ? s === 'DONE' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                                                    : s === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                        : 'bg-slate-100 border-slate-500 text-slate-900 ring-1 ring-slate-500'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300'
                                            }`}
                                    >
                                        {s === 'DONE' ? '완료됨' : s === 'IN_PROGRESS' ? '진행중' : '대기중'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
