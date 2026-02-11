import { naverRequest } from '../client';

export async function getNaverOrders(params: { startDateTime?: string; endDateTime?: string } = {}) {
    // Example endpoint for product orders
    // Naver API uses /v1/pay-order/seller/product-orders/last-changed-statuses or similar
    const lastChangedFrom = params.startDateTime || new Date(Date.now() - 86400000).toISOString();
    return naverRequest(`/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=${encodeURIComponent(lastChangedFrom)}`);
}
