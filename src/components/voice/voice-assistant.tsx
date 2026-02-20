'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAssistantProps {
    onCommand: (text: string) => Promise<any>;
    autoStart?: boolean;
    minimal?: boolean;
}

export function VoiceAssistant({ onCommand, autoStart = false, minimal = false }: VoiceAssistantProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(autoStart);
    const [aiReply, setAiReply] = useState('');
    const recognitionRef = useRef<any>(null);
    const isSessionActiveRef = useRef(false);

    // Update ref when state changes
    useEffect(() => {
        isSessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    const [isSupported, setIsSupported] = useState(false);

    const onCommandRef = useRef(onCommand);
    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true; // Changed to true to see partial results
                recognition.lang = 'ko-KR';

                (window as any).recognition = recognition;

                // Pre-load voices
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.getVoices();
                }

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript('듣고 있어요...');
                };

                recognition.onsoundstart = () => {
                    setTranscript('듣고 있어요... (소리 감지)');
                };

                recognition.onresult = async (event: any) => {
                    // Combine all results
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (interimTranscript) {
                        setTranscript(interimTranscript);
                    }

                    if (finalTranscript) {
                        setTranscript(finalTranscript);
                        setIsListening(false);

                        setIsProcessing(true);
                        try {
                            const result = await onCommandRef.current(finalTranscript);
                            if (result && result.message) {
                                setAiReply(result.message);
                                speak(result.message);
                            }
                        } catch (error) {
                            // Error
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                    if (event.error === 'not-allowed') {
                        toast.error('마이크 권한이 필요합니다.');
                        setTranscript('권한 거부됨');
                    } else if (event.error === 'no-speech') {
                        // Silent fail
                    } else if (event.error === 'aborted') {
                        setIsListening(false);
                        // Don't show toast, just stop
                    } else {
                        toast.error('오류가 발생했습니다: ' + event.error);
                    }
                };

                recognition.onend = () => {
                    setIsListening(false);
                    // Continuous session logic: restart if session is active and not speaking/processing
                    if (isSessionActiveRef.current && !isProcessing && !window.speechSynthesis.speaking) {
                        setTimeout(() => {
                            if (isSessionActiveRef.current) {
                                try {
                                    recognitionRef.current.start();
                                } catch (e) { /* ignore */ }
                            }
                        }, 300);
                    }
                };

                recognitionRef.current = recognition;
                setIsSupported(true);

                if (autoStart) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('Auto-start failed', e);
                    }
                }
            } else {
                console.warn('Web Speech API not supported');
                setIsSupported(false);
            }
        }
    }, [autoStart]);

    const speak = async (text: string) => {
        setIsSpeaking(true);

        let success = false;
        try {
            // 1. Try OpenAI TTS for natural voice
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: 'nova' }) // 'nova' is very clear/natural
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);

                audio.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(url);
                    // Auto-restart mic if session is active
                    if (isSessionActiveRef.current) {
                        setTimeout(() => {
                            if (isSessionActiveRef.current) {
                                try { recognitionRef.current.start(); } catch (e) { }
                            }
                        }, 200);
                    }
                };

                audio.onerror = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(url);
                };

                await audio.play();
                success = true;
            }
        } catch (e) {
            console.warn('OpenAI TTS failed, falling back to System Speech:', e);
        }

        // 2. Fallback to System Speech (window.speechSynthesis)
        if (!success && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();

            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => (v.lang === 'ko-KR' || v.lang.startsWith('ko')) &&
                (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Google')))
                || voices.find(v => v.lang === 'ko-KR' || v.lang.startsWith('ko'));

            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.lang = 'ko-KR';
            utterance.pitch = 1;
            utterance.rate = 1.1;
            utterance.volume = 1;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
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
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            // Resume context if suspended (common in Safari)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.2);

            // SILENT PRIME: Important for mobile browsers to allow subsequent speech without gesture
            if ('speechSynthesis' in window) {
                const prime = new SpeechSynthesisUtterance('');
                prime.volume = 0;
                window.speechSynthesis.speak(prime);
            }
        } catch (e) {
            console.error('Audio beep failed', e);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isSessionActive) {
            // Stop session
            setIsSessionActive(false);
            recognitionRef.current.stop();
            window.speechSynthesis.cancel();
            setIsListening(false);
            setTranscript('');
        } else {
            // Start session with beep to wake up Bluetooth
            playBeep();

            setIsSessionActive(true);
            setTranscript('듣고 있어요...');
            setAiReply(''); // Clear previous reply
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            }
        }
    };

    if (!isSupported) {
        return (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-rose-50 border border-rose-100 p-4 rounded-2xl shadow-xl z-50 text-center">
                <div className="flex justify-center mb-2">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="font-bold text-rose-900 mb-1">음성 기능을 사용할 수 없습니다</h3>
                <p className="text-xs text-rose-700 leading-relaxed">
                    1. <b>HTTPS</b> 주소로 접속했는지 확인해 주세요.<br />
                    2. <b>Chrome</b> 또는 <b>Safari</b> 브라우저를 사용하세요.<br />
                    3. 마이크 권한을 허용해 주셔야 합니다.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2">
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
                {/* Minimal specific active indicator or just use icon color */}
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

            {(transcript || aiReply) && (
                <div className={minimal
                    ? "fixed bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl pointer-events-none z-50 text-center"
                    : "fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md pointer-events-none z-50"
                }>
                    <div className="bg-black/80 backdrop-blur-xl text-white p-5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Antigravity Alpha Code</span>
                        </div>
                        <div className="text-sm font-medium leading-relaxed">
                            {aiReply ? (
                                <span className="text-white drop-shadow-sm">{aiReply}</span>
                            ) : (
                                <span className="text-white/70 italic">"{transcript}"</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
