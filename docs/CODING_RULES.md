# Coding Rules

## Core Rules
- TypeScript 타입 전용 import는 항상 `import type` 사용
- 경로 import는 가능하면 `@/` 별칭 우선
- React는 함수형 컴포넌트 기준
- 상태 관리, 연결 로직, UI를 한 파일에서 동시에 처리하지 않음
- Blockly는 `block definition -> scenario plan -> runtime command` 경계를 유지

## 절대 하지 말아야 할 것
- mock 데이터나 가짜 객체 임의 추가 금지
- `any` 타입 사용 금지
- 직접적인 DOM 조작 금지
- `console.log` 또는 임시 디버깅용 `logger` 호출을 프로덕션 코드에 남기지 않음
- 명시적 생성 요청이 없는 파일, 함수, 컴포넌트, 유틸, 구조의 임의 생성 금지
- 계획 범위를 벗어나는 추가 기능, 수정, 리팩터링 금지

## 권장사항
- 재사용 가능한 컴포넌트 설계 우선
- 접근성 고려
- 성능을 고려해 불필요한 렌더링, 계산, 상태 변경 최소화
- 함수나 컴포넌트 추가 전 기존 구현 재사용 가능 여부 먼저 확인
- 작업 완료 후 문서 수정 필요 여부 확인, 필요 시 관련 active 문서 갱신

## 문제해결 우선순위
1. 실제 동작하는 해결책 우선
2. 기존 코드 패턴 분석 및 일관성 유지
3. 타입 안정성 보장
4. 테스트 가능한 구조 설계
5. 단, MAVLink 등 외부 결합이 강한 영역은 테스트 가능 구조 원칙의 무리한 강제 배제

## Repository Conventions
- 컴포넌트 파일은 PascalCase 사용. 예: `ConnectionPanel.tsx`
- 훅과 Zustand 스토어는 `use` 접두어 사용. 예: `useConnectionStore.ts`
- 서비스와 유틸 파일은 camelCase 사용. 예: `projectStorage.ts`
- 기존에 `index.ts`를 쓰는 디렉터리는 같은 방식으로 export 유지

## State and Service Boundaries
- 연결 생성과 전환은 `ConnectionManager`와 연결 스토어에서 처리
- Blockly 파싱과 실행 상태 관리는 `useExecutionStore`와 실행 서비스에서 처리
- 시계열 telemetry 기록은 `useTelemetryStore`에서 처리
- 프로젝트 저장/복원은 `useProjectStore`와 storage 계층에서 처리

## Blockly Rules
- 사용자 노출 블록은 의도 중심 카테고리(`비행/이동/군집/제어/변수·판단/설정`) 기준
- `mission_*`, `drone_rc_control`은 toolbox와 parser 둘 다에서 사용자 경로로 지원하지 않음
- 속도는 `drone_set_speed`로만 설정하고 이동 블록 필드로 중복 구현하지 않음
- 카테고리/기본 필드는 `src/components/blockly/registry.ts`를 단일 기준으로 유지

## Documentation Rule
- 현재 구조 설명은 active 문서에 작성
- 완료 보고서, 조사 노트, 마이그레이션 기록은 `docs/archive/`로 이동
- 구조, 인터페이스, 절차, 규칙, 디버깅 흐름 변경 시 관련 active 문서 함께 갱신
