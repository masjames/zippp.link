import type { FactoryState } from '../state'
import type { Entity, EntityStatus, Result } from '../types'
import { entityGap, summarizeGaps } from '../lib/gap'
import type { GapSeverity } from '../lib/gap'

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

type Props = {
  entities: Entity[]
  state: FactoryState
  onSelect: (id: string) => void
}

export function GapView({ entities, state, onSelect }: Props) {
  const summary = summarizeGaps(entities, state.verifications, state.running)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        <Stat label="Tasks" value={summary.total} />
        <Stat label="Done" value={summary.done} />
        <Stat label="Passed" value={summary.passed} />
        <Stat label="Failed" value={summary.failed} />
        <Stat label="Unverified" value={summary.unverified} />
        <Stat label="Open gaps" value={summary.gaps + summary.warnings} />
      </div>
      <p className="text-xs text-base-content/60">
        Planned is the task status. Current is the latest verification evidence.
      </p>
      <div className="overflow-x-auto rounded-box bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Verification</th>
              <th>Gap</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity) => {
              const result = state.verifications[entity.id]
              const running = Boolean(state.running[entity.id])
              const gap = entityGap(entity, result, running)
              const verification = verificationBadge(result, running)
              return (
                <tr
                  key={entity.id}
                  data-task-card
                  className="cursor-pointer hover:bg-base-200"
                  onClick={() => onSelect(entity.id)}
                >
                  <td>
                    <div className="font-mono text-xs text-base-content/60">{entity.id}</div>
                    <div className="text-sm">{entity.title}</div>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${statusClass[entity.status]}`}>{entity.status}</span>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${verification.className}`}>{verification.label}</span>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${gapClass[gap.severity]}`}>{gap.label}</span>
                    <div className="mt-1 max-w-[520px] text-xs text-base-content/60">{gap.detail}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {entities.length === 0 && (
          <p className="p-4 text-sm text-base-content/60">No tasks.</p>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-box bg-base-100 p-3">
      <div className="text-xs text-base-content/60">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function verificationBadge(result?: Result, running?: boolean) {
  if (running) return { label: 'running', className: 'badge-warning' }
  if (!result) return { label: 'none', className: 'badge-ghost' }
  return result.passed
    ? { label: 'passed', className: 'badge-success' }
    : { label: 'failed', className: 'badge-error' }
}
