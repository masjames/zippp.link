import type { Entity } from '../types'

export type DepNode = {
  id: string
  children: DepNode[]
  cycle?: boolean
}

const MAX_DEPTH = 12

export function buildDepForest(entities: Entity[]): DepNode[] {
  const byId = new Map(entities.map((entity) => [entity.id, entity]))
  const prereq = new Map<string, Set<string>>()
  for (const entity of entities) {
    prereq.set(entity.id, new Set())
  }
  for (const entity of entities) {
    for (const dependency of entity.relations.depends_on ?? []) {
      if (byId.has(dependency)) prereq.get(entity.id)?.add(dependency)
    }
    for (const blocked of entity.relations.blocks ?? []) {
      if (byId.has(blocked)) prereq.get(blocked)?.add(entity.id)
    }
  }

  const children = new Map<string, string[]>()
  for (const entity of entities) {
    children.set(entity.id, [])
  }
  for (const entity of entities) {
    for (const dependency of prereq.get(entity.id) ?? []) {
      children.get(dependency)?.push(entity.id)
    }
  }
  for (const list of children.values()) {
    list.sort()
  }

  const roots = entities
    .filter((entity) => (prereq.get(entity.id)?.size ?? 0) === 0)
    .map((entity) => entity.id)
    .sort()

  const visited = new Set<string>()

  function visit(id: string, path: Set<string>, depth: number): DepNode {
    if (depth >= MAX_DEPTH) return { id, children: [] }
    if (path.has(id)) return { id, children: [], cycle: true }
    visited.add(id)
    const nextPath = new Set(path)
    nextPath.add(id)
    const node: DepNode = { id, children: [] }
    for (const child of children.get(id) ?? []) {
      if (nextPath.has(child)) {
        node.children.push({ id: child, children: [], cycle: true })
      } else {
        node.children.push(visit(child, nextPath, depth + 1))
      }
    }
    return node
  }

  const forest: DepNode[] = []
  for (const id of roots) {
    forest.push(visit(id, new Set(), 0))
  }
  for (const id of entities.map((entity) => entity.id).sort()) {
    if (!visited.has(id)) forest.push(visit(id, new Set(), 0))
  }
  return forest
}
