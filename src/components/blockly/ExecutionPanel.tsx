import { useTranslation } from 'react-i18next'
import { Button } from '@/components/common/Button'
import { useExecutionStore, ExecutionStatus } from '@/stores/useExecutionStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionStatus, ConnectionMode } from '@/constants/connection'

export function ExecutionPanel() {
  const { t } = useTranslation()
  const {
    status,
    scenarioPlan,
    scenarioSummary,
    currentNodeId,
    currentNodePath,
    error,
    executeScript,
    stopExecution,
    reset
  } = useExecutionStore()

  const { status: connectionStatus, mode } = useConnectionStore()
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED
  const isRunning = status === ExecutionStatus.RUNNING
  const hasScenarioPlan = Boolean(scenarioPlan) && scenarioSummary.commandNodes > 0
  const isTestMode = mode === ConnectionMode.TEST
  const isUnityMode = mode === ConnectionMode.UNITY

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('execution.title')}</h3>
        {isTestMode && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            🧪 {t('execution.testMode')}
          </span>
        )}
      </div>

      {/* 상태 표시 */}
      <div className="mb-4 p-4 rounded-lg bg-[var(--bg-tertiary)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t('execution.status')}:</span>
          <StatusBadge status={status} />
        </div>

        {hasScenarioPlan && (
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>{t('execution.commandCount')}:</span>
            <span className="font-mono font-semibold">{scenarioSummary.commandNodes}{t('execution.commands')}</span>
          </div>
        )}

        {/* 현재 실행 노드 정보 */}
        {isRunning && currentNodeId && (
          <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
            <div className="text-xs text-[var(--text-secondary)]">
              <div>{t('execution.currentNode')}: <span className="font-mono text-primary-600">{currentNodeId}</span></div>
              {currentNodePath.length > 0 && (
                <div className="mt-1">
                  {t('execution.executionPath')}: <span className="font-mono text-[var(--text-tertiary)]">{currentNodePath.join(' → ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {isRunning && (
          <div className="mt-2 pt-2 border-t border-[var(--border-primary)] text-xs text-[var(--text-secondary)]">
            <div>
              Plan Nodes: <span className="font-mono">{scenarioSummary.totalNodes}</span>
            </div>
            <div>
              Max Depth: <span className="font-mono">{scenarioSummary.maxDepth}</span>
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
          <p className="text-sm text-danger-dark font-medium">{error}</p>
        </div>
      )}

      {/* 실행 버튼들 */}
      <div className="space-y-2">
        {!isRunning ? (
          <Button
            variant="success"
            fullWidth
            onClick={executeScript}
            disabled={!isConnected || !hasScenarioPlan}
          >
            ▶ {t('execution.execute')}
          </Button>
        ) : (
          <Button
            variant="danger"
            fullWidth
            onClick={stopExecution}
          >
            ⏹ {t('execution.stop')}
          </Button>
        )}

        {status === ExecutionStatus.COMPLETED && (
          <Button
            variant="secondary"
            fullWidth
            onClick={reset}
          >
            🔄 {t('execution.reset')}
          </Button>
        )}
      </div>

      {/* 도움말 */}
      {!isConnected && (
        <div className="mt-4 p-3 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-lg">
          <p className="text-sm text-[var(--warning-text)]">
            ⚠️ {t('execution.help.notConnected')}
          </p>
        </div>
      )}

      {isConnected && !hasScenarioPlan && (
        <div className="mt-4 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg">
          <p className="text-sm text-[var(--info-text)]">
            💡 {t('execution.help.noCommands')}
          </p>
        </div>
      )}

      {isConnected && isTestMode && hasScenarioPlan && (
        <div className="mt-4 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg">
          <p className="text-sm text-[var(--info-text)]">
            🧪 {t('execution.help.testModeInfo')}
          </p>
        </div>
      )}

      {isConnected && isUnityMode && hasScenarioPlan && (
        <div className="mt-4 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg">
          <p className="text-sm text-[var(--info-text)]">
            🎮 Unity mode: commands will be sent to the embedded runtime.
          </p>
        </div>
      )}

      {/* 제어 흐름 도움말 */}
      {isConnected && hasScenarioPlan && !isRunning && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800 font-medium mb-1">
            ✨ {t('execution.help.controlFlowTitle')}
          </p>
          <ul className="text-xs text-purple-700 space-y-0.5 list-disc list-inside">
            <li>🔁 {t('execution.help.controlFlowLoop')}</li>
            <li>❓ {t('execution.help.controlFlowIf')}</li>
            <li>🔢 {t('execution.help.controlFlowFor')}</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const { t } = useTranslation()
  const config = {
    [ExecutionStatus.IDLE]: {
      text: t('execution.status.idle'),
      bg: 'bg-[var(--bg-tertiary)]',
      textColor: 'text-[var(--text-secondary)]'
    },
    [ExecutionStatus.RUNNING]: {
      text: t('execution.status.running'),
      bg: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    [ExecutionStatus.COMPLETED]: {
      text: t('execution.status.completed'),
      bg: 'bg-success/20',
      textColor: 'text-success-dark'
    },
    [ExecutionStatus.ERROR]: {
      text: t('execution.status.error'),
      bg: 'bg-danger/20',
      textColor: 'text-danger-dark'
    }
  }[status]

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.textColor}`}>
      {config.text}
    </span>
  )
}
