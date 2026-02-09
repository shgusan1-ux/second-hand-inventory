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

    // Grouping for better layout (optional, or just single list)
    // The query already sorts by hierarchy.
    // Let's distinguish Executives/Managers/Staff visually if needed.
    // For now, a clean grid is good.

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                    조직도 (SCM 팀)
                </CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex flex-col items-center p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer text-center group"
                            onClick={() => handleUserClick(user)}
                        >
                            <Avatar className="h-10 w-10 mb-2 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                <AvatarFallback className={`${['대표자', '총매니저'].includes(user.job_title) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                    {user.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm text-slate-900">{user.name}</span>
                            <Badge variant="outline" className="mt-1 text-[10px] h-5 px-1 bg-white">
                                {user.job_title}
                            </Badge>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <div className="col-span-full text-center py-6 text-slate-400 text-sm">
                            등록된 직원이 없습니다.
                        </div>
                    )}
                </div>
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
