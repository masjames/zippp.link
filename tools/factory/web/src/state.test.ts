import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './state'
import type { Entity, EntityStatus, Result } from './types'

function entity(id: string, status: EntityStatus = 'todo', title = id): Entity {
  return {
    id,
    type: 'feature',
    title,
    status,
    assignee: 'adit',
    relations: { blocks: [], implements: [], depends_on: [] },
    verification: { target_files: [], test_command: '', prod_endpoint: '' },
    path: `features/${id}.md`,
    body: '',
    hash: 'abc',
  }
}

function result(id: string, passed = true): Result {
  return {
    id,
    started_at: '2026-10-23T00:00:00Z',
    finished_at: '2026-10-23T00:00:01Z',
    passed,
    wrote_status: passed,
    message: '',
    checks: [],
  }
}

describe('state reducer', () => {
  it('applies a snapshot', () => {
    const state = reducer(initialState, {
      type: 'server',
      message: { type: 'snapshot', seq: 1, entities: [entity('FEAT-1')], errors: [], verifications: {} },
    })
    expect(state.seq).toBe(1)
    expect(state.entities['FEAT-1'].title).toBe('FEAT-1')
    expect(state.needResync).toBe(false)
  })

  it('applies upserts and removals', () => {
    const started = reducer(initialState, {
      type: 'server',
      message: { type: 'snapshot', seq: 1, entities: [entity('FEAT-1')], errors: [], verifications: {} },
    })
    const state = reducer(started, {
      type: 'server',
      message: {
        type: 'diff',
        seq: 2,
        upserts: [entity('FEAT-2')],
        removed: ['FEAT-1'],
        errors: [],
      },
    })
    expect(state.entities['FEAT-1']).toBeUndefined()
    expect(state.entities['FEAT-2'].title).toBe('FEAT-2')
    expect(state.seq).toBe(2)
  })

  it('ignores stale messages', () => {
    const started = reducer(initialState, {
      type: 'server',
      message: { type: 'snapshot', seq: 5, entities: [entity('FEAT-1')], errors: [], verifications: {} },
    })
    const state = reducer(started, {
      type: 'server',
      message: { type: 'diff', seq: 4, upserts: [entity('FEAT-2')], removed: [], errors: [] },
    })
    expect(state).toBe(started)
  })

  it('sets needResync on a sequence gap', () => {
    const started = reducer(initialState, {
      type: 'server',
      message: { type: 'snapshot', seq: 1, entities: [entity('FEAT-1')], errors: [], verifications: {} },
    })
    const state = reducer(started, {
      type: 'server',
      message: { type: 'diff', seq: 4, upserts: [entity('FEAT-2')], removed: [], errors: [] },
    })
    expect(state.needResync).toBe(true)
    expect(state.entities['FEAT-2']).toBeUndefined()
  })

  it('clears needResync on a snapshot', () => {
    const gapped = reducer(
      reducer(initialState, {
        type: 'server',
        message: { type: 'snapshot', seq: 1, entities: [], errors: [], verifications: {} },
      }),
      { type: 'server', message: { type: 'diff', seq: 3, upserts: [], removed: [], errors: [] } },
    )
    expect(gapped.needResync).toBe(true)
    const state = reducer(gapped, {
      type: 'server',
      message: { type: 'snapshot', seq: 3, entities: [entity('FEAT-1')], errors: [], verifications: {} },
    })
    expect(state.needResync).toBe(false)
  })

  it('tracks verification start and result', () => {
    const started = reducer(
      reducer(initialState, {
        type: 'server',
        message: { type: 'snapshot', seq: 1, entities: [entity('FEAT-1', 'verify')], errors: [], verifications: {} },
      }),
      { type: 'server', message: { type: 'verification_started', seq: 2, id: 'FEAT-1' } },
    )
    expect(started.running['FEAT-1']).toBe(true)
    const state = reducer(started, {
      type: 'server',
      message: { type: 'verification', seq: 3, result: result('FEAT-1') },
    })
    expect(state.running['FEAT-1']).toBeUndefined()
    expect(state.verifications['FEAT-1'].passed).toBe(true)
  })

  it('ignores error messages without a sequence', () => {
    const state = reducer(initialState, { type: 'server', message: { type: 'error', message: 'boom' } })
    expect(state).toBe(initialState)
  })

  it('updates connection state', () => {
    expect(reducer(initialState, { type: 'connection', connected: true }).connected).toBe(true)
  })
})
