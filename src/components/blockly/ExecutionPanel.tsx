import { Button } from '@/components/common/Button'
import { useExecutionStore, ExecutionStatus } from '@/stores/useExecutionStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionStatus, ConnectionMode } from '@/constants/connection'

export function ExecutionPanel() {
  const {
    status,
    commands,
    currentCommandIndex,
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
  const hasCommands = commands.length > 0
  const isTestMode = mode === ConnectionMode.TEST

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">실행 제어</h3>
        {isTestMode && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            🧪 테스트 모드
          </span>
        )}
      </div>

      {/* 상태 표시 */}
      <div className="mb-4 p-4 rounded-lg bg-[var(--bg-tertiary)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">실행 상태:</span>
          <StatusBadge status={status} />
        </div>

        {hasCommands && (
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>명령 수:</span>
            <span className="font-mono font-semibold">{commands.length}개</span>
          </div>
        )}

        {/* 현재 실행 노드 정보 */}
        {isRunning && currentNodeId && (
          <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
            <div className="text-xs text-[var(--text-secondary)]">
              <div>현재 노드: <span className="font-mono text-primary-600">{currentNodeId}</span></div>
              {currentNodePath.length > 0 && (
                <div className="mt-1">
                  실행 경로: <span className="font-mono text-[var(--text-tertiary)]">{currentNodePath.join(' → ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {isRunning && currentCommandIndex >= 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] mb-1">
              <span>진행률:</span>
              <span className="font-mono">
                {currentCommandIndex + 1} / {commands.length}
              </span>
            </div>
            <div className="w-full bg-[var(--progress-bg)] rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((currentCommandIndex + 1) / commands.length) * 100}%`
                }}
              />
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
            disabled={!isConnected || !hasCommands}
          >
            ▶ 스크립트 실행
          </Button>
        ) : (
          <Button
            variant="danger"
            fullWidth
            onClick={stopExecution}
          >
            ⏹ 실행 중지
          </Button>
        )}

        {status === ExecutionStatus.COMPLETED && (
          <Button
            variant="secondary"
            fullWidth
            onClick={reset}
          >
            🔄 초기화
          </Button>
        )}
      </div>

      {/* 도움말 */}
      {!isConnected && (
        <div className="mt-4 p-3 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-lg">
          <p className="text-sm text-[var(--warning-text)]">
            ⚠️ 먼저 연결해주세요
          </p>
        </div>
      )}

      {isConnected && !hasCommands && (
        <div className="mt-4 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg">
          <p className="text-sm text-[var(--info-text)]">
            💡 왼쪽에서 블록을 드래그하여 명령을 만들어보세요
          </p>
        </div>
      )}

      {isConnected && isTestMode && hasCommands && (
        <div className="mt-4 p-3 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg">
          <p className="text-sm text-[var(--info-text)]">
            🧪 테스트 모드: 실행 버튼을 클릭하면 명령이 시뮬레이션됩니다 (Unity 서버로 전송되지 않음)
          </p>
        </div>
      )}

      {/* 제어 흐름 도움말 */}
      {isConnected && hasCommands && !isRunning && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800 font-medium mb-1">
            ✨ 제어 흐름 블록 사용 가능
          </p>
          <ul className="text-xs text-purple-700 space-y-0.5 list-disc list-inside">
            <li>🔁 반복 블록으로 명령 반복 실행</li>
            <li>❓ If 조건문으로 조건부 실행</li>
            <li>🔢 For 루프로 변수 기반 반복</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const config = {
    [ExecutionStatus.IDLE]: {
      text: '대기 중',
      bg: 'bg-[var(--bg-tertiary)]',
      textColor: 'text-[var(--text-secondary)]'
    },
    [ExecutionStatus.RUNNING]: {
      text: '실행 중',
      bg: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    [ExecutionStatus.COMPLETED]: {
      text: '완료',
      bg: 'bg-success/20',
      textColor: 'text-success-dark'
    },
    [ExecutionStatus.ERROR]: {
      text: '에러',
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
