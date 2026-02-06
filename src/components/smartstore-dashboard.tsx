'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Star, Archive, Tag, ArrowRight } from "lucide-react";

export function SmartStoreDashboard({ groups }: { groups: any }) {

    const ProductList = ({ items, tag, color, discount }: { items: any[], tag: string, color: string, discount: number }) => (
        <div className="space-y-4">
            {items.length === 0 ? (
                <div className="text-center py-10 text-slate-500">해당 조건의 상품이 없습니다.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {items.map((item: any) => {
                        const originalPrice = item.price_sell;
                        const discountedPrice = discount > 0
                            ? Math.round(originalPrice * (1 - discount / 100) / 100) * 100
                            : originalPrice;

                        return (
                            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow relative">
                                <div className="aspect-square bg-slate-100 relative group">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-300">No Img</div>
                                    )}
                                    <Badge className={`absolute top-2 left-2 ${color}`}>{tag}</Badge>
                                    {discount > 0 && (
                                        <Badge className="absolute top-2 right-2 bg-red-600 animate-pulse">
                                            {discount}% OFF
                                        </Badge>
                                    )}
                                </div>
                                <div className="p-3">
                                    <div className="font-bold text-sm truncate">{item.brand}</div>
                                    <div className="text-xs text-slate-600 truncate mb-2">{item.name}</div>

                                    <div className="flex items-end gap-2">
                                        <div className="font-bold text-lg text-slate-900">
                                            ₩{discountedPrice.toLocaleString()}
                                        </div>
                                        {discount > 0 && (
                                            <div className="text-xs text-slate-400 line-through mb-1">
                                                ₩{originalPrice.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <Tabs defaultValue="new" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-xl font-bold mb-2">전략 카테고리 관리</h2>
                    <p className="text-sm text-slate-500">
                        4가지 전략에 따라 자동 분류 및 할인가가 적용됩니다.
                    </p>
                </div>
                <TabsList>
                    <TabsTrigger value="new">NEW (신규)</TabsTrigger>
                    <TabsTrigger value="curated">CURATED (추천)</TabsTrigger>
                    <TabsTrigger value="archive">ARCHIVE (빈티지)</TabsTrigger>
                    <TabsTrigger value="clearance">CLEARANCE (재고)</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="new">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-600" />
                            NEW ARRIVALS (신규 7일) - 할인 없음
                        </CardTitle>
                        <CardDescription>
                            신선도가 생명인 신규 상품군입니다. 정가 판매를 원칙으로 합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.newItems} tag="NEW" color="bg-emerald-600" discount={0} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="curated">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-indigo-600" />
                            CURATED (S급/고가) - 20% 할인
                        </CardTitle>
                        <CardDescription>
                            상태가 우수한 프리미엄 상품입니다. 소폭 할인으로 구매 전환을 유도합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.curatedItems} tag="PICK" color="bg-indigo-600" discount={20} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="archive">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Archive className="w-5 h-5 text-amber-700" />
                            ARCHIVE (빈티지/희귀) - 40% 할인
                        </CardTitle>
                        <CardDescription>
                            매니아층을 위한 전략적 할인 구간입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.archiveItems} tag="VINTAGE" color="bg-amber-700" discount={40} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="clearance">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-red-600" />
                            CLEARANCE (30일 이상) - 70% 할인
                        </CardTitle>
                        <CardDescription>
                            장기 재고 소진을 위한 파격 할인 구간입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.clearanceItems} tag="SALE" color="bg-red-600" discount={70} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
