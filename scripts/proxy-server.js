const express = require("express");
const axios = require('axios');
const app = express();

const PORT = 8787;
const API_KEY = "brownstreet-proxy-key";

// 1. Core Express Setup
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Auth Middleware
function auth(req, res, next) {
    const k = req.headers["x-proxy-key"];
    if (k !== API_KEY) {
        console.warn(`[UNAUTHORIZED] Access attempt with key: ${k}`);
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    next();
}

// 2. Helper Functions for Clean Proxying
function buildHeaders(req) {
    const h = {};
    // Whitelist allowed headers to avoid hop-by-hop issues or leaking proxy keys
    if (req.headers.authorization) h["authorization"] = req.headers.authorization;
    if (req.headers.accept) h["accept"] = req.headers.accept;
    if (req.headers["content-type"]) h["content-type"] = req.headers["content-type"];

    // Custom trace-id if provided by original requester
    if (req.headers["x-trace-id"]) h["x-trace-id"] = req.headers["x-trace-id"];

    h["user-agent"] = "brownstreet-proxy/1.0";
    return h;
}

function buildBody(req) {
    const ct = (req.headers["content-type"] || "").toLowerCase();

    // GET/HEAD should not have body
    if (["GET", "HEAD"].includes(req.method)) return undefined;

    // If it's form-urlencoded (usually for token requests)
    if (ct.includes("application/x-www-form-urlencoded")) {
        return new URLSearchParams(req.body).toString();
    }

    // If it's JSON (most commerce APIs)
    if (ct.includes("application/json")) {
        return req.body; // Axios handles object to JSON conversion automatically if headers are correct
    }

    // Fallback
    return req.body;
}

// 3. Routes

// Health Check with Outbound IP status
app.get("/health", async (req, res) => {
    try {
        const ipRes = await axios.get('https://api.ipify.org?format=json');
        res.json({ ok: true, outboundIp: ipRes.data.ip });
    } catch (e) {
        res.json({ ok: true, error: "could not check IP", message: e.message });
    }
});

// Naver Token Proxy (Explicit Path)
app.post("/naver/token", auth, async (req, res) => {
    const startTime = Date.now();
    const targetUrl = "https://api.commerce.naver.com/external/v1/oauth2/token";

    console.log(`[REQ][TOKEN] -> Naver`);

    try {
        const response = await axios({
            method: 'POST',
            url: targetUrl,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            data: new URLSearchParams(req.body).toString()
        });

        console.log(`[RES][TOKEN] 200 OK (${Date.now() - startTime}ms)`);
        res.json(response.data);
    } catch (e) {
        const status = e.response?.status || 500;
        const errorData = e.response?.data || { error: e.message };
        console.error(`[ERR][TOKEN] ${status}:`, JSON.stringify(errorData));
        res.status(status).json(errorData);
    }
});

// Generic Naver API Proxy (Supports /v1, /v2, etc.)
app.use(["/v1", "/v2"], auth, async (req, res) => {
    const startTime = Date.now();
    const version = req.baseUrl; // e.g. /v1
    const targetUrl = `https://api.commerce.naver.com/external${version}${req.url}`;

    console.log(`[REQ][${req.method}] ${version}${req.url} -> Naver`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: buildHeaders(req),
            data: buildBody(req)
        });

        const traceId = response.headers['x-trace-id'] || 'N/A';
        console.log(`[RES][${req.method}] ${version}${req.url} ${response.status} (${Date.now() - startTime}ms) [TraceId: ${traceId}]`);

        res.status(response.status).json(response.data);
    } catch (e) {
        const status = e.response?.status || 500;
        const errorData = e.response?.data || { error: e.message };
        const traceId = e.response?.headers?.['x-trace-id'] || 'N/A';

        console.error(`[ERR][${req.method}] ${version}${req.url} ${status}:`, JSON.stringify(errorData), `[TraceId: ${traceId}]`);
        res.status(status).json(errorData);
    }
});

// Start Server
app.listen(PORT, "0.0.0.0", async () => {
    console.log("========================================");
    console.log(`  Brownstreet Proxy Server Started`);
    console.log(`  Port: ${PORT}`);
    console.log("========================================");
    try {
        const res = await axios.get('https://api.ipify.org?format=json');
        console.log(`  Proxy Outbound IP: ${res.data.ip}`);
    } catch (e) {
        console.error(`  Warning: Could not check outbound IP: ${e.message}`);
    }
    console.log("========================================");
});
