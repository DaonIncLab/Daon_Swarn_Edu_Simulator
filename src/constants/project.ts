/**
 * Project-related constants
 */

/**
 * Project templates
 */
export const ProjectTemplate = {
  /** Empty project */
  BLANK: 'blank',
  /** Basic example (takeoff → move → land) */
  BASIC_FLIGHT: 'basic_flight',
  /** Loop example */
  REPEAT_EXAMPLE: 'repeat_example',
  /** Conditional example */
  CONDITIONAL_EXAMPLE: 'conditional_example',
  /** Formation flight example */
  FORMATION_EXAMPLE: 'formation_example',
} as const

export type ProjectTemplate = typeof ProjectTemplate[keyof typeof ProjectTemplate]

/**
 * Storage types
 */
export const StorageType = {
  INDEXED_DB: 'indexedDB',
  LOCAL_STORAGE: 'localStorage',
} as const

export type StorageType = typeof StorageType[keyof typeof StorageType]
