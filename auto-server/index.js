const { requestNaver } = require("./naverApi");

async function main() {
    // Note: Replace with actual token or valid credentials
    const token = "YOUR_NAVER_ACCESS_TOKEN";

    try {
        console.log("네이버 상품 목록 조회 테스트 시작...");
        const result = await requestNaver(
            "/v1/products",
            token
        );

        console.log("조회 결과:", JSON.stringify(result, null, 2));

    } catch (err) {
        console.log("조회 실패 (토큰 만료 또는 프록시 오류)");
    }
}

main();
