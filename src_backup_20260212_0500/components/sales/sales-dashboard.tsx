'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTransactions, addTransaction, deleteTransaction, Transaction, getAccountingStats } from '@/lib/accounting-actions';
import { PlusCircle, Search, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function SalesDashboard({ currentUser }: { currentUser: any }) {
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: 'INCOME',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().substring(0, 10),
        payment_method: '카드'
    });

    const loadData = async () => {
        setIsLoading(true);
        // Calculate start/end date for the month
        const startDate = `${month}-01`;
        // Simple end date logic (it's okay if it goes over for this month check)
        // Actually getTransactions filters by exact date string compare if provided
        // Let's use getTransactions without strict date range for LIST, but maybe filter in UI or backend.
        // Actually, let's filter by month in backend.
        // Wait, getTransactions uses startDate/endDate.

        // Month End?
        const d = new Date(month + "-01");
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        const endDate = d.toISOString().substring(0, 10);

        const [txs, sts] = await Promise.all([
            getTransactions({ startDate, endDate }),
            getAccountingStats(month)
        ]);

        setTransactions(txs);
        setStats(sts);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [month]);

    const handleAdd = async () => {
        if (!formData.amount || !formData.category || !formData.date) {
            toast.error('필수 항목을 입력해주세요.');
            return;
        }

        const res = await addTransaction({
            ...formData,
            amount: Number(formData.amount)
        });

        if (res.success) {
            toast.success('거래가 등록되었습니다.');
            setIsAddOpen(false);
            setFormData({ ...formData, amount: '', description: '', category: '' }); // Reset some
            loadData();
        } else {
            toast.error('등록 실패: ' + res.error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const res = await deleteTransaction(id);
        if (res.success) {
            toast.success('삭제되었습니다.');
            loadData();
        } else {
            toast.error('삭제 실패: ' + res.error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filter & Summary */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <input
                        type="month"
                        className="border rounded px-3 py-2 text-sm bg-white"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800">
                    <PlusCircle className="w-4 h-4 mr-2" /> 거래 등록
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">총 수입 (Income)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            {stats.income.toLocaleString()}원
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">총 지출 (Expense)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            {stats.expense.toLocaleString()}원
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-900 shadow-sm text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">순이익 (Net Profit)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            {stats.profit.toLocaleString()}원
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction List */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <CardTitle>거래 내역 상세</CardTitle>
                    <CardDescription>{month}월 내역 ({transactions.length}건)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">날짜</th>
                                    <th className="px-4 py-3 font-medium">구분</th>
                                    <th className="px-4 py-3 font-medium">분류</th>
                                    <th className="px-4 py-3 font-medium">내용</th>
                                    <th className="px-4 py-3 font-medium text-right">금액</th>
                                    <th className="px-4 py-3 font-medium hidden md:table-cell">결제수단</th>
                                    <th className="px-4 py-3 font-medium hidden md:table-cell">등록자</th>
                                    <th className="px-4 py-3 font-medium text-center">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">로딩중...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">거래 내역이 없습니다.</td></tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-slate-600">{tx.date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {tx.type === 'INCOME' ? '수입' : '지출'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-700">{tx.category}</td>
                                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={tx.description}>{tx.description || '-'}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{tx.payment_method}</td>
                                            <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-xs">{tx.created_by}</td>
                                            <td className="px-4 py-3 text-center">
                                                {(currentUser.job_title === '대표자') && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleDelete(tx.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>새로운 거래 등록</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">구분</label>
                                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as any })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INCOME">수입 (매출)</SelectItem>
                                        <SelectItem value="EXPENSE">지출 (매입)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">날짜</label>
                                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">금액 (원)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">분류 (Category)</label>
                                <Input
                                    placeholder={formData.type === 'INCOME' ? '예: 상품 판매, 용역 수익' : '예: 임대료, 급여, 매입대금'}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">결제 수단</label>
                                <Select value={formData.payment_method} onValueChange={(val) => setFormData({ ...formData, payment_method: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="카드">카드</SelectItem>
                                        <SelectItem value="현금">현금</SelectItem>
                                        <SelectItem value="계좌이체">계좌이체</SelectItem>
                                        <SelectItem value="기타">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">상세 내용</label>
                            <Input
                                placeholder="메모할 내용이 있다면 입력하세요."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>취소</Button>
                        <Button onClick={handleAdd}>등록하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
