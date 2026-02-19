import { naverRequest } from '../client';
import { getNaverOrders, getNaverOrderList } from './orders';

export async function getNaverChannels() {
    return naverRequest('/v1/seller/channels');
}

/**
 * 상품 성과 API (상품별 결제 데이터)
 * @param channelNo 채널 번호
 * @param date YYYY-MM-DD
 */
export async function getProductPerformance(channelNo: string | number, date: string) {
    return naverRequest(`/v1/bizdata-stats/channels/${channelNo}/sales/product/detail?date=${date}`);
}

/**
 * 마케팅 채널별 성과 API
 */
export async function getMarketingPerformance(channelNo: string | number, date: string) {
    return naverRequest(`/v1/bizdata-stats/channels/${channelNo}/sales/product-marketing/detail?date=${date}`);
}

/**
 * 시간대별 판매 성과 API
 */
export async function getHourlySalesPerformance(channelNo: string | number, date: string) {
    return naverRequest(`/v1/bizdata-stats/channels/${channelNo}/sales/hourly/detail?date=${date}`);
}

/**
 * 주문 데이터를 기반으로 한 간단한 요약 통계
 * Uses Search API for better accuracy over 30 days
 */
export async function getOrdersSummary(days: number = 30) {
    // const startDateTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    // const orders = await getNaverOrders({ startDateTime });

    // Use List Search API
    const orders = await getNaverOrderList(days);

    // Search API typically returns a list of orders (or changed statuses)
    // We need to handle potential different structures: `content` (from search) or `lastChangeStatuses` (from last-changed)
    const contents = orders?.data?.content || orders?.data?.lastChangeStatuses || orders?.content || [];

    // Filter for valid sales to calculate amount
    // Valid statuses: PAYMENT_COMPLETED, PREPARING_PRODUCT, SHIPPING, DELIVERY_COMPLETED, DECIDED_TO_PURCHASE
    // Naver Search API returns status codes which might differ slightly (e.g. PAYED vs PAYMENT_COMPLETED)
    // Exclude: WAITING_FOR_PAYMENT, CANCELLED, RETURNED, EXCHANGED (unless exchange completed?)
    const validStatuses = [
        'PAYMENT_COMPLETED', 'PAYED',
        'PREPARING_PRODUCT', 'PRODUCT_PREPARING',
        'SHIPPING', 'IN_DELIVERY',
        'DELIVERY_COMPLETED', 'DELIVERY_DONE',
        'PURCHASE_DECIDED', 'DECIDED', 'CONFIRM_OVER'
    ];

    // Note: The object key for status might vary depending on endpoint. 
    // last-changed-statuses returns `productOrderStatus`
    // product-orders (search) returns `productOrderStatus`

    const validOrders = contents.filter((o: any) => validStatuses.includes(o.productOrderStatus));

    const summary = {
        totalCount: validOrders.length, // Count only valid sales? Or all orders? Usually "Sales" implies valid.
        // Let's keep totalCount as "All interaction count" or "Order Count" but totalAmount as "Sales Amount"
        // Actually, user probably wants "Orders Placed" (including cancels initially) vs "Revenue".
        // Let's count ALL for 'totalCount' but 'totalAmount' only for valid.
        allOrdersCount: contents.length,
        totalAmount: validOrders.reduce((acc: number, curr: any) => acc + (curr.totalPaymentAmount || curr.payAmount || 0), 0),
        statusCounts: {} as Record<string, number>,
    };

    contents.forEach((order: any) => {
        const status = order.productOrderStatus;
        if (status) {
            summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
        }
    });

    return summary;
}

/**
 * 모든 통계를 한꺼번에 가져오는 헬퍼 함수
 */
export async function getAllNaverStats(date?: string) {
    const channels = await getNaverChannels().catch((e) => {
        console.error('[NaverStats] Failed to fetch channels:', e.message);
        return [];
    });
    const targetDate = date || new Date().toISOString().split('T')[0];

    const ordersSummary = await getOrdersSummary(30).catch((e) => {
        console.error('[NaverStats] Failed to fetch orders summary:', e.message);
        return null;
    });

    const channel = channels[0];
    if (!channel) {
        return {
            channels: [],
            targetDate,
            ordersSummary,
            productPerformance: null,
            marketingPerformance: null,
            hourlyPerformance: null,
        };
    }

    const channelNo = channel.channelNo;

    // 병렬로 요청
    const [productPerf, marketingPerf, hourlyPerf] = await Promise.allSettled([
        getProductPerformance(channelNo, targetDate),
        getMarketingPerformance(channelNo, targetDate),
        getHourlySalesPerformance(channelNo, targetDate)
    ]);

    return {
        channels,
        targetDate,
        ordersSummary,
        productPerformance: productPerf.status === 'fulfilled' ? productPerf.value : null,
        marketingPerformance: marketingPerf.status === 'fulfilled' ? marketingPerf.value : null,
        hourlyPerformance: hourlyPerf.status === 'fulfilled' ? hourlyPerf.value : null,
    };
}
