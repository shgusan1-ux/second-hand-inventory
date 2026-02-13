'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getContract, signContract } from '@/lib/contract-actions';
import { ContractTemplate } from '@/components/hr/contract-template';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ContractSigningPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [contract, setContract] = useState<any>(null);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getContract(params.id).then(c => {
            setContract(c);
            setLoading(false);
        });
    }, [params.id]);

    const handleSignSubmit = async () => {
        if (!signatureData) {
            toast.error('서명을 완료해주세요.');
            return;
        }

        if (!confirm('서명을 완료하고 계약을 체결하시겠습니까?')) return;

        setSubmitting(true);
        try {
            const res = await signContract(params.id, signatureData);
            if (res.success) {
                toast.success('계약이 체결되었습니다.');
                // Refresh data to show signed state
                const updated = await getContract(params.id);
                setContract(updated);
            } else {
                toast.error(res.error || '서명 실패');
            }
        } catch (e) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">로딩 중...</div>;
    if (!contract) return <div className="p-10 text-center">계약서를 찾을 수 없거나 권한이 없습니다.</div>;

    const isSigned = contract.status === 'signed';
    const contractData = JSON.parse(contract.content_json);

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">
                        {isSigned ? '✅ 체결 완료된 계약서' : '✍️ 근로계약서 서명'}
                    </h1>
                    <Button variant="outline" onClick={() => router.back()}>
                        목록으로
                    </Button>
                </div>

                {/* 계약서 본문 */}
                <ContractTemplate
                    data={contractData}
                    signatureUrl={isSigned ? contract.signature_data : null}
                    signDate={isSigned ? new Date(contract.signed_at).toLocaleDateString() : null}
                />

                {/* 서명 영역 (미체결 시에만 표시) */}
                {!isSigned && (
                    <Card className="p-6">
                        <h3 className="font-bold text-lg mb-4">전자 서명</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            위 계약 내용을 모두 확인하였으며, 이에 동의하여 서명합니다.
                            <br />
                            아래 영역에 서명(그리기) 후 '서명 완료 및 체결' 버튼을 눌러주세요.
                        </p>

                        <div className="mb-6 max-w-md">
                            <SignaturePad onEnd={setSignatureData} />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                onClick={handleSignSubmit}
                                disabled={!signatureData || submitting}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {submitting ? '처리 중...' : '서명 완료 및 체결'}
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
