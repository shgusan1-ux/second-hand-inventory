// 의류 타입 매칭: 한국어 키워드 기반
import type { ClothingType, ClothingSubType, ClothingMatch } from './types';

interface KeywordEntry {
  type: ClothingType;
  subType: ClothingSubType;
  keywords: string[];
}

// 긴 키워드 우선 매칭을 위해 순서 중요
const KEYWORD_ENTRIES: KeywordEntry[] = [
  // === 아우터 (구체적인 것 먼저) ===
  { type: '아우터', subType: '트렌치코트', keywords: ['트렌치코트', '트렌치 코트', '트렌치'] },
  { type: '아우터', subType: '필드자켓', keywords: ['필드자켓', '필드 자켓', 'M-65', 'M65', '개파카'] },
  { type: '아우터', subType: '사파리자켓', keywords: ['사파리자켓', '사파리 자켓', '사파리'] },
  { type: '아우터', subType: '윈드브레이커', keywords: ['윈드브레이커', '바람막이', '윈드자켓'] },
  { type: '아우터', subType: '라이더', keywords: ['라이더자켓', '라이더 자켓', '라이더', '바이커자켓', '바이커'] },
  { type: '아우터', subType: '패딩', keywords: ['패딩', '다운자켓', '다운 자켓', '구스다운', '패딩자켓', '패딩점퍼', '다운'] },
  { type: '아우터', subType: '블레이저', keywords: ['블레이저', '정장자켓', '싱글 블레이저', '더블 블레이저'] },
  { type: '아우터', subType: '가디건', keywords: ['가디건', '카디건', '가디간'] },
  { type: '아우터', subType: '베스트', keywords: ['베스트', '조끼', '질레'] },
  { type: '아우터', subType: '야상', keywords: ['야상', '밀리터리자켓'] },
  { type: '아우터', subType: '점퍼', keywords: ['점퍼', '잠바', '점바', '윈터자켓', '윈터 자켓'] },
  { type: '아우터', subType: '코트', keywords: ['코트', '오버코트', '더플코트', '피코트', '울코트'] },
  { type: '아우터', subType: '자켓', keywords: ['자켓', '재킷', '져킷', 'JKT'] },

  // === 원피스 ===
  { type: '원피스', subType: '점프수트', keywords: ['점프수트', '올인원'] },
  { type: '원피스', subType: '원피스', keywords: ['원피스', '셔츠 원피스', '셔츠원피스'] },
  { type: '원피스', subType: '드레스', keywords: ['드레스'] },

  // === 하의 (구체적인 것 먼저) ===
  { type: '하의', subType: '카고팬츠', keywords: ['카고팬츠', '카고 팬츠', '카고'] },
  { type: '하의', subType: '와이드팬츠', keywords: ['와이드팬츠', '와이드 팬츠', '와이드'] },
  { type: '하의', subType: '부츠컷', keywords: ['부츠컷', '부츠 컷', '플레어팬츠', '플레어 팬츠'] },
  { type: '하의', subType: '큐롯', keywords: ['큐롯', '큐롯팬츠'] },
  { type: '하의', subType: '슬랙스', keywords: ['슬랙스', '드레스 팬츠', '드레스팬츠', '정장바지'] },
  { type: '하의', subType: '조거', keywords: ['조거', '조거팬츠', '트레이닝팬츠'] },
  { type: '하의', subType: '치노', keywords: ['치노', '치노팬츠', '면바지'] },
  { type: '하의', subType: '데님', keywords: ['데님', '청바지', '진', '진팬츠', '워싱 데님'] },
  { type: '하의', subType: '쇼츠', keywords: ['쇼츠', '숏팬츠', '반바지', '숏츠'] },
  { type: '하의', subType: '스커트', keywords: ['스커트', '치마', '롱스커트', '미니스커트', '미디스커트', '플레어'] },
  { type: '하의', subType: '팬츠', keywords: ['팬츠', '바지', '팬트'] },

  // === 상의 (구체적인 것 먼저) ===
  { type: '상의', subType: '롱슬리브', keywords: ['롱슬리브', '롱 슬리브', '긴팔티'] },
  { type: '상의', subType: '반팔', keywords: ['반팔', '숏슬리브', '숏 슬리브', '반팔티'] },
  { type: '상의', subType: '후디', keywords: ['후디', '후드', '후드티', '후디드'] },
  { type: '상의', subType: '맨투맨', keywords: ['맨투맨', '스웻셔츠', '스웨트셔츠', '스웻'] },
  { type: '상의', subType: '터틀넥', keywords: ['터틀넥', '목폴라', '폴라', '하이넥'] },
  { type: '상의', subType: '폴로', keywords: ['폴로', '카라티', 'PK셔츠'] },
  { type: '상의', subType: '탱크탑', keywords: ['탱크탑', '나시', '민소매', '슬리브리스'] },
  { type: '상의', subType: '블라우스', keywords: ['블라우스'] },
  { type: '상의', subType: '니트', keywords: ['니트', '니트웨어', '케이블 니트', '케이블니트'] },
  { type: '상의', subType: '스웨터', keywords: ['스웨터', '풀오버', '크루넥 스웨터'] },
  { type: '상의', subType: '카라티', keywords: ['카라 티', '카라 티셔츠'] },
  { type: '상의', subType: '셔츠', keywords: ['셔츠', '옥스포드', '드레스셔츠'] },
  { type: '상의', subType: '티셔츠', keywords: ['티셔츠', '티', 'T셔츠', 'TEE'] },

  // === 기타 ===
  { type: '기타', subType: '가방', keywords: ['가방', '백', '토트백', '크로스백', '숄더백', '백팩'] },
  { type: '기타', subType: '모자', keywords: ['모자', '캡', '비니', '버킷햇', '페도라'] },
  { type: '기타', subType: '신발', keywords: ['신발', '부츠', '스니커즈', '로퍼', '샌들'] },
  { type: '기타', subType: '머플러', keywords: ['머플러', '목도리', '숄', '스카프'] },
  { type: '기타', subType: '벨트', keywords: ['벨트'] },
  { type: '기타', subType: '액세서리', keywords: ['액세서리', '넥타이', '브로치', '뱃지'] },
];

export function matchClothingType(description: string): ClothingMatch {
  // 공백 제거 버전도 함께 검사 (롱 슬리브 vs 롱슬리브)
  const normalized = description.toLowerCase();
  const noSpace = normalized.replace(/\s+/g, '');

  for (const entry of KEYWORD_ENTRIES) {
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      const kwNoSpace = kw.replace(/\s+/g, '');

      if (normalized.includes(kw) || noSpace.includes(kwNoSpace)) {
        return {
          type: entry.type,
          subType: entry.subType,
          matchedKeyword: keyword,
        };
      }
    }
  }

  return { type: '기타', subType: '기타', matchedKeyword: '' };
}
