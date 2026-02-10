#!/bin/bash

echo "🚀 Vercel 환경 변수 업로드 시작..."
echo ""

# .env.local 파일 읽기
while IFS= read -r line || [ -n "$line" ]; do
  # 빈 줄이나 주석 건너뛰기
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    continue
  fi
  
  # KEY=VALUE 형식 파싱
  if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
    KEY="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"
    
    # 앞뒤 공백 제거
    KEY=$(echo "$KEY" | xargs)
    
    # 따옴표 제거 (있으면)
    VALUE=$(echo "$VALUE" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
    
    echo "📤 설정 중: $KEY"
    
    # Vercel에 환경 변수 추가 (production, preview 모두)
    echo "$VALUE" | vercel env add "$KEY" production preview --force > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
      echo "   ✅ 성공"
    else
      echo "   ⚠️  실패 (수동 확인 필요)"
    fi
  fi
done < .env.local

echo ""
echo "✨ 완료! Vercel 웹사이트에서 확인해보세요."
echo "   https://vercel.com/dashboard"
