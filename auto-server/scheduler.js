const cron = require("node-cron");
const { requestNaver } = require("./naverApi");

// 5분마다 실행 (*/5 * * * *)
cron.schedule("*/5 * * * *", async () => {
    console.log(`[${new Date().toLocaleString()}] 자동 실행 시작`);

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

console.log("네이버 자동화 스케줄러가 시작되었습니다. (5분 주기)");
