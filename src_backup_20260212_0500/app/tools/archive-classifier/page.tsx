'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { classifyBulkArchive, type ArchiveCategory } from '@/lib/archive-classifier';
import { Download, Sparkles, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ArchiveClassifierPage() {
    const [input, setInput] = useState('');
    const [results, setResults] = useState<Array<{
        productId: string;
        category: ArchiveCategory;
        confidence: number;
        reason: string;
    }>>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClassify = () => {
        setIsProcessing(true);

        // Parse input (상품코드 | 상품명 | 브랜드 형식)
        const lines = input.trim().split('\n');
        const products = lines.map(line => {
            const parts = line.split(/[\t|]/);
            return {
                id: parts[0]?.trim() || '',
                name: parts[1]?.trim() || '',
                brand: parts[2]?.trim() || '',
            };
        }).filter(p => p.id && p.name);

        const classified = classifyBulkArchive(products);
        setResults(classified);
        setIsProcessing(false);
    };

    const handleDownloadExcel = () => {
        const data = results.map(r => ({
            '상품코드': r.productId,
            'ARCHIVE 분류': r.category || 'ARCHIVE 아님',
            '신뢰도': `${r.confidence}%`,
            '분류 근거': r.reason,
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ARCHIVE 분류');
        XLSX.writeFile(workbook, `archive_classification_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleCopyToClipboard = () => {
        const text = results
            .map(r => `${r.productId}\t${r.category || 'ARCHIVE 아님'}`)
            .join('\n');
        navigator.clipboard.writeText(text);
        alert('클립보드에 복사되었습니다!');
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                    ARCHIVE 자동 분류
                </h1>
                <p className="text-sm text-slate-500">
                    상품명과 브랜드를 분석하여 5가지 ARCHIVE 카테고리로 자동 분류합니다
                </p>
            </div>

            {/* 분류 기준 안내 */}
            <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                    <CardTitle className="text-purple-900">ARCHIVE 분류 기준</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-purple-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded border border-purple-100">
                            <strong className="text-purple-900">1. MILITARY ARCHIVE</strong>
                            <p className="text-xs mt-1">군용/군납/군복 (M-65, BDU, MA-1, 카고, 카모)</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-purple-100">
                            <strong className="text-purple-900">2. WORKWEAR ARCHIVE</strong>
                            <p className="text-xs mt-1">작업복/노동복 (Carhartt, Dickies, 초어자켓, 페인터)</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-purple-100">
                            <strong className="text-purple-900">3. JAPAN ARCHIVE</strong>
                            <p className="text-xs mt-1">일본 브랜드/감성 (Beams, Kapital, Visvim, 셀비지)</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-purple-100">
                            <strong className="text-purple-900">4. HERITAGE ARCHIVE</strong>
                            <p className="text-xs mt-1">헤리티지/클래식 (Ralph Lauren, Brooks Brothers, 아이비)</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-purple-100">
                            <strong className="text-purple-900">5. BRITISH ARCHIVE</strong>
                            <p className="text-xs mt-1">영국 브랜드/스타일 (Barbour, Burberry, 트위드, 더플)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 입력 영역 */}
            <Card>
                <CardHeader>
                    <CardTitle>상품 데이터 입력</CardTitle>
                    <CardDescription>
                        형식: <strong>상품코드 | 상품명 | 브랜드</strong> (탭 또는 | 구분)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder={`예시:\nABC123\tRALPH LAUREN 폴로 옥스포드 셔츠\tRALPH LAUREN\nDEF456\tCARHARTT 더블니 페인터 팬츠\tCARHARTT\nGHI789\tBARBOUR 비데일 왁스자켓\tBARBOUR`}
                        className="min-h-[200px] font-mono text-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <Button
                        onClick={handleClassify}
                        disabled={!input.trim() || isProcessing}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isProcessing ? '분류 중...' : 'ARCHIVE 분류 시작'}
                    </Button>
                </CardContent>
            </Card>

            {/* 결과 영역 */}
            {results.length > 0 && (
                <Card className="border-emerald-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-emerald-900">분류 결과 ({results.length}개)</CardTitle>
                                <CardDescription>상품코드 기준으로 정리되었습니다</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleCopyToClipboard}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    복사
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDownloadExcel}>
                                    <Download className="h-4 w-4 mr-2" />
                                    엑셀 다운로드
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-emerald-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-emerald-700">상품코드</th>
                                        <th className="px-4 py-3 text-left font-medium text-emerald-700">ARCHIVE 분류</th>
                                        <th className="px-4 py-3 text-center font-medium text-emerald-700">신뢰도</th>
                                        <th className="px-4 py-3 text-left font-medium text-emerald-700">분류 근거</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {results.map((result, idx) => (
                                        <tr key={idx} className="hover:bg-emerald-50/50">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">
                                                {result.productId}
                                            </td>
                                            <td className="px-4 py-3">
                                                {result.category ? (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.category === 'MILITARY ARCHIVE' ? 'bg-green-100 text-green-700' :
                                                            result.category === 'WORKWEAR ARCHIVE' ? 'bg-orange-100 text-orange-700' :
                                                                result.category === 'JAPAN ARCHIVE' ? 'bg-red-100 text-red-700' :
                                                                    result.category === 'HERITAGE ARCHIVE' ? 'bg-blue-100 text-blue-700' :
                                                                        result.category === 'BRITISH ARCHIVE' ? 'bg-purple-100 text-purple-700' :
                                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {result.category}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">ARCHIVE 아님</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${result.confidence >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                                        result.confidence >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {result.confidence}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-xs">
                                                {result.reason || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
