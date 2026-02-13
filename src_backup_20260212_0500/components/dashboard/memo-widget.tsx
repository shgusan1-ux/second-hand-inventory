'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, StickyNote } from 'lucide-react';
import { addMemo } from '@/lib/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function MemoWidget({ memos }: { memos: any[] }) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setIsSubmitting(true);

        const res = await addMemo(content);

        setIsSubmitting(false);
        if (res.success) {
            setContent('');
            toast.success('메모가 등록되었습니다.');
            router.refresh();
        } else {
            toast.error('메모 등록에 실패했습니다.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Card className="shadow-sm border-t-4 border-t-yellow-400 h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-slate-700">
                    <StickyNote className="w-5 h-5 text-yellow-500" />
                    공유 메모장
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Input Area */}
                <div className="relative">
                    <Textarea
                        placeholder="전달사항이나 메모를 남겨주세요..."
                        className="min-h-[80px] pr-10 resize-none bg-yellow-50/50 border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Button
                        size="sm"
                        className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                {/* Memo List */}
                <ScrollArea className="flex-1 h-[200px] md:h-[300px] pr-4">
                    <div className="space-y-3">
                        {memos.length === 0 ? (
                            <div className="text-center text-slate-400 text-sm py-10">
                                등록된 메모가 없습니다.
                            </div>
                        ) : (
                            memos.map((memo, idx) => (
                                <MemoItem key={memo.id ?? `memo-${idx}`} memo={memo} />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

import { addMemoComment } from '@/lib/actions';

function MemoItem({ memo }: { memo: any }) {
    const [showComments, setShowComments] = useState(false);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleAddComment = async () => {
        if (!comment.trim()) return;
        setIsSubmitting(true);
        const res = await addMemoComment(memo.id, comment);
        setIsSubmitting(false);
        if (res.success) {
            setComment('');
            router.refresh();
        } else {
            toast.error('댓글 등록 실패');
        }
    };

    return (
        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                <span className="text-slate-500 text-xs font-semibold">{memo.author_name}</span>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">
                        {new Date(memo.created_at).toLocaleString()}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-slate-400" onClick={() => setShowComments(!showComments)}>
                        댓글 {memo.comments ? memo.comments.length : 0}
                    </Button>
                </div>
            </div>
            {/* Comments Section */}
            {showComments && (
                <div className="mt-3 pl-2 border-l-2 border-slate-100 space-y-2">
                    {memo.comments && memo.comments.map((c: any) => (
                        <div key={c.id} className="bg-slate-50 p-2 rounded text-xs">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>{c.author_name}</span>
                                <span>{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-700">{c.content}</p>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                        <input
                            className="flex-1 text-xs border rounded px-2 py-1"
                            placeholder="댓글 작성..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                        />
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleAddComment} disabled={isSubmitting}>
                            <Send className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
