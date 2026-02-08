'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createProduct, bulkCreateProducts } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ensureBrand } from '@/lib/brand-extractor';

interface Category {
    id: string;
    name: string;
    sort_order: number;
}

export function ProductForm({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [pasteData, setPasteData] = useState('');
    const [parsedData, setParsedData] = useState<any[]>([]);

    // State for numeric category input
    const [categoryNum, setCategoryNum] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // Handle category number change
    const handleCategoryNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value;
        setCategoryNum(num);
        const cat = categories.find(c => c.sort_order.toString() === num);
        if (cat) {
            setSelectedCategory(cat.name);
        } else {
            setSelectedCategory('');
        }
    };

    const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setPasteData(text);

        // Simple TSV Parser
        const rows = text.trim().split('\n').map(row => row.split('\t'));
        if (rows.length === 0) return;

        const preview = rows.map((cols, i) => {
            // [ID] [Name] [Brand] [Category] [PriceSell] [Condition] [MasterRegDate?]
            const productName = cols[1]?.trim() || '이름 없음';
            const brandFromPaste = cols[2]?.trim() || '';
            const masterRegDate = cols[7]?.trim() || ''; // 8번째 컬럼

            return {
                id: cols[0]?.trim() || `AUTO-${Date.now()}-${i}`,
                name: productName,
                brand: ensureBrand(productName, brandFromPaste),
                category: cols[3]?.trim() || '기타',
                price_consumer: parseInt(cols[4]?.replace(/,/g, '') || '0'),
                price_sell: parseInt(cols[5]?.replace(/,/g, '') || '0'),
                condition: cols[6]?.trim() || 'A급',
                master_reg_date: masterRegDate || null,
                status: '판매중',
                image_url: '',
                md_comment: '',
                images: []
            };
        });
        setParsedData(preview);
    };

    const handleBulkSubmit = async () => {
        if (parsedData.length === 0) return;

        const result = await bulkCreateProducts(parsedData);
        if (result.success) {
            alert(`${result.count}개 등록 완료!`);
            router.push('/inventory');
        } else {
            alert('등록 실패: ' + result.error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex space-x-4 mb-6">
                <Button
                    variant={mode === 'single' ? 'default' : 'outline'}
                    onClick={() => setMode('single')}
                >
                    개별 등록
                </Button>
                <Button
                    variant={mode === 'bulk' ? 'default' : 'outline'}
                    onClick={() => setMode('bulk')}
                >
                    엑셀 붙여넣기 (Bulk)
                </Button>
            </div>

            {mode === 'single' ? (
                <Card>
                    <CardHeader>
                        <CardTitle>상품 정보 입력</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createProduct} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">자체상품코드 (ID)</label>
                                    <Input name="id" placeholder="예: TOP-001" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">카테고리</label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="번류 번호"
                                            className="w-24"
                                            value={categoryNum}
                                            onChange={handleCategoryNumChange}
                                        />
                                        <select
                                            name="category"
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={selectedCategory}
                                            onChange={(e) => {
                                                setSelectedCategory(e.target.value);
                                                const cat = categories.find(c => c.name === e.target.value);
                                                if (cat) setCategoryNum(cat.sort_order.toString());
                                            }}
                                        >
                                            <option value="">선택하세요</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>
                                                    {cat.name} ({cat.sort_order})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">상품명</label>
                                <Input name="name" placeholder="상품명 입력" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">브랜드</label>
                                    <Input name="brand" placeholder="브랜드" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">제품 상태</label>
                                    <select name="condition" defaultValue="A급" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                                        <option value="S급">S급 (새상품급)</option>
                                        <option value="A급">A급 (사용감 적음)</option>
                                        <option value="B급">B급 (사용감 있음)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">소비자가격 (정상가)</label>
                                    <Input name="price_consumer" type="number" placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-emerald-600 font-bold">판매가격</label>
                                    <Input name="price_sell" type="number" placeholder="0" className="border-emerald-500 ring-emerald-100" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-blue-600">마스터 등록일 (선택)</label>
                                <Input
                                    name="master_reg_date"
                                    type="date"
                                    className="border-blue-300"
                                    placeholder="YYYY-MM-DD"
                                />
                                <p className="text-xs text-slate-500">
                                    * 비워두면 오늘 날짜로 자동 설정됩니다.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">이미지 URL (최대 5개)</label>
                                <div className="space-y-2">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <Input key={i} name={`image_${i}`} placeholder={`이미지 URL ${i + 1}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">MD 코멘트</label>
                                <textarea
                                    name="md_comment"
                                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                                    placeholder="상품에 대한 설명을 입력하세요..."
                                />
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">등록하기</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-emerald-500 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center text-emerald-700">
                            <FileSpreadsheet className="mr-2" />
                            엑셀 데이터 붙여넣기
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            엑셀에서 데이터를 복사(Ctrl+C)하여 아래에 붙여넣기(Ctrl+V) 하세요.<br />
                            순서: <strong>[ID] [상품명] [브랜드] [카테고리] [정상가] [판매가] [상태] [마스터등록일(선택)]</strong>
                        </p>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            className="w-full h-40 p-3 border rounded-md font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder={`예시:\nTOP-001\t나이키 티셔츠\t나이키\t상의\t50000\t25000\tA급\n...`}
                            value={pasteData}
                            onChange={handlePaste}
                        />

                        {parsedData.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-semibold mb-2">미리보기 ({parsedData.length}건)</h4>
                                <div className="max-h-60 overflow-auto border rounded-md">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 sticky top-0">
                                            <tr>
                                                <th className="p-2 border-b">ID</th>
                                                <th className="p-2 border-b">상품명</th>
                                                <th className="p-2 border-b">판매가</th>
                                                <th className="p-2 border-b">상태</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.map((row, i) => (
                                                <tr key={i} className="border-b">
                                                    <td className="p-2">{row.id}</td>
                                                    <td className="p-2">{row.name}</td>
                                                    <td className="p-2">{row.price_sell}</td>
                                                    <td className="p-2">{row.condition}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Button onClick={handleBulkSubmit} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
                                    {parsedData.length}개 일괄 등록하기
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
