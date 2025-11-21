# 🎯 Drone Swarm GCS - Coding Rules & Standards

## 📋 Table of Contents
1. [TypeScript Import Rules](#typescript-import-rules)
2. [TailwindCSS 4.x Rules](#tailwindcss-4x-rules)
3. [Component Architecture](#component-architecture)
4. [State Management (Zustand)](#state-management-zustand)
5. [File Naming Conventions](#file-naming-conventions)
6. [Pre-Commit Checklist](#pre-commit-checklist)

---

## 🔴 CRITICAL: TypeScript Import Rules

### ❌ WRONG - Runtime Import for Types
```typescript
// ❌ 절대 하지 마세요!
import { Command, WSMessage } from '@/types/websocket'
```

### ✅ CORRECT - Type-Only Import
```typescript
// ✅ 항상 이렇게 하세요!
import type { Command, WSMessage } from '@/types/websocket'
```

### 📌 Rule Explanation
- **모든 타입 import는 `type` 키워드 사용 필수**
- 이유: Vite의 `verbatimModuleSyntax` 설정 때문
- 타입만 import할 때 `type`을 빠뜨리면 런타임 에러 발생

### 🔍 체크 방법
```bash
# 잘못된 import 찾기
grep -r "^import {.*} from '@/types/" src/
```

---

## 🎨 TailwindCSS 4.x Rules

### ❌ WRONG - Old TailwindCSS 3.x Syntax
```css
/* ❌ TailwindCSS 3.x 방식 (작동 안함!) */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply m-0 min-h-screen bg-gray-50;
  }
}
```

### ✅ CORRECT - TailwindCSS 4.x Syntax
```css
/* ✅ TailwindCSS 4.x 방식 */
@import "tailwindcss";

/* 일반 CSS 사용 */
body {
  margin: 0;
  min-height: 100vh;
  background-color: rgb(249 250 251);
}
```

### 📌 Rules
1. **`@tailwind` directives 사용 금지** → `@import "tailwindcss"` 사용
2. **`@apply` 사용 최소화** → 컴포넌트에서 className 사용 권장
3. **`@layer` 사용 금지** → 일반 CSS로 작성
4. **PostCSS 설정**: `@tailwindcss/postcss` 플러그인 필수

### 📄 필수 설정 파일
```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // ← 이것 사용!
    autoprefixer: {},
  },
}
```

---

## 🏗️ Component Architecture

### 📂 File Structure
```
src/
├── components/
│   ├── common/          # 재사용 가능한 기본 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── index.ts     # ← 반드시 export 파일 생성
│   ├── connection/      # 기능별 컴포넌트
│   │   ├── ConnectionPanel.tsx
│   │   └── index.ts
│   └── blockly/
│       └── ...
├── stores/              # Zustand 상태 관리
├── services/            # API, WebSocket 등
├── types/               # TypeScript 타입 정의
├── utils/               # 유틸리티 함수
├── constants/           # 상수 정의
└── hooks/               # Custom React Hooks
```

### ✅ Component Rules

#### 1. **Props Interface는 항상 정의**
```typescript
// ✅ CORRECT
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export function Button({ variant = 'primary', onClick }: ButtonProps) {
  // ...
}
```

#### 2. **forwardRef 사용 시 타입 명시**
```typescript
// ✅ CORRECT
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    // ...
  }
)

Button.displayName = 'Button'
```

#### 3. **index.ts로 깔끔한 export**
```typescript
// components/common/index.ts
export { Button } from './Button'
export { Input } from './Input'
export { Card } from './Card'

// 사용 시
import { Button, Input, Card } from '@/components/common'
```

---

## 🗂️ State Management (Zustand)

### ✅ Store 작성 규칙

#### 1. **State와 Actions 명확히 분리**
```typescript
interface MyStore {
  // State
  count: number
  isLoading: boolean

  // Actions
  increment: () => void
  setLoading: (loading: boolean) => void
}
```

#### 2. **초기값 명확히 지정**
```typescript
export const useMyStore = create<MyStore>((set) => ({
  // Initial state
  count: 0,
  isLoading: false,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  setLoading: (loading) => set({ isLoading: loading }),
}))
```

#### 3. **비동기 작업 처리**
```typescript
// ✅ CORRECT
const fetchData = async () => {
  set({ isLoading: true, error: null })
  try {
    const data = await api.getData()
    set({ data, isLoading: false })
  } catch (error) {
    set({ error: error.message, isLoading: false })
  }
}
```

---

## 📝 File Naming Conventions

### ✅ Naming Rules

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase | `ConnectionPanel.tsx` |
| Zustand Store | camelCase (use prefix) | `useConnectionStore.ts` |
| Service/Utility | camelCase | `websocket.ts`, `cn.ts` |
| Type Definition | camelCase | `websocket.ts`, `blockly.ts` |
| Constant | camelCase | `connection.ts`, `commands.ts` |
| Hook | camelCase (use prefix) | `useWebSocket.ts` |

### 📁 Folder Names
- **소문자, 단수형**: `component/`, `store/`, `service/`
- **복수형 사용 금지**: ❌ `components/`, ✅ `component/`

---

## ✅ Pre-Commit Checklist

### 🔍 코드 작성 전 체크리스트

```markdown
[ ] 1. 타입 import에 `type` 키워드 사용했나?
[ ] 2. TailwindCSS 4.x 문법 준수했나? (@import "tailwindcss")
[ ] 3. Props interface 정의했나?
[ ] 4. forwardRef 사용 시 displayName 설정했나?
[ ] 5. index.ts로 export 정리했나?
[ ] 6. Zustand store의 초기값 모두 설정했나?
[ ] 7. 비동기 작업에 에러 핸들링 추가했나?
[ ] 8. 파일명 규칙 준수했나? (PascalCase/camelCase)
[ ] 9. 불필요한 console.log 제거했나?
[ ] 10. ESLint 경고 없나?
```

### 🧪 테스트 전 체크리스트

```markdown
[ ] 1. 개발 서버 정상 실행되나? (npm run dev)
[ ] 2. 브라우저 콘솔에 에러 없나? (F12)
[ ] 3. HMR(Hot Module Replacement) 정상 작동하나?
[ ] 4. 모든 컴포넌트 정상 렌더링되나?
[ ] 5. TypeScript 컴파일 에러 없나? (npm run build)
```

---

## 🚨 Common Pitfalls (자주 하는 실수)

### 1. ❌ Type Import 실수
```typescript
// ❌ WRONG
import { Command } from '@/types/websocket'

// ✅ CORRECT
import type { Command } from '@/types/websocket'
```

### 2. ❌ TailwindCSS @apply 사용
```css
/* ❌ WRONG - TailwindCSS 4.x에서 작동 안함 */
.button {
  @apply px-4 py-2 bg-blue-500;
}

/* ✅ CORRECT - 컴포넌트에서 className 사용 */
<button className="px-4 py-2 bg-blue-500">Click</button>
```

### 3. ❌ 절대 경로 없이 상대 경로 사용
```typescript
// ❌ WRONG
import { Button } from '../../components/common/Button'

// ✅ CORRECT
import { Button } from '@/components/common'
```

### 4. ❌ Enum 대신 Union Type 미사용
```typescript
// ❌ WRONG (Enum은 런타임 오버헤드)
enum Status {
  IDLE = 'idle',
  LOADING = 'loading'
}

// ✅ CORRECT
export const Status = {
  IDLE: 'idle',
  LOADING: 'loading',
} as const

export type StatusType = typeof Status[keyof typeof Status]
```

---

## 🔧 Automated Checks

### ESLint Rules (추가 권장)
```json
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports"
      }
    ]
  }
}
```

### Git Pre-commit Hook (추가 권장)
```bash
#!/bin/sh
# .husky/pre-commit

npm run lint
npm run build

# 타입 import 체크
if grep -r "^import {.*} from '@/types/" src/ | grep -v "import type"; then
  echo "❌ Error: Found type imports without 'type' keyword!"
  exit 1
fi
```

---

## 🎨 Rule 8: Theme System Guidelines

### Use CSS Variables, NOT Hardcoded Colors

**❌ BAD**:
```typescript
<div className="bg-gray-100 text-gray-900 border-gray-200">
  Content
</div>
```

**✅ GOOD**:
```typescript
<div className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)]">
  Content
</div>
```

### Semantic Variable Names

Always use semantic variable names that describe purpose, not color.

**❌ BAD**:
```css
--color-light-blue: rgb(219 234 254);
```

**✅ GOOD**:
```css
--nav-active-bg: rgb(219 234 254);
```

### Component-Level Theme Usage

Use `useThemeContext` for components that need theme awareness.

```typescript
import { useThemeContext } from '@/contexts/ThemeContext'

function MyComponent() {
  const { isDark, toggle } = useThemeContext()

  return (
    <button onClick={toggle}>
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
```

### Dark Mode Testing Checklist

Before committing component changes:

- [ ] Test component in light mode
- [ ] Test component in dark mode
- [ ] Verify text contrast (WCAG AA minimum 4.5:1)
- [ ] Check hover/focus states in both themes
- [ ] Verify disabled states in both themes
- [ ] Test theme toggle transition

### CSS Variable Categories

Use appropriate variable category for each use case:

**Backgrounds**:
```typescript
// Primary: Main app background
className="bg-[var(--bg-primary)]"

// Secondary: Cards, panels, modals
className="bg-[var(--bg-secondary)]"

// Tertiary: Nested elements, inputs
className="bg-[var(--bg-tertiary)]"

// Interactive states
className="hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)]"
```

**Text**:
```typescript
// Primary: Headlines, important text
className="text-[var(--text-primary)]"

// Secondary: Body text, labels
className="text-[var(--text-secondary)]"

// Tertiary: Placeholders, muted text
className="text-[var(--text-tertiary)]"
```

**Borders**:
```typescript
// Standard borders
className="border-[var(--border-primary)]"

// Emphasized borders
className="border-[var(--border-secondary)]"

// Focus rings
className="focus:ring-[var(--border-focus)]"
```

**Status Indicators**:
```typescript
// Connection status
className="bg-[var(--status-online)]"  // or --status-offline

// Drone status
className="text-[var(--status-active)]"  // idle, armed, error, warning

// Battery levels
className="bg-[var(--battery-good)]"  // medium, low
```

**Alerts**:
```typescript
// Info panels
className="bg-[var(--info-bg)] border-[var(--info-border)] text-[var(--info-text)]"

// Warning panels
className="bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning-text)]"

// Error panels
className="bg-[var(--error-bg)] border-[var(--error-border)] text-[var(--error-text)]"
```

### Adding New Theme Variables

When adding new CSS variables:

1. **Define in both `:root` and `.dark`**:
```css
:root {
  --new-variable: rgb(255 255 255);
}

.dark {
  --new-variable: rgb(17 24 39);
}
```

2. **Use semantic names**:
```css
/* ✅ GOOD */
--sidebar-active-bg: rgb(219 234 254);

/* ❌ BAD */
--blue-100: rgb(219 234 254);
```

3. **Document in ARCHITECTURE.md**: Add to CSS Variable Structure section

4. **Test in both themes**: Verify contrast and readability

### Exception: Branded Colors

Use hardcoded colors ONLY for branding (primary/success/danger):

```typescript
// ✅ ALLOWED for branding
<button className="bg-primary-600 hover:bg-primary-700">
  Primary Action
</button>

<button className="bg-success hover:bg-success-dark">
  Save
</button>

<button className="bg-danger hover:bg-danger-dark">
  Delete
</button>
```

All other colors MUST use CSS variables.

---

## 📚 References

- [TailwindCSS 4.x Migration Guide](https://tailwindcss.com/docs/v4-beta)
- [TypeScript verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/typescript)
- [React forwardRef with TypeScript](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forward_and_create_ref/)

---

**Last Updated**: 2025-01-14
**Version**: 1.1.0
