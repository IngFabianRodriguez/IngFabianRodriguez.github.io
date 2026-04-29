// src/models/Sprint.js

export const SprintStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed'
}

export function createSprint({
  id = crypto.randomUUID(),
  projectId,
  name,
  startDate,
  endDate,
  status = SprintStatus.ACTIVE
}) {
  return { id, projectId, name, startDate, endDate, status }
}

export function validateSprint(sprint) {
  const errors = []
  if (!sprint.projectId) {
    errors.push('El proyecto es requerido')
  }
  if (!sprint.name || sprint.name.trim().length === 0) {
    errors.push('El nombre del sprint es requerido')
  }
  if (sprint.name && sprint.name.length > 100) {
    errors.push('El nombre no puede exceder 100 caracteres')
  }
  if (!sprint.startDate) {
    errors.push('La fecha de inicio es requerida')
  }
  if (!sprint.endDate) {
    errors.push('La fecha de fin es requerida')
  }
  if (sprint.startDate && sprint.endDate && new Date(sprint.startDate) > new Date(sprint.endDate)) {
    errors.push('La fecha de fin debe ser posterior a la fecha de inicio')
  }
  if (!Object.values(SprintStatus).includes(sprint.status)) {
    errors.push('Estado inválido')
  }
  return { valid: errors.length === 0, errors }
}
