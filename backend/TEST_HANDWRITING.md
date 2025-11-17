# 필기 감지 테스트 방법

## 1. 분석만 수행 (저장하지 않음)

### Postman 또는 curl 사용

```bash
# 로그인하여 토큰 받기
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "professor@test.com",
    "password": "test1234"
  }'

# 토큰을 변수에 저장 (예: TOKEN="eyJhbGci...")

# 필기 분석 실행
curl -X POST http://localhost:8080/api/handwriting/analyze-test \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### 예상 응답

```json
{
  "success": true,
  "message": "필기량 분석이 완료되었습니다.",
  "total_images": 6,
  "filtered_count": 3,
  "results": [
    {
      "index": 0,
      "file": "0.jpeg",
      "text_length": 1234,
      "text_preview": "...",
      "is_page_changed": false
    },
    {
      "index": 1,
      "file": "1.jpeg",
      "text_length": 2345,
      "text_preview": "...",
      "is_page_changed": false
    },
    {
      "index": 4,
      "file": "4.jpeg",
      "text_length": 3456,
      "text_preview": "...",
      "is_page_changed": true
    }
  ]
}
```

## 2. 분석 및 자동 저장

### Postman 또는 curl 사용

```bash
# 필기 감지 및 저장
curl -X POST http://localhost:8080/api/handwriting/detect-and-save \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1
  }'
```

### 예상 응답

```json
{
  "success": true,
  "message": "3개의 필기 페이지가 저장되었습니다.",
  "lecture_id": "LEC-32AEBA14",
  "class_id": 1,
  "analysis": {
    "total_images": 6,
    "filtered_count": 3,
    "all_results": [
      {
        "index": 0,
        "file": "0.jpeg",
        "text_length": 1234,
        "text_preview": "...",
        "is_writing_increased": true,
        "is_page_changed": false
      },
      {
        "index": 1,
        "file": "1.jpeg",
        "text_length": 2345,
        "text_preview": "...",
        "is_writing_increased": true,
        "is_page_changed": false
      },
      {
        "index": 2,
        "file": "2.jpeg",
        "text_length": 1800,
        "text_preview": "...",
        "is_writing_increased": false,
        "is_page_changed": false
      },
      {
        "index": 3,
        "file": "3.jpeg",
        "text_length": 1500,
        "text_preview": "...",
        "is_writing_increased": false,
        "is_page_changed": false
      },
      {
        "index": 4,
        "file": "4.jpeg",
        "text_length": 3456,
        "text_preview": "...",
        "is_writing_increased": true,
        "is_page_changed": true
      },
      {
        "index": 5,
        "file": "5.jpeg",
        "text_length": 4567,
        "text_preview": "...",
        "is_writing_increased": true,
        "is_page_changed": false
      }
    ]
  },
  "saved_pages": [
    {
      "page_number": 1,
      "image_path": "/handwriting_test/0.jpeg",
      "pdf_path": "/uploads/pdfs/whiteboard/...",
      "text_length": 1234,
      "original_index": 0,
      "original_file": "0.jpeg"
    },
    {
      "page_number": 2,
      "image_path": "/handwriting_test/1.jpeg",
      "pdf_path": "/uploads/pdfs/whiteboard/...",
      "text_length": 2345,
      "original_index": 1,
      "original_file": "1.jpeg"
    },
    {
      "page_number": 3,
      "image_path": "/handwriting_test/4.jpeg",
      "pdf_path": "/uploads/pdfs/whiteboard/...",
      "text_length": 3456,
      "original_index": 4,
      "original_file": "4.jpeg"
    }
  ]
}
```

## 3. 서버 콘솔에서 확인

서버를 실행하면 콘솔에 다음과 같은 로그가 출력됩니다:

```
필기량 변화 감지 시작...

=== 전체 분석 결과 ===
[0] 0.jpeg: 길이=1234, 증가=true, 페이지변경=false
[1] 1.jpeg: 길이=2345, 증가=true, 페이지변경=false
[2] 2.jpeg: 길이=1800, 증가=false, 페이지변경=false
[3] 3.jpeg: 길이=1500, 증가=false, 페이지변경=false
[4] 4.jpeg: 길이=3456, 증가=true, 페이지변경=true
[5] 5.jpeg: 길이=4567, 증가=true, 페이지변경=false

=== 필터링된 결과 (필기량 증가만) ===
[0] 0.jpeg: 길이=1234
[1] 1.jpeg: 길이=2345
[4] 4.jpeg: 길이=3456
```

## 예상 결과 (개선된 로직)

- **0.jpeg**: 필기 증가 → 저장 ✓
- **1.jpeg**: 필기 증가 → 저장 ✓
- **2.jpeg**: 필기 감소 (1→2) → 제외 (1만 저장됨)
- **3.jpeg**: 필기 감소 (2→3) → 제외 (1만 저장됨)
- **4.jpeg**: 필기 증가 + 페이지 변경 → 저장 ✓
- **5.jpeg**: 필기 증가 → 저장 ✓

**최종 저장**: 0, 1, 4, 5 (총 4개)

## 주의사항

1. 교수 권한이 필요합니다 (`user_type: "professor"`)
2. `handwriting_test` 폴더에 0.jpeg ~ 5.jpeg 파일이 있어야 합니다
3. Google Cloud Vision API 키가 설정되어 있어야 OCR이 작동합니다

