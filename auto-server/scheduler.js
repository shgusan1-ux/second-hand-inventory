const cron = require("node-cron");
const { requestNaver } = require("./naverApi");
const { exec } = require("child_process");
const path = require("path");

// 1. 네이버 상품 동기화 (5분마다 실행)
cron.schedule("*/5 * * * *", async () => {
    console.log(`[${new Date().toLocaleString()}] 네이버 자동 실행 시작`);

    try {
        // Placeholder token - in production, this should fetch/refresh via proxy /naver/token
        const token = "YOUR_NAVER_ACCESS_TOKEN";

        await requestNaver(
            "/v1/products",
            token
        );
    } catch (err) {
        console.error("스케줄러 실행 중 오류 발생");
    }
});

// 2. NotebookLM 지식 베이스 동기화 (30분마다 실행)
cron.schedule("*/30 * * * *", async () => {
    console.log(`[${new Date().toLocaleString()}] NotebookLM 지식 베이스 동기화 시작`);

    // root 디렉토리의 scripts/sync-notebooklm.mjs 실행
    const scriptPath = path.resolve(__dirname, "../scripts/sync-notebooklm.mjs");

    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[NotebookLM Sync Error] ${error.message}`);
            return;
        }
        if (stderr) {
            console.warn(`[NotebookLM Sync Warning] ${stderr}`);
        }
        console.log(`[NotebookLM Sync Success] ${stdout.trim()}`);
    });
});

console.log("====================================================");
console.log("🚀 자동화 스케줄러가 시작되었습니다.");
console.log("📅 네이버 상품 동기화: 5분 주기");
console.log("📅 NotebookLM 지식 동기화: 30분 주기");
console.log("====================================================");
