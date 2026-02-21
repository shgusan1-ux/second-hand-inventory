'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { bulkCreateProducts } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input'; // Added Input import

// XLSX: 동적 import (~500KB 절감)
import { ensureBrand } from '@/lib/brand-extractor';

export function CornerLogisImportForm() {
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const parseData = (input: string) => {
        const rows = input.trim().split('\n');
        const parsed = rows.map((row, index) => {
            // Expected Format: Code | ProcessImage | ProcessName | ProductImages(comma/space?) | Size
            // Assuming Tab separated or Pipe? Usually Excel copy-paste is Tab separated.
            // Let's assume Tab for now.
            const cols = row.split('\t').map(c => c.trim());

            // Allow some flexibility, but strictly check for size if possible
            if (cols.length < 5) return null;

            // Col 0: Code -> ID
            // Col 1: ProcessImage -> image_url (Main for now)
            // Col 2: ProcessName -> Name
            // Col 3: ProductImages (e.g., "1.jpg, 2.jpg") -> images array
            // Col 4: Size -> size

            const id = cols[0];
            const name = cols[2];
            let image_url = cols[1]; // "Raw Image to process"
            const rawImagesStr = cols[3];
            const size = cols[4];

            // Parse Image List
            // "1.jpg, 2.jpg, label1.jpg" -> ["1.jpg", "2.jpg", "label1.jpg"]
            // Split by comma or space? Usually comma in descriptions.
            const images = rawImagesStr.split(',').map(s => s.trim()).filter(Boolean);

            // Cleanup ID (remove spaces)
            const cleanId = id.replace(/\s/g, '').toUpperCase();

            // Fallback for image_url if empty but images list exists
            if (!image_url && images.length > 0) image_url = images[0];

            return {
                id: cleanId,
                name: name || '상품명 없음',
                brand: ensureBrand(name || ''), // Extract brand from product name
                category: '기타', // Not provided
                price_consumer: 0,
                price_sell: 0, // Needs pricing engine later
                status: '판매중',
                condition: 'A급', // Default
                md_comment: '',
                image_url: image_url || '', // Filename for now, needs real URL later
                images: images,
                size: size || ''
            };
        }).filter(Boolean);
        setPreview(parsed);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const XLSX = await import('xlsx');
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // Get raw csv text to reuse existing parseData logic, or parse json
            // Let's parse JSON and map to string format or just use CSV
            const csv = XLSX.utils.sheet_to_csv(ws, { FS: '\t' });
            setText(csv);
            parseData(csv);
        };
        reader.readAsBinaryString(file);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        parseData(e.target.value);
    };

    const handleSubmit = async () => {
        if (preview.length === 0) return;
        setLoading(true);
        setError('');

        const res = await bulkCreateProducts(preview);
        if (res.success) {
            alert(`${res.count}개 데이터가 임포트되었습니다.`);
            router.push('/inventory');
            router.refresh();
        } else {
            setError(res.error || '임포트 실패');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-indigo-100 bg-indigo-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        코너로지스 데이터 붙여넣기
                    </CardTitle>
                    <CardDescription>
                        엑셀 데이터를 복사(Ctrl+C)하여 붙여넣기(Ctrl+V) 하세요.<br />
                        <strong>순서:</strong> 상품코드 | 가공대상 이미지 | 가공대상 상품명 | 상품이미지 목록 | 사이즈
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-indigo-900 mb-2">
                            엑셀 파일 업로드 (또는 아래에 붙여넣기)
                        </label>
                        <Input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="bg-white border-indigo-200"
                        />
                    </div>
                    <Textarea
                        placeholder={`예시:\nA01001\timg001_raw.jpg\t폴로 랄프로렌 셔츠\t1.jpg, 2.jpg, label.jpg\tL\n...`}
                        className="min-h-[200px] font-mono text-xs bg-white"
                        value={text}
                        onChange={handleTextChange}
                    />
                </CardContent>
            </Card>

            {preview.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>데이터 미리보기 ({preview.length}건)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border max-h-[400px] overflow-auto bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">코드(ID)</th>
                                        <th className="px-4 py-2">상품명</th>
                                        <th className="px-4 py-2">사이즈</th>
                                        <th className="px-4 py-2">이미지 개수</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-xs">
                                    {preview.map((item, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 font-mono">{item.id}</td>
                                            <td className="px-4 py-2">{item.name}</td>
                                            <td className="px-4 py-2 font-bold text-indigo-600">{item.size}</td>
                                            <td className="px-4 py-2 text-slate-500">{item.images.length}장</td>
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

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.back()}>취소</Button>
                <Button onClick={handleSubmit} disabled={loading || preview.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                    {loading ? '처리 중...' : `코너로지스 데이터 ${preview.length}건 가져오기`}
                </Button>
            </div>
        </div>
    );
}
