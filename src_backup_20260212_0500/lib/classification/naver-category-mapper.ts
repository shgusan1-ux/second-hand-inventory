// 네이버 카테고리 추천: (의류타입 + 성별) → 네이버 카테고리 경로
import type { ClothingSubType, Gender } from './types';

interface NaverCategoryMapping {
  path: string;
}

// (gender_subType) → 네이버 카테고리 경로
const CATEGORY_MAP: Record<string, NaverCategoryMapping> = {
  // ===== MAN (남성) =====
  // 상의
  'MAN_티셔츠': { path: '패션의류 > 남성의류 > 티셔츠' },
  'MAN_반팔': { path: '패션의류 > 남성의류 > 티셔츠' },
  'MAN_롱슬리브': { path: '패션의류 > 남성의류 > 티셔츠' },
  'MAN_셔츠': { path: '패션의류 > 남성의류 > 셔츠' },
  'MAN_블라우스': { path: '패션의류 > 남성의류 > 셔츠' },
  'MAN_니트': { path: '패션의류 > 남성의류 > 니트/스웨터' },
  'MAN_스웨터': { path: '패션의류 > 남성의류 > 니트/스웨터' },
  'MAN_카라티': { path: '패션의류 > 남성의류 > 티셔츠' },
  'MAN_터틀넥': { path: '패션의류 > 남성의류 > 니트/스웨터' },
  'MAN_후디': { path: '패션의류 > 남성의류 > 맨투맨/후드' },
  'MAN_맨투맨': { path: '패션의류 > 남성의류 > 맨투맨/후드' },
  'MAN_폴로': { path: '패션의류 > 남성의류 > 티셔츠' },
  'MAN_탱크탑': { path: '패션의류 > 남성의류 > 티셔츠' },
  // 하의
  'MAN_팬츠': { path: '패션의류 > 남성의류 > 바지' },
  'MAN_데님': { path: '패션의류 > 남성의류 > 청바지' },
  'MAN_슬랙스': { path: '패션의류 > 남성의류 > 바지' },
  'MAN_쇼츠': { path: '패션의류 > 남성의류 > 반바지' },
  'MAN_조거': { path: '패션의류 > 남성의류 > 바지' },
  'MAN_치노': { path: '패션의류 > 남성의류 > 바지' },
  'MAN_카고팬츠': { path: '패션의류 > 남성의류 > 바지' },
  'MAN_와이드팬츠': { path: '패션의류 > 남성의류 > 바지' },
  'MAN_부츠컷': { path: '패션의류 > 남성의류 > 바지' },
  // 아우터
  'MAN_자켓': { path: '패션의류 > 남성의류 > 자켓' },
  'MAN_코트': { path: '패션의류 > 남성의류 > 코트' },
  'MAN_블레이저': { path: '패션의류 > 남성의류 > 자켓' },
  'MAN_점퍼': { path: '패션의류 > 남성의류 > 점퍼' },
  'MAN_패딩': { path: '패션의류 > 남성의류 > 패딩' },
  'MAN_가디건': { path: '패션의류 > 남성의류 > 가디건' },
  'MAN_베스트': { path: '패션의류 > 남성의류 > 조끼' },
  'MAN_야상': { path: '패션의류 > 남성의류 > 자켓' },
  'MAN_윈드브레이커': { path: '패션의류 > 남성의류 > 점퍼' },
  'MAN_트렌치코트': { path: '패션의류 > 남성의류 > 코트' },
  'MAN_라이더': { path: '패션의류 > 남성의류 > 자켓' },
  'MAN_필드자켓': { path: '패션의류 > 남성의류 > 자켓' },
  'MAN_사파리자켓': { path: '패션의류 > 남성의류 > 자켓' },

  // ===== WOMAN (여성) =====
  // 상의
  'WOMAN_티셔츠': { path: '패션의류 > 여성의류 > 티셔츠' },
  'WOMAN_반팔': { path: '패션의류 > 여성의류 > 티셔츠' },
  'WOMAN_롱슬리브': { path: '패션의류 > 여성의류 > 티셔츠' },
  'WOMAN_셔츠': { path: '패션의류 > 여성의류 > 블라우스/셔츠' },
  'WOMAN_블라우스': { path: '패션의류 > 여성의류 > 블라우스/셔츠' },
  'WOMAN_니트': { path: '패션의류 > 여성의류 > 니트/스웨터' },
  'WOMAN_스웨터': { path: '패션의류 > 여성의류 > 니트/스웨터' },
  'WOMAN_카라티': { path: '패션의류 > 여성의류 > 티셔츠' },
  'WOMAN_터틀넥': { path: '패션의류 > 여성의류 > 니트/스웨터' },
  'WOMAN_후디': { path: '패션의류 > 여성의류 > 맨투맨/후드' },
  'WOMAN_맨투맨': { path: '패션의류 > 여성의류 > 맨투맨/후드' },
  'WOMAN_폴로': { path: '패션의류 > 여성의류 > 티셔츠' },
  'WOMAN_탱크탑': { path: '패션의류 > 여성의류 > 티셔츠' },
  // 하의
  'WOMAN_팬츠': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_데님': { path: '패션의류 > 여성의류 > 청바지' },
  'WOMAN_스커트': { path: '패션의류 > 여성의류 > 스커트' },
  'WOMAN_쇼츠': { path: '패션의류 > 여성의류 > 반바지' },
  'WOMAN_큐롯': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_슬랙스': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_조거': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_치노': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_카고팬츠': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_와이드팬츠': { path: '패션의류 > 여성의류 > 바지' },
  'WOMAN_부츠컷': { path: '패션의류 > 여성의류 > 바지' },
  // 아우터
  'WOMAN_자켓': { path: '패션의류 > 여성의류 > 자켓' },
  'WOMAN_코트': { path: '패션의류 > 여성의류 > 코트' },
  'WOMAN_블레이저': { path: '패션의류 > 여성의류 > 자켓' },
  'WOMAN_점퍼': { path: '패션의류 > 여성의류 > 점퍼' },
  'WOMAN_패딩': { path: '패션의류 > 여성의류 > 패딩' },
  'WOMAN_가디건': { path: '패션의류 > 여성의류 > 가디건' },
  'WOMAN_베스트': { path: '패션의류 > 여성의류 > 조끼' },
  'WOMAN_야상': { path: '패션의류 > 여성의류 > 자켓' },
  'WOMAN_윈드브레이커': { path: '패션의류 > 여성의류 > 점퍼' },
  'WOMAN_트렌치코트': { path: '패션의류 > 여성의류 > 코트' },
  'WOMAN_라이더': { path: '패션의류 > 여성의류 > 자켓' },
  'WOMAN_필드자켓': { path: '패션의류 > 여성의류 > 자켓' },
  'WOMAN_사파리자켓': { path: '패션의류 > 여성의류 > 자켓' },
  // 원피스
  'WOMAN_원피스': { path: '패션의류 > 여성의류 > 원피스' },
  'WOMAN_드레스': { path: '패션의류 > 여성의류 > 원피스' },
  'WOMAN_점프수트': { path: '패션의류 > 여성의류 > 점프수트' },

  // ===== KIDS =====
  'KIDS_티셔츠': { path: '출산/유아동 > 유아동의류 > 티셔츠' },
  'KIDS_셔츠': { path: '출산/유아동 > 유아동의류 > 셔츠' },
  'KIDS_팬츠': { path: '출산/유아동 > 유아동의류 > 바지' },
  'KIDS_자켓': { path: '출산/유아동 > 유아동의류 > 자켓' },
  'KIDS_코트': { path: '출산/유아동 > 유아동의류 > 코트' },
  'KIDS_점퍼': { path: '출산/유아동 > 유아동의류 > 점퍼' },
  'KIDS_패딩': { path: '출산/유아동 > 유아동의류 > 패딩' },
};

