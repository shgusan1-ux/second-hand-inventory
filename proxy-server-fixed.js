const express = require('express');
const fetch = require('node-fetch');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3001;

// Client secret stored on proxy (avoids $ variable expansion issues in Vercel)
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

// raw body를 먼저 캡처 (이미지 업로드용)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
    // multipart/binary 데이터는 raw buffer로 수집
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-proxy-key, x-filename');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/naver-image-upload', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const filename = req.headers['x-filename'] || 'image.jpg';

    if (!req.rawBody) {
      return res.status(400).json({ error: 'No image data received' });
    }

    console.log('[UPLOAD] Constructing multipart for:', filename);

    // Naver SPEC: multipart/form-data, 필드명 'imageFiles'
    const boundary = '----NaverUpload' + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="imageFiles"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(header, 'utf-8'),
      req.rawBody,
      Buffer.from(footer, 'utf-8')
    ]);

    const naverRes = await fetch('https://api.commerce.naver.com/external/v1/product-images/upload', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Accept': 'application/json'
      },
      body: body
    });

    const data = await naverRes.json();
    console.log('[UPLOAD] status:', naverRes.status);
    return res.status(naverRes.status).json(data);
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
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

// 전용 이미지 업로드 엔드포인트 (Vercel → 프록시 → 네이버)
// Vercel에서 raw 이미지 바이트를 보내면, 프록시가 multipart/form-data를 구성하여 네이버에 전송
app.post('/naver-image-upload', async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    const fileName = req.headers['x-filename'] || 'upload.jpg';

    if (!req.rawBody || req.rawBody.length === 0) {
      return res.status(400).json({ error: 'No image data received' });
    }

    console.log('[IMAGE UPLOAD] fileName:', fileName, 'size:', req.rawBody.length);

    // multipart/form-data 직접 구성
    const boundary = '----NaverFormBoundary' + Date.now();
    const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="imageFiles"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footerStr = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(headerStr),
      req.rawBody,
      Buffer.from(footerStr)
    ]);

    console.log('[IMAGE UPLOAD] multipart body size:', body.length);

    const response = await fetch('https://api.commerce.naver.com/external/v1/product-images/upload', {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    const respText = await response.text();
    console.log('[IMAGE UPLOAD] status:', response.status, respText.substring(0, 300));

    let data;
    try { data = JSON.parse(respText); } catch { data = respText; }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[IMAGE UPLOAD ERROR]', error.message);
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

    let body = undefined;
    const contentType = req.headers['content-type'] || '';

    if (req.method !== 'GET' && req.method !== 'DELETE') {
      if (contentType.includes('multipart/form-data') && req.rawBody) {
        // multipart 데이터: raw body 그대로 전달
        body = req.rawBody;
        headers['content-type'] = contentType; // boundary 포함된 원본 Content-Type 유지
        console.log('[API] Multipart upload, body size:', req.rawBody.length);
      } else {
        // JSON 데이터
        body = JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
      }
    }

    const response = await fetch(url, { method: req.method, headers, body });
    const respContentType = response.headers.get('content-type') || '';

    let data;
    if (respContentType.includes('json')) {
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
  console.log('Naver Commerce Proxy v5');
  console.log('Port:', PORT);
  console.log('Supports: JSON + Multipart');
  console.log('Using client_secret as bcrypt salt');
  console.log('=================================');
});
