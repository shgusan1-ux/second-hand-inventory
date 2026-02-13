'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getArticle, createArticle, updateArticle, deleteArticle, getCategories, KBCategory } from '@/lib/kb-actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2, Edit2, Eye, Calendar, User, Tag } from 'lucide-react';
import Link from 'next/link';

export default function ArticlePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const isNew = params.id === 'new';

    // Mode: 'view' or 'edit'. New articles start in 'edit'.
    const [mode, setMode] = useState<'view' | 'edit'>(isNew ? 'edit' : 'view');
    const [loading, setLoading] = useState(!isNew);

    const [article, setArticle] = useState<any>(null);
    const [categories, setCategories] = useState<KBCategory[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        content: ''
    });

    useEffect(() => {
        // Load categories
        getCategories().then(setCategories);

        if (!isNew) {
            getArticle(params.id).then((data) => {
                if (data) {
                    setArticle(data);
                    setFormData({
                        title: data.title,
                        categoryId: data.category_id || '',
                        content: data.content || ''
                    });
                } else {
                    toast.error('문서를 찾을 수 없습니다.');
                    router.push('/business/support');
                }
                setLoading(false);
            });
        }
    }, [params.id, isNew, router]);

    const handleSave = async () => {
        if (!formData.title || !formData.categoryId) {
            toast.error('제목과 카테고리는 필수입니다.');
            return;
        }

        let res;
        if (isNew) {
            res = await createArticle(formData);
        } else {
            res = await updateArticle(params.id, formData);
        }

        if (res.success) {
            toast.success('저장되었습니다.');
            if (isNew) {
                router.push(`/business/support/article/${res.id}`);
            } else {
                setMode('view');
                // Reload data to reflect updates
                const updated = await getArticle(params.id);
                setArticle(updated);
            }
        } else {
            toast.error('저장 실패: ' + res.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const res = await deleteArticle(params.id);
        if (res.success) {
            toast.success('삭제되었습니다.');
            router.push('/business/support');
        } else {
            toast.error('삭제 실패: ' + res.error);
        }
    };

    if (loading) return <div className="p-10 text-center">로딩 중...</div>;

    // --- View Mode ---
    if (mode === 'view' && article) {
        return (
            <div className="p-6 max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-start">
                    <Link href="/business/support" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> 목록으로
                    </Link>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setMode('edit')}>
                            <Edit2 className="w-4 h-4 mr-2" /> 수정
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">
                            {article.category_name}
                        </span>
                    </div>

                    <h1 className="text-4xl font-bold text-slate-900">{article.title}</h1>

                    <div className="flex items-center gap-6 text-slate-500 text-sm border-b pb-6">
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" /> {article.author_name}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> {new Date(article.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" /> {article.views} Hits
                        </span>
                    </div>
                </div>

                <div className="prose max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[400px]">
                    {article.content}
                </div>
            </div>
        );
    }

    // --- Edit Mode ---
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => isNew ? router.back() : setMode('view')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> 취소
                </Button>
                <div className="flex gap-2">
                    {!isNew && (
                        <Button variant="outline" onClick={handleDelete} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </Button>
                    )}
                    <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" /> 저장
                    </Button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <div className="space-y-3">
                    <Label>카테고리</Label>
                    <Select
                        value={formData.categoryId}
                        onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label>제목</Label>
                    <Input
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="문서 제목을 입력하며주세요"
                        className="text-xl font-bold h-14"
                    />
                </div>

                <div className="space-y-3">
                    <Label>내용</Label>
                    <Textarea
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        placeholder="상세 내용을 입력해주세요 (Markdown 지원)"
                        className="min-h-[500px] text-base leading-relaxed p-4 font-mono text-slate-700"
                    />
                </div>
            </div>
        </div>
    );
}
