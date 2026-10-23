import type { FactoryState } from '../state'

export function StatusBar({ state }: { state: FactoryState }) {
  const count = Object.keys(state.entities).length
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`badge badge-sm ${state.connected ? 'badge-success' : 'badge-error'}`}>
        {state.connected ? 'connected' : 'disconnected, retrying'}
      </span>
      <span className="text-base-content/70">{count} entities</span>
      <span className="text-base-content/50">seq {state.seq}</span>
    </div>
  )
}
