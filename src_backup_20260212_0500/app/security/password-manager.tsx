'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Pencil, Plus, Eye, EyeOff, Copy, Key } from 'lucide-react';
import { addPassword, updatePassword, deletePassword } from '@/lib/security-actions';
import { toast } from 'sonner';

export function PasswordManager({ initialPasswords }: { initialPasswords: any[] }) {
    const [passwords] = useState(initialPasswords);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [visibleId, setVisibleId] = useState<number | null>(null);

    // Refs
    const addFormRef = useRef<HTMLFormElement>(null);
    const editFormRef = useRef<HTMLFormElement>(null);

    const toggleVisibility = (id: number) => {
        if (visibleId === id) setVisibleId(null);
        else {
            setVisibleId(id);
            toast.info('비밀번호가 표시되었습니다. 보안에 유의하세요.');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('클립보드에 복사되었습니다.');
    };

    const handleAdd = async () => {
        if (!addFormRef.current?.reportValidity()) return;

        setIsLoading(true);
        const formData = new FormData(addFormRef.current);
        const data = {
            site: formData.get('site_name'),
            url: formData.get('site_url'),
            id_val: formData.get('account_id'),
            pw: formData.get('account_password'),
            desc: formData.get('description')
        };

        try {
            const res = await addPassword(data);
            if (res.success) {
                toast.success('공용 계정이 등록되었습니다.');
                setIsAddOpen(false);
                window.location.reload();
            } else {
                toast.error('등록 실패: ' + res.error);
            }
        } catch (e) {
            toast.error('오류 발생');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!editFormRef.current?.reportValidity()) return;
        if (!editingItem) return;

        setIsLoading(true);
        const formData = new FormData(editFormRef.current);
        const data = {
            site: formData.get('site_name'),
            url: formData.get('site_url'),
            id_val: formData.get('account_id'),
            pw: formData.get('account_password'),
            desc: formData.get('description')
        };

        try {
            const res = await updatePassword(editingItem.id, data);
            if (res.success) {
                toast.success('수정되었습니다.');
                setIsEditOpen(false);
                setEditingItem(null);
                window.location.reload();
            } else {
                toast.error('수정 실패');
            }
        } catch (e) {
            toast.error('오류 발생');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deletePassword(id);
            toast.success('삭제되었습니다.');
            window.location.reload();
        } catch (e) {
            toast.error('삭제 실패');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="text-sm text-slate-600">
                    회사 공용 사이트(도매사이트, 택배사 등) 계정 정보를 관리합니다.
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="flex gap-2">
                    <Plus className="h-4 w-4" /> 새 계정 등록
                </Button>
            </div>

            <div className="grid gap-4">
                {passwords.map((item) => (
                    <Card key={item.id} className="hover:border-slate-400 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-3 bg-slate-100 rounded-lg">
                                    <Key className="w-6 h-6 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{item.site_name}</h3>
                                    <a href={item.site_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{item.site_url}</a>
                                    {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
                                </div>
                            </div>

                            <div className="flex items-center gap-8 mr-8">
                                <div className="text-right">
                                    <div className="text-xs text-slate-400">아이디</div>
                                    <div className="font-mono font-medium">{item.account_id}</div>
                                </div>
                                <div className="text-right min-w-[150px]">
                                    <div className="text-xs text-slate-400">비밀번호</div>
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="font-mono bg-slate-100 px-2 py-1 rounded text-sm min-w-[100px] text-center">
                                            {visibleId === item.id ? item.account_password : '••••••••••••'}
                                        </div>
                                        <button onClick={() => toggleVisibility(item.id)} className="text-slate-400 hover:text-slate-900">
                                            {visibleId === item.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => copyToClipboard(item.account_password)} className="text-slate-400 hover:text-emerald-600" title="복사">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4 border-l pl-4">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        setEditingItem(item);
                                        setIsEditOpen(true);
                                    }} className="h-10 w-10 text-blue-600 hover:bg-blue-100 rounded-full">
                                        <Pencil className="w-5 h-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-10 w-10 text-red-500 hover:bg-red-100 rounded-full">
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>새 공용 계정 등록</DialogTitle>
                    </DialogHeader>
                    <form ref={addFormRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-2">
                        <div className="grid gap-2">
                            <Label>사이트 이름</Label>
                            <Input name="site_name" required placeholder="예: 네이버 스마트스토어" />
                        </div>
                        <div className="grid gap-2">
                            <Label>사이트 URL</Label>
                            <Input name="site_url" placeholder="https://..." />
                        </div>
                        <div className="grid gap-2">
                            <Label>아이디</Label>
                            <Input name="account_id" required />
                        </div>
                        <div className="grid gap-2">
                            <Label>비밀번호</Label>
                            <Input name="account_password" required type="text" placeholder="입력시 표시됩니다" />
                        </div>
                        <div className="grid gap-2">
                            <Label>비고 / 설명</Label>
                            <Textarea name="description" placeholder="용도, 주의사항 등" />
                        </div>
                        <DialogFooter>
                            <Button type="button" onClick={handleAdd} disabled={isLoading}>
                                {isLoading ? '등록 중...' : '등록하기'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(o) => {
                setIsEditOpen(o);
                if (!o) setEditingItem(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>계정 정보 수정</DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <form ref={editFormRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-2">
                            <div className="grid gap-2">
                                <Label>사이트 이름</Label>
                                <Input name="site_name" required defaultValue={editingItem.site_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label>사이트 URL</Label>
                                <Input name="site_url" defaultValue={editingItem.site_url} />
                            </div>
                            <div className="grid gap-2">
                                <Label>아이디</Label>
                                <Input name="account_id" required defaultValue={editingItem.account_id} />
                            </div>
                            <div className="grid gap-2">
                                <Label>비밀번호</Label>
                                <Input name="account_password" required type="text" defaultValue={editingItem.account_password} />
                            </div>
                            <div className="grid gap-2">
                                <Label>비고 / 설명</Label>
                                <Textarea name="description" defaultValue={editingItem.description} />
                            </div>
                            <DialogFooter>
                                <Button type="button" onClick={handleUpdate} disabled={isLoading}>
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
