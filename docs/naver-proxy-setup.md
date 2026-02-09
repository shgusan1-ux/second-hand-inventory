# Naver Commerce API Proxy Setup (Oracle Free Tier)

## 3-1. Ubuntu Server Initial Setup
```bash
# Update & Install Node.js
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Firewall setup (Open port 80/443 or specific proxy port)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3-2. Proxy Server Implementation (Express)
Create a directory `naver-proxy` on the server.
`index.js`:
```javascript
const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// CONFIG (Use env variables on server)
const API_KEY = process.env.PROXY_API_KEY || 'your-secure-api-key';
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

let cachedToken = null;

// Auth Middleware (Step 3-5)
const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized proxy access' });
    }
    next();
};

// 3-3. Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 3-4. Naver Token Acquisition (with Cache)
app.post('/naver/token', authMiddleware, async (req, res) => {
    try {
        if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
            return res.json({ access_token: cachedToken.token, from_cache: true });
        }

        const timestamp = Date.now();
        const signature = bcrypt.hashSync(NAVER_CLIENT_SECRET, 10);

        const params = new URLSearchParams();
        params.append('client_id', NAVER_CLIENT_ID);
        params.append('timestamp', timestamp.toString());
        params.append('grant_type', 'client_credentials');
        params.append('client_secret_sign', signature);
        params.append('type', 'SELF');

        const response = await axios.post('https://api.commerce.naver.com/external/v1/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        cachedToken = {
            token: response.data.access_token,
            expiresAt: Date.now() + (response.data.expires_in * 1000)
        };

        res.json({ access_token: cachedToken.token, from_cache: false });
    } catch (error) {
        console.error('Token Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Naver API Auth Failed', detail: error.response?.data });
    }
});

// Generic Naver API Proxy
app.all('/v1/*', authMiddleware, async (req, res) => {
    // Implement generic proxying to https://api.commerce.naver.com/external/v1/...
});

app.listen(80, () => console.log('Naver Proxy running on port 80'));
```

## 3-5. Vercel -> Proxy Auth
Vercel should set `X-API-KEY` header matching the proxy server's `PROXY_API_KEY`.
This ensures only our Vercel app can use the proxy.
