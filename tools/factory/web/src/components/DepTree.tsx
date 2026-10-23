import { buildDepForest } from '../lib/tree'
import type { DepNode } from '../lib/tree'
import type { Entity } from '../types'

type Props = {
  entities: Entity[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DepTree({ entities, selectedId, onSelect }: Props) {
  const forest = buildDepForest(entities)
  const byId = new Map(entities.map((entity) => [entity.id, entity]))
  if (forest.length === 0) {
    return <div className="rounded-box bg-base-100 p-4 text-sm text-base-content/60">No dependencies.</div>
  }
  return (
    <div className="rounded-box bg-base-100 p-3">
      {forest.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          byId={byId}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function TreeNode(props: {
  node: DepNode
  depth: number
  byId: Map<string, Entity>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const entity = props.byId.get(props.node.id)
  return (
    <div>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: props.depth * 18 }}>
        <button
          className={`btn btn-xs ${props.selectedId === props.node.id ? 'btn-active' : 'btn-ghost'}`}
          onClick={() => props.onSelect(props.node.id)}
        >
          <span className="font-mono">{props.node.id}</span>
          <span className="max-w-[360px] truncate font-normal">{entity?.title ?? 'missing'}</span>
        </button>
        {props.node.cycle && <span className="badge badge-error badge-xs">cycle</span>}
      </div>
      {props.node.children.map((child) => (
        <TreeNode
          key={`${props.node.id}:${child.id}`}
          node={child}
          depth={props.depth + 1}
          byId={props.byId}
          selectedId={props.selectedId}
          onSelect={props.onSelect}
        />
      ))}
    </div>
  )
}
