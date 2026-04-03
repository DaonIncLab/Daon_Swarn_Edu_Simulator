import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly'
import { toolboxConfig, getCategoryBlocks, type BlocklyCategoryId } from './toolbox'
import { parseBlocklyWorkspace } from '@/services/execution'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useExecutionStore, ExecutionStatus } from '@/stores/useExecutionStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { xmlToWorkspace } from '@/utils/blocklyXml'
import './blocks/swarmBlocks' // 블록 정의 import

// Blockly CSS import
import 'blockly/blocks'

interface BlocklyWorkspaceProps {
  className?: string
  selectedCategory?: BlocklyCategoryId
}

function syncScenarioPlan(
  workspace: Blockly.WorkspaceSvg,
  setBlocklyScenarioPlan: (plan: ReturnType<typeof parseBlocklyWorkspace>) => void,
  setExecutionScenarioPlan: (plan: ReturnType<typeof parseBlocklyWorkspace>) => void,
) {
  const plan = parseBlocklyWorkspace(workspace)
  setBlocklyScenarioPlan(plan)
  setExecutionScenarioPlan(plan)
}

export function BlocklyWorkspace({ className, selectedCategory = 'flight' }: BlocklyWorkspaceProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const loadedProjectKeyRef = useRef<string | null>(null)
  const isProgrammaticUpdateRef = useRef(false)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const { currentProject } = useProjectStore()

  const { setWorkspace, setScenarioPlan: setBlocklyScenarioPlan, setHasUnsavedChanges } = useBlocklyStore()
  const {
    setScenarioPlan: setExecutionScenarioPlan,
    status,
    scenarioSummary,
    executeScript,
    stopExecution
  } = useExecutionStore()

  const isRunning = status === ExecutionStatus.RUNNING
  const hasScenarioPlan = scenarioSummary.commandNodes > 0

  // Blockly 워크스페이스 초기화
  useEffect(() => {
    if (!blocklyDiv.current) return

    // Blockly 워크스페이스 초기화 (flyout 모드)
    const workspace = Blockly.inject(blocklyDiv.current, {
      toolbox: toolboxConfig,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      sounds: true,
      scrollbars: true,
      renderer: 'zelos', // 현대적인 렌더러
    })

    workspaceRef.current = workspace
    setWorkspace(workspace)
    setWorkspaceReady(true)

    // 워크스페이스 변경 이벤트 리스너
    const changeListener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.UI || isProgrammaticUpdateRef.current) {
        return
      }

      syncScenarioPlan(workspace, setBlocklyScenarioPlan, setExecutionScenarioPlan)
      setHasUnsavedChanges(true)
    }

    workspace.addChangeListener(changeListener)

    isProgrammaticUpdateRef.current = true
    try {
      if (!useProjectStore.getState().currentProject) {
        addInitialBlocks(workspace)
      }

      syncScenarioPlan(workspace, setBlocklyScenarioPlan, setExecutionScenarioPlan)
      setHasUnsavedChanges(false)
    } finally {
      isProgrammaticUpdateRef.current = false
    }

    // Cleanup
    return () => {
      workspace.removeChangeListener(changeListener)
      workspace.dispose()
      workspaceRef.current = null
      setWorkspace(null)
      setWorkspaceReady(false)
      loadedProjectKeyRef.current = null
      isProgrammaticUpdateRef.current = false
    }
  }, [setWorkspace, setBlocklyScenarioPlan, setExecutionScenarioPlan, setHasUnsavedChanges])

  useEffect(() => {
    const workspace = workspaceRef.current
    const projectId = currentProject?.id ?? null
    const projectWorkspaceXml = currentProject?.workspaceXml ?? null

    if (!workspace || !projectId || !projectWorkspaceXml) {
      return
    }

    const loadKey = `${projectId}:${projectWorkspaceXml}`
    if (loadedProjectKeyRef.current === loadKey) {
      return
    }

    isProgrammaticUpdateRef.current = true
    try {
      xmlToWorkspace(projectWorkspaceXml, workspace)
      syncScenarioPlan(workspace, setBlocklyScenarioPlan, setExecutionScenarioPlan)
      setHasUnsavedChanges(false)
      loadedProjectKeyRef.current = loadKey
    } finally {
      isProgrammaticUpdateRef.current = false
    }
  }, [
    currentProject?.id,
    currentProject?.workspaceXml,
    setBlocklyScenarioPlan,
    setExecutionScenarioPlan,
    setHasUnsavedChanges,
  ])

  // 선택된 카테고리에 따라 flyout 업데이트
  useEffect(() => {
    if (!workspaceRef.current) return

    const blocks = getCategoryBlocks(selectedCategory)
    const flyoutXml = {
      kind: 'flyoutToolbox',
      contents: blocks
    }

    workspaceRef.current.updateToolbox(flyoutXml)
  }, [selectedCategory])

  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Toolbar with Execution Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">블록 코딩</h3>
          {hasScenarioPlan && (
            <span className="px-2 py-1 bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-xs font-medium rounded">
              {scenarioSummary.commandNodes}개 실행 명령
            </span>
          )}
        </div>

        {/* Execution Control Buttons */}
        <div className="flex items-center gap-2 ">
          {!isRunning ? (
            <button
              onClick={executeScript}
              disabled={!workspaceReady || !hasScenarioPlan}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-success hover:bg-success-dark text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
              title={workspaceReady ? "실행" : "워크스페이스 초기화 중"}
            >
              <svg className="w-5 h-5" color='grey' fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={stopExecution}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-danger hover:bg-danger-dark text-white transition-all focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2"
              title="중지"
            >
              <svg className="w-5 h-5" color='grey' fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Blockly Workspace - Full Height */}
      <div
        ref={blocklyDiv}
        className="flex-1"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

/**
 * 초기 예시 블록 추가
 */
function addInitialBlocks(workspace: Blockly.WorkspaceSvg) {
  // 예시: 모든 드론 이륙 -> 이동 -> 대기 -> 착륙
  const xml = Blockly.utils.xml.textToDom(`
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="drone_takeoff_all" x="50" y="50">
        <field name="ALTITUDE">2</field>
        <next>
          <block type="drone_move_direction_all">
            <field name="DIRECTION">forward</field>
            <field name="DISTANCE">3</field>
            <next>
              <block type="control_wait">
                <field name="DURATION">2</field>
                <next>
                  <block type="drone_land_all"></block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </xml>
  `)

  Blockly.Xml.domToWorkspace(xml, workspace)
}
