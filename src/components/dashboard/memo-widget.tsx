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
                            memos.map((memo) => (
                                <div key={memo.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
                                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                                        <span className="text-slate-500 text-xs font-semibold">{memo.author_name}</span>
                                        <span className="text-slate-400 text-[10px]">
                                            {new Date(memo.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
