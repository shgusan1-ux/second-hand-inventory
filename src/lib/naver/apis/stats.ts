import { naverRequest } from '../client';
import { getNaverOrders } from './orders';

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
 */
export async function getOrdersSummary(days: number = 7) {
    const startDateTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const orders = await getNaverOrders({ startDateTime });

    // 간단한 집계 logic
    const contents = orders.contents || [];
    const summary = {
        totalCount: contents.length,
        totalAmount: contents.reduce((acc: number, curr: any) => acc + (curr.payAmount || 0), 0),
        statusCounts: {} as Record<string, number>,
    };

    contents.forEach((order: any) => {
        const status = order.productOrderStatus;
        summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
    });

    return summary;
}

/**
 * 모든 통계를 한꺼번에 가져오는 헬퍼 함수
 */
export async function getAllNaverStats(date?: string) {
    const channels = await getNaverChannels();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const ordersSummary = await getOrdersSummary(30).catch(() => null);

    // 채널이 여러 개일 수 있으므로 첫 번째 채널을 사용하거나 루프를 돌림
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
