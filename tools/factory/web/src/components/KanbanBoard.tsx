import type { FactoryState } from '../state'
import type { Entity, EntityStatus } from '../types'

const COLUMNS: EntityStatus[] = ['todo', 'in-progress', 'blocked', 'verify', 'done']

type Props = {
  entities: Entity[]
  state: FactoryState
  selectedId: string | null
  onSelect: (id: string) => void
}

export function KanbanBoard({ entities, state, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[980px] grid-cols-5 gap-3">
        {COLUMNS.map((status) => (
          <section key={status} className="rounded-box bg-base-100 p-2">
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{status}</h2>
              <span className="badge badge-ghost badge-sm">
                {entities.filter((entity) => entity.status === status).length}
              </span>
            </header>
            <div className="space-y-2">
              {entities
                .filter((entity) => entity.status === status)
                .map((entity) => (
                  <button
                    key={entity.id}
                    className={`w-full rounded-box border p-2 text-left ${
                      selectedId === entity.id
                        ? 'border-primary bg-base-200'
                        : 'border-base-300 bg-base-100 hover:bg-base-200'
                    }`}
                    onClick={() => onSelect(entity.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-base-content/70">{entity.id}</span>
                      <VerificationBadge id={entity.id} state={state} />
                    </div>
                    <div className="mt-1 text-sm">{entity.title}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="badge badge-ghost badge-xs">{entity.type}</span>
                      <span className="truncate text-xs text-base-content/50">{entity.assignee}</span>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function VerificationBadge({ id, state }: { id: string; state: FactoryState }) {
  if (state.running[id]) {
    return <span className="badge badge-warning badge-xs">running</span>
  }
  const result = state.verifications[id]
  if (!result) return null
  return (
    <span className={`badge badge-xs ${result.passed ? 'badge-success' : 'badge-error'}`}>
      {result.passed ? 'pass' : 'fail'}
    </span>
  )
}
