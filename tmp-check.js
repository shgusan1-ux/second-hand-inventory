require('dotenv').config({ path: '.env.local' });
const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';

(async () => {
  const tokenRes = await fetch(PROXY_URL + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
    body: JSON.stringify({
      client_id: process.env.NAVER_CLIENT_ID,
      client_secret: process.env.NAVER_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  const res = await fetch(PROXY_URL + '/v2/products/channel-products/13038796218', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'x-proxy-key': PROXY_KEY
    }
  });
  const data = await res.json();
  if (data.originProduct) data.originProduct.detailContent = '[REMOVED]';

  console.log('=== smartstoreChannelProduct ===');
  console.log(JSON.stringify(data.smartstoreChannelProduct, null, 2));

  const fullJson = JSON.stringify(data);
  console.log('\nexhibition:', fullJson.includes('exhibition') || fullJson.includes('Exhibition'));
  console.log('09f56197:', fullJson.includes('09f56197'));
  console.log('4efdba18:', fullJson.includes('4efdba18'));

  function listKeys(obj, prefix, depth) {
    if (depth > 3) return;
    if (obj === null || obj === undefined || typeof obj !== 'object') return;
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = obj[k];
      var type = Array.isArray(val) ? 'array[' + val.length + ']' : typeof val;
      if (type === 'string' && val.length > 50) type = 'string(' + val.length + ')';
      console.log(prefix + k + ': ' + type);
      if (typeof val === 'object' && val !== null && Array.isArray(val) === false) {
        listKeys(val, prefix + '  ', depth + 1);
      }
    }
  }
  console.log('\n=== 키 구조 ===');
  listKeys(data, '', 0);
})();
