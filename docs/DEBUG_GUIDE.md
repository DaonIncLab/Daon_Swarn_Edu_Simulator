# 블록 코딩 ↔ Three.js 연동 디버깅 가이드

## 문제: 블록 실행 시 드론이 움직이지 않음

### 체크리스트

#### 1. 연결 상태 확인
```javascript
// 브라우저 콘솔에서 실행
console.log('연결 상태:', useConnectionStore.getState().status)
console.log('연결 모드:', useConnectionStore.getState().mode)
```
- **기대값**: `status: 'connected'`, `mode: 'test'`

#### 2. 드론 상태 확인
```javascript
console.log('드론 배열:', useExecutionStore.getState().drones)
```
- **기대값**: 드론 4대의 배열, 각각 id, position, rotation, velocity, battery, status 속성

#### 3. 텔레메트리 업데이트 확인
```javascript
// 텔레메트리가 계속 업데이트되는지 확인
setInterval(() => {
  const drones = useExecutionStore.getState().drones
  console.log('드론 0 위치:', drones[0]?.position)
}, 1000)
```
- **기대값**: 1초마다 위치가 출력되어야 함

#### 4. 블록 실행 확인
```javascript
// 실행 버튼을 누른 후
console.log('실행 상태:', useExecutionStore.getState().status)
```
- **기대값**: `'running'` → `'completed'`

#### 5. 명령 전송 확인
- 콘솔에서 다음과 같은 로그가 보여야 함:
  ```
  [Interpreter] Starting execution
  [Interpreter] Executing node ... (type: command)
  [TestConnectionService] Command sent: { action: 'takeoff_all', ... }
  [DroneSimulator] Takeoff all to 2m
  ```

---

## 🔷 대형 설정 (Formation) 디버깅

### 문제: 대형 설정 블록 실행 시 드론이 대형으로 배치되지 않음

#### ✅ 올바른 사용 방법

**중요**: 대형 설정은 **드론이 공중에 있을 때** 가장 잘 보입니다!

```blockly
1. "모든 드론 이륙" (고도: 2m)
2. "대기" (2초)
3. "대형 설정" (원형/그리드/V자 등)
4. "대기" (3초) - 드론들이 대형으로 이동하는 시간
```

#### 🔍 대형 설정 로그 확인

브라우저 콘솔(F12)을 열고 다음 로그를 확인하세요:

```
[DroneSimulator] 🔷 Set formation: circle { radius: 5, spacing: 2 }
[DroneSimulator] Formation center altitude: 2m (from drone 0 z=2)
[DroneSimulator] Formation spacing: 2m, drone count: 4
[DroneSimulator] Circle formation: radius 5m, angle step 90.0°
[DroneSimulator]   Drone 0: angle 0.0° → target (5.0, 0.0, 2.0)
[DroneSimulator]   Drone 1: angle 90.0° → target (0.0, 5.0, 2.0)
[DroneSimulator]   Drone 2: angle 180.0° → target (-5.0, 0.0, 2.0)
[DroneSimulator]   Drone 3: angle 270.0° → target (0.0, -5.0, 2.0)
```

**기대값**:
- ✅ Formation center altitude가 **드론 현재 고도**와 일치
- ✅ 각 드론의 target 위치가 **서로 다름** (대형 모양)
- ✅ centerAltitude가 **0이 아님** (공중에 있어야 함)

#### ⚠️ 흔한 문제

##### 문제 1: 드론이 지면에 있을 때 대형 설정
**증상**: 로그에 `centerAltitude: 2m (from drone 0 z=0)` 표시
**원인**: 드론이 아직 이륙하지 않음
**해결**: **먼저 "모든 드론 이륙"** 블록 실행

##### 문제 2: 대형 변화가 눈에 안 보임
**증상**: 드론들이 이미 대형처럼 보임
**원인**: 초기 LINE 대형과 새 대형이 비슷함
**해결**: 확실히 다른 대형 선택:
- LINE → **CIRCLE** (가장 확실함!)
- LINE → **V_SHAPE**
- GRID → **CIRCLE**

##### 문제 3: 드론이 목표 위치로 이동하지 않음
**증상**: 로그에 target은 설정되었지만 드론이 안 움직임
**확인 사항**:
```javascript
// 브라우저 콘솔에서
const drones = useExecutionStore.getState().drones
drones.forEach(d => {
  console.log(`Drone ${d.id}: pos=(${d.position.x}, ${d.position.y}, ${d.position.z})`)
})
```

**기대값**: 위치가 **계속 변화**해야 함 (1초 간격으로 확인)

#### 📋 대형 타입별 특징

