# Contributing

## Setup
- Node.js 20+ 권장
- 패키지 매니저는 `npm` 기준

```bash
npm install
npm run dev
```

Unity 또는 MAVLink 브리지 확인이 필요하면 별도 실행.

```bash
npm run bridge
```

## Local Validation
작업 전후 최소 검증 명령어.

```bash
npm run lint
npm run check:types
npm run test:run
npm run build
```

필요 시 추가 실행.

```bash
npm run test
npm run test:coverage
npm run preview
```

## Working Rules
- 변경 전에는 먼저 관련 구조, 실제 타입/인터페이스 계약, 현재 동작 경로 확인
- 작업 시작 전 이번 변경 범위와 제외 범위를 먼저 고정
- 구조 변경 시 관련 문서 함께 수정
- 타입 전용 import는 반드시 `import type` 사용
- 스토어, 서비스, UI 책임 혼합 금지
- 기록성 문서는 `docs/archive/`에 두고, active 문서에는 현재 기준만 유지

## Recommended Workflow
1. 관련 구조와 현재 동작 경로 파악
2. 실제 타입, 스토어, 서비스 계약 확인
3. 이번 작업 범위와 제외 범위 고정
4. 최소 수정으로 변경 적용
5. `npm run lint`, `npm run check:types`, `npm run test:run`, `npm run build` 중 작업 성격에 맞는 최소 검증 실행
6. 관련 active 문서와 `AGENTS.md` 참조가 여전히 맞는지 확인

## Pull Request Checklist
- 변경 목적과 영향 범위 짧게 설명
- 실행한 검증 명령 기재
- UI, Blockly, 시뮬레이터 변경은 스크린샷 또는 짧은 영상 첨부
- 문서 기준 변경 시 `docs/`와 `AGENTS.md` 함께 업데이트
