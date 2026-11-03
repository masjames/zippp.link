import type { FactoryState } from '../state'
import type { ClientMsg, Entity, Result, ServerMsg } from '../types'

export type DebugEvent = {
  at: string
  direction: 'in' | 'out' | 'system'
  type: string
  seq?: number
  id?: string
  message?: string
  summary?: string
}

export type DebugInfo = {
  wsUrl: string
  events: DebugEvent[]
}

export function summarizeServerMessage(message: ServerMsg): DebugEvent {
  const base = {
    at: new Date().toISOString(),
    direction: 'in' as const,
    type: message.type,
  }
  switch (message.type) {
    case 'snapshot':
      return {
        ...base,
        seq: message.seq,
        summary: `entities=${message.entities.length} errors=${message.errors.length} verifications=${
          Object.keys(message.verifications).length
        }`,
      }
    case 'diff':
      return {
        ...base,
        seq: message.seq,
        summary: `upserts=${message.upserts.map((entity) => `${entity.id}:${entity.status}`).join(',')} removed=${message.removed.join(
          ',',
        )} errors=${message.errors.length}`,
      }
    case 'verification_started':
      return { ...base, seq: message.seq, id: message.id, summary: `id=${message.id}` }
    case 'verification':
      return {
        ...base,
        seq: message.seq,
        id: message.result.id,
        summary: `passed=${message.result.passed} checks=${message.result.checks
          .map((check) => `${check.name}:${check.status}`)
          .join(',')}`,
      }
    case 'groom_thread':
      return { ...base, id: message.id, summary: `thread chars=${message.thread.length}` }
    case 'groom_chat_started':
      return { ...base, id: message.id, summary: `id=${message.id}` }
    case 'groom_chat_result':
      return {
        ...base,
        id: message.id,
        summary: `ok=${message.ok}${message.error ? ` error=${message.error}` : ''}`,
      }
    case 'build_status':
      return {
        ...base,
        id: message.id,
        summary: `phase=${message.phase} ok=${message.ok} ${message.message}`,
        message: message.message,
      }
    case 'build_result':
      return {
        ...base,
        id: message.id,
        summary: `ok=${message.ok} brief=${message.brief_path ?? ''}${
          message.error ? ` error=${message.error}` : ''
        }`,
        message: message.message ?? message.error,
      }
    case 'error':
      return { ...base, message: message.message, summary: message.message }
  }
}

export function summarizeClientMessage(message: ClientMsg): DebugEvent {
  return {
    at: new Date().toISOString(),
    direction: 'out',
    type: message.type,
    id: 'id' in message ? message.id : undefined,
    summary: JSON.stringify(message),
  }
}

export function buildDebugReport(input: {
  state: FactoryState
  selected?: Entity
  selectedResult?: Result
  selectedRunning: boolean
  notice: string | null
  debug: DebugInfo
}): string {
  const { state, selected, selectedResult, selectedRunning, notice, debug } = input
  const entities = Object.values(state.entities)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entity) => ({
      id: entity.id,
      type: entity.type,
      status: entity.status,
      title: entity.title,
      path: entity.path,
      hash: entity.hash,
    }))
  const report = {
    at: new Date().toISOString(),
    location: typeof window === 'undefined' ? '' : window.location.href,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    wsUrl: debug.wsUrl,
    connection: {
      connected: state.connected,
      seq: state.seq,
      needResync: state.needResync,
    },
    entities,
    parseErrors: state.errors,
    running: state.running,
    verifications: state.verifications,
    selected: selected
      ? {
          id: selected.id,
          type: selected.type,
          status: selected.status,
          title: selected.title,
          path: selected.path,
          verification: selected.verification,
          relations: selected.relations,
          body: selected.body,
        }
      : null,
    selectedResult: selectedResult ?? null,
    selectedRunning,
    notice,
    events: debug.events,
  }
  return JSON.stringify(report, null, 2)
}
