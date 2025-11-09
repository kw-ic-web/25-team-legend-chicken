# 화이트보드 스냅샷 기능 가이드

## 1. 기능 개요

강의자의 필기 화면을 주기적으로 캡처하여 Google Cloud Vision API로 텍스트를 분석합니다.  
텍스트 변화량을 기반으로 슬라이드 이동/필기 삭제를 감지하고, 페이지 전환 시 직전 화면을 PDF로 저장합니다.

생성된 PDF는 `uploads/pdfs/whiteboard/` 디렉터리에 저장되며 `/uploads/pdfs/whiteboard/...` 경로로 접근할 수 있습니다.

---

## 2. 사전 준비

### Google Cloud Vision API 설정
1. GCP에서 Vision API가 활성화된 프로젝트 생성
2. 서비스 계정 생성 후 JSON 키 다운로드
3. 백엔드 서버 실행 환경에 아래 환경변수 추가

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

혹은 `.env` 파일에 절대 경로를 지정하세요.

### 의존성
다음 패키지가 설치되어 있어야 합니다.

```
@google-cloud/vision
pdfkit
fs-extra
```

`npm install` 후 서버를 재시작하세요.

---

## 3. API 사용 방법

### 3.1 스냅샷 업로드
- **Endpoint**: `POST /api/lectures/{lectureId}/classes/{classId}/whiteboard/snapshot`
- **인증**: Bearer 토큰 (교수 계정)
- **Body (multipart/form-data)**:
  - `snapshot`: 이미지 파일 (jpg, jpeg, png, gif, webp)

### 3.2 처리 결과
- `action` 값으로 동작 결과를 확인할 수 있습니다.
  - `draft_created`: 새로운 페이지 초안 생성
  - `draft_updated`: 현재 페이지 업데이트
  - `finalized_and_new_draft`: 이전 페이지 PDF 저장 후 새 페이지 시작

응답 예시:

```json
{
  "success": true,
  "action": "finalized_and_new_draft",
  "finalized_page": {
    "page_number": 2,
    "pdf_path": "/uploads/pdfs/whiteboard/whiteboard-LEC-123-CLASS1-p2-1700000000000.pdf"
  },
  "draft_page": {
    "page_number": 3,
    "image_path": "/uploads/whiteboard/snapshot-1700000000500-123456789.png",
    "text": "다음 장 필기 시작..."
  }
}
```

---

## 4. Postman 테스트 방법

1. **Method**: `POST`
2. **URL**: `http://localhost:8080/api/lectures/LEC-XXXX/classes/CLASS-01/whiteboard/snapshot`
3. **Authorization**: Bearer Token (교수 계정 JWT)
4. **Body**: `form-data` 선택 후
   - Key: `snapshot` / Type: `File` / Value: 캡처 이미지 파일
5. **Send** 버튼 클릭

---

## 5. 내부 동작

1. 업로드된 이미지를 `/uploads/whiteboard/`에 저장
2. Google Cloud Vision API로 텍스트 추출
3. 이전 텍스트와 유사도 계산
   - 유사도가 0.45 미만 또는 텍스트 길이가 큰 폭으로 감소하면 페이지 전환으로 판단
4. 페이지 전환 시, 직전 초안을 PDF로 저장한 후 상태를 `finalized`로 변경
5. 현재 이미지를 새로운 `draft` 페이지로 등록

---

## 6. 에러 대응

| 상황 | 조치 |
| --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS` 미설정 | 환경 변수 설정 후 서버 재시작 |
| Vision API 권한 오류 | 서비스 계정에 Vision API 사용 권한 부여 |
| 403 Forbidden | 교수 계정인지 확인 |
| 400 Bad Request | `snapshot` 필드 업로드 여부 확인 |

---

필요한 API 키나 추가 설정이 있으면 언제든지 알려주세요. 😊

