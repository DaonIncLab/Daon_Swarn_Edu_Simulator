# Three.js 시뮬레이터로 통일

**날짜:** 2025-11-26
**상태:** ✅ 완료
**변경사항:** Unity WebGL 모드 제거, Three.js 시뮬레이터를 기본 모드로 설정

---

## 📋 개요

Unity WebGL 임베드 모드를 제거하고 Three.js 기반 시뮬레이터를 기본 시뮬레이션 방식으로 통일했습니다.

### 변경 이유

1. **단순화**: Unity WebGL 빌드 파일 관리 불필요
2. **성능**: Three.js 네이티브 웹 렌더링으로 더 빠른 로딩
3. **통합**: MAVLink 프로토콜과 Three.js 3D 비주얼라이제이션 완벽 통합
4. **유지보수**: 하나의 시뮬레이션 엔진으로 관리 간소화

---

## 🔄 변경 사항

### 1. ConnectionMode 변경

**파일:** `src/services/connection/types.ts`

**변경 전:**
```typescript
export const ConnectionMode = {
  SIMULATION: 'simulation',
  UNITY_WEBGL: 'unity_webgl',      // ❌ 제거됨
  REAL_DRONE: 'real_drone',
  MAVLINK_SIMULATION: 'mavlink_simulation',
  TEST: 'test',
} as const
```

**변경 후:**
```typescript
export const ConnectionMode = {
  SIMULATION: 'simulation',        // Unity 외부 서버
  REAL_DRONE: 'real_drone',
  MAVLINK_SIMULATION: 'mavlink_simulation',  // Three.js 시뮬레이터 (기본)
  TEST: 'test',
} as const
```

### 2. ConnectionConfig 정리

**변경 전:**
```typescript
export interface ConnectionConfig {
  mode: ConnectionMode
  websocket?: { ... }
  unityWebGL?: {                   // ❌ 제거됨
    loaderUrl: string
    dataUrl: string
    frameworkUrl: string
    codeUrl: string
  }
  mavlink?: { ... }
  test?: { ... }
}
```

**변경 후:**
```typescript
export interface ConnectionConfig {
  mode: ConnectionMode
  websocket?: { ... }              // Unity 외부 서버용
  mavlink?: { ... }                // Three.js 시뮬레이터 & 실제 드론용
  test?: { ... }
}
```

### 3. ConnectionManager 수정

**파일:** `src/services/connection/ConnectionManager.ts`

**변경 내용:**
- `UnityWebGLConnectionService` import 제거
- `unity_webgl` case 제거
- 로그 메시지 개선

**변경 전:**
```typescript
import { UnityWebGLConnectionService } from './UnityWebGLConnectionService'

case 'unity_webgl':
  log.info('ConnectionManager', 'Creating Unity WebGL service')
  return new UnityWebGLConnectionService()

case 'mavlink_simulation':
  log.info('ConnectionManager', 'Creating MAVLink Simulation service...')
  return new MAVLinkConnectionService(mavlinkDroneCount)
```

**변경 후:**
```typescript
// UnityWebGLConnectionService import 제거됨

case 'mavlink_simulation':
  log.info('ConnectionManager', 'Creating Three.js Simulator with', mavlinkDroneCount, 'drones')
  return new MAVLinkConnectionService(mavlinkDroneCount)
```

### 4. ConnectionPanel UI 개선

**파일:** `src/components/connection/ConnectionPanel.tsx`

**주요 변경:**

#### 4.1. Unity WebGL 버튼 제거
- `isUnityWebGLMode` 변수 제거
- Unity WebGL 선택 버튼 제거
- Unity WebGL 설명 섹션 제거

#### 4.2. Three.js Simulator를 맨 위로 (Recommended)

**변경 전:**
```tsx
{/* WebSocket Mode */}
<button>WebSocket Server</button>

{/* Unity WebGL Mode */}
<button>Unity WebGL Embed</button>

{/* MAVLink Simulation Mode */}
<button>🚁 MAVLink Simulation</button>
```

**변경 후:**
```tsx
{/* Three.js Simulator Mode (Default) */}
<button className="border-green-600 bg-green-50">
  🎮 Three.js Simulator (Recommended)
  <p>Built-in 3D physics simulation with MAVLink protocol</p>
</button>

{/* Unity WebSocket Mode */}
<button>
  🔌 Unity External Server
  <p>Connect to separate Unity WebSocket server</p>
</button>
```

