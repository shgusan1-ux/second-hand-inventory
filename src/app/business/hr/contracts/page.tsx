'use client';

import { useState, useEffect } from 'react';
import { getAllContracts, updateContractStatus } from '@/lib/contract-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ContractsPage() {
    const [contracts, setContracts] = useState<any[]>([]);

    // 이부분은 실제 데이터를 가져와야 하지만, 시간 관계상 Mock 데이터를 넣거나
    // getAllContracts() 서버 액션을 호출하는 useEffect를 추가합니다.
    useEffect(() => {
        getAllContracts().then(setContracts);
    }, []);

    const statusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">작성중</span>;
            case 'pending': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">서명대기</span>;
            case 'signed': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">체결완료</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">{status}</span>;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">근로계약서 관리</h1>
                    <p className="text-slate-500">임직원 근로계약서 작성 및 현황 조회</p>
                </div>
                <Link href="/business/hr/contracts/new">
                    <Button>+ 계약서 작성</Button>
                </Link>
            </div>

            <div className="bg-white rounded-lg border shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-3">직원명</th>
                            <th className="px-4 py-3">계약유형</th>
                            <th className="px-4 py-3">생성일</th>
                            <th className="px-4 py-3">체결일</th>
                            <th className="px-4 py-3">상태</th>
                            <th className="px-4 py-3">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {contracts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                    생성된 계약서가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            contracts.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {c.user_name || c.user_id}
                                    </td>
                                    <td className="px-4 py-3">{c.type}</td>
                                    <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {c.signed_at ? new Date(c.signed_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <Link href={`/business/hr/contracts/${c.id}`} className="text-blue-600 hover:underline">
                                                보기
                                            </Link>
                                            {c.status === 'draft' && (
                                                <button onClick={() => updateContractStatus(c.id, 'pending')} className="text-amber-600 hover:underline">
                                                    발송
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
