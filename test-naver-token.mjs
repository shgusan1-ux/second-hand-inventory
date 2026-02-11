// STEP 1: Naver Commerce API 토큰 발급 테스트
import fetch from 'node-fetch';

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD'; // \n 제거
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO'; // \n 제거

async function getToken() {
  console.log('=== STEP 1: 토큰 발급 테스트 ===\n');
  console.log('CLIENT_ID:', CLIENT_ID);
  console.log('CLIENT_ID length:', CLIENT_ID.length);
  console.log('CLIENT_SECRET:', CLIENT_SECRET);
  console.log('CLIENT_SECRET length:', CLIENT_SECRET.length);
  console.log('CLIENT_SECRET format check:');
  console.log('  - Starts with $2a$04$:', CLIENT_SECRET.startsWith('$2a$04$'));
  console.log('  - Total length:', CLIENT_SECRET.length);
  console.log('');

  try {
    console.log('요청 URL:', `${PROXY_URL}/oauth/token`);
    console.log('요청 Body:', JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }, null, 2));
    console.log('');

    const response = await fetch(`${PROXY_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    console.log('응답 상태:', response.status, response.statusText);
    console.log('응답 헤더:', Object.fromEntries(response.headers.entries()));
    console.log('');

    const data = await response.json();
    console.log('응답 JSON:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (response.status === 200 && data.access_token) {
      console.log('✅ 토큰 발급 성공!');
      console.log('Access Token:', data.access_token.substring(0, 50) + '...');
      console.log('Expires In:', data.expires_in, 'seconds');
      return data.access_token;
    } else {
      console.log('❌ 토큰 발급 실패');
      if (data.code) console.log('Error Code:', data.code);
      if (data.message) console.log('Error Message:', data.message);
      if (data.invalidInputs) console.log('Invalid Inputs:', data.invalidInputs);
      return null;
    }
  } catch (error) {
    console.error('❌ 요청 중 오류 발생:', error.message);
    return null;
  }
}

getToken();
