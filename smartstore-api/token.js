require("dotenv").config();
const crypto = require("crypto");
const axios = require("axios");

async function getToken() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const proxyUrl = process.env.SMARTSTORE_PROXY_URL;
    const proxyKey = process.env.SMARTSTORE_PROXY_KEY;

    if (!clientId || !clientSecret) {
        throw new Error("Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET");
    }

    const timestamp = Date.now().toString();
    const password = `${clientId}_${timestamp}`;

    const client_secret_sign = crypto
        .createHmac("sha256", clientSecret)
        .update(password)
        .digest("base64");

    // Use Proxy for token generation if configured
    if (proxyUrl && proxyKey) {
        try {
            const res = await axios.post(
                `${proxyUrl}/v1/oauth2/token`,
                {
                    client_id: clientId,
                    timestamp: timestamp,
                    client_secret_sign: client_secret_sign,
                    grant_type: "client_credentials",
                    type: "SELF"
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-proxy-key": proxyKey
                    }
                }
            );
            return res.data.access_token;
        } catch (e) {
            console.error("Token Proxy Error:", e.response?.data || e.message);
            throw e; // Rethrow to stop execution
        }
    }

    // Fallback (Direct Call - will fail if IP blocked)
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("timestamp", timestamp);
    params.append("client_secret_sign", client_secret_sign);
    params.append("grant_type", "client_credentials");
    params.append("type", "SELF");

    try {
        const res = await axios.post(
            "https://api.commerce.naver.com/external/v1/oauth2/token",
            params
        );
        return res.data.access_token;
    } catch (e) {
        console.error("Token Direct Error:", e.response?.data || e.message);
        throw e;
    }
}

module.exports = getToken;
