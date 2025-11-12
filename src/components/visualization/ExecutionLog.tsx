import { useState, useEffect, useRef } from 'react'
import { useExecutionStore, ExecutionStatus } from '@/stores/useExecutionStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { Button } from '@/components/common/Button'

interface LogEntry {
  id: number
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export function ExecutionLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)
  const logIdCounter = useRef(0)

  const { status, currentCommandIndex, commands, error } = useExecutionStore()
  const { status: connectionStatus, isDummyMode } = useConnectionStore()

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Add log entry
  const addLog = (level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR')
    setLogs((prev) => [
      ...prev,
      { id: logIdCounter.current++, timestamp, level, message },
    ])
  }

  // Monitor connection status
  useEffect(() => {
    if (connectionStatus === 'connected') {
      addLog('success', isDummyMode ? '🧪 Test mode activated' : '✅ Connected to Unity server')
    } else if (connectionStatus === 'disconnected' && logs.length > 0) {
      addLog('warning', '⚠️ Disconnected from server')
    }
  }, [connectionStatus])

  // Monitor execution status
  useEffect(() => {
    if (status === ExecutionStatus.RUNNING && currentCommandIndex === 0) {
      addLog('info', `🚀 Starting execution: ${commands.length} commands`)
    } else if (status === ExecutionStatus.COMPLETED) {
      addLog('success', '✅ Execution completed successfully')
    } else if (status === ExecutionStatus.ERROR && error) {
      addLog('error', `❌ Error: ${error}`)
    }
  }, [status])

  // Monitor command progress
  useEffect(() => {
    if (status === ExecutionStatus.RUNNING && currentCommandIndex >= 0) {
      const cmd = commands[currentCommandIndex]
      if (cmd) {
        addLog(
          'info',
          `▶️ [${currentCommandIndex + 1}/${commands.length}] Executing: ${cmd.action}`
        )
      }
    }
  }, [currentCommandIndex])

  const clearLogs = () => {
    setLogs([])
  }

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-success-dark bg-success/10 border-success/20'
      case 'error':
        return 'text-danger-dark bg-danger/10 border-danger/20'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'info':
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <h3 className="text-lg font-semibold text-white">Execution Log</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/20 rounded-lg px-3 py-1 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-white/90">{logs.length} entries</span>
            {logs.length > 0 && (
              <>
                <span className="text-white/50">•</span>
                <label className="flex items-center gap-1 text-sm text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3 h-3 rounded"
                  />
                  <span>Auto-scroll</span>
                </label>
                <span className="text-white/50">•</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearLogs}
                  className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
                >
                  🗑️ Clear
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📜</div>
              <p className="text-sm">No logs yet</p>
              <p className="text-xs mt-1">
                Logs will appear here during execution
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border ${getLogColor(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0">{getLogIcon(log.level)}</span>
                    <span className="text-gray-500 flex-shrink-0">
                      {log.timestamp}
                    </span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
