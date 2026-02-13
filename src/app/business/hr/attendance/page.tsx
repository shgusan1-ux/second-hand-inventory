'use client';

import { useState, useEffect } from 'react';
import { getPendingCorrections, approveCorrection, rejectCorrection } from '@/lib/member-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Check, X, Clock, User, MessageCircle } from 'lucide-react';

export default function AttendanceAdminPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        getPendingCorrections().then(data => {
            setRequests(data);
            setLoading(false);
        });
    };

    const handleApprove = async (id: string, name: string) => {
        if (!confirm(`${name} 님의 정정 요청을 승인하시겠습니까?`)) return;
        const res = await approveCorrection(id);
        if (res.success) {
            toast.success('승인되었습니다.');
            loadData();
        } else {
            toast.error('오류 발생: ' + res.error);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('요청을 거절하시겠습니까?')) return;
        const res = await rejectCorrection(id);
        if (res.success) {
            toast.success('거절되었습니다.');
            loadData();
        } else {
            toast.error('오류 발생: ' + res.error);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">근태 정정 관리</h1>
                    <p className="text-slate-500">직원들의 근태 정정 요청을 확인하고 승인합니다.</p>
                </div>
                <Button variant="outline" onClick={loadData}>새로고침</Button>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-indigo-600" />
                    대기 중인 요청 ({requests.length})
                </h2>

                {loading ? (
                    <div className="py-10 text-center text-slate-500">로딩 중...</div>
                ) : requests.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="py-12 text-center text-slate-500">
                            대기 중인 정정 요청이 없습니다.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {requests.map((req) => {
                            const data = JSON.parse(req.correction_data);
                            return (
                                <Card key={req.id} className="bg-white border-l-4 border-l-amber-500 shadow-sm">
                                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                                    {req.work_date}
                                                </Badge>
                                                <span className="font-bold text-lg">{req.user_name}</span>
                                                <span className="text-sm text-slate-500">({req.job_title})</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <Clock className="w-4 h-4" />
                                                    정정 요청: <span className="font-mono font-bold text-slate-900">{data.checkIn.split('T')[1].substring(0, 5)} ~ {data.checkOut.split('T')[1].substring(0, 5)}</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded text-sm text-slate-600">
                                                Valid Reason: "{data.reason}"
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto">
                                            <Button
                                                variant="outline"
                                                className="flex-1 md:flex-none text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                onClick={() => handleReject(req.id)}
                                            >
                                                <X className="w-4 h-4 mr-2" /> 거절
                                            </Button>
                                            <Button
                                                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => handleApprove(req.id, req.user_name)}
                                            >
                                                <Check className="w-4 h-4 mr-2" /> 승인
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
