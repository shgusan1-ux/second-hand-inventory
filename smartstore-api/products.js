const axios = require("axios");
const getToken = require("./token");
require("dotenv").config();

async function getProducts() {
    try {
        const token = await getToken();
        const proxyUrl = process.env.SMARTSTORE_PROXY_URL;
        const proxyKey = process.env.SMARTSTORE_PROXY_KEY;

        // Use Proxy if available
        const url = proxyUrl ? `${proxyUrl}/v1/products/search` : "https://api.commerce.naver.com/external/v1/products/search";

        // Proxy might need x-proxy-key header
        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(proxyUrl ? { "x-proxy-key": proxyKey } : {})
        };

        console.log("Fetching products from:", url);

        const res = await axios.post(
            url,
            {
                page: 1,
                size: 10,
            },
            {
                headers: headers,
            }
        );

        console.log("Product Response:", JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error("Get Products Failed:", e.response?.data || e.message);
    }
}

getProducts();
