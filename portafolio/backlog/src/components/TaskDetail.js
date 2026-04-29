// src/components/TaskDetail.js

import { TaskStatus, TaskPriority } from '../models/Task.js'
import { SprintStatus } from '../models/Sprint.js'
import { store } from '../store/TaskStore.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { notify } from '../utils/Notifications.js'

export class TaskDetail extends HTMLElement {
  #task = null
  #isEditMode = false
  #unsubscribe = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    document.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnectedCallback() {
    this.#unsubscribe?.()
    document.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  handleKeydown(e) {
    if (e.key === 'Escape' && this.style.display !== 'none') {
      this.hide()
    }
  }

  show(taskId) {
    this.#task = store.getTask(taskId)
    if (!this.#task) return
    this.#isEditMode = false
    this.style.display = 'flex'
    this.render()
    requestAnimationFrame(() => {
      this.querySelector('.detail-backdrop')?.classList.add('active')
    })
  }

  hide() {
    const backdrop = this.querySelector('.detail-backdrop')
    if (backdrop) {
      backdrop.classList.remove('active')
      setTimeout(() => {
        this.style.display = 'none'
        this.innerHTML = ''
      }, 200)
    } else {
      this.style.display = 'none'
    }
  }

  refresh() {
    if (this.#task) {
      const updated = store.getTask(this.#task.id)
      if (updated) {
        this.#task = updated
        if (!this.#isEditMode) {
          this.render()
        }
      } else {
        this.hide()
      }
    }
  }

  render() {
    if (!this.#task) return

    const { id, title, description, status, priority, storyPoints, tags, sprintId, createdAt, updatedAt } = this.#task
    const sprint = sprintId ? store.getSprint(sprintId) : null
    const sprintName = sprint ? sprint.name : 'Backlog'

    const priorityLabels = {
      low: '🟢 Baja',
      medium: '🟡 Media',
      high: '🟠 Alta',
      critical: '🔴 Crítica'
    }

    const statusLabels = {
      todo: '📋 To Do',
      in_progress: '⚡ In Progress',
      done: '✅ Done'
    }

    this.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 900;
          justify-content: flex-end;
        }
        .detail-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .detail-backdrop.active {
          opacity: 1;
        }
        .detail-panel {
          position: relative;
          width: 400px;
          max-width: 100%;
          height: 100%;
          background: #1e1e2e;
          border-left: 1px solid #313244;
          overflow-y: auto;
          transform: translateX(100%);
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
        }
        .detail-backdrop.active .detail-panel {
          transform: translateX(0);
        }
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #313244;
          background: #181825;
        }
        .detail-title {
          font-size: 16px;
          font-weight: 700;
          color: #cdd6f4;
          margin: 0;
        }
        .btn-close {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .btn-close:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .detail-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
        .detail-section {
          margin-bottom: 20px;
        }
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #6c7086;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .detail-value {
          font-size: 14px;
          color: #cdd6f4;
          line-height: 1.5;
        }
        .detail-value.title-value {
          font-size: 18px;
          font-weight: 600;
        }
        .detail-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        .meta-badge.priority-low { background: #22c55e22; color: #22c55e; }
        .meta-badge.priority-medium { background: #f59e0b22; color: #f59e0b; }
        .meta-badge.priority-high { background: #f9731622; color: #f97316; }
        .meta-badge.priority-critical { background: #ef444422; color: #ef4444; }
        .meta-badge.status-todo { background: #89b4fa22; color: #89b4fa; }
        .meta-badge.status-in_progress { background: #f9e2af22; color: #f9e2af; }
        .meta-badge.status-done { background: #a6e3a122; color: #a6e3a1; }
        .meta-badge.points { background: #fab38722; color: #fab387; }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tag {
          font-size: 11px;
          padding: 3px 8px;
          background: #313244;
          border-radius: 4px;
          color: #a6adc8;
        }
        .detail-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #313244;
          background: #181825;
        }
        .btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-edit {
          background: #89b4fa;
          color: #11111b;
        }
        .btn-edit:hover {
          background: #b4befe;
        }
        .btn-delete {
          background: transparent;
          border: 1px solid #f38ba8;
          color: #f38ba8;
        }
        .btn-delete:hover {
          background: #f38ba822;
        }
        .btn-save {
          background: #a6e3a1;
          color: #11111b;
        }
        .btn-save:hover {
          background: #94e2d5;
        }
        .btn-cancel {
          background: #313244;
          color: #cdd6f4;
        }
        .btn-cancel:hover {
          background: #45475a;
        }
        .move-select {
          background: #181825;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd6f4;
          cursor: pointer;
          flex: 1;
        }
        .move-select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        /* Edit mode */
        .edit-form .form-group {
          margin-bottom: 16px;
        }
        .edit-form label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #6c7086;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .edit-form input,
        .edit-form textarea,
        .edit-form select {
          width: 100%;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 10px;
          font-size: 14px;
          color: #cdd6f4;
          box-sizing: border-box;
        }
        .edit-form input:focus,
        .edit-form textarea:focus,
        .edit-form select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .edit-form textarea {
          resize: vertical;
          min-height: 80px;
        }
        .priority-options {
          display: flex;
          gap: 8px;
        }
        .priority-option {
          flex: 1;
          padding: 8px;
          border: 1px solid #313244;
          border-radius: 6px;
          background: #11111b;
          color: #6c7086;
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .priority-option:hover {
          border-color: #585b70;
        }
        .priority-option.selected {
          border-color: currentColor;
        }
        .priority-option[data-priority="low"] { color: #22c55e; }
        .priority-option[data-priority="medium"] { color: #f59e0b; }
        .priority-option[data-priority="high"] { color: #f97316; }
        .priority-option[data-priority="critical"] { color: #ef4444; }
        .priority-option.selected {
          background: currentColor;
        }
        .priority-option.selected span {
          color: #11111b;
        }
      </style>
      
      <div class="detail-backdrop">
        <div class="detail-panel">
          <div class="detail-header">
            <h2 class="detail-title">${this.#isEditMode ? '✏️ Editar tarea' : '📋 Detalle'}</h2>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>
          
          ${this.#isEditMode ? this.renderEditForm() : this.renderViewMode(id, title, description, status, priority, storyPoints, tags, sprintName, createdAt, updatedAt, sprintLabels)}
          
          <div class="detail-actions">
            ${this.#isEditMode ? `
              <button class="btn btn-cancel" id="cancelBtn">Cancelar</button>
              <button class="btn btn-save" id="saveBtn">💾 Guardar</button>
            ` : `
              <select class="move-select" id="moveSelect">
                <option value="">Mover a...</option>
                <option value="todo" ${status === 'todo' ? 'disabled' : ''}>📋 To Do</option>
                <option value="in_progress" ${status === 'in_progress' ? 'disabled' : ''}>⚡ In Progress</option>
                <option value="done" ${status === 'done' ? 'disabled' : ''}>✅ Done</option>
              </select>
              <button class="btn btn-edit" id="editBtn">✏️ Editar</button>
              <button class="btn btn-delete" id="deleteBtn">🗑️</button>
            `}
          </div>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  renderViewMode(id, title, description, status, priority, storyPoints, tags, sprintName, createdAt, updatedAt) {
    const priorityLabels = { low: '🟢 Baja', medium: '🟡 Media', high: '🟠 Alta', critical: '🔴 Crítica' }
    const statusLabels = { todo: '📋 To Do', in_progress: '⚡ In Progress', done: '✅ Done' }

    return `
      <div class="detail-body">
        <div class="detail-section">
          <div class="detail-value title-value">${this.escapeHtml(title)}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Descripción</div>
          <div class="detail-value">${description ? this.escapeHtml(description) : '<em style="color:#6c7086">Sin descripción</em>'}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Estado</div>
          <span class="meta-badge status-${status}">${statusLabels[status]}</span>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Prioridad</div>
          <span class="meta-badge priority-${priority}">${priorityLabels[priority]}</span>
        </div>
        
        ${storyPoints !== null ? `
          <div class="detail-section">
            <div class="detail-label">Story Points</div>
            <span class="meta-badge points">⭐ ${storyPoints}</span>
          </div>
        ` : ''}
        
        ${tags && tags.length > 0 ? `
          <div class="detail-section">
            <div class="detail-label">Tags</div>
            <div class="tag-list">
              ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="detail-section">
          <div class="detail-label">Sprint</div>
          <div class="detail-value">${this.escapeHtml(sprintName)}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Fechas</div>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="detail-label" style="margin-bottom:2px">Creado</span>
              <span class="detail-value">${new Date(createdAt).toLocaleDateString('es-ES')}</span>
            </div>
            <div class="meta-item">
              <span class="detail-label" style="margin-bottom:2px">Actualizado</span>
              <span class="detail-value">${new Date(updatedAt).toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderEditForm() {
    const t = this.#task
    return `
      <div class="detail-body edit-form">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="editTitle" value="${this.escapeAttr(t.title)}" />
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea id="editDescription">${this.escapeAttr(t.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Prioridad</label>
          <div class="priority-options" id="priorityOptions">
            <button type="button" class="priority-option ${t.priority === 'low' ? 'selected' : ''}" data-priority="low"><span>🟢 Baja</span></button>
            <button type="button" class="priority-option ${t.priority === 'medium' ? 'selected' : ''}" data-priority="medium"><span>🟡 Media</span></button>
            <button type="button" class="priority-option ${t.priority === 'high' ? 'selected' : ''}" data-priority="high"><span>🟠 Alta</span></button>
            <button type="button" class="priority-option ${t.priority === 'critical' ? 'selected' : ''}" data-priority="critical"><span>🔴 Crítica</span></button>
          </div>
        </div>
        <div class="form-group">
          <label>Story Points</label>
          <input type="number" id="editPoints" value="${t.storyPoints ?? ''}" min="0" max="100" />
        </div>
      </div>
    `
  }

  setupEventListeners() {
    this.querySelector('#closeBtn')?.addEventListener('click', () => this.hide())
    
    this.querySelector('.detail-backdrop')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('detail-backdrop')) this.hide()
    })

    const editBtn = this.querySelector('#editBtn')
    editBtn?.addEventListener('click', () => {
      this.#isEditMode = true
      this.render()
    })

    const deleteBtn = this.querySelector('#deleteBtn')
    deleteBtn?.addEventListener('click', () => {
      if (confirm('¿Eliminar esta tarea?')) {
        const taskId = this.#task.id
        const taskTitle = this.#task.title
        const taskData = { ...this.#task }
        store.deleteTask(taskId)
        notify.delete(`Tarea "${taskTitle}" eliminada`, () => {
          // Undo delete
          try {
            store.addTask(taskData)
          } catch (e) {
            notify.error('No se pudo deshacer')
          }
        })
        this.hide()
      }
    })

    const moveSelect = this.querySelector('#moveSelect')
    moveSelect?.addEventListener('change', (e) => {
      if (e.target.value) {
        store.moveTask(this.#task.id, e.target.value)
        notify.success(`Tarea movida a ${e.target.options[e.target.selectedIndex].text}`)
        eventBus.emit(Events.TASK_MOVED, { taskId: this.#task.id, newStatus: e.target.value })
      }
    })

    // Edit mode handlers
    const cancelBtn = this.querySelector('#cancelBtn')
    cancelBtn?.addEventListener('click', () => {
      this.#isEditMode = false
      this.render()
    })

    const saveBtn = this.querySelector('#saveBtn')
    saveBtn?.addEventListener('click', () => {
      const title = this.querySelector('#editTitle')?.value.trim()
      const description = this.querySelector('#editDescription')?.value.trim() || ''
      const points = this.querySelector('#editPoints')?.value
      const priority = this.querySelector('.priority-option.selected')?.dataset.priority

      if (!title) {
        notify.error('El título es requerido')
        return
      }

      try {
        store.updateTask(this.#task.id, {
          title,
          description,
          storyPoints: points ? parseInt(points, 10) : null,
          priority
        })
        this.#isEditMode = false
        notify.success('Tarea actualizada')
        this.render()
      } catch (err) {
        notify.error(err.message)
      }
    })

    // Priority option selection in edit mode
    this.querySelectorAll('.priority-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.querySelectorAll('.priority-option').forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
      })
    })
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  escapeAttr(text) {
    return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}

customElements.define('task-detail', TaskDetail)
