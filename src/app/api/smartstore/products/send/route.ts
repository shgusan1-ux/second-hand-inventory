import { NextRequest, NextResponse } from 'next/server';
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { ensureDbInitialized } from '@/lib/db-init';

export const maxDuration = 300; // 5분
export const dynamic = 'force-dynamic';

interface SendItem {
  originProductNo: string;
  name?: string;           // 상품명 변경
  salePrice?: number;      // 가격 변경
  stockQuantity?: number;  // 재고 변경
  statusType?: string;     // 상태 변경 (SALE, SUSPENSION 등)
  categoryId?: string;     // 카테고리 변경
  discountRate?: number;   // 자동 할인율 (퍼센트)
}

interface SendResult {
  productNo: string;
  productName: string;
  success: boolean;
  error?: string;
  changes?: string[];
}

// POST: 배치 상품 송신 (SSE 스트림)
export async function POST(request: NextRequest) {
  await ensureDbInitialized();

  const body = await request.json();
  const items: SendItem[] = body.items || [];

  if (items.length === 0) {
    return NextResponse.json({ error: '송신할 상품이 없습니다' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let tokenData;
      try {
        tokenData = await getNaverToken();
      } catch (e: any) {
        send({ type: 'error', message: '토큰 발급 실패: ' + e.message });
        controller.close();
        return;
      }

      const token = tokenData.access_token;
      const results: SendResult[] = [];
      let completed = 0;
      let failed = 0;

      send({ type: 'start', total: items.length });

      for (const item of items) {
        const result: SendResult = {
          productNo: item.originProductNo,
          productName: '',
          success: false,
          changes: []
        };

        try {
          // 1. 현재 상품 상세 조회
          send({ type: 'progress', completed, failed, total: items.length, current: item.originProductNo, step: 'detail' });

          const detail = await getProductDetail(token, Number(item.originProductNo));
          const originProduct = detail.originProduct || detail;
          result.productName = originProduct?.name || item.originProductNo;

          // 2. 변경 사항 적용
          const payload = JSON.parse(JSON.stringify(originProduct));

          // 할인율 적용 (즉시할인)
          if (item.discountRate !== undefined) {
            const currentRate = payload.customerBenefit?.immediateDiscountPolicy?.discountMethod?.value || 0;
            if (item.discountRate !== currentRate) {
              result.changes!.push(`할인율: ${currentRate}% → ${item.discountRate}% (즉시할인)`);
              if (!payload.customerBenefit) payload.customerBenefit = {};
              payload.customerBenefit.immediateDiscountPolicy = {
                discountMethod: {
                  value: item.discountRate,
                  unitType: 'PERCENT'
                }
              };
            }
          }

          if (item.salePrice !== undefined && item.salePrice !== payload.salePrice) {
            result.changes!.push(`가격: ${payload.salePrice?.toLocaleString()}원 → ${item.salePrice.toLocaleString()}원`);
            payload.salePrice = item.salePrice;
          }

          if (item.name !== undefined && item.name !== payload.name) {
            result.changes!.push(`상품명: ${payload.name} → ${item.name}`);
            payload.name = item.name;
          }

          if (item.stockQuantity !== undefined) {
            const currentStock = payload.stockQuantity ?? 0;
            if (item.stockQuantity !== currentStock) {
              result.changes!.push(`재고: ${currentStock} → ${item.stockQuantity}`);
              payload.stockQuantity = item.stockQuantity;
            }
          }

          if (item.statusType !== undefined && item.statusType !== payload.statusType) {
            result.changes!.push(`상태: ${payload.statusType} → ${item.statusType}`);
            payload.statusType = item.statusType;
          }

          if (item.categoryId !== undefined) {
            result.changes!.push(`카테고리 변경`);
            payload.leafCategoryId = item.categoryId;
          }

          if (result.changes!.length === 0) {
            result.success = true;
            result.changes!.push('변경사항 없음');
            completed++;
          } else {
            // 3. 네이버에 PUT 송신
            send({ type: 'progress', completed, failed, total: items.length, current: item.originProductNo, step: 'sending' });

            await updateProduct(token, Number(item.originProductNo), { originProduct: payload });
            result.success = true;
            completed++;
          }
        } catch (e: any) {
          result.success = false;
          result.error = e?.message || '알 수 없는 오류';
          failed++;
        }

        results.push(result);

        send({
          type: 'item_complete',
          result,
          completed,
          failed,
          total: items.length,
          percent: Math.round(((completed + failed) / items.length) * 100)
        });

        // Rate limit 보호: 상품당 500ms 딜레이
        if (items.indexOf(item) < items.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      send({
        type: 'complete',
        completed,
        failed,
        total: items.length,
        results
      });

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
