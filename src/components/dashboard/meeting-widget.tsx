'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin, Plus } from 'lucide-react';
import { getMeetings, Meeting } from '@/lib/meeting-actions';
import Link from 'next/link';

export function MeetingWidget() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMeetings(3).then(data => {
            setMeetings(data as Meeting[]);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        회의 일정
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 animate-pulse">
                        <div className="h-16 bg-slate-100 rounded-lg"></div>
                        <div className="h-16 bg-slate-100 rounded-lg"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    회의 일정
                </CardTitle>
                <Link href="/business/collaboration/meetings/new">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Plus className="w-4 h-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
                <div className="space-y-4">
                    {meetings.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                            예정된 회의가 없습니다.
                        </div>
                    ) : (
                        meetings.map((meeting) => (
                            <Link key={meeting.id} href={`/business/collaboration/meetings/${meeting.id}`}>
                                <div className="group flex flex-col gap-1 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-indigo-100 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 line-clamp-1">
                                            {meeting.title}
                                        </h4>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${new Date(meeting.date) < new Date() ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {new Date(meeting.date) < new Date() ? '종료' : '예정'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {meeting.date.replace('T', ' ')}
                                        </div>
                                        {meeting.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {meeting.location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
                <div className="mt-4 text-center">
                    <Link href="/business/collaboration/meetings" className="text-xs text-slate-500 hover:text-slate-800 hover:underline">
                        전체 일정 보기 →
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
