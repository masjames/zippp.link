import { useEffect, useMemo, useState } from 'react'
import { DetailPane } from './components/DetailPane'
import { DepTree } from './components/DepTree'
import { EntityList } from './components/EntityList'
import { KanbanBoard } from './components/KanbanBoard'
import { StatusBar } from './components/StatusBar'
import { useFactorySocket } from './useFactorySocket'
import type { EntityType } from './types'

type Tab = 'kanban' | 'dependencies'

export function App() {
  const [notice, setNotice] = useState<string | null>(null)
  const { state, send } = useFactorySocket(setNotice)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('kanban')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all')

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
    return allEntities.filter((entity) => {
      const matchesSearch =
        query.length === 0 ||
        entity.id.toLowerCase().includes(query) ||
        entity.title.toLowerCase().includes(query)
      const matchesType = typeFilter === 'all' || entity.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [allEntities, search, typeFilter])

  const selected = selectedId ? state.entities[selectedId] : undefined
  const selectedResult = selectedId ? state.verifications[selectedId] : undefined
  const selectedRunning = selectedId ? Boolean(state.running[selectedId]) : false

  return (
    <div className="flex h-screen flex-col bg-base-200 text-base-content">
      <header className="flex items-center justify-between gap-4 border-b border-base-300 bg-base-100 px-4 py-2">
        <h1 className="text-sm font-semibold tracking-wide">Zippp Factory</h1>
        <StatusBar state={state} />
      </header>

      {notice && (
        <div className="alert alert-info m-2 py-2">
          <span className="text-sm">{notice}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setNotice(null)}>
            dismiss
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_380px]">
        <EntityList
          entities={visibleEntities}
          allCount={allEntities.length}
          errors={state.errors}
          search={search}
          onSearch={setSearch}
          typeFilter={typeFilter}
          onTypeFilter={setTypeFilter}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <main className="min-h-0 overflow-auto p-3">
          <div role="tablist" className="tabs tabs-boxed mb-3 w-fit">
            <button
              role="tab"
              className={`tab ${tab === 'kanban' ? 'tab-active' : ''}`}
              onClick={() => setTab('kanban')}
            >
              Kanban
            </button>
            <button
              role="tab"
              className={`tab ${tab === 'dependencies' ? 'tab-active' : ''}`}
              onClick={() => setTab('dependencies')}
            >
              Dependencies
            </button>
          </div>
          {tab === 'kanban' ? (
            <KanbanBoard
              entities={visibleEntities}
              state={state}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <DepTree entities={visibleEntities} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </main>

        <DetailPane
          entity={selected}
          entities={state.entities}
          result={selectedResult}
          running={selectedRunning}
          onSelect={setSelectedId}
          onVerify={() => selectedId && send({ type: 'verify', id: selectedId })}
          onEdit={() => selectedId && send({ type: 'edit', id: selectedId })}
        />
      </div>
    </div>
  )
}
