#!/bin/bash
echo "🔍 DB 쿼리 분석 중..."
echo ""

# API 파일에서 db.query 호출 찾기
echo "=== db.query 호출 횟수 (파일별) ==="
grep -r "db.query" src/app/api --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn

echo ""
echo "=== SELECT * 쿼리 (데이터 전송량 많음) ==="
grep -r "SELECT \*" src/app/api --include="*.ts" -n

echo ""
echo "=== CREATE TABLE IF NOT EXISTS (매번 실행) ==="
grep -r "CREATE TABLE IF NOT EXISTS" src/app/api --include="*.ts" | wc -l

echo ""
echo "=== JOIN 쿼리 (복잡한 쿼리) ==="
grep -r "JOIN" src/app/api --include="*.ts" | wc -l
