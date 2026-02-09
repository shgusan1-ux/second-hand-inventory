const express = require("express");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

const PORT = 8787;
const API_KEY = "brownstreet-proxy-key";

// Auth Middleware
function auth(req, res, next) {
    const k = req.headers["x-proxy-key"];
    if (k !== API_KEY) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    next();
}

// 1. Health Check
app.get("/health", (req, res) => res.json({ ok: true }));

const axios = require('axios');

// 2. Naver Token Proxy
app.post("/naver/token", auth, async (req, res) => {
    try {
        const response = await axios.post("https://api.commerce.naver.com/external/v1/oauth2/token",
            new URLSearchParams(req.body).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        res.json(response.data);
    } catch (e) {
        console.error("Token Error:", e.message);
        res.status(e.response?.status || 500).json(e.response?.data || { error: String(e) });
    }
});

// 3. Generic Naver API Proxy
app.use("/v1", auth, async (req, res) => {
    try {
        const naverUrl = `https://api.commerce.naver.com/external/v1${req.url}`;
        const headers = { ...req.headers };
        delete headers.host;
        delete headers["x-proxy-key"];
        delete headers.connection;
        delete headers["content-length"];

        const response = await axios({
            method: req.method,
            url: naverUrl,
            headers: headers,
            data: ["GET", "HEAD"].includes(req.method) ? undefined : req.body
        });

        res.status(response.status).json(response.data);
    } catch (e) {
        console.error("Proxy Error:", e.message);
        res.status(e.response?.status || 500).json(e.response?.data || { error: String(e) });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Proxy running on port", PORT);
});
