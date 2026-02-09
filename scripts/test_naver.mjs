
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

async function main() {
    try {
        console.log('Listing keys in system_settings...');
        const listRes = await sql`SELECT key FROM system_settings`;
        console.log('Keys found:', listRes.rows.map(r => r.key));

        const { rows } = await sql`SELECT value FROM system_settings WHERE key = 'smartstore_config'`;

        if (rows.length === 0) {
            console.error('No config found for key "smartstore_config".');
            return;
        }

        // ... rest of logic
        const config = rows[0].value;
        console.log('Config found. ClientId:', config.clientId);

        const timestamp = Date.now();
        // Method 1 Test
        const sign = bcrypt.hashSync(config.clientSecret, 10);
        console.log('Signature generated:', sign.substring(0, 10) + '...');

        // Construct params
        const params = new URLSearchParams();
        params.append('client_id', config.clientId);
        params.append('timestamp', timestamp);
        params.append('grant_type', 'client_credentials');
        params.append('client_secret_sign', sign);
        params.append('type', 'SELF');

        const res = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}
main();
