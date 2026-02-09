import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/naver-api-client';
import { classifyProduct } from '@/lib/product-classifier';
import { db } from '@vercel/postgres';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');
    const name = searchParams.get('name') || '';

    try {
        // 1. Fetch from Naver via Proxy
        const naverRes = await searchProducts(page, size, { searchKeyword: name });

        if (!naverRes || !naverRes.contents) {
            return NextResponse.json({ success: true, data: naverRes });
        }

        // 2. Fetch Overrides from DB
        const ids = naverRes.contents.map((item: any) => item.originProductNo.toString());
        let overridesMap: Record<string, any> = {};

        try {
            const { rows } = await db.query(
                'SELECT id, override_date, internal_category FROM product_overrides WHERE id = ANY($1)',
                [ids]
            );
            overridesMap = rows.reduce((acc: any, row: any) => {
                acc[row.id] = row;
                return acc;
            }, {});
        } catch (dbErr) {
            console.warn('Overrides DB lookup failed, proceeding without overrides:', dbErr);
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

        return NextResponse.json({
            success: true,
            data: {
                ...naverRes,
                contents
            }
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
