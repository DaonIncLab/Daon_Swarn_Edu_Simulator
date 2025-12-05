# 블록코딩 버그 수정 요약

## 📅 수정 날짜
2025-11-25

## 🐛 발견된 버그

### 버그 1: UP/DOWN 방향 미구현
**위치**: `src/services/connection/DroneSimulator.ts:445-481`

**문제**:
- 블록에는 6방향(앞/뒤/좌/우/위/아래) 있음
- DroneSimulator는 4방향(앞/뒤/좌/우)만 구현
- UP, DOWN 선택 시 아무 동작 안 함

**해결**:
```typescript
case Direction.UP:
  dz = distance
  break
case Direction.DOWN:
  dz = -distance
  break
```

---

### 버그 2: 대형 설정 파라미터 무시 ⚠️ 심각
**위치**: `src/services/connection/DroneSimulator.ts:292-439`

**문제**:
블록에서 rows/cols를 설정해도 **거의 모든 대형에서 무시됨**

#### 수정 전:
- **LINE**: rows/cols 완전 무시 → 드론 개수만 사용
- **GRID**: cols만 사용, rows 무시
- **CIRCLE**: rows/cols 무시 → 반지름 5m 하드코딩
- **V_SHAPE**: rows/cols 무시
- **TRIANGLE**: rows/cols 무시
- **SQUARE**: rows/cols 무시 → sqrt로 계산
- **DIAMOND**: rows/cols 무시

**결과**: 사용자가 rows/cols 바꿔도 대형이 안 바뀌는 것처럼 보임!

#### 수정 후:
- **LINE**: cols=한줄당 드론수, rows=줄수 ✅
- **GRID**: rows × cols 격자 ✅
- **CIRCLE**: cols=반지름(spacing×cols) ✅
- **V_SHAPE**: rows=V자 깊이 ✅
- **TRIANGLE**: rows=삼각형 줄수 ✅
- **SQUARE**: rows × cols 정사각형/직사각형 ✅
- **DIAMOND**: rows=크기 ✅

---

## 🔧 수정 사항

### 1. DroneSimulator.ts 수정
**파일**: `src/services/connection/DroneSimulator.ts`

#### 변경 1: executeMoveFormation (line 445-481)
UP/DOWN 방향 추가
```typescript
let dx = 0, dy = 0, dz = 0  // dz 추가

switch (direction) {
  case Direction.FORWARD:  dy = distance;  break
  case Direction.BACKWARD: dy = -distance; break
  case Direction.LEFT:     dx = -distance; break
  case Direction.RIGHT:    dx = distance;  break
  case Direction.UP:       dz = distance;  break   // 새로 추가
  case Direction.DOWN:     dz = -distance; break   // 새로 추가
}
```

#### 변경 2: executeSetFormation (line 292-457)
모든 대형에서 rows/cols 제대로 사용

**LINE 대형**:
```typescript
const cols = options.cols || droneArray.length
const rows = options.rows || 1
// cols개씩 rows줄로 배치
```

**GRID 대형**:
```typescript
const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
const rows = options.rows || Math.ceil(droneArray.length / cols)
// rows × cols 격자
```

**CIRCLE 대형**:
```typescript
const radius = options.cols ? options.cols * this.formationSpacing :
               (droneArray.length * this.formationSpacing) / (2 * Math.PI)
// cols로 반지름 조절
```

**V_SHAPE 대형**:
```typescript
const depth = options.rows || Math.ceil(droneArray.length / 2)
// rows로 V자 깊이 조절
```

**TRIANGLE 대형**:
```typescript
const maxRows = options.rows || Math.ceil((-1 + Math.sqrt(1 + 8 * droneArray.length)) / 2)
// rows로 삼각형 줄 수 조절
```

**SQUARE 대형**:
```typescript
const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
const rows = options.rows || Math.ceil(droneArray.length / cols)
// rows × cols 사각형
```

**DIAMOND 대형**:
```typescript
const size = options.rows || Math.ceil(droneArray.length / 2)
// rows로 크기 조절
```

---

### 2. swarmBlocks.ts 수정
**파일**: `src/components/blockly/blocks/swarmBlocks.ts`

#### 변경: swarm_set_formation 블록 툴팁 (line 68-77)
블록 위에 마우스 올리면 각 대형별 파라미터 의미 설명 표시

