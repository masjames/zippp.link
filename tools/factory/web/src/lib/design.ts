export type DesignBlocks = {
  eraser: string[]
  flow: string[]
  mermaid: string[]
}

export type DesignContent = {
  live: DesignBlocks
  planned: DesignBlocks
}

export function parseDesign(body: string): DesignContent {
  const result: DesignContent = {
    live: { eraser: [], flow: [], mermaid: [] },
    planned: { eraser: [], flow: [], mermaid: [] },
  }
  let mode: 'live' | 'planned' | null = null
  let current: { lang: 'eraser' | 'flow' | 'mermaid'; lines: string[] } | null = null

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      const text = heading[1].toLowerCase()
      if (text.includes('live')) {
        mode = 'live'
      } else if (text.includes('planned')) {
        mode = 'planned'
      } else {
        mode = null
      }
      current = null
      continue
    }
    if (
      current === null &&
      (trimmed.startsWith('```eraser') ||
        trimmed.startsWith('```flow') ||
        trimmed.startsWith('```mermaid'))
    ) {
      const lang = trimmed.startsWith('```eraser')
        ? 'eraser'
        : trimmed.startsWith('```flow')
          ? 'flow'
          : 'mermaid'
      current = { lang, lines: [] }
      continue
    }
    if (current !== null && trimmed.startsWith('```')) {
      if (mode) result[mode][current.lang].push(current.lines.join('\n'))
      current = null
      continue
    }
    if (current !== null) current.lines.push(line)
  }
  return result
}
