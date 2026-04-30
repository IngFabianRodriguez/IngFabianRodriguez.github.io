// src/components/TaskCard.js — Apple Design Language

import { TaskPriority } from '../models/Task.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { store } from '../store/TaskStore.js'

const priorityConfig = {
  [TaskPriority.LOW]:      { color: 'var(--apple-green)',  label: 'Baja' },
  [TaskPriority.MEDIUM]:   { color: 'var(--apple-yellow)', label: 'Media' },
  [TaskPriority.HIGH]:     { color: 'var(--apple-orange)', label: 'Alta' },
  [TaskPriority.CRITICAL]: { color: 'var(--apple-red)',    label: 'Crítica' }
}

export class TaskCard extends HTMLElement {
  #task = null
  #selected = false
  #checked = false

  static get observedAttributes() { return ['task-id'] }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
    this.setupDrag()
    this.setupSelection()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'task-id' && oldVal !== newVal) {
      this.#task = store.getTask(newVal)
      this.render()
    }
  }

  set task(t) { this.#task = t; this.render() }
  get task() { return this.#task }

  set selected(v) {
    this.#selected = v
    this.shadowRoot.querySelector('.card')?.classList.toggle('selected', v)
  }
  get selected() { return this.#selected }

  set checked(v) {
    this.#checked = v
    const cb = this.shadowRoot.querySelector('.card-checkbox')
    if (cb) cb.checked = v
    this.shadowRoot.querySelector('.card')?.classList.toggle('checked', v)
  }
  get checked() { return this.#checked }

  setupSelection() {
    const card = this.shadowRoot.querySelector('.card')
    const checkbox = this.shadowRoot.querySelector('.card-checkbox')
    if (!card) return

    card.addEventListener('click', e => {
      if (e.target.closest('.card-checkbox') || e.target.closest('.card-actions')) return
      window.dispatchEvent(new CustomEvent('open-task-detail', {
        detail: { taskId: this.#task.id },
        bubbles: true
      }))
    })

    checkbox?.addEventListener('click', e => {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('toggle-task-selection', {
        detail: { taskId: this.#task.id },
        bubbles: true
      }))
    })
  }

  setupDrag() {
    const card = this.shadowRoot.querySelector('.card')
    if (!card) return
    card.setAttribute('draggable', 'true')

    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', this.#task.id)
      e.dataTransfer.effectAllowed = 'move'
      card.classList.add('dragging')
      eventBus.emit(Events.DRAG_START, { taskId: this.#task.id, status: this.#task.status })
    })

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging')
      eventBus.emit(Events.DRAG_END, {})
    })
  }

  render() {
    if (!this.#task) return

    const { id, title, description, priority, storyPoints, tags } = this.#task
    const priorityCfg = priorityConfig[priority] || priorityConfig[TaskPriority.MEDIUM]

    const tagsHtml = tags.length > 0
      ? `<div class="tags">${tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</div>`
      : ''

    const pointsHtml = storyPoints !== null
      ? `<span class="points">${storyPoints}pt</span>`
      : ''

    const descPreview = description.length > 90
      ? description.substring(0, 90) + '…'
      : description

    this.shadowRoot.innerHTML = `
      <style>
        /* ─── Card ─── */
        .card {
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-3) var(--space-3);
          cursor: grab;
          transition:
            transform 0.25s var(--ease-apple),
            box-shadow 0.25s var(--ease-apple),
            border-color 0.2s,
            background 0.2s;
          position: relative;
          animation: fadeInUp 0.25s var(--ease-apple);
        }
        .card:hover {
          background: var(--apple-surface-3);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
          box-shadow: var(--shadow-card);
        }
        .card:active { cursor: grabbing; }
        .card.dragging {
          opacity: 0.4;
          transform: scale(0.97);
          box-shadow: none;
        }
        .card.selected {
          border-color: var(--apple-blue);
          box-shadow: 0 0 0 1.5px var(--apple-blue);
        }
        .card.checked {
          background: rgba(10, 132, 255, 0.06);
        }

        /* ─── Priority stripe (left accent) ─── */
        .priority-stripe {
          position: absolute;
          left: 0;
          top: 12px;
          bottom: 12px;
          width: 3px;
          border-radius: 0 2px 2px 0;
          background: ${priorityCfg.color};
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .card:hover .priority-stripe { opacity: 1; }

        /* ─── Checkbox ─── */
        .card-checkbox-wrap {
          position: absolute;
          top: 10px;
          right: 10px;
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card:hover .card-checkbox-wrap,
        .card.checked .card-checkbox-wrap {
          opacity: 1;
        }
        .card-checkbox {
          width: 17px;
          height: 17px;
          cursor: pointer;
          accent-color: var(--apple-blue);
          border-radius: 4px;
        }

        /* ─── Content ─── */
        .card-body {
          padding-left: 14px;
        }
        .card-title {
          font-size: 13px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-label);
          line-height: 1.45;
          margin: 0 0 6px 0;
          padding-right: 24px;
          letter-spacing: -0.005em;
        }
        .card-desc {
          font-size: 12px;
          color: var(--apple-secondary);
          margin: 0 0 8px 0;
          line-height: 1.5;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 8px;
        }
        .tag {
          font-size: 10px;
          font-weight: var(--font-weight-medium);
          padding: 3px 8px;
          background: var(--apple-surface-3);
          border-radius: 6px;
          color: var(--apple-secondary);
          letter-spacing: 0.01em;
        }

        /* ─── Footer ─── */
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }
        .priority-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: var(--font-weight-medium);
          color: ${priorityCfg.color};
          background: ${priorityCfg.color}18;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.01em;
        }
        .priority-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .points {
          font-size: 11px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-secondary);
          background: var(--apple-surface-3);
          padding: 3px 8px;
          border-radius: 6px;
        }

        /* ─── Actions ─── */
        .card-actions {
          display: flex;
          gap: 3px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card:hover .card-actions { opacity: 1; }
        .action-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--apple-tertiary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s;
        }
        .action-btn:hover {
          background: var(--apple-surface-3);
          color: var(--apple-label);
        }
        .action-btn.delete:hover { color: var(--apple-red); }
      </style>

      <div class="card ${this.#selected ? 'selected' : ''} ${this.#checked ? 'checked' : ''}">
        <div class="priority-stripe"></div>
        <div class="card-checkbox-wrap">
          <input type="checkbox" class="card-checkbox" ${this.#checked ? 'checked' : ''} />
        </div>

        <div class="card-body">
          <p class="card-title">${this.escapeHtml(title)}</p>
          ${descPreview ? `<p class="card-desc">${this.escapeHtml(descPreview)}</p>` : ''}
          ${tagsHtml}

          <div class="card-footer">
            <div class="priority-badge">
              <span class="priority-dot"></span>
              <span>${priorityCfg.label}</span>
            </div>
            ${pointsHtml}
            <div class="card-actions">
              <button class="action-btn edit" data-action="edit" title="Editar">✏</button>
              <button class="action-btn delete" data-action="delete" title="Eliminar">🗑</button>
            </div>
          </div>
        </div>
      </div>
    `

    this.setupSelection()
    this.setupDrag()

    this.shadowRoot.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const action = btn.dataset.action
        if (action === 'edit') {
          this.dispatchEvent(new CustomEvent('task-edit', { detail: { id }, bubbles: true, composed: true }))
        } else if (action === 'delete') {
          if (confirm('¿Eliminar esta tarea?')) {
            store.deleteTask(id)
          }
        }
      })
    })
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

customElements.define('task-card', TaskCard)
