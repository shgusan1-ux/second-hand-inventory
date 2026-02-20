'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAssistantProps {
    onCommand: (text: string) => Promise<any>;
    autoStart?: boolean;
    minimal?: boolean;
    onTranscript?: (text: string) => void;
}

export function VoiceAssistant({ onCommand, autoStart = false, minimal = false, onTranscript }: VoiceAssistantProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(autoStart);
    const [aiReply, setAiReply] = useState('');
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isSessionActiveRef = useRef(false);

    // Update ref when state changes
    useEffect(() => {
        isSessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                setIsSupported(true);
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'ko-KR';

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript('듣고 있어요...');
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    // Don't stop session on common errors like no-speech
                    if (event.error === 'not-allowed') {
                        setIsSessionActive(false);
                        toast.error('마이크 권한이 필요합니다.');
                    }
                };

                recognition.onend = () => {
                    setIsListening(false);
                    // Auto-restart if session is active and not speaking
                    if (isSessionActiveRef.current && !isSpeaking) {
                        try { recognition.start(); } catch (e) { }
                    }
                };

                recognition.onresult = (event: any) => {
                    const current = event.resultIndex;
                    const resultText = event.results[current][0].transcript;
                    setTranscript(resultText);
                    if (onTranscript) onTranscript(resultText);

                    if (event.results[current].isFinal) {
                        handleFinalTranscript(resultText);
                    }
                };

                recognitionRef.current = recognition;

                if (autoStart) {
                    try { recognition.start(); } catch (e) { }
                }

                if ('speechSynthesis' in window) {
                    window.speechSynthesis.getVoices();
                }

                // Initialize stable audio ref for iOS
                if (!audioRef.current) {
                    audioRef.current = new Audio();
                }

                return () => {
                    recognition.stop();
                };
            }
        }
    }, [autoStart]);

    const handleFinalTranscript = async (text: string) => {
        if (!text.trim() || text === '듣고 있어요...') return;

        setIsProcessing(true);
        // Stop recognition while processing to avoid echo
        try { recognitionRef.current.stop(); } catch (e) { }

        try {
            const result = await onCommand(text);
            if (result && result.message) {
                setAiReply(result.message);
                await speak(result.message);
            }
        } catch (error) {
            console.error('Command processing error', error);
            toast.error('명령 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const speak = async (text: string) => {
        setIsSpeaking(true);

        let success = false;
        try {
            // 1. Try OpenAI TTS for natural voice
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: 'alloy' })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                if (audioRef.current) {
                    audioRef.current.src = url;

                    audioRef.current.onended = () => {
                        setIsSpeaking(false);
                        URL.revokeObjectURL(url);
                        if (isSessionActiveRef.current) {
                            setTimeout(() => {
                                if (isSessionActiveRef.current) {
                                    try { recognitionRef.current.start(); } catch (e) { }
                                }
                            }, 200);
                        }
                    };

                    audioRef.current.onerror = () => {
                        setIsSpeaking(false);
                        URL.revokeObjectURL(url);
                    };

                    await audioRef.current.play();
                    success = true;
                }
            }
        } catch (e) {
            console.warn('OpenAI TTS failed (possibly iOS restriction), falling back to System Speech:', e);
        }

        // 2. Fallback to System Speech (window.speechSynthesis)
        if (!success && 'speechSynthesis' in window) {
            // Cancel any current speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';

            // Find a better Korean voice if available
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('KR')) || voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onend = () => {
                setIsSpeaking(false);
                // Restart mic after system speech
                if (isSessionActiveRef.current) {
                    setTimeout(() => {
                        if (isSessionActiveRef.current) {
                            try { recognitionRef.current.start(); } catch (e) { }
                        }
                    }, 200);
                }
            };

            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
        } else if (!success) {
            setIsSpeaking(false);
        }
    };

    const playBeep = () => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, context.currentTime);
            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.1);
        } catch (e) { }
    };

    const toggleListening = () => {
        if (isSessionActive) {
            setIsSessionActive(false);
            setAiReply('');
            setTranscript('');
            try { recognitionRef.current.stop(); } catch (e) { }
        } else {
            // Start session with beep to wake up Bluetooth
            playBeep();

            // "Unlock" audio context/element for iOS
            if (audioRef.current) {
                audioRef.current.play().catch(() => { });
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            setIsSessionActive(true);
            setTranscript('듣고 있어요...');
            setAiReply(''); // Clear previous reply
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
                try {
                    recognitionRef.current.stop();
                    setTimeout(() => recognitionRef.current.start(), 100);
                } catch (err) { }
            }
        }
    };

    if (!isSupported) {
        return (
            <div className="text-rose-500 p-2" title="이 브라우저는 음성 인식을 지원하지 않습니다.">
                <MicOff className="w-5 h-5 opacity-50" />
            </div>
        );
    }

    return (
        <div className="relative flex flex-col items-center gap-2">
            <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={minimal
                    ? `p-2 rounded-full transition-colors relative ${isSessionActive ? 'text-cyan-500 bg-cyan-50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100'}`
                    : `relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSessionActive
                        ? 'bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110'
                        : isProcessing
                            ? 'bg-slate-400 cursor-wait'
                            : 'bg-slate-900 hover:bg-slate-800 shadow-lg'
                    }`}
                title={isSessionActive ? "대화 종료" : "음성 대화 시작"}
            >
                {minimal ? (
                    <>
                        {isListening && (
                            <span className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping"></span>
                        )}
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isSpeaking ? (
                            <div className="flex gap-0.5 items-center justify-center w-5 h-5">
                                <span className="w-0.5 h-2 bg-cyan-400 animate-[bounce_1s_infinite_100ms] rounded-full"></span>
                                <span className="w-0.5 h-3 bg-cyan-400 animate-[bounce_1s_infinite_200ms] rounded-full"></span>
                                <span className="w-0.5 h-2 bg-cyan-400 animate-[bounce_1s_infinite_300ms] rounded-full"></span>
                            </div>
                        ) : isListening ? (
                            <Mic className="w-5 h-5" />
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </>
                ) : (
                    <>
                        {isListening ? (
                            <div className="absolute inset-0 rounded-full border-4 border-cyan-300 animate-ping opacity-25"></div>
                        ) : null}

                        {isProcessing ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : isSpeaking ? (
                            <div className="flex gap-1 justify-center items-center h-full">
                                <span className="w-1 h-3 bg-white animate-[bounce_1s_infinite_100ms] rounded-full"></span>
                                <span className="w-1 h-5 bg-white animate-[bounce_1s_infinite_200ms] rounded-full"></span>
                                <span className="w-1 h-3 bg-white animate-[bounce_1s_infinite_300ms] rounded-full"></span>
                            </div>
                        ) : isListening ? (
                            <Mic className="w-8 h-8 text-white animate-pulse" />
                        ) : (
                            <Mic className="w-8 h-8 text-white" />
                        )}
                    </>
                )}
            </button>

            {(transcript || aiReply) && isSessionActive && !minimal && (
                <div className={minimal
                    ? "fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl pointer-events-none z-[110] text-center"
                    : "fixed bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-md pointer-events-none z-[110]"
                }>
                    <div className="bg-slate-900/90 backdrop-blur-2xl text-white p-5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 border border-white/10 ring-1 ring-white/20">
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Antigravity Alpha</span>
                            </div>
                            <span className="text-[9px] font-bold text-white/40 uppercase">Voice Hub</span>
                        </div>

                        <div className="space-y-3">
                            {transcript && (
                                <div className="text-xs text-white/60 font-medium italic animate-in fade-in transition-all">
                                    "{transcript}"
                                </div>
                            )}

                            {aiReply && (
                                <div className="text-sm font-bold leading-relaxed text-white drop-shadow-sm animate-in slide-in-from-left-2 transition-all">
                                    {aiReply}
                                </div>
                            )}

                            {!aiReply && isListening && !transcript.includes('...') && (
                                <div className="flex gap-1 justify-start items-center h-4 opacity-50">
                                    <span className="w-1 h-2 bg-white animate-[bounce_1s_infinite_100ms] rounded-full"></span>
                                    <span className="w-1 h-3 bg-white animate-[bounce_1s_infinite_200ms] rounded-full"></span>
                                    <span className="w-1 h-2 bg-white animate-[bounce_1s_infinite_300ms] rounded-full"></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
