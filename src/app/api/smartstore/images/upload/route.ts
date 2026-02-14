import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob;
        const productNo = formData.get('productNo') as string;

        if (!file || !productNo) {
            return NextResponse.json({ error: 'Missing file or productNo' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Output directory in public folder
        const outputDir = path.join(process.cwd(), 'public', 'thumbnails', 'generated');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `${productNo}.jpg`;
        const outputPath = path.join(outputDir, fileName);

        fs.writeFileSync(outputPath, buffer);

        return NextResponse.json({
            success: true,
            url: `/thumbnails/generated/${fileName}`
        });

    } catch (error: any) {
        console.error('[UploadThumbnail] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
