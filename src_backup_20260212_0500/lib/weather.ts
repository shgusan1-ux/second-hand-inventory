export interface WeatherData {
    city: string;
    temp: number;
    condition: 'Sunny' | 'Cloudy' | 'Rain' | 'Snow';
}

export interface MarketWeather {
    averageTemp: number;
    dominantCondition: 'Sunny' | 'Cloudy' | 'Rain' | 'Snow';
    cities: WeatherData[];
    recommendations: {
        today: string;
        week: string;
        month: string;
        season: string;
    };
}

// Mock Data for "No API Key" scenario
// In a real scenario, we would fetch from OpenWeatherMap for these 5 cities
const WEIGHTS = {
    'Seoul': 0.4,
    'Busan': 0.15,
    'Incheon': 0.15,
    'Daegu': 0.1,
    'Daejeon': 0.1,
    'Gwangju': 0.1
};

export async function getMarketWeather(): Promise<MarketWeather> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate realistic data based on month
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    let baseTemp = 20;
    if (month >= 12 || month <= 2) baseTemp = -2;
    else if (month >= 3 && month <= 5) baseTemp = 15;
    else if (month >= 6 && month <= 8) baseTemp = 28;
    else baseTemp = 18;

    // Randomize slightly for "Live" feel
    const cities: WeatherData[] = Object.keys(WEIGHTS).map(city => {
        const variance = Math.floor(Math.random() * 5) - 2;
        const isRainy = Math.random() > 0.8; // 20% chance of rain
        return {
            city,
            temp: baseTemp + variance,
            condition: isRainy ? 'Rain' : (Math.random() > 0.5 ? 'Sunny' : 'Cloudy')
        };
    });

    // Calculate Weighted Average Temp
    let weightedTempSum = 0;
    let totalWeight = 0;
    const conditionCounts = { Sunny: 0, Cloudy: 0, Rain: 0, Snow: 0 };

    cities.forEach(c => {
        const weight = WEIGHTS[c.city as keyof typeof WEIGHTS];
        weightedTempSum += c.temp * weight;
        totalWeight += weight;
        conditionCounts[c.condition]++;
    });

    const averageTemp = Math.round(weightedTempSum / totalWeight);

    // Find Dominant Condition
    let dominantCondition: any = 'Sunny';
    let maxCount = 0;
    Object.entries(conditionCounts).forEach(([cond, count]) => {
        if (count > maxCount) {
            maxCount = count;
            dominantCondition = cond;
        }
    });

    // Strategy Generation Logic
    let todayStrategy = '';
    if (dominantCondition === 'Rain') {
        todayStrategy = '☔ 비 오는 날: 방수/발수 기능성 아우터(바람막이) 및 어두운 계열 하의 메인 노출. 객단가 낮은 소품(우산 등) 끼워팔기.';
    } else if (averageTemp < 5) {
        todayStrategy = '❄️ 한파 특보: 패딩/헤비 아우터 최상단 배치. "오늘 출발" 배송 강조로 즉시 구매 유도.';
    } else if (averageTemp > 28) {
        todayStrategy = '☀️ 폭염 경보: 린넨/쿨링 소재 강조. 에어컨 관련 의류(긴팔 셔츠 등) 서브 배치.';
    } else {
        todayStrategy = '🌤 활동하기 좋은 날: 데일리룩(자켓, 가디건) 코디 제안 강화. 상세 페이지 내 코디 컷 추가.';
    }

    let weekStrategy = '';
    if (averageTemp < 10) {
        weekStrategy = '기온 하강 예상: 니트/기모 제품 재고 확보 및 기획전 준비. 주말 추위 대비 아우터 할인 이벤트 기획.';
    } else if (averageTemp > 25) {
        weekStrategy = '무더위 지속: 여름 시즌오프 행사 준비 또는 바캉스 룩 기획전 (수영복, 비치웨어) 노출 강화.';
    } else {
        weekStrategy = '안정적 날씨: 신상품 위주 룩북 공개. 주말 나들이객 타겟 "편안한 주말 코디" 배너 게시.';
    }

    let monthStrategy = '';
    if (month === 12) {
        monthStrategy = '연말/크리스마스 시즌: 선물용 패키징 옵션 추가. 파티룩/레드 컬러 아이템 큐레이션.';
    } else if (month === 1 || month === 2) {
        monthStrategy = '겨울 시즌오프 준비: 겨울 아우터 클리어런스 세일 예고. 봄 신상 프리오더(선주문) 오픈.';
    } else if (month === 3 || month === 4) {
        monthStrategy = '봄 시즌 본격화: 트렌치코트/블레이저 메인 걸기. 대학생 개강룩/직장인 출근룩 키워드 광고 집행.';
    } else if (month === 7 || month === 8) {
        monthStrategy = '여름 휴가 피크: 당일 발송 서비스 강조. "휴가 가기 전 필수템" 체크리스트 콘텐츠 발행.';
    } else {
        monthStrategy = '간절기: 레이어드 아이템(조끼, 가디건) 묶음 판매 유도. 환절기 건강 관련 멘트 사용으로 감성 마케팅.';
    }

    let seasonStrategy = '';
    if (month >= 3 && month <= 5) {
        seasonStrategy = 'SPRING 2026: 화사한 파스텔 톤 위주 디스플레이. "새로운 시작" 캠페인 메시지 전달.';
    } else if (month >= 6 && month <= 8) {
        seasonStrategy = 'SUMMER 2026: 쿨비즈/리조트룩 이원화 전략. 통기성/소재 기능성 상세 설명 보강.';
    } else if (month >= 9 && month <= 11) {
        seasonStrategy = 'AUTUMN 2026: 클래식/무드. 브라운/베이지/버건디 컬러 팔레트 적용. 스카프 등 악세서리 매칭 제안.';
    } else {
        seasonStrategy = 'WINTER 2026: 보온성/내구성 강조. 충전재(구스/덕다운) 상세 표기 및 신뢰도 마케팅 집중.';
    }

    // User requested "이달의" (this month) but typed "이발의", I handled it as "monthStrategy".

    return {
        averageTemp,
        dominantCondition,
        cities,
        recommendations: {
            today: todayStrategy,
            week: weekStrategy,
            month: monthStrategy,
            season: seasonStrategy
        }
    };
}
