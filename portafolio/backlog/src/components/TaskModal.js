// src/components/TaskModal.js — Apple Design Language

import { TaskStatus, TaskPriority } from '../models/Task.js'
import { store } from '../store/TaskStore.js'

export class TaskModal extends HTMLElement {
  #task = null
  #isEdit = false

  connectedCallback() {
    this.addEventListener('task-edit', (e) => {
      const task = store.getTask(e.detail.id)
      if (task) { this.#task = task; this.#isEdit = true; this.show() }
    })

    this.addEventListener('open-create-modal', () => {
      this.#task = null; this.#isEdit = false; this.show()
    })

    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide()
    })
  }

  show() {
    this.style.display = 'flex'
    this.render()
    requestAnimationFrame(() => this.querySelector('.modal-backdrop')?.classList.add('active'))
  }

  hide() {
    const backdrop = this.querySelector('.modal-backdrop')
    if (backdrop) {
      backdrop.classList.remove('active')
      setTimeout(() => {
        this.style.display = 'none'
        this.innerHTML = ''
      }, 250)
    } else {
      this.style.display = 'none'
    }
  }

  render() {
    const t = this.#task || {
      title: '', description: '', status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM, storyPoints: null, tags: []
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
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px) saturate(150%);
          -webkit-backdrop-filter: blur(6px) saturate(150%);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .modal-backdrop.active { opacity: 1; }

        .modal {
          position: relative;
          background: var(--apple-surface-1);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          width: 90%;
          max-width: 540px;
          box-shadow: var(--shadow-modal);
          transform: translateY(16px) scale(0.97);
          transition: transform 0.3s cubic-bezier(0.34,1.2,0.64,1);
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-backdrop.active .modal {
          transform: translateY(0) scale(1);
        }

        /* ─── Header ─── */
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-5);
        }
        .modal-title {
          font-size: 20px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
          letter-spacing: -0.015em;
          margin: 0;
        }
        .btn-close {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: none;
          border-radius: 7px;
          color: var(--apple-tertiary);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .btn-close:hover {
          background: var(--apple-surface-2);
          color: var(--apple-label);
        }

        /* ─── Form ─── */
        .form-group { margin-bottom: var(--space-4); }
        .form-group label {
          display: block;
          font-size: 11px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--apple-tertiary);
          margin-bottom: 6px;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          background: var(--apple-bg);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          padding: 11px 14px;
          font-size: 14px;
          color: var(--apple-label);
          font-family: var(--font);
          box-sizing: border-box;
          transition: border-color 0.2s;
          appearance: none;
        }
        .form-group input::placeholder,
        .form-group textarea::placeholder { color: var(--apple-tertiary); }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--apple-blue);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .row {
          display: flex;
          gap: var(--space-3);
        }
        .row .form-group { flex: 1; }

        /* ─── Priority grid ─── */
        .priority-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-2);
        }
        .priority-opt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 6px;
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 10px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-secondary);
          transition: all 0.2s var(--ease-apple);
          font-family: var(--font);
        }
        .priority-opt:hover {
          background: var(--apple-surface-3);
          color: var(--apple-label);
        }
        .priority-opt.selected {
          border-color: var(--apple-blue);
          background: var(--apple-blue-fill);
          color: var(--apple-blue);
        }
        .priority-opt[data-priority="low"].selected {
          border-color: var(--apple-green);
          background: rgba(48,209,88,0.12);
          color: var(--apple-green);
        }
        .priority-opt[data-priority="medium"].selected {
          border-color: var(--apple-yellow);
          background: rgba(255,214,10,0.12);
          color: var(--apple-yellow);
        }
        .priority-opt[data-priority="high"].selected {
          border-color: var(--apple-orange);
          background: rgba(255,159,10,0.12);
          color: var(--apple-orange);
        }
        .priority-opt[data-priority="critical"].selected {
          border-color: var(--apple-red);
          background: rgba(255,69,58,0.12);
          color: var(--apple-red);
        }
        .priority-icon { font-size: 18px; line-height: 1; }

        /* ─── Tags input ─── */
        .tags-input {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          padding: 9px 12px;
          background: var(--apple-bg);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          min-height: 44px;
          transition: border-color 0.2s;
        }
        .tags-input:focus-within { border-color: var(--apple-blue); }
        .tag-item {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--apple-surface-2);
          padding: 3px 8px 3px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-label);
        }
        .tag-remove {
          background: none;
          border: none;
          color: var(--apple-tertiary);
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          line-height: 1;
          transition: color 0.15s;
        }
        .tag-remove:hover { color: var(--apple-red); }
        .tag-input-field {
          flex: 1;
          min-width: 80px;
          background: none;
          border: none;
          padding: 4px;
          font-size: 13px;
          color: var(--apple-label);
          font-family: var(--font);
        }
        .tag-input-field:focus { outline: none; }

        /* ─── Submit ─── */
        .btn-submit {
          width: 100%;
          background: var(--apple-blue);
          color: #fff;
          border: none;
          padding: 13px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all 0.2s var(--ease-apple);
          margin-top: var(--space-3);
          letter-spacing: 0.01em;
          font-family: var(--font);
        }
        .btn-submit:hover {
          background: #2593ff;
          transform: scale(1.005);
        }
        .btn-submit:active { transform: scale(0.995); }

        /* ─── Status select ─── */
        .status-select-wrap {
          position: relative;
        }
        .status-select-wrap select {
          padding-right: 32px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2398989d'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        /* ─── Error ─── */
        .error-message {
          color: var(--apple-red);
          font-size: 12px;
          margin-top: 4px;
          display: none;
        }
        .error-message.visible { display: block; }

        /* ─── Mobile ─── */
        @media (max-width: 540px) {
          .modal { padding: var(--space-5); border-radius: var(--radius-lg); }
          .priority-grid { grid-template-columns: repeat(2, 1fr); }
          .row { flex-direction: column; }
        }
      </style>

      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${this.#isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>

          <form id="taskForm" novalidate>
            <div class="form-group">
              <label for="title">Título</label>
              <input type="text" id="title" name="title"
                value="${this.escapeAttr(t.title)}"
                placeholder="¿Qué necesitas hacer?"
                maxlength="200" required />
              <div class="error-message" id="titleError">El título es requerido</div>
            </div>

            <div class="form-group">
              <label for="description">Descripción</label>
              <textarea id="description" name="description"
                placeholder="Detalles adicionales, links, notas…">${this.escapeAttr(t.description)}</textarea>
            </div>

            <div class="row">
              <div class="form-group">
                <label>Estado</label>
                <div class="status-select-wrap">
                  <select id="status" name="status">
                    <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>◻ Por hacer</option>
                    <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>◉ En curso</option>
                    <option value="done" ${t.status === 'done' ? 'selected' : ''}>✓ Hecho</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="storyPoints">Story Points</label>
                <input type="number" id="storyPoints" name="storyPoints"
                  value="${t.storyPoints ?? ''}"
                  placeholder="0" min="0" max="100" />
              </div>
            </div>

            <div class="form-group" id="sprintFormGroup" style="display:${store.getActiveProjectId() ? 'block' : 'none'}">
              <label for="sprintSelect">Sprint</label>
              <select id="sprintSelect" name="sprint">
                <option value="">— Sin sprint —</option>
                ${store.getSprints(store.getActiveProjectId()).map(s => `
                  <option value="${s.id}" ${(t.sprintId ?? store.getActiveSprintId()) === s.id ? 'selected' : ''}>
                    ${this.escapeHtml(s.name)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Prioridad</label>
              <div class="priority-grid">
                <button type="button" class="priority-opt ${t.priority === 'low' ? 'selected' : ''}" data-priority="low">
                  <span class="priority-icon">🟢</span>
                  Baja
                </button>
                <button type="button" class="priority-opt ${t.priority === 'medium' ? 'selected' : ''}" data-priority="medium">
                  <span class="priority-icon">🟡</span>
                  Media
                </button>
                <button type="button" class="priority-opt ${t.priority === 'high' ? 'selected' : ''}" data-priority="high">
                  <span class="priority-icon">🟠</span>
                  Alta
                </button>
                <button type="button" class="priority-opt ${t.priority === 'critical' ? 'selected' : ''}" data-priority="critical">
                  <span class="priority-icon">🔴</span>
                  Crítica
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Etiquetas</label>
              <div class="tags-input" id="tagsInput">
                ${(t.tags || []).map(tag => `
                  <span class="tag-item">
                    ${this.escapeHtml(tag)}
                    <button type="button" class="tag-remove" data-tag="${this.escapeAttr(tag)}">✕</button>
                  </span>
                `).join('')}
                <input type="text" class="tag-input-field" placeholder="Agregar tag y presionar Enter…" id="tagInputField" />
              </div>
            </div>

            <button type="submit" class="btn-submit">
              ${this.#isEdit ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </form>
        </div>
      </div>
    `

    this.setupEventListeners()
  }

  setupEventListeners() {
    this.querySelector('#closeBtn')?.addEventListener('click', () => this.hide())
    this.querySelector('.modal-backdrop')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-backdrop')) this.hide()
    })

    // Priority
    this.querySelectorAll('.priority-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        this.querySelectorAll('.priority-opt').forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
      })
    })

    // Tags
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
      btn.addEventListener('click', () => btn.parentElement.remove())
    })

    // Form
    this.querySelector('#taskForm')?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleSubmit()
    })
  }

  addTagToUI(tag) {
    const tagsInput = this.querySelector('#tagsInput')
    const tagInputField = this.querySelector('#tagInputField')
    if (!tagsInput) return
    const existing = Array.from(tagsInput.querySelectorAll('.tag-item'))
      .map(t => t.textContent.replace('✕', '').trim())
    if (existing.includes(tag)) return
    const tagEl = document.createElement('span')
    tagEl.className = 'tag-item'
    tagEl.innerHTML = `${this.escapeHtml(tag)}<button type="button" class="tag-remove" data-tag="${this.escapeAttr(tag)}">✕</button>`
    tagsInput.insertBefore(tagEl, tagInputField)
    tagEl.querySelector('.tag-remove')?.addEventListener('click', () => tagEl.remove())
  }

  handleSubmit() {
    const title = this.querySelector('#title')?.value.trim()
    const titleError = this.querySelector('#titleError')

    if (!title) {
      this.querySelector('#title')?.focus()
      titleError?.classList.add('visible')
      return
    }
    titleError?.classList.remove('visible')

    const description = this.querySelector('#description')?.value.trim() || ''
    const status = this.querySelector('#status')?.value || 'todo'
    const storyPoints = this.querySelector('#storyPoints')?.value
    const priority = this.querySelector('.priority-opt.selected')?.dataset.priority || 'medium'
    const tags = Array.from(this.querySelectorAll('.tag-item'))
      .map(t => t.textContent.replace('✕', '').trim())
    const sprintId = this.querySelector('#sprintSelect')?.value || null

    try {
      if (this.#isEdit) {
        store.updateTask(this.#task.id, {
          title, description, status, priority,
          storyPoints: storyPoints ? parseInt(storyPoints, 10) : null,
          tags, sprintId
        })
      } else {
        store.addTask({ title, description, status, priority,
          storyPoints: storyPoints ? parseInt(storyPoints, 10) : null,
          tags, sprintId })
      }
      this.hide()
    } catch (err) {
      const errEl = this.querySelector('#titleError')
      if (errEl) { errEl.textContent = err.message; errEl.classList.add('visible') }
    }
  }

  escapeHtml(text) {
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML
  }
  escapeAttr(text) {
    return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}

customElements.define('task-modal', TaskModal)
