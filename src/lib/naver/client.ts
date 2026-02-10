
import { TokenResponse, ProductSearchResponse } from './types';

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getNaverToken(): Promise<TokenResponse> {
    // Return cached token if valid (with 60s buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return {
            access_token: cachedToken.token,
            expires_in: Math.floor((cachedToken.expiresAt - Date.now()) / 1000),
            token_type: 'Bearer'
        };
    }

    const res = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        }),
        cache: 'no-store'
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Token fetch failed (${res.status}): ${error}`);
    }

    const data: TokenResponse = await res.json();

    // Cache the token
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };

    return data;
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

export async function bulkUpdateProducts(token: string, products: any[]) {
    const res = await fetch(`${PROXY_URL}/v1/products/bulk`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({ products })
    });
    if (!res.ok) throw new Error(`Bulk update failed: ${res.statusText}`);
    return res.json();
}

export async function naverRequest(path: string, options: RequestInit = {}) {
    const tokenData = await getNaverToken();
    const res = await fetch(`${PROXY_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY,
            ...options.headers,
        }
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Naver API Request Failed (${res.status}): ${errText}`);
    }
    return res.json();
}
