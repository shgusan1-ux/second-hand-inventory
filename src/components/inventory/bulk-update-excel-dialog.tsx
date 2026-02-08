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
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewCount, setPreviewCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedData, setParsedData] = useState<any[]>([]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsLoading(true);

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
                            status: row['status'] || row['상태'] || row['Status'], // 판매중, 판매완료 etc
                            condition: row['condition'] || row['등급'] || row['Condition'], // S급, A급 etc
                            size: row['size'] || row['사이즈'] || row['Size'],
                            master_reg_date: row['master_reg_date'] || row['마스터등록일'] || row['MasterDate']
                        };
                    }).filter((item: any) => item.id); // Filter out rows without ID

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
        try {
            const result = await bulkUpdateFromExcel(parsedData);
            if (result.success) {
                toast.success(`${result.count}개 상품 업데이트 완료`);
                setOpen(false);
                setFile(null);
                setParsedData([]);
                router.refresh();
            } else {
                toast.error(result.error || '업데이트 실패');
            }
        } catch (error) {
            toast.error('서버 통신 오류');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200">
                    <FileSpreadsheet className="w-3 h-3 mr-2" />
                    엑셀 일괄 수정
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>엑셀로 일괄 수정 (업데이트)</DialogTitle>
                    <DialogDescription>
                        수정된 엑셀 파일을 업로드하여 기존 상품 정보를 일괄 업데이트합니다.<br />
                        <strong>자체상품코드(ID)</strong>를 기준으로 매칭됩니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="excel-upload">엑셀 파일 (.xlsx, .csv)</Label>
                        <Input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
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
                            <li>ID가 수정되면 새로운 상품으로 인식되지 않고, <strong>매칭 실패</strong>로 무시됩니다.</li>
                            <li>비어있는 칸은 <strong>기존 값을 유지</strong>하거나 무시됩니다 (일부 필드 제외).</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={!file || parsedData.length === 0 || isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                        {isLoading ? '처리 중...' : `${previewCount}개 업데이트 적용`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
