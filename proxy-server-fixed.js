const express = require('express');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3001;

// Client secret stored on proxy (avoids $ variable expansion issues in Vercel)
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-proxy-key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/oauth/token', async (req, res) => {
  try {
    const client_id = req.body.client_id;
    // Use server-side secret (client_secret from body has $ expansion issues in Vercel)
    const client_secret = NAVER_CLIENT_SECRET;
    const timestamp = Date.now().toString();

    const password = `${client_id}_${timestamp}`;

    console.log('[TOKEN] client_id:', client_id);
    console.log('[TOKEN] secret length:', client_secret.length);

    // Use client_secret as bcrypt salt (Naver Commerce API requirement)
    const hashed = bcrypt.hashSync(password, client_secret);
    const client_secret_sign = Buffer.from(hashed).toString('base64');

    console.log('[TOKEN] client_id:', client_id);
    console.log('[TOKEN] timestamp:', timestamp);
    console.log('[TOKEN] password:', password);
    console.log('[TOKEN] sign:', client_secret_sign);

    const params = new URLSearchParams({
      client_id: client_id,
      timestamp: timestamp,
      client_secret_sign: client_secret_sign,
      grant_type: 'client_credentials',
      type: 'SELF'
    });

    const response = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await response.json();
    console.log('[TOKEN] status:', response.status);
    console.log('[TOKEN] response:', JSON.stringify(data));

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[TOKEN ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
});

// Unified handler for /v1, /v2, /v3, etc.
app.use(/^\/(v\d+)/, async (req, res) => {
  try {
    const url = 'https://api.commerce.naver.com/external' + req.originalUrl;
    console.log('[API]', req.method, url);

    const headers = {};
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(url, { method: req.method, headers, body });
    const contentType = response.headers.get('content-type') || '';

    let data;
    if (contentType.includes('json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log('[API] status:', response.status);
    return res.status(response.status).send(data);
  } catch (error) {
    console.error('[API ERROR]', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('Naver Commerce Proxy v4');
  console.log('Port:', PORT);
  console.log('Using client_secret as bcrypt salt');
  console.log('=================================');
});
