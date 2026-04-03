import { describe, expect, test } from 'vitest'
import * as Blockly from 'blockly'
import { ProjectTemplate } from '@/constants/project'
import { registerFlightBlocks } from '@/components/blockly/blocks/categories/flight'
import { registerMovementBlocks } from '@/components/blockly/blocks/categories/movement'
import { registerControlBlocks } from '@/components/blockly/blocks/categories/control'
import { registerSettingsBlocks } from '@/components/blockly/blocks/categories/settings'
import { getTemplateXml, validateXml } from '@/utils/blocklyXml'
import { parseBlocklyWorkspace } from '@/services/execution/blocklyParser'

registerFlightBlocks()
registerMovementBlocks()
registerControlBlocks()
registerSettingsBlocks()

describe('blocklyXml templates', () => {
  const executableTemplates = [
    ProjectTemplate.BASIC_FLIGHT,
    ProjectTemplate.REPEAT_EXAMPLE,
    ProjectTemplate.COORDINATE_EXAMPLE,
  ] as const

  test('returns valid XML for every supported template', () => {
    const templates = [
      ProjectTemplate.BLANK,
      ...executableTemplates,
    ]

    templates.forEach((template) => {
      const xml = getTemplateXml(template)

      expect(xml.length).toBeGreaterThan(0)
      expect(validateXml(xml)).toBe(true)
      expect(xml).not.toContain('swarm_')
      expect(xml).not.toContain('group_formation')
    })
  })

  test('loads each executable template into a workspace and parses a scenario', () => {
    executableTemplates.forEach((template) => {
      const workspace = new Blockly.Workspace()
      const xml = Blockly.utils.xml.textToDom(getTemplateXml(template))

      Blockly.Xml.domToWorkspace(xml, workspace)

      expect(workspace.getTopBlocks(false).length).toBeGreaterThan(0)
      expect(parseBlocklyWorkspace(workspace)).not.toBeNull()
    })
  })
})
