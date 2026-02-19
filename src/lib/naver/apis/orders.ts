import { naverRequest } from '../client';

export async function getNaverOrders(params: { startDateTime?: string; endDateTime?: string } = {}) {
    // Example endpoint for product orders
    // Naver API uses /v1/pay-order/seller/product-orders/last-changed-statuses or similar
    const lastChangedFrom = params.startDateTime || new Date(Date.now() - 86400000).toISOString();
    return naverRequest(`/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=${encodeURIComponent(lastChangedFrom)}`);
}

/**
 * Fetch detailed order list (Good for 30-day stats)
 * Uses GET /v1/pay-order/seller/product-orders/last-changed-statuses with 24h chunking
 * Naver API enforces a strict 24h limit on date ranges.
 */
export async function getNaverOrderList(days: number = 30) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    let currentStart = new Date(start);
    let allOrders: any[] = [];

    // Loop through days in 24h chunks
    while (currentStart < end) {
        // Calculate end of this chunk (start + 24h)
        // Note: 'lastChangedFrom' is the start point. The endpoint returns changed statuses AFTER this time.
        // But it likely has a max look forward or max count.
        // Actually, last-changed-statuses takes `lastChangedFrom` and optionally `lastChangedTo` (or defaults to now/some limit).
        // If we use just `lastChangedFrom`, it might only give us a small window or error if the window is too big.
        // Let's explicitly set a small window of 24h by making multiple calls?
        // Wait, standard `last-changed-statuses` usually returns a list since `lastChangedFrom`.
        // If the window is huge, it might truncate or error.
        // Let's try 24h overlapping windows.

        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentStart.getDate() + 1);
        const effectiveEnd = currentEnd > end ? end : currentEnd;

        // Naver DateTime format: yyyy-MM-dd'T'HH:mm:ss.SSSO or ISO8601
        const fromStr = currentStart.toISOString();
        const toStr = effectiveEnd.toISOString();

        // Using last-changed-statuses with specific range if supported, otherwise just start.
        // Docs say: lastChangedFrom (mandatory), lastChangedTo (optional, default now?)
        // Error "max 24h" implies we MUST set `lastChangedTo` if we want to walk through history, 
        // OR `lastChangedFrom` can't be too old if `lastChangedTo` is omitted.

        try {
            // We use the same 'naverRequest' helper.
            // Query params: lastChangedFrom, lastChangedTo (if supported by proxy/api)
            const query = `lastChangedFrom=${encodeURIComponent(fromStr)}&lastChangedTo=${encodeURIComponent(toStr)}`;
            const res = await naverRequest(`/v1/pay-order/seller/product-orders/last-changed-statuses?${query}`);

            // Extract content safely
            const content = res?.data?.lastChangeStatuses || res?.lastChangeStatuses || [];
            if (Array.isArray(content)) {
                allOrders = [...allOrders, ...content];
            }
        } catch (e: any) {
            console.error(`Failed to fetch orders (last-changed) for ${fromStr} ~ ${toStr}:`, e.message);
        }

        // Move to next chunk
        currentStart = currentEnd;

        // Delay to avoid rate limits (Naver can be strict)
        // 429 GW.RATE_LIMIT happened with 100ms, let's try 300ms
        await new Promise(r => setTimeout(r, 300));
    }

    // Filter duplicates based on productOrderId just in case
    const uniqueOrders = Array.from(new Map(allOrders.map(item => [item.productOrderId, item])).values());

    return { data: { content: uniqueOrders } };
}
