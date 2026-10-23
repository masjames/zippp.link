import { useState } from 'react'
import type { Entity } from '../types'
import { parseDesign } from '../lib/design'
import { EraserBlock } from './EraserBlock'
import { ErrorBoundary } from './ErrorBoundary'
import { FlowBlock } from './FlowBlock'

type Kind = 'system' | 'erd' | 'flow'
type Mode = 'live' | 'planned'

const KINDS: Array<{ key: Kind; label: string; prefix: string; expected: string }> = [
  { key: 'system', label: 'System design', prefix: 'DIAG-', expected: 'DIAG-001' },
  { key: 'erd', label: 'ERD', prefix: 'ERD-', expected: 'ERD-001' },
  { key: 'flow', label: 'User flow', prefix: 'FLOW-', expected: 'FLOW-001' },
]

export function DesignView({ entities }: { entities: Entity[] }) {
  const [kind, setKind] = useState<Kind>('system')
  const [mode, setMode] = useState<Mode>('planned')
  const config = KINDS.find((item) => item.key === kind) ?? KINDS[0]
  const entity = entities.find((item) => item.id.startsWith(config.prefix))
  const design = entity ? parseDesign(entity.body) : null
  const blocks = design ? design[mode] : { eraser: [], flow: [] }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="tabs tabs-boxed w-fit">
          {KINDS.map((item) => (
            <button
              key={item.key}
              role="tab"
              className={`tab ${kind === item.key ? 'tab-active' : ''}`}
              onClick={() => setKind(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div role="tablist" className="tabs tabs-boxed ml-auto w-fit">
          <button
            role="tab"
            className={`tab ${mode === 'live' ? 'tab-active' : ''}`}
            onClick={() => setMode('live')}
          >
            Live (as is)
          </button>
          <button
            role="tab"
            className={`tab ${mode === 'planned' ? 'tab-active' : ''}`}
            onClick={() => setMode('planned')}
          >
            Planned (as per spec)
          </button>
        </div>
      </div>

      {!entity && (
        <div className="rounded-box bg-base-100 p-4 text-sm text-base-content/60">
          Missing {config.expected} entity. Add it under entities/diagrams.
        </div>
      )}

      {entity && (
        <div className="rounded-box bg-base-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{entity.title}</h2>
              <p className="text-xs text-base-content/60">
                {mode === 'live'
                  ? 'Live: current code and deployed state.'
                  : 'Planned: the design described by the spec.'}
              </p>
            </div>
            <span className="font-mono text-xs text-base-content/50">{entity.id}</span>
          </div>
          <div className="mt-3 space-y-3">
            {blocks.eraser.map((source, index) => (
              <ErrorBoundary
                key={`${entity.id}-${mode}-eraser-${index}`}
                fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{source}</pre>}
              >
                <EraserBlock source={source} />
              </ErrorBoundary>
            ))}
            {blocks.flow.map((source, index) => (
              <ErrorBoundary
                key={`${entity.id}-${mode}-flow-${index}`}
                fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{source}</pre>}
              >
                <FlowBlock source={source} />
              </ErrorBoundary>
            ))}
            {blocks.eraser.length === 0 && blocks.flow.length === 0 && (
              <p className="text-sm text-base-content/60">
                No {mode} diagram in {entity.id}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
