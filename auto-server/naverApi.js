const axios = require("axios");

// Note: Ensure the proxy server on EC2 includes the /v1/* or /naver/* routing logic.
// Current tests show only /health is responding with 200.
const BASE_URL = "http://15.164.216.212:8787";
const PROXY_KEY = "brownstreet-proxy-key";

async function requestNaver(path, token) {
    try {
        const url = `${BASE_URL}${path}`;
        const res = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-proxy-key": PROXY_KEY
            }
        });

        console.log("응답 성공:", res.status);
        return res.data;

    } catch (err) {
        if (err.response) {
            console.error("API 오류:", err.response.status, err.response.data);
        } else {
            console.error("연결 오류:", err.message);
        }
        throw err;
    }
}

module.exports = { requestNaver };
