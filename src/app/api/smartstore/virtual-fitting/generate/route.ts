import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { generateFittingImage, fetchImageAsBase64, extractGender } from '@/lib/virtual-fitting/gemini-fitting';

export const maxDuration = 300;
const CONCURRENCY = 3;
const BATCH_DELAY = 500;

interface ProductInput {
    originProductNo: string;
    name: string;
    imageUrl: string;
    archiveCategory?: string;
}

export async function POST(request: NextRequest) {
    const { products, modelChoice = 'flash', syncToNaver = false } = await request.json() as {
        products: ProductInput[];
        modelChoice: 'flash' | 'pro';
        syncToNaver: boolean;
    };

    await ensureDbInitialized();

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch { /* stream closed */ }
            };

            const total = products.length;
            let completed = 0;
            let failed = 0;
            const startTime = Date.now();

            send({ type: 'start', total, message: `${total}개 상품 가상피팅 시작...` });

            // 모델 목록 가져오기 (기본 모델 우선)
            const { rows: models } = await db.query(
                'SELECT * FROM fitting_models ORDER BY is_default DESC, created_at DESC'
            );

            const modelMap: Record<string, any> = {};
            for (const m of models) {
                if (!modelMap[m.type]) modelMap[m.type] = m;
            }

            if (Object.keys(modelMap).length === 0) {
                send({ type: 'error', message: '등록된 모델이 없습니다. 먼저 모델을 등록해주세요.' });
                controller.close();
                return;
            }

            // 배치 처리
            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = products.slice(i, i + CONCURRENCY);

                const batchResults = await Promise.allSettled(batch.map(async (product) => {
                    const gender = extractGender(product.name);
                    const model = modelMap[gender] || modelMap['MAN'] || models[0];

                    if (!model) {
                        throw new Error(`${gender} 모델이 등록되지 않았습니다`);
                    }

                    const resultId = `fit-${product.originProductNo}-${Date.now()}`;

                    send({
                        type: 'progress',
                        current: completed + 1,
                        total,
                        productNo: product.originProductNo,
                        productName: product.name,
                        phase: 'downloading',
                        message: `${product.name.substring(0, 30)}... 이미지 준비`,
                    });

                    // 이미지 다운로드
                    const [clothingB64, personB64] = await Promise.all([
                        fetchImageAsBase64(product.imageUrl),
                        fetchImageAsBase64(model.image_url),
                    ]);

                    send({
                        type: 'progress',
                        current: completed + 1,
                        total,
                        productNo: product.originProductNo,
                        phase: 'generating',
                        message: `${product.name.substring(0, 30)}... DALL-E 3 생성 중`,
                    });

                    // DALL-E 3 이미지 생성 (GPT-4o 분석 → DALL-E 3 생성)
                    const result = await generateFittingImage({
                        personImageBase64: personB64,
                        clothingImageBase64: clothingB64,
                        gender,
                        archiveCategory: product.archiveCategory,
                        modelChoice,
                        productName: product.name,
                    });

                    send({
                        type: 'progress',
                        current: completed + 1,
                        total,
                        productNo: product.originProductNo,
                        phase: 'uploading',
                        message: `${product.name.substring(0, 30)}... 저장 중`,
                    });

                    // Vercel Blob에 저장
                    const imageBuffer = Buffer.from(result.imageBase64, 'base64');
                    const blob = await put(
                        `fitting-results/${product.originProductNo}.png`,
                        imageBuffer,
                        { access: 'public', contentType: result.mimeType, addRandomSuffix: false, allowOverwrite: true }
                    );

                    // DB에 결과 저장
                    await db.query(
                        `INSERT INTO fitting_results (id, product_no, model_id, source_image_url, result_image_url, status)
                         VALUES ($1, $2, $3, $4, $5, 'completed')
                         ON CONFLICT (id) DO UPDATE SET result_image_url = $5, status = 'completed'`,
                        [resultId, product.originProductNo, model.id, product.imageUrl, blob.url]
                    );

                    // 네이버 동기화 (선택)
                    let naverSynced = false;
                    if (syncToNaver) {
                        try {
                            send({
                                type: 'progress',
                                current: completed + 1,
                                total,
                                productNo: product.originProductNo,
                                phase: 'naver_sync',
                                message: `${product.name.substring(0, 30)}... 네이버 동기화`,
                            });

                            const syncRes = await fetch(new URL('/api/smartstore/products/update-image', request.url), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    originProductNo: product.originProductNo,
                                    imageUrl: blob.url,
                                }),
                            });

                            if (syncRes.ok) {
                                naverSynced = true;
                                await db.query(
                                    'UPDATE fitting_results SET naver_synced = TRUE WHERE id = $1',
                                    [resultId]
                                );
                            }
                        } catch (syncErr: any) {
                            console.warn('[Fitting Naver Sync] 실패:', syncErr.message);
                        }
                    }

                    return {
                        productNo: product.originProductNo,
                        resultUrl: blob.url,
                        naverSynced,
                        gender,
                        modelName: model.name,
                    };
                }));

                // 배치 결과 처리
                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        completed++;
                        send({
                            type: 'result',
                            current: completed,
                            total,
                            ...result.value,
                            message: `${result.value.productNo} 완료${result.value.naverSynced ? ' (네이버 동기화)' : ''}`,
                        });
                    } else {
                        failed++;
                        completed++;
                        const reason = result.reason?.message || '알 수 없는 오류';
                        send({
                            type: 'error',
                            current: completed,
                            total,
                            reason: reason.substring(0, 200),
                            message: `실패: ${reason.substring(0, 100)}`,
                        });
                    }
                }

                // 배치 간 딜레이
                if (i + CONCURRENCY < total) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY));
                }
            }

            const elapsed = Math.round((Date.now() - startTime) / 1000);
            send({
                type: 'complete',
                total,
                success: completed - failed,
                failed,
                elapsed,
                message: `완료! ${completed - failed}/${total} 성공 (${elapsed}초)`,
            });

            controller.close();
        },
    });

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
