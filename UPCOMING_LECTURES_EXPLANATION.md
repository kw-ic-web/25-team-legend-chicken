# "가장 임박한 강의" 기능 설명

## 📋 개요
교수자 대시보드의 사이드바에 표시되는 "가장 임박한 강의" 기능의 동작 방식을 설명합니다.

## 🔄 동작 흐름

### 1. 데이터 수집 (`ProfessorSidebar.tsx`)

#### API 호출
```typescript
const [myInfoResponse, lecturesResponse] = await Promise.all([
  getMyInfo(),
  getLectures()
]);
```

#### 강의 목록 처리
```typescript
lecturesResponse.lectures.forEach((lecture: Lecture) => {
  // 1. 각 강의의 classes 배열에서 첫 번째 클래스 확인
  if (lecture.classes && lecture.classes.length > 0) {
    const firstClass = lecture.classes[0];
    
    // 2. 클래스 날짜가 존재하는지 확인
    if (firstClass.date) {
      const classDate = new Date(firstClass.date);
      
      // 3. 미래 강의인지 확인
      if (classDate > now) {
        // 4. 날짜 차이 계산 (일 단위)
        const diffTime = classDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // 5. 7일 이내 강의만 필터링
        if (diffDays <= 7) {
          // 6. 시간 추출
          const hours = classDate.getHours();
          const minutes = classDate.getMinutes();
          const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
          
          // 7. upcoming 배열에 추가
          upcoming.push({
            title: lecture.name,
            time: timeStr,
            countdown: diffDays === 0 ? "오늘" : `D-${diffDays}`,
            lectureId: lecture.lecture_id,
          });
        }
      }
    }
  }
});
```

#### 정렬 및 제한
```typescript
// 날짜순으로 정렬 (가까운 날짜가 먼저)
upcoming.sort((a, b) => {
  const aDays = parseInt(a.countdown.replace(/[^0-9]/g, "") || "999");
  const bDays = parseInt(b.countdown.replace(/[^0-9]/g, "") || "999");
  return aDays - bDays;
});

setUpcomingLectures(upcoming.slice(0, 3)); // 최대 3개만 저장
```

### 2. "가장 임박한 강의" 표시 (`CommonSidebar.tsx`)

#### 정렬 및 선택
```typescript
const toNum = (d: string) => {
  const m = d.match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
};

const sorted = [...upcomingLectures].sort((a, b) => {
  const dn = toNum(a.countdown) - toNum(b.countdown);
  if (dn !== 0) return dn;
  return a.time.localeCompare(b.time);
});

const next = sorted[0]; // 가장 가까운 강의 선택
```

#### 화면 표시
```typescript
<div className="text-[11px] text-red-700 font-semibold mb-0.5">
  가장 임박한 강의
</div>
<div className="text-xs text-gray-600">
  {next.countdown} · {next.time}  {/* 예: "D-1 · 10:00" */}
</div>
<div className="text-sm font-semibold text-gray-900 truncate">
  "{next.title}"  {/* 강의 제목 */}
</div>
```

## 📊 데이터 구조

### Lecture 타입
```typescript
type Lecture = {
  lecture_id: string;
  name: string;
  classes: LectureClass[];
  // ... 기타 필드
};

type LectureClass = {
  id: number;
  title: string;
  description: string;
  date: string;  // ISO 문자열 형식 (예: "2024-01-15T10:00:00.000Z")
  materials: string[];
};
```

### 백엔드 저장 형식
- MongoDB에서 `Date` 타입으로 저장
- JSON 직렬화 시 ISO 문자열로 변환 (예: `"2024-01-15T10:00:00.000Z"`)

## ⚠️ 현재 구현의 제한사항

### 1. 첫 번째 클래스만 확인
- 현재는 각 강의의 `classes` 배열에서 **첫 번째 클래스만** 확인합니다
- 만약 첫 번째 클래스가 이미 지났고, 두 번째 클래스가 다음 강의라면 누락될 수 있습니다

**예시**:
```
강의 A:
  - 클래스 1: 2024-01-10 (과거)
  - 클래스 2: 2024-01-17 (미래, D-3)
```
현재 구현은 클래스 1만 확인하므로 강의 A가 "다가올 강의"에 포함되지 않습니다.

### 2. 날짜 계산 정확도
- `Math.ceil()`을 사용하여 일 단위로 반올림
- 시간대(timezone) 문제가 있을 수 있습니다

### 3. 시간 표시
- 로컬 시간대 기준으로 시간 추출 (`getHours()`, `getMinutes()`)
- 서버 시간대와 클라이언트 시간대가 다를 경우 불일치 가능

## 🔧 개선 제안

### 1. 모든 클래스 확인
```typescript
// 각 강의의 모든 클래스 확인
lecture.classes.forEach((cls) => {
  if (cls.date) {
    const classDate = new Date(cls.date);
    if (classDate > now) {
      // 가장 가까운 클래스 찾기
      // ...
    }
  }
});
```

### 2. 정확한 날짜 계산
```typescript
// 날짜만 비교하여 더 정확한 계산
const diffDays = Math.floor((classDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
```

### 3. 시간대 처리
```typescript
// UTC 기준으로 시간 추출하거나
// 사용자 시간대를 고려한 시간 표시
```

## 📍 관련 파일

- `frontend/src/components/layout/professor/ProfessorSidebar.tsx` (111-146줄)
- `frontend/src/components/layout/CommonSidebar.tsx` (196-227줄)
- `frontend/src/api/professor/index.ts` (Lecture 타입 정의)
- `backend/models/lectures.js` (데이터 모델)

## 🎯 표시 예시

```
가장 임박한 강의
D-1 · 10:00
"파이썬 프로그래밍 기초"
```

- **D-1**: 내일 강의
- **10:00**: 오전 10시
- 강의 제목은 큰따옴표로 표시

