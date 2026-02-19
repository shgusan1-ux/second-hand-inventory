/**
 * 상품 검수 API
 * GET: 기존 스캔 결과 조회
 * POST: SSE 스트리밍 딥 스캔 (네이버 상세페이지 + 이미지 체크)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { getNaverToken, getProductDetail } from '@/lib/naver/client';

export const maxDuration = 300; // 5분

// GET: 기존 스캔 결과 조회
export async function GET() {
    try {
        await ensureDbInitialized();
        const { rows } = await db.query(
            `SELECT origin_product_no, issues, detail_name, detail_image_url, detail_content_length, checked_at
             FROM product_audit
             WHERE issues != '[]'
             ORDER BY checked_at DESC`
        );
        return NextResponse.json({ results: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
    }
}

// POST: SSE 딥 스캔
export async function POST(request: Request) {
    await ensureDbInitialized();

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // 판매중인 상품 목록 가져오기
                const { rows: products } = await db.query(
                    `SELECT origin_product_no, name, thumbnail_url, sale_price, description_grade
                     FROM naver_products
                     WHERE status_type IN ('SALE', 'OUTOFSTOCK')
                     ORDER BY origin_product_no DESC`
                );

                if (products.length === 0) {
                    send({ type: 'complete', total: 0, issues: 0, message: '검사할 상품이 없습니다' });
                    controller.close();
                    return;
                }

                send({ type: 'start', total: products.length });

                const tokenData = await getNaverToken();
                let totalIssues = 0;
                const issueCounts: Record<string, number> = {};

                for (let i = 0; i < products.length; i++) {
                    const p = products[i];
                    const pid = p.origin_product_no;
                    const shortName = (p.name || '').substring(0, 30);
                    const issues: string[] = [];

                    try {
                        // 1. 기본 체크 (DB 데이터 기반)
                        if (!p.thumbnail_url) {
                            issues.push('NO_THUMBNAIL');
                        }
                        if (!p.sale_price || p.sale_price <= 0) {
                            issues.push('PRICE_ZERO');
                        }

                        // 2. 네이버 상세페이지 조회
                        const detail = await getProductDetail(tokenData.access_token, parseInt(pid));
                        const op = detail.originProduct;

                        let detailName = '';
                        let detailImageUrl = '';
                        let detailContentLength = 0;

                        if (op) {
                            detailName = op.name || '';
                            detailImageUrl = op.images?.representativeImage?.url || '';
                            const detailContent = op.detailContent || '';
                            const plainText = detailContent.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
                            detailContentLength = plainText.length;

                            // 3. 상품명 불일치 체크
                            // 리스팅 상품명에서 브랜드/핵심 키워드 추출 후 상세내용에 있는지 확인
                            if (detailName && p.name && detailName !== p.name) {
                                // 이름이 완전히 다른 경우
                                const listingBrand = extractBrandFromName(p.name);
                                const detailBrand = extractBrandFromName(detailName);
                                if (listingBrand && detailBrand && listingBrand.toLowerCase() !== detailBrand.toLowerCase()) {
                                    issues.push('NAME_MISMATCH');
                                }
                            }

                            // 4. 상세내용에서 상품명 키워드 매칭 체크
                            if (plainText.length > 0) {
                                const brandFromName = extractBrandFromName(p.name);
                                if (brandFromName && brandFromName.length >= 3) {
                                    const brandInContent = plainText.toLowerCase().includes(brandFromName.toLowerCase());
                                    const brandInDetailName = detailName.toLowerCase().includes(brandFromName.toLowerCase());
                                    if (!brandInContent && !brandInDetailName) {
                                        // 상세내용에도, 상세페이지 상품명에도 브랜드가 없으면 밀린 상품 가능성
                                        if (!issues.includes('NAME_MISMATCH')) {
                                            issues.push('NAME_MISMATCH');
                                        }
                                    }
                                }
                            }

                            // 5. 대표이미지 불일치 체크
                            if (p.thumbnail_url && detailImageUrl) {
                                const thumbBase = normalizeImageUrl(p.thumbnail_url);
                                const detailBase = normalizeImageUrl(detailImageUrl);
                                if (thumbBase && detailBase && thumbBase !== detailBase) {
                                    issues.push('IMAGE_MISMATCH');
                                }
                            }

                            // 6. 상세내용 없음/짧음
                            if (detailContentLength < 50) {
                                issues.push('NO_DETAIL');
                            }

                            // 7. GRADE 패턴 체크
                            const gradeMatch = plainText.match(/GRADE\s*:\s*([SABV])\b/i);
                            if (!gradeMatch && !p.description_grade) {
                                issues.push('NO_GRADE');
                            }
                        } else {
                            // 상세 조회 실패 = 상품 자체가 문제
                            issues.push('NO_DETAIL');
                        }

                        // 8. 이미지 접근 체크 (HEAD 요청)
                        if (p.thumbnail_url) {
                            try {
                                const imgRes = await fetch(p.thumbnail_url, {
                                    method: 'HEAD',
                                    signal: AbortSignal.timeout(5000),
                                });
                                if (!imgRes.ok) {
                                    issues.push('IMAGE_BROKEN');
                                }
                            } catch {
                                issues.push('IMAGE_BROKEN');
                            }
                        }

                        // DB 저장 (upsert)
                        await db.query(
                            `INSERT INTO product_audit (origin_product_no, issues, detail_name, detail_image_url, detail_content_length, checked_at)
                             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                             ON CONFLICT (origin_product_no) DO UPDATE SET
                               issues = $2, detail_name = $3, detail_image_url = $4, detail_content_length = $5, checked_at = CURRENT_TIMESTAMP`,
                            [pid, JSON.stringify(issues), detailName, detailImageUrl, detailContentLength]
                        );

                        if (issues.length > 0) {
                            totalIssues++;
                            issues.forEach(issue => {
                                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
                            });
                        }

                        send({
                            type: 'progress',
                            current: i + 1,
                            total: products.length,
                            product: shortName,
                            productNo: pid,
                            issues,
                            message: issues.length > 0 ? `문제 ${issues.length}건: ${issues.join(', ')}` : '정상'
                        });

                    } catch (e: any) {
                        send({
                            type: 'progress',
                            current: i + 1,
                            total: products.length,
                            product: shortName,
                            productNo: pid,
                            issues: ['SCAN_ERROR'],
                            message: `오류: ${e.message?.substring(0, 50)}`
                        });
                    }

                    // Rate limiting (0.2초)
                    if (i < products.length - 1) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }

                send({
                    type: 'complete',
                    total: products.length,
                    issues: totalIssues,
                    issueCounts,
                    message: `스캔 완료: ${products.length}개 중 ${totalIssues}개 문제 발견`
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

// 상품명에서 브랜드 추출 (영문 부분)
function extractBrandFromName(name: string): string {
    if (!name) return '';
    const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
    return match ? match[1].trim() : '';
}

// 이미지 URL 정규화 (쿼리 파라미터 제거, 도메인 차이 무시)
function normalizeImageUrl(url: string): string {
    try {
        const u = new URL(url);
        // 경로의 마지막 부분만 비교 (파일명)
        const path = u.pathname;
        return path.split('/').pop() || path;
    } catch {
        return url;
    }
}
