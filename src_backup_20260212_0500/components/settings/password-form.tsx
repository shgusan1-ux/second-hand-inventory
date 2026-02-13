'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/lib/actions';
import { Lock } from 'lucide-react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialState = {
    success: false,
    error: '',
    message: ''
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-slate-900 text-white hover:bg-slate-800">
            {pending ? '변경 중...' : '비밀번호 변경'}
        </Button>
    );
}

export function PasswordChangeForm() {
    const [state, formAction] = useActionState(changePassword, initialState);
    const [formKey, setFormKey] = useState(0); // Reset form on success



    return (
        <Card className="border-slate-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Lock className="h-5 w-5 text-indigo-600" />
                    비밀번호 변경
                </CardTitle>
                <CardDescription>
                    계정 보안을 위해 주기적으로 비밀번호를 변경해주세요.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} key={formKey} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">현재 비밀번호</Label>
                        <Input id="currentPassword" name="currentPassword" type="password" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">새 비밀번호</Label>
                        <Input id="newPassword" name="newPassword" type="password" required minLength={4} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={4} />
                    </div>

                    {state?.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>오류</AlertTitle>
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    {state?.success && (
                        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <AlertTitle>성공</AlertTitle>
                            <AlertDescription>비밀번호가 성공적으로 변경되었습니다.</AlertDescription>
                        </Alert>
                    )}

                    <div className="pt-2">
                        <SubmitButton />
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
