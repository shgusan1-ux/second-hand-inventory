/**
 * 네이버 상품의 전시 카테고리(channelProductDisplayCategoryNoList) 구조 확인용 디버그 API
 * GET /api/smartstore/exhibition/debug?productNo=상품번호
 */
import { NextRequest, NextResponse } from 'next/server';
import { getNaverToken, getProductDetail } from '@/lib/naver/client';

export async function GET(request: NextRequest) {
    const productNo = request.nextUrl.searchParams.get('productNo');

    if (!productNo) {
        return NextResponse.json({ error: 'productNo 파라미터 필요' }, { status: 400 });
    }

    try {
        const tokenData = await getNaverToken();
        const detail = await getProductDetail(tokenData.access_token, Number(productNo));

        // smartstoreChannelProduct 전체 구조 반환
        const channelProduct = detail.smartstoreChannelProduct || {};
        const originProduct = detail.originProduct || {};

        return NextResponse.json({
            success: true,
            productNo,
            productName: originProduct.name,
            leafCategoryId: originProduct.leafCategoryId,
            statusType: originProduct.statusType,
            // 전시 카테고리 관련 필드 모두 추출
            channelProductDisplayCategoryNoList: channelProduct.channelProductDisplayCategoryNoList,
            storeChannelProductDisplayCategoryNoList: channelProduct.storeChannelProductDisplayCategoryNoList,
            // 기타 전시 관련 필드
            channelProductDisplayStatusType: channelProduct.channelProductDisplayStatusType,
            naviDisplay: channelProduct.naviDisplay,
            // 전체 smartstoreChannelProduct 키 목록
            channelProductKeys: Object.keys(channelProduct),
            // 전체 데이터 (디버깅용)
            rawChannelProduct: channelProduct,
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
