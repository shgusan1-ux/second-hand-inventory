import { getUsers } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const session = await getSession();
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">사용자 관리</h3>
                <p className="text-sm text-muted-foreground">
                    시스템에 접근 가능한 사용자 목록입니다.
                </p>
            </div>

            <div className="rounded-md border bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">이름</th>
                            <th className="px-4 py-3 font-medium">아이디</th>
                            <th className="px-4 py-3 font-medium">직책</th>
                            <th className="px-4 py-3 font-medium">상태</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map((user: any) => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                <td className="px-4 py-3 text-slate-500">{user.username}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className="bg-slate-50">
                                        {user.job_title || user.role}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        활성
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
