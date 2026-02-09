import { getUsersForOrgChart } from '@/lib/actions';
import { MemberManagement } from '@/components/members/member-management';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const users = await getUsersForOrgChart();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">임직원 소통</h1>
                    <p className="text-slate-500 mt-2">
                        동료들의 연락처를 확인하고 1:1 메시지를 보낼 수 있습니다.
                    </p>
                </div>
            </div>

            <MemberManagement users={users as any} currentUser={session} />
        </div>
    );
}
