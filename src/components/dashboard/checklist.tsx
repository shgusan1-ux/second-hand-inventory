'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { toggleTaskcheck } from '@/lib/actions';
// We will need to implement toggleTaskcheck in actions.ts

interface Task {
    id: string;
    content: string;
    created_at: string;
    is_completed: boolean;
}

export function DashboardChecklist({ initialTasks }: { initialTasks: Task[] }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTasks(tasks.map(t =>
            t.id === id ? { ...t, is_completed: !currentStatus } : t
        ));

        await toggleTaskcheck(id, !currentStatus);
    };

    const activeTasks = tasks.filter(t => !t.is_completed);
    const completedTasks = tasks.filter(t => t.is_completed);

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    최근 업데이트 및 해야할 일
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                    남은 항목: {activeTasks.length}개
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activeTasks.length === 0 && (
                        <div className="text-sm text-slate-500 py-4 text-center">모든 항목을 확인했습니다! 🎉</div>
                    )}
                    <div className="space-y-2">
                        {activeTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-all">
                                <button onClick={() => handleToggle(task.id, task.is_completed)} className="text-slate-400 hover:text-emerald-500">
                                    <Circle className="h-5 w-5" />
                                </button>
                                <span className="text-sm flex-1">{task.content}</span>
                                <span className="text-xs text-slate-400 font-mono">
                                    {new Date(task.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {completedTasks.length > 0 && (
                        <div className="pt-4 border-t">
                            <p className="text-xs font-semibold text-slate-400 mb-2">완료된 항목</p>
                            <div className="space-y-1 opacity-50">
                                {completedTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-1">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span className="text-xs flex-1 line-through decoration-slate-400">{task.content}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
