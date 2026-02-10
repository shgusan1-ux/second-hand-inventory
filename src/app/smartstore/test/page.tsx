'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const res = await fetch('/api/smartstore/products');

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) return <div className="p-8">로딩 중...</div>;
    if (error) return <div className="p-8 text-red-500">에러: {error}</div>;
    if (!data) return <div className="p-8">데이터 없음</div>;

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">SmartStore Data Hub</h1>
                    <p className="text-slate-500">실시간 네이버 커머스 API 연동 상태 및 데이터 검증</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-200 text-white">
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">전체 동기화 상품</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black">{data.data?.totalCount?.toLocaleString() || 0}</span>
                            <span className="text-sm font-medium">개</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">현재 페이지 로드</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-800">{data.data?.contents?.length || 0}</span>
                            <span className="text-sm font-medium text-slate-500">개</span>
                        </div>
                    </div>

                    <div className="bg-emerald-500 p-6 rounded-3xl shadow-lg shadow-emerald-100 text-white">
                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">연동 상태</p>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            <span className="text-lg font-bold">Connected</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 px-1">최근 등록 상품 리스트</h2>
                    {data.data?.contents?.map((product: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-slate-800 leading-tight">
                                    {product.name || '이름 없음'}
                                </p>
                                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                    {product.statusType}
                                </span>
                            </div>
                            <div className="flex gap-4">
                                <p className="text-xs text-slate-400">
                                    상품번호: <span className="text-slate-600 font-mono">{product.originProductNo || '-'}</span>
                                </p>
                                <p className="text-xs text-slate-400">
                                    가격: <span className="text-indigo-600 font-bold">{product.salePrice?.toLocaleString() || '0'}원</span>
                                </p>
                            </div>
                        </div>
                    ))}
                    {data.data?.contents?.length === 0 && (
                        <div className="text-center py-20 text-slate-400">
                            조회된 상품이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
