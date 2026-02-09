const axios = require('axios');

async function checkOutboundIp() {
    console.log('Checking Outbound IP via ipify...');
    try {
        const res = await axios.get('https://api.ipify.org?format=json');
        console.log('Your Outbound IP is:', res.data.ip);
    } catch (e) {
        console.error('Failed to get IP:', e.message);
    }
}

checkOutboundIp();
