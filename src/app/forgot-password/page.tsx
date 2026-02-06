'use client';

import { useState } from 'react';
import { getPasswordHint } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [hint, setHint] = useState<string | null>(null);
    const [error, setError] = useState('');

    async function handleSubmit(formData: FormData) {
        const username = formData.get('username') as string;
        const name = formData.get('name') as string;

        setError('');
        setHint(null);

        const res = await getPasswordHint(username, name);
        if (res.success) {
            setHint(res.hint);
        } else {
            setError(res.error || '정보를 찾을 수 없습니다.');
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-[conic-gradient(at_bottom_right,_var(--tw-gradient-stops))] from-slate-900 via-emerald-900 to-slate-900 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            <div className="w-full max-w-sm space-y-6 p-8 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 relative z-10">
                <div className="space-y-2 text-center">
                    <div className="mx-auto w-12 h-12 bg-emerald-600/20 rounded-full flex items-center justify-center mb-4">
                        <KeyRound className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">비밀번호 찾기</h1>
                    <p className="text-sm text-slate-500">가입 시 등록한 힌트를 확인합니다.</p>
                </div>

                {!hint ? (
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">휴대폰 번호 (ID)</label>
                            <Input name="username" required placeholder="01012345678" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">이름</label>
                            <Input name="name" required placeholder="실명 입력" />
                        </div>
                        {error && <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">힌트 확인</Button>
                    </form>
                ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-3 text-center animate-in zoom-in duration-300">
                        <p className="text-sm text-emerald-800 font-medium">회원님의 힌트</p>
                        <p className="text-lg font-bold text-slate-900 break-words">"{hint}"</p>
                        <p className="text-xs text-slate-500 mt-2">비밀번호가 기억나지 않으시면 관리자에게 문의하세요.</p>
                    </div>
                )}

                <div className="text-center pt-2">
                    <Link href="/login" className="text-sm text-slate-500 hover:text-emerald-600 flex items-center justify-center gap-1 transition-colors">
                        <ArrowLeft className="w-3 h-3" /> 로그인 페이지로
                    </Link>
                </div>
            </div>
        </div>
    );
}
