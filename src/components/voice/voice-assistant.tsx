'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAssistantProps {
    onCommand: (text: string) => Promise<any>;
    autoStart?: boolean;
}

export function VoiceAssistant({ onCommand, autoStart = false }: VoiceAssistantProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);

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
                                if ('speechSynthesis' in window) {
                                    const utterance = new SpeechSynthesisUtterance(result.message);
                                    utterance.lang = 'ko-KR';
                                    window.speechSynthesis.speak(utterance);
                                }
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
                    } else {
                        toast.error('오류가 발생했습니다: ' + event.error);
                    }
                };

                recognition.onend = () => {
                    setIsListening(false);
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
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.pitch = 1;
            utterance.rate = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setTranscript('듣고 있어요...');
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
                // Sometimes it throws if already started
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            }
        }
    };

    if (!isSupported) {
        return (
            <div className="text-rose-500 text-sm p-4 bg-rose-50 rounded-lg text-center">
                이 브라우저는 음성 인식을 지원하지 않습니다.<br />
                (Chrome, Safari, Edge 사용 권장)
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening
                    ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-110'
                    : isProcessing
                        ? 'bg-indigo-400 cursor-wait'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'
                    }`}
            >
                {isListening ? (
                    <div className="absolute inset-0 rounded-full border-4 border-rose-300 animate-ping opacity-25"></div>
                ) : null}

                {isProcessing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : isListening ? (
                    <Mic className="w-8 h-8 text-white animate-pulse" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}
            </button>

            {transcript && (
                <div className="bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                    {transcript}
                </div>
            )}
        </div>
    );
}
