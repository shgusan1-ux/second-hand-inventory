'use client';

import { useState, useMemo, useEffect } from 'react';
import { processImageWithBadge } from '@/lib/image-processor';
import { toast } from 'sonner';

interface Product {
  originProductNo: string;
  name: string;
  thumbnailUrl?: string | null;
  salePrice: number;
  regDate?: string;
  lifecycle?: { stage: string; daysSince: number };
  classification?: {
    visionGrade?: string;
    brand?: string;
    clothingType?: string;
    confidence?: number;
    [key: string]: any;
  };
  images?: any;
}

interface ImageManagementTabProps {
  products: Product[];
  onRefresh: () => void;
}

export function ImageManagementTab({ products: initialProducts, onRefresh }: ImageManagementTabProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  // Update local state when prop changes
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Verify component version
  useState(() => {
    console.log('[ImageManagementTab] Loaded v2.1: Client-side Generation Active');
  });

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

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(p => p.originProductNo));
  };

  const handleGenerateThumbnails = async () => {
    if (selectedIds.length === 0) return;
    setGenerating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedIds) {
        const product = products.find(p => p.originProductNo === id);
        if (!product || !product.thumbnailUrl) {
          failCount++;
          continue;
        }

        const grade = product.classification?.visionGrade || 'A급'; // Default

        const loadingToast = toast.loading(`${id} 이미지 처리 중...`);

        try {
          // 1. Client-Side Processing (Background + Badge)
          const processedBlob = await processImageWithBadge({
            imageUrl: product.thumbnailUrl,
            grade
          });

          // 2. Upload Result
          const formData = new FormData();
          formData.append('file', processedBlob, 'thumbnail.jpg');
          formData.append('productNo', id);

          const uploadResp = await fetch('/api/smartstore/images/upload', {
            method: 'POST',
            body: formData
          });

          toast.dismiss(loadingToast);

          if (uploadResp.ok) {
            successCount++;
            toast.success(`${id} 처리 완료`);

            // Update local state to show new thumbnail immediately
            const newUrl = `/thumbnails/generated/${id}.jpg?t=${Date.now()}`; // Cache bust
            setProducts(prev => prev.map(p =>
              p.originProductNo === id ? { ...p, thumbnailUrl: newUrl } : p
            ));
          } else {
            failCount++;
            toast.error(`${id} 업로드 실패`);
          }

        } catch (e: any) {
          toast.dismiss(loadingToast);
          console.error(`Error processing ${id}:`, e);
          toast.error(`${id} 실패: ${e.message}`);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`총 ${successCount}개 썸네일 생성 완료!`);
        onRefresh();
        setSelectedIds([]);
      }
      if (failCount > 0) {
        toast.warning(`${failCount}개 생성 실패`);
      }

    } catch (err: any) {
      toast.error('전체 프로세스 오류: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

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

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="상품 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selectedIds.length > 0 && (
          <button
            onClick={handleGenerateThumbnails}
            disabled={generating}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            썸네일 등록 ({selectedIds.length})
          </button>
        )}
      </div>

      {/* 이미지 그리드 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.slice(0, 120).map(p => {
            const imgUrl = getImageUrl(p);
            const imgCount = getImageCount(p);
            const isSelected = selectedIds.includes(p.originProductNo);
            return (
              <div
                key={p.originProductNo}
                className={`bg-white rounded-xl border overflow-hidden transition-all cursor-pointer group relative ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
                onClick={() => setSelectedProduct(p)}
              >
                <div className="aspect-square bg-slate-100 relative">
                  <div className="absolute top-2 left-2 z-10" onClick={(e) => toggleSelect(p.originProductNo, e)}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }} // Handled by div click for better DX
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                    />
                  </div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{p.salePrice?.toLocaleString()}원</span>
                    {p.regDate && <span className="text-[8px] text-slate-300">{new Date(p.regDate).toLocaleDateString('ko-KR')}</span>}
                  </div>
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
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-16 p-3"></th>
                <th className="text-left p-3 text-slate-500 text-xs font-medium">상품</th>
                <th className="text-center p-3 text-slate-500 text-xs font-medium w-20">이미지 수</th>
                <th className="text-right p-3 text-slate-500 text-xs font-medium w-24">가격</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(p => (
                <tr key={p.originProductNo} className={`border-b hover:bg-slate-50 cursor-pointer ${selectedIds.includes(p.originProductNo) ? 'bg-blue-50/50' : ''}`} onClick={() => setSelectedProduct(p)}>
                  <td className="p-3 text-center" onClick={(e) => toggleSelect(p.originProductNo, e)}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.originProductNo)}
                      readOnly
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                      {getImageUrl(p) && <img src={getImageUrl(p)!} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{p.originProductNo}</span>
                      {p.regDate && <span className="text-[10px] text-slate-300">{new Date(p.regDate).toLocaleDateString('ko-KR')}</span>}
                    </div>
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