// 의류 서브타입 → 부모 타입 매핑 (fallback용)
const SUBTYPE_TO_PARENT: Record<string, string> = {
  '롱슬리브': '티셔츠', '반팔': '티셔츠', '카라티': '티셔츠', '탱크탑': '티셔츠',
  '스웨터': '니트', '터틀넥': '니트',
  '카고팬츠': '팬츠', '와이드팬츠': '팬츠', '부츠컷': '팬츠', '치노': '팬츠', '조거': '팬츠',
  '블레이저': '자켓', '야상': '자켓', '라이더': '자켓', '필드자켓': '자켓', '사파리자켓': '자켓',
  '윈드브레이커': '점퍼', '트렌치코트': '코트',
  '드레스': '원피스', '점프수트': '원피스',
};

export function suggestNaverCategory(
  clothingSubType: ClothingSubType,
  gender: Gender
): string | null {
  const g = gender === 'UNKNOWN' || gender === 'UNISEX' ? 'MAN' : gender;

  // 1. 직접 매칭
  const directKey = `${g}_${clothingSubType}`;
  if (CATEGORY_MAP[directKey]) return CATEGORY_MAP[directKey].path;

  // 2. 부모 타입으로 fallback
  const parent = SUBTYPE_TO_PARENT[clothingSubType];
  if (parent) {
    const parentKey = `${g}_${parent}`;
    if (CATEGORY_MAP[parentKey]) return CATEGORY_MAP[parentKey].path;
  }

  return null;
}
