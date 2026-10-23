import { describe, expect, it } from 'vitest'
import { groupKanban } from './kanban'
import type { Entity, EntityStatus } from '../types'

const complete = `# What it is
A task.

# Goal
Ship it.

# Context
See the spec.

# Acceptance criteria
- [ ] first

# Verification
- Manual: run the task.

# Definition of done
Done.
`

function entity(id: string, status: EntityStatus, body = complete): Entity {
  return {
    id,
    type: 'feature',
    title: id,
    status,
    assignee: 'adit',
    relations: { blocks: [], implements: [], depends_on: [] },
    verification: { target_files: [], test_command: '', prod_endpoint: '' },
    path: `features/${id}.md`,
    body,
    hash: 'abc',
  }
}

describe('groupKanban', () => {
  it('moves groomed todo cards into the groomed column', () => {
    const groups = groupKanban([entity('READY-1', 'todo')])
    expect(groups.groomed.map((item) => item.id)).toEqual(['READY-1'])
    expect(groups.todo).toEqual([])
  })

  it('keeps ungroomed todo cards in todo', () => {
    const groups = groupKanban([entity('RAW-1', 'todo', '')])
    expect(groups.todo.map((item) => item.id)).toEqual(['RAW-1'])
    expect(groups.groomed).toEqual([])
  })

  it('keeps blocked cards in their own section', () => {
    const groups = groupKanban([entity('BLOCKED-1', 'blocked')])
    expect(groups.blocked.map((item) => item.id)).toEqual(['BLOCKED-1'])
    expect(groups.groomed).toEqual([])
  })

  it('keeps the remaining flow columns', () => {
    const groups = groupKanban([
      entity('RUN-1', 'in-progress'),
      entity('VERIFY-1', 'verify'),
      entity('DONE-1', 'done'),
    ])
    expect(groups['in-progress'].map((item) => item.id)).toEqual(['RUN-1'])
    expect(groups.verify.map((item) => item.id)).toEqual(['VERIFY-1'])
    expect(groups.done.map((item) => item.id)).toEqual(['DONE-1'])
  })
})
