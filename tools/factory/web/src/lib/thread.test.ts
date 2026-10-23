import { describe, expect, it } from 'vitest'
import { hasThreadMessages, parseThread } from './thread'

const thread = `# Grooming thread: FEAT-112

## user 2026-10-23T11:00:00Z

Groom this card.

## assistant 2026-10-23T11:00:02Z

Should Android include top-up?

## decision 2026-10-23T11:00:05Z

Keep billing web-only.
`

describe('parseThread', () => {
  it('parses user, assistant, and decision messages', () => {
    const messages = parseThread(thread)
    expect(messages).toHaveLength(3)
    expect(messages[0].role).toBe('user')
    expect(messages[1].text).toContain('top-up')
    expect(messages[2].role).toBe('decision')
  })

  it('returns no messages for an empty thread', () => {
    expect(parseThread('# Grooming thread: FEAT-112\n\n')).toEqual([])
    expect(hasThreadMessages('# Grooming thread: FEAT-112\n\n')).toBe(false)
  })
})
