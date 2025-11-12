import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { toolboxConfig } from './toolbox'
import { generateCommands } from './generators/swarmGenerator'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import './blocks/swarmBlocks' // 블록 정의 import

// Blockly CSS import
import 'blockly/blocks'

interface BlocklyWorkspaceProps {
  className?: string
}

export function BlocklyWorkspace({ className }: BlocklyWorkspaceProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  const { setWorkspace, setGeneratedCommands, setHasUnsavedChanges } = useBlocklyStore()
  const { setCommands } = useExecutionStore()

  useEffect(() => {
    if (!blocklyDiv.current) return

    // Blockly 워크스페이스 초기화
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

  return (
    <div
      ref={blocklyDiv}
      className={className}
      style={{
        width: '100%',
        height: '500px',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}
    />
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
