import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import {
    generateEditorialImage,
    generateTemplateCard,
    generateCaption,
    generateBlogHTML,
    generateBrandContent,
    type SNSPlatform,
    type SNSProduct,
    type ContentCategory,
    PLATFORM_SPECS,
} from '@/lib/sns-marketing';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { product, platform, contentType, contentCategory, topic } = body as {
            product?: SNSProduct;
            platform: SNSPlatform;
            contentType: 'editorial-image' | 'template-card' | 'caption' | 'blog-html' | 'brand-content';
            contentCategory?: ContentCategory;
            topic?: string;
        };

        if (!platform || !PLATFORM_SPECS[platform]) {
            return NextResponse.json({ error: '유효한 플랫폼을 선택해주세요' }, { status: 400 });
        }

        // 브랜드 콘텐츠 (상품 불필요)
        if (contentType === 'brand-content') {
            if (!contentCategory) {
                return NextResponse.json({ error: '콘텐츠 카테고리를 선택해주세요' }, { status: 400 });
            }
            console.log(`[SNS Content] 브랜드 콘텐츠 생성: ${contentCategory} / ${platform} / topic: ${topic || '자동'}`);
            const result = await generateBrandContent(contentCategory, platform, topic);
            return NextResponse.json({ success: true, ...result });
        }

        // 이하 상품 기반 콘텐츠 — product 필수
        if (!product) {
            return NextResponse.json({ error: '상품 정보가 필요합니다' }, { status: 400 });
        }

        switch (contentType) {
            case 'editorial-image': {
                console.log(`[SNS Content] AI 에디토리얼 이미지 생성: ${platform} / ${product.name}`);
                const result = await generateEditorialImage(product, platform);
                if (!result) {
                    return NextResponse.json({ error: 'AI 이미지 생성 실패 (Gemini 응답 없음)' }, { status: 500 });
                }

                const buffer = Buffer.from(result.imageBase64, 'base64');
                const ext = result.mimeType.includes('png') ? 'png' : 'jpg';
                const filename = `sns-marketing/${platform}/${product.id}-editorial-${Date.now()}.${ext}`;
                const blob = await put(filename, buffer, {
                    access: 'public',
                    contentType: result.mimeType,
                });

                console.log(`[SNS Content] 에디토리얼 이미지 업로드 완료: ${blob.url}`);
                return NextResponse.json({ success: true, imageUrl: blob.url });
            }

            case 'template-card': {
                console.log(`[SNS Content] 템플릿 카드 생성: ${platform} / ${product.name}`);
                const spec = PLATFORM_SPECS[platform];
                if (!spec.width || !spec.height) {
                    return NextResponse.json({ error: `${spec.nameKr}는 이미지 템플릿을 지원하지 않습니다` }, { status: 400 });
                }

                const imageBuffer = await generateTemplateCard(product, platform);
                const filename = `sns-marketing/${platform}/${product.id}-template-${Date.now()}.jpg`;
                const blob = await put(filename, imageBuffer, {
                    access: 'public',
                    contentType: 'image/jpeg',
                });

                console.log(`[SNS Content] 템플릿 카드 업로드 완료: ${blob.url}`);
                return NextResponse.json({ success: true, imageUrl: blob.url });
            }

            case 'caption': {
                console.log(`[SNS Content] 캡션/해시태그 생성: ${platform} / ${product.name}`);
                const result = await generateCaption(product, platform);
                return NextResponse.json({ success: true, ...result });
            }

            case 'blog-html': {
                console.log(`[SNS Content] 블로그 HTML 생성: ${product.name}`);
                const htmlContent = generateBlogHTML(product);
                return NextResponse.json({ success: true, htmlContent });
            }

            default:
                return NextResponse.json({ error: '지원하지 않는 콘텐츠 타입' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[SNS Content API] Error:', error);
        return NextResponse.json({ error: error.message || 'SNS 콘텐츠 생성 실패' }, { status: 500 });
    }
}
