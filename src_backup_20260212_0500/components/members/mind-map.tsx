'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Member {
    id: string;
    username: string; // Phone
    name: string;
    job_title: string;
    email?: string;
    created_at: string;
}

export function MemberMindMap({ members }: { members: Member[] }) {
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    // Hierarchy Logic
    const representatives = members.filter(m => m.job_title === '대표자');
    const managers = members.filter(m => ['총매니저', '경영지원', '실장', '과장'].includes(m.job_title));
    const staff = members.filter(m => !['대표자', '총매니저', '경영지원', '실장', '과장'].includes(m.job_title));

    const Node = ({ member, highlight = false }: { member: Member, highlight?: boolean }) => (
        <div
            onClick={() => setSelectedMember(member)}
            className={`
                flex flex-col items-center p-3 rounded-lg shadow-sm border cursor-pointer hover:shadow-md hover:scale-105 transition-all bg-white min-w-[100px]
                ${highlight ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}
            `}
        >
            <Avatar className={`w-12 h-12 mb-2 ${highlight ? 'ring-2 ring-emerald-500' : ''}`}>
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-sm text-slate-800">{member.name}</span>
            <span className="text-[10px] text-slate-500">{member.job_title}</span>
        </div>
    );

    return (
        <div className="w-full h-full p-4 overflow-auto bg-slate-50/50 rounded-xl border border-dashed border-slate-300 min-h-[500px] flex flex-col items-center justify-center gap-8 relative">

            {/* Level 1: Representative */}
            <div className="flex gap-8 justify-center z-10">
                {representatives.length > 0 ? representatives.map(m => <Node key={m.id} member={m} highlight />) : <div className="text-slate-400 text-sm">대표자 미등록</div>}
            </div>

            {/* Connector Line 1 */}
            <div className="w-px h-8 bg-slate-300"></div>

            {/* Branch Out Line */}
            <div className="w-[80%] h-px bg-slate-300 relative">
                <div className="absolute left-1/2 -top-2 w-px h-2 bg-slate-300"></div>
            </div>

            {/* Level 2: Managers */}
            <div className="flex gap-4 flex-wrap justify-center w-full max-w-4xl z-10">
                {managers.length > 0 ? managers.map(m => <Node key={m.id} member={m} />) : <div className="text-slate-400 text-xs">관리자 없음</div>}
            </div>

            {/* Connector Line 2 */}
            <div className="w-px h-8 bg-slate-300"></div>
            <div className="w-[60%] h-px bg-slate-300"></div>

            {/* Level 3: Staff */}
            <div className="flex gap-4 flex-wrap justify-center w-full max-w-5xl z-10">
                {staff.length > 0 ? staff.map(m => <Node key={m.id} member={m} />) : <div className="text-slate-400 text-xs">직원 없음</div>}
            </div>

            {/* Background Decorative Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" aria-hidden="true">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-400" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback>{selectedMember?.name[0]}</AvatarFallback>
                            </Avatar>
                            {selectedMember?.name}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedMember?.job_title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">연락처</label>
                                <p className="text-sm font-semibold">{selectedMember?.username}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">이메일</label>
                                <p className="text-sm font-semibold">{selectedMember?.email || '미등록'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">입사일</label>
                                <p className="text-sm text-slate-600">{selectedMember ? new Date(selectedMember.created_at).toLocaleDateString() : '-'}</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
