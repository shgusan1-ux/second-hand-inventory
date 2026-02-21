import { getBugReports, updateBugStatus } from '@/lib/bug-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, Terminal, Globe, User, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function BugManagementPage() {
    const bugs = await getBugReports();

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">접수됨</Badge>;
            case 'reviewing': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">검토중</Badge>;
            case 'fixed': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">수정됨</Badge>;
            case 'closed': return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">종료</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">버그 및 기술 이슈 관리</h2>
                    <p className="text-slate-500 mt-1">사용자들이 제보한 시스템 오류 및 개선 사항 목록입니다.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Reports</p>
                    <p className="text-2xl font-black text-rose-500">{bugs.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {bugs.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Bug className="w-12 h-12 mb-4 opacity-20" />
                            <p>접수된 버그 제보가 없습니다.</p>
                        </CardContent>
                    </Card>
                ) : (
                    bugs.map((bug: any) => (
                        <Card key={bug.id} className="overflow-hidden border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between bg-slate-50/50 pb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(bug.status)}
                                        <h3 className="font-bold text-slate-800">#{bug.id}</h3>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-2xl">
                                        {bug.content}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border">
                                        <Clock className="w-3 h-3" />
                                        {new Date(bug.created_at).toLocaleString()}
                                    </div>
                                    <div className="flex gap-2">
                                        <form action={async (formData) => {
                                            'use server';
                                            const id = formData.get('id') as string;
                                            const status = formData.get('status') as string;
                                            await updateBugStatus(id, status);
                                        }}>
                                            <input type="hidden" name="id" value={bug.id} />
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" name="status" value="reviewing" className="h-7 text-[10px] font-bold">검토중</Button>
                                                <Button size="sm" variant="outline" name="status" value="fixed" className="h-7 text-[10px] font-bold text-emerald-600 border-emerald-100 hover:bg-emerald-50">수정완료</Button>
                                                <Button size="sm" variant="outline" name="status" value="closed" className="h-7 text-[10px] font-bold text-slate-400">종료</Button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100">
                                {/* Reporter & Context */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-400">신고자:</span>
                                        <span className="font-bold text-slate-700">{bug.user_name} ({bug.user_id})</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Globe className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-400">발생 페이지:</span>
                                        <span className="font-bold text-indigo-600 truncate max-w-[200px]" title={bug.page_url}>{bug.page_url}</span>
                                    </div>
                                </div>

                                {/* UA Info */}
                                <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 overflow-hidden">
                                    <p className="font-bold mb-1 uppercase tracking-tighter text-slate-500">Device/Browser Info</p>
                                    <p className="line-clamp-2">{bug.user_agent}</p>
                                </div>

                                {/* Console Logs */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                                        <Terminal className="w-4 h-4" />
                                        Captured Console Errors
                                    </div>
                                    <div className="bg-slate-900 rounded-lg p-3 font-mono text-[9px] text-rose-400 max-h-32 overflow-y-auto border border-rose-900/30">
                                        {bug.console_logs ? (
                                            JSON.parse(bug.console_logs).length > 0 ? (
                                                JSON.parse(bug.console_logs).map((log: string, i: number) => (
                                                    <div key={i} className="mb-1 border-b border-rose-900/10 pb-1 last:border-0">{log}</div>
                                                ))
                                            ) : <span className="text-slate-600 italic">No console errors captured.</span>
                                        ) : <span className="text-slate-600 italic">No log data.</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
