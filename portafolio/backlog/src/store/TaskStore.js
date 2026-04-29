// src/store/TaskStore.js
// Unified store: Products → Projects → Sprints → Tasks

import { createProduct, validateProduct } from '../models/Product.js'
import { createProject, validateProject } from '../models/Project.js'
import { createSprint, validateSprint, SprintStatus } from '../models/Sprint.js'
import { createTask, validateTask, TaskStatus } from '../models/Task.js'

// LocalStorage keys
const PRODUCTS_KEY = 'scrum_products'
const PROJECTS_KEY = 'scrum_projects'
const SPRINTS_KEY  = 'scrum_sprints'
const TASKS_KEY    = 'scrum_tasks'
const FILTER_KEY   = 'scrum_filter'
const ACTIVE_KEY   = 'scrum_active' // { productId, projectId, sprintId }

class TaskStore {
  #products = []
  #projects = []
  #sprints  = []
  #tasks    = []
  #filterCriteria = { search: '', priority: '', tag: '' }
  #activeIds = { productId: null, projectId: null, sprintId: null }
  #subscribers = new Set()
  #initialized = false

  constructor() { this.#loadData() }

  // ── Load / Save ──────────────────────────────────────────────

  #loadData() {
    this.#products = this.#load(PRODUCTS_KEY)
    this.#projects = this.#load(PROJECTS_KEY)
    this.#sprints  = this.#load(SPRINTS_KEY)
    this.#tasks    = this.#load(TASKS_KEY)
    this.#filterCriteria = this.#load(FILTER_KEY) || { search: '', priority: '', tag: '' }
    this.#activeIds = this.#load(ACTIVE_KEY) || { productId: null, projectId: null, sprintId: null }
    this.#initialized = true

    // Create defaults if empty
    if (this.#products.length === 0) {
      const p = createProduct({ name: 'Mi Producto' })
      this.#products.push(p)
      this.#save(PRODUCTS_KEY, this.#products)
      this.#activeIds.productId = p.id
    }
    if (this.#activeIds.productId && !this.getProduct(this.#activeIds.productId)) {
      this.#activeIds.productId = this.#products[0]?.id ?? null
    }
    if (this.#activeIds.projectId && !this.getProject(this.#activeIds.projectId)) {
      this.#activeIds.projectId = null
    }
    if (this.#activeIds.sprintId && !this.getSprint(this.#activeIds.sprintId)) {
      this.#activeIds.sprintId = null
    }
    // Ensure active project has a default sprint
    if (this.#activeIds.projectId && this.getSprintsByProject(this.#activeIds.projectId).length === 0) {
      const sp = createSprint({
        name: 'Sprint 1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: SprintStatus.ACTIVE,
        projectId: this.#activeIds.projectId
      })
      this.#sprints.push(sp)
      this.#activeIds.sprintId = sp.id
      this.#save(SPRINTS_KEY, this.#sprints)
    }
    this.#save(ACTIVE_KEY, this.#activeIds)
  }

