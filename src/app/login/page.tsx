'use client';

import { useActionState } from 'react';
import { login } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function LoginPage() {
    const [state, formAction] = useActionState(login, { success: false, error: '' });

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm space-y-6 p-6 bg-white rounded-lg shadow-sm border">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
                    <p className="text-sm text-slate-500">재고 관리 시스템에 접속하세요</p>
                </div>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">아이디</label>
                        <Input name="username" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">비밀번호</label>
                        <Input name="password" type="password" required />
                    </div>
                    {state?.error && (
                        <p className="text-sm text-red-500 text-center">{state.error}</p>
                    )}
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">로그인</Button>
                </form>
                <div className="text-center text-sm">
                    계정이 없으신가요? <Link href="/register" className="text-emerald-600 hover:underline">회원가입</Link>
                </div>
            </div>
        </div>
    );
}
