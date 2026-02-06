import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function DiscardedInventoryPage() {
    // Fetch only discarded items
    const result = await db.query(`
        SELECT * FROM products 
        WHERE status = '폐기' 
        ORDER BY created_at DESC
    `);
    const products = result.rows;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">폐기 관리</h1>
                    <p className="text-slate-500">폐기 처리된 목록입니다. (총 {products.length}건)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {products.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed">
                        <p className="text-slate-500">폐기된 항목이 없습니다.</p>
                    </div>
                ) : (
                    products.map((product) => (
                        <Card key={product.id} className="overflow-hidden bg-slate-50 opacity-75">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-16 w-16 relative rounded-md overflow-hidden bg-slate-200 flex-shrink-0">
                                    {product.image_url ? (
                                        <Image
                                            src={product.image_url}
                                            alt={product.name}
                                            fill
                                            className="object-cover grayscale"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs text-slate-400">No Image</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">폐기</Badge>
                                        <span className="font-medium truncate">{product.name}</span>
                                    </div>
                                    <div className="text-sm text-slate-500 flex gap-3">
                                        <span>{product.brand}</span>
                                        <span className="text-slate-300">|</span>
                                        <span>{product.category}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-mono text-xs text-slate-400">{product.id}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-600">{product.price_sell?.toLocaleString()}원</div>
                                    <div className="text-xs text-slate-400 line-through">{product.price_consumer?.toLocaleString()}원</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
