'use client';

import { register, sendVerificationCode, verifyEmailCode } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { toast } from 'sonner';
import { Check, Mail } from 'lucide-react';

function EmailVerificationSection() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!email.includes('@')) {
            toast.error('올바른 이메일 주소를 입력해주세요.');
            return;
        }
        setIsLoading(true);
        const res = await sendVerificationCode(email);
        setIsLoading(false);
        if (res.success) {
            setIsSent(true);
            toast.success(res.message);
        } else {
            toast.error('전송 실패');
        }
    };

    const handleVerify = async () => {
        if (!code) return;
        setIsLoading(true);
        const res = await verifyEmailCode(email, code);
        setIsLoading(false);
        if (res.success) {
            setIsVerified(true);
            toast.success('이메일 인증이 완료되었습니다.');
        } else {
            toast.error(res.error || '인증 실패');
        }
    };

    return (
        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="text-xs font-bold uppercase text-slate-500">이메일 인증</label>
            <div className="flex gap-2">
                <Input
                    name="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isVerified}
                    className={isVerified ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold" : ""}
                />
                <Button
                    type="button"
                    size="sm"
                    onClick={handleSend}
                    disabled={isSent || isVerified || isLoading}
                    className="shrink-0"
                    variant={isVerified ? "outline" : "default"}
                >
                    {isVerified ? <Check className="w-4 h-4 text-emerald-500" /> : '인증번호'}
                </Button>
            </div>

            {isSent && !isVerified && (
                <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in">
                    <Input
                        placeholder="인증번호 6자리"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="bg-white"
                        maxLength={6}
                    />
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleVerify}
                        disabled={isLoading}
                    >
                        확인
                    </Button>
                </div>
            )}

            {!isVerified && (
                <p className="text-[10px] text-slate-400">
                    * 정확한 이메일 주소를 입력하고 인증을 완료해주세요.
                </p>
            )}
        </div>
    );
}

export default function RegisterPage() {
    const [state, formAction] = useActionState(register, { success: false, error: '' });

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-700 via-blue-800 to-gray-900 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
            <div className="w-full max-w-sm space-y-6 p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 relative z-10">
                <div className="space-y-2 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">팀 합류하기</h1>
                    <p className="text-sm font-medium text-slate-600">함께 성장하는 여정을 시작하세요</p>
                </div>
                <form action={formAction} className="space-y-4">
                    <EmailVerificationSection />

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">휴대폰 번호 (ID)</label>
                        <Input
                            name="username"
                            required
                            type="tel"
                            pattern="[0-9]*"
                            placeholder="01012345678"
                            className="h-10"
                            inputMode="numeric"
                        />
                    </div>
                    {/* ... other fields ... */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">이름</label>
                        <Input name="name" required placeholder="실명" className="h-10" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">비밀번호</label>
                            <Input name="password" type="password" required placeholder="****" className="h-10" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">확인</label>
                            <Input name="confirmPassword" type="password" required placeholder="****" className="h-10" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">비밀번호 힌트</label>
                        <Input name="passwordHint" required placeholder="기억에 남는 장소?" className="h-10" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">직책</label>
                        <Select name="jobTitle" required>
                            <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                                <SelectValue placeholder="직책을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent className="z-[99999]">
                                <SelectItem value="대표자">대표자</SelectItem>
                                <SelectItem value="총매니저">총매니저</SelectItem>
                                <SelectItem value="경영지원">경영지원</SelectItem>
                                <SelectItem value="과장">과장</SelectItem>
                                <SelectItem value="실장">실장</SelectItem>
                                <SelectItem value="주임">주임</SelectItem>
                                <SelectItem value="사원">사원</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Hidden role input default to user */}
                    <input type="hidden" name="role" value="user" />

                    {state?.error && (
                        <p className="text-sm font-semibold text-red-500 text-center bg-red-50 p-2 rounded">{state.error}</p>
                    )}

                    <Button type="submit" className="w-full h-11 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25">가입하기</Button>
                </form>
                <div className="text-center text-sm font-medium text-slate-600">
                    이미 계정이 있으신가요? <Link href="/login" className="text-blue-700 hover:underline font-bold">로그인</Link>
                </div>
            </div>
        </div>
    );
}
