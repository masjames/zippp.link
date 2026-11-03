import type { Entity, EntityType } from '../types'

/** Work you build and verify. */
export const TASK_TYPES: EntityType[] = ['feature', 'bug', 'story']

/** Where we are going — not Kanban work. */
export const STRATEGY_TYPES: EntityType[] = ['direction', 'decision', 'roadmap']

export function isTaskEntity(entity: Entity): boolean {
  return TASK_TYPES.includes(entity.type)
}

export function isStrategyEntity(entity: Entity): boolean {
  return STRATEGY_TYPES.includes(entity.type)
}

export function sortStrategy(entities: Entity[]): {
  direction: Entity[]
  decisions: Entity[]
  roadmap: Entity[]
} {
  const direction = entities.filter((e) => e.type === 'direction').sort(byId)
  const decisions = entities.filter((e) => e.type === 'decision').sort(byId)
  const roadmap = entities.filter((e) => e.type === 'roadmap').sort(byId)
  return { direction, decisions, roadmap }
}

function byId(a: Entity, b: Entity): number {
  return a.id.localeCompare(b.id)
}
