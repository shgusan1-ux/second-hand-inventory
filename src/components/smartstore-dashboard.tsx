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
        <div className="space-y-3 md:space-y-4">
            {items.length === 0 ? (
                <div className="text-center py-8 md:py-10 text-slate-500 text-sm md:text-base">해당 조건의 상품이 없습니다.</div>
            ) : (
                <>
                    {/* 상품코드 일괄 복사 버튼 */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 md:p-4 rounded-lg border">
                        <div>
                            <p className="font-semibold text-sm md:text-base text-slate-900">총 {items.length}개 상품</p>
                            <p className="text-xs md:text-sm text-slate-500">스마트스토어에 대량 등록 가능</p>
                        </div>
                        <Button
                            onClick={handleCopy}
                            className={`w-full sm:w-auto ${copied ? 'bg-green-600' : 'bg-indigo-600'} hover:bg-indigo-700 text-sm md:text-base`}
                            size="sm"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                                    복사 완료!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                                    상품코드 일괄 복사
                                </>
                            )}
                        </Button>
                    </div>

                    {/* 테이블 - 모바일에서 가로 스크롤 */}
                    <div className="relative w-full overflow-x-auto border rounded-md">
                        <table className="w-full caption-bottom text-xs md:text-sm text-left">
                            <thead className="[&_tr]:border-b bg-slate-50 sticky top-0 z-10">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground whitespace-nowrap">상품코드</th>
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground w-[50px] md:w-[60px]">이미지</th>
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground whitespace-nowrap">브랜드</th>
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground min-w-[200px]">상품명</th>
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground whitespace-nowrap">마스터등록일</th>
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground whitespace-nowrap">경과</th>
                                    <th className="h-8 md:h-10 px-2 md:px-4 align-middle font-medium text-muted-foreground text-right whitespace-nowrap w-[100px] md:w-[150px]">판매가</th>
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
                                            <td className="p-2 md:p-3 align-middle font-black text-slate-900 font-mono text-xs md:text-base whitespace-nowrap">{item.id}</td>
                                            <td className="p-2 md:p-3 align-middle">
                                                <div className="relative h-8 w-8 md:h-10 md:w-10 rounded overflow-hidden bg-slate-100 border">
                                                    {item.image_url ? (
                                                        <img src={item.image_url.split(',')[0]} alt={item.name} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-[8px] md:text-[10px] text-slate-300">img</div>
                                                    )}
                                                    <Badge className={`absolute top-0 right-0 p-[2px] text-[6px] md:text-[8px] h-2 md:h-3 ${color} pointer-events-none`}>{tag}</Badge>
                                                </div>
                                            </td>
                                            <td className="p-2 md:p-3 align-middle font-medium text-xs md:text-sm whitespace-nowrap">{item.brand}</td>
                                            <td className="p-2 md:p-3 align-middle text-slate-600 text-xs md:text-sm">{item.name}</td>
                                            <td className="p-2 md:p-3 align-middle text-[10px] md:text-xs text-slate-500 whitespace-nowrap">
                                                {masterDate ? masterDate.toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-2 md:p-3 align-middle text-[10px] md:text-xs font-bold text-slate-700 whitespace-nowrap">
                                                {typeof elapsedDays === 'number' ? `${elapsedDays}일` : '-'}
                                            </td>
                                            <td className="p-2 md:p-3 align-middle text-right whitespace-nowrap">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-xs md:text-sm text-slate-900">₩{discountedPrice.toLocaleString()}</span>
                                                    {discount > 0 && (
                                                        <span className="text-[10px] md:text-xs text-slate-400 line-through">₩{originalPrice.toLocaleString()}</span>
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
    const totalCount = groups.newItems.length + groups.curatedItems.length +
        groups.militaryArchive.length + groups.workwearArchive.length +
        groups.japanArchive.length + groups.heritageEurope.length +
        groups.britishArchive.length + groups.clearanceItems.length +
        (groups.etcItems?.length || 0);

    return (
        <Tabs defaultValue="new" className="space-y-4 md:space-y-6">
            {/* 헤더 */}
            <div className="flex flex-col gap-3 md:gap-4">
                <div>
                    <h2 className="text-lg md:text-xl font-bold mb-1 md:mb-2 flex items-center gap-2">
                        전략 카테고리 관리
                        <Badge variant="outline" className="text-base font-normal">총 {totalCount}개 관리 중</Badge>
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500">
                        각 전략에 따라 자동 분류 및 할인가가 적용됩니다. 모든 판매중 상품이 포함됩니다.
                    </p>
                </div>

                {/* 탭 리스트 - 반응형 */}
                <div className="w-full overflow-x-auto pb-2">
                    <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-5 lg:grid-cols-9 gap-1 h-auto">
                        <TabsTrigger value="new" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            NEW <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.newItems.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="curated" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            CURATED <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.curatedItems.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="military" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            MILITARY <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.militaryArchive.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="workwear" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            WORKWEAR <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.workwearArchive.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="japan" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            JAPAN <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.japanArchive.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="europe" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            EUROPE <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.heritageEurope.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="british" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            BRITISH <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.britishArchive.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="clearance" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            CLEARANCE <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.clearanceItems.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="etc" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 py-2">
                            ETC <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 text-[10px] md:text-xs">{groups.etcItems?.length || 0}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>
            </div>

            <TabsContent value="new" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                            NEW ARRIVALS (신규 7일) - 할인 없음
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            신선도가 생명인 신규 상품군입니다. 정가 판매를 원칙으로 합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.newItems} tag="NEW" color="bg-emerald-600" discount={0} categoryName="NEW" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="curated" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Star className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                            CURATED (S급/고가) - 20% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            상태가 우수한 프리미엄 상품입니다. 소폭 할인으로 구매 전환을 유도합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.curatedItems} tag="PICK" color="bg-indigo-600" discount={20} categoryName="CURATED" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="military" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Shield className="w-4 h-4 md:w-5 md:h-5 text-green-700" />
                            MILITARY ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            밀리터리 빈티지 및 밀스펙 아카이브 (M65, MA-1, BDU, 카고팬츠 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.militaryArchive} tag="MILITARY" color="bg-green-700" discount={40} categoryName="MILITARY" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="workwear" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Mountain className="w-4 h-4 md:w-5 md:h-5 text-amber-700" />
                            WORKWEAR ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            워크웨어 빈티지 (Carhartt, Dickies, 데님, 작업복 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.workwearArchive} tag="WORK" color="bg-amber-700" discount={40} categoryName="WORKWEAR" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="japan" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Plane className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                            JAPAN ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            일본 브랜드 아카이브 (Visvim, Kapital, Neighborhood, WTAPS 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.japanArchive} tag="JAPAN" color="bg-red-600" discount={40} categoryName="JAPAN" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="europe" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Crown className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                            HERITAGE EUROPE - 40% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            유럽 헤리티지 브랜드 (Barbour, Burberry, Aquascutum 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.heritageEurope} tag="EUROPE" color="bg-purple-600" discount={40} categoryName="EUROPE" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="british" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Flag className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
                            BRITISH ARCHIVE - 40% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            영국 클래식 아카이브 (Fred Perry, Ben Sherman, Baracuta 등)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.britishArchive} tag="BRITISH" color="bg-blue-700" discount={40} categoryName="BRITISH" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="clearance" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Tag className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                            CLEARANCE (30일 이상, 다른 카테고리 제외) - 70% 할인
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            장기 재고 소진을 위한 파격 할인 구간입니다. 다른 카테고리에 속하지 않은 상품만 포함됩니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.clearanceItems} tag="SALE" color="bg-red-600" discount={70} categoryName="CLEARANCE" />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="etc" className="mt-0">
                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Archive className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                            ETC (기타 분류) - 전략 미적용
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            특별한 전략 카테고리에 속하지 않는 일반 판매 상품들입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                        <ProductList items={groups.etcItems || []} tag="NORMAL" color="bg-slate-600" discount={0} categoryName="ETC" />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