  #load(key) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : [] }
    catch { return [] }
  }

  #save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)) }
    catch (e) { console.error('Save error', key, e) }
  }

  #persist() { this.#notify() }

  subscribe(cb) {
    this.#subscribers.add(cb)
    return () => this.#subscribers.delete(cb)
  }

  #notify() {
    this.#subscribers.forEach(cb => cb(this.#tasks))
  }

  // ── Active selectors ─────────────────────────────────────────

  getActiveProductId()  { return this.#activeIds.productId }
  getActiveProjectId()  { return this.#activeIds.projectId }
  getActiveSprintId()  { return this.#activeIds.sprintId }

  setActiveProduct(productId) {
    this.#activeIds.productId = productId
    this.#activeIds.projectId = null
    this.#activeIds.sprintId = null
    this.#save(ACTIVE_KEY, this.#activeIds)
    this.#persist()
  }

  setActiveProject(projectId) {
    this.#activeIds.projectId = projectId
    this.#activeIds.sprintId  = null
    // Auto-select first sprint
    if (projectId) {
      const sprints = this.getSprintsByProject(projectId)
      this.#activeIds.sprintId = sprints[0]?.id ?? null
    }
    this.#save(ACTIVE_KEY, this.#activeIds)
    this.#persist()
  }

  setActiveSprint(sprintId) {
    this.#activeIds.sprintId = sprintId
    this.#save(ACTIVE_KEY, this.#activeIds)
    this.#persist()
  }

  // ── PRODUCTS ─────────────────────────────────────────────────

  getProducts() { return [...this.#products] }
  getProduct(id) { return this.#products.find(p => p.id === id) ?? null }

  addProduct(data) {
    const p = createProduct(data)
    const { valid, errors } = validateProduct(p)
    if (!valid) throw new Error(errors.join(', '))
    this.#products.push(p)
    this.#save(PRODUCTS_KEY, this.#products)
    this.#persist()
    return p
  }

  updateProduct(id, updates) {
    const i = this.#products.findIndex(p => p.id === id)
    if (i === -1) throw new Error(`Producto ${id} no encontrado`)
    this.#products[i] = { ...this.#products[i], ...updates, updatedAt: new Date().toISOString() }
    this.#save(PRODUCTS_KEY, this.#products)
    this.#persist()
    return this.#products[i]
  }

  deleteProduct(id) {
    // Remove all related projects, sprints, tasks
    const projectIds = this.#projects.filter(p => p.productId === id).map(p => p.id)
    projectIds.forEach(pid => this.deleteProject(pid))
    this.#products = this.#products.filter(p => p.id !== id)
    this.#save(PRODUCTS_KEY, this.#products)
    if (this.#activeIds.productId === id) {
      this.#activeIds.productId = this.#products[0]?.id ?? null
      this.#activeIds.projectId = null
      this.#activeIds.sprintId  = null
      this.#save(ACTIVE_KEY, this.#activeIds)
    }
    this.#persist()
  }

  // ── PROJECTS ─────────────────────────────────────────────────

  getProjects(productId = null) {
    if (!productId) productId = this.#activeIds.productId
    return this.#projects.filter(p => p.productId === productId)
  }

  getProject(id) { return this.#projects.find(p => p.id === id) ?? null }
  getProjectByProduct(productId) { return this.#projects.filter(p => p.productId === productId) }

  addProject(data) {
    const p = createProject({ ...data, productId: data.productId ?? this.#activeIds.productId })
    const { valid, errors } = validateProject(p)
    if (!valid) throw new Error(errors.join(', '))
    this.#projects.push(p)
    this.#save(PROJECTS_KEY, this.#projects)
    // Auto-create first sprint
    if (this.getSprintsByProject(p.id).length === 0) {
      const sp = createSprint({
        name: 'Sprint 1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: SprintStatus.ACTIVE,
        projectId: p.id
      })
      this.#sprints.push(sp)
      this.#save(SPRINTS_KEY, this.#sprints)
    }
    this.#persist()
    return p
  }

  updateProject(id, updates) {
    const i = this.#projects.findIndex(p => p.id === id)
    if (i === -1) throw new Error(`Proyecto ${id} no encontrado`)
    this.#projects[i] = { ...this.#projects[i], ...updates, updatedAt: new Date().toISOString() }
    this.#save(PROJECTS_KEY, this.#projects)
    this.#persist()
    return this.#projects[i]
  }

  deleteProject(id) {
    const sprintIds = this.#sprints.filter(s => s.projectId === id).map(s => s.id)
    this.#tasks = this.#tasks.filter(t => !sprintIds.includes(t.sprintId))
    this.#sprints = this.#sprints.filter(s => s.projectId !== id)
    this.#projects = this.#projects.filter(p => p.id !== id)
    this.#save(PROJECTS_KEY, this.#projects)
    this.#save(SPRINTS_KEY, this.#sprints)
    this.#save(TASKS_KEY, this.#tasks)
    if (this.#activeIds.projectId === id) {
      this.#activeIds.projectId = null
      this.#activeIds.sprintId  = null
      this.#save(ACTIVE_KEY, this.#activeIds)
    }
    this.#persist()
  }

  // ── SPRINTS ─────────────────────────────────────────────────

  getSprints(projectId = null) {
    if (!projectId) projectId = this.#activeIds.projectId
    return projectId ? this.#sprints.filter(s => s.projectId === projectId) : []
  }

  getSprintsByProject(projectId) { return this.#sprints.filter(s => s.projectId === projectId) }
  getSprint(id) { return this.#sprints.find(s => s.id === id) ?? null }

  addSprint(data) {
    const s = createSprint({ ...data, projectId: data.projectId ?? this.#activeIds.projectId })
    const { valid, errors } = validateSprint(s)
    if (!valid) throw new Error(errors.join(', '))
    this.#sprints.push(s)
    this.#save(SPRINTS_KEY, this.#sprints)
    this.#persist()
    return s
  }

  updateSprint(id, updates) {
    const i = this.#sprints.findIndex(s => s.id === id)
    if (i === -1) throw new Error(`Sprint ${id} no encontrado`)
    this.#sprints[i] = { ...this.#sprints[i], ...updates }
    this.#save(SPRINTS_KEY, this.#sprints)
    this.#persist()
    return this.#sprints[i]
  }

  deleteSprint(id) {
    this.#tasks = this.#tasks.filter(t => t.sprintId !== id)
    this.#sprints = this.#sprints.filter(s => s.id !== id)
    this.#save(SPRINTS_KEY, this.#sprints)
    this.#save(TASKS_KEY, this.#tasks)
    if (this.#activeIds.sprintId === id) {
      const remaining = this.getSprintsByProject(this.#activeIds.projectId)
      this.#activeIds.sprintId = remaining[0]?.id ?? null
      this.#save(ACTIVE_KEY, this.#activeIds)
    }
    this.#persist()
  }

  // ── TASKS ───────────────────────────────────────────────────

  getTasks() {
    let tasks = [...this.#tasks]
    if (this.#activeIds.sprintId) {
      tasks = tasks.filter(t => t.sprintId === this.#activeIds.sprintId)
    } else if (this.#activeIds.projectId) {
      const sprintIds = this.getSprintsByProject(this.#activeIds.projectId).map(s => s.id)
      tasks = tasks.filter(t => sprintIds.includes(t.sprintId))
    } else if (this.#activeIds.productId) {
      const projectIds = this.getProjectByProduct(this.#activeIds.productId).map(p => p.id)
      const sprintIds = this.#sprints.filter(s => projectIds.includes(s.projectId)).map(s => s.id)
      tasks = tasks.filter(t => sprintIds.includes(t.sprintId))
    }
    return tasks
  }

  getTasksByStatus(status) { return this.getTasks().filter(t => t.status === status) }
  getTask(id) { return this.#tasks.find(t => t.id === id) ?? null }

  addTask(data) {
    const sprintId = data.sprintId ?? this.#activeIds.sprintId ?? this.getSprints()[0]?.id
    const task = createTask({
      ...data,
      sprintId,
      position: this.#tasks.filter(t => t.sprintId === (sprintId ?? '')).length
    })
    const { valid, errors } = validateTask(task)
    if (!valid) throw new Error(errors.join(', '))
    this.#tasks.push(task)
    this.#save(TASKS_KEY, this.#tasks)
    this.#persist()
    return task
  }

  updateTask(id, updates) {
    const i = this.#tasks.findIndex(t => t.id === id)
    if (i === -1) throw new Error(`Tarea ${id} no encontrada`)
    this.#tasks[i] = { ...this.#tasks[i], ...updates, id, updatedAt: new Date().toISOString() }
    const { valid, errors } = validateTask(this.#tasks[i])
    if (!valid) throw new Error(errors.join(', '))
    this.#save(TASKS_KEY, this.#tasks)
    this.#persist()
    return this.#tasks[i]
  }

  deleteTask(id) {
    this.#tasks = this.#tasks.filter(t => t.id !== id)
    this.#save(TASKS_KEY, this.#tasks)
    this.#persist()
  }

  moveTask(id, newStatus) { return this.updateTask(id, { status: newStatus }) }

  reorderTask(taskId, newStatus, newIndex) {
    const task = this.getTask(taskId)
    if (!task) return
    const tasksOfStatus = this.getTasksByStatus(newStatus)
    // Update positions
    tasksOfStatus.forEach((t, i) => {
      const idx = this.#tasks.findIndex(x => x.id === t.id)
      if (idx !== -1) this.#tasks[idx].position = i
    })
    const taskIdx = this.#tasks.findIndex(t => t.id === taskId)
    if (taskIdx !== -1) {
      this.#tasks[taskIdx].status = newStatus
      this.#tasks[taskIdx].position = newIndex
    }
    this.#save(TASKS_KEY, this.#tasks)
    this.#persist()
  }

  // ── BACKWARD COMPAT: selected sprint ────────────────────────

  getSelectedSprintId() { return this.#activeIds.sprintId }
  setSelectedSprint(sprintId) { this.setActiveSprint(sprintId) }

  // ── STATS ───────────────────────────────────────────────────

  getStats() {
    const tasks = this.getTasks()
    const todo = tasks.filter(t => t.status === TaskStatus.TODO)
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS)
    const done = tasks.filter(t => t.status === TaskStatus.DONE)
    return {
      total: tasks.length,
      filteredTotal: tasks.length,
      todo: todo.length,
      inProgress: inProgress.length,
      done: done.length,
      totalPoints: tasks.reduce((s, t) => s + (t.storyPoints || 0), 0),
      donePoints: done.reduce((s, t) => s + (t.storyPoints || 0), 0),
      filteredPoints: tasks.reduce((s, t) => s + (t.storyPoints || 0), 0),
      filteredDonePoints: done.reduce((s, t) => s + (t.storyPoints || 0), 0)
    }
  }

  getSprintStats(sprintId) {
    const tasks = this.#tasks.filter(t => t.sprintId === sprintId)
    const done = tasks.filter(t => t.status === TaskStatus.DONE)
    return {
      total: tasks.length,
      done: done.length,
      totalPoints: tasks.reduce((s, t) => s + (t.storyPoints || 0), 0),
      donePoints: done.reduce((s, t) => s + (t.storyPoints || 0), 0)
    }
  }

  // ── FILTERS ─────────────────────────────────────────────────

  getFilterCriteria() { return { ...this.#filterCriteria } }

  setFilterCriteria(criteria) {
    this.#filterCriteria = { ...this.#filterCriteria, ...criteria }
    this.#save(FILTER_KEY, this.#filterCriteria)
    this.#persist()
  }

  clearFilters() {
    this.#filterCriteria = { search: '', priority: '', tag: '' }
    this.#save(FILTER_KEY, this.#filterCriteria)
    this.#persist()
  }

  getFilteredTasks(criteria) {
    const { search, priority, tag } = { ...this.#filterCriteria, ...criteria }
    let tasks = this.getTasks()
    if (search?.trim()) {
      const q = search.toLowerCase()
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    }
    if (priority && priority !== 'all') tasks = tasks.filter(t => t.priority === priority)
    if (tag && tag !== 'all') tasks = tasks.filter(t => t.tags?.includes(tag))
    return tasks
  }

  getAllTags() {
    const tags = new Set()
    this.getTasks().forEach(t => t.tags?.forEach(tag => tags.add(tag)))
    return Array.from(tags).sort()
  }

  getFilteredCount() { return this.getFilteredTasks(this.#filterCriteria).length }

  // Quick add
  addTaskQuick(title, status = TaskStatus.TODO) { return this.addTask({ title, status }) }

  // Reset
  reset() {
    this.#tasks = []
    this.#filterCriteria = { search: '', priority: '', tag: '' }
    this.#save(TASKS_KEY, this.#tasks)
    this.#save(FILTER_KEY, this.#filterCriteria)
    this.#persist()
  }
}

export const store = new TaskStore()
