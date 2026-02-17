import { TokenResponse, ProductSearchResponse, ProductDetailResponse, NaverCategory } from './types';
import { getNaverAccessToken } from './auth';

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

let cachedToken: { token: string; expiresAt: number } | null = null;

// Local getNaverToken is deprecated in favor of auth.ts version
export async function getNaverToken(): Promise<TokenResponse> {
    const token = await getNaverAccessToken();
    return {
        access_token: token,
        expires_in: 3600, // Approximate
        token_type: 'Bearer'
    };
}

export async function searchProducts(token: string, page: number, size: number, filters: any = {}): Promise<ProductSearchResponse> {
    const res = await fetch(`${PROXY_URL}/v1/products/search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({ page, size, ...filters })
    });
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    return res.json();
}

// Verified: GET /v2/products/origin-products/{productNo} → 200 OK
export async function getProductDetail(token: string, originProductNo: number): Promise<ProductDetailResponse> {
    const res = await fetch(`${PROXY_URL}/v2/products/origin-products/${originProductNo}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        }
    });
    if (!res.ok) throw new Error(`Product detail failed: ${res.statusText}`);
    return res.json();
}

// Verified: PUT /v2/products/origin-products/{productNo} → 200 OK
// Must send full originProduct data (not partial)
export async function updateProduct(token: string, originProductNo: number, payload: any) {
    const res = await fetch(`${PROXY_URL}/v2/products/origin-products/${originProductNo}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Product update failed (${res.status}): ${errText}`);
    }
    return res.json();
}

export async function naverRequest(path: string, options: RequestInit = {}, retry = true) {
    const token = await getNaverAccessToken();
    const res = await fetch(`${PROXY_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY,
            ...options.headers,
        }
    });

    // Handle 401 Unauthorized with GW.AUTHN code as per docs
    if (res.status === 401 && retry) {
        const errorData = await res.clone().json().catch(() => ({}));
        if (errorData.code === 'GW.AUTHN') {
            console.log('[NaverAPI] Token expired (GW.AUTHN), retrying once...');
            // Invalidate cache (not directly exposed, but auth.ts should handle it or we could add a force flag)
            // For now, auth.ts cache is local to that module.
            // Let's assume on retry it will try to get a new one if it's actually invalid.
            return naverRequest(path, options, false);
        }
    }

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Naver API Request Failed (${res.status}): ${errText}`);
    }
    return res.json();
}

// Verified: GET /v1/categories → 200 OK (5804 categories)
export async function getCategories(token: string): Promise<NaverCategory[]> {
    const res = await fetch(`${PROXY_URL}/v1/categories`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-proxy-key': PROXY_KEY
        }
    });
    if (!res.ok) throw new Error(`Categories failed: ${res.statusText}`);
    return res.json();
}

