// Vision 분석 관련 타입 정의

export interface GeminiVisionResult {
  brand: string;
  clothingType: string;        // 상의, 하의, 아우터, 원피스, 기타
  clothingSubType: string;     // 자켓, 셔츠, 팬츠 등
  gender: string;              // MAN, WOMAN, UNISEX, UNKNOWN
  grade: 'S급' | 'A급' | 'B급';
  gradeReason: string;
  colors: string[];            // ["네이비", "화이트"]
  pattern: string;             // 스트라이프, 체크, 솔리드 등
  fabric: string;              // 면 100%, 폴리에스터 65% 면 35%
  size: string;                // M, 95, XL
  hasBadge: boolean;           // 이미지 내 인위적 뱃지(S, A, B, V 등) 존재 여부
  confidence: number;          // 0-100
}

export interface VisionAnalysisRecord {
  origin_product_no: string;
  vision_brand: string | null;
  vision_clothing_type: string | null;
  vision_clothing_sub_type: string | null;
  vision_gender: string | null;
  vision_grade: string | null;
  vision_grade_reason: string | null;
  vision_color: string | null;       // JSON
  vision_pattern: string | null;
  vision_fabric: string | null;
  vision_size: string | null;
  vision_has_badge: boolean | null;
  vision_confidence: number;
  merged_confidence: number;
  image_urls: string | null;          // JSON
  raw_response: string | null;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchFailureDetail {
  productNo: string;
  productName: string;
  error: string;
  timestamp: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentProduct?: string;
  currentProductNo?: string;
  startedAt: string;
  failures?: BatchFailureDetail[];
}

export interface VisionStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  avgConfidence: number;
  byGrade: Record<string, number>;
  byClothingType: Record<string, number>;
}
