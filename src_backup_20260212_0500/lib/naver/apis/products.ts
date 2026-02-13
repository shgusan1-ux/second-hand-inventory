import { naverRequest } from '../client';

export async function getNaverProducts(params: { page?: number; size?: number; name?: string } = {}) {
    // Example endpoint for searching products
    // Naver API uses different endpoints. A common one is /v1/products/search
    return naverRequest('/v1/products/search', {
        method: 'POST',
        body: JSON.stringify({
            page: params.page || 1,
            size: params.size || 10,
            searchKeyword: params.name || '',
        }),
    });
}

export async function getNaverProduct(productId: string) {
    return naverRequest(`/v1/products/${productId}`);
}
