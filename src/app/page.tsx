import { getDashboardStats, getRecentProducts } from '@/lib/data';
import { getMarketWeather } from '@/lib/weather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt, ArrowDownLeft, ArrowUpRight, Calendar, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WeatherWidget } from '@/components/dashboard/weather-widget';
import { KoreaWeatherMap } from '@/components/dashboard/korea-weather-map';
import { getDashboardTasks, getMemos } from '@/lib/actions';
import { DashboardChecklist } from '@/components/dashboard/checklist';
import { checkSystemUpdates } from '@/lib/updates';
import { UpdateLogWidget } from '@/components/dashboard/update-log-widget';
import { MemoWidget } from '@/components/dashboard/memo-widget';
import { OrgChart } from '@/components/dashboard/org-chart';
import { getUsersForOrgChart } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }
  const stats = await getDashboardStats();
  const recentProducts = await getRecentProducts();
  const weather = await getMarketWeather();

  // Sync system updates
  await checkSystemUpdates();

  const tasks = await getDashboardTasks();
  const memos = await getMemos();
  const orgUsers = await getUsersForOrgChart();

  return (
    <div className="space-y-8">
      {/* Weather Strategy Widget & Map */}
      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7 items-stretch">
        <div className="md:col-span-4 lg:col-span-5 flex flex-col h-full">
          <WeatherWidget data={weather} />
        </div>
        <div className="md:col-span-3 lg:col-span-2 flex flex-col h-full">
          <KoreaWeatherMap />
        </div>
      </div>


      {/* Hero Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              전체 재고 수량
            </CardTitle>
            <Shirt className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              ₩{stats.totalValue.toLocaleString()} (총 판매 예정액)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              오늘 입고 / 출고
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-blue-600">{stats.todayIn}</div>
              <span className="text-slate-300">/</span>
              <div className="text-2xl font-bold text-orange-600">{stats.todayOut}</div>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
              <span className="flex items-center"><ArrowDownLeft className="h-3 w-3 mr-1 text-blue-500" />입고</span>
              <span className="flex items-center"><ArrowUpRight className="h-3 w-3 mr-1 text-orange-500" />출고</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              이번 주 현황
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-700">{stats.weekIn}</div>
              <span className="text-slate-300">/</span>
              <div className="text-2xl font-bold text-slate-700">{stats.weekOut}</div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              입고 / 출고 (지난 7일)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              이번 달 현황
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-700">{stats.monthIn}</div>
              <span className="text-slate-300">/</span>
              <div className="text-2xl font-bold text-slate-700">{stats.monthOut}</div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              입고 / 출고 (이번 달)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Updates & Patch Logs + Memo Widget + Org Chart */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:items-start">
        {/* Update Log */}
        <UpdateLogWidget tasks={tasks} />

        {/* Shared Memo */}
        <MemoWidget memos={memos} />

        {/* Organization Chart */}
        <OrgChart users={orgUsers} />
      </div>
    </div>
  );
}
