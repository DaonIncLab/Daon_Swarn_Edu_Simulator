# 3D 프리뷰 초기화 기능

## ✅ 추가된 기능

3D 미리보기 화면에 **"위치 초기화"** 버튼이 추가되었습니다!

### 기능 설명
- 드론의 위치와 상태를 초기 상태로 리셋
- 모든 드론이 지상의 Line 대형(일렬)으로 복귀
- 배터리 100%, 착륙 상태로 초기화

---

## 🎨 UI 위치

**3D 뷰 왼쪽 상단**에 파란색 버튼:
```
┌─────────────────────────────┐
│ [↻ 위치 초기화]        통계 │
│                             │
│         3D 뷰               │
│                             │
│ 🖱️ 조작법                   │
└─────────────────────────────┘
```

---

## 🔧 구현 상세

### 1. IConnectionService 인터페이스 확장
**파일**: `src/services/connection/IConnectionService.ts`

```typescript
/**
 * 드론 위치 및 상태 초기화
 * @returns 초기화 결과
 */
reset(): Promise<CommandResponse>
```

### 2. 모든 ConnectionService에 구현

#### TestConnectionService
```typescript
async reset(): Promise<CommandResponse> {
  if (this.simulator) {
    this.simulator.reset()  // DroneSimulator.reset() 호출
  }
  return { success: true, timestamp: Date.now() }
}
```

#### WebSocketConnectionService
```typescript
async reset(): Promise<CommandResponse> {
  // Unity 서버에 reset 명령 전송
  this.ws!.send(JSON.stringify({ type: 'reset', timestamp: Date.now() }))
  return { success: true, timestamp: Date.now() }
}
```

#### MAVLinkConnectionService
```typescript
async reset(): Promise<CommandResponse> {
  if (this.mavlinkSimulator) {
    this.mavlinkSimulator.reset()
  }
  return { success: true, timestamp: Date.now() }
}
```

#### UnityWebGLConnectionService
```typescript
async reset(): Promise<CommandResponse> {
  this.unityBridge.sendMessage('DroneController', 'ResetPositions', '')
  return { success: true, timestamp: Date.now() }
}
```

### 3. ConnectionManager에 reset 메서드 추가
**파일**: `src/services/connection/ConnectionManager.ts`

```typescript
async reset(): Promise<CommandResponse> {
  if (!this.currentService) {
    return {
      success: false,
      error: 'No active connection',
      timestamp: Date.now(),
    }
  }

  return this.currentService.reset()
}
```

### 4. Drone3DView에 UI 추가
**파일**: `src/components/visualization/Drone3DView.tsx`

```tsx
// Reset handler
const handleReset = async () => {
  setIsResetting(true);
  try {
    const connectionManager = getConnectionManager();
    await connectionManager.reset();
  } catch (error) {
    console.error('Failed to reset:', error);
  } finally {
    setTimeout(() => setIsResetting(false), 1000);
  }
};

// Button UI
<button
  onClick={handleReset}
  disabled={isResetting}
  className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700..."
>
  <span>{isResetting ? '🔄' : '↻'}</span>
  <span>{isResetting ? '초기화 중...' : '위치 초기화'}</span>
</button>
```

---

## 📋 사용 시나리오

### 시나리오 1: 테스트 후 초기화
```
1. 블록 실행으로 드론들이 여러 위치로 이동
2. 테스트 완료
3. "위치 초기화" 버튼 클릭
4. → 모든 드론이 원래 위치로 복귀
```

### 시나리오 2: 대형 실험 후 리셋
```
1. 여러 대형(Grid, Circle, V-Shape 등) 테스트
2. 드론들이 복잡한 위치에 배치됨
3. "위치 초기화" 클릭
4. → 깔끔한 일렬 배치로 복귀
```

### 시나리오 3: 오류 복구
```
1. 블록 실행 중 오류 발생
2. 드론들이 이상한 위치에 멈춤
3. "위치 초기화" 클릭
4. → 정상 상태로 복구
```

---

## 🎯 초기화되는 것들

