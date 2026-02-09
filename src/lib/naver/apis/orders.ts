import { naverRequest } from '../client';

export async function getNaverOrders(params: { startDateTime?: string; endDateTime?: string } = {}) {
    // Example endpoint for product orders
    // Naver API uses /v1/pay-order/seller/product-orders/last-changed-statuses or similar
    return naverRequest('/v1/pay-order/seller/product-orders/last-changed-statuses', {
        params: {
            lastChangedFrom: params.startDateTime || new Date(Date.now() - 86400000).toISOString(),
            // Naver usually expects a specific format. ISO might need conversion.
        },
    });
}
