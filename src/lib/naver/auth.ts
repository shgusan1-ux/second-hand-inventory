import bcrypt from 'bcryptjs';

export interface NaverTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getNaverAccessToken(): Promise<string> {
    const proxyUrl = process.env.SMARTSTORE_PROXY_URL;
    const proxyKey = process.env.SMARTSTORE_PROXY_KEY;
    let clientId = process.env.NAVER_CLIENT_ID;
    let clientSecret = process.env.NAVER_CLIENT_SECRET;

    // Fallback to DB if ENV is missing for credentials
    if (!clientId || !clientSecret) {
        try {
            const { getSmartStoreConfig } = await import('../actions');
            const config = await getSmartStoreConfig();
            if (config) {
                clientId = clientId || config.clientId;
                clientSecret = clientSecret || config.clientSecret;
            }
        } catch (e) {
            console.error('Failed to load Naver config from DB:', e);
        }
    }

    if (!clientId || !clientSecret || !proxyUrl || !proxyKey) {
        throw new Error('Naver API credentials or Proxy configuration is missing.');
    }

    // Return cached token if still valid (with 1 minute buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.token;
    }

    const timestamp = Date.now();
    // Naver Commerce API uses bcrypt where the clientSecret is the salt.
    const signature = bcrypt.hashSync(`${clientId}_${timestamp}`, clientSecret);

    const body = {
        client_id: clientId,
        timestamp: timestamp.toString(),
        grant_type: 'client_credentials',
        client_secret_sign: signature,
        type: 'SELF'
    };

    const response = await fetch(`${proxyUrl}/naver/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-proxy-key': proxyKey
        },
        body: JSON.stringify(body),
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
