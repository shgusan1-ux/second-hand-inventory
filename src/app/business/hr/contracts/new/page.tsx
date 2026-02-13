'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createContract, ContractData } from '@/lib/contract-actions';
import { getUsers } from '@/lib/member-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NewContractPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<ContractData>({
        companyName: '주식회사 세컨핸드인벤토리',
        ceoName: '박준혁',
        employeeName: '',
        employeeAddress: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        jobTitle: '사원',
        location: '본사 (부산광역시 ...)',
        duties: '경영지원 및 일반사무',
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakTime: '12:00~13:00 (1시간)',
        workDays: '주 5일 (월~금)',
        salaryType: 'monthly',
        salaryAmount: 2500000,
        salaryDate: '매월 10일',
        bonus: '명절 귀향비 지급',
        benefit: '중식 제공, 야근 식대 지원'
    });

    const [selectedUserId, setSelectedUserId] = useState('');
    const [contractType, setContractType] = useState('정규직');

    useEffect(() => {
        getUsers().then(setUsers);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error('직원을 선택해주세요.');
            return;
        }

        setLoading(true);
        try {
            const res = await createContract(selectedUserId, contractType, formData);
            if (res.success) {
                toast.success('계약서가 생성되었습니다.');
                router.push('/business/hr/contracts');
            } else {
                toast.error(res.error || '생성 실패');
            }
        } catch (error) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        const user = users.find(u => u.id === userId);
        if (user) {
            setFormData(prev => ({
                ...prev,
                employeeName: user.name,
                jobTitle: user.job_title || prev.jobTitle
            }));
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
            <h1 className="text-2xl font-bold mb-6">근로계약서 작성</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. 기본 정보 */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">1. 기본 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>계약 대상 직원</Label>
                            <Select value={selectedUserId} onValueChange={handleUserSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="직원 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name} ({u.username})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>고용 형태</Label>
                            <Select value={contractType} onValueChange={setContractType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="정규직">정규직</SelectItem>
                                    <SelectItem value="계약직">계약직</SelectItem>
                                    <SelectItem value="아르바이트">아르바이트</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>근로자 주소</Label>
                            <Input
                                value={formData.employeeAddress}
                                onChange={e => setFormData({ ...formData, employeeAddress: e.target.value })}
                                placeholder="주소 입력"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>직무 (직위)</Label>
                            <Input
                                value={formData.jobTitle}
                                onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                placeholder="예: 경영지원 팀장"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>계약 시작일</Label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>계약 종료일 (정규직은 비워둠)</Label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. 근무 조건 */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">2. 근무 조건</h3>

                    <div className="space-y-2">
                        <Label>근무 장소</Label>
                        <Input
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>업무 내용</Label>
                        <Input
                            value={formData.duties}
                            onChange={e => setFormData({ ...formData, duties: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>시업 시각</Label>
                            <Input
                                type="time"
                                value={formData.workStartTime}
                                onChange={e => setFormData({ ...formData, workStartTime: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>종업 시각</Label>
                            <Input
                                type="time"
                                value={formData.workEndTime}
                                onChange={e => setFormData({ ...formData, workEndTime: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>휴게 시간</Label>
                        <Input
                            value={formData.breakTime}
                            onChange={e => setFormData({ ...formData, breakTime: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>근무일</Label>
                        <Input
                            value={formData.workDays}
                            onChange={e => setFormData({ ...formData, workDays: e.target.value })}
                        />
                    </div>
                </div>

                {/* 3. 급여 정보 */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">3. 급여 정보</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>급여 유형</Label>
                            <Select
                                value={formData.salaryType}
                                onValueChange={(v: any) => setFormData({ ...formData, salaryType: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">월급</SelectItem>
                                    <SelectItem value="hourly">시급</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>급여액 (원)</Label>
                            <Input
                                type="number"
                                value={formData.salaryAmount}
                                onChange={e => setFormData({ ...formData, salaryAmount: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>급여 지급일</Label>
                        <Input
                            value={formData.salaryDate}
                            onChange={e => setFormData({ ...formData, salaryDate: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>상여금</Label>
                        <Input
                            value={formData.bonus}
                            onChange={e => setFormData({ ...formData, bonus: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>기타 복리후생</Label>
                        <Input
                            value={formData.benefit}
                            onChange={e => setFormData({ ...formData, benefit: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? '생성 중...' : '계약서 생성'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
