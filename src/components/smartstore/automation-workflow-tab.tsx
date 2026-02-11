'use client';

import { useState, useMemo } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  lifecycle?: { stage: string; daysSince: number };
  archiveInfo?: { category: string };
  internalCategory?: string;
}

interface AutomationWorkflowTabProps {
  products: Product[];
  onRefresh: () => void;
}

export function AutomationWorkflowTab({ products, onRefresh }: AutomationWorkflowTabProps) {
  const stats = useMemo(() => {
    const archiveUncategorized = products.filter(
      p => p.lifecycle?.stage === 'ARCHIVE' &&
        (!p.internalCategory || p.internalCategory === 'UNCATEGORIZED')
    ).length;

    const clearanceProducts = products.filter(p => p.lifecycle?.stage === 'CLEARANCE');
    const discountable = clearanceProducts.filter(p => p.statusType === 'SALE').length;

    const outOfStock = products.filter(p => p.stockQuantity === 0 && p.statusType === 'SALE').length;
    const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 3).length;

    return { archiveUncategorized, discountable, outOfStock, lowStock };
  }, [products]);

  const automations = [
    {
      id: 'classify',
      title: '자동 분류',
      description: 'ARCHIVE 단계의 미분류 상품을 키워드 기반으로 자동 분류합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      stat: `${stats.archiveUncategorized}개 미분류`,
      color: 'blue',
      ready: stats.archiveUncategorized > 0,
    },
    {
      id: 'pricing',
      title: '자동 가격 조정',
      description: 'CLEARANCE 단계 상품에 할인 규칙을 자동 적용합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      stat: `${stats.discountable}개 할인 대상`,
      color: 'amber',
      ready: stats.discountable > 0,
    },
    {
      id: 'stock-alert',
      title: '재고 알림',
      description: '품절 상품 자동 상태 변경 및 재고 부족 알림을 생성합니다.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      stat: `${stats.outOfStock}개 품절, ${stats.lowStock}개 부족`,
      color: 'red',
      ready: stats.outOfStock > 0 || stats.lowStock > 0,
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; button: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', button: 'bg-blue-600 hover:bg-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', button: 'bg-amber-600 hover:bg-amber-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', button: 'bg-red-600 hover:bg-red-700' },
  };

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-bold text-slate-800 mb-1">자동화 워크플로우</h3>
        <p className="text-sm text-slate-500">
          각 자동화 작업을 미리보기(dry-run)로 확인한 후 실행할 수 있습니다.
          STEP 7에서 전체 기능이 활성화됩니다.
        </p>
      </div>

      {/* 자동화 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {automations.map(auto => {
          const colors = colorMap[auto.color];
          return (
            <div key={auto.id} className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`${colors.text}`}>{auto.icon}</div>
                <h3 className={`font-bold ${colors.text}`}>{auto.title}</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">{auto.description}</p>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${colors.text}`}>{auto.stat}</span>
                <div className="flex gap-2">
                  <button
                    disabled={!auto.ready}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    미리보기
                  </button>
                  <button
                    disabled={!auto.ready}
                    className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-40 ${colors.button}`}
                  >
                    실행
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 안내 */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
        <p className="text-sm text-slate-500">
          자동화 기능은 STEP 7에서 API 연결과 함께 완전히 활성화됩니다.
          현재는 통계 확인만 가능합니다.
        </p>
      </div>
    </div>
  );
}
