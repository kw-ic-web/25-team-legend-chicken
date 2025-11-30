# 프론트엔드 API 마이그레이션 가이드

## 📋 개요
통일된 Materials API를 프론트엔드에 연결했습니다. 기존 API 함수들은 하위 호환성을 유지하면서 내부적으로 통일된 API를 사용하도록 변경되었습니다.

## ✅ 완료된 작업

### 1. 새로운 통일된 API 함수 생성
- **파일**: `frontend/src/api/materials.ts`
- 통일된 Materials API를 사용하는 새로운 함수들 추가

### 2. 기존 API 함수 업데이트
기존 API 함수들이 내부적으로 통일된 API를 사용하도록 변경되었습니다:
- `getClassPdfs()` → 내부적으로 `getMaterialPages()` 사용
- `uploadClassPdf()` → 내부적으로 `uploadMaterial()` 사용
- `getClassMaterials()` → 내부적으로 `getMaterialPages()` 사용

## 📝 새로운 API 함수

### `getMaterialPages(lectureId, classId, status?)`
페이지별 교안 조회
```typescript
import { getMaterialPages } from "@/api/materials";

const pages = await getMaterialPages("LEC-xxx", 1, "finalized");
// pages.pages: 페이지별 교안 배열
// pages.total_pages: 총 페이지 수
```

### `getMaterialPage(lectureId, classId, pageNumber)`
특정 페이지 조회
```typescript
import { getMaterialPage } from "@/api/materials";

const page = await getMaterialPage("LEC-xxx", 1, 1);
```

### `uploadMaterial(lectureId, classId, file, onProgress?)`
PDF 업로드 및 자동 페이지 분할
```typescript
import { uploadMaterial } from "@/api/materials";

const result = await uploadMaterial(
  "LEC-xxx",
  1,
  file,
  (progress) => console.log(`${progress}%`)
);
// result.pages: 분할된 페이지 배열
// result.total_pages: 총 페이지 수
```

### `getHandwritingHistory(lectureId, classId, pageNumber)`
필기 내역 조회
```typescript
import { getHandwritingHistory } from "@/api/materials";

const history = await getHandwritingHistory("LEC-xxx", 1, 1);
// history.history: 필기 히스토리 배열
// history.current_page: 현재 최종 필기
```

### `saveHandwriting(lectureId, classId, pageNumber, imageData, timestamp, pdfUrl?)`
실시간 필기 저장
```typescript
import { saveHandwriting } from "@/api/materials";

const result = await saveHandwriting(
  "LEC-xxx",
  1,
  1,
  base64ImageData,
  Date.now(),
  pdfUrl
);
```

### `finalizePage(lectureId, classId, pageNumber)`
필기 최종화
```typescript
import { finalizePage } from "@/api/materials";

await finalizePage("LEC-xxx", 1, 1);
```

## 🔄 마이그레이션 가이드

### 기존 코드 (여전히 작동)
```typescript
import { getClassPdfs } from "@/api/professor";
import { uploadClassPdf } from "@/api/professor";

// 기존 방식도 계속 작동합니다
const pdfs = await getClassPdfs(lectureId, classId);
await uploadClassPdf(lectureId, classId, file);
```

### 권장: 새로운 통일된 API 사용
```typescript
import { getMaterialPages, uploadMaterial } from "@/api/materials";

// 페이지별 교안 조회 (더 많은 정보 제공)
const pages = await getMaterialPages(lectureId, classId);

// PDF 업로드 (자동 페이지 분할)
await uploadMaterial(lectureId, classId, file);
```

## 📊 주요 변경 사항

### 1. 응답 형식 개선
- 기존: PDF URL 배열만 반환
- 새로운: 페이지별 상세 정보 (이미지, PDF, 텍스트, 상태 등) 반환

### 2. 페이지별 관리
- 모든 교안이 페이지 단위로 분할되어 관리
- 각 페이지는 WhiteboardPage 모델에 저장
- 페이지 번호 기반 조회 및 필기 관리

### 3. 실시간 필기 저장
- 페이지 번호를 추적하여 정확한 위치에 저장
- 필기량 증가 확인 후 저장

## 🎯 다음 단계 (선택사항)

컴포넌트에서 직접 통일된 API를 사용하도록 업데이트할 수 있습니다:

1. **ProfessorClass.tsx**
   - `getClassPdfs` → `getMaterialPages` 사용
   - 페이지별 교안 표시 기능 추가

2. **RealtimeDashboard.tsx**
   - `getClassPdfs` → `getMaterialPages` 사용
   - 실시간 필기 저장: `saveHandwriting` 사용

3. **StudentClass.tsx**
   - `getClassMaterials` → `getMaterialPages` 사용

4. **LiveWatching.tsx**
   - 필기 내역 조회: `getHandwritingHistory` 사용

## ⚠️ 주의사항

1. **하위 호환성**: 기존 API 함수들은 계속 작동하지만, `@deprecated` 표시가 추가되었습니다.
2. **점진적 마이그레이션**: 기존 코드를 즉시 변경할 필요는 없습니다. 새로운 기능을 추가할 때만 통일된 API를 사용하면 됩니다.
3. **응답 형식**: 새로운 API는 더 많은 정보를 제공하므로, 기존 코드와 호환되지 않을 수 있습니다.

## 📚 참고 문서

- `API_UNIFICATION_SUMMARY.md` - 백엔드 API 통일 요약
- `backend/docs/swagger.yaml` - Swagger API 문서 (Materials 섹션 참고)

