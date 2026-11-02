import { describe, expect, it } from 'vitest'
import { deriveGoalProgress } from './goals'

describe('deriveGoalProgress', () => {
  it('counts completed milestones and completed linked tasks', () => {
    expect(deriveGoalProgress({
      milestones: [{ completed: true }, { completed: false }],
      linkedTasks: [{ status: 'COMPLETED' }, { status: 'TODO' }],
    })).toEqual({ completed: 2, total: 4 })
  })

  it('changes when a milestone is completed and stores no percentage', () => {
    const before = deriveGoalProgress({
      milestones: [{ completed: false }],
      linkedTasks: [{ status: 'IN_PROGRESS' }],
    })
    const after = deriveGoalProgress({
      milestones: [{ completed: true }],
      linkedTasks: [{ status: 'IN_PROGRESS' }],
    })
    expect(before).toEqual({ completed: 0, total: 2 })
    expect(after.completed).toBe(before.completed + 1)
    expect(after).not.toHaveProperty('percentage')
  })

  it('is zero of zero when the goal has no milestones or tasks', () => {
    expect(deriveGoalProgress({ milestones: [], linkedTasks: [] })).toEqual({ completed: 0, total: 0 })
  })
})
