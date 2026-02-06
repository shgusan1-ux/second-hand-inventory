'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteProduct } from '@/lib/actions';

export function DiscardButton({ id, name }: { id: string, name: string }) {
    const handleDiscard = async () => {
        if (confirm(`'${name}' 상품을 정말 폐기하시겠습니까?\n폐기된 상품은 [폐기 관리] 메뉴로 이동됩니다.`)) {
            await deleteProduct(id);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleDiscard}
            title="폐기"
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    );
}
