import { getUsers } from '@/lib/actions';
import { getUserPermissions } from '@/lib/member-actions';
import { MemberManagement } from '@/components/members/member-management';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        redirect('/'); // Or show unauthorized message
    }

    const users = await getUsers();

    // Attach permissions
    const usersWithPermissions = await Promise.all(users.map(async (u: any) => {
        const perms = await getUserPermissions(u.id);
        return { ...u, permissions: perms };
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">회원 관리</h1>
                    <p className="text-slate-500 mt-2">
                        시스템 사용자 목록을 관리하고 권한 및 근태를 설정합니다.
                    </p>
                </div>
            </div>

            <MemberManagement users={usersWithPermissions} />
        </div>
    );
}
