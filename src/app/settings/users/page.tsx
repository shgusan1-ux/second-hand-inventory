import { getUsers } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserManagement } from './user-management';

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        redirect('/');
    }

    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">회원 관리 (보안 센터)</h1>
                    <p className="text-slate-500">시스템 사용자 권한 및 보안 설정 관리</p>
                </div>
            </div>

            <UserManagement initialUsers={users} currentUserId={session.id} />
        </div>
    );
}
