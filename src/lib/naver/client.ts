import { getNaverAccessToken } from './auth';

export interface NaverRequestOptions extends RequestInit {
    params?: Record<string, string>;
}

const NAVER_API_BASE_URL = 'https://api.commerce.naver.com/external';

export async function naverRequest<T = any>(
    endpoint: string,
    options: NaverRequestOptions = {}
): Promise<T> {
    const token = await getNaverAccessToken();
    const proxyUrl = process.env.SMARTSTORE_PROXY_URL;
    const proxyKey = process.env.SMARTSTORE_PROXY_KEY;

    if (!proxyUrl) {
        throw new Error('SMARTSTORE_PROXY_URL is required to avoid IP exposure.');
    }

    // Security Guard: Prevent direct calls to Naver domain even if someone tries to override endpoint
    if (endpoint.includes('api.commerce.naver.com')) {
        throw new Error('Direct calls to Naver domain are forbidden. Use relative paths for the proxy.');
    }

    // Always route through Proxy
    const urlString = `${proxyUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const url = new URL(urlString);

    if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    const response = await fetch(url.toString(), {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': proxyKey || '',
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`Naver API Proxy Error (${endpoint}):`, JSON.stringify(data, null, 2));
        throw new Error(JSON.stringify(data));
    }

    return data as T;
}
