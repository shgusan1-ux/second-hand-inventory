# MD-SOGAE v2.9 Quick Reference Card

## 🚀 빠른 시작 (30초)

1. **사이드바** → AI 도구 → **MD-SOGAE v2.9**
2. **이미지 URL** 입력 (케어라벨 포함)
3. **카테고리** 입력 (아우터/상의/하의)
4. **분석 시작** 클릭 → 60초 대기
5. **메타데이터 검수** → 승인
6. **상품에 적용**

---

## 📋 4-Phase 체크리스트

### Phase 1: Visual & OCR ✅
- [ ] 품번 추출됨
- [ ] 소재 정보 확인
- [ ] 브랜드 정확함
- [ ] 사이즈 맞음

### Phase 2: Market Intelligence 💰
- [ ] 글로벌 가격 확인
- [ ] KREAM 가격 확인
- [ ] 최종 가격 합리적
- [ ] 가격 근거 이해

### Phase 3: Professional Naming 🏷️
- [ ] 45자 이내
- [ ] 전문 태그 적절
- [ ] 브랜드명 정확
- [ ] 성별-사이즈 형식 맞음

### Phase 4: Editorial Content 📝
- [ ] 브랜드 헤리티지 확인
- [ ] 디테일 가이드 확인
- [ ] 아카이브 가치 확인

---

## 🎯 핵심 원칙

1. **관세 가중치 배제** - 순수 실거래가만 사용
2. **다중 플랫폼 검증** - 6개 플랫폼 교차 확인
3. **전문가적 작명** - SEO 최적화 + 전문 태그
4. **메타데이터 검수** - AI → 검수 → 승인 → 적용

---

## ⚡ 단축키 & 팁

### 이미지 준비
- ✅ 선명한 케어라벨
- ✅ 밝은 조명
- ✅ 1000x1000px 이상
- ❌ 흐릿한 이미지
- ❌ 그림자 있음
- ❌ 라벨 일부만 보임

### 카테고리 입력
```
아우터, 상의, 하의, 신발, 가방, 액세서리
```

### 가격 조정 가이드
- S급: +20%
- A급: 기준가
- B급: -20%

---

## 🔧 문제 해결 (30초)

| 문제 | 해결 |
|------|------|
| 분석 실패 | 이미지 URL 확인 |
| 품번 없음 | 다른 이미지로 재시도 |
| 가격 이상 | 수동 조정 |
| 이름 너무 김 | 수동 편집 |

---

## 📊 데이터 출력 형식

```typescript
// Phase 1
productCode: "ABC-12345"
fabric: "Nylon 100%"
brand: "Stone Island"
size: "L"

// Phase 2
finalPrice: 165000
priceReason: "KREAM 실거래가 기준..."

// Phase 3
fullName: "[Technical] Stone Island..."
tag: "[Technical]"
genderSize: "MAN-L"

// Phase 4
brandHeritage: "..."
detailGuide: "..."
archiveValue: "..."
```

---

## 🎓 학습 리소스

- 📖 전체 문서: `docs/MD-SOGAE-v2.9.md`
- 📘 사용 가이드: `docs/MD-SOGAE-사용가이드.md`
- 📊 워크플로우: `docs/MD-SOGAE-Workflow.txt`
- 📋 구현 보고서: `docs/MD-SOGAE-구현완료보고서.md`

---

## 📞 긴급 연락처

- 개발팀: dev@hmcommerce.com
- 시스템 관리자: admin@hmcommerce.com

---

## 🔑 API 엔드포인트

```bash
POST /api/md-sogae/analyze
Content-Type: application/json

{
  "imageUrl": "https://...",
  "category": "아우터"
}
```

---

## ⚙️ 환경 변수

```env
GEMINI_API_KEY=your_key
GOOGLE_VISION_CREDENTIALS_JSON=your_credentials
```

---

**버전**: v2.9 | **상태**: ✅ Production Ready | **업데이트**: 2026-02-08
