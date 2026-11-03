import type { Entity } from '../types'
import { nextBuildable } from '../lib/next-buildable'
import { sortStrategy } from '../lib/strategy'

type Props = {
  entities: Entity[]
  tasks: Entity[]
  selectedId: string | null
  onSelect: (id: string) => void
  onBuild?: (id: string) => void
}

/**
 * Covert: ontology first (what things are).
 * Krug: billboards — one glance tells you destination, locks, sequence.
 */
export function DirectionView({ entities, tasks, selectedId, onSelect, onBuild }: Props) {
  const { direction, decisions, roadmap } = sortStrategy(entities)
  const next = nextBuildable(tasks)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Where we are going</h2>
        <p className="text-sm text-base-content/60">
          Direction → Decisions → Roadmap → Build. Tasks live on the Tasks tab.
        </p>
      </header>

      {next && (
        <section className="rounded-box border border-primary/40 bg-primary/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            Next buildable
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              data-task-card
              className="text-left"
              onClick={() => onSelect(next.id)}
            >
              <div className="font-mono text-xs text-base-content/50">{next.id}</div>
              <div className="text-sm font-medium">{next.title}</div>
            </button>
            {onBuild && (
              <button className="btn btn-sm btn-primary" onClick={() => onBuild(next.id)}>
                Build this
              </button>
            )}
          </div>
        </section>
      )}

      <Section
        label="1 · Direction"
        hint="One north star. If two exist, pick one."
        empty="Add DIR-001 under entities/direction/"
        items={direction}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <Section
        label="2 · Decisions"
        hint="Locked calls. One decision per card."
        empty="Add DEC-* under entities/decisions/"
        items={decisions}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <Section
        label="3 · Roadmap"
        hint="Ordered phases. Not a feature dump."
        empty="Add ROAD-001 under entities/roadmap/"
        items={roadmap}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  )
}

function Section(props: {
  label: string
  hint: string
  empty: string
  items: Entity[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
          {props.label}
        </h3>
        <p className="text-xs text-base-content/50">{props.hint}</p>
      </div>
      {props.items.length === 0 ? (
        <p className="rounded-box bg-base-100 p-3 text-sm text-base-content/50">{props.empty}</p>
      ) : (
        <ul className="space-y-2">
          {props.items.map((entity) => {
            const active = entity.id === props.selectedId
            return (
              <li key={entity.id}>
                <button
                  type="button"
                  data-task-card
                  onClick={() => props.onSelect(entity.id)}
                  className={`w-full rounded-box border px-3 py-3 text-left transition ${
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 bg-base-100 hover:border-base-content/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-base-content/50">{entity.id}</span>
                    <span className="badge badge-sm badge-ghost">{entity.status}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium">{entity.title}</div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
