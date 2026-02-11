'use client';

import { useState, useMemo } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  lifecycle?: { stage: string; daysSince: number };
  archiveInfo?: { category: string };
  internalCategory?: string;
}

interface CategoryManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

const ARCHIVE_CATEGORIES = [
  { id: 'MILITARY', name: 'MILITARY', description: 'M-65, MA-1, 필드자켓, 카고팬츠, Alpha Industries, Rothco' },
  { id: 'WORKWEAR', name: 'WORKWEAR', description: '칼하트, 디키즈, 데님, 캔버스, 초어자켓, Pointer' },
  { id: 'JAPAN', name: 'JAPANESE ARCHIVE', description: '빔즈, 포터, 캐피탈, Visvim, 일본 데님' },
  { id: 'EUROPE', name: 'HERITAGE EUROPE', description: '프랑스/독일 빈티지, 몰스킨, Le Laboureur' },
  { id: 'BRITISH', name: 'BRITISH ARCHIVE', description: '바버, 버버리, 아쿠아스큐텀, 트렌치/트위드' },
  { id: 'ETC', name: 'ETC', description: '위 해당 없는 일반 캐주얼' },
];

export function CategoryManagementTab({ products, onRefresh }: CategoryManagementTabProps) {
  const [section, setSection] = useState<'archive' | 'naver'>('archive');

  // ARCHIVE 단계 상품만 필터
  const archiveProducts = useMemo(
    () => products.filter(p => p.lifecycle?.stage === 'ARCHIVE'),
    [products]
  );

  // 카테고리별 카운트
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ARCHIVE_CATEGORIES) counts[cat.id] = 0;
    counts['UNCATEGORIZED'] = 0;
    for (const p of archiveProducts) {
      const cat = p.internalCategory || p.archiveInfo?.category || 'UNCATEGORIZED';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts['UNCATEGORIZED']++;
    }
    return counts;
  }, [archiveProducts]);

  return (
    <div className="space-y-4">
      {/* 섹션 토글 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSection('archive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            section === 'archive' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          내부 아카이브 분류
        </button>
        <button
          onClick={() => setSection('naver')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            section === 'naver' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          네이버 카테고리
        </button>
      </div>

      {section === 'archive' ? (
        <div className="space-y-4">
          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-500">ARCHIVE 전체</p>
              <p className="text-2xl font-bold text-slate-800">{archiveProducts.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-500">분류 완료</p>
              <p className="text-2xl font-bold text-emerald-600">
                {archiveProducts.length - (categoryCounts['UNCATEGORIZED'] || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-500">미분류</p>
              <p className="text-2xl font-bold text-amber-600">{categoryCounts['UNCATEGORIZED'] || 0}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-500">분류율</p>
              <p className="text-2xl font-bold text-blue-600">
                {archiveProducts.length > 0
                  ? Math.round(((archiveProducts.length - (categoryCounts['UNCATEGORIZED'] || 0)) / archiveProducts.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          {/* 카테고리별 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ARCHIVE_CATEGORIES.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <span className="text-lg font-bold text-blue-600">{categoryCounts[cat.id] || 0}</span>
                </div>
                <p className="text-xs text-slate-500">{cat.description}</p>
              </div>
            ))}
          </div>

          {/* 미분류 상품 리스트 */}
          {(categoryCounts['UNCATEGORIZED'] || 0) > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-slate-800 mb-3">미분류 상품 ({categoryCounts['UNCATEGORIZED']}개)</h3>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {archiveProducts
                  .filter(p => (p.internalCategory || p.archiveInfo?.category || 'UNCATEGORIZED') === 'UNCATEGORIZED')
                  .slice(0, 50)
                  .map(p => (
                    <div key={p.originProductNo} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-700 truncate max-w-md">{p.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.originProductNo}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-8 text-center text-slate-400">
          <p className="text-lg font-medium mb-2">네이버 카테고리 브라우저</p>
          <p className="text-sm">STEP 3에서 구현 예정 (5,804개 카테고리 검색/매핑)</p>
        </div>
      )}
    </div>
  );
}
