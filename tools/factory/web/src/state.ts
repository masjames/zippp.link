import type { Entity, ParseError, Result, ServerMsg } from './types'

export type FactoryState = {
  connected: boolean
  seq: number
  entities: Record<string, Entity>
  errors: ParseError[]
  verifications: Record<string, Result>
  running: Record<string, boolean>
  threads: Record<string, string>
  chatBusy: Record<string, boolean>
  chatError: Record<string, string>
  needResync: boolean
}

export const initialState: FactoryState = {
  connected: false,
  seq: 0,
  entities: {},
  errors: [],
  verifications: {},
  running: {},
  threads: {},
  chatBusy: {},
  chatError: {},
  needResync: false,
}

export type Action =
  | { type: 'connection'; connected: boolean }
  | { type: 'server'; message: ServerMsg }
  | { type: 'clear-resync' }
  | { type: 'thread_loaded'; id: string; thread: string }
  | { type: 'chat_started'; id: string }
  | { type: 'chat_result'; id: string; ok: boolean; thread?: string; error?: string }

type SeqStatus = 'ok' | 'stale' | 'gap'

function checkSeq(current: number, next: number): SeqStatus {
  if (next <= current) return 'stale'
  if (next > current + 1) return 'gap'
  return 'ok'
}

export function reducer(state: FactoryState, action: Action): FactoryState {
  if (action.type === 'connection') {
    return { ...state, connected: action.connected }
  }
  if (action.type === 'clear-resync') {
    return { ...state, needResync: false }
  }
  if (action.type === 'thread_loaded') {
    return {
      ...state,
      threads: { ...state.threads, [action.id]: action.thread },
      chatBusy: { ...state.chatBusy, [action.id]: false },
    }
  }
  if (action.type === 'chat_started') {
    return {
      ...state,
      chatBusy: { ...state.chatBusy, [action.id]: true },
      chatError: { ...state.chatError, [action.id]: '' },
    }
  }
  if (action.type === 'chat_result') {
    return {
      ...state,
      threads: action.thread
        ? { ...state.threads, [action.id]: action.thread }
        : state.threads,
      chatBusy: { ...state.chatBusy, [action.id]: false },
      chatError: {
        ...state.chatError,
        [action.id]: action.ok ? '' : action.error || 'Grooming chat failed',
      },
    }
  }

  const message = action.message
  if (message.type === 'snapshot') {
    return {
      ...state,
      seq: message.seq,
      entities: Object.fromEntries(message.entities.map((entity) => [entity.id, entity])),
      errors: message.errors,
      verifications: message.verifications,
      running: {},
      needResync: false,
    }
  }
  if (
    message.type === 'error' ||
    message.type === 'groom_thread' ||
    message.type === 'groom_chat_started' ||
    message.type === 'groom_chat_result'
  ) {
    return state
  }

  const seq = checkSeq(state.seq, message.seq)
  if (seq === 'stale') return state
  if (seq === 'gap') return { ...state, needResync: true }

  if (message.type === 'diff') {
    const entities = { ...state.entities }
    const running = { ...state.running }
    for (const body of message.upserts ?? []) {
      entities[body.id] = body
      if (body.status !== 'verify') delete running[body.id]
    }
    for (const id of message.removed ?? []) {
      delete entities[id]
      delete running[id]
    }
    return {
      ...state,
      seq: message.seq,
      entities,
      errors: message.errors,
      running,
    }
  }

  if (message.type === 'verification_started') {
    return {
      ...state,
      seq: message.seq,
      running: { ...state.running, [message.id]: true },
    }
  }

  const result = message.result
  const running = { ...state.running }
  delete running[result.id]
  return {
    ...state,
    seq: message.seq,
    verifications: { ...state.verifications, [result.id]: result },
    running,
  }
}
