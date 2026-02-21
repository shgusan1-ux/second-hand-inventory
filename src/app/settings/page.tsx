import { CategoryForm } from '@/components/settings/category-form';
import { PasswordChangeForm } from '@/components/settings/password-form';
import { getCategories } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const categories = await getCategories();
    const session = await getSession();
    const isAdmin = session && ['대표자', '경영지원'].includes(session.job_title);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">설정</h1>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>카테고리 관리</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CategoryForm categories={categories} />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <PasswordChangeForm />

                    {/* 외부 API 연동 설정 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>외부 연동</CardTitle>
                            <CardDescription>외부 플랫폼 API 연결 설정</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/settings/smartstore" className="block">
                                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">스마트스토어 API</p>
                                        <p className="text-xs text-slate-500">네이버 커머스 API 연동</p>
                                    </div>
                                    <span className="text-slate-400 text-sm">→</span>
                                </div>
                            </Link>
                            <Link href="/settings/meta" className="block">
                                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Meta API</p>
                                        <p className="text-xs text-slate-500">Facebook / Instagram 자동 게시</p>
                                    </div>
                                    <span className="text-slate-400 text-sm">→</span>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="opacity-75">
                        <CardHeader>
                            <CardTitle>시스템 정보</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">
                                중고의류 재고 관리 시스템 v1.1 <br />
                                데이터베이스: {process.env.POSTGRES_URL ? 'Cloud (Postgres)' : 'Local (SQLite)'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
