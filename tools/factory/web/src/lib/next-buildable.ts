import type { Entity } from '../types'
import { groomEntity } from './grooming'
import { isTaskEntity } from './strategy'

/** First groomed, unblocked task — Factory "what to build next". */
export function nextBuildable(entities: Entity[]): Entity | null {
  const tasks = entities
    .filter(isTaskEntity)
    .filter((e) => e.status !== 'blocked' && e.status !== 'done')
    .sort((a, b) => a.id.localeCompare(b.id))

  const inProgress = tasks.find((e) => e.status === 'in-progress')
  if (inProgress) return inProgress

  for (const entity of tasks) {
    if (entity.status === 'todo' && groomEntity(entity).ready) return entity
    if (entity.status === 'verify') return entity
  }
  return null
}
