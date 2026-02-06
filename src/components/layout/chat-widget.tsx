'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, User, Send, X, Users as UsersIcon, Paperclip, FileIcon } from 'lucide-react';
import { heartbeat, getOnlineUsers, getMessages, sendMessage } from '@/lib/chat-actions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export function ChatWidget({ currentUser }: { currentUser: any }) {
    const [open, setOpen] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [attachment, setAttachment] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Heartbeat & Poll Users
    useEffect(() => {
        if (currentUser) {
            heartbeat(); // Initial
            const timer = setInterval(() => {
                heartbeat();
                fetchOnlineUsers();
            }, 30000); // Heartbeat every 30s
            fetchOnlineUsers(); // Initial fetch
            return () => clearInterval(timer);
        }
    }, [currentUser]);

    // Poll Messages when open
    useEffect(() => {
        if (open) {
            fetchMessages();
            const timer = setInterval(fetchMessages, 3000); // 3s polling
            return () => clearInterval(timer);
        }
    }, [open]);

    // Auto-scroll
    useEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    const fetchOnlineUsers = async () => {
        const users = await getOnlineUsers();
        setOnlineUsers(users);
    };

    const fetchMessages = async () => {
        const msgs = await getMessages();
        setMessages(msgs);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert('파일 크기는 2MB 이하여야 합니다.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAttachment(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() && !attachment) return;

        // Optimistic update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_name: currentUser.name,
            sender_id: currentUser.id,
            content: inputValue,
            attachment: attachment,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        setInputValue('');
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        await sendMessage(tempMsg.content, tempMsg.attachment);
        fetchMessages();
    };

    return (
        <>
            {/* Sidebar Trigger Area (Insert this into Sidebar) */}
            <div className="mb-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2"
                    onClick={() => setOpen(true)}
                >
                    <div className="relative mr-2">
                        <MessageSquare className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">실시간 채팅</span>
                        <span className="text-[10px] text-emerald-400">{onlineUsers.length}명 접속중</span>
                    </div>
                </Button>
            </div>

            {/* Chat Dialog / Drawer */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col overflow-hidden relative border border-slate-200">
                        {/* Header */}
                        <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-emerald-400" />
                                <span className="font-bold">팀 채팅 ({onlineUsers.length}명 접속)</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full h-8 w-8">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Online Users Banner */}
                        <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500 border-b flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                            <span className="font-semibold text-slate-700">접속자:</span>
                            {onlineUsers.map(u => (
                                <span key={u.user_id} className="flex items-center gap-1 text-emerald-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {u.name}
                                </span>
                            ))}
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUser.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] space-y-1`}>
                                            {!isMe && <div className="text-[10px] text-slate-500 ml-1">{msg.sender_name}</div>}
                                            <div className={cn(
                                                "p-3 rounded-2xl text-sm shadow-sm overflow-hidden",
                                                isMe ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border rounded-tl-none text-slate-800"
                                            )}>
                                                {msg.attachment && (
                                                    <div className="mb-2">
                                                        {msg.attachment.startsWith('data:image') ? (
                                                            <img src={msg.attachment} alt="attachment" className="rounded-md max-w-full h-auto max-h-[150px] object-cover" />
                                                        ) : (
                                                            <div className="flex items-center gap-2 p-2 bg-slate-100/20 rounded border border-white/20">
                                                                <FileIcon className="w-4 h-4" />
                                                                <span className="text-xs truncate max-w-[150px]">첨부파일</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.content}
                                            </div>
                                            <div className={`text-[9px] text-slate-400 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t">
                            {attachment && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded text-xs border">
                                    <Paperclip className="w-3 h-3 text-slate-500" />
                                    <span className="flex-1 truncate">파일 선택됨</span>
                                    <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-slate-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0 w-10 h-10 rounded-full">
                                    <Paperclip className="w-4 h-4 text-slate-500" />
                                </Button>
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="메시지 전송..."
                                    className="flex-1 focus-visible:ring-slate-900"
                                />
                                <Button type="submit" size="icon" disabled={!inputValue.trim() && !attachment} className="bg-slate-900 hover:bg-slate-800 text-white w-10 h-10 rounded-full">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
