import { getUsers, deleteUser } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, ShieldAlert } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        redirect('/'); // Or show unauthorized message
    }

    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">회원 관리</h1>
                    <p className="text-slate-500">시스템 사용자 현황 및 관리 (총 {users.length}명)</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-emerald-600" />
                        관리자 권한 영역 ({session.job_title})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">이름</th>
                                    <th className="px-4 py-3 font-medium">아이디</th>
                                    <th className="px-4 py-3 font-medium">직책</th>
                                    <th className="px-4 py-3 font-medium text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map((user: any) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{user.name}</td>
                                        <td className="px-4 py-3 text-slate-500">{user.username}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={
                                                user.job_title === '대표자' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    user.job_title === '경영지원' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-slate-50 text-slate-600 border-slate-200'
                                            }>
                                                {user.job_title}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {session.id !== user.id && (
                                                <form action={async () => {
                                                    'use server';
                                                    await deleteUser(user.id);
                                                }}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </form>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
