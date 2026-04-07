/**
 * Error Fallback Component
 *
 * Customizable error fallback UI for use with ErrorBoundary
 */

import type { ErrorInfo } from 'react'

interface ErrorFallbackProps {
  error: Error
  errorInfo?: ErrorInfo
  retry?: () => void
  title?: string
  description?: string
  showStack?: boolean
}

/**
 * Inline error fallback (for component-level errors)
 */
export function ErrorFallback({
  error,
  errorInfo,
  retry,
  title = 'Component Error',
  description = 'This component encountered an error and could not be displayed.',
  showStack = import.meta.env.DEV,
}: ErrorFallbackProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-1">{title}</h3>
          <p className="text-sm text-red-700 mb-2">{description}</p>
          <div className="bg-white border border-red-300 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-red-800 mb-1">Error Message:</p>
            <p className="text-xs text-red-700 font-mono break-words">{error.message}</p>
          </div>

          {showStack && errorInfo && (
            <details className="mb-3">
              <summary className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900 mb-2">
                Stack Trace
              </summary>
              <pre className="text-xs bg-white border border-red-300 rounded p-2 overflow-auto max-h-32 text-gray-700">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          {retry && (
            <button
              onClick={retry}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Full-page error fallback (for critical errors)
 */
export function FullPageErrorFallback({
  error,
  errorInfo,
  retry,
  title = 'Application Error',
  description = 'The application encountered an unexpected error.',
  showStack = import.meta.env.DEV,
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-red-800 mb-2 uppercase tracking-wide">
            Error Details
          </p>
          <p className="text-sm text-red-700 font-mono break-words">{error.message}</p>
          {error.stack && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                Full Error Stack
              </summary>
              <pre className="mt-2 text-xs bg-white border border-red-300 rounded p-3 overflow-auto max-h-48 text-gray-700">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        {showStack && errorInfo && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-xs font-semibold text-gray-800 mb-2 uppercase tracking-wide">
              Component Stack (Development)
            </p>
            <pre className="text-xs bg-white border border-gray-300 rounded p-3 overflow-auto max-h-48 text-gray-700">
              {errorInfo.componentStack}
            </pre>
          </div>
        )}

        <div className="flex gap-3">
          {retry && (
            <button
              onClick={retry}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Reload Application
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            If this error persists, please open the browser console for more information.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal error fallback (for inline errors)
 */
export function MinimalErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 my-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-yellow-800 font-medium">Error: {error.message}</p>
        </div>
        {retry && (
          <button
            onClick={retry}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
