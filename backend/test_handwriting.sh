#!/bin/bash

# 필기 감지 테스트 스크립트
# 사용법: ./test_handwriting.sh [TOKEN]

BASE_URL="http://localhost:8080"
TOKEN="${1:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ 토큰이 필요합니다."
  echo "사용법: ./test_handwriting.sh YOUR_TOKEN"
  echo ""
  echo "토큰을 받으려면:"
  echo "curl -X POST $BASE_URL/api/login \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"email\":\"professor@test.com\",\"password\":\"test1234\"}'"
  exit 1
fi

echo "🔍 필기 분석 시작..."
echo ""

# 분석만 수행
RESPONSE=$(curl -s -X POST "$BASE_URL/api/handwriting/analyze-test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "📊 분석 결과:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# JSON 파싱이 가능한지 확인
if command -v jq &> /dev/null; then
  FILTERED_COUNT=$(echo "$RESPONSE" | jq -r '.filtered_count // 0')
  echo "✅ 필터링된 이미지 수: $FILTERED_COUNT"
  
  if [ "$FILTERED_COUNT" -gt 0 ]; then
    echo ""
    echo "📝 저장될 이미지:"
    echo "$RESPONSE" | jq -r '.results[] | "  - [\(.index)] \(.file) (길이: \(.text_length))"'
  fi
else
  echo "💡 jq가 설치되어 있으면 더 자세한 결과를 볼 수 있습니다."
fi

