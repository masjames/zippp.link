import { describe, expect, it } from 'vitest'
import { buildRelationMap } from './relation-map'
import type { Entity } from '../types'

function entity(id: string, relations: Partial<Entity['relations']> = {}): Entity {
  return {
    id,
    type: 'feature',
    title: id,
    status: 'todo',
    assignee: 'adit',
    relations: {
      blocks: relations.blocks ?? [],
      implements: relations.implements ?? [],
      depends_on: relations.depends_on ?? [],
    },
    verification: { target_files: [], test_command: '', prod_endpoint: '' },
    path: `features/${id}.md`,
    body: '',
    hash: 'abc',
  }
}

describe('buildRelationMap', () => {
  it('collects related nodes and labels', () => {
    const selected = entity('A', { depends_on: ['B'], blocks: ['C'], implements: ['D'] })
    const entities = {
      A: selected,
      B: entity('B'),
      C: entity('C'),
      D: entity('D'),
    }
    const graph = buildRelationMap(selected, entities)
    expect(graph.nodes.map((node) => node.id)).toEqual(['A', 'B', 'C', 'D'])
    expect(graph.edges).toEqual([
      { from: 'A', to: 'B', label: 'depends on' },
      { from: 'A', to: 'C', label: 'blocks' },
      { from: 'A', to: 'D', label: 'implements' },
    ])
  })

  it('deduplicates a node and ignores dangling ids', () => {
    const selected = entity('A', { depends_on: ['B'], blocks: ['B'], implements: ['MISSING'] })
    const graph = buildRelationMap(selected, { A: selected, B: entity('B') })
    expect(graph.nodes.map((node) => node.id)).toEqual(['A', 'B'])
    expect(graph.edges[0].label).toBe('blocks/depends on')
  })
})
