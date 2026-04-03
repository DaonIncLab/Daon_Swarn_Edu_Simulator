/**
 * Blockly XML 유틸리티
 * 워크스페이스 ↔ XML 변환 및 검증
 */

import * as Blockly from 'blockly'
import { ProjectTemplate } from '@/constants/project'
import { log } from '@/utils/logger'

/**
 * 워크스페이스를 XML 문자열로 변환
 */
export function workspaceToXml(workspace: Blockly.WorkspaceSvg): string {
  const xml = Blockly.Xml.workspaceToDom(workspace)
  const xmlText = Blockly.Xml.domToText(xml)
  return xmlText
}

/**
 * XML 문자열을 워크스페이스에 로드
 */
export function xmlToWorkspace(xmlText: string, workspace: Blockly.WorkspaceSvg): void {
  try {
    // 워크스페이스 초기화
    workspace.clear()

    // XML 파싱
    const xml = Blockly.utils.xml.textToDom(xmlText)

    // 워크스페이스에 로드
    Blockly.Xml.domToWorkspace(xml, workspace)

    log.info("Workspace loaded from XML", { context: "BlocklyXML" })
  } catch (error) {
    log.error("Failed to load XML", { context: "BlocklyXML", error })
    throw new Error('Failed to load workspace from XML')
  }
}

/**
 * XML 유효성 검사
 */
export function validateXml(xmlText: string): boolean {
  try {
    const xml = Blockly.utils.xml.textToDom(xmlText)

    // 기본 검증: xml 태그가 존재하는지 확인
    if (xml.nodeName !== 'xml') {
      log.warn("Invalid root node", { context: "BlocklyXML", nodeName: xml.nodeName })
      return false
    }

    return true
  } catch (error) {
    log.error("XML validation failed", { context: "BlocklyXML", error })
    return false
  }
}

/**
 * 빈 워크스페이스 XML 생성
 */
export function createEmptyWorkspaceXml(): string {
  return '<xml xmlns="https://developers.google.com/blockly/xml"></xml>'
}

/**
 * 워크스페이스 스크린샷 생성 (SVG → Canvas → Base64)
 * 썸네일 이미지로 사용
 */
export function generateThumbnail(
  workspace: Blockly.WorkspaceSvg,
  width: number = 200,
  height: number = 150
): string | undefined {
  try {
    // SVG 추출
    const svgElement = workspace.getCanvas()
    if (!svgElement) {
      log.warn("Cannot get workspace canvas", { context: "BlocklyXML" })
      return undefined
    }

    // SVG의 bounding box 가져오기
    const bbox = svgElement.getBBox()
    if (bbox.width === 0 || bbox.height === 0) {
      log.warn("Workspace is empty, no thumbnail", { context: "BlocklyXML" })
      return undefined
    }

    // SVG를 복제하여 수정
    const clonedSvg = svgElement.cloneNode(true) as SVGElement
    clonedSvg.setAttribute('width', bbox.width.toString())
    clonedSvg.setAttribute('height', bbox.height.toString())
    clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)

    // SVG를 데이터 URL로 변환
    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    // Canvas에 그리기
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      log.warn("Cannot get canvas context", { context: "BlocklyXML" })
      return undefined
    }

    const img = new Image()

    // 동기 처리를 위해 Promise로 감싸야 하지만, 간단히 하기 위해
    // 이 함수는 실제로 비동기로 작동해야 합니다.
    // 여기서는 SVG를 base64로 바로 변환하는 방법 사용

    // SVG를 Base64로 인코딩
    const base64Svg = btoa(unescape(encodeURIComponent(svgData)))
    const thumbnail = `data:image/svg+xml;base64,${base64Svg}`

    log.debug("Thumbnail generated", { context: "BlocklyXML" })

    return thumbnail
  } catch (error) {
    log.error("Failed to generate thumbnail", { context: "BlocklyXML", error })
    return undefined
  }
}

/**
 * 워크스페이스에서 블록 개수 세기
 */
export function countBlocks(workspace: Blockly.WorkspaceSvg): number {
  const topBlocks = workspace.getTopBlocks(false)
  let count = 0

  topBlocks.forEach(block => {
    count += countBlocksRecursive(block)
  })

  return count
}

/**
 * 재귀적으로 블록 개수 세기
 */
function countBlocksRecursive(block: Blockly.Block): number {
  let count = 1 // 현재 블록

  // 다음 블록 (next connection)
  const nextBlock = block.getNextBlock()
  if (nextBlock) {
    count += countBlocksRecursive(nextBlock)
  }

  // 자식 블록 (statement inputs)
  block.inputList.forEach(input => {
    if (input.type === Blockly.inputTypes.STATEMENT) {
      const targetBlock = input.connection?.targetBlock()
      if (targetBlock) {
        count += countBlocksRecursive(targetBlock)
      }
    }
  })

  return count
}

/**
 * 템플릿 XML 가져오기
 */
export function getTemplateXml(template: string): string {
  switch (template) {
    case ProjectTemplate.BASIC_FLIGHT:
      return `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="drone_takeoff_all" x="50" y="50">
    <field name="ALTITUDE">2</field>
    <next>
      <block type="drone_move_direction_all">
        <field name="DIRECTION">forward</field>
        <field name="DISTANCE">5</field>
        <next>
          <block type="drone_land_all"></block>
        </next>
      </block>
    </next>
  </block>
</xml>`

    case ProjectTemplate.REPEAT_EXAMPLE:
      return `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="drone_set_speed" x="50" y="50">
    <field name="SPEED">2.5</field>
    <next>
      <block type="drone_takeoff_all">
        <field name="ALTITUDE">2</field>
        <next>
          <block type="control_repeat">
            <field name="TIMES">3</field>
            <statement name="DO">
              <block type="drone_move_direction_all">
                <field name="DIRECTION">forward</field>
                <field name="DISTANCE">2</field>
                <next>
                  <block type="control_wait">
                    <field name="DURATION">1</field>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="drone_land_all"></block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`

    case ProjectTemplate.COORDINATE_EXAMPLE:
      return `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="drone_takeoff_all" x="50" y="50">
    <field name="ALTITUDE">2</field>
    <next>
      <block type="drone_move_xyz">
        <field name="DRONE_ID">1</field>
        <field name="X">2</field>
        <field name="Y">0</field>
        <field name="Z">1</field>
        <next>
          <block type="drone_move_xyz">
            <field name="DRONE_ID">2</field>
            <field name="X">-2</field>
            <field name="Y">0</field>
            <field name="Z">1</field>
            <next>
              <block type="control_wait">
                <field name="DURATION">1</field>
                <next>
                  <block type="drone_land_all"></block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`

    case ProjectTemplate.BLANK:
    default:
      return createEmptyWorkspaceXml()
  }
}
