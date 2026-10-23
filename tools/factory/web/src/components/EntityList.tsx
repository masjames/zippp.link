import { useState } from 'react'
import type { Entity, EntityType, ParseError } from '../types'

type Props = {
  entities: Entity[]
  allCount: number
  errors: ParseError[]
  search: string
  onSearch: (value: string) => void
  typeFilter: EntityType | 'all'
  onTypeFilter: (value: EntityType | 'all') => void
  selectedId: string | null
  onSelect: (id: string) => void
}

const TYPES: Array<EntityType | 'all'> = ['all', 'feature', 'bug', 'story', 'spec', 'diagram']

export function EntityList(props: Props) {
  const [showErrors, setShowErrors] = useState(false)
  return (
    <aside className="flex min-h-0 flex-col border-r border-base-300 bg-base-100">
      <div className="space-y-2 border-b border-base-300 p-3">
        <input
          className="input input-bordered input-sm w-full"
          placeholder="Search id or title"
          value={props.search}
          onChange={(event) => props.onSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {TYPES.map((type) => (
            <button
              key={type}
              className={`btn btn-xs ${props.typeFilter === type ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => props.onTypeFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-base-content/60">
          <span>
            {props.entities.length} of {props.allCount}
          </span>
          <button
            className={`btn btn-xs ${props.errors.length > 0 ? 'btn-warning' : 'btn-ghost'}`}
            onClick={() => setShowErrors((value) => !value)}
            disabled={props.errors.length === 0}
          >
            parse errors {props.errors.length}
          </button>
        </div>
        {showErrors && props.errors.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-auto rounded-box bg-base-200 p-2 text-xs">
            {props.errors.map((error) => (
              <li key={`${error.path}:${error.message}`}>
                <span className="font-mono text-base-content/70">{error.path}</span>
                <span className="block text-error">{error.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {props.entities.map((entity) => (
          <button
            key={entity.id}
            className={`mb-1 block w-full rounded-box p-2 text-left ${
              props.selectedId === entity.id ? 'bg-base-300' : 'hover:bg-base-200'
            }`}
            onClick={() => props.onSelect(entity.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-base-content/70">{entity.id}</span>
              <span className="badge badge-ghost badge-xs">{entity.type}</span>
            </div>
            <div className="truncate text-sm">{entity.title}</div>
            <div className="text-xs text-base-content/50">{entity.status}</div>
          </button>
        ))}
        {props.entities.length === 0 && (
          <div className="p-3 text-sm text-base-content/60">No entities match.</div>
        )}
      </div>
    </aside>
  )
}
