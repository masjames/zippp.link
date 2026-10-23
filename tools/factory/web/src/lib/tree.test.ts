import { describe, expect, it } from 'vitest'
import { buildDepForest } from './tree'
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

describe('buildDepForest', () => {
  it('builds a chain from blocks', () => {
    const forest = buildDepForest([
      entity('A', { blocks: ['B'] }),
      entity('B', { blocks: ['C'] }),
      entity('C'),
    ])
    expect(forest).toHaveLength(1)
    expect(forest[0].id).toBe('A')
    expect(forest[0].children[0].id).toBe('B')
    expect(forest[0].children[0].children[0].id).toBe('C')
  })

  it('treats blocks and depends_on as the same edge', () => {
    const fromBlocks = buildDepForest([entity('A', { blocks: ['B'] }), entity('B')])
    const fromDepends = buildDepForest([entity('A'), entity('B', { depends_on: ['A'] })])
    expect(fromBlocks).toEqual(fromDepends)
  })

  it('marks a cycle and adds it as an extra root', () => {
    const forest = buildDepForest([
      entity('A', { blocks: ['B'] }),
      entity('B', { blocks: ['A'] }),
    ])
    expect(forest).toHaveLength(1)
    expect(forest[0].id).toBe('A')
    expect(forest[0].children[0].id).toBe('B')
    expect(forest[0].children[0].children[0]).toEqual({ id: 'A', children: [], cycle: true })
  })

  it('keeps isolated entities as sorted roots', () => {
    const forest = buildDepForest([entity('B'), entity('A')])
    expect(forest.map((node) => node.id)).toEqual(['A', 'B'])
  })

  it('ignores dangling relations', () => {
    const forest = buildDepForest([entity('A', { depends_on: ['MISSING'] })])
    expect(forest).toHaveLength(1)
    expect(forest[0].id).toBe('A')
    expect(forest[0].children).toEqual([])
  })

  it('appends pure cycles after real roots', () => {
    const forest = buildDepForest([
      entity('A', { blocks: ['B'] }),
      entity('B', { blocks: ['A'] }),
      entity('C'),
    ])
    expect(forest.map((node) => node.id)).toEqual(['C', 'A'])
  })
})
