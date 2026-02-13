import { NextRequest } from 'next/server';
import { processBatch } from '@/lib/vision/queue';
import { ensureDbInitialized } from '@/lib/db-init';

// 배치는 오래 걸림 (상품당 ~10초)
export const maxDuration = 300; // 5분
export const dynamic = 'force-dynamic';

// POST: 배치 Vision 분석 (SSE 스트림)
export async function POST(request: NextRequest) {
  await ensureDbInitialized();
  const body = await request.json();
  const concurrency = body.concurrency || 2;
  const limit = body.limit || 50; // 한 번에 처리할 최대 수

  // 분석 대상 상품 조회 (thumbnailUrl이 있는 상품 중 아직 완료 안 된 것)
  // products API에서 캐시된 데이터를 직접 사용하지 않고,
  // 클라이언트가 productIds + imageUrls을 전달
  const products = body.products as Array<{
    originProductNo: string;
    name: string;
    imageUrl: string;
  }> || [];

  if (products.length === 0) {
    return new Response(
      JSON.stringify({ error: '분석할 상품이 없습니다' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const toProcess = products.slice(0, limit);

  // SSE 스트림 생성
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'start', total: toProcess.length, concurrency });

      try {
        const result = await processBatch(toProcess, {
          concurrency: concurrency || 3,
          delayMs: 1000,
          onProgress: (progress) => {
            send({
              type: 'progress',
              ...progress,
              percent: Math.round(((progress.completed + progress.failed) / progress.total) * 100)
            });
          }
        });

        send({ type: 'complete', ...result, failures: result.failures || [] });
      } catch (error: any) {
        send({ type: 'error', message: error.message });
      }

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
