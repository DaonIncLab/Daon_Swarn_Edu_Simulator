# Contributing to Drone Swarm GCS

Welcome to the Drone Swarm GCS project! This document provides comprehensive guidelines for developers contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Common Issues](#common-issues)

---

## Getting Started

### Prerequisites

- **Node.js**: v18+ (recommend v20+)
- **npm**: v9+ or yarn v1.22+
- **Git**: v2.30+
- **VS Code**: Recommended editor with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense
  - Mermaid Preview (for viewing diagrams)

### Initial Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/drone-swarm-gcs.git
cd drone-swarm-gcs
```

2. **Install dependencies**

```bash
npm install
```

3. **Start development server**

```bash
npm run dev
```

4. **Open browser**

Navigate to `http://localhost:5173` (default Vite port)

### Project Structure Overview

```
drone-swarm-gcs/
├── src/
│   ├── components/          # React components
│   │   ├── common/          # Reusable UI components
│   │   ├── blockly/         # Blockly workspace
│   │   ├── connection/      # Connection management
│   │   ├── telemetry/       # Telemetry dashboard
│   │   └── project/         # Project management
│   ├── stores/              # Zustand state stores
│   ├── services/            # Business logic services
│   │   ├── connection/      # Connection strategies
│   │   ├── execution/       # Interpreter
│   │   ├── project/         # Project service
│   │   └── storage/         # Storage adapter
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── constants/           # Application constants
│   ├── hooks/               # Custom React hooks
│   └── App.tsx              # Main application
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System architecture
│   ├── DIAGRAMS.md          # Mermaid diagrams
│   ├── API.md               # API reference
│   └── CONTRIBUTING.md      # This file
├── CODING_RULES.md          # Critical coding rules
└── README.md                # Project overview
```

---

## Development Workflow

### 1. Pick an Issue

- Browse open issues on GitHub
- Look for issues tagged `good first issue` or `help wanted`
- Comment on the issue to claim it
- Wait for maintainer assignment before starting work

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates
- `perf/` - Performance improvements

### 3. Make Changes

Follow the [Code Standards](#code-standards) section below.

### 4. Test Locally

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type check
npm run check
```

### 5. Commit Changes

See [Git Workflow](#git-workflow) for commit message format.

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Code Standards

### TypeScript

#### CRITICAL: Type-Only Imports

**ALWAYS use `type` keyword when importing types:**

```typescript
// ❌ WRONG - Runtime import
import { Command, DroneState } from '@/types/blockly'

// ✅ CORRECT - Type-only import
import type { Command, DroneState } from '@/types/blockly'
```

**Why?**: Vite's `verbatimModuleSyntax` requires explicit `type` imports to avoid runtime errors.

**Check for violations**:
```bash
grep -r "^import {.*} from '@/types/" src/ | grep -v "import type"
```

#### No Enums - Use `as const` Pattern

```typescript
// ❌ WRONG - Enum (runtime overhead)
enum ConnectionMode {
  SIMULATION = 'simulation',
  TEST = 'test'
}

// ✅ CORRECT - as const pattern
export const ConnectionMode = {
  SIMULATION: 'simulation',
  TEST: 'test',
} as const

export type ConnectionMode = typeof ConnectionMode[keyof typeof ConnectionMode]
```

**Why?**: Enums create runtime code and can cause issues with tree-shaking.

#### Component Props

Always define props interfaces:

```typescript
// ✅ CORRECT
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  children
}: ButtonProps) {
  return (
    <button
      className={cn('btn', variant, size)}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

#### forwardRef with TypeScript

```typescript
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn('input', className)} {...props} />
  }
)

Input.displayName = 'Input' // Required for React DevTools
```

### TailwindCSS 4.x

#### Critical: Use New Syntax

**NEVER use TailwindCSS 3.x directives:**

```css
/* ❌ WRONG - TailwindCSS 3.x (does NOT work) */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply m-0 min-h-screen;
  }
}
```

```css
/* ✅ CORRECT - TailwindCSS 4.x */
@import "tailwindcss";

body {
  margin: 0;
  min-height: 100vh;
}
```

**Why?**: TailwindCSS 4.x completely changed the syntax and `@apply` is discouraged.

#### Prefer className Over Custom CSS

```typescript
// ✅ CORRECT - Use Tailwind classes in components
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
  Click me
</button>

// ❌ AVOID - Custom CSS with @apply
// .button { @apply px-4 py-2 bg-blue-600; }
```

#### Using cn() Utility

```typescript
import { cn } from '@/utils/cn'

<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className // Allow external override
)} />
```

### Zustand Store Guidelines

#### Store Structure

```typescript
import { create } from 'zustand'

interface MyStore {
  // === State ===
  count: number
  isLoading: boolean
  error: string | null

  // === Actions ===
  increment: () => void
  decrement: () => void
  fetchData: () => Promise<void>
  reset: () => void
}

export const useMyStore = create<MyStore>((set, get) => ({
  // Initial state
  count: 0,
  isLoading: false,
  error: null,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),

  decrement: () => set((state) => ({ count: state.count - 1 })),

  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getData()
      set({ data, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },

  reset: () => set({ count: 0, isLoading: false, error: null }),
}))
```

#### Store Usage in Components

```typescript
// ✅ CORRECT - Select only needed state
const count = useMyStore((state) => state.count)
const increment = useMyStore((state) => state.increment)

// ❌ AVOID - Causes unnecessary re-renders
const store = useMyStore()
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase | `ConnectionPanel.tsx` |
| Zustand Store | camelCase with `use` prefix | `useConnectionStore.ts` |
| Service/Utility | camelCase | `interpreter.ts`, `cn.ts` |
| Type Definition | camelCase | `blockly.ts`, `telemetry.ts` |
| Constant | camelCase | `connection.ts` |
| Custom Hook | camelCase with `use` prefix | `useWebSocket.ts` |

### Absolute Imports

Always use absolute imports with `@/` alias:

```typescript
// ✅ CORRECT
import { Button } from '@/components/common'
import { useConnectionStore } from '@/stores/useConnectionStore'
import type { Command } from '@/types/blockly'

// ❌ WRONG
import { Button } from '../../../components/common/Button'
```

---

## Architecture Guidelines

### Design Patterns

#### Strategy Pattern (Connection Services)

All connection services implement `IConnectionService`:

```typescript
import type { IConnectionService } from '@/services/connection/IConnectionService'

export class MyConnectionService implements IConnectionService {
  async connect(config: ConnectionConfig): Promise<void> {
    // Implementation
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    // Implementation
  }

  // ... other interface methods
}
```

#### Interpreter Pattern (Execution)

The interpreter uses recursive tree traversal:

```typescript
private async executeNode(node: ExecutableNode, path: number[]): Promise<number> {
  // Check for pause
  await this.checkPause()

  switch (node.type) {
    case NodeType.COMMAND:
      return await this.executeCommand(node, path)
    case NodeType.SEQUENCE:
      return await this.executeSequence(node, path)
    // ... other node types
  }
}
```

#### Observer Pattern (Zustand)

Components subscribe to store changes:

```typescript
// Store notifies subscribers
set({ status: 'connected' }) // Triggers re-render in all subscribers

// Component subscribes
const status = useConnectionStore((state) => state.status)
```

### Error Boundaries

Wrap all major component trees with Error Boundaries:

```typescript
<ErrorBoundary
  fallback={(error, errorInfo, retry) => (
    <ErrorFallback
      error={error}
      errorInfo={errorInfo}
      retry={retry}
      title="Component Error"
    />
  )}
>
  <YourComponent />
</ErrorBoundary>
```

### Performance Best Practices

#### 1. Cache Expensive Computations

```typescript
// Example: Blockly parsing cache
const currentHash = simpleHash(workspaceXml)
if (cachedHash === currentHash && cachedTree) {
  return cachedTree // Use cache
}
const tree = parseBlocklyWorkspace(workspace) // Parse
setCachedParsedTree(tree, currentHash) // Cache
```

#### 2. Memory Management

```typescript
// Limit data points
if (totalPoints > maxTotalDataPoints) {
  // Prune oldest data
}
```

#### 3. Interpolation for Smooth Playback

```typescript
// Binary search + linear interpolation
const t = (currentTime - beforePoint.timestamp) /
          (afterPoint.timestamp - beforePoint.timestamp)

const interpolated = {
  x: beforePoint.x + (afterPoint.x - beforePoint.x) * t,
  // ... other fields
}
```

---

## Testing

### Manual Testing Checklist

Before submitting a PR, test the following:

#### Basic Functionality
- [ ] App loads without errors
- [ ] All panels render correctly
- [ ] Navigation between panels works
- [ ] No console errors or warnings

#### Connection Tests
- [ ] Test Mode connection works
- [ ] WebSocket connection works (with Unity simulator)
- [ ] Unity WebGL connection works (if available)
- [ ] Disconnect works cleanly

#### Blockly Tests
- [ ] Can drag blocks onto workspace
- [ ] Can connect blocks
- [ ] Can delete blocks
- [ ] Workspace changes mark project as unsaved

#### Execution Tests
- [ ] Run button starts execution
- [ ] Pause button pauses execution
- [ ] Resume button resumes execution
- [ ] Stop button stops execution
- [ ] Execution logs display correctly

#### Telemetry Tests
- [ ] 3D view displays drones
- [ ] Charts update with telemetry data
- [ ] Drone list displays all drones
- [ ] Selecting drone updates charts

#### Recording Tests
- [ ] Start recording captures telemetry
- [ ] Stop recording works
- [ ] Save recording persists data
- [ ] Load recording works
- [ ] Playback plays smoothly
- [ ] Playback controls (play/pause/stop/seek) work

#### Project Tests
- [ ] New project creates blank workspace
- [ ] Save project persists workspace
- [ ] Load project restores workspace
- [ ] Export project downloads JSON
- [ ] Import project loads JSON
- [ ] Auto-save works (if enabled)

### Browser Compatibility

Test on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

### Build Test

```bash
npm run build
npm run preview
```

Ensure production build works without errors.

---

## Git Workflow

### Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `docs` - Documentation
- `style` - Code style (formatting, semicolons)
- `test` - Add/update tests
- `chore` - Build process, dependencies

**Examples**:

```
feat(execution): implement pause/resume functionality

Add promise-based pause mechanism with checkPause() in execution loop.
Properly reset state on stop/start.

Closes #42
```

```
fix(telemetry): prevent unbounded memory growth

Add maxTotalDataPoints limit (10,000 default) with automatic pruning
of oldest data from largest histories.

Fixes #58
```

```
docs: create comprehensive ARCHITECTURE.md

Document all major systems, patterns, and data flows.
Add 600+ lines of architecture documentation.
```

### Commit Best Practices

- **Atomic commits**: One logical change per commit
- **Clear messages**: Explain *why*, not just *what*
- **Reference issues**: Use `Closes #N` or `Fixes #N`
- **Keep commits small**: Easier to review and revert

---

## Pull Request Process

### Before Creating PR

1. **Sync with main**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-feature
   git rebase main
   ```

2. **Run all checks**
   ```bash
   npm run dev       # Test dev server
   npm run build     # Test production build
   npm run lint      # Check linting
   npm run check     # Check types
   ```

3. **Test thoroughly** (see [Testing](#testing))

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
- [ ] Performance improvement

## Testing
- [ ] Tested locally
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Build succeeds

## Related Issues
Closes #(issue number)

## Screenshots (if applicable)
Add screenshots/videos of UI changes

## Additional Notes
Any other context
```

### PR Guidelines

- **Keep PRs focused**: One feature/fix per PR
- **Write good description**: Explain what, why, and how
- **Add screenshots/videos**: For UI changes
- **Reference issues**: Link related issues
- **Request review**: Tag appropriate reviewers
- **Respond to feedback**: Address all review comments

---

## Code Review Guidelines

### For Reviewers

#### What to Check

1. **Code Quality**
   - [ ] Follows TypeScript best practices
   - [ ] Uses type-only imports (`import type`)
   - [ ] No enums (uses `as const` instead)
   - [ ] Proper error handling
   - [ ] No console.log in production code

2. **Architecture**
   - [ ] Follows established patterns (Strategy, Interpreter, Observer)
   - [ ] Proper separation of concerns
   - [ ] Uses correct store for state
   - [ ] Services properly encapsulate logic

3. **Performance**
   - [ ] No unnecessary re-renders
   - [ ] Proper use of memoization (if needed)
   - [ ] No memory leaks
   - [ ] Efficient algorithms

4. **Testing**
   - [ ] Code has been tested
   - [ ] Edge cases considered
   - [ ] Error cases handled

5. **Documentation**
   - [ ] Code is self-documenting
   - [ ] Complex logic has comments
   - [ ] Public APIs have JSDoc
   - [ ] README/docs updated (if needed)

#### Review Comments Format

- **Be constructive**: Suggest improvements
- **Explain why**: Give reasoning for suggestions
- **Use labels**: `nit:` (minor), `question:`, `issue:` (must fix)
- **Praise good work**: Acknowledge quality contributions

**Examples**:

```
nit: Consider extracting this to a constant for reusability

question: Could this cause a memory leak if the component unmounts?

issue: This should use `import type` for type-only imports
```

### For Contributors

#### Responding to Reviews

- **Be open**: Reviews improve code quality
- **Ask questions**: If feedback is unclear
- **Discuss alternatives**: If you disagree
- **Make changes promptly**: Keep the review moving
- **Mark resolved**: When addressing comments

#### Re-requesting Review

After making changes:

1. Push new commits
2. Reply to resolved comments
3. Re-request review from reviewers

---

## Common Issues

### Issue: "Cannot find module '@/types/...'"

**Cause**: TypeScript path alias not configured

**Solution**: Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: "The requested module does not provide an export named 'X'"

**Cause**: Missing `type` keyword for type-only imports with `verbatimModuleSyntax`

**Solution**:
```typescript
// Change this:
import { MyType } from '@/types/something'

// To this:
import type { MyType } from '@/types/something'
```

### Issue: TailwindCSS classes not working

**Cause**: Using TailwindCSS 3.x syntax in 4.x project

**Solution**: Update `index.css`:
```css
/* Remove */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Add */
@import "tailwindcss";
```

### Issue: HMR not working

**Cause**: Multiple reasons

**Solutions**:
1. Check Vite version (should be 7.2.2+)
2. Restart dev server
3. Clear browser cache
4. Check for circular dependencies

### Issue: "localStorage quota exceeded"

**Cause**: Flight recordings exceed 5MB limit

**Solution**: Automatic pruning should handle this. If not:
```typescript
useFlightRecordingStore.getState().deleteRecording(oldRecordingId)
```

### Issue: Execution gets stuck in "running" state

**Cause**: Interpreter not handling errors properly

**Solution**: Check Error Boundary integration and interpreter error handling

---

## Resources

### Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [DIAGRAMS.md](./DIAGRAMS.md) - Visual diagrams
- [API.md](./API.md) - API reference
- [CODING_RULES.md](../CODING_RULES.md) - Critical coding rules

### External Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [TailwindCSS 4.x](https://tailwindcss.com/docs/v4-beta)
- [Blockly Documentation](https://developers.google.com/blockly)
- [Vite Documentation](https://vitejs.dev)

---

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Code Review**: Tag maintainers for help

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Drone Swarm GCS!** 🚁✨

Your contributions help make this project better for everyone.