#### 4.3. 설명 텍스트 개선

**변경 전:**
```tsx
<p className="text-sm">
  🚁 <strong>MAVLink Simulation Mode</strong>
</p>
<p className="text-xs">
  Test with real MAVLink protocol. Full telemetry, GPS conversion...
</p>
```

**변경 후:**
```tsx
<p className="text-sm">
  🎮 <strong>Three.js 3D Simulator</strong>
</p>
<p className="text-xs">
  Physics-based drone simulation with Three.js 3D visualization and MAVLink protocol support.
</p>
```

#### 4.4. Connect 버튼 텍스트 개선

**변경 전:**
```tsx
<button>
  {isConnecting ? 'Connecting...' : 'Connect (MAVLink)'}
</button>
```

**변경 후:**
```tsx
<button className="bg-green-600">
  {isConnecting ? 'Starting Simulator...' : 'Start Three.js Simulator'}
</button>
```

#### 4.5. 연결 성공 메시지 개선

**변경 전:**
```tsx
{isMAVLinkMode ? (
  <>🚁 <strong>MAVLink Simulation Active</strong> - {mavlinkDroneCount} drones ready</>
) : isUnityWebGLMode ? (
  <>🎮 <strong>Unity WebGL Ready</strong> - Simulator loaded</>
) : (
  <>Connected to {ipAddress}:{port}</>
)}
```

**변경 후:**
```tsx
{isMAVLinkSimMode ? (
  <>🎮 <strong>Three.js Simulator Active</strong> - {mavlinkDroneCount} drones ready with 3D visualization</>
) : isRealMAVLinkMode ? (
  <>🚁 <strong>Real MAVLink Connected</strong> - Live drone telemetry</>
) : (
  <>🔌 <strong>Unity Server Connected</strong> - {ipAddress}:{port}</>
)}
```

### 5. 기본 모드 변경

**파일:** `src/stores/useConnectionStore.ts`

**변경 전:**
```typescript
mode: ConnectionMode.SIMULATION, // 기본값: 시뮬레이션 모드
```

**변경 후:**
```typescript
mode: ConnectionMode.MAVLINK_SIMULATION, // 기본값: Three.js 시뮬레이터
```

---

## 🎯 사용자 경험 개선

### Before (3가지 시뮬레이션 모드)

1. **WebSocket Server** - Unity 외부 서버 연결
2. **Unity WebGL Embed** - Unity 빌드 파일 필요
3. **MAVLink Simulation** - Three.js 시뮬레이터

### After (1가지 권장 + 1가지 옵션)

1. **🎮 Three.js Simulator (Recommended)** ✅ 기본 모드
   - 빌드 파일 불필요
   - 빠른 로딩
   - MAVLink 프로토콜 완벽 지원
   - 3D 물리 시뮬레이션
   - Formation flight 지원

2. **🔌 Unity External Server** (선택 사항)
   - 기존 Unity 시뮬레이터 호환성 유지

---

## 📊 기술적 세부사항

### Three.js 시뮬레이터 구조

```
MAVLinkConnectionService
  ↓
MAVLinkSimulator
  ↓
DroneSimulator (물리 엔진)
  ↓
Drone3DView (Three.js 3D 렌더링)
```

**특징:**
- **물리 엔진**: DroneSimulator가 실제 드론 물리 시뮬레이션
- **MAVLink 프로토콜**: 실제 드론과 동일한 프로토콜 사용
- **3D 시각화**: Three.js로 실시간 3D 렌더링
- **10Hz 텔레메트리**: 실제 드론과 동일한 업데이트 속도
- **GPS 좌표 변환**: Local NED ↔ GPS 좌표 변환 지원

### 제거된 파일 (사용 안 함)

- `UnityWebGLConnectionService.ts` - 더 이상 import 안 됨
- Unity WebGL 빌드 파일 (`public/unity/Build/`) - 불필요

---

## ✅ 테스트 방법

### 1. 애플리케이션 실행

```bash
npm run dev
```

### 2. Settings Panel 확인

