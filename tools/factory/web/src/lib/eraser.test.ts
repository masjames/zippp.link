import { describe, expect, it } from 'vitest'
import { layoutErd, parseEraser } from './eraser'

describe('parseEraser', () => {
  it('parses entities, fields, and a relation', () => {
    const model = parseEraser(`users {
  id uuid pk
  name string
}
posts {
  id uuid pk
  user_id uuid fk
}
users.id < posts.user_id
`)
    expect(model.entities).toHaveLength(2)
    expect(model.entities[0].name).toBe('users')
    expect(model.entities[0].fields[0]).toEqual({ name: 'id', type: 'uuid', pk: true, fk: false })
    expect(model.entities[1].fields[1]).toEqual({ name: 'user_id', type: 'uuid', pk: false, fk: true })
    expect(model.relations).toEqual([
      { from: { entity: 'users', field: 'id' }, op: '<', to: { entity: 'posts', field: 'user_id' } },
    ])
  })

  it('parses every relation operator', () => {
    for (const op of ['<', '>', '-', '<>'] as const) {
      const model = parseEraser(`a {\n  id uuid\n}\nb {\n  id uuid\n}\na.id ${op} b.id\n`)
      expect(model.relations[0].op).toBe(op)
    }
  })

  it('ignores unknown lines', () => {
    const model = parseEraser(`// comment
direction LR
group auth {
}
a {
  // note
  id uuid pk
  @invalid
}
`)
    expect(model.entities).toHaveLength(1)
    expect(model.entities[0].fields).toHaveLength(1)
  })

  it('handles an empty block', () => {
    expect(parseEraser('')).toEqual({ entities: [], relations: [] })
  })

  it('handles fields with and without types', () => {
    const model = parseEraser('a {\n  id pk\n  name\n  created_at timestamp\n}\n')
    expect(model.entities[0].fields).toEqual([
      { name: 'id', type: '', pk: true, fk: false },
      { name: 'name', type: '', pk: false, fk: false },
      { name: 'created_at', type: 'timestamp', pk: false, fk: false },
    ])
  })
})

describe('layoutErd', () => {
  it('is deterministic', () => {
    const model = parseEraser('a {\n id uuid\n}\nb {\n id uuid\n}\na.id < b.id\n')
    expect(layoutErd(model)).toEqual(layoutErd(model))
  })

  it('uses a square grid', () => {
    const make = (count: number) =>
      parseEraser(
        Array.from({ length: count }, (_, index) => `e${index} {\n  id uuid pk\n}`).join('\n'),
      )
    expect(new Set(layoutErd(make(1)).boxes.map((box) => box.x)).size).toBe(1)
    expect(new Set(layoutErd(make(2)).boxes.map((box) => box.x)).size).toBe(2)
    expect(new Set(layoutErd(make(5)).boxes.map((box) => box.x)).size).toBe(3)
  })

  it('uses relation labels', () => {
    const model = parseEraser('a {\n id uuid\n}\nb {\n id uuid\n}\na.id <> b.id\n')
    const layout = layoutErd(model)
    expect(layout.lines[0].fromLabel).toBe('N')
    expect(layout.lines[0].toLabel).toBe('N')
  })
})
