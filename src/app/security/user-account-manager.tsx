'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Pencil, Plus } from 'lucide-react';
import { createUser, updateUser, deleteUser } from '@/lib/actions';
import { toast } from 'sonner';

export function UserAccountManager({ initialUsers, currentUserId }: { initialUsers: any[], currentUserId: string }) {
    const [users, setUsers] = useState(initialUsers);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Refs for manual form submission handling
    const createFormRef = useRef<HTMLFormElement>(null);
    const updateFormRef = useRef<HTMLFormElement>(null);

    // Job Titles
    const JOB_TITLES = ['대표자', '총매니저', '경영지원', '실장', '과장', '주임', '사원', '아르바이트'];

    const handleCreate = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const res = await createUser(null, formData);
            if (res.success) {
                toast.success(res.message);
                setIsAddOpen(false);
                window.location.reload();
            } else {
                toast.error(res.error);
                alert(res.error); // Fallback alert
            }
        } catch (e: any) {
            toast.error('등록 중 오류 발생');
            alert('오류 발생: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateClick = () => {
        if (createFormRef.current) {
            if (createFormRef.current.reportValidity()) {
                const formData = new FormData(createFormRef.current);
                handleCreate(formData);
            }
        } else {
            console.error("Form ref is null");
            alert("시스템 오류: 등록 양식을 찾을 수 없습니다.");
        }
    };

    const handleUpdate = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const res = await updateUser(null, formData);
            if (res.success) {
                toast.success(res.message);
                setIsEditOpen(false);
                setEditingUser(null);
                window.location.reload();
            } else {
                toast.error(res.error);
                alert(res.error);
            }
        } catch (e: any) {
            toast.error('수정 중 오류 발생');
            alert('오류 발생: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateClick = () => {
        if (updateFormRef.current) {
            if (updateFormRef.current.reportValidity()) {
                const formData = new FormData(updateFormRef.current);
                handleUpdate(formData);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.')) return;
        try {
            await deleteUser(id);
            toast.success('삭제되었습니다.');
            window.location.reload();
        } catch (e) {
            toast.error('삭제 실패');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button className="flex gap-2" onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4" /> 새 계정 등록
                </Button>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>새 사용자 등록</DialogTitle>
                        </DialogHeader>
                        <form ref={createFormRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">이름</Label>
                                <Input id="name" name="name" required placeholder="이름 입력" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="username">아이디 (연락처/사번)</Label>
                                <Input id="username" name="username" required placeholder="예: 01012345678" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <Input id="password" name="password" required type="password" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="jobTitle">직책</Label>
                                <Select name="jobTitle" required defaultValue="사원">
                                    <SelectTrigger>
                                        <SelectValue placeholder="직책 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JOB_TITLES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">이메일 (2차 인증용)</Label>
                                <Input id="email" name="email" type="email" placeholder="user@company.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="securityMemo">보안 메모 / 특이사항</Label>
                                <Textarea
                                    id="securityMemo"
                                    name="securityMemo"
                                    placeholder="2차 인증 정보, 비밀번호 갱신일, 특이사항 등을 기록하세요."
                                    className="h-24"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" onClick={handleCreateClick} disabled={isLoading}>
                                    {isLoading ? '등록 중...' : '등록하기'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="text-slate-500 bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium">이름</th>
                            <th className="px-4 py-3 font-medium">아이디</th>
                            <th className="px-4 py-3 font-medium">직책</th>
                            <th className="px-4 py-3 font-medium">이메일 / 보안 메모</th>
                            <th className="px-4 py-3 font-medium text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map((user: any) => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                <td className="px-4 py-3 text-slate-500">{user.username}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className={
                                        user.job_title === '대표자' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.job_title === '경영지원' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                    }>
                                        {user.job_title}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="space-y-1">
                                        <div className="text-xs text-slate-500">{user.email || '-'}</div>
                                        {user.security_memo && (
                                            <div className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded inline-block max-w-[200px] truncate" title={user.security_memo}>
                                                Memo: {user.security_memo}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingUser(user);
                                                setIsEditOpen(true);
                                            }}
                                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        {currentUserId !== user.id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(user.id)}
                                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if (!open) setEditingUser(null);
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>사용자 정보 수정</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <form ref={updateFormRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-4">
                            <input type="hidden" name="id" value={editingUser.id} />

                            <div className="grid gap-2">
                                <Label htmlFor="name_edit">이름</Label>
                                <Input id="name_edit" name="name" required defaultValue={editingUser.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label>아이디</Label>
                                <Input value={editingUser.username} disabled className="bg-slate-100" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="newPassword">새 비밀번호 (변경시에만 입력)</Label>
                                <Input id="newPassword" name="newPassword" type="password" placeholder="변경하려면 입력하세요" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="jobTitle_edit">직책</Label>
                                <Select name="jobTitle" required defaultValue={editingUser.job_title}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JOB_TITLES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email_edit">이메일 (2차 인증용)</Label>
                                <Input id="email_edit" name="email" type="email" defaultValue={editingUser.email || ''} placeholder="user@company.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="securityMemo_edit">보안 메모 / 특이사항</Label>
                                <Textarea
                                    id="securityMemo_edit"
                                    name="securityMemo"
                                    defaultValue={editingUser.security_memo || ''}
                                    placeholder="2차 인증 정보, 비밀번호 갱신일, 특이사항 등을 기록하세요."
                                    className="h-24"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" onClick={handleUpdateClick} disabled={isLoading}>
                                    {isLoading ? '저장 중...' : '저장하기'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
