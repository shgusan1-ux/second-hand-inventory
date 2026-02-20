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

                // Prevent GC
                (window as any).recognition = recognition;

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

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume(); // Wake up!

            const utterance = new SpeechSynthesisUtterance(text);

            // Explicitly find Korean voice
            const voices = window.speechSynthesis.getVoices();
            const koVoice = voices.find(v => v.lang === 'ko-KR' || v.lang.startsWith('ko'));
            if (koVoice) {
                utterance.voice = koVoice;
            }

            utterance.lang = 'ko-KR';
            utterance.pitch = 1;
            utterance.rate = 1.1; // Slightly faster for natural feel
            utterance.volume = 1;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                // Auto-restart mic if session is active
                if (isSessionActiveRef.current) {
                    setTimeout(() => {
                        if (isSessionActiveRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch (e) { /* ignore */ }
                        }
                    }, 200);
                }
            };
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);

            // Chrome bug fix: resume if paused (sometimes happens)
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
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
                    ? `p-2 rounded-full transition-colors relative ${isSessionActive ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100'}`
                    : `relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSessionActive
                        ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-110'
                        : isProcessing
                            ? 'bg-indigo-400 cursor-wait'
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'
                    }`}
                title={isSessionActive ? "대화 종료" : "음성 대화 시작"}
            >
                {/* Minimal specific active indicator or just use icon color */}
                {minimal ? (
                    <>
                        {isListening && (
                            <span className="absolute inset-0 rounded-full border-2 border-rose-400/50 animate-ping"></span>
                        )}
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isSpeaking ? (
                            <div className="flex gap-0.5 items-center justify-center w-5 h-5">
                                <span className="w-0.5 h-2 bg-indigo-500 animate-[bounce_1s_infinite_100ms] rounded-full"></span>
                                <span className="w-0.5 h-3 bg-indigo-500 animate-[bounce_1s_infinite_200ms] rounded-full"></span>
                                <span className="w-0.5 h-2 bg-indigo-500 animate-[bounce_1s_infinite_300ms] rounded-full"></span>
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
                            <div className="absolute inset-0 rounded-full border-4 border-rose-300 animate-ping opacity-25"></div>
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

            {transcript && (
                <div className={minimal
                    ? "fixed bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl pointer-events-none z-50 text-center"
                    : "fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md pointer-events-none z-50"
                }>
                    <div className="bg-black/70 backdrop-blur-md text-white px-4 py-3 rounded-2xl text-base font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-2 leading-relaxed">
                        {transcript}
                    </div>
                </div>
            )}
        </div>
    );
}
