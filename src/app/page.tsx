import { getDashboardStats, getRecentProducts } from '@/lib/data';
import { getMarketWeather } from '@/lib/weather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt, ArrowDownLeft, ArrowUpRight, Calendar, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WeatherWidget } from '@/components/dashboard/weather-widget';
import { getDashboardTasks } from '@/lib/actions';
import { DashboardChecklist } from '@/components/dashboard/checklist';
import { checkSystemUpdates } from '@/lib/updates';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const recentProducts = await getRecentProducts();
  const weather = await getMarketWeather();

  // Sync system updates
  await checkSystemUpdates();

  const tasks = await getDashboardTasks();

  return (
    <div className="space-y-8">
      {/* Weather Strategy Widget */}
      <WeatherWidget data={weather} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">대시보드</h1>
          <p className="text-slate-500 mt-2">
            오늘의 환경 보호 활동 현황입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Package className="mr-2 h-4 w-4" />
              재고 등록
            </Button>
          </Link>
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

      {/* Recent Items */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>최근 등록된 의류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm text-left">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">상품명</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">브랜드</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">판매가</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">등록일</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">상태</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {recentProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        아직 등록된 상품이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    recentProducts.map((product) => (
                      <tr key={product.id} className="border-b transition-colors hover:bg-slate-50">
                        <td className="p-4 align-middle font-medium text-slate-900">{product.name}</td>
                        <td className="p-4 align-middle text-slate-600">{product.brand}</td>
                        <td className="p-4 align-middle text-slate-600">₩{product.price_sell.toLocaleString()}</td>
                        <td className="p-4 align-middle text-slate-500">
                          {new Date(product.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <span className={
                            product.status === '판매중' ? 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold' :
                              product.status === '판매완료' ? 'bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-semibold' :
                                'bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold'
                          }>
                            {product.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
