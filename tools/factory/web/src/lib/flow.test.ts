import { describe, expect, it } from 'vitest'
import { extractFlowBlocks, layoutFlow, parseFlow } from './flow'

describe('parseFlow', () => {
  it('parses nodes and edges', () => {
    const model = parseFlow('Landing -> SignIn\nSignIn -> SheetSetup\n')
    expect(model.nodes.map((node) => node.id)).toEqual(['Landing', 'SignIn', 'SheetSetup'])
    expect(model.nodes[1].label).toBe('Sign In')
    expect(model.edges).toHaveLength(2)
  })

  it('keeps edge labels and ignores comments', () => {
    const model = parseFlow('// comment\nA -> B: continue\nunknown\n')
    expect(model.edges[0].label).toBe('continue')
  })
})

describe('layoutFlow', () => {
  it('lays out a linear flow in layers', () => {
    const layout = layoutFlow(parseFlow('A -> B\nB -> C\n'))
    const byId = new Map(layout.boxes.map((box) => [box.id, box]))
    expect(byId.get('A')?.x).toBe(0)
    expect(byId.get('B')?.x).toBe(250)
    expect(byId.get('C')?.x).toBe(500)
  })

  it('places branches in the same layer', () => {
    const layout = layoutFlow(parseFlow('A -> B\nA -> C\n'))
    const byId = new Map(layout.boxes.map((box) => [box.id, box]))
    expect(byId.get('B')?.layer).toBe(1)
    expect(byId.get('C')?.layer).toBe(1)
    expect(byId.get('B')?.x).toBe(byId.get('C')?.x)
  })

  it('is deterministic', () => {
    const model = parseFlow('A -> B\nA -> C\nC -> D\n')
    expect(layoutFlow(model)).toEqual(layoutFlow(model))
  })
})

describe('extractFlowBlocks', () => {
  it('extracts fenced flow blocks', () => {
    const body = 'text\n```flow\nA -> B\n```\n'
    const blocks = extractFlowBlocks(body)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain('A -> B')
  })
})
