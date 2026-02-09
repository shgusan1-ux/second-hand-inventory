/**
 * Naver Commerce API Client
 * Optimized for the specified EC2 Proxy (Port 3001)
 */

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

export interface NaverTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export async function getNaverToken(): Promise<NaverTokenResponse> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is missing');
    }

    const response = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Naver Token Error: ${error}`);
    }

    return response.json();
}

export async function searchProducts(page: number = 1, size: number = 100, filters: any = {}) {
    const token = await getNaverToken();
    const response = await fetch(`${PROXY_URL}/v1/products/search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({
            page,
            size,
            ...filters
        }),
    });

    if (!response.ok) throw new Error('Search failed');
    return response.json();
}

export async function updateProduct(productNo: string, data: any) {
    const token = await getNaverToken();
    const response = await fetch(`${PROXY_URL}/v1/product-origins/${productNo}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Update failed');
    return response.json();
}

export async function bulkUpdateProducts(products: any[]) {
    const token = await getNaverToken();
    const response = await fetch(`${PROXY_URL}/v1/products/bulk`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({ products }),
    });

    if (!response.ok) throw new Error('Bulk update failed');
    return response.json();
}

export async function getCategories(parentCategoryId: string = '') {
    const token = await getNaverToken();
    const url = parentCategoryId
        ? `${PROXY_URL}/v1/categories/${parentCategoryId}/children`
        : `${PROXY_URL}/v1/categories`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'x-proxy-key': PROXY_KEY
        },
    });

    if (!response.ok) throw new Error('Categories fetch failed');
    return response.json();
}

export async function getRecommendTags(keyword: string) {
    const token = await getNaverToken();
    const response = await fetch(`${PROXY_URL}/v1/products/recommend-tags?keyword=${encodeURIComponent(keyword)}`, {
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'x-proxy-key': PROXY_KEY
        },
    });

    if (!response.ok) throw new Error('Tag recommendation failed');
    return response.json();
}

export async function validateTags(tags: string[]) {
    const token = await getNaverToken();
    const response = await fetch(`${PROXY_URL}/v1/products/tags/validate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({ tags }),
    });

    if (!response.ok) throw new Error('Tag validation failed');
    return response.json();
}

export interface NaverAPIOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    token: string;
    body?: any;
}

export async function callNaverAPI(path: string, options: NaverAPIOptions) {
    const { method = 'GET', token, body } = options;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${PROXY_URL}${cleanPath}`;

    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Naver API Proxy Error (${path}): ${error}`);
    }

    return response.json();
}
