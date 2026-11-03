import type { FactoryState } from '../state'

export function StatusBar({ state }: { state: FactoryState }) {
  const count = Object.keys(state.entities).length
  const building = Object.values(state.builds).filter((job) => {
    if (job.phase !== 'starting' && job.phase !== 'running') return false
    const entity = state.entities[job.id]
    // Card already handed off to verify/done — don't keep the global spinner.
    if (entity?.status === 'verify' || entity?.status === 'done') return false
    return true
  }).length
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`badge badge-sm ${state.connected ? 'badge-success' : 'badge-error'}`}>
        {state.connected ? 'connected' : 'disconnected, retrying'}
      </span>
      <span className="text-base-content/70">{count} entities</span>
      {building > 0 && (
        <span className="badge badge-info badge-sm">
          {building} building
          <span className="loading loading-spinner loading-xs ml-1" />
        </span>
      )}
      <span className="text-base-content/50">seq {state.seq}</span>
    </div>
  )
}
