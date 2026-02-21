'use client';

import { useState, useEffect, useRef } from 'react';
import { Bug, Send, X, AlertCircle, Terminal, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createBugReport } from '@/lib/bug-actions';
import { usePathname } from 'next/navigation';

export function GlobalBugReporter() {
    const [open, setOpen] = useState(false);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const pathname = usePathname();

    // Capture console errors
    useEffect(() => {
        const originalError = console.error;
        const originalWarn = console.warn;

        console.error = (...args) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            setErrors(prev => [...prev.slice(-19), message]); // Keep last 20
            originalError.apply(console, args);
        };

        window.onerror = (message, source, lineno, colno, error) => {
            const errStr = `Error: ${message} at ${source}:${lineno}:${colno}`;
            setErrors(prev => [...prev.slice(-19), errStr]);
            return false;
        };

        return () => {
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast.error('내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await createBugReport({
                content: content,
                pageUrl: window.location.href,
                userAgent: navigator.userAgent,
                consoleLogs: JSON.stringify(errors)
            });

            if (res.success) {
                toast.success('버그 신고가 접수되었습니다. 감사합니다!');
                setContent('');
                setOpen(false);
            } else {
                toast.error(res.error || '접수 실패');
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Bug Button */}
            <div className="fixed bottom-6 right-6 z-[100] md:bottom-10 md:right-10 flex flex-col items-end gap-3">
                <div className="group relative">
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest shadow-xl hidden md:block border border-rose-400">
                        버그 제보하기
                    </div>

                    <button
                        onClick={() => setOpen(true)}
                        className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white"
                        title="버그 신고"
                    >
                        <Bug className="w-8 h-8" />
                        {errors.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-white text-rose-500 text-[10px] font-black items-center justify-center shadow-sm">
                                    {errors.length}
                                </span>
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Bug Report Modal */}
            {open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b bg-rose-500 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Bug className="w-6 h-6" />
                                <div>
                                    <h3 className="font-bold text-lg">시스템 버그 제보</h3>
                                    <p className="text-xs text-rose-100">발견하신 불편함을 적어주세요.</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white hover:bg-rose-600 rounded-full h-10 w-10">
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 dark:bg-slate-950">
                            {/* Auto Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                                    <Info className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">발생 위치</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{pathname}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                                    <Terminal className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">수집된 오류</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{errors.length}건</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">상세 내용</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="어떤 동작에서 버그가 발생했나요? 수집된 에러 로그와 함께 개발팀에 전달됩니다."
                                    className="w-full h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none shadow-inner dark:text-white"
                                />
                            </div>

                            {errors.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-rose-500" />
                                        최근 에러 로그
                                    </label>
                                    <div className="bg-slate-900 text-rose-400 p-4 rounded-xl font-mono text-[10px] overflow-x-auto border border-rose-900/30 shadow-inner max-h-32 overflow-y-auto">
                                        {errors.map((err, i) => (
                                            <div key={i} className="mb-1 border-b border-rose-900/10 pb-1 last:border-0">{err}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white dark:bg-slate-900 border-t flex justify-end shrink-0">
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !content.trim()}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-rose-500/20 gap-2"
                            >
                                {submitting ? '제출 중...' : (
                                    <>
                                        제보하기
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
