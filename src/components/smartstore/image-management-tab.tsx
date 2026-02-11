'use client';

import { useState, useMemo } from 'react';

interface Product {
  originProductNo: string;
  name: string;
  thumbnailUrl?: string | null;
  salePrice: number;
  lifecycle?: { stage: string; daysSince: number };
}

interface ImageManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

export function ImageManagementTab({ products, onRefresh }: ImageManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.originProductNo.includes(searchTerm)
    );
  }, [products, searchTerm]);

  const getImageUrl = (p: Product): string | null => {
    return p.thumbnailUrl || null;
  };

  const getImageCount = (p: Product): number => {
    return p.thumbnailUrl ? 1 : 0;
  };

  const noImageCount = products.filter(p => !getImageUrl(p)).length;

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">전체 상품</p>
          <p className="text-2xl font-bold text-slate-800">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">이미지 있음</p>
          <p className="text-2xl font-bold text-emerald-600">{products.length - noImageCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-red-400">이미지 없음</p>
          <p className="text-2xl font-bold text-red-600">{noImageCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">보기 모드</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-xs font-medium ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              그리드
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-xs font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              리스트
            </button>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="상품 검색..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* 이미지 그리드 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.slice(0, 120).map(p => {
            const imgUrl = getImageUrl(p);
            const imgCount = getImageCount(p);
            return (
              <div
                key={p.originProductNo}
                className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setSelectedProduct(p)}
              >
                <div className="aspect-square bg-slate-100 relative">
                  {imgUrl ? (
                    <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {imgCount > 1 && (
                    <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {imgCount}장
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.salePrice?.toLocaleString()}원</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-16 p-3"></th>
                <th className="text-left p-3 text-slate-500 text-xs font-medium">상품</th>
                <th className="text-center p-3 text-slate-500 text-xs font-medium w-20">이미지 수</th>
                <th className="text-right p-3 text-slate-500 text-xs font-medium w-24">가격</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(p => (
                <tr key={p.originProductNo} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                  <td className="p-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                      {getImageUrl(p) && <img src={getImageUrl(p)!} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.originProductNo}</p>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">{getImageCount(p)}</td>
                  <td className="p-3 text-right font-medium text-slate-700">{p.salePrice?.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 이미지 상세 모달 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-slate-800 truncate">{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.isArray(selectedProduct.images) ? (
                selectedProduct.images.map((img: any, i: number) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <>
                  {selectedProduct.images?.representativeImage && (
                    <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden col-span-2">
                      <img src={selectedProduct.images.representativeImage.url} alt="대표 이미지" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {selectedProduct.images?.optionalImages?.map((img: any, i: number) => (
                    <div key={i} className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </>
              )}
            </div>
            {getImageCount(selectedProduct) === 0 && (
              <div className="text-center py-12 text-slate-400">이미지가 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
