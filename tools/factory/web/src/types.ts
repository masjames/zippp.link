export type EntityType = 'feature' | 'bug' | 'story' | 'spec' | 'diagram'
export type EntityStatus = 'todo' | 'in-progress' | 'blocked' | 'verify' | 'done'

export type Relations = {
  blocks: string[]
  implements: string[]
  depends_on: string[]
}

export type Verification = {
  target_files: string[]
  test_command: string
  prod_endpoint: string
}

export type Entity = {
  id: string
  type: EntityType
  title: string
  status: EntityStatus
  assignee: string
  relations: Relations
  verification: Verification
  path: string
  body: string
  hash: string
}

export type ParseError = {
  path: string
  message: string
}

export type CheckStatus = 'pass' | 'fail' | 'skip'

export type CheckResult = {
  name: string
  status: CheckStatus
  detail: string
  output: string
  duration_ms: number
}

export type Result = {
  id: string
  started_at: string
  finished_at: string
  passed: boolean
  wrote_status: boolean
  message: string
  checks: CheckResult[]
}

export type ServerMsg =
  | {
      type: 'snapshot'
      seq: number
      entities: Entity[]
      errors: ParseError[]
      verifications: Record<string, Result>
    }
  | {
      type: 'diff'
      seq: number
      upserts: Entity[]
      removed: string[]
      errors: ParseError[]
    }
  | { type: 'verification_started'; seq: number; id: string }
  | { type: 'verification'; seq: number; result: Result }
  | { type: 'groom_thread'; id: string; thread: string }
  | { type: 'groom_chat_started'; id: string }
  | { type: 'groom_chat_result'; id: string; ok: boolean; thread?: string; error?: string }
  | { type: 'error'; message: string }

export type ClientMsg =
  | { type: 'resync' }
  | { type: 'verify'; id: string }
  | { type: 'groom_thread'; id: string }
  | { type: 'groom_chat'; id: string; message: string }
