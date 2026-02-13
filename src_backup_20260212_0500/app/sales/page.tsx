import { getTransactions, getAccountingStats } from '@/lib/accounting-actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SalesDashboard } from '@/components/sales/sales-dashboard';
import { db } from '@/lib/db';

export default async function SalesPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    // Permission Check
    let canView = session.job_title === '대표자';
    if (!canView) {
        const userRes = await db.query('SELECT can_view_accounting FROM users WHERE id = $1', [session.id]);
        if (userRes.rows.length > 0 && userRes.rows[0].can_view_accounting) {
            canView = true;
        }
    }

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <h1 className="text-2xl font-bold text-red-500 mb-2">접근 권한이 없습니다.</h1>
                <p className="text-slate-600">대표자 또는 권한이 부여된 사용자만 접근 가능합니다.</p>
            </div>
        );
    }

    // Default to current month
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM

    // Fetch initial data (Optional, client can fetch effectively too. Let's pass initial for SSR)
    // Actually, dashboard will handle date state. Let's just render dashboard.

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">매출/매입 관리</h1>
                <p className="text-slate-500">수입과 지출을 기록하고 현황을 파악합니다.</p>
            </div>

            <SalesDashboard currentUser={session} />
        </div>
    );
}
