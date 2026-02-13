'use client';

import { useActionState, useEffect, useState } from 'react';
import { login } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { OceanVideoBackground } from '@/components/ui/ocean-video-background';
import { WeatherLogo } from '@/components/ui/weather-logo';

const QUOTES = [
    "성공은 종착점이 아니라 여정이다.",
    "오늘 걷지 않으면 내일은 뛰어야 한다.",
    "시작이 반이다. 시작했다면 이미 반은 성공한 것이다.",
    "위대한 일은 갑자기 일어나지 않는다.",
    "할 수 있다고 믿는 사람은 결국 해낸다.",
    "가장 어두운 밤이 지나면 가장 밝은 새벽이 온다.",
    "꿈을 꾸기에 늦은 나이란 없다.",
    "멈추지 않는 한, 얼마나 천천히 가는지는 중요하지 않는다.",
    "당신의 하루가 별보다 빛나길.",
    "오늘의 노력이 내일의 영광이 된다.",
    "작은 성취가 모여 위대한 결과를 만든다."
];

export default function LoginPage() {
    const [state, formAction] = useActionState(login, { success: false, error: '' });
    const [quote, setQuote] = useState('');
    const [showSplash, setShowSplash] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, []);

    useEffect(() => {
        if (state?.success) {
            setShowSplash(true);
            const timer = setTimeout(() => {
                router.push('/');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    if (showSplash) {
        return (
            <OceanVideoBackground className="fixed inset-0 z-[9999]">
                <div className="z-10 text-center max-w-2xl px-6">
                    <div className="mb-8 opacity-0 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
                        <Image src="/brown_street.svg" alt="Brown Street" width={220} height={70} className="mx-auto brightness-0 invert" />
                    </div>
                    <h2 className="text-2xl md:text-5xl font-extralight leading-tight font-serif italic mb-10 text-white animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-forwards drop-shadow-2xl">
                        "{quote}"
                    </h2>
                    <div className="w-24 h-1 bg-emerald-400 mx-auto rounded-full opacity-0 animate-in fade-in expand duration-1000 delay-700 fill-mode-forwards"></div>
                </div>
            </OceanVideoBackground>
        );
    }

    return (
        <OceanVideoBackground className="fixed inset-0 w-full h-full overflow-y-auto">
            <div className="w-full max-w-sm space-y-6 p-8 bg-black/20 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 relative z-20 transition-all hover:scale-[1.01] duration-300 my-auto">
                <div className="space-y-2 text-center text-white">
                    <div className="mx-auto w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-lg border border-white/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
                        <span className="text-lg font-bold block mb-1 tracking-wider uppercase">(주)에이치엠이커머스</span>
                    </h1>
                </div>
                <form action={formAction} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-white/60 tracking-wider">휴대폰 번호 (ID)</label>
                        <Input
                            name="username"
                            required
                            type="tel"
                            pattern="[0-9]*"
                            autoComplete="username"
                            className="bg-white/5 border-white/5 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/20 transition-all h-11"
                            placeholder="01012345678"
                            inputMode="numeric"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-white/60 tracking-wider">비밀번호</label>
                            <Link href="/forgot-password" className="text-xs text-white/60 hover:text-white hover:underline">비밀번호 찾기</Link>
                        </div>
                        <Input id="password" name="password" type="password" required autoComplete="current-password" className="bg-white/5 border-white/5 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/20 transition-all h-11" placeholder="••••••••" />
                    </div>
                    {state?.error && (
                        <div className="text-sm font-semibold text-red-200 text-center bg-red-900/40 p-3 rounded-md animate-pulse border border-red-500/20 whitespace-pre-line">
                            {state.error}
                        </div>
                    )}
                    <Button type="submit" className="w-full h-12 text-base font-bold bg-white text-slate-950 hover:bg-slate-100 transform transition-all active:scale-95 shadow-xl">
                        로그인
                    </Button>
                </form>
                <div className="text-center text-sm font-medium text-white/40 mt-4">
                    <Link href="/register" className="hover:text-white hover:underline transition-colors font-normal">임직원등록</Link>
                </div>
            </div>

            <div className="relative z-20 animate-in slide-in-from-bottom-5 duration-1000 delay-500 fade-in flex flex-col items-center gap-4 mt-8 pb-8">
                <div className="relative group">
                    <div className="absolute inset-0 bg-black/20 blur-2xl rounded-full scale-150 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <WeatherLogo className="h-10 invert opacity-100 relative z-10" />
                </div>
            </div>
        </OceanVideoBackground>
    );
}
