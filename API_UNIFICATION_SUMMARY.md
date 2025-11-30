# API 통일 및 개선 요약

## 📋 개요
교안(PDF/Material/Whiteboard) 관련 API를 통일된 구조로 재설계하여, 페이지별 관리 및 실시간 필기 기능을 구현했습니다.

## 🔄 주요 변경사항

### 1. 통일된 교안 API 생성 (`/backend/routes/materials.js`)

#### **GET `/api/lectures/:lectureId/classes/:classId/materials/pages`**
- **목적**: 페이지별 교안 조회 (통일된 API)
- **권한**: 교수자/학생 모두 사용 가능
- **응답 구조**:
  ```json
  {
    "success": true,
    "lecture_id": "LEC-xxx",
    "class_id": 1,
    "class_title": "클래스 제목",
    "total_pages": 10,
    "pages": [
      {
        "page_number": 1,
        "image_path": "http://...",
        "pdf_path": "http://...",
        "text": "OCR 텍스트",
        "status": "finalized",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "original_materials": [...]
  }
  ```

#### **GET `/api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber`**
- **목적**: 특정 페이지의 교안 조회
- **권한**: 교수자/학생 모두 사용 가능

#### **GET `/api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting`**
- **목적**: 특정 페이지의 필기 내역 조회 (강의 중간 필기 포함)
- **권한**: 교수자/학생 모두 사용 가능
- **응답 구조**:
  ```json
  {
    "success": true,
    "page_number": 1,
    "current_page": {...},
    "history": [
      {
        "page_number": 1,
        "image_path": "...",
        "pdf_path": "...",
        "text": "...",
        "text_length": 100,
        "status": "draft",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total_versions": 5
  }
  ```

#### **POST `/api/lectures/:lectureId/classes/:classId/materials/upload`**
- **목적**: PDF 업로드 및 자동 페이지 분할 저장
- **권한**: 교수자만 가능
- **기능**:
  - PDF 파일을 페이지별로 자동 분할
  - 각 페이지를 WhiteboardPage에 저장
  - OCR을 통한 텍스트 추출
  - materials 배열에 원본 PDF 정보 저장

#### **POST `/api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting`**
- **목적**: 페이지별 실시간 필기 저장 및 필기량 증가 확인
- **권한**: 교수자만 가능
- **기능**:
  - 페이지 번호 기반 필기 저장
  - 필기량 증가 확인 (텍스트 길이, 유사도 분석)
  - 필기량이 증가하지 않으면 저장하지 않음
  - draft 상태로 저장 (강의 종료 후 finalized 가능)

#### **PUT `/api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/finalize`**
- **목적**: 페이지의 draft 필기를 finalized로 변경
- **권한**: 교수자만 가능
- **사용 시점**: 강의 종료 시

### 2. 기존 API 수정

#### **`/api/professor/lectures/:lectureId/classes/:classId/pdf` (GET)**
- 하위 호환성을 위해 유지
- 통일된 API 사용 권장 메시지 추가
- 기존 응답 형식 유지

#### **`/api/professor/lectures/:lectureId/classes/:classId/uploadpdf` (POST)**
- 하위 호환성을 위해 유지
- 통일된 API로 리다이렉트 권장

#### **`/api/student/lectures/:lectureId/classes/:classId/materials` (GET)**
- 하위 호환성을 위해 유지
- 통일된 API 사용 권장 메시지 추가

### 3. 서버 설정 변경

#### **`/backend/server.js`**
- `materialsRouter` 추가 및 등록
- 모든 교안 관련 요청을 통일된 구조로 처리

## 📁 파일 변경 내역

### 새로 생성된 파일
- ✅ `backend/routes/materials.js` - 통일된 교안 API

### 수정된 파일
- ✅ `backend/server.js` - materials 라우터 추가
- ✅ `backend/routes/professor/classes.js` - 기존 API에 권장 메시지 추가
- ✅ `backend/routes/student.js` - 기존 API에 권장 메시지 추가

## 🎯 주요 개선사항

### 1. 페이지별 교안 관리
- 모든 교안이 페이지 단위로 분할되어 관리됨
- 각 페이지는 WhiteboardPage 모델에 저장
- 페이지 번호 기반 조회 및 필기 관리

### 2. 실시간 필기 저장
- 페이지 번호를 추적하여 정확한 페이지에 필기 저장
- 필기량 증가 확인 후 저장 여부 결정
- draft/finalized 상태 관리

### 3. 필기량 증가 확인
- 텍스트 길이 비교
- 유사도 분석 (Jaccard 유사도)
- 필기량이 증가하지 않으면 저장하지 않음

### 4. 강의 중간 필기 내역 조회
- 각 페이지의 필기 히스토리 조회 가능
- 시간순 정렬로 필기 변화 추적
- draft 상태의 필기도 포함

## 🔌 API 사용 가이드

### 교안 조회 (페이지별)
```javascript
// 통일된 API 사용
GET /api/lectures/:lectureId/classes/:classId/materials/pages
GET /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber
```

### PDF 업로드
```javascript
// 통일된 API 사용 (자동 페이지 분할)
POST /api/lectures/:lectureId/classes/:classId/materials/upload
Content-Type: multipart/form-data
Body: { pdf: File }
```

### 실시간 필기 저장
```javascript
// 페이지별 필기 저장
POST /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting
Body: {
  image_data: "base64...",
  timestamp: 1234567890,
  pdf_url?: "http://..."
}
```

### 필기 내역 조회
```javascript
// 특정 페이지의 필기 내역 조회
GET /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting
```

### 필기 최종화
```javascript
// draft 필기를 finalized로 변경
PUT /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/finalize
```

## 📝 다음 단계 (프론트엔드)

1. **교안 조회 API 변경**
   - 기존: `/api/professor/lectures/:lectureId/classes/:classId/pdf`
   - 변경: `/api/lectures/:lectureId/classes/:classId/materials/pages`

2. **PDF 업로드 API 변경**
   - 기존: `/api/professor/lectures/:lectureId/classes/:classId/uploadpdf`
   - 변경: `/api/lectures/:lectureId/classes/:classId/materials/upload`

3. **실시간 필기 저장**
   - 페이지 번호를 추적하여 저장
   - `/api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting` 사용

4. **페이지별 필기 내역 조회**
   - 강의 중간에 필기 내역 확인 가능
   - `/api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting` 사용

## ⚠️ 주의사항

1. **하위 호환성**: 기존 API는 유지되지만, 통일된 API 사용을 권장합니다.
2. **페이지 번호**: 페이지 번호는 1부터 시작합니다.
3. **필기 저장**: 필기량이 증가하지 않으면 저장되지 않습니다.
4. **상태 관리**: 실시간 필기는 draft 상태로 저장되며, 강의 종료 시 finalized로 변경합니다.

## 🎉 완료된 작업

- ✅ 통일된 교안 조회 API 생성
- ✅ 페이지별 교안 관리
- ✅ PDF 업로드 시 자동 페이지 분할
- ✅ 실시간 필기 저장 (페이지별)
- ✅ 필기량 증가 확인 (페이지별)
- ✅ 강의 중간 필기 내역 조회
- ✅ 기존 API 하위 호환성 유지

