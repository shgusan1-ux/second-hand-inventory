// 상품명 파서: 브랜드, 성별, 사이즈, 설명 추출
import type { ParsedProductName, Gender } from './types';

// GENDER-SIZE 패턴 (상품명 끝부분)
const GENDER_SIZE_REGEX = /\s+(MAN|WOMAN|KIDS|UNISEX)\s*[-\s]\s*(\S+)$/i;

// 영문 브랜드: 한글 나오기 전까지
const BRAND_REGEX = /^([A-Z0-9&.'\/\-\s]+?)(?=\s+[가-힣])/i;

// 한글 포함 여부
const HAS_KOREAN = /[가-힣]/;

export function parseProductName(name: string): ParsedProductName {
  let remaining = name.trim();
  let gender: Gender = 'UNKNOWN';
  let size = '';
  let brand = '';
  let brandKorean = '';
  let description = '';

  // 1. 끝에서 GENDER-SIZE 추출
  const genderMatch = remaining.match(GENDER_SIZE_REGEX);
  if (genderMatch) {
    gender = genderMatch[1].toUpperCase() as Gender;
    size = genderMatch[2].replace(/인치$/, '');
    remaining = remaining.slice(0, genderMatch.index!).trim();
  }

  // 2. 영문 브랜드 추출 (한글 나오기 전까지)
  const brandMatch = remaining.match(BRAND_REGEX);
  if (brandMatch) {
    brand = brandMatch[1].trim();
    remaining = remaining.slice(brand.length).trim();
  } else if (!HAS_KOREAN.test(remaining)) {
    // 전부 영문인 경우 첫 단어를 브랜드로
    const parts = remaining.split(/\s+/);
    brand = parts[0];
    remaining = parts.slice(1).join(' ');
  } else {
    // 첫 단어가 영문이면 브랜드
    const parts = remaining.split(/\s+/);
    if (parts[0] && !HAS_KOREAN.test(parts[0])) {
      brand = parts[0];
      remaining = parts.slice(1).join(' ');
    }
  }

  // 3. 한글 브랜드명 추출 (영문 브랜드 뒤 바로 오는 한글 단어들, 보통 2-4음절)
  // "어반 리서치", "랄프로렌", "타미힐피거" 등
  if (remaining && HAS_KOREAN.test(remaining)) {
    const words = remaining.split(/\s+/);
    const koreanBrandWords: string[] = [];
    let i = 0;

    // 한글 브랜드명은 보통 1-3단어, 각 단어가 2-6자
    while (i < words.length && i < 3) {
      const word = words[i];
      // 한글 브랜드명은 짧고 의류 설명 키워드가 아닌 경우
      if (HAS_KOREAN.test(word) && word.length <= 7 && !isClothingKeyword(word)) {
        koreanBrandWords.push(word);
        i++;
      } else {
        break;
      }
    }

    if (koreanBrandWords.length > 0) {
      brandKorean = koreanBrandWords.join(' ');
      description = words.slice(i).join(' ');
    } else {
      description = remaining;
    }
  } else {
    description = remaining;
  }

  return { brand, brandKorean, description, gender, size };
}

// 의류 관련 키워드인지 확인 (브랜드명과 구분)
function isClothingKeyword(word: string): boolean {
  const keywords = [
    '아카이브', '빈티지', '클래식', '모던', '레트로', '그런지',
    '슬림', '오버사이즈', '릴렉스드', '와이드', '테이퍼드',
    '다크블루', '블랙', '화이트', '네이비', '그레이', '카키', '베이지',
    '워싱', '데님', '코튼', '울', '린넨', '실크', '캐시미어', '폴리',
    '스트라이프', '체크', '플로럴', '솔리드', '카모', '도트',
    '티셔츠', '셔츠', '블라우스', '니트', '스웨터', '후디', '후드', '후드티', '맨투맨', '스웻', '스웻셔츠',
    '팬츠', '스커트', '쇼츠', '슬랙스', '데님',
    '자켓', '코트', '점퍼', '블레이저', '가디건', '베스트', '야상',
    '윈드브레이커', '패딩', '트렌치', '원피스', '드레스',
    '노티컬', '마린', '보트넥', '크루넥', '라운드넥', 'V넥',
    '반팔', '긴팔', '롱', '숏', '미니', '미디', '맥시',
    '테크니컬', '유틸리티', '밀리터리', '케이블', '플레어',
    '어반', '스포티', '캐주얼', '포멀', '비즈니스',
    '헤리티지', '에센셜', '시그니처', '프리미엄',
    '사토리얼', '퓨어', '싱글', '더블', '하프', '풀',
    '오버핏', '레귤러핏', '슬림핏', '루즈핏',
    '보태니컬', '에스닉', '부클', '텍스처', '덤블', '퍼',
    '메쉬', '네트', '크롭', '롱슬리브', '숏슬리브',
    '플리츠', '패널', '배색', '컬러블록', '파이핑',
    '노카라', '셀비지', '인디고', '로우', '하이',
    '스트레이트', '부츠컷', '카고', '조거', '큐롯',
    '자수', '태슬', '프린지', '아트워크', '그래픽',
    '헤비', '라이트', '미디엄',
    '더티', '컨투어', '센터', '심', '스티치',
    '사이드', '프론트', '백',
    '볼륨', '터치',
    '멜톤', '미니멀', '맥시멀',
    '어슬렌틱', '팝', '아트',
  ];
  return keywords.some(k => word.includes(k));
}
