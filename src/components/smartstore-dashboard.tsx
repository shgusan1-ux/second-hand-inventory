'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Star, Archive, Tag, Copy, Check, Shield, Plane, Mountain, Crown, Flag } from "lucide-react";
import { toast } from 'sonner';

// 상품코드 복사 함수
function copyProductCodes(items: any[]) {
    const codes = items.map(item => item.id).join('\n');
    navigator.clipboard.writeText(codes);
    toast.success(`${items.length}개 상품코드 복사 완료!`);
}

// Helper Component
function ProductList({ items, tag, color, discount, categoryName }: { items: any[], tag: string, color: string, discount: number, categoryName: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        copyProductCodes(items);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            {items.length === 0 ? (
                <div className="text-center py-10 text-slate-500">해당 조건의 상품이 없습니다.</div>
            ) : (
                <>
                    {/* 상품코드 일괄 복사 버튼 */}
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                        <div>
                            <p className="font-semibold text-slate-900">총 {items.length}개 상품</p>
                            <p className="text-sm text-slate-500">스마트스토어에 대량 등록 가능</p>
                        </div>
                        <Button
                            onClick={handleCopy}
                            className={`${copied ? 'bg-green-600' : 'bg-indigo-600'} hover:bg-indigo-700`}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    복사 완료!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    상품코드 일괄 복사
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="relative w-full overflow-auto border rounded-md">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b bg-slate-50 sticky top-0 z-10">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground">상품코드</th>
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[60px]">이미지</th>
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground">브랜드</th>
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground">상품명</th>
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground">마스터등록일</th>
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground">경과</th>
                                    <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right w-[150px]">판매가</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0 divide-y">
                                {items.map((item: any) => {
                                    const originalPrice = item.price_sell;
                                    const discountedPrice = discount > 0
                                        ? Math.round(originalPrice * (1 - discount / 100) / 100) * 100
                                        : originalPrice;

                                    const masterDate = item.master_reg_date ? new Date(item.master_reg_date) : null;
                                    const elapsedDays = item.days_since_registration || '-';

                                    return (
                                        <tr key={item.id} className="transition-colors hover:bg-slate-50">
                                            <td className="p-3 align-middle font-black text-slate-900 font-mono text-base">{item.id}</td>
                                            <td className="p-3 align-middle">
                                                <div className="relative h-10 w-10 rounded overflow-hidden bg-slate-100 border">
                                                    {item.image_url ? (
                                                        <img src={item.image_url.split(',')[0]} alt={item.name} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-[10px] text-slate-300">img</div>
                                                    )}
                                                    <Badge className={`absolute top-0 right-0 p-[2px] text-[8px] h-3 ${color} pointer-events-none`}>{tag}</Badge>
                                                </div>
                                            </td>
                                            <td className="p-3 align-middle font-medium">{item.brand}</td>
                                            <td className="p-3 align-middle text-slate-600 truncate max-w-[300px]">{item.name}</td>
                                            <td className="p-3 align-middle text-xs text-slate-500">
                                                {masterDate ? masterDate.toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 align-middle text-xs font-bold text-slate-700">
                                                {typeof elapsedDays === 'number' ? `${elapsedDays}일` : '-'}
                                            </td>
                                            <td className="p-3 align-middle text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-slate-900">₩{discountedPrice.toLocaleString()}</span>
                                                    {discount > 0 && (
                                                        <span className="text-xs text-slate-400 line-through">₩{originalPrice.toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export function SmartStoreDashboard({ groups }: { groups: any }) {
    return (
        <Tabs defaultValue="new" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-xl font-bold mb-2">전략 카테고리 관리</h2>
                    <p className="text-sm text-slate-500">
                        각 전략에 따라 자동 분류 및 할인가가 적용됩니다. 상품코드를 복사하여 스마트스토어에 대량 등록하세요.
                    </p>
                </div>
                <TabsList className="grid grid-cols-3 lg:grid-cols-7 gap-1">
                    <TabsTrigger value="new">NEW <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.newItems.length}</Badge></TabsTrigger>
                    <TabsTrigger value="curated">CURATED <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.curatedItems.length}</Badge></TabsTrigger>
                    <TabsTrigger value="military">MILITARY <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.militaryArchive.length}</Badge></TabsTrigger>
                    <TabsTrigger value="workwear">WORKWEAR <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.workwearArchive.length}</Badge></TabsTrigger>
                    <TabsTrigger value="japan">JAPAN <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.japanArchive.length}</Badge></TabsTrigger>
                    <TabsTrigger value="europe">EUROPE <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.heritageEurope.length}</Badge></TabsTrigger>
                    <TabsTrigger value="british">BRITISH <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.britishArchive.length}</Badge></TabsTrigger>
                    <TabsTrigger value="clearance" className="col-span-3 lg:col-span-1">CLEARANCE <Badge variant="secondary" className="ml-1 h-5 px-1">{groups.clearanceItems.length}</Badge></TabsTrigger>
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
                        <ProductList items={groups.newItems} tag="NEW" color="bg-emerald-600" discount={0} categoryName="NEW" />
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
                        <ProductList items={groups.curatedItems} tag="PICK" color="bg-indigo-600" discount={20} categoryName="CURATED" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="military">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-green-700" />
                            MILITARY ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription>
                            밀리터리 빈티지 및 밀스펙 아카이브 (M65, MA-1, BDU, 카고팬츠 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.militaryArchive} tag="MILITARY" color="bg-green-700" discount={40} categoryName="MILITARY" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="workwear">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mountain className="w-5 h-5 text-amber-700" />
                            WORKWEAR ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription>
                            워크웨어 빈티지 (Carhartt, Dickies, 데님, 작업복 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.workwearArchive} tag="WORK" color="bg-amber-700" discount={40} categoryName="WORKWEAR" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="japan">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plane className="w-5 h-5 text-red-600" />
                            JAPAN ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription>
                            일본 브랜드 아카이브 (Visvim, Kapital, Neighborhood, WTAPS 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.japanArchive} tag="JAPAN" color="bg-red-600" discount={40} categoryName="JAPAN" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="europe">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-purple-600" />
                            HERITAGE EUROPE - 40% 할인
                        </CardTitle>
                        <CardDescription>
                            유럽 헤리티지 브랜드 (Barbour, Burberry, Aquascutum 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.heritageEurope} tag="EUROPE" color="bg-purple-600" discount={40} categoryName="EUROPE" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="british">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flag className="w-5 h-5 text-blue-700" />
                            BRITISH ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription>
                            영국 클래식 아카이브 (Fred Perry, Ben Sherman, Baracuta 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.britishArchive} tag="BRITISH" color="bg-blue-700" discount={40} categoryName="BRITISH" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="clearance">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 w-5 text-red-600" />
                            CLEARANCE (30일 이상, 다른 카테고리 제외) - 70% 할인
                        </CardTitle>
                        <CardDescription>
                            장기 재고 소진을 위한 파격 할인 구간입니다. 다른 카테고리에 속하지 않은 상품만 포함됩니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProductList items={groups.clearanceItems} tag="SALE" color="bg-red-600" discount={70} categoryName="CLEARANCE" />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
