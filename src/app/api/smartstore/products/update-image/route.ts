
import { NextRequest, NextResponse } from 'next/server';
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

const NAVER_API_BASE = 'https://api.commerce.naver.com/external';

/**
 * 네이버 이미지 호스팅에 이미지 업로드 (프록시 우회, 직접 호출)
 * POST /v1/product-images/upload (multipart/form-data)
 * → 네이버 CDN URL 반환
 */
async function uploadImageToNaver(token: string, imageBuffer: Buffer, fileName: string): Promise<string> {
    const boundary = '----NaverImageUpload' + Date.now();

    // multipart/form-data 수동 구성
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="imageFiles"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(header, 'utf-8');
    const footerBuf = Buffer.from(footer, 'utf-8');
    const body = Buffer.concat([headerBuf, imageBuffer, footerBuf]);

    const res = await fetch(`${NAVER_API_BASE}/v1/product-images/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`네이버 이미지 업로드 실패 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    // 응답: { images: [{ url: "https://shop-phinf.pstatic.net/..." }] }
    const naverUrl = data?.images?.[0]?.url;
    if (!naverUrl) {
        throw new Error('네이버 이미지 업로드 응답에 URL 없음: ' + JSON.stringify(data));
    }

    console.log(`[Naver Image Upload] 성공: ${naverUrl}`);
    return naverUrl;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { originProductNo, imageUrl } = body;

        if (!originProductNo || !imageUrl) {
            return NextResponse.json({ error: 'Missing originProductNo or imageUrl' }, { status: 400 });
        }

        await ensureDbInitialized();

        // 1. 토큰 발급
        const tokenData = await getNaverToken();
        const token = tokenData.access_token;

        // 2. Vercel Blob에서 이미지 다운로드
        const cleanUrl = imageUrl.split('?')[0]; // ?t=timestamp 제거
        console.log(`[Update Image] ${originProductNo} → 이미지 다운로드: ${cleanUrl}`);

        const imgRes = await fetch(cleanUrl);
        if (!imgRes.ok) {
            throw new Error(`이미지 다운로드 실패: ${imgRes.status} ${imgRes.statusText}`);
        }
        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        console.log(`[Update Image] 이미지 크기: ${imageBuffer.length} bytes`);

        // 3. 네이버 이미지 호스팅에 업로드 → 네이버 CDN URL 획득
        const naverImageUrl = await uploadImageToNaver(token, imageBuffer, `${originProductNo}.jpg`);

        // 4. 상품 상세 조회 (전체 데이터 필요 - PUT은 전체 교체)
        const detail = await getProductDetail(token, Number(originProductNo));
        const originProduct = detail.originProduct;
        const channelProduct = detail.smartstoreChannelProduct || {};

        // 5. 대표이미지를 네이버 CDN URL로 교체
        if (!originProduct.images) originProduct.images = {};
        originProduct.images.representativeImage = { url: naverImageUrl };

        // 6. PUT 전체 데이터 전송
        const payload = {
            originProduct,
            smartstoreChannelProduct: channelProduct,
        };

        const result = await updateProduct(token, Number(originProductNo), payload);

        // 7. DB에도 새 썸네일 URL 저장 (페이지 새로고침 시 유지)
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
            console.log(`[Update Image] ${originProductNo} → DB 썸네일 저장 완료`);
        } catch (dbErr: any) {
            console.warn(`[Update Image] DB 저장 실패 (네이버 동기화는 성공): ${dbErr.message}`);
        }

        console.log(`[Update Image] ${originProductNo} → 네이버 이미지 동기화 완료 ✓`);

        return NextResponse.json({
            success: true,
            naverImageUrl,
            data: result
        });

    } catch (error: any) {
        console.error('[Update Image API] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update Naver image' }, { status: 500 });
    }
}
