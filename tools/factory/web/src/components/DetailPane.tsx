import type { Entity, EntityStatus, Result } from '../types'
import { MarkdownView } from './MarkdownView'
import { VerifyPanel } from './VerifyPanel'

type Props = {
  entity?: Entity
  entities: Record<string, Entity>
  result?: Result
  running: boolean
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

export function DetailPane({ entity, entities, result, running, onSelect, onVerify, onEdit }: Props) {
  if (!entity) {
    return (
      <aside className="min-h-0 overflow-auto border-l border-base-300 bg-base-100 p-4">
        <p className="text-sm text-base-content/60">Select an entity to inspect it.</p>
      </aside>
    )
  }

  const relations: Array<{ label: string; ids: string[] }> = [
    { label: 'blocks', ids: entity.relations.blocks ?? [] },
    { label: 'implements', ids: entity.relations.implements ?? [] },
    { label: 'depends on', ids: entity.relations.depends_on ?? [] },
  ]

  return (
    <aside className="min-h-0 space-y-4 overflow-auto border-l border-base-300 bg-base-100 p-4">
      <header className="space-y-1">
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

      <dl className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-xs">
        <dt className="text-base-content/60">path</dt>
        <dd className="break-all font-mono">{entity.path}</dd>
        <dt className="text-base-content/60">verification</dt>
        <dd>{entity.verification.test_command || 'no test command'}</dd>
      </dl>

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

      <VerifyPanel entity={entity} result={result} running={running} onVerify={onVerify} />

      <button className="btn btn-sm btn-outline w-full" onClick={onEdit}>
        Edit in Terminal
      </button>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Document</h3>
        <MarkdownView body={entity.body} />
      </section>
    </aside>
  )
}
