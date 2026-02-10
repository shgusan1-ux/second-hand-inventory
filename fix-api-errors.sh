#!/bin/bash

echo "🔧 API 에러 핸들링 일괄 수정 중..."
echo ""

count=0

# API 라우트 파일들 찾기
for file in src/app/api/**/route.ts; do
  # 이미 수정한 파일 건너뛰기
  if grep -q "handleApiError" "$file" 2>/dev/null; then
    continue
  fi
  
  # import 추가 (없으면)
  if ! grep -q "from '@/lib/api-utils'" "$file" 2>/dev/null; then
    # NextResponse import 라인 찾아서 그 다음에 추가
    sed -i "/import.*NextResponse/a import { handleApiError, handleAuthError, handleSuccess } from '@/lib/api-utils';" "$file" 2>/dev/null && echo "✅ $file"
    ((count++))
  fi
done

echo ""
echo "📝 $count개 파일에 import 추가 완료"
echo ""
echo "⚠️  각 파일의 catch 블록은 수동으로 확인이 필요합니다."
