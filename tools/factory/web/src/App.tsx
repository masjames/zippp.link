import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { DebugPanel } from './components/DebugPanel'
import { DetailPane } from './components/DetailPane'
import { DesignView } from './components/DesignView'
import type { DetailTab } from './components/DetailPane'
import { GapView } from './components/GapView'
import { KanbanBoard } from './components/KanbanBoard'
import { StatusBar } from './components/StatusBar'
import { useFactorySocket } from './useFactorySocket'

type Tab = 'tasks' | 'design' | 'gap'

export function App() {
  const [notice, setNotice] = useState<string | null>(null)
  const { state, send, debug, clearDebug, reconnect } = useFactorySocket(setNotice)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('tasks')
  const [detailTab, setDetailTab] = useState<DetailTab>('spec')
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (selectedId && !state.entities[selectedId]) setSelectedId(null)
  }, [selectedId, state.entities])

  const allEntities = useMemo(
    () => Object.values(state.entities).sort((a, b) => a.id.localeCompare(b.id)),
    [state.entities],
  )

  const visibleEntities = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query.length === 0) return allEntities
    return allEntities.filter(
      (entity) =>
        entity.id.toLowerCase().includes(query) || entity.title.toLowerCase().includes(query),
    )
  }, [allEntities, search])

  const selected = selectedId ? state.entities[selectedId] : undefined
  const selectedResult = selectedId ? state.verifications[selectedId] : undefined
  const selectedRunning = selectedId ? Boolean(state.running[selectedId]) : false

  function selectTask(id: string, nextTab: DetailTab = 'spec') {
    setSelectedId(id)
    setDetailTab(nextTab)
    setDetailVisible(true)
  }

  function handleMainClick(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-task-card]')) return
    setSelectedId(null)
    setDetailVisible(false)
    setDetailExpanded(false)
  }

  const detailFull = detailVisible && detailExpanded
  const detailSplit = detailVisible && !detailExpanded

  return (
    <div className="flex h-screen flex-col bg-base-200 text-base-content">
      <header className="flex items-center justify-between gap-4 border-b border-base-300 bg-base-100 px-4 py-2">
        <h1 className="text-sm font-semibold tracking-wide">Zippp Factory</h1>
        <div className="flex items-center gap-3">
          <StatusBar state={state} />
          <DebugPanel
            state={state}
            selected={selected}
            selectedResult={selectedResult}
            selectedRunning={selectedRunning}
            notice={notice}
            debug={debug}
            onClear={clearDebug}
            onReconnect={reconnect}
            onResync={() => send({ type: 'resync' })}
          />
        </div>
      </header>

      {notice && (
        <div className="alert alert-info m-2 py-2">
          <span className="text-sm">{notice}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setNotice(null)}>
            dismiss
          </button>
        </div>
      )}

      <div
        className={`grid min-h-0 flex-1 ${
          detailSplit ? 'grid-cols-[minmax(0,1fr)_460px]' : 'grid-cols-1'
        }`}
      >
        {!detailFull && (
          <main className="min-h-0 overflow-auto p-3" onClick={handleMainClick}>
          <div role="tablist" className="tabs tabs-boxed mb-3 w-fit">
            <button
              role="tab"
              className={`tab ${tab === 'tasks' ? 'tab-active' : ''}`}
              onClick={() => setTab('tasks')}
            >
              Tasks
            </button>
            <button
              role="tab"
              className={`tab ${tab === 'design' ? 'tab-active' : ''}`}
              onClick={() => setTab('design')}
            >
              Design
            </button>
            <button
              role="tab"
              className={`tab ${tab === 'gap' ? 'tab-active' : ''}`}
              onClick={() => setTab('gap')}
            >
              Gap
            </button>
          </div>

          {tab === 'tasks' ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  className="input input-bordered input-sm w-full max-w-md"
                  placeholder="Search tasks by id or title"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <span className="text-xs text-base-content/60">
                  {visibleEntities.length} of {allEntities.length} tasks
                </span>
                {state.errors.length > 0 && (
                  <span className="badge badge-warning badge-sm">
                    {state.errors.length} parse errors
                  </span>
                )}
              </div>
              <KanbanBoard
                entities={visibleEntities}
                state={state}
                selectedId={selectedId}
                onSelect={(id) => selectTask(id)}
              />
            </>
          ) : tab === 'design' ? (
            <DesignView entities={allEntities} />
          ) : (
            <GapView
              entities={allEntities}
              state={state}
              onSelect={(id) => selectTask(id, 'gap')}
            />
          )}
          </main>
        )}

        {detailVisible && (
          <DetailPane
            entity={selected}
            entities={state.entities}
            result={selectedResult}
            running={selectedRunning}
            tab={detailTab}
            onTab={setDetailTab}
            onSelect={(id) => selectTask(id)}
            onVerify={() => selectedId && send({ type: 'verify', id: selectedId })}
            thread={selectedId ? state.threads[selectedId] : undefined}
            chatBusy={selectedId ? Boolean(state.chatBusy[selectedId]) : false}
            chatError={selectedId ? state.chatError[selectedId] : undefined}
            onLoadThread={() => selectedId && send({ type: 'groom_thread', id: selectedId })}
            onSendThread={(message) =>
              selectedId && send({ type: 'groom_chat', id: selectedId, message })
            }
            expanded={detailExpanded}
            onToggleExpand={() => setDetailExpanded((value) => !value)}
            onHide={() => {
              setDetailVisible(false)
              setDetailExpanded(false)
            }}
          />
        )}
      </div>

      {!detailVisible && (
        <button
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-base-300 bg-base-100 px-1 py-2 text-base shadow"
          title="Show details"
          aria-label="Show details"
          onClick={() => setDetailVisible(true)}
        >
          ‹
        </button>
      )}
    </div>
  )
}
