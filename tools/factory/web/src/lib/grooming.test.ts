import { describe, expect, it } from 'vitest'
import { groomEntity } from './grooming'
import type { Entity } from '../types'

function entity(body: string, type: Entity['type'] = 'feature', targets: string[] = []): Entity {
  return {
    id: 'FEAT-1',
    type,
    title: 'One',
    status: 'todo',
    assignee: 'adit',
    relations: { blocks: [], implements: [], depends_on: [] },
    verification: {
      target_files: targets,
      test_command: targets.length > 0 ? 'npm test' : '',
      prod_endpoint: '',
    },
    path: 'features/FEAT-1.md',
    body,
    hash: 'abc',
  }
}

const complete = `# What it is
A thing.

# Goal
Ship it.

# Context
See the spec.

# Acceptance criteria
- [ ] first

# Verification
- Static trace ID: \`// @implements FEAT-1\`
- Test: \`npm test\`

# Definition of done
All checks pass.

# Out of scope
Nothing else.
`

describe('groomEntity', () => {
  it('marks a complete spec ready', () => {
    const result = groomEntity(entity(complete, 'feature', ['src/a.ts']))
    expect(result.ready).toBe(true)
    expect(result.score).toBe(100)
    expect(result.overallScore).toBeLessThan(100)
    expect(result.recommendedOk).toBe(1)
    expect(result.recommendedTotal).toBe(2)
  })

  it('requires a goal', () => {
    const result = groomEntity(entity(complete.replace('# Goal\nShip it.\n', ''), 'feature', ['src/a.ts']))
    expect(result.ready).toBe(false)
    expect(result.items.find((item) => item.key === 'goal')?.ok).toBe(false)
  })

  it('accepts a manual verification plan without targets', () => {
    const body = complete.replace('- Test: `npm test`', '- Manual: run the device test.')
    const result = groomEntity(entity(body, 'story'))
    expect(result.items.find((item) => item.key === 'verification')?.ok).toBe(true)
  })

  it('requires a diagram for a diagram entity', () => {
    const result = groomEntity(entity('# What it is\nA map.\n\n# Goal\nShow it.\n', 'diagram'))
    expect(result.ready).toBe(false)
    expect(result.items.find((item) => item.key === 'diagram')?.ok).toBe(false)
  })

  it('accepts a diagram entity with a block', () => {
    const body = '# What it is\nA map.\n\n# Goal\nShow it.\n\n```eraser\na {\n  id string\n}\n```\n'
    const result = groomEntity(entity(body, 'diagram'))
    expect(result.ready).toBe(true)
  })

  it('accepts a mermaid diagram entity', () => {
    const body =
      '# What it is\nA map.\n\n# Goal\nShow it.\n\n```mermaid\nflowchart LR\n  A --> B\n```\n'
    const result = groomEntity(entity(body, 'diagram'))
    expect(result.ready).toBe(true)
  })

  it('grooms a locked decision card without code targets', () => {
    const body = `# Locked call
Pay on web.

# Why
Play posture.

# Locked
- [x] Web checkout only

# Non-goals
- IAP

# Done when
Copy matches.
`
    const result = groomEntity(entity(body, 'decision'))
    expect(result.ready).toBe(true)
  })
})
