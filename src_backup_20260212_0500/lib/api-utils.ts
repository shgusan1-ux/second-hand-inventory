import { NextResponse } from 'next/server';

/**
 * API 에러 응답을 안전하게 반환합니다.
 * - 개발 환경: 상세한 에러 메시지 표시
 * - 프로덕션: 일반화된 메시지만 표시
 */
export function handleApiError(error: any, context?: string) {
  const isDev = process.env.NODE_ENV === 'development';

  // 서버 로그에는 항상 상세 정보 기록
  if (context) {
    console.error(`[API Error - ${context}]`, error);
  } else {
    console.error('[API Error]', error);
  }

  // 클라이언트에는 환경에 따라 다른 메시지 전달
  const clientMessage = isDev
    ? error.message || 'Unknown error'
    : '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

  return NextResponse.json(
    {
      success: false,
      error: clientMessage,
      // 개발 환경에서만 스택 트레이스 포함
      ...(isDev && error.stack ? { stack: error.stack } : {})
    },
    { status: 500 }
  );
}

/**
 * 인증 실패 에러 응답
 */
export function handleAuthError(error: any) {
  const isDev = process.env.NODE_ENV === 'development';

  console.error('[Auth Error]', error);

  const clientMessage = isDev
    ? `인증 실패: ${error.message}`
    : '인증에 실패했습니다.';

  return NextResponse.json(
    { success: false, error: clientMessage },
    { status: 401 }
  );
}

/**
 * 잘못된 요청 에러 응답
 */
export function handleBadRequest(message: string) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  );
}

/**
 * 성공 응답
 */
export function handleSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}
