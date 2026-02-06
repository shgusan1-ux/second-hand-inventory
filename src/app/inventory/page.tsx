import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { DiscardButton } from '@/components/inventory/discard-button';
import { SmartStoreButton } from '@/components/inventory/smartstore-button';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams.q || '';
    const categoryFilter = resolvedParams.category || '';
    const statusFilter = resolvedParams.status || ''; // '판매중', '판매완료', etc.

    // Base Condition: Exclude discarded items
    let sqlConditions = [`status != '폐기'`];
    const params: any[] = [];
    let paramIndex = 1;

    if (query) {
        sqlConditions.push(`(name LIKE $${paramIndex} OR id LIKE $${paramIndex})`);
        params.push(`%${query}%`);
        paramIndex++;
    }

    if (categoryFilter) {
        sqlConditions.push(`category = $${paramIndex}`);
        params.push(categoryFilter);
        paramIndex++;
    }

    if (statusFilter) {
        sqlConditions.push(`status = $${paramIndex}`);
        params.push(statusFilter);
        paramIndex++;
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';
    const sqlQuery = `SELECT * FROM products ${whereClause} ORDER BY created_at DESC`;

    const result = await db.query(sqlQuery, params);
    const products = result.rows;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">재고 목록</h1>
                {/* Registration buttons moved to /inventory/new */}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <form>
                                <Input
                                    name="q"
                                    placeholder="상품명 또는 상품코드로 검색..."
                                    className="pl-9"
                                    defaultValue={query}
                                />
                                {/* Preserve other filters if needed, or handle via JS. For now basic reload. */}
                            </form>
                        </div>
                        {/* Filter buttons could go here */}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[80px]">이미지</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">자체상품코드</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">상품명</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">브랜드</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">사이즈</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">카테고리</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">판매가</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">상태</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">삭제/관리</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {products.length === 0 ? (
                                    <tr><td colSpan={9} className="p-4 text-center text-slate-500">검색 결과가 없습니다.</td></tr>
                                ) : (
                                    products.map((product) => (
                                        <tr key={product.id} className="border-b transition-colors hover:bg-slate-50">
                                            <td className="p-4 align-middle font-mono text-xs"></td> {/* Placeholder for image */}
                                            <td className="p-4 align-middle">
                                                <Link href={`/inventory/${product.id}`} className="hover:underline font-mono text-emerald-700">
                                                    {product.id}
                                                </Link>
                                            </td>
                                            <td className="p-4 align-middle font-medium">{product.name}</td>
                                            <td className="p-4 align-middle text-slate-500">{product.brand}</td>
                                            <td className="p-4 align-middle text-slate-500">{product.size}</td>
                                            <td className="p-4 align-middle text-slate-500 hidden md:table-cell">{product.category}</td>
                                            <td className="p-4 align-middle">₩{product.price_sell.toLocaleString()}</td>
                                            <td className="p-4 align-middle text-center">
                                                <span className={
                                                    product.status === '판매중' ? 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold' :
                                                        product.status === '판매완료' ? 'bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-semibold' :
                                                            'bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold'
                                                }>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex justify-end gap-2">
                                                    <SmartStoreButton product={product} />
                                                    <DiscardButton id={product.id} name={product.name} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
