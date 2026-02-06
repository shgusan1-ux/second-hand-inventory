'use client';

import { register } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useActionState } from 'react';

export default function RegisterPage() {
    const [state, formAction] = useActionState(register, { success: false, error: '' });

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm space-y-6 p-6 bg-white rounded-lg shadow-sm border">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
                    <p className="text-sm text-slate-500">새로운 계정을 생성합니다</p>
                </div>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">아이디</label>
                        <Input name="username" required placeholder="User ID" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">이름</label>
                        <Input name="name" required placeholder="실명" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">비밀번호</label>
                            <Input name="password" type="password" required placeholder="********" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">비밀번호 확인</label>
                            <Input name="confirmPassword" type="password" required placeholder="********" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">비밀번호 분실 시 힌트</label>
                        <Input name="passwordHint" required placeholder="예: 가장 기억에 남는 장소는?" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">직책</label>
                        <Input name="jobTitle" required placeholder="예: 매니저, 팀장, 사원" />
                    </div>
                    {/* Hidden role input default to user, could allow admin selection if needed or separate admin creation */}
                    <input type="hidden" name="role" value="user" />

                    {state?.error && (
                        <p className="text-sm text-red-500 text-center">{state.error}</p>
                    )}

                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">가입하기</Button>
                </form>
                <div className="text-center text-sm">
                    이미 계정이 있으신가요? <Link href="/login" className="text-emerald-600 hover:underline">로그인</Link>
                </div>
            </div>
        </div>
    );
}
