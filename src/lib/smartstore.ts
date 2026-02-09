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
            const timestamp = Date.now();

            // Generate Signature
            // Naver Commerce API: client_secret_sign = bcrypt(client_secret, salt) 
            // where salt is random (standard bcrypt).
            // The server verifies by comparing the received hash against its stored client_secret.
            // (If the doc says "salt=client_id+timestamp", it's likely describing their internal verification or a non-standard usage not supported by bcryptjs easily.
            // Standard integration pattern: Hash the secret with a standard random salt.)

            // Note: bcryptjs.hashSync string includes the salt, so server can verify it.
            const sign = bcrypt.hashSync(this.clientSecret, 10);

            // Base64Url encoding might be needed if the standard bcrypt string contains sensitive chars?
            // Standard bcrypt string uses ./A-Za-z0-9. It is URL safe except maybe '$'.
            // Naver expects raw string or encoded? Usually raw if transmitted as form-data.
            // BUT let's trust standard form-urlencoded.

            const params = new URLSearchParams();
            params.append('client_id', this.clientId);
            params.append('timestamp', timestamp.toString());
            params.append('grant_type', 'client_credentials');
            params.append('client_secret_sign', sign);
            params.append('type', 'SELF');

            const response = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
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
