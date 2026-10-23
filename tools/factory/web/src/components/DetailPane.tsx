import type { Entity, EntityStatus, Result } from '../types'
import { entityGap } from '../lib/gap'
import { extractEraserBlocks } from '../lib/eraser'
import { parseAcceptance } from '../lib/spec'
import { EraserBlock } from './EraserBlock'
import { ErrorBoundary } from './ErrorBoundary'
import { MarkdownView } from './MarkdownView'
import { RelationMap } from './RelationMap'
import { VerifyPanel } from './VerifyPanel'

export type DetailTab = 'spec' | 'diagram' | 'gap'

type Props = {
  entity?: Entity
  entities: Record<string, Entity>
  result?: Result
  running: boolean
  tab: DetailTab
  onTab: (tab: DetailTab) => void
  onSelect: (id: string) => void
  onVerify: () => void
  onEdit: () => void
}

const statusClass: Record<EntityStatus, string> = {
  todo: 'badge-ghost',
  'in-progress': 'badge-info',
  blocked: 'badge-error',
  verify: 'badge-warning',
  done: 'badge-success',
}

export function DetailPane(props: Props) {
  const { entity, entities, result, running, tab, onTab, onSelect, onVerify, onEdit } = props
  if (!entity) {
    return (
      <aside className="min-h-0 overflow-auto border-l border-base-300 bg-base-100 p-4">
        <p className="text-sm text-base-content/60">Select a task to inspect its spec, diagram, and gap.</p>
      </aside>
    )
  }

  const relations: Array<{ label: string; ids: string[] }> = [
    { label: 'blocks', ids: entity.relations.blocks ?? [] },
    { label: 'implements', ids: entity.relations.implements ?? [] },
    { label: 'depends on', ids: entity.relations.depends_on ?? [] },
  ]

  return (
    <aside className="flex min-h-0 flex-col border-l border-base-300 bg-base-100">
      <header className="space-y-1 border-b border-base-300 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-base-content/60">{entity.id}</span>
          <span className={`badge badge-sm ${statusClass[entity.status]}`}>{entity.status}</span>
        </div>
        <h2 className="text-lg font-semibold">{entity.title}</h2>
        <div className="flex items-center gap-2">
          <span className="badge badge-ghost badge-sm">{entity.type}</span>
          <span className="text-xs text-base-content/60">{entity.assignee || 'unassigned'}</span>
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
          className={`tab ${tab === 'gap' ? 'tab-active' : ''}`}
          onClick={() => onTab('gap')}
        >
          Gap
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
        {tab === 'spec' && (
          <SpecTab
            entity={entity}
            relations={relations}
            entities={entities}
            onSelect={onSelect}
            onEdit={onEdit}
          />
        )}
        {tab === 'diagram' && (
          <DiagramTab entity={entity} entities={entities} onSelect={onSelect} />
        )}
        {tab === 'gap' && (
          <GapTab entity={entity} result={result} running={running} onVerify={onVerify} />
        )}
      </div>
    </aside>
  )
}

function SpecTab(props: {
  entity: Entity
  relations: Array<{ label: string; ids: string[] }>
  entities: Record<string, Entity>
  onSelect: (id: string) => void
  onEdit: () => void
}) {
  const { entity, relations, entities, onSelect, onEdit } = props
  const acceptance = parseAcceptance(entity.body)
  const checked = acceptance.filter((item) => item.checked).length

  return (
    <>
      <section className="space-y-1">
        <button className="btn btn-sm btn-outline w-full" onClick={onEdit}>
          Open spec in Neovim
        </button>
        <p className="text-xs text-base-content/50">
          Opens this markdown file in the nvim listening on the configured socket (default
          /tmp/zippp-nvim.sock). It does not run shell commands.
        </p>
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
          <p className="text-xs text-base-content/60">No target files.</p>
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

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Spec</h3>
        <MarkdownView body={entity.body} />
      </section>
    </>
  )
}

function DiagramTab(props: {
  entity: Entity
  entities: Record<string, Entity>
  onSelect: (id: string) => void
}) {
  const blocks = extractEraserBlocks(props.entity.body)
  return (
    <>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Diagram</h3>
        {blocks.length === 0 && (
          <p className="text-sm text-base-content/60">
            No eraser diagram in this spec. Add a fenced block with the language `eraser` to the
            markdown body.
          </p>
        )}
        {blocks.map((block, index) => (
          <ErrorBoundary
            key={`${props.entity.id}-diagram-${index}`}
            fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{block}</pre>}
          >
            <EraserBlock source={block} />
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
          <span className="badge badge-sm">{gap.label}</span>
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
