'use client';

import { useState, useEffect } from 'react';
import { getCategories, getArticles, createCategory, KBCategory, KBArticle } from '@/lib/kb-actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Book, Plus, GraduationCap, ChevronRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export default function SupportPage({ searchParams }: { searchParams: { category?: string, q?: string, new?: string } }) {
    const [categories, setCategories] = useState<KBCategory[]>([]);
    const [articles, setArticles] = useState<KBArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.q || '');

    // Create Cat Modal
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    useEffect(() => {
        loadData();
    }, [searchParams.category, searchParams.q]);

    const loadData = async () => {
        setLoading(true);
        const [cats, arts] = await Promise.all([
            getCategories(),
            getArticles(searchParams.category, searchParams.q)
        ]);
        setCategories(cats);
        setArticles(arts);
        setLoading(false);
    };

    const handleCreateCategory = async () => {
        if (!newCatName) return;
        const res = await createCategory(newCatName, '');
        if (res.success) {
            toast.success('카테고리가 생성되었습니다.');
            setIsCatModalOpen(false);
            setNewCatName('');
            loadData();
        } else {
            toast.error('생성 실패: ' + res.error);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Ideally use router.push to update search params
        window.location.href = `/business/support?q=${searchQuery}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <GraduationCap className="w-8 h-8" />
                            업무 지식 센터 (Knowledge Base)
                        </h1>
                        <p className="mt-2 text-indigo-100 opacity-90 max-w-2xl">
                            업무 매뉴얼, 시스템 사용법, 고객 대응 가이드 등 사내 모든 지식을 공유하는 공간입니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border-0"
                            onClick={() => setIsCatModalOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" /> 카테고리 추가
                        </Button>
                        <Link href="/business/support/article/new">
                            <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold border-0 shadow-md">
                                <Plus className="w-4 h-4 mr-2" /> 새 문서 작성
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mt-8 max-w-3xl">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="무엇을 도와드릴까요? (검색어 입력)"
                            className="w-full h-14 pl-12 pr-4 rounded-xl text-lg text-slate-900 bg-white/95 border-0 shadow-inner focus-visible:ring-offset-0 focus-visible:ring-4 focus-visible:ring-white/30"
                        />
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar: Categories */}
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-bold text-slate-700 px-2">카테고리</h3>
                    <div className="space-y-1">
                        <Link href="/business/support">
                            <Button variant="ghost" className={`w-full justify-start ${!searchParams.category ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}>
                                <Book className="w-4 h-4 mr-2 text-slate-400" />
                                전체 보기
                            </Button>
                        </Link>
                        {categories.map(cat => (
                            <Link key={cat.id} href={`/business/support?category=${cat.id}`}>
                                <Button variant="ghost" className={`w-full justify-start ${searchParams.category === cat.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}>
                                    <ChevronRight className="w-4 h-4 mr-2 text-slate-300" />
                                    {cat.name}
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Main: Article List */}
                <div className="md:col-span-3">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)}
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed text-slate-500">
                            <p className="mb-4">등록된 문서가 없습니다.</p>
                            <Link href="/business/support/article/new">
                                <Button>첫 번째 문서 작성하기</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {articles.map(article => (
                                <Link key={article.id} href={`/business/support/article/${article.id}`}>
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">
                                                    {article.category_name || '일반'}
                                                </Badge>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(article.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600">
                                                {article.title}
                                            </h3>
                                            <p className="text-slate-500 line-clamp-2 text-sm">
                                                {article.content?.substring(0, 200).replace(/<[^>]*>?/gm, '')}
                                            </p>
                                            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                                                <span>작성자: {article.author_name}</span>
                                                <span>조회수: {article.views}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Category Modal */}
            <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>새 카테고리 추가</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>카테고리 이름</Label>
                        <Input
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            placeholder="예: 시스템 매뉴얼"
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCatModalOpen(false)}>취소</Button>
                        <Button onClick={handleCreateCategory}>생성</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
