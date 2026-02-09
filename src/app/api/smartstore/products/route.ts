import { NextResponse } from 'next/server';
import { naverRequest } from '@/lib/naver/client';
import { db } from '@vercel/postgres';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '50');
    const name = searchParams.get('name') || '';

    try {
        // 1. Fetch from Naver
        const naverRes = await naverRequest('/v1/products/search', {
            method: 'POST',
            body: JSON.stringify({
                page: page,
                size: size,
                searchKeyword: name,
            }),
        });

        if (!naverRes || !naverRes.contents) {
            return NextResponse.json({ success: true, data: naverRes });
        }

        // 2. Extract seller codes for DB lookup
        const sellerCodes = naverRes.contents
            .map((item: any) => item.channelProducts?.[0]?.sellerManagementCode)
            .filter(Boolean);

        let dbProductsMap: Record<string, any> = {};

        if (sellerCodes.length > 0) {
            try {
                const client = await db.connect();
                const { rows } = await client.query(
                    'SELECT id, master_reg_date, archive FROM products WHERE id = ANY($1)',
                    [sellerCodes]
                );
                dbProductsMap = rows.reduce((acc: any, row: any) => {
                    acc[row.id] = row;
                    return acc;
                }, {});
            } catch (dbErr) {
                console.error('DB enrichment failed:', dbErr);
            }
        }

        // 3. Flatten and Enrichment
        const enrichedContents = naverRes.contents.map((item: any) => {
            const cp = item.channelProducts?.[0] || {};
            const dbData = dbProductsMap[cp.sellerManagementCode] || {};

            // Priority: Local DB master_reg_date > Naver regDate
            const finalRegDate = dbData.master_reg_date || cp.regDate;

            return {
                originProductNo: item.originProductNo?.toString(),
                channelProductNo: cp.channelProductNo?.toString(),
                name: cp.name,
                sellerManagementCode: cp.sellerManagementCode,
                regDate: finalRegDate, // This will be used for both display and days calculation
                salePrice: cp.salePrice,
                stockQuantity: cp.stockQuantity,
                images: { representativeImage: { url: cp.representativeImage?.url } },
                exhibitionCategoryIds: item.exhibitionCategoryIds || [],
                dbArchive: dbData.archive
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                ...naverRes,
                contents: enrichedContents
            }
        });
    } catch (error: any) {
        console.error('Failed to fetch Naver products:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
