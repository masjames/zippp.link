import { describe, expect, it } from 'vitest'
import { buildDebugReport, summarizeClientMessage, summarizeServerMessage } from './debug'
import { initialState } from '../state'
import type { Entity, Result } from '../types'

function entity(id: string): Entity {
  return {
    id,
    type: 'feature',
    title: id,
    status: 'verify',
    assignee: 'adit',
    relations: { blocks: [], implements: [], depends_on: [] },
    verification: { target_files: ['src/a.ts'], test_command: 'node ok.js', prod_endpoint: '' },
    path: `features/${id}.md`,
    body: 'Body',
    hash: 'abc',
  }
}

function result(id: string): Result {
  return {
    id,
    started_at: '2026-10-23T00:00:00Z',
    finished_at: '2026-10-23T00:00:01Z',
    passed: false,
    wrote_status: false,
    message: 'verification failed',
    checks: [
      { name: 'static', status: 'fail', detail: 'missing marker', output: '', duration_ms: 1 },
    ],
  }
}

describe('debug summaries', () => {
  it('summarizes a snapshot', () => {
    const event = summarizeServerMessage({
      type: 'snapshot',
      seq: 1,
      entities: [entity('FEAT-1')],
      errors: [],
      verifications: {},
    })
    expect(event.type).toBe('snapshot')
    expect(event.seq).toBe(1)
    expect(event.summary).toContain('entities=1')
  })

  it('summarizes a diff', () => {
    const event = summarizeServerMessage({
      type: 'diff',
      seq: 2,
      upserts: [entity('FEAT-1')],
      removed: ['FEAT-2'],
      errors: [],
    })
    expect(event.summary).toContain('FEAT-1:verify')
    expect(event.summary).toContain('removed=FEAT-2')
  })

  it('summarizes a verification', () => {
    const event = summarizeServerMessage({ type: 'verification', seq: 3, result: result('FEAT-1') })
    expect(event.summary).toContain('passed=false')
    expect(event.summary).toContain('static:fail')
  })

  it('summarizes a client message', () => {
    const event = summarizeClientMessage({ type: 'verify', id: 'FEAT-1' })
    expect(event.direction).toBe('out')
    expect(event.id).toBe('FEAT-1')
  })
})

describe('buildDebugReport', () => {
  it('includes connection, selected entity, and events', () => {
    const selected = entity('FEAT-1')
    const report = JSON.parse(
      buildDebugReport({
        state: {
          ...initialState,
          connected: true,
          seq: 7,
          entities: { 'FEAT-1': selected },
          verifications: { 'FEAT-1': result('FEAT-1') },
        },
        selected,
        selectedResult: result('FEAT-1'),
        selectedRunning: false,
        notice: 'boom',
        debug: {
          wsUrl: 'ws://127.0.0.1:8080/ws',
          events: [{ at: '2026-10-23T00:00:00Z', direction: 'in', type: 'error', message: 'boom' }],
        },
      }),
    )
    expect(report.connection.connected).toBe(true)
    expect(report.connection.seq).toBe(7)
    expect(report.selected.id).toBe('FEAT-1')
    expect(report.selectedResult.message).toBe('verification failed')
    expect(report.events[0].message).toBe('boom')
    expect(report.notice).toBe('boom')
  })
})
