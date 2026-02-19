'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserPermissions, getMemberAttendanceStats, toggleAdminPermission } from '@/lib/member-actions';
import { deleteUser as deleteUserAction } from '@/lib/actions';
import { UserCog, CalendarClock, Shield, Trash2, LayoutList, Network, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { MemberMindMap } from './mind-map';

interface User {
    id: string;
    username: string;
    name: string;
    job_title: string;
    role: string;
    created_at: string;
    permissions?: string[];
    email?: string;
    can_view_accounting?: boolean;
    attendance_score?: number;
    allowed_locations?: string;
}

const CATEGORIES = [
    { id: 'inventory', label: '재고 관리' },
    { id: 'smartstore', label: '스마트스토어' },
    { id: 'returns', label: '반품 관리' },
    { id: 'statistics', label: '통계' },
    { id: 'ads', label: '광고 관리' },
    { id: 'settings', label: '설정' },
    { id: 'members', label: '회원 관리' },
];

export function MemberManagement({ users, currentUser }: { users: User[], currentUser: any }) {
    // Current User Admin Check (includes '점장' now as requested)
    // Also checks if they have ALL permission (which includes manually granted ADMINs)
    const isAdmin = currentUser && (['대표자', '경영지원', '점장'].includes(currentUser.job_title) || currentUser.permissions?.includes('ALL'));

    const [viewMode, setViewMode] = useState<'list' | 'mindmap'>('list');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [permissionModalOpen, setPermissionModalOpen] = useState(false);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

    // Message states
    const [messageOpen, setMessageOpen] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [messageSending, setMessageSending] = useState(false);

    const openMessageModal = (user: User) => {
        setSelectedUser(user);
        setMessageOpen(true);
    };

    const handleSendMessage = async () => {
        if (!selectedUser || !messageContent.trim()) return;
        setMessageSending(true);
        const { sendMessage } = await import('@/lib/actions');
        const res = await sendMessage(selectedUser.id, messageContent);
        setMessageSending(false);
        if (res.success) {
            alert('메시지를 보냈습니다.');
            setMessageOpen(false);
            setMessageContent('');
        } else {
            alert('실패: ' + res.error);
        }
    };

    // Permission State
    const [tempPermissions, setTempPermissions] = useState<string[]>([]);

    // Attendance State
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

    // Handlers
    const openPermissionModal = (user: User) => {
        setSelectedUser(user);
        setTempPermissions(user.permissions || []);
        setPermissionModalOpen(true);
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;
        const res = await updateUserPermissions(selectedUser.id, tempPermissions);
        if (res.success) {
            alert('권한이 수정되었습니다.');
            setPermissionModalOpen(false);
            window.location.reload();
        } else {
            alert('실패: ' + res.error);
        }
    };

    const togglePermission = (catId: string) => {
        if (tempPermissions.includes(catId)) setTempPermissions(tempPermissions.filter(p => p !== catId));
        else setTempPermissions([...tempPermissions, catId]);
    };

    const openAttendanceModal = async (user: User) => {
        setSelectedUser(user);
        setAttendanceModalOpen(true);
        loadAttendance(user.id, selectedMonth);
    };

    const loadAttendance = async (userId: string, month: string) => {
        const logs = await getMemberAttendanceStats(userId, month);
        setAttendanceLogs(logs);
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`${user.name}님을 삭제하시겠습니까?`)) return;
        const res = await deleteUserAction(user.id);
        if (res.success) {
            alert('삭제되었습니다.');
            window.location.reload();
        } else {
            alert('삭제 실패: ' + res.error);
        }
    };

    // Job Title Edit
    const [jobTitleModalUser, setJobTitleModalUser] = useState<User | null>(null);
    const [newJobTitle, setNewJobTitle] = useState('');

    const openJobTitleModal = (user: User) => {
        setJobTitleModalUser(user);
        setNewJobTitle(user.job_title);
    };

    const handleUpdateJobTitle = async () => {
        if (!jobTitleModalUser || !newJobTitle) return;
        const { updateUserJobTitle } = await import('@/lib/member-actions');
        const res = await updateUserJobTitle(jobTitleModalUser.id, newJobTitle);
        if (res.success) {
            alert('직책이 변경되었습니다.');
            setJobTitleModalUser(null);
            window.location.reload();
        } else {
            alert('실패: ' + res.error);
        }
    };

    // Location Settings
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locationData, setLocationData] = useState<{ name: string, lat: string, lon: string }[]>([
        { name: '본사', lat: '37.5665', lon: '126.9780' },
        { name: '출장지', lat: '', lon: '' }
    ]);

    const openLocationModal = (user: User) => {
        setSelectedUser(user);
        if (user.allowed_locations) {
            const allowed = JSON.parse(user.allowed_locations);
            setLocationData(allowed.map((l: any) => ({ name: l.name, lat: String(l.lat), lon: String(l.lon) })));
        } else {
            setLocationData([
                { name: '본사', lat: '37.5665', lon: '126.9780' },
                { name: '출장지', lat: '', lon: '' }
            ]);
        }
        setLocationModalOpen(true);
    };

    const handleSaveLocations = async () => {
        if (!selectedUser) return;
        const { updateUserLocations } = await import('@/lib/member-actions');
        const formatted = locationData
            .filter(l => l.lat && l.lon)
            .map(l => ({ name: l.name, lat: parseFloat(l.lat), lon: parseFloat(l.lon), radius: 200 }));

        const res = await updateUserLocations(selectedUser.id, formatted);
        if (res.success) {
            alert('출근 가능 지역이 설정되었습니다.');
            setLocationModalOpen(false);
            window.location.reload();
        } else {
            alert('실패: ' + res.error);
        }
    };

    return (
        <div className="space-y-6">
            {/* 근태 점수 Leaderboard */}
            <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <CalendarClock className="w-32 h-32" />
                </div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-200">
                        🏆 근태 우수 사원 랭킹
                    </CardTitle>
                    <CardDescription className="text-indigo-300">동료들과 성실함을 공유하며 서로 격려하세요!</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...users].sort((a, b) => (b.attendance_score || 0) - (a.attendance_score || 0)).slice(0, 4).map((u, i) => (
                            <div key={u.id} className="bg-white/10 backdrop-blur-md rounded-lg p-3 flex items-center gap-3 border border-white/5">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                                        i === 1 ? "bg-slate-300 text-slate-900" :
                                            i === 2 ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300"
                                )}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold flex justify-between">
                                        <span>{u.name}</span>
                                        <span className="text-indigo-400">{u.attendance_score || 100}점</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">{u.job_title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button
                    variant={viewMode === 'list' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                >
                    <LayoutList className="w-4 h-4 mr-2" /> 목록 보기
                </Button>
                <Button
                    variant={viewMode === 'mindmap' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('mindmap')}
                >
                    <Network className="w-4 h-4 mr-2" /> 조직도 (Mind Map)
                </Button>
            </div>

            {viewMode === 'mindmap' ? (
                // Cast User[] to Member[] assuming properties match or Member extends User
                <MemberMindMap members={users as any} />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {users.map((user) => (
                        <Card key={user.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {user.name}
                                            {/* Show Admin Badge if they have ALL permission (includes Store Managers and Manual Admins) */}
                                            {(['대표자', '경영지원', '점장'].includes(user.job_title) || user.permissions?.includes('ALL')) && (
                                                <Badge variant="secondary" className="text-xs">관리자</Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription>{user.job_title} | {user.username}</CardDescription>
                                    </div>
                                    <div className="bg-slate-100 p-2 rounded-full">
                                        <UserCog className="w-5 h-5 text-slate-500" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs font-medium text-slate-500 mb-2">접근 권한</div>
                                        <div className="flex flex-wrap gap-1">
                                            {['대표자', '경영지원', '점장'].includes(user.job_title) ? (
                                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">관리자 (직책)</Badge>
                                            ) : user.permissions?.includes('ADMIN') ? (
                                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">관리자 (권한)</Badge>
                                            ) : user.permissions?.includes('ALL') ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">전체 권한</Badge>
                                            ) : (user.permissions?.length || 0) > 0 ? (
                                                user.permissions?.map(p => {
                                                    const label = CATEGORIES.find(c => c.id === p)?.label || p;
                                                    if (p === 'ALL' || p === 'ADMIN') return null;
                                                    return <Badge key={p} variant="outline" className="text-xs">{label}</Badge>;
                                                })
                                            ) : (
                                                <span className="text-xs text-slate-400">권한 없음</span>
                                            )}
                                        </div>

                                        <div className="pt-2 mt-2 border-t border-slate-50 space-y-2">
                                            {/* Admin Permission Toggle - Visible to Admins */}
                                            {/* Only show for users who are NOT already auto-admins by job title */}
                                            {isAdmin && !['대표자', '경영지원', '점장'].includes(user.job_title) && (
                                                <div className="flex justify-between items-center bg-purple-50 p-2 rounded-lg">
                                                    <span className="text-xs font-bold text-purple-700">관리자 권한 부여</span>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={user.permissions?.includes('ADMIN') || false}
                                                            onChange={async (e) => {
                                                                if (!confirm(`${user.name}님에게 관리자 권한을 ${e.target.checked ? '부여' : '해제'}하시겠습니까?`)) return;

                                                                try {
                                                                    const res = await toggleAdminPermission(user.id, e.target.checked);
                                                                    if (res.success) {
                                                                        window.location.reload();
                                                                    } else {
                                                                        alert('실패: ' + res.error);
                                                                    }
                                                                } catch (err: any) {
                                                                    alert('오류: ' + err.message);
                                                                }
                                                            }}
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                                    </label>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-medium text-slate-500">매출/매입 열람</span>
                                                {/* Auto-approved for Admins and Store Managers */}
                                                {['대표자', '점장'].includes(user.job_title) || user.permissions?.includes('ADMIN') || user.permissions?.includes('ALL') ? (
                                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">자동 승인</Badge>
                                                ) : (
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={!!user.can_view_accounting}
                                                            onChange={async (e) => {
                                                                if (!isAdmin) {
                                                                    alert('관리자만 변경할 수 있습니다.');
                                                                    return;
                                                                }
                                                                if (!confirm(`${user.name}님의 매출 열람 권한을 ${e.target.checked ? '부여' : '해제'}하시겠습니까?`)) return;
                                                                const { toggleAccountingPermission } = await import('@/lib/accounting-actions');
                                                                const res = await toggleAccountingPermission(user.id, e.target.checked);
                                                                if (res.success) window.location.reload();
                                                                else alert('실패');
                                                            }}
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openPermissionModal(user)}>
                                            <Shield className="w-3 h-3 mr-1" /> 권한
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openAttendanceModal(user)}>
                                            <CalendarClock className="w-3 h-3 mr-1" /> 근태
                                        </Button>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => openJobTitleModal(user)}>
                                        <UserCog className="w-3 h-3 mr-1" /> 직책 변경
                                    </Button>

                                    {isAdmin && (
                                        <Button variant="outline" size="sm" className="w-full text-indigo-600 border-indigo-100 hover:bg-indigo-50" onClick={() => openLocationModal(user)}>
                                            <Network className="w-3 h-3 mr-1" /> 출근 지역 설정
                                        </Button>
                                    )}

                                    {currentUser?.id !== user.id && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-red-400 hover:text-red-600 h-6"
                                            onClick={() => handleDeleteUser(user)}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" /> 계정 삭제
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Permissions Modal */}
            <Dialog open={permissionModalOpen} onOpenChange={setPermissionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedUser?.name} 권한 설정</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* If they are auto-admin or manual admin, show notice */}
                        {(['대표자', '경영지원', '점장'].includes(selectedUser?.job_title || '') || selectedUser?.permissions?.includes('ADMIN')) ? (
                            <div className="space-y-2">
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded text-sm font-medium">
                                    이 계정은 관리자 권한(전체 권한)을 보유하고 있습니다.
                                </div>
                                {selectedUser?.permissions?.includes('ADMIN') && !['대표자', '경영지원', '점장'].includes(selectedUser?.job_title || '') && (
                                    <p className="text-xs text-slate-500">
                                        * 관리자 권한 부여 체크박스를 해제하면 일반 권한 설정이 가능합니다.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {CATEGORIES.map(cat => (
                                    <label key={cat.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                                        <input
                                            type="checkbox"
                                            checked={tempPermissions.includes(cat.id)}
                                            onChange={() => togglePermission(cat.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        />
                                        <span className="text-sm font-medium">{cat.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        {/* Hide save if auto-admin (unless we want to allow editing underlying perms, but they are ignored anyway) */}
                        {!(['대표자', '경영지원', '점장'].includes(selectedUser?.job_title || '') || selectedUser?.permissions?.includes('ADMIN')) && (
                            <Button onClick={handleSavePermissions}>저장하기</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attendance Modal */}
            <Dialog open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedUser?.name} 근태 기록</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium">조회 월:</span>
                            <input
                                type="month"
                                className="border rounded px-2 py-1 text-sm"
                                value={selectedMonth}
                                onChange={(e) => {
                                    setSelectedMonth(e.target.value);
                                    if (selectedUser) loadAttendance(selectedUser.id, e.target.value);
                                }}
                            />
                        </div>

                        <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">날짜</th>
                                        <th className="px-4 py-2 font-medium">출근 시간</th>
                                        <th className="px-4 py-2 font-medium">상태</th>
                                        <th className="px-4 py-2 font-medium">지각 사유 / 비고</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {attendanceLogs.length === 0 ? (
                                        <tr><td colSpan={4} className="p-4 text-center text-slate-500">기록이 없습니다.</td></tr>
                                    ) : (
                                        attendanceLogs.map((log: any) => (
                                            <tr key={log.id}>
                                                <td className="px-4 py-2">{log.work_date}</td>
                                                <td className="px-4 py-2 font-mono text-emerald-600">
                                                    {log.check_in ? new Date(log.check_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-xs">
                                                    {log.check_in && log.check_out ? <Badge variant="outline" className="bg-slate-100 font-normal">퇴근완료</Badge> :
                                                        log.check_in ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-normal">근무중</Badge> : '-'}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-slate-500 italic max-w-[200px] truncate" title={log.late_reason}>
                                                    {log.late_reason || (log.score_impact < 0 ? '지각' : '')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Job Title Modal */}
            <Dialog open={!!jobTitleModalUser} onOpenChange={(open) => !open && setJobTitleModalUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{jobTitleModalUser?.name} 직책 변경</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">새로운 직책</label>
                            <Select onValueChange={(val) => setNewJobTitle(val)} defaultValue={jobTitleModalUser?.job_title}>
                                <SelectTrigger>
                                    <SelectValue placeholder="직책 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="대표자">대표자</SelectItem>
                                    <SelectItem value="경영지원">경영지원</SelectItem>
                                    <SelectItem value="점장">점장</SelectItem>
                                    <SelectItem value="매니저">매니저</SelectItem>
                                    <SelectItem value="팀원">팀원</SelectItem>
                                    <SelectItem value="아르바이트">아르바이트</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateJobTitle}>변경 저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Location Setting Modal */}
            <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedUser?.name} 출근 가능 지역 설정</DialogTitle>
                        <DialogDescription>지정한 위치 반경 200m 이내에서만 출근 버튼이 활성화됩니다. (최대 2곳)</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        {locationData.map((loc, idx) => (
                            <div key={idx} className="space-y-3 p-3 border rounded-lg bg-slate-50">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">장소 {idx + 1}</span>
                                    <Input
                                        className="w-40 h-8 text-xs"
                                        placeholder="장소 이름 (예: 본사)"
                                        value={loc.name}
                                        onChange={e => {
                                            const next = [...locationData];
                                            next[idx].name = e.target.value;
                                            setLocationData(next);
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">위도 (Latitude)</Label>
                                        <Input
                                            placeholder="37.xxx"
                                            value={loc.lat}
                                            onChange={e => {
                                                const next = [...locationData];
                                                next[idx].lat = e.target.value;
                                                setLocationData(next);
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">경도 (Longitude)</Label>
                                        <Input
                                            placeholder="126.xxx"
                                            value={loc.lon}
                                            onChange={e => {
                                                const next = [...locationData];
                                                next[idx].lon = e.target.value;
                                                setLocationData(next);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLocationModalOpen(false)}>취소</Button>
                        <Button onClick={handleSaveLocations}>지역 정보 저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
