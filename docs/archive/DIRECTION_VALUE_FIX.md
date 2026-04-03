# Direction 값 대소문자 불일치 문제 해결

## 문제 상황

콘솔에는 "forward"가 표시되지만 시뮬레이터에서 드론이 실제로 움직이지 않는 문제 발생.

## 원인 분석

블록리 드롭다운 값을 소문자로 변경했으나, 여러 곳에서 여전히 대문자 문자열 리터럴로 체크하여 switch-case 매칭 실패:

```typescript
// 블록 정의 (swarmBlocks.ts)
['앞으로 ⬆️', 'forward']  // 소문자 값

// TestConnectionService.ts (문제 코드)
switch (direction) {
  case 'FORWARD':  // 대문자로 체크 → 매칭 안됨!
    dy = distance
    break
}
// 결과: dx = 0, dy = 0, dz = 0 → 드론이 움직이지 않음
```

## Direction 상수 구조

```typescript
// src/constants/commands.ts
export const Direction = {
  FORWARD: 'forward',    // 키: 대문자, 값: 소문자
  BACKWARD: 'backward',
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
} as const
```

## 해결 방법

### 1. TestConnectionService.ts (2곳 수정)

**DRONE_MOVE_DIRECTION (lines 283-301)**
```typescript
switch (direction) {
  case 'up':       // BEFORE: case 'UP':
    dz = distance
    break
  case 'down':     // BEFORE: case 'DOWN':
    dz = -distance
    break
  case 'left':     // BEFORE: case 'LEFT':
    dx = -distance
    break
  case 'right':    // BEFORE: case 'RIGHT':
    dx = distance
    break
  case 'forward':  // BEFORE: case 'FORWARD':
    dy = distance
    break
  case 'backward': // BEFORE: case 'BACKWARD':
    dy = -distance
    break
}
```

**DRONE_MOVE_DIRECTION_ALL (lines 326-344)**
- 동일하게 모든 case를 소문자로 변경

### 2. BlocklyWorkspace.tsx (line 165)

초기 블록 XML 수정:
```typescript
// BEFORE
<field name="DIRECTION">FORWARD</field>

// AFTER
<field name="DIRECTION">forward</field>
```

### 3. toolbox.ts (lines 20-21)

기본 필드 값 수정:
```typescript
// BEFORE
{ kind: 'block', type: 'drone_move_direction_all', fields: { DIRECTION: 'FORWARD', DISTANCE: 3 } }

// AFTER
{ kind: 'block', type: 'drone_move_direction_all', fields: { DIRECTION: 'forward', DISTANCE: 3 } }
```

## 올바른 사용 패턴

### ✅ 올바른 방법

**방법 1: Direction 상수 사용 (권장)**
```typescript
import { Direction } from '@/constants/commands'

switch (direction) {
  case Direction.FORWARD:  // 상수 사용 → 'forward' 값과 매칭됨
    dy = distance
    break
}
```

**방법 2: 소문자 문자열 리터럴**
```typescript
switch (direction) {
  case 'forward':  // 소문자 문자열 → 'forward' 값과 매칭됨
    dy = distance
    break
}
```

### ❌ 잘못된 방법

```typescript
switch (direction) {
  case 'FORWARD':  // 대문자 문자열 → 매칭 안됨!
    dy = distance
    break
}
```

## 영향받은 파일

1. ✅ `src/services/connection/TestConnectionService.ts` - 소문자 리터럴로 수정
2. ✅ `src/components/blockly/BlocklyWorkspace.tsx` - 초기 XML 값 수정
3. ✅ `src/components/blockly/toolbox.ts` - 기본 필드 값 수정
4. ✅ `src/components/blockly/blocks/swarmBlocks.ts` - 이미 소문자로 수정됨
5. ⚪ `src/services/mavlink/MAVLinkConverter.ts` - Direction 상수 사용 (문제없음)
6. ⚪ `src/services/connection/DroneSimulator.ts` - Direction 상수 사용 (문제없음)

## 검증

```bash
npm run check:types  # ✅ 타입 체크 통과
```

브라우저 테스트:
- ✅ 콘솔에 "forward" 표시
- ✅ 시뮬레이터에서 드론이 실제로 앞으로 이동
- ✅ 모든 방향 (up, down, left, right, forward, backward) 정상 작동

## 교훈

1. **Enum 값 일관성**: 드롭다운 값과 switch-case 체크 값이 일치해야 함
2. **상수 사용 권장**: 문자열 리터럴보다 Direction 상수 사용 권장 (타입 안전성)
3. **전체 검토 필요**: 한 곳 수정시 관련된 모든 파일 체크 필요
   - 블록 정의 (swarmBlocks.ts)
   - 초기 블록 XML (BlocklyWorkspace.tsx)
   - 툴박스 기본값 (toolbox.ts)
   - 명령 실행 핸들러 (TestConnectionService.ts)

## 날짜

2025-11-26
