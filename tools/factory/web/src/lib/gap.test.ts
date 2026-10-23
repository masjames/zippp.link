import { describe, expect, it } from 'vitest'
import { entityGap, summarizeGaps } from './gap'
import type { Entity, Result } from '../types'

function entity(status: Entity['status'], id = 'FEAT-1'): Entity {
  return {
    id,
    type: 'feature',
    title: 'One',
    status,
    assignee: 'adit',
    relations: { blocks: [], implements: [], depends_on: [] },
    verification: { target_files: [], test_command: '', prod_endpoint: '' },
    path: 'features/FEAT-1.md',
    body: '',
    hash: 'abc',
  }
}

function result(passed: boolean, id = 'FEAT-1'): Result {
  return {
    id,
    started_at: '2026-10-23T00:00:00Z',
    finished_at: '2026-10-23T00:00:01Z',
    passed,
    wrote_status: false,
    message: '',
    checks: passed
      ? [{ name: 'static', status: 'pass', detail: 'ok', output: '', duration_ms: 1 }]
      : [{ name: 'static', status: 'fail', detail: 'missing marker', output: '', duration_ms: 1 }],
  }
}

describe('entityGap', () => {
  it('reports done without evidence', () => {
    expect(entityGap(entity('done'), undefined, false).label).toBe('Done without evidence')
  })

  it('reports waiting for verification', () => {
    expect(entityGap(entity('verify'), undefined, false).label).toBe('Waiting for verification')
  })

  it('reports no gap when passed and done', () => {
    expect(entityGap(entity('done'), result(true), false).severity).toBe('none')
  })

  it('reports passed but not done', () => {
    expect(entityGap(entity('verify'), result(true), false).label).toBe('Passed, not done')
  })

  it('reports the first failed check', () => {
    const gap = entityGap(entity('verify'), result(false), false)
    expect(gap.severity).toBe('fail')
    expect(gap.detail).toContain('missing marker')
  })

  it('reports running', () => {
    expect(entityGap(entity('verify'), undefined, true).label).toBe('Running')
  })

  it('treats a diagram as a reference', () => {
    const diagram = { ...entity('done'), type: 'diagram' as const }
    expect(entityGap(diagram, undefined, false).label).toBe('Reference')
  })
})

describe('summarizeGaps', () => {
  it('does not count reference diagrams as unverified', () => {
    const summary = summarizeGaps(
      [{ ...entity('done'), type: 'diagram' as const }],
      {},
      {},
    )
    expect(summary.total).toBe(1)
    expect(summary.unverified).toBe(0)
    expect(summary.gaps).toBe(0)
  })

  it('counts the gap state', () => {
    const summary = summarizeGaps(
      [entity('done', 'FEAT-1'), entity('verify', 'FEAT-2')],
      { 'FEAT-1': result(true, 'FEAT-1') },
      {},
    )
    expect(summary.total).toBe(2)
    expect(summary.done).toBe(1)
    expect(summary.passed).toBe(1)
    expect(summary.unverified).toBe(1)
  })
})
