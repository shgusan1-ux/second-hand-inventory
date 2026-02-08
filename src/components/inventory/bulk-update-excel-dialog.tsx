'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { bulkUpdateFromExcel } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export function BulkUpdateExcelDialog() {
    const router = useRouter();
    const [resultDetails, setResultDetails] = useState<{ id: string, name: string, status: 'success' | 'error', message?: string }[] | null>(null);
    const [counts, setCounts] = useState({ success: 0, fail: 0 });
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewCount, setPreviewCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedData, setParsedData] = useState<any[]>([]);

    const [progress, setProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsLoading(true); // Loading file
        setResultDetails(null);

        try {
            const data = await parseExcel(selectedFile);
            setParsedData(data);
            setPreviewCount(data.length);
            toast.success(`${data.length}개 데이터 로드 완료`);
        } catch (error) {
            console.error('Excel parse error:', error);
            toast.error('엑셀 파일을 읽는 중 오류가 발생했습니다.');
            setFile(null);
            setParsedData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ... parseExcel ...
    const parseExcel = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet);

                    // Map headers to fields
                    const mappedData = jsonData.map((row: any) => {
                        return {
                            id: row['id'] || row['ID'] || row['자체상품코드'] || row['code'],
                            name: row['name'] || row['상품명'] || row['Name'],
                            brand: row['brand'] || row['브랜드'] || row['Brand'],
                            category: row['category'] || row['카테고리'] || row['Category'],
                            price_sell: row['price_sell'] || row['판매가'] || row['Price'],
                            price_consumer: row['price_consumer'] || row['정상가'] || row['ConsumerPrice'],
                            status: row['status'] || row['상태'] || row['Status'],
                            condition: row['condition'] || row['등급'] || row['Condition'],
                            size: row['size'] || row['사이즈'] || row['Size'],
                            master_reg_date: row['master_reg_date'] || row['마스터등록일'] || row['MasterDate']
                        };
                    }).filter((item: any) => item.id);

                    resolve(mappedData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        });
    };

    const handleSubmit = async () => {
        if (parsedData.length === 0) return;

        setIsLoading(true);
        setResultDetails(null);
        setProgress(0);

        const CHUNK_SIZE = 50;
        let completedCount = 0;
        let successCount = 0;
        let failCount = 0;
        let allDetails: any[] = [];

        try {
            for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
                const chunk = parsedData.slice(i, i + CHUNK_SIZE);

                // Call server action for this chunk
                const result = await bulkUpdateFromExcel(chunk);

                if (result.success) {
                    successCount += (result.count || 0);
                    failCount += (result.failCount || 0);
                    if (result.details) {
                        allDetails = [...allDetails, ...result.details];
                    }
                } else {
                    // If server action fails entirely for a chunk
                    failCount += chunk.length;
                    allDetails = [...allDetails, ...chunk.map(item => ({
                        id: item.id,
                        name: item.name,
                        status: 'error',
                        message: result.error || 'Server Error'
                    }))];
                }

                completedCount += chunk.length;
                // Update progress percentage
                setProgress(Math.round((completedCount / parsedData.length) * 100));
            }

            setCounts({ success: successCount, fail: failCount });
            setResultDetails(allDetails);
            router.refresh();
            toast.success('처리가 완료되었습니다.');

        } catch (error) {
            console.error('Bulk update error:', error);
            toast.error('데이터 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
            setProgress(0);
        }
    };

    const handleReset = () => {
        setFile(null);
        setParsedData([]);
        setResultDetails(null);
        setPreviewCount(0);
        setProgress(0);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val && !isLoading) handleReset(); // Only reset if closing not during loading
            if (!isLoading) setOpen(val); // Prevent closing while loading
        }}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200">
                    <FileSpreadsheet className="w-3 h-3 mr-2" />
                    엑셀 일괄 수정
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto" onInteractOutside={(e) => {
                if (isLoading) e.preventDefault();
            }}>
                <DialogHeader>
                    <DialogTitle>엑셀로 일괄 수정 (업데이트)</DialogTitle>
                    <DialogDescription>
                        수정된 엑셀 파일을 업로드하여 기존 상품 정보를 일괄 업데이트합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col py-2">
                    {!resultDetails ? (
                        // Upload View
                        <div className="flex flex-col gap-4 flex-1 h-full">
                            <div className="flex-1 overflow-y-auto space-y-4 p-1">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="excel-upload">엑셀 파일 (.xlsx, .csv)</Label>
                                    <Input
                                        id="excel-upload"
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileChange}
                                        disabled={isLoading}
                                    />
                                </div>

                                {file && (
                                    <div className="bg-slate-50 p-3 rounded-md border flex items-center gap-3">
                                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {previewCount}개 데이터 인식됨
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-xs text-yellow-800">
                                    <div className="flex items-center gap-2 mb-1 font-semibold">
                                        <AlertCircle className="w-4 h-4" /> 주의사항
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>업로드 전 <strong>[전체 엑셀]</strong>을 다운로드 받아 수정하는 것을 권장합니다.</li>
                                        <li>ID가 수정되면 새로운 상품으로 인식되지 않고, <strong>매칭 실패</strong>로 처리됩니다.</li>
                                        <li>비어있는 칸은 기존 값을 유지합니다.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {isLoading && progress > 0 && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-pulse">
                                    <div className="flex justify-between text-xs font-semibold mb-2 text-slate-700">
                                        <span>처리 중...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-center text-slate-500 mt-2">
                                        잠시만 기다려주세요, 데이터를 안전하게 처리하고 있습니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Result View
                        <div className="flex-1 overflow-hidden flex flex-col gap-4">
                            <div className="flex gap-4 shrink-0">
                                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{counts.success}</div>
                                    <div className="text-xs text-emerald-800 font-medium">성공</div>
                                </div>
                                <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-red-600">{counts.fail}</div>
                                    <div className="text-xs text-red-800 font-medium">실패</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto border rounded-md">
                                <table className="w-full text-xs text-left relative">
                                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-2 border-b w-[100px]">ID</th>
                                            <th className="p-2 border-b">상품명</th>
                                            <th className="p-2 border-b w-[60px]">결과</th>
                                            <th className="p-2 border-b">메시지</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {resultDetails.map((item, idx) => (
                                            <tr key={idx} className={item.status === 'error' ? 'bg-red-50/50' : ''}>
                                                <td className="p-2 font-mono">{item.id}</td>
                                                <td className="p-2 truncate max-w-[150px]" title={item.name}>{item.name}</td>
                                                <td className="p-2">
                                                    {item.status === 'success' ? (
                                                        <span className="text-emerald-600 font-bold">성공</span>
                                                    ) : (
                                                        <span className="text-red-600 font-bold">실패</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-slate-500">{item.message || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-2 shrink-0">
                    {!resultDetails ? (
                        <>
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                취소
                            </Button>
                            <Button onClick={handleSubmit} disabled={!file || parsedData.length === 0 || isLoading} className="bg-emerald-600 hover:bg-emerald-700 min-w-[100px]">
                                {isLoading ? (
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                ) : (
                                    `${previewCount}개 업데이트 적용`
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleReset}>
                                다른 파일 올리기
                            </Button>
                            <Button onClick={() => setOpen(false)}>
                                닫기
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
