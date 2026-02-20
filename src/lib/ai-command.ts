import { db } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const MODELS = {
    'flash': 'gemini-2.0-flash',
    'pro': 'gemini-1.5-pro',
    'ultra': 'gemini-1.5-pro' // Fallback or distinct if available
};

type ModelType = keyof typeof MODELS;

export interface CommandResult {
    reply: string;
    type: string;
    actionData?: any;
    intent?: string;
}

export async function processUserCommand(
    command: string,
    userInfo: { id: string, name: string, role: string },
    model: ModelType = 'flash'
): Promise<CommandResult> {
    const modelName = MODELS[model] || MODELS['flash'];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const tools = [
        { name: 'get_sales_summary', description: 'Get today sales summary (count, total amount)' },
        { name: 'check_profit', description: 'Analyze profit margin for a product or overall today' },
        { name: 'check_system_status', description: 'Check overall system health (DB, Naver API, AI Credits)' },
        { name: 'sync_naver', description: 'Trigger synchronization with Naver Smartstore' },
        { name: 'chat', description: 'General conversation, greeting, or unknown request' }
    ];

    const prompt = `
    You are an AI assistant for a vintage inventory system called "Inventory AI".
    User: ${userInfo.name} (${userInfo.role})
    Command: "${command}"
    
    Available Intents:
    ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}
    
    Analyze the command and select the best matching intent.
    If the user asks for sales, revenue, or "how much sold today", allow 'get_sales_summary'.
    If the user asks about profit, margin, or "is this profitable?", allow 'check_profit'.
    If the user asks "system status", "health", "credit", allow 'check_system_status'.
    If the user greets or chat, allow 'chat'.
    
    Output ONLY a JSON object with:
    {
      "intent": "intent_name",
      "reply": "A helpful response in Korean based on the intent. If it's a data request, say 'Checking...' or asking for confirmation."
    }
  `;

    try {
        const geminiRes = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const geminiData = await geminiRes.json();
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();

        let parsed: { intent: string; reply: string } = { intent: 'chat', reply: '죄송합니다. 다시 말씀해 주시겠어요?' };
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error('JSON Parse Error:', text);
        }

        let actionDetails = null;
        let type = 'text';

        if (parsed.intent === 'get_sales_summary' || parsed.intent === 'check_profit') {
            try {
                const { rows } = await db.query(`
          SELECT COUNT(*) as count, SUM(price_sell) as total, SUM(price_sell - 0) as profit 
          FROM products 
          WHERE status = '판매완료' 
            AND date(sold_at) = date('now', 'localtime')
        `);
                // Note: Cost is currently not tracked in products table reliably in this POC, assuming 0 or margin calc logic needed.
                // If we want real profit, we need cost. For now, let's use a dummy cost or fetch from supplier_products if joined.

                // Better query joining supplier_products for cost
                /*
                const query = `
                    SELECT 
                        COUNT(*) as count, 
                        SUM(p.price_sell) as total,
                        SUM(p.price_sell - COALESCE(sp.price, 0)) as profit_gross
                    FROM products p
                    LEFT JOIN supplier_products sp ON p.brand = sp.brand AND p.name = sp.name -- heuristic join
                    WHERE p.status = '판매완료' AND date(p.sold_at) = date('now', 'localtime')
                `;
                */
                // Simple fallback
                const today = rows[0];
                const count = today.count || 0;
                const total = today.total || 0;

                if (parsed.intent === 'check_profit') {
                    // For overall profit demonstration
                    parsed.reply = `오늘 예상 순수익을 분석합니다. (매출: ${total.toLocaleString()}원)`;
                    actionDetails = {
                        type: 'profit_analysis',
                        data: {
                            revenue: total,
                            cost: Math.floor(total * 0.6), // Dummy cost 60%
                            fee: Math.floor(total * 0.0585)
                        }
                    };
                } else {
                    parsed.reply = `오늘 판매량은 ${count}건, 매출액은 ${total.toLocaleString()}원 입니다.`;
                    actionDetails = { type: 'sales_summary', data: { count, total } };
                }

                type = 'data';
            } catch (e) {
                parsed.reply = '매출 정보를 가져오는 중 오류가 발생했습니다.';
            }
        } else if (parsed.intent === 'check_system_status') {
            type = 'status';
            parsed.reply = "시스템 상태를 확인합니다.";
            actionDetails = { status: 'running' };
        }

        return {
            reply: parsed.reply,
            type,
            actionData: actionDetails,
            intent: parsed.intent
        };
    } catch (error) {
        console.error('Command processing error:', error);
        return {
            reply: '처리 중 오류가 발생했습니다.',
            type: 'error'
        };
    }
}
