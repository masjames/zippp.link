import { describe, expect, it } from 'vitest'
import { parseAcceptance } from './spec'

describe('parseAcceptance', () => {
  it('parses checked and unchecked items', () => {
    const items = parseAcceptance('- [ ] first\n- [x] second\n* [X] third\n')
    expect(items).toEqual([
      { checked: false, text: 'first' },
      { checked: true, text: 'second' },
      { checked: true, text: 'third' },
    ])
  })

  it('ignores other lines', () => {
    expect(parseAcceptance('text\n- bullet\n')).toEqual([])
  })
})
