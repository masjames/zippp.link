import { useEffect, useState } from 'react'
import type { Entity, EntityStatus, Result } from '../types'
import { entityGap } from '../lib/gap'
import type { GapSeverity } from '../lib/gap'
import { extractEraserBlocks } from '../lib/eraser'
import { extractFlowBlocks } from '../lib/flow'
import { extractMermaidBlocks } from '../lib/mermaid'
import { groomEntity } from '../lib/grooming'
import type { GroomItem } from '../lib/grooming'
import { parseAcceptance } from '../lib/spec'
import { parseThread } from '../lib/thread'
import { EraserBlock } from './EraserBlock'
import { ErrorBoundary } from './ErrorBoundary'
import { FlowBlock } from './FlowBlock'
import { MarkdownView } from './MarkdownView'
import { MermaidBlock } from './MermaidBlock'
import { RelationMap } from './RelationMap'
import { VerifyPanel } from './VerifyPanel'

export type DetailTab = 'spec' | 'diagram' | 'groom' | 'gap'

type Props = {
  entity?: Entity
  entities: Record<string, Entity>
  result?: Result
  running: boolean
  tab: DetailTab
  onTab: (tab: DetailTab) => void
  onSelect: (id: string) => void
  onVerify: () => void
  expanded: boolean
  onToggleExpand: () => void
  onHide: () => void
  thread?: string
  chatBusy: boolean
  chatError?: string
  onLoadThread: () => void
  onSendThread: (message: string) => void
  onGroomStart: () => void
}

const statusClass: Record<EntityStatus, string> = {
  todo: 'badge-ghost',
  'in-progress': 'badge-info',
  blocked: 'badge-error',
  verify: 'badge-warning',
  done: 'badge-success',
}

const gapClass: Record<GapSeverity, string> = {
  none: 'badge-success',
  warn: 'badge-warning',
  fail: 'badge-error',
  unknown: 'badge-ghost',
}

