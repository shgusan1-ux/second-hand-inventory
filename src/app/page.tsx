import { getDashboardStats } from '@/lib/data';
import { getMarketWeather } from '@/lib/weather';
import { getDashboardTasks, getUsersForOrgChart } from '@/lib/actions';
import { getSession } from '@/lib/auth';
import { checkSystemUpdates } from '@/lib/updates';
import { redirect } from 'next/navigation';
import {
  Package, ArrowLeftRight, TrendingUp, BarChart3,
  Zap, Cloud, Map as MapIcon, Calendar,
  ChevronRight
} from 'lucide-react';
import { UpdateLogWidget } from '@/components/dashboard/update-log-widget';
import { AttendanceClockWidget } from '@/components/layout/attendance-clock-widget';
import { OrgChart } from '@/components/dashboard/org-chart';
import { AttendanceSummaryWidget } from '@/components/dashboard/attendance-summary-widget';
import { getMeetings } from '@/lib/meeting-actions';
import { getAllTodayAttendance } from '@/lib/member-actions';
import { RoadmapMindmap } from '@/components/dashboard/roadmap-mindmap';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch Data
  const stats = await getDashboardStats();
  const weather = await getMarketWeather();
  await checkSystemUpdates();
  const tasks = await getDashboardTasks();
  const orgUsers = await getUsersForOrgChart();
  const attendanceRecords = await getAllTodayAttendance();

  // Fetch meetings directly
  const meetings: any[] = await getMeetings(3) as any[];

  const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* 1. Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">대시보드</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">안녕하세요, {session.job_title || '관리자'}님. 오늘의 현황입니다.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentDate}
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Cards (Anti-Gravity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inventory */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 ag-float-1 ag-card">
          <div className="flex justify-between items-start">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Package className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">+2.5%</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">전체 재고</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalCount.toLocaleString()}개</h3>
          <p className="text-xs font-semibold text-slate-400">₩{stats.totalValue.toLocaleString()}</p>
        </div>

        {/* Today In/Out */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 ag-float-2 ag-card">
          <div className="flex justify-between items-start">
            <span className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <ArrowLeftRight className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-full">일간</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">오늘 입/출고</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.todayIn} / {stats.todayOut}</h3>
          <p className="text-xs font-semibold text-slate-400">물량 확인</p>
        </div>

        {/* Weekly Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 ag-float-5 ag-card">
          <div className="flex justify-between items-start">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Calendar className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-full">주간</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">주간 현황</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.weekIn} / {stats.weekOut}</h3>
          <p className="text-xs font-semibold text-slate-400">7일간 활동</p>
        </div>

        {/* Monthly Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-2 ag-float-4 ag-card">
          <div className="flex justify-between items-start">
            <span className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <BarChart3 className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">+12.4%</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">월간 현황</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.monthIn} / {stats.monthOut}</h3>
          <p className="text-xs font-semibold text-slate-400">성장 추세</p>
        </div>
      </div>

      {/* 3. Main Grid Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (Weather AI & Org Chart) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Weather-based AI Strategy */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ag-float-5 ag-card">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 dark:bg-white rounded-lg text-white dark:text-slate-900">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">날씨 기반 AI 판매 전략</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">지역 기후 기반 실시간 예측 인사이트</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white text-[10px] font-black rounded-full">AI 분석 활성</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Weather Info & Map */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-4">
                    <Cloud className="w-10 h-10 text-slate-400" />
                    <div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{weather.averageTemp}°C</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{weather.dominantCondition}, Seoul</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold">습도</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">58%</p>
                  </div>
                </div>
                {/* Mock Map */}
                <div className="relative aspect-square rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden group">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <MapIcon className="w-20 h-20" />
                  </div>
                  <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCbd0_rwMqINq8P0n01RIdLglT6oI7nCXByQKMxwr-tnTjAe5NhtMK5X4c-Hm_g23bPmNQGDJIHoNq2F-PoRaFG1EvPz1WT-SBtS2dCZLPIMJSWMMRtzyv6MiI7iHUUGzsFEy1rfUYJwKysSkgmLaiOCGsupIR-Afdoqe80NrRcYliXvVpn-bBmfw3cKjvGVg9tBDbMAgeZ4PrQ5pX-N0CS_UoVHlcYKx4M0wFO4ruUdVozzTu2Mul3RhhrWdeZC0NO2tOkURBFnKJa')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all cursor-crosshair"></div>
                  <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-slate-900 dark:bg-white rounded-full ring-4 ring-slate-900/20 dark:ring-white/20 animate-pulse"></div>
                  <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-600 shadow-sm text-slate-800 dark:text-slate-200">본사: 브라운스트리트 팩토리</div>
                </div>
              </div>

              {/* Strategies */}
              <div className="md:col-span-3 space-y-4">
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                  <button className="px-4 py-2 text-sm font-bold border-b-2 border-slate-900 dark:border-white text-slate-900 dark:text-white">오늘</button>
                  <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">주간</button>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex gap-3">
                    <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">AI 추천:</span> {weather.recommendations.today}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      오늘 물류 효율이 높을 것으로 예상됩니다
                    </li>
                    <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      B구역 창고 온도를 모니터링하세요
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Chart */}
          <div className="ag-float-1 ag-card">
            <OrgChart users={orgUsers} />
          </div>
        </div>

        {/* Right Column (Attendance, Updates, Memos) */}
        <div className="space-y-6">
          {/* Attendance & Meetings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ag-float-5 ag-card">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">출퇴근</h3>
                <Link href="/business/hr/attendance" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  기록 보기
                </Link>
              </div>

              {/* Inserted Clock Widget Logic Here, styled to fit Container */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-slate-400">시스템 시간</p>
                </div>
                <AttendanceClockWidget userId={session.id} />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400">예정된 회의</h4>
                  <Link href="/business/collaboration/meetings/new">
                    <button className="text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold transition-colors">
                      + 추가
                    </button>
                  </Link>
                </div>
                {/* Meeting List */}
                <div className="flex flex-col gap-2">
                  {meetings.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 italic">예정된 회의가 없습니다</div>
                  ) : (
                    meetings.map((m: any) => (
                      <Link key={m.id} href={`/business/collaboration/meetings/${m.id}`}>
                        <div className="py-2 px-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-600 flex items-center justify-between group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full ${new Date(m.date) < new Date() ? 'bg-slate-300' : 'bg-indigo-500'}`}></div>
                            <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{m.title}</p>
                              <p className="text-[10px] text-slate-400">{new Date(m.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · {m.location || '온라인'}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Attendance Status (Whole Staff) */}
          <div className="ag-float-4 ag-card">
            <AttendanceSummaryWidget records={attendanceRecords} />
          </div>

          {/* Recent Updates */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ag-float-2 ag-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">최근 업데이트</h3>
            </div>
            <div className="p-2">
              <UpdateLogWidget tasks={tasks} />
            </div>
          </div>


        </div>
      </div>

      {/* 사업 로드맵 마인드맵 */}
      <RoadmapMindmap isAdmin={session.role === 'admin'} />

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <p>© 2024 브라운스트리트 산업 주식회사</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">이용약관</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">공장 현황</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
