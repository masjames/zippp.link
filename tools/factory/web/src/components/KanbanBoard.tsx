import type { FactoryState } from '../state'
import type { Entity } from '../types'
import { groupKanban, KANBAN_COLUMNS } from '../lib/kanban'

type Props = {
  entities: Entity[]
  state: FactoryState
  selectedId: string | null
  onSelect: (id: string) => void
}

export function KanbanBoard({ entities, state, selectedId, onSelect }: Props) {
  const groups = groupKanban(entities)
  return (
    <div className="space-y-3">
      <section className="rounded-box bg-base-100 p-3">
        <header className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">blocked</h2>
          <span className="badge badge-error badge-sm">{groups.blocked.length}</span>
        </header>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {groups.blocked.map((entity) => (
            <TaskCard
              key={entity.id}
              entity={entity}
              state={state}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
        {groups.blocked.length === 0 && (
          <p className="px-1 text-sm text-base-content/60">No blocked tasks.</p>
        )}
      </section>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1040px] grid-cols-5 gap-3">
          {KANBAN_COLUMNS.map((column) => (
            <section key={column.key} className="rounded-box bg-base-100 p-2">
              <header className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{column.label}</h2>
                <span className="badge badge-ghost badge-sm">{groups[column.key].length}</span>
              </header>
              <div className="space-y-2">
                {groups[column.key].map((entity) => (
                  <TaskCard
                    key={entity.id}
                    entity={entity}
                    state={state}
                    selectedId={selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskCard(props: {
  entity: Entity
  state: FactoryState
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { entity, state, selectedId, onSelect } = props
  return (
    <button
      data-task-card
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
        <span className="truncate text-xs text-base-content/50">
          {entity.assignee || 'unassigned'}
        </span>
        {entity.status === 'blocked' && <span className="badge badge-error badge-xs">blocked</span>}
      </div>
    </button>
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