export function DetailPane(props: Props) {
  const {
    entity, entities, result, running, tab, onTab, onSelect, onVerify, expanded, onToggleExpand, onHide,
    thread, chatBusy, chatError, onLoadThread, onSendThread, onGroomStart,
  } = props
  const asideClass = `flex min-h-0 bg-base-100 ${expanded ? '' : 'border-l border-base-300'}`
  if (!entity) {
    return (
      <aside className={asideClass}>
        <DetailRail expanded={expanded} onToggleExpand={onToggleExpand} onHide={onHide} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <p className="text-sm text-base-content/60">
              Select a task to inspect its spec, diagram, grooming, and gap.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  const relations: Array<{ label: string; ids: string[] }> = [
    { label: 'blocks', ids: entity.relations.blocks ?? [] },
    { label: 'implements', ids: entity.relations.implements ?? [] },
    { label: 'depends on', ids: entity.relations.depends_on ?? [] },
  ]

  return (
    <aside className={asideClass}>
      <DetailRail expanded={expanded} onToggleExpand={onToggleExpand} onHide={onHide} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="space-y-1 border-b border-base-300 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-base-content/60">{entity.id}</span>
            <span className={`badge badge-sm ${statusClass[entity.status]}`}>{entity.status}</span>
          </div>
          <h2 className="text-lg font-semibold">{entity.title}</h2>
          <div className="flex items-center gap-2">
            <span className="badge badge-ghost badge-sm">{entity.type}</span>
            <span className="text-xs text-base-content/60">{entity.assignee || 'unassigned'}</span>
            <button
              className="btn btn-xs btn-primary ml-auto"
              onClick={onGroomStart}
              disabled={chatBusy}
            >
              Groom
            </button>
          </div>
        </header>

        <div role="tablist" className="tabs tabs-boxed m-2 w-fit">
          <button
            role="tab"
            className={`tab ${tab === 'spec' ? 'tab-active' : ''}`}
            onClick={() => onTab('spec')}
          >
            Spec
          </button>
          <button
            role="tab"
            className={`tab ${tab === 'diagram' ? 'tab-active' : ''}`}
            onClick={() => onTab('diagram')}
          >
            Diagram
          </button>
          <button
            role="tab"
            className={`tab ${tab === 'groom' ? 'tab-active' : ''}`}
            onClick={() => onTab('groom')}
          >
            Groom
          </button>
          <button
            role="tab"
            className={`tab ${tab === 'gap' ? 'tab-active' : ''}`}
            onClick={() => onTab('gap')}
          >
            Gap
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
          {tab === 'spec' && (
            <SpecTab entity={entity} relations={relations} entities={entities} onSelect={onSelect} />
          )}
          {tab === 'diagram' && (
            <DiagramTab entity={entity} entities={entities} onSelect={onSelect} />
          )}
          {tab === 'groom' && (
            <GroomTab
              entity={entity}
              thread={thread}
              chatBusy={chatBusy}
              chatError={chatError}
              onLoadThread={onLoadThread}
              onSendThread={onSendThread}
            />
          )}
          {tab === 'gap' && (
            <GapTab entity={entity} result={result} running={running} onVerify={onVerify} />
          )}
        </div>
      </div>
    </aside>
  )
}

function DetailRail(props: {
  expanded: boolean
  onToggleExpand: () => void
  onHide: () => void
}) {
  return (
    <div className="flex w-7 shrink-0 flex-col items-center gap-1 border-r border-base-300 py-1">
      <button
        className="btn btn-ghost btn-xs px-1 text-base"
        title={props.expanded ? 'Split view' : 'Full width'}
        aria-label={props.expanded ? 'Split view' : 'Full width'}
        onClick={props.onToggleExpand}
      >
        {props.expanded ? '»' : '«'}
      </button>
      <button
        className="btn btn-ghost btn-xs px-1 text-base"
        title="Hide details"
        aria-label="Hide details"
        onClick={props.onHide}
      >
        ›
      </button>
    </div>
  )
}

function SpecTab(props: {
  entity: Entity
  relations: Array<{ label: string; ids: string[] }>
  entities: Record<string, Entity>
  onSelect: (id: string) => void
}) {
  const { entity, relations, entities, onSelect } = props
  const acceptance = parseAcceptance(entity.body)
  const checked = acceptance.filter((item) => item.checked).length

  return (
    <>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Markdown spec</h3>
        <MarkdownView body={entity.body} />
      </section>

      <dl className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-xs">
        <dt className="text-base-content/60">path</dt>
        <dd className="break-all font-mono">{entity.path}</dd>
        <dt className="text-base-content/60">test</dt>
        <dd className="break-all font-mono">{entity.verification.test_command || 'none'}</dd>
        <dt className="text-base-content/60">prod</dt>
        <dd className="break-all font-mono">{entity.verification.prod_endpoint || 'none'}</dd>
      </dl>

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Verification plan</h3>
        {entity.verification.target_files.length === 0 && (
          <p className="text-xs text-base-content/60">No target files. Manual plan expected.</p>
        )}
        <ul className="space-y-1">
          {entity.verification.target_files.map((file) => (
            <li key={file} className="break-all font-mono text-xs">
              {file}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Relations</h3>
        {relations.map((relation) => (
          <div key={relation.label} className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-base-content/60">{relation.label}</span>
            {relation.ids.length === 0 && <span className="text-xs text-base-content/40">none</span>}
            {relation.ids.map((id) =>
              entities[id] ? (
                <button key={id} className="badge badge-outline badge-sm" onClick={() => onSelect(id)}>
                  {id}
                </button>
              ) : (
                <span key={id} className="badge badge-ghost badge-sm">
                  {id} missing
                </span>
              ),
            )}
          </div>
        ))}
      </section>

      {acceptance.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">
            Acceptance criteria {checked}/{acceptance.length}
          </h3>
          <progress className="progress progress-success w-full" value={checked} max={acceptance.length} />
          <ul className="space-y-1 text-sm">
            {acceptance.map((item) => (
              <li key={item.text} className={item.checked ? 'text-base-content/60 line-through' : ''}>
                {item.checked ? '[x]' : '[ ]'} {item.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function DiagramTab(props: {
  entity: Entity
  entities: Record<string, Entity>
  onSelect: (id: string) => void
}) {
  const eraser = extractEraserBlocks(props.entity.body)
  const flow = extractFlowBlocks(props.entity.body)
  const mermaid = extractMermaidBlocks(props.entity.body)
  return (
    <>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Diagram</h3>
        {eraser.length === 0 && flow.length === 0 && mermaid.length === 0 && (
          <p className="text-sm text-base-content/60">
            No diagram in this spec. Add a fenced `eraser` or `flow` block to the markdown body.
          </p>
        )}
        {eraser.map((block, index) => (
          <ErrorBoundary
            key={`${props.entity.id}-eraser-${index}`}
            fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{block}</pre>}
          >
            <EraserBlock source={block} />
          </ErrorBoundary>
        ))}
        {flow.map((block, index) => (
          <ErrorBoundary
            key={`${props.entity.id}-flow-${index}`}
            fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{block}</pre>}
          >
            <FlowBlock source={block} />
          </ErrorBoundary>
        ))}
        {mermaid.map((block, index) => (
          <ErrorBoundary
            key={`${props.entity.id}-mermaid-${index}`}
            fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{block}</pre>}
          >
            <MermaidBlock source={block} />
          </ErrorBoundary>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Relation map</h3>
        <RelationMap entity={props.entity} entities={props.entities} onSelect={props.onSelect} />
      </section>
    </>
  )
}

function GroomTab(props: {
  entity: Entity
  thread?: string
  chatBusy: boolean
  chatError?: string
  onLoadThread: () => void
  onSendThread: (message: string) => void
}) {
  const groom = groomEntity(props.entity)
  const messages = parseThread(props.thread ?? '')
  const [message, setMessage] = useState('')

  useEffect(() => {
    props.onLoadThread()
  }, [props.entity.id])

  function send() {
    const value = message.trim()
    if (!value || props.chatBusy) return
    props.onSendThread(value)
    setMessage('')
  }

  return (
    <>
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Grooming assistant</h3>
            <span className={`badge badge-xs ${groom.ready ? 'badge-success' : 'badge-warning'}`}>
              {groom.ready ? 'ready' : 'not ready'}
            </span>
          </div>
          {props.chatBusy && <span className="loading loading-spinner loading-xs" />}
        </div>
        {props.chatError && <p className="text-xs text-error">{props.chatError}</p>}
        <div className="max-h-80 space-y-2 overflow-auto rounded-box bg-base-200 p-2">
          {messages.length === 0 && (
            <p className="text-sm text-base-content/60">
              No messages yet. Click Groom above or type below.
            </p>
          )}
          {messages.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-box p-2 text-sm ${
                  item.role === 'user'
                    ? 'bg-primary text-primary-content'
                    : item.role === 'decision'
                      ? 'border border-success bg-base-100'
                      : 'bg-base-100'
                }`}
              >
                <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">
                  {item.role === 'decision' ? 'Decision' : item.role} · {item.at}
                </div>
                <MarkdownView body={item.text} />
              </div>
            </div>
          ))}
          {props.chatBusy && (
            <div className="text-xs text-base-content/60">Assistant is thinking...</div>
          )}
        </div>
        <div className="flex items-start gap-1">
          <textarea
            className="textarea textarea-bordered textarea-sm w-full"
            rows={2}
            placeholder="Ask about this card or answer the last question"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={props.chatBusy}
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={send}
            disabled={props.chatBusy || message.trim().length === 0}
          >
            Send
          </button>
        </div>
        <p className="text-xs text-base-content/50">
          LLM uses the configured provider. Key file: tools/factory/.factory-key. Decisions are written to the card thread.
        </p>
      </section>

      <details className="rounded-box bg-base-200 p-2">
        <summary className="cursor-pointer text-sm font-semibold">
          Spec readiness {groom.ready ? 'ready' : 'not ready'} · {groom.score}%
        </summary>
        <div className="mt-2 space-y-2">
          <progress className="progress progress-success w-full" value={groom.score} max={100} />
          <p className="text-xs text-base-content/60">
            Required items {groom.requiredOk}/{groom.requiredTotal}.
          </p>
          <ul className="space-y-2">
            {groom.items.map((item) => (
              <GroomRow key={item.key} item={item} />
            ))}
          </ul>
        </div>
      </details>
    </>
  )
}

function GroomRow({ item }: { item: GroomItem }) {
  return (
    <li className="rounded-box bg-base-200 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          {item.ok ? '[x]' : '[ ]'} {item.label}
        </span>
        <span className={`badge badge-xs ${item.required ? 'badge-warning' : 'badge-ghost'}`}>
          {item.required ? 'required' : 'recommended'}
        </span>
      </div>
      {!item.ok && <p className="mt-1 text-xs text-base-content/60">{item.detail}</p>}
    </li>
  )
}

function GapTab(props: {
  entity: Entity
  result?: Result
  running: boolean
  onVerify: () => void
}) {
  const gap = entityGap(props.entity, props.result, props.running)
  return (
    <>
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Gap</h3>
        <div className="flex items-center gap-2">
          <span className={`badge badge-sm ${gapClass[gap.severity]}`}>{gap.label}</span>
          <span className="text-sm text-base-content/70">{gap.detail}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-box bg-base-200 p-2">
          <div className="mb-1 font-semibold">Planned</div>
          <div>status: {props.entity.status}</div>
          <div>target files: {props.entity.verification.target_files.length}</div>
          <div>test: {props.entity.verification.test_command || 'none'}</div>
          <div>prod: {props.entity.verification.prod_endpoint || 'none'}</div>
        </div>
        <div className="rounded-box bg-base-200 p-2">
          <div className="mb-1 font-semibold">Current</div>
          {props.running && <div>verification: running</div>}
          {!props.running && !props.result && <div>verification: none</div>}
          {props.result && (
            <>
              <div>verification: {props.result.passed ? 'passed' : 'failed'}</div>
              <div>wrote status: {props.result.wrote_status ? 'yes' : 'no'}</div>
              {props.result.message && <div>message: {props.result.message}</div>}
            </>
          )}
        </div>
      </section>

      <VerifyPanel
        entity={props.entity}
        result={props.result}
        running={props.running}
        onVerify={props.onVerify}
      />
    </>
  )
}
