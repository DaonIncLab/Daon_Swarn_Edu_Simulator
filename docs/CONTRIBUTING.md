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
- 구조 변경 시 관련 문서 함께 수정
- 타입 전용 import는 반드시 `import type` 사용
- 스토어, 서비스, UI 책임 혼합 금지
- 기록성 문서는 `docs/archive/`에 두고, active 문서에는 현재 기준만 유지

## Pull Request Checklist
- 변경 목적과 영향 범위 짧게 설명
- 실행한 검증 명령 기재
- UI, Blockly, 시뮬레이터 변경은 스크린샷 또는 짧은 영상 첨부
- 문서 기준 변경 시 `docs/`와 `AGENTS.md` 함께 업데이트
