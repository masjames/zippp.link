import type { BuildJob, EntityStatus, Result } from '../types'

type Props = {
  job?: BuildJob
  building: boolean
  entityStatus?: EntityStatus
  verifyResult?: Result
  verifyRunning?: boolean
  onBuild?: () => void
  onVerify?: () => void
  canRebuild?: boolean
}

const phaseClass: Record<BuildJob['phase'], string> = {
  starting: 'badge-info',
  running: 'badge-info',
  exited: 'badge-success',
  error: 'badge-error',
}

export function BuildPanel({
  job,
  building,
  entityStatus,
  verifyResult,
  verifyRunning,
  onBuild,
  onVerify,
  canRebuild,
}: Props) {
  const handedOff = entityStatus === 'verify' || entityStatus === 'done' || entityStatus === 'blocked'
  const verifyFailed = entityStatus === 'verify' && verifyResult && !verifyResult.passed && !verifyRunning
  const verifyPassed = entityStatus === 'done' || (verifyResult?.passed && entityStatus === 'verify')

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Agent build</h3>
        {building && <span className="loading loading-spinner loading-xs" />}
      </div>
      {!job && !handedOff && (
        <p className="text-sm text-base-content/60">
          Build → Ghostty/omp (DeepSeek Flash) → auto-verify → done. No babysitting.
        </p>
      )}
      {job && (
        <div className="space-y-1 rounded-box bg-base-200 p-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge badge-sm ${phaseClass[job.phase]}`}>
              {building ? job.phase : handedOff && job.phase === 'running' ? 'handed off' : job.phase}
            </span>
            {job.model && <span className="font-mono text-xs text-base-content/60">{job.model}</span>}
            {job.agent && <span className="text-xs text-base-content/50">{job.agent}</span>}
          </div>
          <p className={job.ok || handedOff ? 'text-base-content/80' : 'text-error'}>
            {handedOff && (job.phase === 'starting' || job.phase === 'running')
              ? `card → ${entityStatus} — verifier owns it`
              : job.message}
          </p>
        </div>
      )}

      {verifyRunning && (
        <p className="text-sm text-info">Verifying automatically…</p>
      )}
      {verifyPassed && entityStatus === 'done' && (
        <p className="text-sm text-success">Done — acceptance verified.</p>
      )}
      {verifyFailed && (
        <div className="space-y-2 rounded-box border border-error/40 bg-error/5 p-2">
          <p className="text-sm text-error">
            Verify failed — stays in verify until fixed.
          </p>
          {verifyResult?.checks
            ?.filter((c) => c.status === 'fail')
            .slice(0, 3)
            .map((c) => (
              <p key={c.name} className="font-mono text-xs text-base-content/70">
                {c.name}: {c.detail || c.status}
              </p>
            ))}
          <div className="flex flex-wrap gap-2">
            {canRebuild && onBuild && (
              <button className="btn btn-xs btn-primary" onClick={onBuild}>
                Build again
              </button>
            )}
            {onVerify && (
              <button className="btn btn-xs btn-outline" onClick={onVerify}>
                Re-verify
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
