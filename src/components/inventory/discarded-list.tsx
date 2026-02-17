'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { restoreProduct, permanentlyDeleteProduct } from '@/lib/actions';
import { RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function DiscardedList() {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDiscarded = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/inventory/discarded');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error('Fetch discarded error:', error);
            toast.error('발송/폐기 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDiscarded();
    }, []);

    const handleRestore = async (id: string, name: string) => {
        const res = await restoreProduct(id);
        toast.success(`${name} 상품이 복구되었습니다.`);
        fetchDiscarded();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`'${name}' 상품을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        const res = await permanentlyDeleteProduct(id);
        toast.success(`${name} 상품이 영구 삭제되었습니다.`);
        fetchDiscarded();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>목록을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {products.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed">
                    <p className="text-slate-500">발송 또는 폐기된 항목이 없습니다.</p>
                </div>
            ) : (
                products.map((product) => (
                    <Card key={product.id} className="overflow-hidden bg-white border-slate-100 shadow-sm">
                        <CardContent className="p-3 flex items-center gap-4">
                            <div className="h-12 w-12 relative rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={product.name}
                                        fill
                                        className="object-cover grayscale"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[10px] text-slate-300">No Img</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-200 text-red-700 bg-red-50">폐기</Badge>
                                    <span className="font-bold text-xs truncate">{product.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex gap-2">
                                    <span>{product.brand}</span>
                                    <span>{product.id}</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] border-blue-100 text-blue-600 hover:bg-blue-50"
                                    onClick={() => handleRestore(product.id, product.name)}
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" /> 복구
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] border-red-100 text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(product.id, product.name)}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" /> 삭제
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
