import { getUsersForOrgChart } from '@/lib/actions';
import { MemberManagement } from '@/components/members/member-management';
import { getSession } from '@/lib/auth';
import { getContracts } from '@/lib/contract-actions';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const [users, myContracts] = await Promise.all([
        getUsersForOrgChart(),
        getContracts()
    ]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">임직원 소통</h1>
                    <p className="text-slate-500 mt-2">
                        동료들의 연락처를 확인하고 1:1 메시지를 보낼 수 있습니다.
                    </p>
                </div>
            </div>

            {/* 내 근로계약서 섹션 */}
            {myContracts.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        내 근로계약서
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myContracts.map((contract: any) => {
                            const isSigned = contract.status === 'signed';
                            const data = JSON.parse(contract.content_json);
                            return (
                                <Link key={contract.id} href={`/members/contracts/${contract.id}`}>
                                    <Card className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${isSigned ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className={isSigned ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                                    {isSigned ? '체결 완료' : '서명 필요'}
                                                </Badge>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(contract.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 mb-1">근로계약서 ({data.type || '정규직'})</h3>
                                            <p className="text-sm text-slate-500 mb-3">
                                                계약기간: {data.startDate} ~ {data.endDate || '기간 없음'}
                                            </p>
                                            <div className="flex items-center text-sm font-medium text-indigo-600">
                                                상세 보기 <ArrowRight className="w-4 h-4 ml-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <MemberManagement users={users as any} currentUser={session} />
        </div>
    );
}
