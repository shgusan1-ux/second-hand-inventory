import { CategoryForm } from '@/components/settings/category-form';
import { PasswordChangeForm } from '@/components/settings/password-form';
import { getCategories } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

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

                    {/* User Management (Admin Only) */}
                    {isAdmin && (
                        <Card className="border-emerald-200 bg-emerald-50">
                            <CardHeader>
                                <CardTitle className="text-emerald-800 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    회원 관리
                                </CardTitle>
                                <CardDescription className="text-emerald-600">
                                    시스템 사용자 목록을 관리합니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/settings/users">
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">회원 관리 바로가기</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

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
