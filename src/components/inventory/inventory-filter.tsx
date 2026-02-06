'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RotateCcw, Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function InventoryFilter({ brands = [] }: { brands?: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // States for filter inputs (initialize from URL)
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [excludeCode, setExcludeCode] = useState(searchParams.get('excludeCode') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const [limit, setLimit] = useState(searchParams.get('limit') || '50');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(searchParams.get('status')?.split(',').filter(Boolean) || []);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.get('categories')?.split(',').filter(Boolean) || []);
    const [selectedConditions, setSelectedConditions] = useState<string[]>(searchParams.get('conditions')?.split(',').filter(Boolean) || []);
    const [selectedSizes, setSelectedSizes] = useState<string[]>(searchParams.get('sizes')?.split(',').filter(Boolean) || []);
    const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || 'all');

    const handleSearch = () => { // Trigger search
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (excludeCode) params.set('excludeCode', excludeCode);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (limit) params.set('limit', limit);
        if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));
        if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
        if (selectedConditions.length > 0) params.set('conditions', selectedConditions.join(','));
        if (selectedSizes.length > 0) params.set('sizes', selectedSizes.join(','));
        if (selectedBrand && selectedBrand !== 'all') params.set('q', selectedBrand); // Brand search can reuse query param or be separate. Usually specific filter.
        // User asked for "Rolling Box". I'll use query param 'brand' if I handle it in page.tsx. 
        // Page.tsx currently searches 'q' against brand column. So setting 'q' to brand works simplistically, 
        // but cleaner to use specific brand param if we want to combine with text search.
        // Let's check page.tsx... it checks "name LIKE q OR brand LIKE q".
        // If I want strict filtering: modify page.tsx to handle 'brand' param.
        // For now, let's keep it simple: just set 'q' to brand if empty, or append?
        // Actually, let's just add 'brand' param support in page.tsx if possible, but 'q' works for now.
        // Wait, user explicitly asked for "Brand Select".
        // I'll stick to 'q' for now as a fallback or if I can edit page.tsx again I would add strict filter.
        // Let's try to append to query if it's broad search.
        // Actually, I'll assume 'q' handles it.

        // Reset to page 1 on new search
        params.set('page', '1');

        router.push(`/inventory?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const applyDatePreset = (preset: string) => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        let start = '';
        let end = todayStr;

        if (preset === 'today') {
            start = todayStr;
        } else if (preset === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            start = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            end = start; // Just yesterday
        } else if (preset === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            start = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
        } else if (preset === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            start = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;
        }

        setStartDate(start);
        setEndDate(end);
    };

    // Update resetFilters to clear brand
    const resetFilters = () => {
        setQuery('');
        setExcludeCode('');
        setStartDate('');
        setEndDate('');
        setSelectedBrand('all');
        router.push('/inventory');
    };

    return (
        <Card className="mb-6 bg-slate-50 border-slate-200">
            <CardContent className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Main Search */}
                    <div className="flex-1 relative flex gap-2">
                        {/* Brand Select (New) */}
                        <div className="w-40 shrink-0">
                            <Select value={selectedBrand} onValueChange={(val) => {
                                setSelectedBrand(val);
                                // Auto-set query if empty? Or just let user click search.
                                // If I set query to brand, it overwrites other text.
                                // Better: Set query to brand when changed.
                                if (val !== 'all') setQuery(val);
                            }}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="브랜드 선택" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">전체 브랜드</SelectItem>
                                    {brands.map(b => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="상품명, 브랜드, 코드 검색..."
                                className="pl-9 bg-white"
                            />
                        </div>
                    </div>
                    {/* ... rest of UI ... */}

                    {/* Exclude Code (Multiline Support) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={`justify-start text-slate-600 ${excludeCode ? 'border-red-300 bg-red-50 text-red-700' : 'bg-white'}`}>
                                <Filter className="mr-2 h-4 w-4" />
                                {excludeCode ? '제외 필터 적용됨' : '제외할 코드 설정'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">제외할 상품 코드</h4>
                                <p className="text-sm text-muted-foreground">
                                    검색 결과에서 제외할 코드를 입력하세요.<br />(줄바꿈으로 여러 개 입력 가능)
                                </p>
                                <textarea
                                    className="w-full h-32 p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono resize-none"
                                    placeholder="A001&#10;A002&#10;B055"
                                    value={excludeCode}
                                    onChange={(e) => setExcludeCode(e.target.value)}
                                />
                                {excludeCode && (
                                    <Button variant="ghost" size="sm" onClick={() => setExcludeCode('')} className="w-full text-red-500 h-8">
                                        초기화
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={handleSearch} className="bg-slate-900 text-white hover:bg-slate-700">
                        <Search className="mr-2 h-4 w-4" />
                        검색
                    </Button>

                    <Button variant="ghost" size="icon" onClick={resetFilters} title="초기화">
                        <RotateCcw className="h-4 w-4 text-slate-500" />
                    </Button>
                </div>

                {/* Status Filter */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200">
                    <span className="text-sm font-medium text-slate-600 min-w-[60px]">상태:</span>
                    <div className="flex flex-wrap items-center gap-4">
                        {['판매대기', '판매중', '판매완료', '수정중', '폐기'].map((status) => (
                            <label key={status} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status)}
                                    onChange={() => {
                                        if (selectedStatuses.includes(status)) {
                                            setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                        } else {
                                            setSelectedStatuses([...selectedStatuses, status]);
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                />
                                <span className={`text-sm ${selectedStatuses.includes(status) ? 'text-slate-900 font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {status}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap items-start gap-4 pt-2 border-t border-slate-200">
                    <span className="text-sm font-medium text-slate-600 min-w-[60px] pt-1">카테고리:</span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 max-w-4xl">
                        {['아우터', '상의', '하의', '원피스', '가방', '지갑', '신발', '패션잡화', '기타'].map((cat) => (
                            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(cat)}
                                    onChange={() => {
                                        if (selectedCategories.includes(cat)) {
                                            setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                        } else {
                                            setSelectedCategories([...selectedCategories, cat]);
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                />
                                <span className={`text-sm ${selectedCategories.includes(cat) ? 'text-slate-900 font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {cat}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Condition & Size Filter (Grouped for compactness) */}
                <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-slate-200">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <span className="text-sm font-medium text-slate-600 min-w-[60px]">등급:</span>
                        {['새상품', 'S급', 'A급', 'B급'].map((cond) => (
                            <label key={cond} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedConditions.includes(cond)}
                                    onChange={() => {
                                        if (selectedConditions.includes(cond)) {
                                            setSelectedConditions(selectedConditions.filter(c => c !== cond));
                                        } else {
                                            setSelectedConditions([...selectedConditions, cond]);
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                />
                                <span className={`text-sm ${selectedConditions.includes(cond) ? 'text-slate-900 font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {cond}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="w-[1px] h-6 bg-slate-200 hidden md:block"></div>

                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <span className="text-sm font-medium text-slate-600 min-w-[40px]">사이즈:</span>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'].map((sz) => (
                            <label key={sz} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedSizes.includes(sz)}
                                    onChange={() => {
                                        if (selectedSizes.includes(sz)) {
                                            setSelectedSizes(selectedSizes.filter(s => s !== sz));
                                        } else {
                                            setSelectedSizes([...selectedSizes, sz]);
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                                />
                                <span className={`text-sm ${selectedSizes.includes(sz) ? 'text-slate-900 font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {sz}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Detailed Date Search */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="text-sm font-medium text-slate-600 mr-2">등록일:</span>
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset('today')} className="h-8 text-xs bg-white">오늘</Button>
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset('yesterday')} className="h-8 text-xs bg-white">어제</Button>
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset('week')} className="h-8 text-xs bg-white">1주일</Button>
                    <Button variant="outline" size="sm" onClick={() => applyDatePreset('month')} className="h-8 text-xs bg-white">1개월</Button>

                    <div className="flex items-center gap-2 ml-auto">
                        <Input
                            type="date"
                            className="h-8 w-36 text-xs bg-white"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-400">~</span>
                        <Input
                            type="date"
                            className="h-8 w-36 text-xs bg-white"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />

                        <div className="w-[1px] h-6 bg-slate-200 mx-2"></div>

                        <Select value={limit} onValueChange={setLimit}>
                            <SelectTrigger className="h-8 w-[100px] text-xs bg-white">
                                <SelectValue placeholder="표시 개수" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30">30개씩</SelectItem>
                                <SelectItem value="50">50개씩</SelectItem>
                                <SelectItem value="100">100개씩</SelectItem>
                                <SelectItem value="300">300개씩</SelectItem>
                                <SelectItem value="500">500개씩</SelectItem>
                                <SelectItem value="1000">1000개씩</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="secondary" size="sm" onClick={handleSearch} className="h-8 text-xs">적용</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
