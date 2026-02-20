'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Mic, Play, Radio, Loader2, Sparkles, AlertCircle, Bot, X, Share2, Zap, Star, Plus, History } from 'lucide-react';
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

function CommandCenterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionIdFromUrl = searchParams.get('sessionId');

    const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [model, setModel] = useState<'flash' | 'pro' | 'v3.1'>('v3.1');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial load history
    useEffect(() => {
        if (sessionId) {
            loadHistory(sessionId);
        } else {
            setMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: '안녕하세요! Brownstreet AI "Antigravity Alpha"입니다. 무엇을 도와드릴까요?',
                    timestamp: new Date().toISOString(),
                    type: 'text'
                }
            ]);
        }
    }, [sessionId]);

    const loadHistory = async (id: string) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/command?sessionId=${id}`);
            if (res.ok) {
                const data = await res.json();
                const mappedMessages = data.messages.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.created_at,
                    type: m.type,
                    actionData: m.action_data ? JSON.parse(m.action_data) : null
                }));
                setMessages(mappedMessages);
            }
        } catch (error) {
            console.error('History load error:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const startNewChat = () => {
        setSessionId(null);
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: '새로운 대화를 시작합니다. 무엇을 도와드릴까요?',
                timestamp: new Date().toISOString(),
                type: 'text'
            }
        ]);
        router.push('/admin/command');
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading, liveTranscript]);

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
                body: JSON.stringify({ command: userMsg.content, model, sessionId })
            });

            if (!res.ok) throw new Error('Failed to process command');

            const data = await res.json();

            if (!sessionId && data.sessionId) {
                setSessionId(data.sessionId);
                router.push(`/admin/command?sessionId=${data.sessionId}`, { scroll: false });
            }

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString(),
                type: data.type || 'text',
                actionData: data.actionData
            };

            setMessages(prev => [...prev, aiResponse]);
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
                body: JSON.stringify({ command: text, model, sessionId })
            });

            if (!res.ok) throw new Error('Failed to process command');

            const data = await res.json();

            if (!sessionId && data.sessionId) {
                setSessionId(data.sessionId);
                router.push(`/admin/command?sessionId=${data.sessionId}`, { scroll: false });
            }

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString(),
                type: data.type || 'text',
                actionData: data.actionData
            };
            setMessages(prev => [...prev, aiResponse]);
            setLiveTranscript('');
            setLoading(false);
            return data;
        } catch (e) {
            setLoading(false);
            return { message: '오류가 발생했습니다.' };
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] w-full max-w-md md:max-w-3xl mx-auto bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rounded-xl relative">

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight">Antigravity Alpha</h1>
                        <p className="text-[10px] text-cyan-600 font-black uppercase tracking-widest mt-0.5">The Smartest Efficiency AI</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={startNewChat}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="새 대화"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success('주소가 복사되었습니다.');
                            }
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Model Selector */}
            <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 flex items-center justify-end gap-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Engine:</span>
                <div className="flex bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setModel('v3.1')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${model === 'v3.1'
                            ? 'bg-cyan-100 text-cyan-700 font-black shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Sparkles className="w-3 h-3" /> Alpha 3.1
                    </button>
                    <button
                        onClick={() => setModel('flash')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${model === 'flash'
                            ? 'bg-amber-100 text-amber-700 font-black shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Zap className="w-3 h-3" /> Turbo Flash
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 scroll-smooth custom-scrollbar" ref={scrollRef}>
                {historyLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <p className="text-xs font-bold text-slate-500">대화 내용을 불러오는 중...</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
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
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">오늘 판매건수</div>
                                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{msg.actionData.data.count}건</div>
                                                </div>
                                                <div className="bg-emerald-50 dark:bg-slate-900 p-4 rounded-xl text-center border border-emerald-100 dark:border-slate-700">
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">오늘 총매출</div>
                                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{((msg.actionData.data?.total || 0) / 10000).toFixed(1)}만원</div>
                                                </div>
                                            </div>
                                        )}

                                        {(msg.actionData.status === 'running' || msg.actionData.type === 'system_status') && (
                                            <div className="max-w-full">
                                                <SystemMonitorWidget />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 opacity-60 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {liveTranscript && (
                    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1">
                        <div className="bg-indigo-600/50 text-white rounded-2xl rounded-tr-none p-4 shadow-sm text-sm italic">
                            "{liveTranscript}"
                        </div>
                    </div>
                )}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
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
                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none min-h-[44px] max-h-[120px] shadow-inner"
                            rows={1}
                        />
                        <div className="absolute right-2 bottom-2">
                            <VoiceAssistant
                                onCommand={handleVoiceCommand}
                                minimal={true}
                                autoStart={true}
                                onTranscript={(t) => setLiveTranscript(t)}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div >
    );
}

export default function CommandCenterPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        }>
            <CommandCenterContent />
        </Suspense>
    );
}
