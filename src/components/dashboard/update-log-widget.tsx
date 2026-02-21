'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { toggleTaskcheck, addDashboardTask } from '@/lib/actions';
import { toast } from 'sonner';
import { Plus, Send } from 'lucide-react';

interface Task {
    id: string;
    content: string;
    created_at: Date;
    is_completed: boolean;
}

export function UpdateLogWidget({ tasks: initialTasks }: { tasks: any[] }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [page, setPage] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const limit = 10;

    const totalPages = Math.ceil(tasks.length / limit);
    const paginatedTasks = tasks.slice((page - 1) * limit, page * limit);

    const handleCheck = async (id: string) => {
        // Optimistic update
        const newTasks = tasks.filter(t => t.id !== id);
        setTasks(newTasks);

        // If current page becomes empty and we have pages, go back
        if (newTasks.slice((page - 1) * limit, page * limit).length === 0 && page > 1) {
            setPage(page - 1);
        }

        const res = await toggleTaskcheck(id, true);
        if (!res.success) {
            // Revert if failed (simplified, usually we'd reload)
            toast.error('삭제 처리에 실패했습니다.');
        }
    };

    const handleAdd = async () => {
        if (!newContent.trim()) return;
        setSubmitting(true);
        try {
            const res = await addDashboardTask(newContent);
            if (res.success) {
                toast.success('공지가 등록되었습니다.');
                setNewContent('');
                setIsAdding(false);
                // In a real app, revalidatePath would trigger a server component refresh.
                // For client-side UX, we could either reload or push to state.
                window.location.reload();
            } else {
                toast.error(res.error || '등록 실패');
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="shadow-sm border-t-4 border-t-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex flex-col">
                    <CardTitle>최근 업데이트 및 패치 로그</CardTitle>
                    <span className="text-xs text-slate-400 font-normal mt-1">{tasks.length}개의 공지</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                    className="h-8 gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                >
                    <Plus className="w-3.5 h-3.5" />
                    직접 작성
                </Button>
            </CardHeader>
            <CardContent>
                {isAdding && (
                    <div className="mb-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">새 공지 작성</label>
                            <input
                                type="text"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="업데이트 내용을 입력하세요..."
                                className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                disabled={submitting}
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={handleAdd}
                            disabled={submitting || !newContent.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 h-9"
                        >
                            {submitting ? '...' : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                )}
                <div className="space-y-4 min-h-[300px]">
                    {paginatedTasks.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">
                            확인할 새로운 업데이트가 없습니다.
                        </div>
                    ) : (
                        paginatedTasks.map((task) => (
                            <div key={task.id} className="group flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                <div className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-xs font-bold font-mono mt-0.5">
                                    {task.id.startsWith('sys-') ? task.id.replace('sys-', '') : '공지'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-700 font-medium">{task.content}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCheck(task.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    title="확인(삭제)"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-slate-500 font-medium">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
