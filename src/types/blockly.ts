/**
 * Blockly 관련 타입 정의
 */

import type { Command } from './websocket'

// Blockly 블록 정의
export interface BlockDefinition {
  type: string
  message0: string
  args0?: Array<{
    type: string
    name: string
    options?: Array<[string, string]>
    min?: number
    max?: number
    value?: number
  }>
  previousStatement?: string | null
  nextStatement?: string | null
  colour?: number
  tooltip?: string
  helpUrl?: string
}

// Blockly 워크스페이스 저장 형식
export interface BlocklyWorkspace {
  blocks: {
    languageVersion: number
    blocks: Array<{
      type: string
      id: string
      [key: string]: unknown
    }>
  }
}

// 블록에서 생성된 코드
export interface GeneratedCode {
  commands: Command[]
  error?: string
}
