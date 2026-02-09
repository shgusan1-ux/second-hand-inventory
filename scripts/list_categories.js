const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function getAccessToken() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const timestamp = Date.now();
    const password = `${clientId}_${timestamp}`;
    const salt = bcrypt.genSaltSync(10);
    const clientSecretSign = bcrypt.hashSync(clientSecret, salt);

    try {
        const res = await axios.post(`${process.env.SMARTSTORE_PROXY_URL}/naver/token`, {
            client_id: clientId,
            timestamp: timestamp,
            grant_type: 'client_credentials',
            client_secret_sign: clientSecretSign
        }, {
            headers: { 'x-proxy-key': 'brownstreet-proxy-key' }
        });
        return res.data.access_token;
    } catch (e) {
        console.error('Failed to get token:', e.response?.data || e.message);
        return null;
    }
}

async function listCategories() {
    const token = await getAccessToken();
    if (!token) return;

    const endpoint = '/v1/product-channels/smartstore/categories';
    console.log(`Fetching categories from proxy...`);
    try {
        const res = await axios.get(`${process.env.SMARTSTORE_PROXY_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-proxy-key': 'brownstreet-proxy-key'
            }
        });

        console.log('\n--- Exhibition Categories List ---');
        if (Array.isArray(res.data)) {
            res.data.forEach(cat => {
                console.log(`ID: ${cat.categoryId.padEnd(35)} | Name: ${cat.categoryName}`);
            });
        } else {
            console.log(JSON.stringify(res.data, null, 2));
        }
        console.log('----------------------------------\n');
    } catch (e) {
        console.error('Failed to fetch categories:', e.response?.data || e.message);
    }
}

listCategories();
