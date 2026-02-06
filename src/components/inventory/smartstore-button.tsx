'use client';

import { Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateSmartStoreHeader } from '@/lib/smartstore-generator';

export function SmartStoreButton({ product }: { product: any }) {
    const handleCopy = async () => {
        const html = generateSmartStoreHeader(product);
        try {
            await navigator.clipboard.writeText(html);
            alert('스마트스토어용 HTML이 클립보드에 복사되었습니다!');
        } catch (err) {
            console.error('Failed to copy pixel:', err);
            alert('복사 실패');
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            onClick={handleCopy}
            title="스마트스토어 HTML 복사"
        >
            <Code className="h-4 w-4" />
        </Button>
    );
}
