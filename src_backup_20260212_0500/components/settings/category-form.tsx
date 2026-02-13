'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addCategory, deleteCategory, bulkCreateCategories, updateCategory } from '@/lib/actions';
import { Trash2, Plus, FileSpreadsheet, Upload, Edit, Save, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface Category {
    id: string;
    name: string;
    sort_order: number;
    classification: string;
}

const CLASSIFICATIONS = ['MAN', 'WOMAN', 'KIDS', '악세사리'];

export function CategoryForm({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [pasteData, setPasteData] = useState('');
    const [parsedData, setParsedData] = useState<Category[]>([]);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Category>({ id: '', name: '', sort_order: 0, classification: 'MAN' });

    const processRows = (rows: any[]) => {
        const preview = rows.map((cols) => {
            // Normalize cols to array
            const row = Array.isArray(cols) ? cols : Object.values(cols);

            // Helper to identify classification
            const findClassification = (val: string) => {
                const upper = val.toUpperCase().trim();
                return CLASSIFICATIONS.find(c => c === upper || (c === '악세사리' && (upper === 'ACC' || upper === 'ACCESSORY' || upper === '악세사리')));
            };

            let id = String(row[0] || '').trim();
            let classification = '기타'; // Default classification
            let name = '';
            let sort_order = 0; // Default sort_order

            // Attempt to parse based on expected formats
            // Format 1: [Code] [Classification] [Name]
            // Format 2: [Code] [SortOrder] [Classification] [Name] (less common, but possible)
            // Format 3: [Code] [Name] (old format, default classification)

            const col1 = String(row[1] || '').trim();
            const col2 = String(row[2] || '').trim();
            const col3 = String(row[3] || '').trim();

            const matchedClassInCol1 = findClassification(col1);
            const matchedClassInCol2 = findClassification(col2);

            if (matchedClassInCol1) { // Format: [Code] [Classification] [Name]
                classification = matchedClassInCol1;
                name = col2;
                // sort_order remains 0
            } else if (matchedClassInCol2 && !isNaN(parseInt(col1))) { // Format: [Code] [SortOrder] [Classification] [Name]
                sort_order = parseInt(col1);
                classification = matchedClassInCol2;
                name = col3;
            } else { // Fallback: [Code] [Name] or [Code] [SortOrder] [Name]
                if (!isNaN(parseInt(col1))) { // [Code] [SortOrder] [Name]
                    sort_order = parseInt(col1);
                    name = col2;
                } else { // [Code] [Name]
                    name = col1;
                }
            }

            // Cleanup and ensure required fields
            if (!name && id) name = id; // If name is empty, use id as name
            if (!id && name) id = name.toUpperCase().replace(/\s/g, '_'); // If id is empty, generate from name

            return { id, sort_order, name, classification };
        }).filter(item => item.name);

        setParsedData(preview as any);
    };

    const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setPasteData(text);
        const rows = text.trim().split('\n').map(row => row.split(/\t|\s+/).filter(Boolean));
        if (rows.length === 0) return;
        processRows(rows);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            processRows(data);
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkSubmit = async () => {
        if (parsedData.length === 0) return;

        const result = await bulkCreateCategories(parsedData);
        if (result.success) {
            alert(`${result.count}개 카테고리 등록 완료!`);
            setPasteData('');
            setParsedData([]);
            router.refresh();
        } else {
            alert('등록 실패: ' + result.error);
        }
    };

    // New Handlers
    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditForm(cat);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async () => {
        if (!editForm.id || !editForm.name) return;

        await updateCategory(editingId!, editForm.id, editForm.name, editForm.sort_order, editForm.classification);
        setEditingId(null);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`'${name}' 카테고리를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
            await deleteCategory(id);
        }
    };

    const handleExport = () => {
        // CSV Export
        const headers = ['ID', 'Classification', 'Name', 'SortOrder'];
        // Excel often expects Tab or Comma. Let's use Comma and add BOM.
        const rows = categories.map(c => [
            c.id,
            c.classification || '기타',
            c.name,
            c.sort_order || 0
        ]);

        // CSV Content
        let csvContent = "\uFEFF"; // BOM for Excel Korean support
        csvContent += headers.join(",") + "\n";
        rows.forEach(row => {
            // Escape quotes if needed, though simple data here likely safe.
            const safeRow = row.map(cell => {
                const str = String(cell);
                return str.includes(',') ? `"${str}"` : str;
            });
            csvContent += safeRow.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `categories_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = categories.filter(cat =>
        cat.name.includes(searchTerm) ||
        cat.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.classification?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
                <div className="flex space-x-2">
                    <button
                        className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${mode === 'single' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                        onClick={() => setMode('single')}
                    >
                        개별 등록
                    </button>
                    <button
                        className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${mode === 'bulk' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-900'}`}
                        onClick={() => setMode('bulk')}
                    >
                        엑셀 일괄 등록/수정
                    </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs">
                    <Upload className="h-3 w-3 mr-2 rotate-180" />
                    현재 목록 다운로드
                </Button>
            </div>

            {mode === 'single' ? (
                <>
                    <div className="relative mb-2">
                        <Input
                            placeholder="카테고리 검색 (이름 또는 코드)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 bg-slate-50 border-slate-200 focus:bg-white"
                        />
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    </div>

                    <form action={async (formData) => { await addCategory(formData); }} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <select name="classification" className="h-9 rounded-md border border-slate-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                            {CLASSIFICATIONS.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <Input name="id" placeholder="코드" className="w-24 h-9 text-xs" />
                        <Input name="name" placeholder="카테고리명" required className="flex-1 h-9 text-xs" />
                        <Button type="submit" size="sm" className="h-9 px-3">
                            <Plus className="h-4 w-4 mr-1" /> 추가
                        </Button>
                    </form>

                    <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto bg-white shadow-sm">
                        {filteredCategories.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                검색 결과가 없습니다.
                            </div>
                        ) : filteredCategories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                                {editingId === cat.id ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <select
                                            value={editForm.classification}
                                            onChange={e => setEditForm({ ...editForm, classification: e.target.value })}
                                            className="h-8 rounded px-2 text-xs border"
                                        >
                                            {CLASSIFICATIONS.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <Input
                                            value={editForm.id}
                                            onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                                            className="w-24 h-8 text-xs font-mono"
                                        />
                                        <Input
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="flex-1 h-8 text-sm"
                                        />
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8 text-emerald-600">
                                                <Save className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-slate-400">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            {/* Classification Badge */}
                                            <span className={`text-xs font-bold px-2 py-1 rounded border min-w-[3rem] text-center
                                                ${cat.classification === 'MAN' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    cat.classification === 'WOMAN' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                                                        cat.classification === 'KIDS' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                {cat.classification || '기타'}
                                            </span>

                                            <span className="font-medium text-lg text-slate-700">{cat.name}</span>
                                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{cat.id}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => startEdit(cat)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(cat.id, cat.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md border border-dashed border-slate-300 space-y-2">
                        <p className="font-medium text-emerald-700 flex items-center"><FileSpreadsheet className="h-4 w-4 mr-1" /> 엑셀 업로드 또는 붙여넣기</p>
                        <p>형식: <strong>[코드] [분류(MAN/WOMAN/KIDS/악세사리)] [카테고리명]</strong></p>
                        <p className="text-xs text-slate-400">예시: TOP MAN 상의 (A:코드, B:분류, C:이름)</p>
                        <div className="pt-2">
                            <label className="block text-xs font-medium text-slate-700 mb-1">엑셀 파일 첨부 (.xlsx, .xls, .csv)</label>
                            <Input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                className="bg-white"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500">또는 직접 붙여넣기</span>
                        </div>
                    </div>

                    <textarea
                        className="w-full h-32 p-3 border rounded-md font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder={`예시:\nTSHIRT MAN 티셔츠\nSKIRT WOMAN 스커트\nCAP 악세사리 모자`}
                        value={pasteData}
                        onChange={handlePaste}
                    />

                    {parsedData.length > 0 && (
                        <div className="border rounded-md overflow-hidden">
                            <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 flex justify-between items-center">
                                <span>미리보기 ({parsedData.length}건)</span>
                                <Button size="sm" onClick={handleBulkSubmit} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">일괄 등록</Button>
                            </div>
                            <div className="max-h-40 overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y">
                                        {parsedData.map((row, i) => (
                                            <tr key={i} className="bg-white">
                                                <td className="p-2 text-slate-400 font-mono text-xs">{row.id}</td>
                                                <td className="p-2 text-center text-xs font-bold text-emerald-600">{row.classification}</td>
                                                <td className="p-2 pl-3">{row.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
