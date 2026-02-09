import bcrypt from 'bcryptjs';
import { getSmartStoreConfig } from './actions';

export class SmartStoreClient {
    private clientId: string;
    private clientSecret: string;
    private sellerId: string; // Not used for token, but for API calls

    constructor(clientId: string, clientSecret: string, sellerId: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.sellerId = sellerId;
    }

    async getAccessToken(): Promise<string | null> {
        try {
            const proxyUrl = process.env.SMARTSTORE_PROXY_URL;
            const proxyKey = process.env.SMARTSTORE_PROXY_KEY;
            const timestamp = Date.now();

            if (!proxyUrl) {
                throw new Error('SMARTSTORE_PROXY_URL is missing.');
            }

            // Correct Signature for Naver: bcrypt(clientId + "_" + timestamp, clientSecret)
            const sign = bcrypt.hashSync(`${this.clientId}_${timestamp}`, this.clientSecret);

            const body = {
                client_id: this.clientId,
                timestamp: timestamp.toString(),
                grant_type: 'client_credentials',
                client_secret_sign: sign,
                type: 'SELF'
            };

            const response = await fetch(`${proxyUrl}/naver/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-proxy-key': proxyKey || ''
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.access_token) {
                return data.access_token;
            } else {
                console.error('SmartStore Token Error:', data);
                // Return detailed error if possible for debugging
                if (data.error) return null;
                return null;
            }
        } catch (e) {
            console.error('SmartStore Client Error:', e);
            return null;
        }
    }
}

export async function createSmartStoreClient() {
    const config = await getSmartStoreConfig();
    if (!config) return null;
    return new SmartStoreClient(config.clientId, config.clientSecret, config.sellerId);
}
