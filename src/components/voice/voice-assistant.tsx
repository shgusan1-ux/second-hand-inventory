'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAssistantProps {
    onCommand: (text: string) => Promise<any>;
}

export function VoiceAssistant({ onCommand }: VoiceAssistantProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Stop after one sentence
            recognition.interimResults = false;
            recognition.lang = 'ko-KR';

            recognition.onstart = () => {
                setIsListening(true);
                setTranscript('듣고 있어요...');
            };

            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                handleCommand(text);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                setTranscript('다시 시도해주세요');
                toast.error('음성 인식 오류가 발생했습니다.');
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('Web Speech API not supported');
        }
    }, []);

    const handleCommand = async (text: string) => {
        setIsProcessing(true);
        try {
            const result = await onCommand(text);

            // Text to Speech
            if (result && result.message) {
                speak(result.message);
            }
        } catch (error) {
            speak('죄송합니다. 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

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
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setTranscript('듣고 있어요...');
            recognitionRef.current?.start();
        }
    };

    if (!recognitionRef.current) {
        return null; // Don't render if not supported? Or render disabled button.
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
