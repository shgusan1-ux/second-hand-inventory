const axios = require('axios');
const crypto = require('crypto');
require("dotenv").config();

async function testDirect() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    console.log("Client ID:", clientId);

    const timestamp = Date.now().toString();
    const password = `${clientId}_${timestamp}`;
    const client_secret_sign = crypto
        .createHmac("sha256", clientSecret)
        .update(password)
        .digest("base64");

    try {
        console.log("Requesting token directly from Naver...");
        const params = new URLSearchParams();
        params.append("client_id", clientId);
        params.append("timestamp", timestamp);
        params.append("client_secret_sign", client_secret_sign);
        params.append("grant_type", "client_credentials");
        params.append("type", "SELF");

        const tokenRes = await axios.post(
            "https://api.commerce.naver.com/external/v1/oauth2/token",
            params
        );

        const token = tokenRes.data.access_token;
        console.log("Token obtained successfully!");

        console.log("Requesting products directly from Naver...");
        const productRes = await axios.post(
            "https://api.commerce.naver.com/external/v1/products/search",
            { page: 1, size: 1 },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Product Response Status:", productRes.status);
        console.log("Product Data:", JSON.stringify(productRes.data, null, 2).substring(0, 500));

    } catch (e) {
        console.error("Direct Test Failed!");
        console.error("Status:", e.response?.status);
        console.error("Data:", e.response?.data);
        console.error("Message:", e.message);
    }
}

testDirect();