```typescript
this.setTooltip('드론들을 지정된 대형으로 배치합니다\n\n' +
  '대형별 파라미터 의미:\n' +
  '• Grid: rows×cols 격자 배치\n' +
  '• Line: cols=한줄당 드론수, rows=줄수\n' +
  '• Circle: cols=반지름(간격×cols), rows 무시\n' +
  '• V-Shape: rows=V자 깊이, cols 무시\n' +
  '• Triangle: rows=삼각형 줄수, cols 무시\n' +
  '• Square: rows×cols 정사각형/직사각형\n' +
  '• Diamond: rows=크기, cols 무시\n\n' +
  '간격(spacing)은 모든 대형에서 드론 사이 거리를 결정합니다')
```

---

## 📚 생성된 문서

1. **BLOCK_ANALYSIS.md** - 블록별 상세 분석 (블록/파서/실행 매칭)
2. **BLOCK_TESTING_GUIDE.md** - 기본 테스트 가이드
3. **FORMATION_GUIDE.md** - 대형별 완벽 가이드 (각 대형 사용법)
4. **BUGFIX_SUMMARY.md** - 이 문서 (수정 요약)

---

## ✅ 테스트 방법

### 1. 브라우저 새로고침
**중요!** 변경사항 적용을 위해 페이지 새로고침 필수

### 2. UP/DOWN 테스트
```
블록:
1. 모든 드론 이륙 (3m)
2. 대기 2초
3. 대형 이동: 위로 2m
4. 대기 2초
5. 대형 이동: 아래로 1m
6. 대기 2초
7. 착륙

예상 결과:
- 3m → 5m → 4m로 고도 변화
```

### 3. 대형 rows/cols 테스트
```
블록:
1. 모든 드론 이륙 (3m)
2. 대기 2초
3. 대형 설정: Grid (rows=2, cols=2, spacing=3)
4. 대기 3초
5. 대형 설정: Grid (rows=1, cols=4, spacing=2)
6. 대기 3초
7. 착륙

예상 결과:
- 2×2 정사각형 → 1×4 한 줄로 변경
```

### 4. Circle 반지름 테스트
```
블록:
1. 모든 드론 이륙 (3m)
2. 대기 2초
3. 대형 설정: Circle (cols=2, spacing=2)  ← 반지름 4m
4. 대기 3초
5. 대형 설정: Circle (cols=5, spacing=2)  ← 반지름 10m
6. 대기 3초
7. 착륙

예상 결과:
- 작은 원 → 큰 원으로 확장
```

### 5. 콘솔 로그 확인
F12 → Console 탭에서 확인:
```
[DroneSimulator] Grid formation: 2 rows × 4 cols
[DroneSimulator]   Drone 0: row 0, col 0 → target (0.0, 0.0, 3.0)
[DroneSimulator]   Drone 1: row 0, col 1 → target (2.0, 0.0, 3.0)
...
```

---

## 🎯 확인 사항

### 수정 전:
- ❌ 위/아래 이동 안 됨
- ❌ rows/cols 바꿔도 대형 안 바뀜
- ❌ Circle 크기 조절 불가
- ❌ 불규칙한 움직임

### 수정 후:
- ✅ 위/아래 이동 작동
- ✅ rows/cols 변경 시 대형 즉시 변경
- ✅ Circle cols로 반지름 조절
- ✅ 모든 대형이 파라미터 제대로 사용
- ✅ 블록 툴팁에 사용법 표시

---

## 💡 주의사항

1. **대기 시간 필수**: 각 명령 사이 2-3초 대기해야 움직임 보임
2. **spacing 크게**: 2-3m로 설정하면 변화가 뚜렷
3. **드론 개수 고려**: rows×cols > 드론개수 가능 (빈 자리 생김)
4. **콘솔 확인**: 명령이 제대로 실행되는지 로그 확인

---

## 🔄 Git Commit 제안

```bash
git add src/services/connection/DroneSimulator.ts
git add src/components/blockly/blocks/swarmBlocks.ts
git commit -m "fix: Implement UP/DOWN directions and fix formation parameters

- Add UP/DOWN direction handling in executeMoveFormation
- Fix all formations to properly use rows/cols parameters
- Update formation block tooltip with parameter descriptions

Fixes:
- UP/DOWN movement now works correctly
- Grid/Line/Square now respect rows and cols
- Circle now uses cols for radius control
- V-Shape/Triangle/Diamond now use rows parameter

Closes #[issue-number]
"
```