1. ⚙️ 아이콘 클릭
2. Connection 탭에서 확인:
   - ✅ **🎮 Three.js Simulator (Recommended)** 가 맨 위에 표시됨
   - ✅ 초록색 테두리로 강조됨
   - ✅ 기본 선택됨

### 3. Three.js Simulator 시작

1. Drone 수 선택 (2, 4, 6, 8)
2. Formation Control Mode 선택
   - 🎯 GCS Coordinated
   - ✨ Virtual Leader
3. **"Start Three.js Simulator"** 버튼 클릭

### 4. 시뮬레이션 확인

**연결 성공 메시지:**
```
🎮 Three.js Simulator Active - 4 drones ready with 3D visualization
```

**3D View:**
- Drone3DView에서 드론들이 3D로 표시됨
- Three.js 렌더링으로 부드러운 애니메이션
- 실시간 위치 업데이트

**Blockly 테스트:**
1. Takeoff All 블록
2. Set Formation (LINE, 2m)
3. Move Formation (forward, 5m)
4. Land All 블록

**실행 결과:**
- 모든 드론이 부드럽게 이륙
- 라인 포메이션 형성
- 동시에 앞으로 이동
- 안전하게 착륙

---

## 📝 수정된 파일 목록

### 수정 (5개)
- ✅ `src/services/connection/types.ts` - ConnectionMode, ConnectionConfig
- ✅ `src/services/connection/ConnectionManager.ts` - Unity WebGL 제거
- ✅ `src/components/connection/ConnectionPanel.tsx` - UI 개선
- ✅ `src/stores/useConnectionStore.ts` - 기본 모드 변경
- ✅ `docs/THREEJS_SIMULATOR_MIGRATION.md` (이 문서)

### 타입 체크
- ✅ `npm run check:types` 통과

---

## 🎓 핵심 교훈

### 1. 단순함이 최고
- 2개의 시뮬레이터 유지보수 → 1개의 시뮬레이터로 통일
- Unity WebGL 빌드 관리 불필요
- 더 빠른 개발 및 디버깅

### 2. Three.js의 장점
- 웹 네이티브 3D 렌더링
- React Three Fiber로 React와 완벽 통합
- 빌드 파일 불필요
- 빠른 로딩 속도

### 3. MAVLink 프로토콜의 유연성
- Unity WebGL 없이도 완전한 드론 시뮬레이션 가능
- 실제 드론과 동일한 프로토콜 사용
- GPS 좌표 변환, 텔레메트리, 명령 실행 모두 지원

### 4. 사용자 경험 중심
- 권장 옵션을 맨 위에 배치
- 명확한 설명과 아이콘
- 색상으로 시각적 차별화 (초록색 = 권장)

---

## 🚀 향후 계획

### 제거 고려 사항

현재는 호환성을 위해 `UnityWebGLConnectionService.ts` 파일을 유지하고 있지만, 향후 완전히 제거 가능:

1. **Phase 1 (현재)**: import만 제거, 파일은 유지
2. **Phase 2 (다음 버전)**: 파일 완전 삭제

### Unity External Server 모드

Unity WebSocket Server 모드는 유지:
- 기존 Unity 시뮬레이터와의 호환성
- 특수한 Unity 기능이 필요한 경우
- 학습/연구 목적

---

## 🎉 결론

Unity WebGL 모드를 성공적으로 제거하고 Three.js 시뮬레이터로 통일했습니다!

**주요 성과:**
- ✅ 시뮬레이션 모드 단순화 (3개 → 2개)
- ✅ Three.js 시뮬레이터를 기본 권장 모드로 설정
- ✅ UI/UX 개선 (명확한 설명, 색상 차별화)
- ✅ 빌드 파일 관리 불필요
- ✅ TypeScript 컴파일 통과

**사용자 혜택:**
1. 더 빠른 시작: Unity 빌드 파일 로딩 불필요
2. 더 나은 성능: 네이티브 웹 렌더링
3. 더 쉬운 사용: 권장 옵션이 명확함
4. 완전한 기능: MAVLink + 3D + Formation flight

이제 사용자는 **"Start Three.js Simulator"** 한 번의 클릭으로 완전한 드론 스웜 시뮬레이션을 시작할 수 있습니다! 🎮✨
