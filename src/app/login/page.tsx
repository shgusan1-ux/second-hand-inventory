'use client';

import { useActionState, useEffect, useState } from 'react';
import { login } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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

    useEffect(() => {
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center p-4 bg-slate-900">
            {/* Live Background Video */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20 z-10"></div>
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-80"
                    poster="https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg"
                >
                    <source src="https://videos.pexels.com/video-files/855018/855018-hd_1920_1080_30fps.mp4" type="video/mp4" />
                    {/* Fallback Nature Video */}
                </video>
            </div>

            <div className="w-full max-w-sm space-y-6 p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 relative z-20 transition-all hover:scale-[1.01] duration-300">
                <div className="space-y-2 text-center text-white">
                    <div className="mx-auto w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-lg border border-white/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
                        <span className="text-sm font-medium opacity-80 block mb-1 tracking-wider uppercase">(주)에이치엠이커머스</span>
                        환경을 생각하는 기업
                    </h1>
                    <p className="text-sm font-medium opacity-70">자연과 함께하는 지속 가능한 미래</p>
                    {quote && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                            <p className="text-xs italic text-white/90 font-serif">"{quote}"</p>
                        </div>
                    )}
                </div>
                <form action={formAction} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-white/70 tracking-wider">휴대폰 번호 (ID)</label>
                        <Input
                            name="username"
                            required
                            type="tel"
                            pattern="[0-9]*"
                            className="bg-white/20 border-white/10 text-white placeholder:text-white/40 focus:bg-white/30 focus:border-white/50 transition-all h-11"
                            placeholder="01012345678"
                            inputMode="numeric"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-white/70 tracking-wider">비밀번호</label>
                            <Link href="/forgot-password" className="text-xs text-white/80 hover:text-white hover:underline">비밀번호 찾기</Link>
                        </div>
                        <Input name="password" type="password" required className="bg-white/20 border-white/10 text-white placeholder:text-white/40 focus:bg-white/30 focus:border-white/50 transition-all h-11" placeholder="••••••••" />
                    </div>
                    {state?.error && (
                        <div className="text-sm font-semibold text-red-200 text-center bg-red-900/50 p-3 rounded-md animate-pulse border border-red-500/30 whitespace-pre-line">
                            {state.error}
                        </div>
                    )}
                    <Button type="submit" className="w-full h-12 text-base font-bold bg-white text-slate-900 hover:bg-slate-100 transform transition-all active:scale-95 shadow-lg">
                        로그인
                    </Button>
                </form>
                <div className="text-center text-sm font-medium text-white/60 mt-4">
                    <Link href="/register" className="hover:text-white hover:underline transition-colors font-normal">임직원등록</Link>
                </div>
            </div>

            {/* Bottom Slogan */}
            <div className="absolute bottom-10 left-0 right-0 text-center z-20 animate-in slide-in-from-bottom-5 duration-1000 delay-500 fade-in">
                <span className="text-4xl font-light text-white tracking-widest drop-shadow-lg opacity-90" style={{ fontFamily: 'serif' }}>Eco-Friendly Life</span>
                <p className="text-xs text-white/50 mt-2 uppercase tracking-[0.5em]">Brown Street Inventory System</p>
            </div>
        </div>
    );
}