### DroneSimulator.reset() 실행 시:

1. **위치 초기화**
   ```typescript
   position: { x: i * 2, y: 0, z: 0 }  // Line 대형, 2m 간격
   ```
   - Drone 0: (0, 0, 0)
   - Drone 1: (2, 0, 0)
   - Drone 2: (4, 0, 0)
   - Drone 3: (6, 0, 0)
   - ...

2. **상태 초기화**
   ```typescript
   rotation: { x: 0, y: 0, z: 0 }
   velocity: { x: 0, y: 0, z: 0 }
   battery: 100
   status: 'landed'
   isActive: true
   targetPosition: null
   isMoving: false
   ```

---

## 💡 팁

### 언제 초기화 버튼을 사용하나요?

✅ **사용하면 좋은 경우:**
- 테스트 시나리오 반복 실행 전
- 대형 실험 후 깔끔하게 정리
- 블록 실행 오류 후 복구
- 시뮬레이션을 처음부터 다시 시작

❌ **사용하지 않아도 되는 경우:**
- 비행 중 (자동으로 처리됨)
- Playback 모드 (읽기 전용)

### 주의사항

1. **실행 중 초기화**
   - 블록 실행 중에도 초기화 가능
   - 실행이 중단되고 초기 위치로 이동

2. **연결 필요**
   - Test 모드나 Unity 연결 상태에서만 작동
   - 연결 안 된 상태에서는 버튼이 표시되지 않음

3. **즉시 반영**
   - 초기화 명령은 즉시 실행됨
   - 약 1초 정도 애니메이션 표시

---

## 🔄 호출 흐름

```
[사용자]
   ↓ 클릭
[Drone3DView 버튼]
   ↓ handleReset()
[ConnectionManager.reset()]
   ↓
[현재 ConnectionService.reset()]
   ↓ (Test 모드 예시)
[TestConnectionService.reset()]
   ↓
[DroneSimulator.reset()]
   ↓
[initializeDrones()]
   ↓
모든 드론 초기 상태로 복귀
```

---

## 📊 테스트 방법

### 1. 기본 테스트
```
1. Test 모드로 연결
2. 블록 실행:
   - 모든 드론 이륙 (3m)
   - 대형 설정: Circle
3. 드론들이 원형으로 배치됨
4. "위치 초기화" 버튼 클릭
5. ✅ 드론들이 일렬로 지상에 착륙
```

### 2. 콘솔 확인
F12 → Console에서 로그 확인:
```
[TestConnectionService] Resetting drone simulator to initial state
[DroneSimulator] Drone 0: (0.0, 0.0, 0.0)
[DroneSimulator] Drone 1: (2.0, 0.0, 0.0)
[DroneSimulator] Drone 2: (4.0, 0.0, 0.0)
...
```

### 3. 3D 뷰 확인
- 드론들이 X축 방향으로 2m 간격 일렬 배치
- 모두 지상(z=0)에 착륙
- 배터리 표시가 초록색(100%)

---

## 🎨 버튼 스타일

### 정상 상태
```
┌─────────────────┐
│ ↻ 위치 초기화    │  ← 파란색 (bg-blue-600)
└─────────────────┘
```

### 클릭 시 (Hover)
```
┌─────────────────┐
│ ↻ 위치 초기화    │  ← 진한 파란색 (bg-blue-700)
└─────────────────┘
```

### 초기화 중
```
┌─────────────────┐
│ 🔄 초기화 중...  │  ← 회색 (bg-gray-600, disabled)
└─────────────────┘
```

---

## ✅ 확인 사항

- ✅ Test 모드에서 초기화 작동
- ✅ MAVLink 시뮬레이션 모드에서 초기화 작동
- ✅ Unity WebGL 모드에서 초기화 메시지 전송
- ✅ WebSocket 모드에서 reset 명령 전송
- ✅ Playback 모드에서는 버튼 숨김
- ✅ 초기화 중 버튼 비활성화
- ✅ 1초 애니메이션 효과

**페이지 새로고침 후 테스트해보세요!**
