# MongoDB GridFS 파일 저장 마이그레이션

## 개요
기존 파일 시스템(`/uploads`) 기반 파일 저장 방식을 MongoDB GridFS로 전환하여, 배포 시 다른 컴퓨터에서도 파일에 접근할 수 있도록 변경했습니다.

## 주요 변경 사항

### 1. GridFS 유틸리티 모듈 생성
- **파일**: `backend/utils/gridfs.js`
- **기능**: 파일 저장/읽기/삭제 및 존재 여부 확인

### 2. 파일 서빙 라우트 추가
- **엔드포인트**: `GET /api/files/:fileId`
- **기능**: GridFS에 저장된 파일을 스트리밍으로 제공

### 3. 업로드 설정 변경
- **PDF 업로드** (`backend/config/upload.js`): diskStorage → memoryStorage
- **이미지 업로드** (`backend/config/uploadImage.js`): diskStorage → memoryStorage

### 4. GridFS 업로드 미들웨어
- **파일**: `backend/middleware/uploadToGridFS.js`
- **기능**: multer로 업로드된 파일을 자동으로 GridFS에 저장

### 5. 업로드 로직 변경
- ✅ **썸네일**: GridFS 저장
- ✅ **프로필 이미지**: GridFS 저장
- ✅ **원본 PDF**: GridFS 저장
- ✅ **분할된 PDF 페이지**: GridFS 저장
- ✅ **필기 이미지**: GridFS 저장

## 파일 URL 형식

### 기존 (파일 시스템)
```
/uploads/images/thumbnail-1234567890-123456789.png
/uploads/pdfs/pdf-1234567890-123456789.pdf
```

### 변경 후 (GridFS)
```
/api/files/507f1f77bcf86cd799439011
/api/files/507f191e810c19729de860ea
```

## 마이그레이션된 라우트

1. **강의 생성** (`POST /api/professor/lectures/create`)
   - 썸네일 → GridFS

2. **프로필 수정** (`PUT /api/myinfo`)
   - 프로필 이미지 → GridFS

3. **PDF 업로드** (`POST /api/lectures/:lectureId/classes/:classId/materials/upload`)
   - 원본 PDF → GridFS
   - 분할된 PDF 페이지 → GridFS

4. **필기 저장** (`POST /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting`)
   - 필기 이미지 → GridFS

## 하위 호환성

기존 파일 시스템 경로(`/uploads/...`)와 새로운 GridFS URL(`/api/files/:fileId`) 모두 지원합니다.

- GridFS URL: `/api/files/:fileId` → GridFS에서 파일 제공
- 파일 시스템 경로: `/uploads/...` → 기존 static 파일 서빙 유지

## 아직 파일 시스템에 저장되는 항목

- PDF에서 변환된 이미지 (OCR 처리용 임시 파일)
- 화이트보드 스냅샷 이미지 (일부 경로)

이 항목들은 향후 점진적으로 GridFS로 마이그레이션할 수 있습니다.

참고: 필기 이미지는 이미 GridFS에 저장되지만, OCR 처리를 위해 임시로 파일 시스템에도 저장됩니다.

## 주의사항

1. MongoDB 연결이 필수입니다. GridFS는 MongoDB에 의존합니다.
2. 기존 `/uploads` 디렉토리의 파일들은 GridFS로 마이그레이션해야 합니다.
3. 파일 삭제 시 GridFS에서도 삭제해야 합니다.

