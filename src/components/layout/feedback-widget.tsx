'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, AlertCircle, Loader2, ImagePlus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submitFeedback, FeedbackType } from '@/lib/feedback-actions';
import { initConsoleCapture, getRecentLogs } from '@/lib/console-capture';
import { toast } from 'sonner';

export function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [data, setData] = useState({
        type: 'BUG' as FeedbackType,
        title: '',
        content: ''
    });

    // 콘솔 로그 캡처 시작
    useEffect(() => { initConsoleCapture(); }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('이미지는 5MB 이하만 가능합니다'); return; }
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const uploadImage = async (): Promise<string | undefined> => {
        if (!imageFile) return undefined;
        const formData = new FormData();
        formData.append('file', imageFile, `feedback-${Date.now()}.jpg`);
        formData.append('productNo', `feedback-${Date.now()}`);
        const res = await fetch('/api/smartstore/images/upload', { method: 'POST', body: formData });
        if (res.ok) {
            const { url } = await res.json();
            return url;
        }
        return undefined;
    };

    const handleSubmit = async () => {
        if (!data.title.trim() || !data.content.trim()) {
            toast.error('제목과 내용을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 이미지 업로드
            const imageUrl = await uploadImage();
            // 콘솔 로그 자동 첨부
            const consoleLogs = getRecentLogs();

            const res = await submitFeedback(data.type, data.title, data.content, imageUrl, consoleLogs);
            if (res.success) {
                toast.success('감사합니다! 소중한 의견이 접수되었습니다.');
                setIsOpen(false);
                setData({ type: 'BUG', title: '', content: '' });
                setImageFile(null);
                setImagePreview(null);
            } else {
                toast.error('전송 실패: ' + res.error);
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <Button
                    onClick={() => {
                        setData({ ...data, type: 'BUG' });
                        setIsOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 bg-slate-950 border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-900/50 h-9"
                >
                    <Bug className="w-4 h-4" />
                    <span>버그 신고</span>
                </Button>
                <Button
                    onClick={() => {
                        setData({ ...data, type: 'FEATURE' });
                        setIsOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 bg-slate-950 border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-900/50 h-9"
                >
                    <Lightbulb className="w-4 h-4" />
                    <span>기능 제안</span>
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
                            업무 자동화 시스템 개선 요청
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            사용 중 불편한 점이나 제안하고 싶은 기능을 자유롭게 남겨주세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-xs text-slate-400">요청 유형</Label>
                            <Select
                                value={data.type}
                                onValueChange={(v) => setData({ ...data, type: v as FeedbackType })}
                            >
                                <SelectTrigger className="bg-slate-900 border-slate-800 focus:ring-emerald-500">
                                    <SelectValue placeholder="유형 선택" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    <SelectItem value="BUG">
                                        <div className="flex items-center gap-2">
                                            <Bug className="w-4 h-4 text-rose-400" />
                                            <span>버그신고</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="FEATURE">
                                        <div className="flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-400" />
                                            <span>기능제안</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="IMPROVEMENT">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-sky-400" />
                                            <span>단순개선</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-xs text-slate-400">제목</Label>
                            <Input
                                id="title"
                                placeholder="예: 출근 기록이 저장되지 않습니다."
                                value={data.title}
                                onChange={(e) => setData({ ...data, title: e.target.value })}
                                className="bg-slate-900 border-slate-800 focus-visible:ring-emerald-500 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content" className="text-xs text-slate-400">상세 내용</Label>
                            <Textarea
                                id="content"
                                placeholder="불편한 상황이나 필요한 기능에 대해 자세히 설명해주세요."
                                rows={5}
                                value={data.content}
                                onChange={(e) => setData({ ...data, content: e.target.value })}
                                className="bg-slate-900 border-slate-800 focus-visible:ring-emerald-500 text-white"
                            />
                        </div>

                        {/* 이미지 첨부 */}
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">스크린샷 첨부 (선택)</Label>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                            {imagePreview ? (
                                <div className="relative inline-block">
                                    <img src={imagePreview} alt="첨부 이미지" className="max-h-32 rounded-lg border border-slate-700" />
                                    <button
                                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-dashed border-slate-700 text-slate-400 hover:text-slate-200 gap-2"
                                >
                                    <ImagePlus className="w-4 h-4" />
                                    이미지 선택
                                </Button>
                            )}
                        </div>

                        <p className="text-[10px] text-slate-600">* 콘솔 로그가 자동으로 첨부되어 오류 분석에 활용됩니다</p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            className="border-slate-800 text-slate-400 hover:text-slate-200"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                '요청 보내기'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
