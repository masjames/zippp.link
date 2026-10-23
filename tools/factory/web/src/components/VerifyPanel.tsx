import type { CheckStatus, Entity, Result } from '../types'

type Props = {
  entity: Entity
  result?: Result
  running: boolean
  onVerify: () => void
}

const statusClass: Record<CheckStatus, string> = {
  pass: 'badge-success',
  fail: 'badge-error',
  skip: 'badge-ghost',
}

export function VerifyPanel({ entity, result, running, onVerify }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Verification</h3>
        {running && <span className="loading loading-spinner loading-xs" />}
        {entity.status === 'verify' && (
          <button className="btn btn-xs btn-outline" onClick={onVerify} disabled={running}>
            Re-verify
          </button>
        )}
      </div>
      {!result && !running && (
        <p className="text-sm text-base-content/60">No verification result yet.</p>
      )}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className={`badge badge-sm ${result.passed ? 'badge-success' : 'badge-error'}`}>
              {result.passed ? 'passed' : 'failed'}
            </span>
            {!result.wrote_status && result.passed && (
              <span className="text-xs text-base-content/60">status not written</span>
            )}
          </div>
          {result.message && <p className="text-sm text-error">{result.message}</p>}
          <ul className="space-y-1">
            {result.checks.map((check) => (
              <li key={check.name} className="rounded-box bg-base-200 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{check.name}</span>
                  <span className={`badge badge-xs ${statusClass[check.status]}`}>{check.status}</span>
                </div>
                {check.detail && <p className="mt-1 text-xs text-base-content/70">{check.detail}</p>}
                {check.output && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-base-content/60">output</summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{check.output}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
