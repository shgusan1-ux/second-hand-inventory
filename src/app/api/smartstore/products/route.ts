import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/naver-api-client';
import { classifyProduct } from '@/lib/product-classifier';
import { db } from '@vercel/postgres';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '100');
    const name = searchParams.get('name') || '';

    console.log(`[API/Products] GET 요청 수신 - Name: ${name}, Page: ${page}, Size: ${size}`);

    try {
        // 1. Fetch from Naver via Proxy (Internally handles token flow)
        console.log('[API/Products] Naver API 호출 중...');
        const naverRes = await searchProducts(page, size, { searchKeyword: name });

        if (!naverRes || !naverRes.contents) {
            console.warn('[API/Products] Naver 응답에 데이터가 없습니다.');
            return NextResponse.json({ success: true, data: naverRes || { contents: [] } });
        }

        console.log(`[API/Products] ${naverRes.contents.length}개의 상품을 Naver로부터 가져왔습니다.`);

        // 2. Fetch Overrides from DB
        const ids = naverRes.contents.map((item: any) => item.originProductNo.toString());
        let overridesMap: Record<string, any> = {};

        if (ids.length > 0) {
            try {
                const { rows } = await db.query(
                    'SELECT id, override_date, internal_category FROM product_overrides WHERE id = ANY($1)',
                    [ids]
                );
                overridesMap = rows.reduce((acc: any, row: any) => {
                    acc[row.id] = row;
                    return acc;
                }, {});
                console.log(`[API/Products] ${rows.length}개의 DB 오버라이드 정보를 매칭했습니다.`);
            } catch (dbErr) {
                console.warn('[API/Products] DB 오버라이드 조회 실패 (무시하고 계속):', dbErr);
            }
        }

        // 3. Classify and Enrich
        const contents = naverRes.contents.map((item: any) => {
            const cp = item.channelProducts?.[0] || {};
            const override = overridesMap[item.originProductNo] || {};

            // Build temporary product object for classifier
            const productInfo = {
                name: cp.name,
                regDate: cp.regDate,
                overrideDate: override.override_date,
                sellerManagementCode: cp.sellerManagementCode,
            };

            const classification = classifyProduct(productInfo);

            return {
                originProductNo: item.originProductNo.toString(),
                channelProductNo: cp.channelProductNo?.toString(),
                name: cp.name,
                sellerManagementCode: cp.sellerManagementCode,
                regDate: cp.regDate,
                overrideDate: override.override_date,
                salePrice: cp.salePrice,
                stockQuantity: cp.stockQuantity,
                images: { representativeImage: { url: cp.representativeImage?.url } },
                exhibitionCategoryIds: item.exhibitionCategoryIds || [],
                recommendation: classification,
                currentInternalCategory: override.internal_category
            };
        });

        console.log('[API/Products] 데이터 가공 완료. 응답 전송.');

        return NextResponse.json({
            success: true,
            data: {
                ...naverRes,
                contents
            }
        });

    } catch (error: any) {
        console.error('[API/Products] 처리 오류:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
