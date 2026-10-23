export type AcceptanceItem = {
  checked: boolean
  text: string
}

export function parseAcceptance(body: string): AcceptanceItem[] {
  const items: AcceptanceItem[] = []
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/)
    if (!match) continue
    items.push({ checked: match[1].toLowerCase() === 'x', text: match[2] })
  }
  return items
}
