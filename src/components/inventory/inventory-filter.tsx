'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RotateCcw, Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface InventoryFilterProps {
    brands?: string[];
    categories?: any[];
    onBulkSearch?: (codes: string[]) => void;
    onReset?: () => void;
    onFilterSearch?: (params: any) => void;
    isLoading?: boolean;
}

export function InventoryFilter({ brands = [], categories = [], onBulkSearch, onReset, onFilterSearch, isLoading }: InventoryFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // States for filter inputs (initialize from URL)
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [searchField, setSearchField] = useState(searchParams.get('field') || 'all');
    const [excludeCode, setExcludeCode] = useState(searchParams.get('excludeCode') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
    const [limit, setLimit] = useState(searchParams.get('limit') || '50');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(searchParams.get('status')?.split(',').filter(Boolean) || []);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.get('categories')?.split(',').filter(Boolean) || []);
    const [selectedConditions, setSelectedConditions] = useState<string[]>(searchParams.get('conditions')?.split(',').filter(Boolean) || []);
    const [selectedSizes, setSelectedSizes] = useState<string[]>(searchParams.get('sizes')?.split(',').filter(Boolean) || []);
    const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || 'all');
    const [smartstoreFilter, setSmartstoreFilter] = useState(searchParams.get('smartstore') || 'all');
    const [aiFilter, setAiFilter] = useState(searchParams.get('ai') || 'all');
    const [dateType, setDateType] = useState(searchParams.get('dateType') || 'created'); // created or updated

    const handleSearch = () => { // Trigger search
        // Smart Parsing for Glued Codes
        let rawCodes = query.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
        const cleanedCodes: string[] = [];

        for (const code of rawCodes) {
            if (code.length > 20 || (code.length > 10 && /[A-Z].*[A-Z]/.test(code))) {
                const parts = code.replace(/([a-z0-9])([A-Z]{3,})/g, '$1 $2').split(' ');
                cleanedCodes.push(...parts);
            } else {
                cleanedCodes.push(code);
            }
        }

        const finalCodes = cleanedCodes.filter(c => c.length >= 3);
        const isBulk = finalCodes.length > 1;

        if (isBulk && onBulkSearch) {
            if (finalCodes.length > 0) {
                onBulkSearch(finalCodes);
                return;
            }
        }

        // If excludeCode is present or filtering with heavy params, use callback (if provided)
        if (excludeCode && onFilterSearch) {
            const params: any = {};
            if (query) params.q = query;
            if (searchField && searchField !== 'all') params.field = searchField;
            if (excludeCode) params.excludeCode = excludeCode;
            if (dateType === 'updated') {
                if (startDate) params.updatedStart = startDate;
                if (endDate) params.updatedEnd = endDate;
            } else {
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
            }
            if (limit) params.limit = limit;
            if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',');
            if (selectedCategories.length > 0) params.categories = selectedCategories.join(',');
            if (selectedConditions.length > 0) params.conditions = selectedConditions.join(',');
            if (selectedSizes.length > 0) params.sizes = selectedSizes.join(',');
            if (selectedBrand && selectedBrand !== 'all') params.brand = selectedBrand;
            if (smartstoreFilter && smartstoreFilter !== 'all') params.smartstore = smartstoreFilter;
            if (aiFilter && aiFilter !== 'all') params.ai = aiFilter;

            onFilterSearch(params);
            return;
        }

        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (searchField && searchField !== 'all') params.set('field', searchField);
        if (excludeCode) params.set('excludeCode', excludeCode);

        if (dateType === 'updated') {
            if (startDate) params.set('updatedStart', startDate);
            if (endDate) params.set('updatedEnd', endDate);
        } else {
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
        }
        if (limit) params.set('limit', limit);
        if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));
        if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
        if (selectedConditions.length > 0) params.set('conditions', selectedConditions.join(','));
        if (selectedSizes.length > 0) params.set('sizes', selectedSizes.join(','));
        if (selectedBrand && selectedBrand !== 'all') params.set('brand', selectedBrand);
        if (smartstoreFilter && smartstoreFilter !== 'all') params.set('smartstore', smartstoreFilter);
        if (aiFilter && aiFilter !== 'all') params.set('ai', aiFilter);

        params.set('page', '1');
        router.push(`/inventory/manage?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const formatted = text.replace(/[\r\n]+/g, ' ');

        if (text.includes('\n') || text.length > 50) {
            setQuery(formatted);
        } else {
            setQuery(formatted);
        }
    };

    const applyDatePreset = (preset: string) => {
        if (preset === 'all') {
            setStartDate('');
            setEndDate('');
            return;
        }

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
            end = start;
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

    const resetFilters = () => {
        setQuery('');
        setSearchField('all');
        setExcludeCode('');
        setStartDate('');
        setEndDate('');
        setSelectedBrand('all');
        setSelectedStatuses([]);
        setSelectedCategories([]);
        setSelectedConditions([]);
        setSelectedSizes([]);
        setSmartstoreFilter('all');
        setAiFilter('all');
        setDateType('created');

        if (onReset) {
            onReset();
        } else {
            router.push('/inventory/manage');
        }
    };

    return (
        <Card className="mb-6 bg-slate-50 border-slate-200">
            <CardContent className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Main Search */}
                    <div className="flex-1 relative flex flex-wrap md:flex-nowrap gap-2 items-center">
                        {/* Search Field Select */}
                        <div className="w-full sm:w-[120px] shrink-0">
                            <Select value={searchField} onValueChange={setSearchField}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="검색 옵션" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">통합검색</SelectItem>
                                    <SelectItem value="name">상품명</SelectItem>
                                    <SelectItem value="id">상품코드</SelectItem>
                                    <SelectItem value="brand">브랜드</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Brand Select */}
                        <div className="w-full sm:w-[150px] shrink-0">
                            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="브랜드 전체" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">브랜드 전체</SelectItem>
                                    {brands.map((brand) => (
                                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative flex-1 min-w-[200px] w-full md:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="상품명, 코드 검색... (엑셀 붙여넣기 가능)"
                                className="pl-9 bg-white w-full"
                            />
                            {/* Code Counter */}
                            {query && (
                                <div className="absolute right-3 top-2.5 text-xs text-slate-400">
                                    {query.split(/[\n,\s]+/).filter(Boolean).length > 1 &&
                                        `${query.split(/[\n,\s]+/).filter(Boolean).length}개`
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={resetFilters} variant="outline" size="icon" title="필터 초기화">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleSearch} className="bg-slate-900 text-white hover:bg-slate-800 flex-1 md:flex-none">
                            검색
                        </Button>
                    </div>
                </div>

                {/* Additional Filters (Row 2) */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Status */}
                    <div className="w-full sm:w-[120px]">
                        <Select value={selectedStatuses.join(',')} onValueChange={(val) => setSelectedStatuses(val ? [val] : [])}>
                            <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="상태" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="판매중">판매중</SelectItem>
                                <SelectItem value="판매완료">판매완료</SelectItem>
                                <SelectItem value="판매대기">판매대기</SelectItem>
                                <SelectItem value="수정중">수정중</SelectItem>
                                <SelectItem value="예약중">예약중</SelectItem>
                                <SelectItem value="폐기">폐기</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* SmartStore */}
                    <div className="w-full sm:w-[130px]">
                        <Select value={smartstoreFilter} onValueChange={setSmartstoreFilter}>
                            <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="스마트스토어" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">스토어 전체</SelectItem>
                                <SelectItem value="registered">스토어 등록</SelectItem>
                                <SelectItem value="unregistered">스토어 미등록</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* AI Work */}
                    <div className="w-full sm:w-[120px]">
                        <Select value={aiFilter} onValueChange={setAiFilter}>
                            <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="AI작업" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">AI 전체</SelectItem>
                                <SelectItem value="done">AI 완료</SelectItem>
                                <SelectItem value="undone">AI 미완료</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div className="w-full sm:w-[120px]">
                        <Select value={selectedCategories.join(',')} onValueChange={(val) => setSelectedCategories(val ? [val] : [])}>
                            <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="카테고리" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {categories.map((cat: any) => (
                                    <SelectItem key={cat.id || cat.name} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Condition (Grade) */}
                    <div className="w-[100px]">
                        <Select value={selectedConditions.join(',')} onValueChange={(val) => setSelectedConditions(val ? [val] : [])}>
                            <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="등급" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="S급">S급 (새상품급)</SelectItem>
                                <SelectItem value="A급">A급 (사용감 적음)</SelectItem>
                                <SelectItem value="B급">B급 (사용감 있음)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Size */}
                    <div className="w-[100px]">
                        <Select value={selectedSizes.join(',')} onValueChange={(val) => setSelectedSizes(val ? [val] : [])}>
                            <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="사이즈" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="XS">XS</SelectItem>
                                <SelectItem value="S">S</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="L">L</SelectItem>
                                <SelectItem value="XL">XL</SelectItem>
                                <SelectItem value="XXL">XXL</SelectItem>
                                <SelectItem value="FREE">FREE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Type + Presets */}
                    <div className="flex gap-1 border-l pl-2 ml-2 items-center">
                        <div className="flex bg-slate-200 rounded-md p-0.5 mr-1">
                            <button onClick={() => setDateType('created')} className={`h-7 px-2 text-[10px] font-bold rounded ${dateType === 'created' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>등록일</button>
                            <button onClick={() => setDateType('updated')} className={`h-7 px-2 text-[10px] font-bold rounded ${dateType === 'updated' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>수정일</button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => applyDatePreset('all')} className="h-9 text-xs px-2 text-slate-500">전체</Button>
                        <Button variant="ghost" size="sm" onClick={() => applyDatePreset('today')} className="h-9 text-xs px-2 text-slate-500">오늘</Button>
                        <Button variant="ghost" size="sm" onClick={() => applyDatePreset('yesterday')} className="h-9 text-xs px-2 text-slate-500">어제</Button>
                        <Button variant="ghost" size="sm" onClick={() => applyDatePreset('week')} className="h-9 text-xs px-2 text-slate-500">1주</Button>
                        <Button variant="ghost" size="sm" onClick={() => applyDatePreset('month')} className="h-9 text-xs px-2 text-slate-500">1개월</Button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-slate-500">제외할 코드:</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={`h-9 text-xs justify-between w-[160px] ${excludeCode ? 'border-red-300 bg-red-50 text-red-700' : 'bg-white text-slate-500'}`}>
                                    {excludeCode
                                        ? `${excludeCode.split(/[\n,\s\t]+/).filter(Boolean).length}개 제외 설정됨`
                                        : '제외 코드 입력 (클릭)'}
                                    <span className="ml-1 opacity-50">▼</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-3" align="end">
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm">제외할 상품 코드 목록</h4>
                                    <p className="text-xs text-slate-500">
                                        엑셀에서 복사하여 붙여넣으세요. 줄바꿈, 콤마, 공백으로 자동 구분됩니다.
                                    </p>
                                    <textarea
                                        className="w-full h-[200px] text-xs p-2 border rounded resize-none font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                                        placeholder="EX) P001&#13;&#10;P002&#13;&#10;P003..."
                                        value={excludeCode}
                                        onChange={(e) => setExcludeCode(e.target.value)}
                                    />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">
                                            총 {excludeCode.split(/[\n,\s\t]+/).filter(Boolean).length}개
                                        </span>
                                        <Button variant="ghost" size="sm" onClick={() => setExcludeCode('')} className="h-6 text-red-500 hover:text-red-700 hover:bg-red-50">
                                            초기화
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
