/**
 * Performance Measurement Utilities
 *
 * 컴포넌트 렌더링 성능 측정 및 모니터링 도구
 */

/**
 * 컴포넌트 렌더링 시간 측정
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useEffect(() => {
 *     const done = measureRender('MyComponent')
 *     return done
 *   })
 * }
 * ```
 */
export const measureRender = (componentName: string) => {
  if (import.meta.env.MODE !== 'development') {
    return () => {} // No-op in production
  }

  const start = performance.now()

  return () => {
    const duration = performance.now() - start

    // 16ms = 60fps 기준, 이보다 느리면 프레임 드롭
    if (duration > 16) {
      console.warn(
        `⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms (>16ms = dropped frame)`
      )
    } else if (duration > 8) {
      console.log(
        `⏱️ ${componentName} rendered in ${duration.toFixed(2)}ms`
      )
    }
  }
}

/**
 * 함수 실행 시간 측정
 */
export const measureFunction = <T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T => {
  if (import.meta.env.MODE !== 'development') {
    return fn // No-op in production
  }

  return ((...args: Parameters<T>) => {
    const start = performance.now()
    const result = fn(...args)
    const duration = performance.now() - start

    if (duration > 10) {
      console.warn(
        `⚠️ Slow function: ${label} took ${duration.toFixed(2)}ms`
      )
    }

    return result
  }) as T
}

/**
 * 성능 마크 및 측정
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>()

  /**
   * 성능 측정 시작
   */
  static start(label: string) {
    if (import.meta.env.MODE !== 'development') return

    this.marks.set(label, performance.now())
  }

  /**
   * 성능 측정 종료 및 결과 출력
   */
  static end(label: string) {
    if (import.meta.env.MODE !== 'development') return

    const start = this.marks.get(label)
    if (!start) {
      console.warn(`⚠️ Performance mark "${label}" not found`)
      return
    }

    const duration = performance.now() - start
    this.marks.delete(label)

    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
    return duration
  }

  /**
   * 모든 마크 초기화
   */
  static clear() {
    this.marks.clear()
  }
}

/**
 * 리렌더 카운터 (디버깅용)
 */
export const useRenderCount = (componentName: string) => {
  if (import.meta.env.MODE !== 'development') {
    return
  }

  const renderCount = React.useRef(0)

  React.useEffect(() => {
    renderCount.current++
    console.log(`🔄 ${componentName} render count: ${renderCount.current}`)
  })
}

// React import for useRenderCount
import React from 'react'

/**
 * 메모리 사용량 체크 (개발 환경 전용)
 */
export const checkMemoryUsage = () => {
  if (import.meta.env.MODE !== 'development') return

  if ('memory' in performance) {
    const memory = (performance as any).memory
    const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
    const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
    const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)

    console.log(`
💾 Memory Usage:
  Used: ${usedMB} MB
  Total: ${totalMB} MB
  Limit: ${limitMB} MB
  Usage: ${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%
    `)
  }
}

/**
 * 성능 통계 수집
 */
export class PerformanceStats {
  private static renderTimes = new Map<string, number[]>()

  /**
   * 렌더 시간 기록
   */
  static recordRender(componentName: string, duration: number) {
    if (import.meta.env.MODE !== 'development') return

    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, [])
    }

    const times = this.renderTimes.get(componentName)!
    times.push(duration)

    // 최근 100개만 유지
    if (times.length > 100) {
      times.shift()
    }
  }

  /**
   * 통계 출력
   */
  static report() {
    if (import.meta.env.MODE !== 'development') return

    console.group('📊 Performance Statistics')

    for (const [component, times] of this.renderTimes.entries()) {
      if (times.length === 0) continue

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      const min = Math.min(...times)

      console.log(`
${component}:
  Average: ${avg.toFixed(2)}ms
  Min: ${min.toFixed(2)}ms
  Max: ${max.toFixed(2)}ms
  Samples: ${times.length}
      `)
    }

    console.groupEnd()
  }

  /**
   * 통계 초기화
   */
  static clear() {
    this.renderTimes.clear()
  }
}
