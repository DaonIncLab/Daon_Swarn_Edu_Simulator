import { useState } from 'react'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { Button } from '@/components/common/Button'
import type { Command } from '@/types/websocket'

export function CommandPreview() {
  const { commands, currentCommandIndex, status } = useExecutionStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showRaw, setShowRaw] = useState(false)

  const formatCommand = (cmd: Command, index: number) => {
    const isCurrentCommand = index === currentCommandIndex
    const isPastCommand = index < currentCommandIndex

    let statusIcon = '⚪'
    let statusColor = 'text-gray-400'

    if (isPastCommand) {
      statusIcon = '✅'
      statusColor = 'text-success-dark'
    } else if (isCurrentCommand) {
      statusIcon = '▶️'
      statusColor = 'text-primary-600'
    }

    return (
      <div
        key={index}
        className={`p-3 rounded-lg border ${
          isCurrentCommand
            ? 'bg-primary-50 border-primary-300'
            : isPastCommand
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-start gap-2">
          <span className={`text-lg ${statusColor}`}>{statusIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-gray-500">
                #{index + 1}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {cmd.action}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              {cmd.droneId !== undefined && (
                <div>
                  <span className="font-medium">Drone ID:</span> {cmd.droneId}
                </div>
              )}
              {cmd.altitude !== undefined && (
                <div>
                  <span className="font-medium">Altitude:</span> {cmd.altitude}m
                </div>
              )}
              {cmd.formation && (
                <div>
                  <span className="font-medium">Formation:</span> {cmd.formation}
                </div>
              )}
              {cmd.direction && (
                <div>
                  <span className="font-medium">Direction:</span> {cmd.direction}
                </div>
              )}
              {cmd.distance !== undefined && (
                <div>
                  <span className="font-medium">Distance:</span> {cmd.distance}m
                </div>
              )}
              {cmd.duration !== undefined && (
                <div>
                  <span className="font-medium">Duration:</span> {cmd.duration}s
                </div>
              )}
              {cmd.x !== undefined && cmd.y !== undefined && cmd.z !== undefined && (
                <div>
                  <span className="font-medium">Position:</span> ({cmd.x}, {cmd.y}, {cmd.z})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const copyToClipboard = () => {
    const json = JSON.stringify(commands, null, 2)
    navigator.clipboard.writeText(json)
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h3 className="text-lg font-semibold text-white">Command Preview</h3>
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
            <span className="text-sm text-white/90">
              {commands.length} command{commands.length !== 1 ? 's' : ''}
            </span>
            {commands.length > 0 && (
              <>
                <span className="text-white/50">•</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRaw(!showRaw)}
                  className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
                >
                  {showRaw ? '📋 Formatted' : '{ } JSON'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                  className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
                >
                  📄 Copy
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {commands.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-sm">No commands yet</p>
              <p className="text-xs mt-1">
                Create blocks in the workspace to see commands here
              </p>
            </div>
          ) : showRaw ? (
            // Raw JSON view
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(commands, null, 2)}
              </pre>
            </div>
          ) : (
            // Formatted view
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commands.map((cmd, index) => formatCommand(cmd, index))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
