'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getMeeting, createMeeting, updateMeeting, deleteMeeting, Meeting } from '@/lib/meeting-actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this or use Input
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2, Calendar, MapPin, Users, FileText } from 'lucide-react';
import Link from 'next/link';

export default function MeetingDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
        location: '회의실',
        attendees: '', // Comma separated for simplicity, or implement proper multiselect
        content: ''
    });

    useEffect(() => {
        if (isNew) {
            setLoading(false);
            return;
        }

        if (id) {
            setLoading(true);
            getMeeting(id).then((data: any) => {
                if (data) {
                    setFormData({
                        title: data.title,
                        date: data.date,
                        location: data.location || '',
                        attendees: Array.isArray(data.attendees) ? data.attendees.join(', ') : '',
                        content: data.content || ''
                    });
                } else {
                    toast.error('회의를 찾을 수 없습니다.');
                    router.push('/business/collaboration/meetings');
                }
                setLoading(false);
            });
        }
    }, [id, isNew, router]);

    const handleSave = async () => {
        if (!formData.title || !formData.date) {
            toast.error('제목과 일시는 필수입니다.');
            return;
        }

        const attendeesList = formData.attendees.split(',').map(s => s.trim()).filter(Boolean);
        const payload = {
            ...formData,
            attendees: attendeesList
        };

        let res;
        if (isNew) {
            res = await createMeeting(payload);
        } else {
            res = await updateMeeting(id, payload);
        }

        if (res.success) {
            toast.success('저장되었습니다.');
            router.push('/business/collaboration/meetings');
            router.refresh();
        } else {
            toast.error('저장 실패: ' + res.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const res = await deleteMeeting(id);
        if (res.success) {
            toast.success('삭제되었습니다.');
            router.push('/business/collaboration/meetings');
            router.refresh();
        } else {
            toast.error('삭제 실패: ' + res.error);
        }
    };

    if (loading) return <div className="p-10 text-center">로딩 중...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <Link href="/business/collaboration/meetings" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> 목록으로
                </Link>
                <div className="flex gap-2">
                    {!isNew && (
                        <Button variant="outline" onClick={handleDelete} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </Button>
                    )}
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" /> 저장
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content (Minutes) */}
                <Card className="md:col-span-2 shadow-sm">
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-lg font-bold">회의 제목</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="예: 주간 업무 회의"
                                className="text-lg font-bold h-12"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 font-bold text-slate-700">
                                <FileText className="w-4 h-4" /> 회의 내용 (회의록)
                            </Label>
                            <Textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="회의 내용을 자유롭게 작성하세요..."
                                className="min-h-[400px] text-base leading-relaxed p-4 resize-none focus-visible:ring-indigo-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar (Meta Info) */}
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="w-4 h-4" /> 일시
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-slate-600">
                                    <MapPin className="w-4 h-4" /> 장소
                                </Label>
                                <Input
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="회의실 A"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-slate-600">
                                    <Users className="w-4 h-4" /> 참석자
                                </Label>
                                <Input
                                    value={formData.attendees}
                                    onChange={e => setFormData({ ...formData, attendees: e.target.value })}
                                    placeholder="김철수, 이영희 (쉼표 구분)"
                                />
                                <p className="text-xs text-slate-400">이름을 쉼표로 구분하여 입력하세요.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
