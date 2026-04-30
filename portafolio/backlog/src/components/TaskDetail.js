// src/components/TaskDetail.js — Apple Design Language

import { TaskStatus, TaskPriority } from '../models/Task.js'
import { store } from '../store/TaskStore.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { notify } from '../utils/Notifications.js'

export class TaskDetail extends HTMLElement {
  #task = null
  #isEditMode = false
  #unsubscribe = null

  constructor() { super(); this.attachShadow({ mode: 'open' }) }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    document.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnectedCallback() {
    this.#unsubscribe?.()
    document.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  handleKeydown(e) {
    if (e.key === 'Escape' && this.style.display !== 'none') this.hide()
  }

  show(taskId) {
    this.#task = store.getTask(taskId)
    if (!this.#task) return
    this.#isEditMode = false
    this.style.display = 'flex'
    this.render()
    requestAnimationFrame(() => this.shadowRoot.querySelector('.detail-backdrop')?.classList.add('active'))
  }

  hide() {
    const backdrop = this.shadowRoot.querySelector('.detail-backdrop')
    if (backdrop) {
      backdrop.classList.remove('active')
      setTimeout(() => {
        this.style.display = 'none'
        this.shadowRoot.innerHTML = ''
      }, 250)
    } else {
      this.style.display = 'none'
    }
  }

  refresh() {
    if (this.#task) {
      const updated = store.getTask(this.#task.id)
      if (updated) {
        this.#task = updated
        if (!this.#isEditMode) this.render()
      } else {
        this.hide()
      }
    }
  }

  render() {
    if (!this.#task) return
    const { id, title, description, status, priority, storyPoints, tags, sprintId, createdAt, updatedAt } = this.#task
    const sprint = sprintId ? store.getSprint(sprintId) : null

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
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .detail-backdrop.active { opacity: 1; }

        /* ─── Panel ─── */
        .detail-panel {
          position: relative;
          width: 380px;
          max-width: 100%;
          height: 100%;
          background: var(--apple-surface-1);
          border-left: 0.5px solid rgba(255,255,255,0.06);
          overflow-y: auto;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
          display: flex;
          flex-direction: column;
        }
        .detail-backdrop.active .detail-panel {
          transform: translateX(0);
        }

        /* ─── Header ─── */
        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-5);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          background: rgba(0,0,0,0.2);
        }
        .detail-label-tag {
          font-size: 10px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--apple-tertiary);
        }
        .btn-close {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: none;
          border-radius: 7px;
          color: var(--apple-secondary);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .btn-close:hover { background: var(--apple-surface-2); color: var(--apple-label); }

        /* ─── Body ─── */
        .detail-body {
          flex: 1;
          padding: var(--space-5);
          overflow-y: auto;
        }
        .section { margin-bottom: var(--space-5); }
        .section-title {
          font-size: 10px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--apple-tertiary);
          margin-bottom: var(--space-2);
        }
        .task-title {
          font-size: 20px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
          letter-spacing: -0.015em;
          line-height: 1.3;
          margin: 0;
        }
        .task-desc {
          font-size: 13px;
          color: var(--apple-secondary);
          line-height: 1.6;
          margin: var(--space-2) 0 0;
        }

        /* ─── Badges row ─── */
        .badges-row {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        .badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.01em;
        }
        .badge-priority {
          background: var(--apple-surface-2);
          color: var(--apple-secondary);
        }
        .badge-points {
          background: var(--apple-surface-2);
          color: var(--apple-secondary);
        }

        /* ─── Tags ─── */
        .tags-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .tag {
          font-size: 11px;
          padding: 4px 10px;
          background: var(--apple-surface-2);
          border-radius: 6px;
          color: var(--apple-secondary);
          font-weight: var(--font-weight-medium);
        }

        /* ─── Meta info ─── */
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        .meta-cell {
          background: var(--apple-surface-2);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
        }
        .meta-cell-label {
          font-size: 10px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--apple-tertiary);
          margin-bottom: 4px;
        }
        .meta-cell-value {
          font-size: 13px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-label);
        }

        /* ─── Footer actions ─── */
        .detail-footer {
          display: flex;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-5);
          border-top: 0.5px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.15);
          flex-shrink: 0;
        }
        .btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all 0.2s var(--ease-apple);
          font-family: var(--font);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-primary { background: var(--apple-blue); color: #fff; }
        .btn-primary:hover { background: #2593ff; transform: scale(1.01); }
        .btn-secondary { background: var(--apple-surface-2); color: var(--apple-label); border: 0.5px solid rgba(255,255,255,0.08); }
        .btn-secondary:hover { background: var(--apple-surface-3); }
        .btn-danger { background: transparent; border: 0.5px solid rgba(255,69,58,0.3); color: var(--apple-red); }
        .btn-danger:hover { background: rgba(255,69,58,0.1); }

        /* ─── Move select ─── */
        .move-select {
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 13px;
          color: var(--apple-label);
          cursor: pointer;
          font-family: var(--font);
          flex: 1;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2398989d'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }
        .move-select:focus { outline: none; border-color: var(--apple-blue); }

        /* ─── Edit form ─── */
        .edit-form { }
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
        .form-group textarea {
          width: 100%;
          background: var(--apple-bg);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 14px;
          color: var(--apple-label);
          font-family: var(--font);
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--apple-blue);
        }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .priority-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-2);
        }
        .priority-opt {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-secondary);
          transition: all 0.15s;
          font-family: var(--font);
        }
        .priority-opt:hover { background: var(--apple-surface-3); color: var(--apple-label); }
        .priority-opt.selected {
          border-color: var(--apple-blue);
          background: var(--apple-blue-fill);
          color: var(--apple-blue);
        }
        .priority-opt[data-priority="low"].selected { border-color: var(--apple-green); background: rgba(48,209,88,0.12); color: var(--apple-green); }
        .priority-opt[data-priority="medium"].selected { border-color: var(--apple-yellow); background: rgba(255,214,10,0.12); color: var(--apple-yellow); }
        .priority-opt[data-priority="high"].selected { border-color: var(--apple-orange); background: rgba(255,159,10,0.12); color: var(--apple-orange); }
        .priority-opt[data-priority="critical"].selected { border-color: var(--apple-red); background: rgba(255,69,58,0.12); color: var(--apple-red); }

        /* ─── Mobile ─── */
        @media (max-width: 480px) {
          .detail-panel { width: 100%; }
        }
      </style>

      <div class="detail-backdrop">
        <div class="detail-panel">
          <div class="detail-header">
            <span class="detail-label-tag">${this.#isEditMode ? 'Editar' : 'Detalle'}</span>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>

          ${this.#isEditMode ? this.#renderEditForm() : this.#renderViewMode()}

          <div class="detail-footer">
            ${this.#isEditMode ? `
              <button class="btn btn-secondary" id="cancelBtn">Cancelar</button>
              <button class="btn btn-primary" id="saveBtn">Guardar</button>
            ` : `
              <select class="move-select" id="moveSelect">
                <option value="">Mover a…</option>
                <option value="todo" ${status==='todo'?'disabled':''}>◻ Por hacer</option>
                <option value="in_progress" ${status==='in_progress'?'disabled':''}>◉ En curso</option>
                <option value="done" ${status==='done'?'disabled':''}>✓ Hecho</option>
              </select>
              <button class="btn btn-secondary" id="editBtn">Editar</button>
              <button class="btn btn-danger" id="deleteBtn">🗑</button>
            `}
          </div>
        </div>
      </div>
    `

    this.#setupEventListeners()
  }

  #renderViewMode() {
    const { title, description, status, priority, storyPoints, tags, sprintId, createdAt, updatedAt } = this.#task
    const sprint = sprintId ? store.getSprint(sprintId) : null
    const sprintName = sprint?.name ?? 'Backlog'

    const priorityLabel = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }[priority] || 'Media'
    const priorityColor = { low: 'var(--apple-green)', medium: 'var(--apple-yellow)', high: 'var(--apple-orange)', critical: 'var(--apple-red)' }[priority] || 'var(--apple-secondary)'

    const statusLabel = { todo: 'Por hacer', in_progress: 'En curso', done: 'Hecho' }[status] || status
    const statusIcon = { todo: '◻', in_progress: '◉', done: '✓' }[status] || '◻'

    return `
      <div class="detail-body">
        <div class="section">
          <p class="task-title">${this.escapeHtml(title)}</p>
        </div>

        ${description ? `
          <div class="section">
            <div class="section-title">Descripción</div>
            <p class="task-desc">${this.escapeHtml(description)}</p>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Estado y Prioridad</div>
          <div class="badges-row">
            <span class="badge" style="background:rgba(10,132,255,0.12);color:var(--apple-blue)">${statusIcon} ${statusLabel}</span>
            <span class="badge badge-priority" style="color:${priorityColor}">
              <span style="width:6px;height:6px;border-radius:50%;background:${priorityColor};display:inline-block"></span>
              ${priorityLabel}
            </span>
            ${storyPoints !== null ? `<span class="badge badge-points">${storyPoints} pt</span>` : ''}
          </div>
        </div>

        ${tags?.length ? `
          <div class="section">
            <div class="section-title">Etiquetas</div>
            <div class="tags-wrap">
              ${tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Sprint</div>
          <div class="badges-row">
            <span class="badge badge-priority">🎯 ${this.escapeHtml(sprintName)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Tiempos</div>
          <div class="meta-grid">
            <div class="meta-cell">
              <div class="meta-cell-label">Creado</div>
              <div class="meta-cell-value">${new Date(createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
            <div class="meta-cell">
              <div class="meta-cell-label">Actualizado</div>
              <div class="meta-cell-value">${new Date(updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  #renderEditForm() {
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
          <label>Puntos</label>
          <input type="number" id="editPoints" value="${t.storyPoints ?? ''}" min="0" max="100" />
        </div>
        <div class="form-group">
          <label>Prioridad</label>
          <div class="priority-options">
            ${['low','medium','high','critical'].map(p => `
              <button type="button" class="priority-opt ${t.priority === p ? 'selected' : ''}" data-priority="${p}">
                ${p === 'low' ? '🟢' : p === 'medium' ? '🟡' : p === 'high' ? '🟠' : '🔴'}
                ${p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Crítica'}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `
  }

  #setupEventListeners() {
    this.shadowRoot.getElementById('closeBtn')?.addEventListener('click', () => this.hide())
    this.shadowRoot.querySelector('.detail-backdrop')?.addEventListener('click', e => {
      if (e.target.classList.contains('detail-backdrop')) this.hide()
    })

    this.shadowRoot.getElementById('editBtn')?.addEventListener('click', () => {
      this.#isEditMode = true; this.render()
    })

    this.shadowRoot.getElementById('deleteBtn')?.addEventListener('click', () => {
      if (confirm('¿Eliminar esta tarea?')) {
        const data = { ...this.#task }
        store.deleteTask(this.#task.id)
        notify.delete(`"${this.#task.title}" eliminada`, () => {
          try { store.addTask(data) } catch { notify.error('No se pudo deshacer') }
        })
        this.hide()
      }
    })

    this.shadowRoot.getElementById('moveSelect')?.addEventListener('change', e => {
      if (e.target.value) {
        store.moveTask(this.#task.id, e.target.value)
        notify.success('Tarea movida')
        eventBus.emit(Events.TASK_MOVED, { taskId: this.#task.id, newStatus: e.target.value })
      }
    })

    // Edit mode
    this.shadowRoot.getElementById('cancelBtn')?.addEventListener('click', () => {
      this.#isEditMode = false; this.render()
    })

    this.shadowRoot.getElementById('saveBtn')?.addEventListener('click', () => {
      const title = this.shadowRoot.getElementById('editTitle')?.value.trim()
      const description = this.shadowRoot.getElementById('editDescription')?.value.trim() || ''
      const points = this.shadowRoot.getElementById('editPoints')?.value
      const priority = this.shadowRoot.querySelector('.priority-opt.selected')?.dataset.priority
      if (!title) { notify.error('El título es requerido'); return }
      try {
        store.updateTask(this.#task.id, { title, description, storyPoints: points ? parseInt(points) : null, priority })
        this.#isEditMode = false
        notify.success('Tarea actualizada')
        this.render()
      } catch (e) { notify.error(e.message) }
    })

    // Priority selection in edit mode
    this.shadowRoot.querySelectorAll('.priority-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.priority-opt').forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
      })
    })
  }

  escapeHtml(text) {
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML
  }
  escapeAttr(text) {
    return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}

customElements.define('task-detail', TaskDetail)
