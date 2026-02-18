import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function detectBadgeInImage(imageUrl: string): Promise<{ hasBadge: boolean; confidence: number }> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 이미지 데이터를 가져와야 함 (URL -> Base64)
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        const prompt = `
            Analyze this product image and determine if it has a 'grade badge' (a circular or stylish badge showing grades like S, A, B, or V).
            The badge is usually semi-transparent and located at the top-right or corner of the image.
            
            Return ONLY a JSON object in this format:
            {"hasBadge": boolean, "confidence": number (0-100)}
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const text = result.response.text();
        const json = JSON.parse(text.replace(/```json|```/g, "").trim());

        return {
            hasBadge: !!json.hasBadge,
            confidence: json.confidence || 0
        };
    } catch (error) {
        console.error('[BadgeDetector] Error:', error);
        return { hasBadge: false, confidence: 0 };
    }
}