| 대형 | 특징 | 권장 드론 수 | 권장 간격 |
|------|------|------------|----------|
| **LINE** | 일렬 | 모두 | 2m |
| **GRID** | 격자 | 4+ | 2m |
| **CIRCLE** | 원형 🎯 | 4+ | 반지름 5m |
| **V_SHAPE** | V자 | 3+ | 2m |
| **TRIANGLE** | 삼각형 | 3+ | 2m |
| **SQUARE** | 사각형 | 4 | 2m |
| **DIAMOND** | 다이아몬드 | 4+ | 2m |

#### 🧪 완벽한 테스트 시나리오

```blockly
1. "모든 드론 이륙" (고도: 3m)
2. "대기" (3초)
3. "대형 설정" (일렬 LINE, 간격: 2m)
4. "대기" (2초)
5. "대형 설정" (원형 CIRCLE, 반지름: 5m)
6. "대기" (3초) → 드론들이 원형으로 재배치됨!
7. "대형 이동" (앞으로, 3m) → 원형 대형 유지하며 이동
8. "대기" (2초)
9. "모든 드론 착륙"
```

**예상 결과**:
- 드론 4대가 3m 상승
- 일렬로 배치 (2m 간격)
- **원형으로 재배치** (반지름 5m, 매우 명확하게 보임!)
- 원형 유지하며 앞으로 3m 이동
- 착륙

---

### 흔한 문제들

#### 문제 1: 드론 배열이 비어있음
**증상**: `useExecutionStore.getState().drones`가 `[]`
**원인**: 텔레메트리 메시지가 ExecutionStore에 도달하지 않음
**해결**:
```javascript
// wsService 리스너 확인
console.log('wsService 리스너:', wsService.getMessageListener())
```

#### 문제 2: 연결은 되었지만 드론이 표시되지 않음
**증상**: 연결 상태는 'connected'지만 Three.js 뷰가 비어있음
**원인**: Drone3DView가 마운트되지 않았거나 렌더링 실패
**해결**: React DevTools에서 Drone3DView 컴포넌트 확인

#### 문제 3: 블록 실행 후 아무 일도 일어나지 않음
**증상**: 실행 버튼 클릭 후 상태가 'idle'로 유지
**원인**: Blockly 워크스페이스가 비어있거나 파싱 실패
**해결**:
```javascript
console.log('워크스페이스:', useBlocklyStore.getState().workspace)
console.log('파싱된 트리:', useBlocklyStore.getState().parsedTree)
```

#### 문제 4: 명령은 전송되지만 드론이 움직이지 않음
**증상**: 콘솔에 명령 로그는 보이지만 위치가 변하지 않음
**원인**: DroneSimulator의 updateInterval이 시작되지 않음
**확인**: TestConnectionService의 simulator.start() 호출 여부 확인

### 데이터 흐름 확인

전체 데이터 흐름:
```
블록 실행 버튼
  ↓
executeScript()
  ↓
Interpreter.execute(tree)
  ↓
interpreter.executeCommand(node)
  ↓
connectionService.sendCommand(command)
  ↓
TestConnectionService._executeCommand()
  ↓
simulator.executeTakeoffAll() 등
  ↓
(100ms마다)
  ↓
simulator.updateDrones()
  ↓
messageListener({ type: 'telemetry', drones: [...] })
  ↓
wsService.onMessage(message)
  ↓
ExecutionStore.handleMessage(message)
  ↓
set({ drones: newDrones })
  ↓
Drone3DView 렌더링
  ↓
Drone3DModel이 각 드론을 Three.js로 렌더링
```

### 로그 추가 방법

더 자세한 디버깅이 필요하다면, 다음 파일에 console.log 추가:

1. **ExecutionStore.ts:268** - 텔레메트리 수신 확인
   ```typescript
   case MessageType.TELEMETRY:
     console.log('📡 텔레메트리 수신:', message.drones)
     const newDrones = message.drones
     set({ drones: newDrones })
   ```

2. **Drone3DView.tsx:140** - 렌더링 데이터 확인
   ```typescript
   const { drones } = useExecutionStore();
   console.log('🎨 Drone3DView 렌더링, 드론 수:', drones.length)
   ```

3. **TestConnectionService.ts:177** - 명령 실행 확인
   ```typescript
   private _executeCommand(command: Command): void {
     console.log('⚡ 명령 실행:', command.action, command.params)
     // ...
   }
   ```

### 브라우저 확인 사항

1. **콘솔 에러 확인**: F12 → Console 탭에서 빨간색 에러 메시지 확인
2. **네트워크 탭**: WebSocket 연결이 있는지 확인 (Test 모드는 WebSocket 미사용)
3. **React DevTools**: 컴포넌트 트리에서 Drone3DView와 ExecutionStore 상태 확인
