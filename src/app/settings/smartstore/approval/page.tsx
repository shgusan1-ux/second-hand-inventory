import { getPendingAiSuggestions, approveAiSuggestion, approveAllAiSuggestions } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const metadata = {
    title: 'AI 분류 승인 | 스마트스토어 관리',
};

export default async function AiApprovalPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const result = await getPendingAiSuggestions();
    const pendingItems: any[] = (result && result.success && Array.isArray(result.data)) ? result.data : [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">AI 분류 승인 대기열</h1>
                    <p className="text-muted-foreground">AI가 분석한 결과를 검토하고 최종 승인해주세요.</p>
                </div>
                {pendingItems.length > 0 && (
                    <form action={async () => {
                        'use server';
                        await approveAllAiSuggestions();
                    }}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            전체 승인 ({pendingItems.length}건)
                        </Button>
                    </form>
                )}
            </div>

            {pendingItems.length === 0 ? (
                <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="h-12 w-12 text-slate-300 mb-4" />
                    <CardTitle className="text-slate-400">승인 대기 중인 항목이 없습니다.</CardTitle>
                    <CardDescription>새로운 상품을 동기화하여 분석을 시작해보세요.</CardDescription>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pendingItems.map((item: any) => (
                        <Card key={item.origin_product_no} className="overflow-hidden border-slate-200">
                            <div className="flex items-center">
                                <div className="flex-1 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-slate-400">#{item.origin_product_no}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 font-bold uppercase">
                                            {item.suggested_archive_id} 추천
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-900 border-l-4 border-emerald-500 pl-3">
                                        {item.name}
                                    </h3>
                                    <div className="mt-2 text-sm text-slate-500 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                                        <span>분류 근거: {item.suggestion_reason}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 border-l border-slate-100 flex flex-col gap-2">
                                    <form action={async () => {
                                        'use server';
                                        await approveAiSuggestion(item.origin_product_no, item.suggested_archive_id);
                                    }}>
                                        <Button size="sm" className="w-24 bg-emerald-600 hover:bg-emerald-700">
                                            <Check className="mr-1 h-3 w-3" /> 승인
                                        </Button>
                                    </form>
                                    <Button variant="outline" size="sm" className="w-24 text-slate-400 hover:text-red-500">
                                        거절
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
