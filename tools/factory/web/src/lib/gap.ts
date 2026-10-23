import type { Entity, Result } from '../types'

export type GapSeverity = 'none' | 'warn' | 'fail' | 'unknown'

export type Gap = {
  severity: GapSeverity
  label: string
  detail: string
}

export function entityGap(entity: Entity, result: Result | undefined, running: boolean): Gap {
  if (running) {
    return { severity: 'warn', label: 'Running', detail: 'Verification is running.' }
  }
  if (!result) {
    if (entity.status === 'done') {
      return {
        severity: 'fail',
        label: 'Done without evidence',
        detail: 'Status is done but no verification result exists.',
      }
    }
    if (entity.status === 'verify') {
      return {
        severity: 'warn',
        label: 'Waiting for verification',
        detail: 'Status is verify but no result exists yet.',
      }
    }
    return { severity: 'unknown', label: 'Not verified', detail: 'No verification result yet.' }
  }
  if (result.passed && entity.status === 'done') {
    return { severity: 'none', label: 'No gap', detail: 'Checks passed and status is done.' }
  }
  if (result.passed) {
    return {
      severity: 'warn',
      label: 'Passed, not done',
      detail: `Checks passed but status is ${entity.status}.`,
    }
  }
  const failed = result.checks.find((check) => check.status === 'fail')
  return {
    severity: 'fail',
    label: 'Failed',
    detail: failed ? `${failed.name}: ${failed.detail}` : result.message || 'Verification failed.',
  }
}

export type GapSummary = {
  total: number
  done: number
  passed: number
  failed: number
  unverified: number
  gaps: number
  warnings: number
}

export function summarizeGaps(
  entities: Entity[],
  results: Record<string, Result>,
  running: Record<string, boolean>,
): GapSummary {
  const summary: GapSummary = {
    total: entities.length,
    done: 0,
    passed: 0,
    failed: 0,
    unverified: 0,
    gaps: 0,
    warnings: 0,
  }
  for (const entity of entities) {
    if (entity.status === 'done') summary.done += 1
    const result = results[entity.id]
    if (!result) summary.unverified += 1
    else if (result.passed) summary.passed += 1
    else summary.failed += 1
    const gap = entityGap(entity, result, Boolean(running[entity.id]))
    if (gap.severity === 'fail') summary.gaps += 1
    if (gap.severity === 'warn') summary.warnings += 1
  }
  return summary
}
