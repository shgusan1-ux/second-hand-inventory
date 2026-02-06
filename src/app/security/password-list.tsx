'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Copy, Key } from "lucide-react";
import { toast } from "sonner";

export function PasswordList({ initialPasswords }: { initialPasswords: any[] }) {
    const [visibleId, setVisibleId] = useState<number | null>(null);

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

    if (initialPasswords.length === 0) {
        return <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">등록된 계정이 없습니다.</div>;
    }

    return (
        <div className="grid gap-4">
            {initialPasswords.map((item) => (
                <Card key={item.id} className="hover:border-slate-400 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="p-3 bg-slate-100 rounded-lg">
                                <Key className="w-6 h-6 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{item.site_name}</h3>
                                <a href={item.site_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{item.site_url}</a>
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
                            <div className="text-right text-xs text-slate-400 hidden md:block">
                                <div>수정: {item.updated_by}</div>
                                <div>{new Date(item.updated_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
