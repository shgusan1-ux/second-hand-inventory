'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { generateProductDetailHTML } from '@/lib/product-detail-generator';

interface ProductDetailPreviewProps {
  open: boolean;
  onClose: () => void;
  product: any;
}

export function ProductDetailPreview({ open, onClose, product }: ProductDetailPreviewProps) {
  const [htmlCode, setHtmlCode] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (product) {
      setHtmlCode(generateProductDetailHTML(product));
      setSelectedImageIndex(0);
    }
  }, [product]);

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(htmlCode);
    toast.success('상세페이지 HTML이 클립보드에 복사되었습니다!');
  };

  if (!product) return null;

  const imageUrls = product.image_url ? product.image_url.split(',').map((url: string) => url.trim()) : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0">
        <div className="flex h-full">
          {/* Left Panel - Product Info & Controls */}
          <div className="w-[320px] border-r bg-slate-50 flex flex-col">
            <DialogHeader className="p-4 border-b bg-white">
              <DialogTitle className="text-sm">상품 정보</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Main Product Image */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white border">
                {imageUrls.length > 0 ? (
                  <Image
                    src={imageUrls[selectedImageIndex]}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">No Image</div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {imageUrls.length > 1 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 font-medium">이미지 ({imageUrls.length})</div>
                  <div className="grid grid-cols-4 gap-2">
                    {imageUrls.map((url: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative aspect-square rounded overflow-hidden bg-white border-2 transition-all ${selectedImageIndex === index
                          ? 'border-emerald-500 ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <Image
                          src={url}
                          alt={`${product.name} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-2 text-xs">
                <div className="bg-white p-3 rounded border">
                  <div className="text-slate-500 mb-1">상품명</div>
                  <div className="font-medium text-slate-900">{product.name}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-slate-500 mb-1">브랜드</div>
                  <div className="font-medium text-slate-900">{product.brand || '-'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-slate-500 mb-1">등급</div>
                    <div className="font-medium text-slate-900">{product.condition || 'A급'}</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-slate-500 mb-1">사이즈</div>
                    <div className="font-medium text-slate-900">{product.size || '-'}</div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-slate-500 mb-1">판매가</div>
                  <div className="font-bold text-emerald-600">₩{product.price_sell?.toLocaleString() || '0'}</div>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="p-4 border-t bg-white space-y-2">
              <Button onClick={handleCopyHTML} className="w-full gap-2" size="sm">
                <Copy className="w-4 h-4" />
                HTML 복사
              </Button>
            </div>
          </div>

          {/* Right Panel - HTML Preview/Code */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">상세페이지 미리보기</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'preview' ? 'default' : 'outline'}
                  onClick={() => setViewMode('preview')}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  미리보기
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'code' ? 'default' : 'outline'}
                  onClick={() => setViewMode('code')}
                  className="gap-2"
                >
                  <Code className="w-4 h-4" />
                  HTML 코드
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {viewMode === 'preview' ? (
                <div className="p-6 bg-white">
                  <div dangerouslySetInnerHTML={{ __html: htmlCode }} />
                </div>
              ) : (
                <pre className="bg-slate-900 text-slate-100 p-6 text-xs h-full overflow-auto">
                  <code>{htmlCode}</code>
                </pre>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
