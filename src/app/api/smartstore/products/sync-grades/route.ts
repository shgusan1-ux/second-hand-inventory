/**
 * GRADE 일괄 동기화 API (SSE Streaming)
 * 네이버 상품 상세페이지에서 GRADE : [S/A/B/V] 패턴을 추출하여 DB 저장
 */

import { getNaverToken, getProductDetail } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export const maxDuration = 300; // 5분

export async function POST(request: Request) {
    await ensureDbInitialized();

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // GRADE가 아직 없는 상품 조회
                const { rows: products } = await db.query(
                    `SELECT origin_product_no, name FROM naver_products
                     WHERE (description_grade IS NULL OR description_grade = '')
                     AND status_type = 'SALE'
                     ORDER BY origin_product_no DESC`
                );

                if (products.length === 0) {
                    send({ type: 'complete', total: 0, success: 0, message: '모든 상품에 이미 GRADE가 있습니다' });
                    controller.close();
                    return;
                }

                send({ type: 'start', total: products.length });

                const tokenData = await getNaverToken();
                let success = 0;
                let fail = 0;
                const gradeStats: Record<string, number> = { S: 0, A: 0, B: 0, V: 0 };

                for (let i = 0; i < products.length; i++) {
                    const product = products[i];
                    const pid = product.origin_product_no;
                    const shortName = (product.name || '').substring(0, 30);

                    try {
                        const detail = await getProductDetail(tokenData.access_token, parseInt(pid));
                        const op = detail.originProduct;

                        if (!op) {
                            fail++;
                            send({ type: 'progress', current: i + 1, total: products.length, product: shortName, grade: null, message: '상품 없음' });
                            continue;
                        }

                        // detailContent에서 GRADE 추출
                        const dc = op.detailContent || '';
                        const text = dc.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
                        const gradeMatch = text.match(/GRADE\s*:\s*([SABV])\b/i);

                        const grade = gradeMatch ? gradeMatch[1].toUpperCase() : null;

                        if (grade) {
                            await db.query(
                                `UPDATE naver_products SET description_grade = $1 WHERE origin_product_no = $2`,
                                [grade, pid]
                            );
                            success++;
                            gradeStats[grade] = (gradeStats[grade] || 0) + 1;
                        } else {
                            fail++;
                        }

                        send({
                            type: 'progress',
                            current: i + 1,
                            total: products.length,
                            product: shortName,
                            grade: grade || '-',
                            message: grade ? `GRADE ${grade}` : 'GRADE 없음'
                        });
                    } catch (e: any) {
                        fail++;
                        send({
                            type: 'progress',
                            current: i + 1,
                            total: products.length,
                            product: shortName,
                            grade: null,
                            message: `오류: ${e.message?.substring(0, 50)}`
                        });
                    }

                    // Rate limiting: 네이버 API 속도 제한 (0.2초)
                    if (i < products.length - 1) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }

                send({
                    type: 'complete',
                    total: products.length,
                    success,
                    fail,
                    gradeStats,
                    message: `완료: ${success}개 성공, ${fail}개 실패`
                });
            } catch (e: any) {
                send({ type: 'error', message: e.message });
            }

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
