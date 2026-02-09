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

    // Determine the final URL (Proxy vs Direct)
    // For now, let's use direct if it works, or fallback to proxy if configured
    let urlString = `${NAVER_API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // If proxy is provided and we want to use it
    if (proxyUrl && proxyUrl.includes('15.164.216.212')) {
        // Only use proxy if it's explicitly desired, but since it's failing IP check, 
        // we'll default to Direct for this user environment.
        console.log(`Using Direct Connection for ${endpoint}`);
    } else if (proxyUrl) {
        urlString = `${proxyUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    }

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
            ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`Naver API Request Error (${endpoint}):`, JSON.stringify(data, null, 2));
        throw new Error(JSON.stringify(data));
    }

    return data as T;
}
