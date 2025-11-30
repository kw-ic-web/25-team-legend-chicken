# 컴퓨터 B에서 Git 설정하기

## 상황별 가이드

### 상황 1: 처음으로 저장소를 받는 경우

```bash
# 1. 저장소 클론
git clone git@github.com:kw-ic-web/25-team-legend-chicken.git
cd 25-team-legend-chicken

# 2. bhw 브랜치로 체크아웃
git checkout bhw

# 또는 원격 브랜치를 추적하면서 체크아웃
git checkout -b bhw origin/bhw
```

### 상황 2: 이미 저장소를 클론한 경우

```bash
# 1. 저장소 폴더로 이동
cd 25-team-legend-chicken

# 2. 원격 저장소의 최신 정보 가져오기
git fetch origin

# 3. bhw 브랜치로 체크아웃
git checkout bhw

# 또는 원격 브랜치를 추적하면서 체크아웃
git checkout -b bhw origin/bhw

# 4. 최신 코드 받기
git pull origin bhw
```

### 상황 3: 다른 브랜치에 있는 경우

```bash
# 1. 현재 브랜치 확인
git branch

# 2. bhw 브랜치로 전환
git checkout bhw

# 3. 최신 코드 받기
git pull origin bhw
```

## 작업 흐름 (두 컴퓨터에서)

### 컴퓨터 A에서 작업 후:
```bash
git add .
git commit -m "작업 내용"
git push origin bhw
```

### 컴퓨터 B에서 최신 코드 받기:
```bash
git pull origin bhw
```

### 컴퓨터 B에서 작업 후:
```bash
git add .
git commit -m "작업 내용"
git push origin bhw
```

## 충돌 해결

만약 두 컴퓨터에서 동시에 작업해서 충돌이 발생하면:

```bash
# 1. 최신 코드 받기
git pull origin bhw

# 2. 충돌 파일 수정
# (에디터에서 충돌 마커 제거하고 수정)

# 3. 수정된 파일 추가
git add .

# 4. 커밋
git commit -m "충돌 해결"

# 5. 푸시
git push origin bhw
```

