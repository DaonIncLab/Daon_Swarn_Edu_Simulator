/**
 * Error Boundary Component
 *
 * Catches React component errors and displays a fallback UI
 * Prevents the entire app from crashing due to component errors
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Error info:', errorInfo)
    }

    // Store error info for display
    this.setState({ errorInfo })

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  retry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.retry)
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">⚠️</span>
              <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-red-800 mb-2">Error:</p>
              <p className="text-sm text-red-700 font-mono break-words">
                {this.state.error.message}
              </p>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 mb-2">
                  Stack Trace (Development Only)
                </summary>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-64 text-gray-700">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.retry}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Reload Page
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              If this problem persists, please check the browser console for more details.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
