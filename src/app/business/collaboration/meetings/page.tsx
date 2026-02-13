'use client';

import { useState, useEffect } from 'react';
import { getMeetings, Meeting } from '@/lib/meeting-actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, MapPin, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function MeetingListPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getMeetings();
        setMeetings(data as Meeting[]);
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">회의 일정 및 회의록</h1>
                    <p className="text-slate-500 mt-1">사내 주요 일정을 공유하고 회의 내용을 기록합니다.</p>
                </div>
                <Link href="/business/collaboration/meetings/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                        <Plus className="w-4 h-4 mr-2" /> 새 회의 등록
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed text-slate-500">
                    등록된 회의 일정이 없습니다.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {meetings.map((meeting) => {
                        const date = new Date(meeting.date);
                        const isPast = date < new Date();

                        return (
                            <Link key={meeting.id} href={`/business/collaboration/meetings/${meeting.id}`}>
                                <Card className={`hover:shadow-lg transition-all duration-200 border-slate-200 cursor-pointer h-full group ${isPast ? 'bg-slate-50' : 'bg-white border-indigo-100'
                                    }`}>
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col items-center bg-slate-100 rounded-lg p-2 min-w-[3.5rem] border border-slate-200">
                                                <span className="text-xs font-bold text-slate-500 uppercase">
                                                    {format(date, 'MMM', { locale: ko })}
                                                </span>
                                                <span className="text-xl font-extrabold text-slate-800">
                                                    {format(date, 'd')}
                                                </span>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {isPast ? '종료됨' : '예정됨'}
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <h3 className={`font-bold text-lg mb-2 group-hover:text-indigo-600 transition-colors ${isPast ? 'text-slate-600' : 'text-slate-900'
                                                }`}>
                                                {meeting.title}
                                            </h3>

                                            <div className="space-y-2 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    {format(date, 'HH:mm')}
                                                </div>
                                                {meeting.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                        {meeting.location}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-slate-400" />
                                                    {meeting.attendees?.length || 0}명 참석
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                            <span>작성자: {meeting.creator_name || '알 수 없음'}</span>
                                            <span className="group-hover:translate-x-1 transition-transform">
                                                <ChevronRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
