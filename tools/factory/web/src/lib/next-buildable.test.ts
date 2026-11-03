import { describe, expect, it } from 'vitest'
import type { Entity } from '../types'
import { nextBuildable } from './next-buildable'

function entity(partial: Partial<Entity> & Pick<Entity, 'id' | 'type' | 'status'>): Entity {
  return {
    title: partial.title ?? partial.id,
    assignee: '',
    path: `${partial.id}.md`,
    body: partial.body ?? '',
    hash: 'x',
    relations: { blocks: [], implements: [], depends_on: [] },
    verification: { target_files: [], test_command: '', prod_endpoint: '' },
    ...partial,
  }
}

describe('nextBuildable', () => {
  it('prefers in-progress over other tasks', () => {
    const next = nextBuildable([
      entity({ id: 'FEAT-1', type: 'feature', status: 'todo' }),
      entity({ id: 'FEAT-2', type: 'feature', status: 'in-progress' }),
    ])
    expect(next?.id).toBe('FEAT-2')
  })

  it('skips blocked and done', () => {
    const next = nextBuildable([
      entity({ id: 'FEAT-1', type: 'feature', status: 'blocked' }),
      entity({ id: 'FEAT-2', type: 'feature', status: 'done' }),
      entity({ id: 'DIR-1', type: 'direction', status: 'todo' }),
    ])
    expect(next).toBeNull()
  })

  it('returns verify when no in-progress', () => {
    const next = nextBuildable([
      entity({ id: 'FEAT-1', type: 'feature', status: 'todo' }),
      entity({ id: 'FEAT-3', type: 'feature', status: 'verify' }),
    ])
    expect(next?.id).toBe('FEAT-3')
  })
})