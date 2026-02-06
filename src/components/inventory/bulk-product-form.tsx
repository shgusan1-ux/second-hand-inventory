'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { bulkCreateProducts } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { AlertCircle, FileSpreadsheet, ListPlus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

// Column definitions based on User Request A~Q
const COLUMNS = [
    { id: 'A', label: 'A: 판매자 관리코드', key: 'id', width: 'w-40' },
    { id: 'B', label: 'B: 카테고리코드', key: 'category', width: 'w-32' },
    { id: 'C', label: 'C: 온라인 상품명', key: 'name', width: 'w-64' },
    { id: 'D', label: 'D: 판매가', key: 'price_sell', width: 'w-32' },
    { id: 'E', label: 'E: 소비자가', key: 'price_consumer', width: 'w-32' },
    // Images F~O
    { id: 'F', label: 'F: 이미지1', key: 'image_0', width: 'w-48' },
    { id: 'G', label: 'G: 이미지2', key: 'image_1', width: 'w-48' },
    { id: 'H', label: 'H: 이미지3', key: 'image_2', width: 'w-48' },
    { id: 'I', label: 'I: 이미지4', key: 'image_3', width: 'w-48' },
    { id: 'J', label: 'J: 이미지5', key: 'image_4', width: 'w-48' },
    { id: 'K', label: 'K: 이미지6', key: 'image_5', width: 'w-48' },
    { id: 'L', label: 'L: 이미지7', key: 'image_6', width: 'w-48' },
    { id: 'M', label: 'M: 이미지8', key: 'image_7', width: 'w-48' },
    { id: 'N', label: 'N: 이미지9', key: 'image_8', width: 'w-48' },
    { id: 'O', label: 'O: 이미지10', key: 'image_9', width: 'w-48' },
    // Details
    { id: 'P', label: 'P: 상품상세', key: 'md_comment', width: 'w-80' },
    { id: 'Q', label: 'Q: 브랜드', key: 'brand', width: 'w-40' },
];

export function BulkProductForm() {
    // Store raw text for each column
    const [columnData, setColumnData] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleColumnChange = (key: string, value: string) => {
        setColumnData(prev => {
            const next = { ...prev, [key]: value };
            parseColumns(next);
            return next;
        });
    };

    const clearAll = () => {
        setColumnData({});
        setPreview([]);
    };

    const parseColumns = (data: Record<string, string>) => {
        // 1. Determine max rows
        let maxRows = 0;
        const splitData: Record<string, string[]> = {};

        Object.keys(data).forEach(key => {
            const lines = data[key].trimEnd().split('\n');
            splitData[key] = lines;
            if (lines.length > maxRows) maxRows = lines.length;
        });

        if (maxRows === 0) {
            setPreview([]);
            return;
        }

        // 2. Zip logic
        const parsedRows = [];
        for (let i = 0; i < maxRows; i++) {
            const row: any = {};
            const images: string[] = [];

            // Helper to safely get value at index i
            const getVal = (key: string) => {
                const arr = splitData[key];
                return (arr && arr[i]) ? arr[i].trim() : '';
            };

            // Basic Fields
            const name = getVal('name');
            if (!name) continue; // Skip empty rows (must have name)

            row.id = getVal('id');
            row.name = name;
            row.category = getVal('category') || '기타';
            row.brand = getVal('brand');

            // Prices
            row.price_sell = Number(getVal('price_sell').replace(/,/g, '')) || 0;
            row.price_consumer = Number(getVal('price_consumer').replace(/,/g, '')) || 0;

            // Fixed Defaults
            row.status = '판매중';
            row.condition = 'A급';

            // Images (F~O)
            for (let imgIdx = 0; imgIdx < 10; imgIdx++) {
                const url = getVal(`image_${imgIdx}`);
                if (url) images.push(url);
            }
            row.images = images;
            row.image_url = images.length > 0 ? images[0] : '';

            // Details
            row.md_comment = getVal('md_comment');
            row.size = ''; // Not in A-Q request, default empty

            parsedRows.push(row);
        }

        setPreview(parsedRows);
    };

    const handleSubmit = async () => {
        if (preview.length === 0) return;
        setLoading(true);
        setError('');

        const res = await bulkCreateProducts(preview);
        if (res.success) {
            alert(`${res.count}개 상품이 등록되었습니다.`);
            router.push('/inventory');
            router.refresh();
        } else {
            setError(res.error || '등록 실패');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-emerald-100 shadow-sm">
                <CardHeader className="bg-emerald-50/50 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-emerald-800">
                                <ListPlus className="h-5 w-5" />
                                엑셀 열(Column) 붙여넣기 모드
                            </CardTitle>
                            <CardDescription className="mt-1">
                                엑셀에서 해당 열을 전체 복사하여 아래 각 칸에 붙여넣으세요. (세로로 붙여넣기)
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4 mr-1" /> 전체 지우기
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <div className="flex divide-x divide-slate-100 w-max min-w-full">
                            {COLUMNS.map((col) => (
                                <div key={col.id} className={`flex flex-col ${col.width} shrink-0`}>
                                    <div className="bg-slate-100/50 p-2 text-xs font-semibold text-center border-b text-slate-600 truncate px-1" title={col.label}>
                                        {col.label}
                                    </div>
                                    <textarea
                                        className="h-[300px] w-full p-2 text-xs font-mono leading-none resize-none focus:outline-none focus:bg-blue-50/50 border-none bg-transparent whitespace-pre overflow-x-hidden"
                                        placeholder={`${col.id}열 붙여넣기`}
                                        value={columnData[col.key] || ''}
                                        onChange={(e) => handleColumnChange(col.key, e.target.value)}
                                        wrap="off"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {preview.length > 0 && (
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-base">미리보기 ({preview.length}개 인식됨)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[300px] overflow-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 border-b sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">관리코드</th>
                                        <th className="px-3 py-2 font-medium">상품명</th>
                                        <th className="px-3 py-2 font-medium">브랜드</th>
                                        <th className="px-3 py-2 font-medium">판매가</th>
                                        <th className="px-3 py-2 font-medium">이미지</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {preview.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 w-24 truncate">{item.id}</td>
                                            <td className="px-3 py-2 max-w-[200px] truncate" title={item.name}>{item.name}</td>
                                            <td className="px-3 py-2 w-24 truncate">{item.brand}</td>
                                            <td className="px-3 py-2 w-24">{item.price_sell.toLocaleString()}</td>
                                            <td className="px-3 py-2 w-16 text-center">
                                                {item.image_url ? <span className="text-emerald-600">O</span> : <span className="text-slate-300">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>오류</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end gap-3 pb-8">
                <Button variant="outline" onClick={() => router.back()}>취소</Button>
                <Button onClick={handleSubmit} disabled={loading || preview.length === 0} className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px]">
                    {loading ? '등록 중...' : `${preview.length}개 상품 일괄 등록`}
                </Button>
            </div>
        </div>
    );
}
