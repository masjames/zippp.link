import { describe, expect, it } from 'vitest'
import { parseDesign } from './design'

describe('parseDesign', () => {
  it('separates live and planned blocks', () => {
    const body = `# Live (as is)
\`\`\`eraser
a {
  id string
}
\`\`\`

# Planned (as per spec)
\`\`\`eraser
b {
  id string
}
\`\`\`
\`\`\`flow
A -> B
\`\`\`
`
    const design = parseDesign(body)
    expect(design.live.eraser).toHaveLength(1)
    expect(design.live.eraser[0]).toContain('a {')
    expect(design.planned.eraser[0]).toContain('b {')
    expect(design.planned.flow[0]).toContain('A -> B')
  })

  it('ignores blocks outside live and planned', () => {
    const design = parseDesign('# Notes\n```eraser\na {\n}\n```\n')
    expect(design.live.eraser).toHaveLength(0)
    expect(design.planned.eraser).toHaveLength(0)
  })
})
