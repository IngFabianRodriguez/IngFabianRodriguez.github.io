// src/components/TaskModal.js

import { TaskStatus, TaskPriority } from '../models/Task.js'
import { store } from '../store/TaskStore.js'

export class TaskModal extends HTMLElement {
  #task = null
  #isEdit = false

  connectedCallback() {
    this.addEventListener('task-edit', (e) => {
      const task = store.getTask(e.detail.id)
      if (task) {
        this.#task = task
        this.#isEdit = true
        this.show()
      }
    })

    this.addEventListener('open-create-modal', () => {
      this.#task = null
      this.#isEdit = false
      this.show()
    })

    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide()
    })
  }

  show() {
    this.style.display = 'flex'
    this.render()
    requestAnimationFrame(() => {
      this.querySelector('.modal-backdrop')?.classList.add('active')
    })
  }

  hide() {
    const backdrop = this.querySelector('.modal-backdrop')
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

  render() {
    const t = this.#task || {
      title: '',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      storyPoints: null,
      tags: []
    }

    this.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 1000;
          justify-content: center;
          align-items: center;
        }
        .modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .modal-backdrop.active {
          opacity: 1;
        }
        .modal {
          position: relative;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 16px;
          padding: 24px;
          width: 90%;
          max-width: 560px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          transform: translateY(20px);
          transition: transform 0.2s;
        }
        .modal-backdrop.active .modal {
          transform: translateY(0);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .modal-title {
          font-size: 18px;
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
        .form-group {
          margin-bottom: 16px;
        }
        label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #a6adc8;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        input, textarea, select {
          width: 100%;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          color: #cdd6f4;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        textarea {
          resize: vertical;
          min-height: 80px;
        }
        select {
          cursor: pointer;
        }
        .row {
          display: flex;
          gap: 12px;
        }
        .row .form-group {
          flex: 1;
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
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .priority-option:hover {
          border-color: #585b70;
        }
        .priority-option.selected {
          border-color: currentColor;
          background: currentColor;
        }
        .priority-option[data-priority="low"] { color: #22c55e; }
        .priority-option[data-priority="medium"] { color: #f59e0b; }
        .priority-option[data-priority="high"] { color: #f97316; }
        .priority-option[data-priority="critical"] { color: #ef4444; }
        .priority-option.selected span {
          color: #11111b;
          display: block;
        }
        .priority-option span {
          display: block;
        }
        .tags-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 8px;
          min-height: 42px;
        }
        .tags-input:focus-within {
          border-color: #89b4fa;
        }
        .tag-item {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #313244;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #cdd6f4;
        }
        .tag-remove {
          background: none;
          border: none;
          color: #6c7086;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          line-height: 1;
        }
        .tag-remove:hover {
          color: #f38ba8;
        }
        .tag-input-field {
          flex: 1;
          min-width: 80px;
          background: none;
          border: none;
          padding: 4px;
          font-size: 13px;
          color: #cdd6f4;
        }
        .tag-input-field:focus {
          outline: none;
        }
        .btn-submit {
          width: 100%;
          background: #89b4fa;
          color: #11111b;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }
        .btn-submit:hover {
          background: #b4befe;
        }
        .error-message {
          color: #f38ba8;
          font-size: 12px;
          margin-top: 4px;
        }
      </style>
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${this.#isEdit ? '✏️ Editar tarea' : '➕ Nueva tarea'}</h2>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>
          <form id="taskForm">
            <div class="form-group">
              <label for="title">Título *</label>
              <input type="text" id="title" name="title" value="${this.escapeAttr(t.title)}" placeholder="¿Qué necesitas hacer?" maxlength="200" required />
            </div>
            <div class="form-group">
              <label for="description">Descripción</label>
              <textarea id="description" name="description" placeholder="Detalles adicionales, links, notas...">${this.escapeAttr(t.description)}</textarea>
            </div>
            <div class="row">
              <div class="form-group">
                <label for="status">Estado</label>
                <select id="status" name="status">
                  <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>📋 To Do</option>
                  <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>⚡ In Progress</option>
                  <option value="done" ${t.status === 'done' ? 'selected' : ''}>✅ Done</option>
                </select>
              </div>
              <div class="form-group">
                <label for="storyPoints">Story Points</label>
                <input type="number" id="storyPoints" name="storyPoints" value="${t.storyPoints ?? ''}" placeholder="0" min="0" max="100" />
              </div>
            </div>
            <div class="form-group" id="sprintFormGroup" style="display:${store.getActiveProjectId() ? 'block' : 'none'}">
              <label for="sprintSelect">Sprint</label>
              <select id="sprintSelect" name="sprint">
                <option value="">— Sin sprint —</option>
                ${store.getSprints(store.getActiveProjectId()).map(s => `
                  <option value="${s.id}" ${(t.sprintId ?? store.getActiveSprintId()) === s.id ? 'selected' : ''}>${this.escapeHtml(s.name)}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Prioridad</label>
              <div class="priority-options">
                <button type="button" class="priority-option ${t.priority === 'low' ? 'selected' : ''}" data-priority="low"><span>🟢 Baja</span></button>
                <button type="button" class="priority-option ${t.priority === 'medium' ? 'selected' : ''}" data-priority="medium"><span>🟡 Media</span></button>
                <button type="button" class="priority-option ${t.priority === 'high' ? 'selected' : ''}" data-priority="high"><span>🟠 Alta</span></button>
                <button type="button" class="priority-option ${t.priority === 'critical' ? 'selected' : ''}" data-priority="critical"><span>🔴 Crítica</span></button>
              </div>
            </div>
            <div class="form-group">
              <label>Tags</label>
              <div class="tags-input" id="tagsInput">
                ${(t.tags || []).map(tag => `
                  <span class="tag-item">
                    ${this.escapeHtml(tag)}
                    <button type="button" class="tag-remove" data-tag="${this.escapeAttr(tag)}">✕</button>
                  </span>
                `).join('')}
                <input type="text" class="tag-input-field" placeholder="Agregar tag..." id="tagInputField" />
              </div>
            </div>
            <button type="submit" class="btn-submit">
              ${this.#isEdit ? '💾 Guardar cambios' : '🚀 Crear tarea'}
            </button>
          </form>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  setupEventListeners() {
    this.querySelector('#closeBtn')?.addEventListener('click', () => this.hide())

    this.querySelector('.modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) this.hide()
    })

    // Priority buttons
    this.querySelectorAll('.priority-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.querySelectorAll('.priority-option').forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
      })
    })

    // Tags input
    const tagInputField = this.querySelector('#tagInputField')
    tagInputField?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        const tag = tagInputField.value.trim().replace(',', '')
        if (tag) {
          this.addTagToUI(tag)
          tagInputField.value = ''
        }
      }
    })

    this.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.parentElement.remove()
      })
    })

    // Form submit
    this.querySelector('#taskForm')?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleSubmit()
    })
  }

  addTagToUI(tag) {
    const tagsInput = this.querySelector('#tagsInput')
    const tagInputField = this.querySelector('#tagInputField')
    if (!tagsInput) return

    const existing = Array.from(tagsInput.querySelectorAll('.tag-item')).map(t => t.textContent.replace('✕', '').trim())
    if (existing.includes(tag)) return

    const tagEl = document.createElement('span')
    tagEl.className = 'tag-item'
    tagEl.innerHTML = `${this.escapeHtml(tag)}<button type="button" class="tag-remove" data-tag="${this.escapeAttr(tag)}">✕</button>`
    tagsInput.insertBefore(tagEl, tagInputField)

    tagEl.querySelector('.tag-remove')?.addEventListener('click', () => tagEl.remove())
  }

  handleSubmit() {
    const title = this.querySelector('#title')?.value.trim()
    const description = this.querySelector('#description')?.value.trim() || ''
    const status = this.querySelector('#status')?.value || 'todo'
    const storyPoints = this.querySelector('#storyPoints')?.value
    const priority = this.querySelector('.priority-option.selected')?.dataset.priority || 'medium'
    const tags = Array.from(this.querySelectorAll('.tag-item')).map(t => t.textContent.replace('✕', '').trim())
    const sprintId = this.querySelector('#sprintSelect')?.value || null

    const taskData = {
      title,
      description,
      status,
      priority,
      storyPoints: storyPoints ? parseInt(storyPoints, 10) : null,
      tags,
      sprintId
    }

    try {
      if (this.#isEdit) {
        store.updateTask(this.#task.id, taskData)
      } else {
        store.addTask(taskData)
      }
      this.hide()
    } catch (err) {
      const errorEl = this.querySelector('.error-message') || this.insertErrorEl()
      if (errorEl) errorEl.textContent = err.message
    }
  }

  insertErrorEl() {
    const errorEl = document.createElement('div')
    errorEl.className = 'error-message'
    this.querySelector('#taskForm')?.appendChild(errorEl)
    return errorEl
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}

customElements.define('task-modal', TaskModal)
