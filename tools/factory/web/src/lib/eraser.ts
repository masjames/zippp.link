export type EraserField = {
  name: string
  type: string
  pk: boolean
  fk: boolean
}

export type EraserEntity = {
  name: string
  fields: EraserField[]
}

export type EraserEndpoint = {
  entity: string
  field?: string
}

export type EraserRelationOp = '<' | '>' | '-' | '<>'

export type EraserRelation = {
  from: EraserEndpoint
  op: EraserRelationOp
  to: EraserEndpoint
}

export type EraserModel = {
  entities: EraserEntity[]
  relations: EraserRelation[]
}

export type ErdFieldBox = EraserField & { y: number }

export type ErdBox = {
  name: string
  x: number
  y: number
  width: number
  height: number
  fields: ErdFieldBox[]
}

export type ErdLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  fromLabel: string
  toLabel: string
}

export type ErdLayout = {
  boxes: ErdBox[]
  lines: ErdLine[]
  width: number
  height: number
}

const BOX_WIDTH = 220
const HEADER = 28
const ROW = 20
const GAP = 60

const entityOpen = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\[[^\]]*\])?\s*\{\s*$/
const relationLine =
  /^\s*([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s+(<>|<|>|-)\s+([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s*$/

export function parseEraser(source: string): EraserModel {
  const entities: EraserEntity[] = []
  const relations: EraserRelation[] = []
  let current: EraserEntity | null = null

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0) continue

    const open = line.match(entityOpen)
    if (open) {
      current = { name: open[1], fields: [] }
      entities.push(current)
      continue
    }
    if (current && /^\}\s*$/.test(line)) {
      current = null
      continue
    }
    if (current) {
      if (line.startsWith('//') || line.startsWith('direction ') || line.startsWith('group ')) continue
      const tokens = line.split(/\s+/)
      const name = tokens[0]
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue
      let type = ''
      let pk = false
      let fk = false
      for (let index = 1; index < tokens.length; index += 1) {
        const token = tokens[index]
        if (token === 'pk') {
          pk = true
          continue
        }
        if (token === 'fk') {
          fk = true
          continue
        }
        if (token.startsWith('//')) break
        if (type === '') type = token
      }
      current.fields.push({ name, type, pk, fk })
      continue
    }

    const relation = line.match(relationLine)
    if (relation) {
      relations.push({
        from: { entity: relation[1], field: relation[2] || undefined },
        op: relation[3] as EraserRelationOp,
        to: { entity: relation[4], field: relation[5] || undefined },
      })
    }
  }

  return { entities, relations }
}

export function layoutErd(model: EraserModel): ErdLayout {
  if (model.entities.length === 0) {
    return { boxes: [], lines: [], width: 0, height: 0 }
  }

  const columns = Math.ceil(Math.sqrt(model.entities.length))
  const rows = Math.ceil(model.entities.length / columns)
  const rowHeights: number[] = []
  for (let row = 0; row < rows; row += 1) {
    let max = HEADER
    for (let column = 0; column < columns; column += 1) {
      const entity = model.entities[row * columns + column]
      if (!entity) continue
      max = Math.max(max, HEADER + entity.fields.length * ROW)
    }
    rowHeights.push(max)
  }

  const boxes: ErdBox[] = []
  const byName = new Map<string, ErdBox>()
  let y = 0
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const entity = model.entities[row * columns + column]
      if (!entity) continue
      const height = HEADER + entity.fields.length * ROW
      const box: ErdBox = {
        name: entity.name,
        x: column * (BOX_WIDTH + GAP),
        y,
        width: BOX_WIDTH,
        height,
        fields: entity.fields.map((field, index) => ({
          ...field,
          y: y + HEADER + index * ROW + ROW / 2,
        })),
      }
      boxes.push(box)
      if (!byName.has(entity.name)) byName.set(entity.name, box)
    }
    y += rowHeights[row] + GAP
  }

  const lines: ErdLine[] = []
  for (const relation of model.relations) {
    const from = byName.get(relation.from.entity)
    const to = byName.get(relation.to.entity)
    if (!from || !to) continue
    const fromY = relation.from.field
      ? (from.fields.find((field) => field.name === relation.from.field)?.y ?? from.y + HEADER / 2)
      : from.y + HEADER / 2
    const toY = relation.to.field
      ? (to.fields.find((field) => field.name === relation.to.field)?.y ?? to.y + HEADER / 2)
      : to.y + HEADER / 2
    const leftToRight = from.x < to.x
    const labels = labelsFor(relation.op)
    lines.push({
      x1: leftToRight ? from.x + from.width : from.x,
      y1: fromY,
      x2: leftToRight ? to.x : to.x + to.width,
      y2: toY,
      fromLabel: labels.from,
      toLabel: labels.to,
    })
  }

  const width = columns * BOX_WIDTH + (columns - 1) * GAP
  const height = rowHeights.reduce((sum, value) => sum + value, 0) + (rows - 1) * GAP
  return { boxes, lines, width, height }
}

function labelsFor(op: EraserRelationOp): { from: string; to: string } {
  switch (op) {
    case '<':
      return { from: '1', to: 'N' }
    case '>':
      return { from: 'N', to: '1' }
    case '-':
      return { from: '1', to: '1' }
    case '<>':
      return { from: 'N', to: 'N' }
  }
}
