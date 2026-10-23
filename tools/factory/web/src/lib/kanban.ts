import type { Entity } from '../types'
import { groomEntity } from './grooming'

export type KanbanColumnKey = 'todo' | 'groomed' | 'in-progress' | 'verify' | 'done'

export const KANBAN_COLUMNS: Array<{ key: KanbanColumnKey; label: string }> = [
  { key: 'todo', label: 'todo' },
  { key: 'groomed', label: 'groomed' },
  { key: 'in-progress', label: 'in-progress' },
  { key: 'verify', label: 'verify' },
  { key: 'done', label: 'done' },
]

export type KanbanGroups = Record<KanbanColumnKey, Entity[]> & {
  blocked: Entity[]
}

export function groupKanban(entities: Entity[]): KanbanGroups {
  const groups: KanbanGroups = {
    todo: [],
    groomed: [],
    'in-progress': [],
    verify: [],
    done: [],
    blocked: [],
  }
  for (const entity of entities) {
    if (entity.status === 'blocked') {
      groups.blocked.push(entity)
      continue
    }
    if (entity.status === 'todo') {
      const groomed = groomEntity(entity).ready
      groups[groomed ? 'groomed' : 'todo'].push(entity)
      continue
    }
    groups[entity.status].push(entity)
  }
  return groups
}
