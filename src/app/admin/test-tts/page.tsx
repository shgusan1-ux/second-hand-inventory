'use client';

import { useState } from 'react';
import { Play, Loader2, Music } from 'lucide-react';

export default function TTSTestPage() {
    const [text, setText] = useState('브라운스트리트는 세계 최고의 빈티지샵입니다.');
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const generateVoice = async () => {
        if (!text.trim() || loading) return;

        setLoading(true);
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: 'alloy' })
            });

            if (!res.ok) throw new Error('TTS Generation failed');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (error) {
            console.error(error);
            alert('음성 생성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Music className="text-indigo-600" /> TTS 테스트 센터
            </h1>

            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">대사 입력</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32"
                    />
                </div>

                <button
                    onClick={generateVoice}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" /> 생성 중...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" /> 음성 생성하기
                        </>
                    )}
                </button>

                {audioUrl && (
                    <div className="mt-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                        <label className="block text-sm font-bold text-indigo-900 mb-3">생성된 음성</label>
                        <audio controls src={audioUrl} className="w-full" autoPlay />
                    </div>
                )}
            </div>

            <p className="mt-4 text-xs text-slate-400 text-center uppercase tracking-widest font-bold">
                Brownstreet Premium TTS Engine v1.0
            </p>
        </div>
    );
}
