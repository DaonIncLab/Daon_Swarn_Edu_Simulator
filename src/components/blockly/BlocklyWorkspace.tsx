import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { toolboxConfig, getCategoryBlocks } from './toolbox'
import { generateCommands } from './generators/swarmGenerator'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useExecutionStore, ExecutionStatus } from '@/stores/useExecutionStore'
import './blocks/swarmBlocks' // 블록 정의 import

// Blockly CSS import
import 'blockly/blocks'

interface BlocklyWorkspaceProps {
  className?: string
  selectedCategory?: string
}

export function BlocklyWorkspace({ className, selectedCategory = 'basic' }: BlocklyWorkspaceProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  const { setWorkspace, setGeneratedCommands, setHasUnsavedChanges } = useBlocklyStore()
  const {
    setCommands,
    status,
    commands,
    executeScript,
    stopExecution
  } = useExecutionStore()

  const isRunning = status === ExecutionStatus.RUNNING
  const hasCommands = commands.length > 0

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

    // 워크스페이스 변경 이벤트 리스너
    const changeListener = () => {
      // 명령 생성
      const commands = generateCommands(workspace)
      setGeneratedCommands(commands)
      setCommands(commands)
      setHasUnsavedChanges(true)
    }

    workspace.addChangeListener(changeListener)

    // 초기 블록 추가 (예시)
    addInitialBlocks(workspace)

    // Cleanup
    return () => {
      workspace.removeChangeListener(changeListener)
      workspace.dispose()
      setWorkspace(null)
    }
  }, [setWorkspace, setGeneratedCommands, setCommands, setHasUnsavedChanges])

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
          {hasCommands && (
            <span className="px-2 py-1 bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)] text-xs font-medium rounded">
              {commands.length}개 명령
            </span>
          )}
        </div>

        {/* Execution Control Buttons */}
        <div className="flex items-center gap-2 ">
          {!isRunning ? (
            <button
              onClick={executeScript}
              disabled={!hasCommands}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-success hover:bg-success-dark text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
              title="실행"
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
  // 예시: 이륙 -> 대형 설정 -> 이동 -> 착륙
  const xml = Blockly.utils.xml.textToDom(`
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="swarm_takeoff_all" x="50" y="50">
        <field name="ALTITUDE">2</field>
        <next>
          <block type="swarm_set_formation">
            <field name="FORMATION_TYPE">grid</field>
            <field name="ROWS">2</field>
            <field name="COLS">5</field>
            <field name="SPACING">2</field>
            <next>
              <block type="swarm_move_formation">
                <field name="DIRECTION">forward</field>
                <field name="DISTANCE">3</field>
                <next>
                  <block type="swarm_land_all"></block>
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
