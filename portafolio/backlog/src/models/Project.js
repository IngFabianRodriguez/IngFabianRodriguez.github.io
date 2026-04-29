// src/models/Project.js

export function createProject({
  id = crypto.randomUUID(),
  productId,
  name,
  description = '',
  createdAt = new Date().toISOString(),
  updatedAt = new Date().toISOString()
}) {
  return { id, productId, name, description, createdAt, updatedAt }
}

export function validateProject(project) {
  const errors = []
  if (!project.productId) {
    errors.push('El producto es requerido')
  }
  if (!project.name || project.name.trim().length === 0) {
    errors.push('El nombre del proyecto es requerido')
  }
  if (project.name && project.name.length > 100) {
    errors.push('El nombre no puede exceder 100 caracteres')
  }
  return { valid: errors.length === 0, errors }
}
