import { describe, expect, it } from 'vitest'
import {
  InvalidTaskStatusTransitionError,
  applyTaskFieldPatch,
  canTransitionTaskStatus,
  deriveEisenhowerQuadrant,
} from './index'

describe('task status transitions', () => {
  it('allows the supported workflow, including completing a to-do directly', () => {
    expect(canTransitionTaskStatus('TODO', 'IN_PROGRESS')).toBe(true)
    expect(canTransitionTaskStatus('TODO', 'COMPLETED')).toBe(true)
    expect(canTransitionTaskStatus('IN_PROGRESS', 'COMPLETED')).toBe(true)
    expect(canTransitionTaskStatus('IN_PROGRESS', 'TODO')).toBe(true)
    expect(canTransitionTaskStatus('COMPLETED', 'TODO')).toBe(true)
    expect(canTransitionTaskStatus('TODO', 'TODO')).toBe(true)
  })

  it('refuses to move a completed task straight back to in progress', () => {
    expect(canTransitionTaskStatus('COMPLETED', 'IN_PROGRESS')).toBe(false)
    expect(() =>
      applyTaskFieldPatch(
        { status: 'COMPLETED', isUrgent: true, isImportant: true },
        { status: 'IN_PROGRESS' },
      ),
    ).toThrow(InvalidTaskStatusTransitionError)
  })
})

describe('quadrant does not change status', () => {
  it('derives all four quadrants from the two flags', () => {
    expect(deriveEisenhowerQuadrant(true, true)).toBe('DO')
    expect(deriveEisenhowerQuadrant(false, true)).toBe('SCHEDULE')
    expect(deriveEisenhowerQuadrant(true, false)).toBe('DELEGATE')
    expect(deriveEisenhowerQuadrant(false, false)).toBe('ELIMINATE')
  })

  it('keeps status when only urgency or importance changes', () => {
    const current = { status: 'TODO' as const, isUrgent: false, isImportant: false, title: 'Ship' }
    const next = applyTaskFieldPatch(current, { isUrgent: true, isImportant: true })
    expect(next.status).toBe('TODO')
    expect(next.quadrant).toBe('DO')
    expect(next.title).toBe('Ship')
    expect(current.status).toBe('TODO')
  })

  it('does not partially apply a patch when the status transition is illegal', () => {
    const current = { status: 'COMPLETED' as const, isUrgent: true, isImportant: true }
    expect(() => applyTaskFieldPatch(current, { status: 'IN_PROGRESS', isUrgent: false })).toThrow(
      InvalidTaskStatusTransitionError,
    )
    expect(current).toEqual({ status: 'COMPLETED', isUrgent: true, isImportant: true })
  })

  it('changes status only when status is explicit, even if the quadrant also changes', () => {
    const next = applyTaskFieldPatch(
      { status: 'TODO', isUrgent: false, isImportant: false },
      { status: 'IN_PROGRESS', isUrgent: true, isImportant: true },
    )
    expect(next.status).toBe('IN_PROGRESS')
    expect(next.quadrant).toBe('DO')
  })
})
