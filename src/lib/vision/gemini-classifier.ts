/**
 * Gemini 2.5 Pro Vision 기반 상품 분류기
 * 안정 릴리즈 + thinking 모드 = 최고 정확도
 */

import type { GeminiVisionResult } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function fetchImageAsBase64(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for high-res images
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Gemini Vision으로 상품 이미지 분류
 * @param imageUrls 이미지 URL 배열 (대표 + 상세, 최대 4장)
 * @param productName 상품명 (텍스트 힌트)
 */
export async function classifyProductByVision(
  imageUrls: string[],
  productName: string
): Promise<GeminiVisionResult | null> {
  if (!GEMINI_API_KEY || imageUrls.length === 0) return null;

  const prompt = `당신은 중고 의류 전문 감정사입니다. 이미지를 정밀하게 분석하여 다음 정보를 JSON으로 추출하세요.

상품명 참고: ${productName}

추출 항목:
1. brand: 브랜드명 (로고, 라벨, 텍스트에서 식별. 불확실하면 빈 문자열)
2. clothingType: 다음 중 하나 - "상의", "하의", "아우터", "원피스", "기타"
3. clothingSubType: 구체적 타입. 예시:
   - 상의: 티셔츠, 셔츠, 블라우스, 니트, 스웨터, 후디, 맨투맨, 폴로, 롱슬리브, 탱크탑
   - 하의: 팬츠, 데님, 스커트, 쇼츠, 슬랙스, 조거, 카고
   - 아우터: 자켓, 코트, 블레이저, 가디건, 베스트, 야상, 패딩, 트렌치코트, 윈드브레이커
   - 원피스: 원피스, 드레스, 점프수트
4. gender: "MAN", "WOMAN", "UNISEX", "UNKNOWN" 중 하나
5. grade: 상태 등급
   - "S급": 새상품급, 사용감 없음
   - "A급": 사용감 적음, 상태 양호
   - "B급": 사용감 있음, 오염/손상 있음
6. gradeReason: 등급 판정 근거 (한국어, 구체적)
7. colors: 주요 색상 배열 (한국어) 예: ["네이비", "화이트"]
8. pattern: 패턴 하나 - "솔리드", "스트라이프", "체크", "도트", "프린트", "카모", "페이즐리", "기타"
9. fabric: 추정 소재 (라벨 보이면 그대로, 아니면 추정) 예: "면 100%", "폴리에스터 혼방"
10. size: 사이즈 (라벨 식별, 없으면 빈 문자열)
11. confidence: 전체 분석 신뢰도 (0-100)

다음 JSON 형식으로만 답변:
{"brand":"","clothingType":"상의","clothingSubType":"셔츠","gender":"MAN","grade":"A급","gradeReason":"","colors":[""],"pattern":"솔리드","fabric":"","size":"","confidence":70}`;

  try {
    // 이미지 파트 준비 (최대 4장)
    const imageParts = [];
    const urls = imageUrls.slice(0, 4);

    for (const url of urls) {
      try {
        const base64 = await fetchImageAsBase64(url);
        imageParts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64
          }
        });
      } catch (e) {
        console.warn(`[Vision] 이미지 로드 실패: ${url}`, e);
      }
    }

    if (imageParts.length === 0) return null;

    console.log(`[Vision] Gemini API 호출: ${imageParts.length}장 이미지, key=${GEMINI_API_KEY.substring(0, 8)}...`);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Vision] Gemini API HTTP ${response.status}:`, JSON.stringify(data).substring(0, 500));
      return null;
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('[Vision] Gemini 응답에 text 없음:', JSON.stringify(data).substring(0, 500));
      return null;
    }

    const text = data.candidates[0].content.parts[0].text;
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      brand: result.brand || '',
      clothingType: result.clothingType || '기타',
      clothingSubType: result.clothingSubType || '',
      gender: result.gender || 'UNKNOWN',
      grade: result.grade || 'A급',
      gradeReason: result.gradeReason || '',
      colors: Array.isArray(result.colors) ? result.colors : [],
      pattern: result.pattern || '솔리드',
      fabric: result.fabric || '',
      size: result.size || '',
      confidence: Math.min(100, Math.max(0, result.confidence || 0))
    };
  } catch (error) {
    console.error('[Vision] classifyProductByVision error:', error);
    return null;
  }
}
