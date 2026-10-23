import type { Entity, EntityStatus } from '../types'
import { buildRelationMap } from '../lib/relation-map'

const statusColor: Record<EntityStatus, string> = {
  todo: '#9ca3af',
  'in-progress': '#3b82f6',
  blocked: '#ef4444',
  verify: '#f59e0b',
  done: '#22c55e',
}

const NODE_WIDTH = 130
const NODE_HEIGHT = 38
const RADIUS = 120
const WIDTH = 560
const HEIGHT = 320

type Props = {
  entity: Entity
  entities: Record<string, Entity>
  onSelect: (id: string) => void
}

export function RelationMap({ entity, entities, onSelect }: Props) {
  const graph = buildRelationMap(entity, entities)
  const cx = WIDTH / 2
  const cy = HEIGHT / 2
  const positions = graph.nodes.map((_, index) => {
    if (index === 0) return { x: cx - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 }
    const count = graph.nodes.length - 1
    const angle = -Math.PI / 2 + (index - 1) * ((2 * Math.PI) / Math.max(1, count))
    return {
      x: cx + Math.cos(angle) * RADIUS - NODE_WIDTH / 2,
      y: cy + Math.sin(angle) * RADIUS - NODE_HEIGHT / 2,
    }
  })

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-box bg-base-200"
        role="img"
        aria-label="Relation map"
      >
        {graph.edges.map((edge) => {
          const targetIndex = graph.nodes.findIndex((node) => node.id === edge.to)
          if (targetIndex < 0) return null
          const from = positions[0]
          const to = positions[targetIndex]
          const x1 = from.x + NODE_WIDTH / 2
          const y1 = from.y + NODE_HEIGHT / 2
          const x2 = to.x + NODE_WIDTH / 2
          const y2 = to.y + NODE_HEIGHT / 2
          return (
            <g key={`${edge.to}-${edge.label}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeOpacity={0.35}
                strokeWidth={1.5}
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 4}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.6}
              >
                {edge.label}
              </text>
            </g>
          )
        })}
        {graph.nodes.map((node, index) => {
          const position = positions[index]
          const selected = index === 0
          const color = statusColor[node.status]
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} className="cursor-pointer">
              <rect
                x={position.x}
                y={position.y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={7}
                fill={color}
                fillOpacity={selected ? 0.22 : 0.12}
                stroke={color}
                strokeWidth={selected ? 2 : 1.2}
              />
              <text
                x={position.x + 8}
                y={position.y + 15}
                fontSize={10}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="currentColor"
              >
                {node.id}
              </text>
              <text x={position.x + 8} y={position.y + 29} fontSize={10} fill="currentColor" opacity={0.75}>
                {node.title.length > 18 ? `${node.title.slice(0, 17)}...` : node.title}
              </text>
            </g>
          )
        })}
        {graph.nodes.length === 1 && (
          <text x={cx} y={cy + 70} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
            No related tasks.
          </text>
        )}
      </svg>
      <p className="text-xs text-base-content/50">Relation map. Click a node to inspect it.</p>
    </div>
  )
}
