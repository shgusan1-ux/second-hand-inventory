
import { db } from '../src/lib/db';
import { SmartStoreClient } from '../src/lib/smartstore';

async function verify() {
    try {
        const result = await db.query("SELECT value FROM system_settings WHERE key = 'smartstore_config'");
        if (result.rows.length === 0) {
            console.log('No SmartStore config found in DB.');
            process.exit(1);
        }

        const config = result.rows[0].value;
        console.log('Config found (partial):', {
            sellerId: config.sellerId,
            clientId: config.clientId ? config.clientId.substring(0, 5) + '...' : 'MISSING',
            clientSecret: config.clientSecret ? 'EXISTS' : 'MISSING'
        });

        if (!config.clientId || !config.clientSecret) {
            console.log('Credentials missing.');
            process.exit(1);
        }

        const client = new SmartStoreClient(config.clientId, config.clientSecret, config.sellerId);
        console.log('Requesting access token...');
        const token = await client.getAccessToken();

        if (token) {
            console.log('SUCCESS: Access Token received:', token.substring(0, 10) + '...');
        } else {
            console.log('FAILURE: Could not retrieve access token.');
        }

    } catch (e) {
        console.error('Error during verification:', e);
    } finally {
        process.exit(0);
    }
}

verify();
