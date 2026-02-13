'use client';

import { useState, useEffect } from 'react';
import { getPropertyDetails, createUnit, registerLease } from '@/lib/property-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, User, Calendar, DollarSign, Plus, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Leasing Modal
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [isLeaseOpen, setIsLeaseOpen] = useState(false);
    const [leaseData, setLeaseData] = useState({
        tenant_name: '',
        tenant_contact: '',
        deposit: '',
        monthly_rent: '',
        payment_day: '1',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        loadData();
    }, [params.id]);

    const loadData = () => {
        getPropertyDetails(params.id).then(data => {
            setProperty(data);
            setLoading(false);
        });
    };

    const handleLeaseSubmit = async () => {
        if (!leaseData.tenant_name || !leaseData.monthly_rent) {
            toast.error('필수 정보를 입력해주세요.');
            return;
        }

        const res = await registerLease(selectedUnit.id, {
            ...leaseData,
            deposit: Number(leaseData.deposit),
            monthly_rent: Number(leaseData.monthly_rent),
            payment_day: Number(leaseData.payment_day)
        });

        if (res.success) {
            toast.success('임대 계약이 등록되었습니다.');
            setIsLeaseOpen(false);
            loadData();
        } else {
            toast.error('등록 실패: ' + res.error);
        }
    };

    if (loading) return <div className="p-10 text-center">로딩 중...</div>;
    if (!property) return <div className="p-10 text-center">자산을 찾을 수 없습니다.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> 목록으로
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {property.name}
                        <Badge variant="outline" className="text-base font-normal">{property.type}</Badge>
                    </h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4" /> {property.address}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">수정</Button>
                    <Button>호실 추가</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {property.units?.map((unit: any) => (
                    <Card key={unit.id} className="relative overflow-hidden group">
                        {unit.status === 'Occupied' && (
                            <div className="absolute top-0 right-0 p-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-bl-lg">
                                임대 중
                            </div>
                        )}
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl">{unit.unit_number}</CardTitle>
                            <CardDescription>{unit.area ? `${unit.area}평` : '면적 미등록'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {unit.status === 'Occupied' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <User className="w-4 h-4 text-slate-500" />
                                        {unit.tenant_name}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <DollarSign className="w-4 h-4 text-slate-500" />
                                        월 {unit.monthly_rent?.toLocaleString()}원 (매월 {unit.payment_day}일)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar className="w-3 h-3" />
                                        만기: {unit.lease_end_date}
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-2">
                                        계약 상세 보기
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-slate-400 text-sm mb-4">현재 공실입니다.</p>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedUnit(unit);
                                            setIsLeaseOpen(true);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        임대 계약 등록
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isLeaseOpen} onOpenChange={setIsLeaseOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedUnit?.unit_number} 임대 계약 등록</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>임차인 성명 (법인명)</Label>
                            <Input
                                value={leaseData.tenant_name}
                                onChange={e => setLeaseData({ ...leaseData, tenant_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>연락처</Label>
                            <Input
                                value={leaseData.tenant_contact}
                                onChange={e => setLeaseData({ ...leaseData, tenant_contact: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>보증금</Label>
                                <Input
                                    type="number"
                                    value={leaseData.deposit}
                                    onChange={e => setLeaseData({ ...leaseData, deposit: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>월 임대료</Label>
                                <Input
                                    type="number"
                                    value={leaseData.monthly_rent}
                                    onChange={e => setLeaseData({ ...leaseData, monthly_rent: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>계약 시작일</Label>
                                <Input
                                    type="date"
                                    value={leaseData.start_date}
                                    onChange={e => setLeaseData({ ...leaseData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>계약 종료일</Label>
                                <Input
                                    type="date"
                                    value={leaseData.end_date}
                                    onChange={e => setLeaseData({ ...leaseData, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>납부일 (매월)</Label>
                            <Input
                                type="number"
                                min="1" max="31"
                                value={leaseData.payment_day}
                                onChange={e => setLeaseData({ ...leaseData, payment_day: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLeaseOpen(false)}>취소</Button>
                        <Button onClick={handleLeaseSubmit}>등록완료</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MapPinIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}
