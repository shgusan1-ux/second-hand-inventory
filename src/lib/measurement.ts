/**
 * AI 기반 의류 실측 사이즈 측정 시스템
 * 
 * 기능:
 * 1. 이미지 속 옷걸이 너비를 기준으로 의류의 주요 치수(총장, 어깨, 가슴, 소매)를 추정
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface SizeEstimationResult {
    length: number;    // 총장
    shoulder: number;  // 어깨
    chest: number;     // 가슴
    sleeve: number;    // 소매
    reason: string;    // 측정 근거
    confidence: number;// 신뢰도
}

/**
 * 1. 이미지에서 사이즈 추정
 */
export async function estimateClothingSize(imageUrl: string, referenceWidthCm: number = 42): Promise<SizeEstimationResult> {
    try {
        const prompt = `
당신은 중고 의류 실측 전문가입니다. 
이미지에 있는 의류가 옷걸이에 걸려 있습니다. 
**옷걸이의 가로 너비는 정확히 ${referenceWidthCm}cm**라고 가정하고, 이를 기준으로 의류의 실측 사이즈를 추측해주세요.

추측해야 할 항목:
1. length (총장): 넥라인 옆점부터 밑단까지의 수직 길이
2. shoulder (어깨너비): 양쪽 어깨 봉제선 사이의 수평 길이
3. chest (가슴너비): 겨드랑이 밑점 사이의 수평 길이
4. sleeve (소매길이): 어깨 봉제선부터 소매 끝까지의 길이

추측 근거와 함께 다음 JSON 형식으로만 답변하세요:
{
  "length": 72,
  "shoulder": 50,
  "chest": 58,
  "sleeve": 62,
  "reason": "옷걸이 너비가 42cm일 때, 옷의 가슴 단면은 옷걸이보다 약 1.4배 넓어 보이므로 약 58cm로 추정됨...",
  "confidence": 80
}

단위는 cm이며 숫자만 적어주세요.
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: await fetchImageAsBase64(imageUrl)
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error('Gemini API error during size estimation:', data);
            throw new Error('AI 사이즈 측정 실패');
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            length: Number(result.length) || 0,
            shoulder: Number(result.shoulder) || 0,
            chest: Number(result.chest) || 0,
            sleeve: Number(result.sleeve) || 0,
            reason: result.reason || '',
            confidence: result.confidence || 0
        };
    } catch (error) {
        console.error('Size estimation error:', error);
        throw error;
    }
}

async function fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}
