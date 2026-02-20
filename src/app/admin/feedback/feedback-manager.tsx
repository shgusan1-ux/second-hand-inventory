'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Bug, Lightbulb, AlertCircle, Clock, CheckCircle2,
    PlayCircle, MessageSquare, User, Calendar, Loader2, Plus
} from 'lucide-react';
import { updateFeedbackStatus, updateAdminComment, submitFeedback, FeedbackStatus, FeedbackType } from '@/lib/feedback-actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function FeedbackManager({ initialFeedbacks }: { initialFeedbacks: any[] }) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createData, setCreateData] = useState({
        type: 'BUG' as FeedbackType,
        title: '',
        content: ''
    });

    const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
    const [filterStatus, setFilterStatus] = useState<'ALL' | FeedbackStatus>('ALL');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [commentMap, setCommentMap] = useState<Record<string, string>>(
        initialFeedbacks.reduce((acc, f) => ({ ...acc, [f.id]: f.admin_comment || '' }), {})
    );

    const handleCreate = async () => {
        if (!createData.title.trim() || !createData.content.trim()) {
            toast.error('제목과 내용을 입력해주세요.');
            return;
        }
        setIsCreating(true);
        try {
            const res = await submitFeedback(createData.type, createData.title, createData.content);
            if (res.success) {
                toast.success('이슈가 등록되었습니다.');
                setIsCreateOpen(false);
                setCreateData({ type: 'BUG', title: '', content: '' });
                // We don't have the full object here to prepend without re-fetching or simulating it.
                // For simplicity, let's refresh the page or simulate optimistically if we knew user name.
                // Since this is admin page, full refresh is safer or just use window.location.reload() for MVP.
                // Or better, let's just reload the page to get the new list.
                window.location.reload();
            } else {
                toast.error(res.error);
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: FeedbackStatus) => {
        setLoadingMap(prev => ({ ...prev, [id]: true }));
        try {
            const res = await updateFeedbackStatus(id, status);
            if (res.success) {
                setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
                toast.success('상태가 업데이트되었습니다.');
            } else {
                toast.error(res.error);
            }
        } finally {
            setLoadingMap(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleCommentSubmit = async (id: string) => {
        const comment = commentMap[id];
        setLoadingMap(prev => ({ ...prev, [id]: true }));
        try {
            const res = await updateAdminComment(id, comment);
            if (res.success) {
                setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, admin_comment: comment } : f));
                toast.success('답변이 등록되었습니다.');
            } else {
                toast.error(res.error);
            }
        } finally {
            setLoadingMap(prev => ({ ...prev, [id]: false }));
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'BUG': return <Bug className="w-4 h-4 text-rose-400" />;
            case 'FEATURE': return <Lightbulb className="w-4 h-4 text-amber-400" />;
            default: return <AlertCircle className="w-4 h-4 text-sky-400" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-slate-800 text-slate-400 border-slate-700';
            case 'IN_PROGRESS': return 'bg-blue-900/30 text-blue-400 border-blue-800';
            case 'COMPLETED': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
            default: return 'bg-slate-800 text-slate-400';
        }
    };

    const filteredFeedbacks = filterStatus === 'ALL'
        ? feedbacks
        : feedbacks.filter(f => f.status === filterStatus);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800 self-start">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterStatus('ALL')}
                        className={cn(
                            "text-xs h-8 px-4",
                            filterStatus === 'ALL' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        전체 ({feedbacks.length})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterStatus('PENDING')}
                        className={cn(
                            "text-xs h-8 px-4",
                            filterStatus === 'PENDING' ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-400"
                        )}
                    >
                        처리 전 ({feedbacks.filter(f => f.status === 'PENDING').length})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterStatus('IN_PROGRESS')}
                        className={cn(
                            "text-xs h-8 px-4",
                            filterStatus === 'IN_PROGRESS' ? "bg-blue-600/20 text-blue-400 shadow-sm" : "text-slate-500 hover:text-blue-400/50"
                        )}
                    >
                        처리 중 ({feedbacks.filter(f => f.status === 'IN_PROGRESS').length})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilterStatus('COMPLETED')}
                        className={cn(
                            "text-xs h-8 px-4",
                            filterStatus === 'COMPLETED' ? "bg-emerald-600/20 text-emerald-400 shadow-sm" : "text-slate-500 hover:text-emerald-400/50"
                        )}
                    >
                        완료 ({feedbacks.filter(f => f.status === 'COMPLETED').length})
                    </Button>
                </div>

                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10"
                >
                    <Plus className="w-4 h-4" />
                    직접 등록하기
                </Button>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
                    <DialogHeader>
                        <DialogTitle>새로운 이슈 등록</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            관리자가 직접 버그나 개선사항을 기록합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">유형</Label>
                            <Select
                                value={createData.type}
                                onValueChange={(v) => setCreateData({ ...createData, type: v as FeedbackType })}
                            >
                                <SelectTrigger className="bg-slate-900 border-slate-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    <SelectItem value="BUG">버그</SelectItem>
                                    <SelectItem value="FEATURE">기능제안</SelectItem>
                                    <SelectItem value="IMPROVEMENT">단순개선</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">제목</Label>
                            <Input
                                value={createData.title}
                                onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                                className="bg-slate-900 border-slate-800"
                                placeholder="이슈 제목"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">내용</Label>
                            <Textarea
                                value={createData.content}
                                onChange={(e) => setCreateData({ ...createData, content: e.target.value })}
                                className="bg-slate-900 border-slate-800"
                                placeholder="상세 내용"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-800 text-slate-400">취소</Button>
                        <Button onClick={handleCreate} disabled={isCreating} className="bg-emerald-600 hover:bg-emerald-700">
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : '등록'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredFeedbacks.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                    <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">
                        {filterStatus === 'ALL' ? '등록된 개선 요청이 없습니다.' : '해당 상태의 요청이 없습니다.'}
                    </p>
                </div>
            ) : (
                filteredFeedbacks.map((f) => (
                    <Card key={f.id} className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                        <div className={cn(
                            "h-1 w-full",
                            f.type === 'BUG' ? "bg-rose-500" : f.type === 'FEATURE' ? "bg-amber-500" : "bg-sky-500"
                        )} />
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className={getStatusStyle(f.status)}>
                                            {f.status === 'PENDING' ? '처리 전' : f.status === 'IN_PROGRESS' ? '처리 중' : '처리 완료'}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 pointer-events-none gap-1">
                                            {getTypeIcon(f.type)}
                                            {f.type === 'BUG' ? '버그' : f.type === 'FEATURE' ? '기능제안' : '단순개선'}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl text-slate-100">{f.title}</CardTitle>
                                    <CardDescription className="flex items-center gap-4 text-slate-500 text-xs">
                                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {f.user_name || f.user_id}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(f.created_at).toLocaleString()}</span>
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant={f.status === 'PENDING' ? 'default' : 'outline'}
                                        className={cn("h-8 gap-1", f.status === 'PENDING' ? "bg-slate-700 hover:bg-slate-600" : "border-slate-800 text-slate-400")}
                                        onClick={() => handleStatusUpdate(f.id, 'PENDING')}
                                        disabled={loadingMap[f.id]}
                                    >
                                        <Clock className="w-3 h-3" /> 처리 전
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={f.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                                        className={cn("h-8 gap-1", f.status === 'IN_PROGRESS' ? "bg-blue-600 hover:bg-blue-700" : "border-slate-800 text-slate-400")}
                                        onClick={() => handleStatusUpdate(f.id, 'IN_PROGRESS')}
                                        disabled={loadingMap[f.id]}
                                    >
                                        <PlayCircle className="w-3 h-3" /> 처리 중
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={f.status === 'COMPLETED' ? 'default' : 'outline'}
                                        className={cn("h-8 gap-1", f.status === 'COMPLETED' ? "bg-emerald-600 hover:bg-emerald-700 font-bold" : "border-slate-800 text-slate-400")}
                                        onClick={() => handleStatusUpdate(f.id, 'COMPLETED')}
                                        disabled={loadingMap[f.id]}
                                    >
                                        <CheckCircle2 className="w-3 h-3" /> 처리 완료
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{f.content}</p>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                                    관리자 답변
                                </div>
                                <div className="grid gap-3">
                                    <Textarea
                                        placeholder="공유할 진행 상황이나 답변을 입력하세요..."
                                        className="bg-slate-950 border-slate-800 text-sm focus-visible:ring-emerald-500"
                                        value={commentMap[f.id] || ''}
                                        onChange={(e) => setCommentMap(prev => ({ ...prev, [f.id]: e.target.value }))}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                            onClick={() => handleCommentSubmit(f.id)}
                                            disabled={loadingMap[f.id]}
                                        >
                                            {loadingMap[f.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : '답변 저장'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
