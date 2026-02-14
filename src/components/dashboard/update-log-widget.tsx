'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { toggleTaskcheck } from '@/lib/actions';
import { toast } from 'sonner';

interface Task {
    id: string;
    content: string;
    created_at: Date;
    is_completed: boolean;
}

export function UpdateLogWidget({ tasks: initialTasks }: { tasks: any[] }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [page, setPage] = useState(1);
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

    return (
        <Card className="shadow-sm border-t-4 border-t-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>최근 업데이트 및 패치 로그</CardTitle>
                <div className="text-xs text-slate-400 font-normal">
                    {tasks.length}개의 공지
                </div>
            </CardHeader>
            <CardContent>
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
