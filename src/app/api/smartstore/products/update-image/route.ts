
import { NextRequest, NextResponse } from 'next/server';
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// EC2 프록시를 경유해야 함 (네이버 API는 등록된 고정 IP에서만 요청 허용)
const PROXY_URL = (process.env.NEXT_PUBLIC_PROXY_URL || process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001').trim();
const PROXY_KEY = (process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key').trim();

/**
 * 네이버 이미지 호스팅에 이미지 업로드 (EC2 프록시 전용 엔드포인트 경유)
 * Vercel → 프록시: raw binary 전송
 * 프록시 → 네이버: multipart 전송 (IP 차단 및 데이터 변조 방지)
 */
async function uploadImageToNaver(token: string, imageBuffer: Buffer, fileName: string, log: (msg: string) => void): Promise<string> {
    try {
        log(`[3/7] 프록시 전용 엔드포인트로 RAW 이미지 전송 (${imageBuffer.length} bytes)...`);

        // Vercel에서 프록시로 보낼 때는 멀티파트가 아닌 raw binary로 보냄 (변조 방지)
        const res = await fetch(`${PROXY_URL}/naver-image-upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-proxy-key': PROXY_KEY,
                'x-filename': fileName,
                'Content-Type': 'application/octet-stream',
            },
            body: new Uint8Array(imageBuffer),
        });

        if (!res.ok) {
            const errText = await res.text();
            log(`[3/7] ✗ 네이버 업로드 실패 (${res.status}): ${errText.substring(0, 300)}`);
            throw new Error(`Naver upload failed via proxy (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const naverUrl = data?.images?.[0]?.url;
        if (!naverUrl) {
            throw new Error(`응답에 이미지 URL이 없습니다: ${JSON.stringify(data)}`);
        }

        log(`[3/7] 네이버 CDN URL 획득 완료!`);
        return naverUrl;
    } catch (error: any) {
        log(`[3/7] ✗ 업로드 예외: ${error.message}`);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    const logs: string[] = [];
    const log = (msg: string) => { logs.push(`${new Date().toISOString().split('T')[1].split('.')[0]} ${msg}`); console.log(msg); };

    try {
        const body = await request.json();
        const { originProductNo, imageUrl, mode = 'replace' } = body as {
            originProductNo: string;
            imageUrl: string;
            mode?: 'replace' | 'append'; // replace=대표이미지 교체, append=추가이미지로 넣기
        };

        if (!originProductNo || !imageUrl) {
            return NextResponse.json({ error: 'Missing originProductNo or imageUrl' }, { status: 400 });
        }

        await ensureDbInitialized();

        // 1. 토큰 발급
        log(`[1/7] ${originProductNo} 토큰 발급 중...`);
        const tokenData = await getNaverToken();
        const token = tokenData.access_token;
        log(`[1/7] 토큰 발급 완료 (${token.substring(0, 10)}...)`);

        // 2. Vercel Blob에서 이미지 다운로드
        const cleanUrl = imageUrl.split('?')[0]; // ?t=timestamp 제거
        log(`[2/7] 이미지 다운로드: ${cleanUrl}`);

        const imgRes = await fetch(cleanUrl);
        if (!imgRes.ok) {
            throw new Error(`이미지 다운로드 실패: ${imgRes.status} ${imgRes.statusText}`);
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const imageUint8Array = new Uint8Array(arrayBuffer);
        log(`[2/7] 이미지 다운로드 완료: ${imageBuffer.length} bytes`);

        // 3. 네이버 이미지 호스팅에 업로드 (EC2 프록시 경유) → 네이버 CDN URL
        log(`[3/7] 네이버 CDN 업로드 중 (프록시: ${PROXY_URL})...`);
        const naverImageUrl = await uploadImageToNaver(token, imageBuffer, `${originProductNo}.jpg`, log);
        log(`[3/7] 네이버 CDN URL: ${naverImageUrl}`);

        // 4. 상품 상세 조회 (전체 데이터 필요 - PUT은 전체 교체)
        log(`[4/7] 네이버 상세 정보 조회...`);
        const detail = await getProductDetail(token, Number(originProductNo));
        const originProduct = detail.originProduct || detail;
        const channelProduct = detail.smartstoreChannelProduct || (detail.originProduct ? {} : null);

        if (!originProduct || !originProduct.statusType) {
            log(`[4/7] 상세 정보 구조 오류: ${JSON.stringify(detail).slice(0, 300)}`);
            throw new Error(`Naver 상세 정보를 가져올 수 없거나 지원하지 않는 구조입니다.`);
        }
        log(`[4/7] 상세 정보 로드: ${originProduct.name?.substring(0, 40)}`);

        // 5. 이미지 업데이트 (모드에 따라 대표이미지 교체 또는 추가이미지 추가)
        if (!originProduct.images) originProduct.images = {};
        let channelImageUpdated = false;

        if (mode === 'append') {
            // 추가이미지로 넣기 (기존 뱃지/대표이미지 유지)
            const optionalImages = originProduct.images.optionalImages || [];
            if (optionalImages.length >= 9) {
                log(`[5/7] 추가이미지 9장 초과 — 마지막 이미지를 교체합니다`);
                optionalImages[optionalImages.length - 1] = { url: naverImageUrl };
            } else {
                optionalImages.push({ url: naverImageUrl });
            }
            originProduct.images.optionalImages = optionalImages;
            log(`[5/7] 추가이미지로 삽입 (총 ${optionalImages.length}장). 대표이미지 유지`);
        } else {
            // 기존 동작: 대표이미지 교체
            const oldImage = originProduct.images.representativeImage?.url || '(없음)';
            originProduct.images.representativeImage = { url: naverImageUrl };

            if (channelProduct?.representativeImage) {
                channelProduct.representativeImage = { url: naverImageUrl };
                channelImageUpdated = true;
            }
            log(`[5/7] 대표이미지 교체: ${oldImage.substring(0, 50)}... → ${naverImageUrl.substring(0, 50)}...`);
        }

        // 6. PUT 전체 데이터 전송
        const payload = {
            originProduct,
            smartstoreChannelProduct: channelProduct,
        };

        log(`[6/7] 네이버 PUT 전송 중...`);
        const result = await updateProduct(token, Number(originProductNo), payload);
        log(`[6/7] 네이버 PUT 성공: ${JSON.stringify(result).slice(0, 200)}`);

        // 7. DB에도 새 썸네일 URL 저장
        try {
            const { rows } = await db.query(
                `SELECT raw_json FROM naver_products WHERE origin_product_no = $1`,
                [String(originProductNo)]
            );
            if (rows.length > 0) {
                const rawJson = JSON.parse(rows[0].raw_json);
                if (rawJson.representativeImage) {
                    rawJson.representativeImage.url = naverImageUrl;
                } else {
                    rawJson.representativeImage = { url: naverImageUrl };
                }
                await db.query(
                    `UPDATE naver_products SET thumbnail_url = $1, raw_json = $2 WHERE origin_product_no = $3`,
                    [naverImageUrl, JSON.stringify(rawJson), String(originProductNo)]
                );
            }
            log(`[7/7] DB 썸네일 저장 완료`);
        } catch (dbErr: any) {
            log(`[7/7] DB 저장 실패 (네이버 동기화는 성공): ${dbErr.message}`);
        }

        log(`✓ ${originProductNo} 네이버 이미지 동기화 완료 (채널이미지: ${channelImageUpdated})`);

        return NextResponse.json({
            success: true,
            naverImageUrl,
            logs,
            data: result
        });

    } catch (error: any) {
        log(`✗ 실패: ${error.message}`);
        console.error('[Update Image API] Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to update Naver image',
            logs,
        }, { status: 500 });
    }
}
