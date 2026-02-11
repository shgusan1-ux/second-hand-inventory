'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Phone, Mail, MessageSquare, Send, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { sendMessage } from '@/lib/actions';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface OrgChartProps {
    users: any[];
}

export function OrgChart({ users }: OrgChartProps) {
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [messageOpen, setMessageOpen] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleUserClick = (user: any) => {
        setSelectedUser(user);
        setMessageOpen(false); // Reset message state
    };

    const handleSendMessage = async () => {
        if (!selectedUser) return;
        if (!messageContent.trim()) {
            toast.error('메시지 내용을 입력해주세요.');
            return;
        }

        startTransition(async () => {
            const result = await sendMessage(selectedUser.id, messageContent);
            if (result.success) {
                toast.success(`${selectedUser.name}님께 메시지를 보냈습니다.`);
                setMessageContent('');
                setMessageOpen(false);
                setSelectedUser(null); // Close main dialog too? Optional. Let's close message view.
            } else {
                toast.error(result.error || '메시지 전송 실패');
            }
        });
    };

    const formatPhone = (phone: string) => {
        if (!phone) return '-';
        return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    };

    // Hierarchy levels
    const levels = [
        { title: '대표자', titles: ['대표자'], color: 'bg-slate-900 border-slate-800' },
        { title: '관리자', titles: ['총매니저', '경영지원'], color: 'bg-slate-800 border-slate-700' },
        { title: '실무진', titles: ['실장', '과장', '주임'], color: 'bg-emerald-600 border-emerald-500' },
        { title: '지원팀', titles: ['전산', 'MD', 'CS'], color: 'bg-blue-600 border-blue-500' }
    ];

    const groupedUsers = levels.map(level => ({
        ...level,
        members: users.filter(u => level.titles.includes(u.job_title))
    })).filter(level => level.members.length > 0);

    const otherMembers = users.filter(u => !levels.some(l => l.titles.includes(u.job_title)));
    if (otherMembers.length > 0) {
        groupedUsers.push({ title: '기타', titles: [], color: 'bg-slate-500 border-slate-400', members: otherMembers });
    }

    return (
        <Card className="h-full flex flex-col bg-slate-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                <CardTitle className="text-lg font-bold text-slate-900">
                    전직원 조직도
                </CardTitle>
                <Users className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-6 space-y-8">
                {groupedUsers.map((group, idx) => (
                    <div key={group.title} className="space-y-4">
                        <div className="flex items-center justify-center gap-3 relative">
                            <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-200 -z-10 hidden sm:block"></div>
                            <div className="bg-slate-50 px-4 flex items-center gap-2 z-10 rounded-full border border-slate-100 py-1">
                                <div className={`h-2 w-2 rounded-full ${group.color.split(' ')[0]}`} />
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{group.title}</h3>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                            {group.members.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex flex-col items-center p-3 w-28 rounded-xl border bg-white shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer text-center group relative overflow-hidden"
                                    onClick={() => handleUserClick(user)}
                                >
                                    <div className={`absolute top-0 left-0 w-full h-1 ${group.color.split(' ')[0]}`} />
                                    <Avatar className="h-12 w-12 mb-2 border-2 border-white shadow-sm group-hover:scale-105 transition-transform mt-1">
                                        <AvatarFallback className={`${group.color} text-white text-xs font-bold`}>
                                            {user.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-sm text-slate-900 truncate w-full">{user.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{user.job_title}</span>
                                </div>
                            ))}
                        </div>
                        {idx < groupedUsers.length - 1 && (
                            <div className="flex justify-center -mb-2">
                                <div className="w-px h-8 bg-slate-300" />
                            </div>
                        )}
                    </div>
                ))}

                {users.length === 0 && (
                    <div className="text-center py-20 text-slate-400 text-sm italic">
                        나타낼 조직 구성원이 없습니다.
                    </div>
                )}
            </CardContent>

            {/* User Detail Dialog */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            직원 상세 정보
                        </DialogTitle>
                        <DialogDescription>
                            연락처 확인 및 1:1 메시지 전송이 가능합니다.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 border-2 border-slate-100">
                                    <AvatarFallback className="text-xl bg-slate-100 text-slate-600 font-bold">
                                        {selectedUser.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{selectedUser.name}</h3>
                                    <p className="text-sm font-medium text-slate-500">{selectedUser.job_title}</p>
                                    <p className="text-xs text-slate-400 mt-1">입사일: {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border shadow-sm">
                                        <Phone className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">연락처</p>
                                        <p className="text-sm font-medium text-slate-900">{formatPhone(selectedUser.username)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border shadow-sm">
                                        <Mail className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">이메일</p>
                                        <p className="text-sm font-medium text-slate-900">{selectedUser.email || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {!messageOpen ? (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => setMessageOpen(true)}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    1:1 메시지 보내기
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-in slide-in-from-bottom-2 fade-in">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-700">보낼 메시지</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-slate-400 hover:text-slate-600"
                                            onClick={() => setMessageOpen(false)}
                                        >
                                            취소
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="메시지 내용을 입력하세요..."
                                        value={messageContent}
                                        onChange={(e) => setMessageContent(e.target.value)}
                                        className="resize-none h-24"
                                    />
                                    <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                                        onClick={handleSendMessage}
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <span className="animate-spin mr-2">⏳</span>
                                        ) : (
                                            <Send className="w-4 h-4 mr-2" />
                                        )}
                                        전송하기
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
