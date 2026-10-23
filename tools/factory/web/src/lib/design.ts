export type DesignBlocks = {
  eraser: string[]
  flow: string[]
}

export type DesignContent = {
  live: DesignBlocks
  planned: DesignBlocks
}

export function parseDesign(body: string): DesignContent {
  const result: DesignContent = {
    live: { eraser: [], flow: [] },
    planned: { eraser: [], flow: [] },
  }
  let mode: 'live' | 'planned' | null = null
  let current: { lang: 'eraser' | 'flow'; lines: string[] } | null = null

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
    if (current === null && (trimmed.startsWith('```eraser') || trimmed.startsWith('```flow'))) {
      current = {
        lang: trimmed.startsWith('```eraser') ? 'eraser' : 'flow',
        lines: [],
      }
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
