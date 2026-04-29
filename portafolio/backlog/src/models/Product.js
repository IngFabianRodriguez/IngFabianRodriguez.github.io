// src/models/Product.js

export function createProduct({
  id = crypto.randomUUID(),
  name,
  description = '',
  createdAt = new Date().toISOString(),
  updatedAt = new Date().toISOString()
}) {
  return { id, name, description, createdAt, updatedAt }
}

export function validateProduct(product) {
  const errors = []
  if (!product.name || product.name.trim().length === 0) {
    errors.push('El nombre del producto es requerido')
  }
  if (product.name && product.name.length > 100) {
    errors.push('El nombre no puede exceder 100 caracteres')
  }
  return { valid: errors.length === 0, errors }
}
