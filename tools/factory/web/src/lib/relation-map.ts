import type { Entity } from '../types'

export type RelationEdge = {
  from: string
  to: string
  label: string
}

export type RelationGraph = {
  nodes: Entity[]
  edges: RelationEdge[]
}

export function buildRelationMap(entity: Entity, entities: Record<string, Entity>): RelationGraph {
  const labels = new Map<string, Set<string>>()
  function add(id: string, label: string) {
    if (id === entity.id || !entities[id]) return
    if (!labels.has(id)) labels.set(id, new Set())
    labels.get(id)?.add(label)
  }
  for (const id of entity.relations.depends_on ?? []) add(id, 'depends on')
  for (const id of entity.relations.blocks ?? []) add(id, 'blocks')
  for (const id of entity.relations.implements ?? []) add(id, 'implements')

  const related = [...labels.keys()].sort().map((id) => entities[id])
  const edges = [...labels.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, set]) => ({ from: entity.id, to: id, label: [...set].sort().join('/') }))
  return { nodes: [entity, ...related], edges }
}
