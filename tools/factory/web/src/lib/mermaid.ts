export function extractMermaidBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: string[] = []
  let current: string[] | null = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (current === null && trimmed.startsWith('```mermaid')) {
      current = []
      continue
    }
    if (current !== null && trimmed.startsWith('```')) {
      blocks.push(current.join('\n'))
      current = null
      continue
    }
    if (current !== null) current.push(line)
  }
  return blocks
}
