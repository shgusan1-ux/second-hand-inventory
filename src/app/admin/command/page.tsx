'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Mic, Play, Radio, Loader2, Sparkles, AlertCircle, Bot, X, Share2, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceAssistant } from '@/components/voice/voice-assistant';
import { ProfitInsightWidget } from '@/components/profit-insight/widget';
import { SystemMonitorWidget } from '@/components/dashboard/system-monitor-widget';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: 'text' | 'action' | 'status' | 'error';
    actionData?: any;
}

export default function CommandCenterPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '안녕하세요! Brownstreet AI입니다. 재고 관리와 매출 분석을 도와드릴게요. 말씀만 하세요!',
            timestamp: new Date().toISOString(),
            type: 'text'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [model, setModel] = useState<'flash' | 'pro' | 'v3.1'>('v3.1');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.body.style.overflowX = 'hidden';
            return () => { document.body.style.overflowX = ''; };
        }
    }, []);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: userMsg.content, model })
            });

            if (!res.ok) throw new Error('Failed to process command');

            const data = await res.json();

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString(),
                type: data.type || 'text',
                actionData: data.actionData
            };

            setMessages(prev => [...prev, aiResponse]);

            if (data.actionRequired) {
                // Automatically perform action if simple, or show button
                // For now, let's assume the API already performed the action or returned a confirmation needed
            }

        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '죄송합니다. 명령을 처리하는 중 오류가 발생했습니다.',
                timestamp: new Date().toISOString(),
                type: 'error'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceCommand = async (text: string) => {
        // Determine user message
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: text, model })
            });

            if (!res.ok) throw new Error('Failed to process command');

            const data = await res.json();

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString(),
                type: data.type || 'text',
                actionData: data.actionData
            };
            setMessages(prev => [...prev, aiResponse]);
            setLoading(false);
            return data; // Return for TTS
        } catch (e) {
            setLoading(false);
            return { message: '오류가 발생했습니다.' };
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] w-full max-w-md md:max-w-2xl mx-auto bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rounded-xl relative">

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Brownstreet AI</h1>
                        <p className="text-[10px] text-slate-500 font-medium">Command Center</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success('주소가 복사되었습니다. 카카오톡으로 보내서 접속하세요!');
                        }
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                    title="주소 복사"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Model Selector (Sticky or just below header) */}
            <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 flex items-center justify-end gap-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500">AI Model:</span>
                <div className="flex bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setModel('flash')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${model === 'flash'
                            ? 'bg-amber-100 text-amber-700 font-bold shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Zap className="w-3 h-3" /> Flash 2.0
                    </button>
                    <button
                        onClick={() => setModel('pro')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${model === 'pro'
                            ? 'bg-indigo-100 text-indigo-700 font-bold shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Star className="w-3 h-3" /> Pro 1.5
                    </button>
                    <button
                        onClick={() => setModel('v3.1')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${model === 'v3.1'
                            ? 'bg-purple-100 text-purple-700 font-bold shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Sparkles className="w-3 h-3" /> Gemini 3.1
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 scroll-smooth" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : msg.type === 'error'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100 rounded-tl-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                }`}
                        >
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                            {msg.actionData && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 w-full animate-in fade-in slide-in-from-bottom-2">
                                    {msg.actionData.type === 'profit_analysis' && (
                                        <div className="max-w-sm">
                                            <ProfitInsightWidget
                                                sellPrice={msg.actionData.data.revenue}
                                                purchasePrice={msg.actionData.data.cost}
                                            />
                                        </div>
                                    )}

                                    {msg.actionData.type === 'sales_summary' && (
                                        <div className="grid grid-cols-2 gap-4 max-w-sm">
                                            <div className="bg-indigo-50 dark:bg-slate-900 p-4 rounded-xl text-center border border-indigo-100 dark:border-slate-700">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">오늘 판매량</div>
                                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{msg.actionData.data.count}건</div>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-slate-900 p-4 rounded-xl text-center border border-emerald-100 dark:border-slate-700">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">총 매출</div>
                                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{((msg.actionData.data?.total || 0) / 10000).toFixed(1)}만원</div>
                                            </div>
                                        </div>
                                    )}

                                    {(msg.actionData.status === 'running' || msg.actionData.type === 'system_status') && (
                                        <div className="max-w-full">
                                            <SystemMonitorWidget />
                                        </div>
                                    )}

                                    {/* Fallback for generic details */}
                                    {msg.actionData.details && !['profit_analysis', 'sales_summary', 'system_status'].includes(msg.actionData.type) && (
                                        <pre className="text-[10px] bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto max-w-full text-slate-600 font-mono whitespace-pre-wrap break-all">
                                            {JSON.stringify(msg.actionData.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                            <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 opacity-60 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
                    <div className="flex-1 relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder="명령어 입력..."
                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[44px] max-h-[120px]"
                            rows={1}
                        />
                        <div className="absolute right-2 bottom-2">
                            <VoiceAssistant onCommand={handleVoiceCommand} minimal={true} autoStart={true} />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                    "오늘 매출 어때?", "네이버 동기화 시작해줘" 등으로 명령해보세요.
                </p>
            </div>
        </div >
    );
}
