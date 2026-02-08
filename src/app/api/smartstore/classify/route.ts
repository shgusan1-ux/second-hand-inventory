import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { imageUrl, productName, brand } = await request.json();

        if (!imageUrl || !productName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `당신은 빈티지/아카이브 패션 전문가입니다. 다음 상품을 분석하여 정확히 하나의 카테고리로 분류하세요.

**상품 정보:**
- 상품명: ${productName}
- 브랜드: ${brand || '알 수 없음'}

**분류 카테고리 (5가지 중 1개만 선택):**

1. **MILITARY** - 밀리터리 빈티지 및 밀스펙
   - M65, MA-1, BDU, 카고팬츠, 플라이트 재킷
   - ALPHA, ROTHCO, PROPPER, 군복, 밀리터리 재킷

2. **WORKWEAR** - 워크웨어 빈티지
   - Carhartt, Dickies, 데님, 작업복
   - Coverall, Overalls, 페인터 팬츠, 메카닉 재킷

3. **JAPAN** - 일본 브랜드 아카이브
   - Visvim, Kapital, Neighborhood, WTAPS, Undercover
   - Comme des Garcons, Yohji Yamamoto, Issey Miyake
   - Nanamica, Engineered Garments, Needles

4. **EUROPE** - 유럽 헤리티지 브랜드
   - Barbour, Burberry, Aquascutum, Lavenham
   - Mackintosh, Daks, Grenfell

5. **BRITISH** - 영국 클래식 브랜드
   - Fred Perry, Ben Sherman, Baracuta
   - Clarks, Dr. Martens, Paul Smith
   - Margaret Howell

**분류 기준:**
1. 브랜드가 명확하면 브랜드 기준으로 분류
2. 브랜드가 불명확하면 상품의 스타일/디자인으로 분류
3. 이미지의 디테일(패치, 로고, 소재, 실루엣)을 참고
4. 애매한 경우 가장 가까운 카테고리 선택

**응답 형식 (JSON):**
{
  "category": "MILITARY" | "WORKWEAR" | "JAPAN" | "EUROPE" | "BRITISH",
  "confidence": 0-100,
  "reason": "분류 근거 (한 문장)"
}

이미지와 상품명을 종합적으로 분석하여 가장 적합한 카테고리를 선택하세요.`;

        // 이미지 fetch
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');

        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg'
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();

        // JSON 추출
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid AI response format');
        }

        const classification = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            success: true,
            classification
        });

    } catch (error) {
        console.error('Classification error:', error);
        return NextResponse.json(
            { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
