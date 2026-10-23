export type ThreadRole = 'user' | 'assistant' | 'decision'

export type ThreadMessage = {
  role: ThreadRole
  at: string
  text: string
}

export function parseThread(markdown: string): ThreadMessage[] {
  const messages: ThreadMessage[] = []
  let current: ThreadMessage | null = null
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(user|assistant|decision)\s+(.+)$/i)
    if (heading) {
      current = {
        role: heading[1].toLowerCase() as ThreadRole,
        at: heading[2].trim(),
        text: '',
      }
      messages.push(current)
      continue
    }
    if (current) {
      current.text += (current.text ? '\n' : '') + line
    }
  }
  return messages
    .map((message) => ({ ...message, text: message.text.trim() }))
    .filter((message) => message.text.length > 0)
}

export function hasThreadMessages(markdown: string): boolean {
  return parseThread(markdown).length > 0
}
