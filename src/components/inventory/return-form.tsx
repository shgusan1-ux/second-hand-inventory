'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, PackageCheck, AlertCircle } from 'lucide-react';

export function ReturnForm() {
    const [productId, setProductId] = useState('');
    const [reason, setReason] = useState('단순변심');
    const [shippingType, setShippingType] = useState('prepaid');
    const [checklist, setChecklist] = useState({
        itemCondition: false,
        packaging: false,
        components: false,
    });

    // This would ideally submit to an action
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('반품 접수 완료 (데모)');
    };

    const handleRestock = () => {
        if (!confirm('반품 상품을 재입고 처리하시겠습니까? (상태가 A급으로 초기화됩니다)')) return;
        alert('재입고 처리 완료 (데모)');
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-indigo-600" />
                    반품 접수 및 관리
                </CardTitle>
                <CardDescription>
                    반품된 상품의 상태를 확인하고 후속 조치를 기록합니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="productId">자체상품코드 (ID)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="productId"
                                placeholder="예: A1234567"
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                            />
                            <Button type="button" variant="outline">조회</Button>
                        </div>
                    </div>

                    <div className="space-y-4 border p-4 rounded-md bg-slate-50">
                        <Label className="text-base font-semibold">검수 체크리스트</Label>
                        <div className="grid gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="itemCondition"
                                    checked={checklist.itemCondition}
                                    onCheckedChange={(c) => setChecklist({ ...checklist, itemCondition: c as boolean })}
                                />
                                <Label htmlFor="itemCondition" className="font-normal cursor-pointer">상품 상태가 출고 시와 동일합니까?</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="packaging"
                                    checked={checklist.packaging}
                                    onCheckedChange={(c) => setChecklist({ ...checklist, packaging: c as boolean })}
                                />
                                <Label htmlFor="packaging" className="font-normal cursor-pointer">포장 상태가 양호합니까?</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="components"
                                    checked={checklist.components}
                                    onCheckedChange={(c) => setChecklist({ ...checklist, components: c as boolean })}
                                />
                                <Label htmlFor="components" className="font-normal cursor-pointer">구성품(텍, 단추 등)이 모두 있습니까?</Label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>배송비 정산</Label>
                            <RadioGroup defaultValue="prepaid" onValueChange={setShippingType}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="prepaid" id="prepaid" />
                                    <Label htmlFor="prepaid">선불 (고객 부담)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="postpaid" id="postpaid" />
                                    <Label htmlFor="postpaid">착불 (업체 부담)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label>반품 사유</Label>
                            <Select onValueChange={setReason} defaultValue="simple">
                                <SelectTrigger>
                                    <SelectValue placeholder="사유 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="simple">단순 변심</SelectItem>
                                    <SelectItem value="defect">상품 불량 (오염/파손)</SelectItem>
                                    <SelectItem value="size">사이즈 안 맞음</SelectItem>
                                    <SelectItem value="delivery">배송 지연/오배송</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="memo">상세 메모</Label>
                        <Textarea id="memo" placeholder="반품 관련 특이사항 기록" />
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                        <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">반품 접수 완료</Button>
                        <Button type="button" variant="secondary" className="flex-1 flex gap-2 items-center justify-center text-emerald-700 bg-emerald-50 hover:bg-emerald-100" onClick={handleRestock}>
                            <PackageCheck className="h-4 w-4" />
                            재입고 (판매중 전환)
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
