'use client';

import { useActionState } from 'react';
import { saveSmartStoreConfig } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ClientComponent({
    initialSellerId,
    initialClientId,
    initialClientSecret
}: {
    initialSellerId: string,
    initialClientId: string,
    initialClientSecret: string
}) {
    const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
        const result = await saveSmartStoreConfig(formData);
        if (result.success) {
            toast.success('설정이 저장되었습니다.');
        } else {
            toast.error(result.error || '설정 저장 실패');
        }
        return result;
    }, null);

    return (
        <form action={formAction} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="sellerId">판매자 ID (Seller ID)</Label>
                <Input
                    id="sellerId"
                    name="sellerId"
                    defaultValue={initialSellerId}
                    readOnly
                    className="bg-slate-100 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">API 연동용 판매자 ID는 수정할 수 없습니다.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="clientId">애플리케이션 ID (Client ID)</Label>
                <Input
                    id="clientId"
                    name="clientId"
                    defaultValue={initialClientId}
                    placeholder="애플리케이션 ID를 입력하세요"
                    required
                    type="password"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="clientSecret">애플리케이션 시크릿 (Client Secret)</Label>
                <Input
                    id="clientSecret"
                    name="clientSecret"
                    defaultValue={initialClientSecret}
                    placeholder="애플리케이션 시크릿을 입력하세요"
                    required
                    type="password"
                />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '저장 중...' : '설정 저장하기'}
            </Button>
        </form>
    );
}
