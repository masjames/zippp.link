export type FlowNode = {
  id: string
  label: string
}

export type FlowEdge = {
  from: string
  to: string
  label?: string
}

export type FlowModel = {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export type FlowBox = {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  layer: number
}

export type FlowLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  label?: string
}

export type FlowLayout = {
  boxes: FlowBox[]
  lines: FlowLine[]
  width: number
  height: number
}

const BOX_WIDTH = 160
const BOX_HEIGHT = 38
const GAP_X = 90
const GAP_Y = 28


export function extractFlowBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: string[] = []
  let current: string[] | null = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (current === null && trimmed.startsWith('```flow')) {
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

export function parseFlow(source: string): FlowModel {
  const nodes = new Map<string, FlowNode>()
  const edges: FlowEdge[] = []
  function addNode(id: string) {
    if (!nodes.has(id)) nodes.set(id, { id, label: humanize(id) })
  }
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.length === 0 || line.startsWith('//') || line === 'flow') continue
    const match = line.match(/^([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/)
    if (!match) continue
    addNode(match[1])
    addNode(match[2])
    edges.push({ from: match[1], to: match[2], label: match[3]?.trim() || undefined })
  }
  return { nodes: [...nodes.values()], edges }
}

export function layoutFlow(model: FlowModel): FlowLayout {
  if (model.nodes.length === 0) {
    return { boxes: [], lines: [], width: 0, height: 0 }
  }
  const layer = new Map(model.nodes.map((node) => [node.id, 0]))
  for (let pass = 0; pass < model.nodes.length; pass += 1) {
    let changed = false
    for (const edge of model.edges) {
      const next = (layer.get(edge.from) ?? 0) + 1
      if (next > (layer.get(edge.to) ?? 0)) {
        layer.set(edge.to, next)
        changed = true
      }
    }
    if (!changed) break
  }

  const groups = new Map<number, FlowNode[]>()
  for (const node of model.nodes) {
    const value = layer.get(node.id) ?? 0
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value)?.push(node)
  }
  const maxLayer = Math.max(...groups.keys())
  const maxCount = Math.max(...[...groups.values()].map((group) => group.length))
  const boxes: FlowBox[] = []
  const byId = new Map<string, FlowBox>()
  for (let index = 0; index <= maxLayer; index += 1) {
    const group = groups.get(index) ?? []
    const offset = ((maxCount - group.length) * (BOX_HEIGHT + GAP_Y)) / 2
    group.forEach((node, position) => {
      const box: FlowBox = {
        id: node.id,
        label: node.label,
        x: index * (BOX_WIDTH + GAP_X),
        y: offset + position * (BOX_HEIGHT + GAP_Y),
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
        layer: index,
      }
      boxes.push(box)
      byId.set(node.id, box)
    })
  }

  const lines: FlowLine[] = []
  for (const edge of model.edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) continue
    if (to.x > from.x) {
      lines.push({
        x1: from.x + from.width,
        y1: from.y + from.height / 2,
        x2: to.x,
        y2: to.y + to.height / 2,
        label: edge.label,
      })
    } else if (to.x < from.x) {
      lines.push({
        x1: from.x,
        y1: from.y + from.height / 2,
        x2: to.x + to.width,
        y2: to.y + to.height / 2,
        label: edge.label,
      })
    } else {
      lines.push({
        x1: from.x + from.width / 2,
        y1: from.y + from.height,
        x2: to.x + to.width / 2,
        y2: to.y,
        label: edge.label,
      })
    }
  }

  return {
    boxes,
    lines,
    width: (maxLayer + 1) * (BOX_WIDTH + GAP_X) - GAP_X,
    height: maxCount * (BOX_HEIGHT + GAP_Y) - GAP_Y,
  }
}

function humanize(id: string): string {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase())
}
