'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { bulkCreateProducts } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { AlertCircle, FileSpreadsheet, Upload, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import * as XLSX from 'xlsx';

export function BulkProductForm() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [successCount, setSuccessCount] = useState(0);
    const [error, setError] = useState('');
    const [currentBatch, setCurrentBatch] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = async (file: File) => {
        setUploading(true);
        setError('');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to array of arrays (first row header)
            // range: 1 means skip header row (assumes row 0 is A, B, C... header labels)
            // But usually Excel has headers. Let's assume Row 1 is header.
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Analyze data structure
            // We expect specific column indexing based on previous A~Q mapping:
            // 0=A(ID), 1=B(Category), 2=C(Name), 3=D(PriceSell), 4=E(PriceConsumer)
            // 5~14=F~O(Images), 15=P(HTML), 16=Q(Brand)

            const parsedRows: any[] = [];
            // Skip first row if it contains headers (detect if A col is '판매자 관리코드' or similar)
            let startIndex = 0;
            if (jsonData.length > 0 && typeof jsonData[0][0] === 'string' &&
                (jsonData[0][0].includes('관리코드') || jsonData[0][0].includes('ID'))) {
                startIndex = 1;
            }

            for (let i = startIndex; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                // Safety check for minimal data (must have name)
                // Col 2 is Name (C)
                if (!row[2]) continue;

                // Extract Images (Col 5 ~ 14) -> F to O
                const images: string[] = [];
                for (let imgCol = 5; imgCol <= 14; imgCol++) {
                    if (row[imgCol]) images.push(String(row[imgCol]).trim());
                }

                parsedRows.push({
                    id: row[0] ? String(row[0]).trim() : '',
                    category: row[1] ? String(row[1]).trim() : '기타',
                    name: String(row[2]).trim(),
                    price_sell: row[3] ? Number(String(row[3]).replace(/,/g, '')) : 0,
                    price_consumer: row[4] ? Number(String(row[4]).replace(/,/g, '')) : 0,
                    image_url: images.length > 0 ? images[0] : '',
                    images: images,
                    md_comment: row[15] ? String(row[15]) : '', // Keep standard string, HTML is fine
                    brand: row[16] ? String(row[16]).trim() : '',
                    status: '판매중',
                    condition: 'A급',
                    size: ''
                });
            }

            setPreview(parsedRows.slice(0, 5)); // Show only top 5
            setTotalRows(parsedRows.length);
            // Store full data in a ref or just recalculate/keep in memory? 
            // Better to keep in state for submission, but memory might be an issue for 100k rows?
            // 100k rows * 1KB ~ 100MB. It's fine for modern browser memory.
            (window as any).__bulkData = parsedRows;

        } catch (err: any) {
            setError('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleUpload = async () => {
        const fullData = (window as any).__bulkData;
        if (!fullData || fullData.length === 0) return;

        setUploading(true);
        setProgress(0);
        setSuccessCount(0);
        setError('');

        const BATCH_SIZE = 50; // Safe batch size for Vercel functions
        const totalBatches = Math.ceil(fullData.length / BATCH_SIZE);
        let completed = 0;

        for (let i = 0; i < fullData.length; i += BATCH_SIZE) {
            setCurrentBatch(Math.floor(i / BATCH_SIZE) + 1);
            const chunk = fullData.slice(i, i + BATCH_SIZE);

            try {
                const res = await bulkCreateProducts(chunk);
                if (res.success) {
                    completed += res.count || chunk.length;
                    setSuccessCount(completed);
                } else {
                    // Log error but maybe continue? Or stop?
                    // For now, let's continue but log it.
                    console.error(`Batch ${i} failed:`, res.error);
                }
            } catch (e) {
                console.error(`Batch ${i} network error`);
            }

            // Update Progress
            const percent = Math.min(100, Math.round(((i + chunk.length) / fullData.length) * 100));
            setProgress(percent);

            // Small delay to prevent freezing UI completely
            await new Promise(r => setTimeout(r, 10));
        }

        setUploading(false);
        alert(`${completed}개 상품 등록이 완료되었습니다.`);
        router.refresh();
        setFile(null);
        setPreview([]);
        setTotalRows(0);
    };

    return (
        <div className="space-y-6">
            <Card className="border-emerald-100 shadow-sm">
                <CardHeader className="bg-emerald-50/50">
                    <CardTitle className="flex items-center gap-2 text-emerald-800">
                        <FileSpreadsheet className="h-5 w-5" />
                        대량 등록 (Excel Upload)
                    </CardTitle>
                    <CardDescription>
                        .xlsx 파일을 업로드하면 자동으로 대량 등록을 시작합니다. (최대 10만개 지원)
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {!file ? (
                        <div
                            className="border-2 border-dashed border-emerald-200 rounded-lg p-10 text-center cursor-pointer hover:bg-emerald-50/30 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                            />
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                                <div className="p-3 bg-emerald-100 rounded-full">
                                    <Upload className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div className="font-medium text-lg text-slate-700">엑셀 파일 업로드</div>
                                <p className="text-sm">클릭하여 파일을 선택하세요 (.xlsx)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                    <div>
                                        <p className="font-medium text-slate-900">{file.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB / {totalRows.toLocaleString()}개 상품 발견됨
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setTotalRows(0); }}>
                                    변경
                                </Button>
                            </div>

                            {/* Preview Table */}
                            {preview.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 border-b">
                                        데이터 미리보기 (상위 5개)
                                    </div>
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-white border-b">
                                            <tr>
                                                <th className="px-3 py-2 font-medium w-32">관리코드</th>
                                                <th className="px-3 py-2 font-medium">상품명</th>
                                                <th className="px-3 py-2 font-medium w-24">판매가</th>
                                                <th className="px-3 py-2 font-medium w-16 text-center">이미지</th>
                                                <th className="px-3 py-2 font-medium w-16 text-center">상세</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y bg-white">
                                            {preview.map((row, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2 truncate">{row.id}</td>
                                                    <td className="px-3 py-2 truncate max-w-[200px]">{row.name}</td>
                                                    <td className="px-3 py-2">{row.price_sell.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-center text-emerald-600">{row.image_url ? 'O' : '-'}</td>
                                                    <td className="px-3 py-2 text-center text-slate-500">
                                                        {row.md_comment ? 'HTML' : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Progress UI */}
                            {uploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                            업로드 진행 중... (배치 {currentBatch})
                                        </span>
                                        <span className="font-bold">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 text-right">
                                        {successCount.toLocaleString()} / {totalRows.toLocaleString()} 완료
                                    </p>
                                </div>
                            )}

                            {!uploading && error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>오류</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {!uploading && (
                                <Button
                                    onClick={handleUpload}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg font-bold"
                                    disabled={totalRows === 0}
                                >
                                    {totalRows.toLocaleString()}개 상품 일괄 등록 시작
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-600 space-y-2">
                <p className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    엑셀 파일 형식 안내
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1 text-slate-500 text-xs">
                    <li><strong>A열</strong>: 판매자 관리코드 (ID)</li>
                    <li><strong>B열</strong>: 카테고리 (상의, 하의 등)</li>
                    <li><strong>C열</strong>: 상품명 (필수)</li>
                    <li><strong>D열</strong>: 판매가 (숫자)</li>
                    <li><strong>E열</strong>: 소비자가 (숫자)</li>
                    <li><strong>F~O열</strong>: 이미지 URL (최대 10개)</li>
                    <li><strong>P열</strong>: 상품 상세 설명 (HTML 가능, 대용량 지원)</li>
                    <li><strong>Q열</strong>: 브랜드</li>
                </ul>
            </div>
        </div>
    );
}
