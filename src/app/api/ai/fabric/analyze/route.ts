import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeImage, extractKeywords } from '@/lib/google-vision';
import { extractFabricFromOCR } from '@/lib/fabric-extractor';

export async function POST(req: NextRequest) {
    try {
        const { productIds } = await req.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            updated: [] as any[],
            errors: [] as any[]
        };

        // Analyze sequentially to avoid overwhelming the API
        for (const id of productIds) {
            try {
                // Fetch Product
                const productRes = await db.query(
                    `SELECT id, name, image_url, fabric FROM products WHERE id = $1`,
                    [id]
                );
                const product = productRes.rows[0];

                if (!product || !product.image_url) {
                    results.failed++;
                    continue;
                }

                // 1. Prioritize images that might be labels (file name hint)
                const allImages = product.image_url.split(',').map((url: string) => url.trim());
                const labelImages = allImages.filter((url: string) =>
                    url.toLowerCase().includes('label') ||
                    url.toLowerCase().includes('care') ||
                    url.toLowerCase().includes('tag')
                );

                // Use label images first, then fallback to others (limit to 3 total analysis per product to save cost)
                const targetImages = [...labelImages, ...allImages.filter((url: string) => !labelImages.includes(url))].slice(0, 3);

                let foundFabric = null;

                for (const imgUrl of targetImages) {
                    if (foundFabric) break; // Stop if already found

                    // Call Vision API
                    const visionResult = await analyzeImage(imgUrl);

                    // Extract OCR text
                    const ocrText = visionResult.text?.[0]?.description || '';

                    // Extract Fabric
                    const extracted = extractFabricFromOCR(ocrText);

                    if (extracted) {
                        foundFabric = extracted;
                        // Found fabric! Stop processing other images for this product.
                        break;
                    }
                }

                if (foundFabric) {
                    // Update DB
                    await db.query(
                        `UPDATE products SET fabric = $1 WHERE id = $2`,
                        [foundFabric, id]
                    );
                    results.success++;
                    results.updated.push({ id, name: product.name, fabric: foundFabric });
                } else {
                    results.failed++; // No fabric found
                    results.errors.push({ id, error: 'Fabric info not found in OCR' });
                }

            } catch (err: any) {
                console.error(`Error processing product ${id}:`, err);
                results.failed++;
                results.errors.push({ id, error: err.message });
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error('Bulk fabric analysis error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
