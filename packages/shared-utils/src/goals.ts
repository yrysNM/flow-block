export interface GoalProgress {
  completed: number
  total: number
}

/**
 * Progress is the count of completed milestones plus linked tasks whose status is COMPLETED.
 * Nothing is stored, so the number cannot drift from those rows.
 */
export function deriveGoalProgress(input: {
  milestones: ReadonlyArray<{ completed: boolean }>
  linkedTasks: ReadonlyArray<{ status: string }>
}): GoalProgress {
  const milestonesDone = input.milestones.filter((milestone) => milestone.completed).length
  const tasksDone = input.linkedTasks.filter((task) => task.status === 'COMPLETED').length
  return {
    completed: milestonesDone + tasksDone,
    total: input.milestones.length + input.linkedTasks.length,
  }
}
