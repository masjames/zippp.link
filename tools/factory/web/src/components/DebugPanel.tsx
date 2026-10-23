import { useState } from 'react'
import type { FactoryState } from '../state'
import type { Entity, Result } from '../types'
import { buildDebugReport } from '../lib/debug'
import type { DebugInfo } from '../lib/debug'

type Props = {
  state: FactoryState
  selected?: Entity
  selectedResult?: Result
  selectedRunning: boolean
  notice: string | null
  debug: DebugInfo
  onClear: () => void
  onReconnect: () => void
  onResync: () => void
}

export function DebugPanel(props: Props) {
  const [open, setOpen] = useState(false)
  const [copyState, setCopyState] = useState('')
  const report = open
    ? buildDebugReport({
        state: props.state,
        selected: props.selected,
        selectedResult: props.selectedResult,
        selectedRunning: props.selectedRunning,
        notice: props.notice,
        debug: props.debug,
      })
    : ''

  async function copyReport() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(report)
      setCopyState('copied to clipboard')
    } catch {
      setCopyState('clipboard blocked: click the textarea, select all, and copy')
    }
  }

  return (
    <>
      <button
        className={`btn btn-xs ${props.state.errors.length > 0 ? 'btn-warning' : 'btn-ghost'}`}
        onClick={() => setOpen((value) => !value)}
      >
        debug {props.state.errors.length > 0 ? `(${props.state.errors.length})` : ''}
      </button>
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-auto border-t border-base-300 bg-base-100 p-3 shadow-2xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Debug</h2>
            <span className="text-xs text-base-content/60">
              {props.debug.events.length} events, seq {props.state.seq},{' '}
              {props.state.connected ? 'connected' : 'disconnected'}
            </span>
            <div className="ml-auto flex flex-wrap gap-1">
              <button className="btn btn-xs btn-primary" onClick={copyReport}>
                Copy debug
              </button>
              <button className="btn btn-xs" onClick={props.onResync}>
                Resync
              </button>
              <button className="btn btn-xs" onClick={props.onReconnect}>
                Reconnect
              </button>
              <button className="btn btn-xs" onClick={props.onClear}>
                Clear log
              </button>
              <button className="btn btn-xs btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
          {copyState && <div className="mb-2 text-xs text-info">{copyState}</div>}
          <textarea
            readOnly
            className="h-56 w-full resize-y rounded-box border border-base-300 bg-base-200 p-2 font-mono text-xs"
            value={report}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="mt-2 max-h-32 overflow-auto text-xs">
            {props.debug.events.length === 0 && (
              <p className="text-base-content/60">No events yet.</p>
            )}
            <ul className="space-y-1">
              {props.debug.events.slice(-12).map((event, index) => (
                <li key={`${event.at}-${index}`} className="truncate">
                  <span className="text-base-content/50">{event.at.slice(11, 19)}</span>{' '}
                  <span className="badge badge-ghost badge-xs">{event.direction}</span>{' '}
                  <span className="font-mono">{event.type}</span>{' '}
                  <span className="text-base-content/70">{event.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
