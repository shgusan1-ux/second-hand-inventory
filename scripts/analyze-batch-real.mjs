// scripts/analyze-batch-real.mjs
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

const db = createClient({
    url,
    authToken,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function analyzeBatchReal() {
    console.log(`🚀 [Real-Schema] 안티그래비티 배치 분석 시작... (DB: ${url})`);

    if (!process.env.GEMINI_API_KEY) {
        console.error("🚨 GEMINI_API_KEY가 설정되지 않았습니다. .env.local 또는 .env.production.new 등을 확인해 주세요.");
        return;
    }

    try {
        // 1. 분석 대상 조회 (naver_product_map 스키마에 맞춰 수정)
        const result = await db.execute(`
      SELECT 
        n.origin_product_no, 
        n.name, 
        n.sale_price, 
        n.inferred_brand as brand_name
      FROM naver_product_map n
      LEFT JOIN product_overrides o ON n.origin_product_no = o.id
      WHERE o.ai_price IS NULL
      LIMIT 5
    `);

        const products = result.rows;
        console.log(`📋 분석 대상(미분석 상품): ${products.length}건`);

        if (products.length === 0) {
            console.log("✅ 모든 상품 분석 완료.");
            return;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using newer model if available

        for (const product of products) {
            console.log(`\n🔍 분석 중: [${product.origin_product_no}] ${product.name}`);

            try {
                const prompt = `
          상품명: ${product.name}
          브랜드: ${product.brand_name || 'Unknown'}
          현재 판매가: ${product.sale_price}
          
          위 중고 의류의 '적정 판매가(KRW)'와 'SEO 최적화 상품명', '상세 설명'을 JSON으로 제안해줘.
          가격은 KREAM, 번개장터 시세를 고려해줘.
          
          Format:
          {
            "suggestedPrice": number,
            "optimizedTitle": "string (45자 이내)",
            "description": "string (마크다운 없이 텍스트만)"
          }
        `;

                const aiResult = await model.generateContent([prompt]);
                const responseText = await aiResult.response.text();
                const cleanedText = responseText.replace(/```json|```/g, "").trim();
                const analysis = JSON.parse(cleanedText);

                console.log(`💡 AI 제안: ${analysis.suggestedPrice?.toLocaleString()}원 / ${analysis.optimizedTitle}`);

                // 2. DB 저장 (product_overrides 테이블 업데이트)
                await db.execute({
                    sql: `
            INSERT INTO product_overrides (id, ai_price, optimized_title, ai_description, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              ai_price = excluded.ai_price,
              optimized_title = excluded.optimized_title,
              ai_description = excluded.ai_description,
              updated_at = CURRENT_TIMESTAMP
          `,
                    args: [
                        String(product.origin_product_no),
                        analysis.suggestedPrice || 0,
                        analysis.optimizedTitle || "",
                        analysis.description || ""
                    ]
                });

                console.log(`✅ 저장 완료 (product_overrides)`);

            } catch (err) {
                console.error(`❌ 개별 분석 실패 (${product.origin_product_no}):`, err.message);
            }

            await new Promise(resolve => setTimeout(resolve, 1500));
        }

    } catch (error) {
        console.error("🚨 배치 스크립트 오류:", error);
    }
}

analyzeBatchReal();
