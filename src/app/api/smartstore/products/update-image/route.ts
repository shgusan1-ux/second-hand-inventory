
import { NextRequest, NextResponse } from 'next/server';
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { originProductNo, imageUrl } = body;

        if (!originProductNo || !imageUrl) {
            return NextResponse.json({ error: 'Missing originProductNo or imageUrl' }, { status: 400 });
        }

        // 1. 토큰 발급
        const tokenData = await getNaverToken();
        const token = tokenData.access_token;

        // 2. 상품 상세 조회 (전체 데이터 필요)
        const detail = await getProductDetail(token, Number(originProductNo));
        const originProduct = detail.originProduct;
        const channelProduct = detail.smartstoreChannelProduct || {};

        // 3. 대표이미지 URL 교체
        if (!originProduct.images) originProduct.images = {};
        originProduct.images.representativeImage = { url: imageUrl };

        // 4. PUT 전체 데이터 전송 (네이버는 PUT = 전체 교체)
        const payload = {
            originProduct,
            smartstoreChannelProduct: channelProduct,
        };

        const result = await updateProduct(token, Number(originProductNo), payload);

        console.log(`[Update Image] ${originProductNo} → 네이버 이미지 동기화 성공`);

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error: any) {
        console.error('[Update Image API] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update Naver image' }, { status: 500 });
    }
}
