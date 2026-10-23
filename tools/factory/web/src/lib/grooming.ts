import type { Entity } from '../types'
import { parseAcceptance } from './spec'

export type GroomItem = {
  key: string
  label: string
  ok: boolean
  required: boolean
  detail: string
}

export type GroomResult = {
  items: GroomItem[]
  score: number
  overallScore: number
  ready: boolean
  requiredOk: number
  requiredTotal: number
  recommendedOk: number
  recommendedTotal: number
}

function hasHeading(body: string, pattern: RegExp): boolean {
  return body.split(/\r?\n/).some((line) => {
    const match = line.match(/^#{1,6}\s+(.*)$/)
    return Boolean(match && pattern.test(match[1]))
  })
}

function hasDiagram(body: string): boolean {
  return /```(eraser|flow|mermaid)\b/i.test(body)
}

function hasManualVerification(body: string): boolean {
  const lines = body.split(/\r?\n/)
  const index = lines.findIndex((line) => /^#{1,6}\s+verification\b/i.test(line))
  if (index < 0) return false
  return /manual/i.test(lines.slice(index + 1).join('\n'))
}

export function groomEntity(entity: Entity): GroomResult {
  const diagram = entity.type === 'diagram'
  const acceptance = parseAcceptance(entity.body)
  const hasTargets = entity.verification.target_files.length > 0
  const hasTest = entity.verification.test_command.trim().length > 0
  const manual = hasManualVerification(entity.body)

  const items: GroomItem[] = [
    {
      key: 'summary',
      label: 'What it is',
      ok: hasHeading(entity.body, /what it is|summary|overview/i),
      required: true,
      detail: 'Add a # What it is or # Summary section.',
    },
    {
      key: 'goal',
      label: 'Goal',
      ok: hasHeading(entity.body, /goal|why/i),
      required: true,
      detail: 'Add a # Goal section that states the outcome.',
    },
    {
      key: 'context',
      label: 'Context',
      ok: hasHeading(entity.body, /context|background/i),
      required: !diagram,
      detail: 'Add a # Context section with the owning spec links.',
    },
    {
      key: 'acceptance',
      label: 'Acceptance criteria',
      ok: acceptance.length > 0,
      required: !diagram,
      detail: 'Add at least one - [ ] acceptance criterion.',
    },
    {
      key: 'verification',
      label: 'Verification plan',
      ok: diagram ? hasDiagram(entity.body) : hasTargets ? hasTest || manual : manual,
      required: true,
      detail: diagram
        ? 'Add an eraser, flow, or mermaid diagram block.'
        : 'Add target files and a test command, or a manual verification plan.',
    },
    {
      key: 'trace',
      label: 'Trace marker',
      ok: entity.body.includes(`@implements ${entity.id}`),
      required: hasTargets,
      detail: `Add // @implements ${entity.id} to the plan.`,
    },
    {
      key: 'definition',
      label: 'Definition of done',
      ok: hasHeading(entity.body, /definition of done|done when/i),
      required: !diagram,
      detail: 'Add a # Definition of done section.',
    },
    {
      key: 'out-of-scope',
      label: 'Out of scope',
      ok: hasHeading(entity.body, /out of scope|non-goals/i),
      required: false,
      detail: 'Add # Out of scope so the agent does not expand the task.',
    },
    {
      key: 'diagram',
      label: 'Diagram',
      ok: hasDiagram(entity.body),
      required: diagram,
      detail: 'Add an eraser, flow, or mermaid diagram block.',
    },
  ]

  const requiredItems = items.filter((item) => item.required)
  const recommendedItems = items.filter((item) => !item.required)
  const requiredOk = requiredItems.filter((item) => item.ok).length
  const recommendedOk = recommendedItems.filter((item) => item.ok).length
  const score =
    requiredItems.length === 0 ? 100 : Math.round((requiredOk / requiredItems.length) * 100)
  const overallScore = Math.round((items.filter((item) => item.ok).length / items.length) * 100)
  return {
    items,
    score,
    overallScore,
    ready: requiredOk === requiredItems.length,
    requiredOk,
    requiredTotal: requiredItems.length,
    recommendedOk,
    recommendedTotal: recommendedItems.length,
  }
}
