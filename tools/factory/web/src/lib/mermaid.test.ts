import { describe, expect, it } from 'vitest'
import { extractMermaidBlocks } from './mermaid'

describe('extractMermaidBlocks', () => {
  it('extracts fenced mermaid blocks', () => {
    const body = 'text\n```mermaid\nflowchart LR\n  A --> B\n```\n'
    const blocks = extractMermaidBlocks(body)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain('flowchart LR')
  })

  it('ignores an unclosed block', () => {
    expect(extractMermaidBlocks('```mermaid\nflowchart LR\n')).toEqual([])
  })
})
