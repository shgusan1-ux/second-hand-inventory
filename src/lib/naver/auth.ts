export interface NaverTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getNaverAccessToken(): Promise<string> {
    const proxyUrl = (process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001').trim();
    const proxyKey = (process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key').trim();
    let clientId = process.env.NAVER_CLIENT_ID?.trim();

    // Fallback to DB if ENV is missing
    if (!clientId) {
        try {
            const { getSmartStoreConfig } = await import('../actions');
            const config = await getSmartStoreConfig();
            if (config) {
                clientId = clientId || config.clientId;
            }
        } catch (e) {
            console.error('Failed to load Naver config from DB:', e);
        }
    }

    if (!clientId || !proxyUrl || !proxyKey) {
        throw new Error('Naver API credentials or Proxy configuration is missing.');
    }

    // Return cached token if still valid (with 1 minute buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.token;
    }

    // 프록시가 bcrypt 서명을 직접 처리 (Vercel에서 $가 포함된 clientSecret 확장 문제 방지)
    const response = await fetch(`${proxyUrl}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-proxy-key': proxyKey
        },
        body: JSON.stringify({ client_id: clientId }),
    });

    const data: any = await response.json();

    if (!response.ok || !data.access_token) {
        console.error('Failed to fetch Naver Access Token via Proxy:', data);
        throw new Error(`Proxy Naver Auth Error: ${data.error || data.message || 'Unknown error'}`);
    }

    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return data.access_token;
}
