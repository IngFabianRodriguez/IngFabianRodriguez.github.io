// src/models/Task.js

export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
}

export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

export function createTask({
  title,
  description = '',
  status = TaskStatus.TODO,
  priority = TaskPriority.MEDIUM,
  storyPoints = null,
  tags = [],
  createdAt = new Date().toISOString(),
  updatedAt = new Date().toISOString()
}) {
  return {
    id: crypto.randomUUID(),
    title,
    description,
    status,
    priority,
    storyPoints,
    tags,
    createdAt,
    updatedAt
  }
}

export function validateTask(task) {
  const errors = []
  if (!task.title || task.title.trim().length === 0) {
    errors.push('El título es requerido')
  }
  if (task.title && task.title.length > 200) {
    errors.push('El título no puede exceder 200 caracteres')
  }
  if (!Object.values(TaskStatus).includes(task.status)) {
    errors.push('Estado inválido')
  }
  if (!Object.values(TaskPriority).includes(task.priority)) {
    errors.push('Prioridad inválida')
  }
  if (task.storyPoints !== null && (typeof task.storyPoints !== 'number' || task.storyPoints < 0 || task.storyPoints > 100)) {
    errors.push('Story points debe ser un número entre 0 y 100')
  }
  return { valid: errors.length === 0, errors }
}
