// src/components/TaskCard.js

import { TaskPriority } from '../models/Task.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { store } from '../store/TaskStore.js'

const priorityColors = {
  [TaskPriority.LOW]: '#22c55e',
  [TaskPriority.MEDIUM]: '#f59e0b',
  [TaskPriority.HIGH]: '#f97316',
  [TaskPriority.CRITICAL]: '#ef4444'
}

export class TaskCard extends HTMLElement {
  #task = null
  #selected = false
  #checked = false

  static get observedAttributes() {
    return ['task-id']
  }

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

  set task(task) {
    this.#task = task
    this.render()
    this.setupDrag()
    this.setupSelection()
  }

  get task() {
    return this.#task
  }

  set selected(val) {
    this.#selected = val
    const card = this.shadowRoot.querySelector('.card')
    if (card) {
      card.classList.toggle('selected', val)
    }
  }

  get selected() {
    return this.#selected
  }

  set checked(val) {
    this.#checked = val
    const checkbox = this.shadowRoot.querySelector('.card-checkbox')
    if (checkbox) {
      checkbox.checked = val
      const card = this.shadowRoot.querySelector('.card')
      card?.classList.toggle('checked', val)
    }
  }

  get checked() {
    return this.#checked
  }

  setupSelection() {
    const card = this.shadowRoot.querySelector('.card')
    const checkbox = this.shadowRoot.querySelector('.card-checkbox')
    if (!card) return

    // Click on card body opens detail view
    card.addEventListener('click', (e) => {
      // Don't open detail if clicking checkbox or action buttons
      if (e.target.closest('.card-checkbox') || e.target.closest('.actions')) return
      
      // Dispatch event to open task detail
      window.dispatchEvent(new CustomEvent('open-task-detail', { 
        detail: { taskId: this.#task.id },
        bubbles: true
      }))
    })

    // Checkbox click
    checkbox?.addEventListener('click', (e) => {
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

    card.addEventListener('dragstart', (e) => {
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

    const tagsHtml = tags.length > 0
      ? `<div class="tags">${tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</div>`
      : ''

    const pointsHtml = storyPoints !== null
      ? `<span class="points">${storyPoints}</span>`
      : ''

    const descPreview = description.length > 80
      ? description.substring(0, 80) + '...'
      : description

    this.shadowRoot.innerHTML = `
      <style>
        .card {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 12px;
          cursor: grab;
          transition: all 0.2s ease;
          position: relative;
        }
        .card:hover {
          border-color: #585b70;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .card.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }
        .card.selected {
          border-color: #89b4fa;
          box-shadow: 0 0 0 2px #89b4fa44;
        }
        .card.checked {
          background: #252535;
        }
        .card-checkbox-wrap {
          position: absolute;
          top: 8px;
          left: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card:hover .card-checkbox-wrap,
        .card.checked .card-checkbox-wrap {
          opacity: 1;
        }
        .card-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #89b4fa;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          padding-left: 20px;
        }
        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .title {
          font-size: 14px;
          font-weight: 500;
          color: #cdd6f4;
          margin: 0;
          flex: 1;
          margin-left: 8px;
          line-height: 1.4;
        }
        .description {
          font-size: 12px;
          color: #6c7086;
          margin: 0 0 8px 0;
          line-height: 1.5;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }
        .tag {
          font-size: 10px;
          padding: 2px 6px;
          background: #313244;
          border-radius: 4px;
          color: #a6adc8;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .points {
          font-size: 11px;
          font-weight: 600;
          color: #fab387;
          background: rgba(250, 179, 135, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card:hover .actions {
          opacity: 1;
        }
        .btn-action {
          background: none;
          border: none;
          color: #6c7086;
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-action:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .btn-action.delete:hover {
          color: #f38ba8;
        }
      </style>
      <div class="card ${this.#selected ? 'selected' : ''} ${this.#checked ? 'checked' : ''}">
        <div class="card-checkbox-wrap">
          <input type="checkbox" class="card-checkbox" ${this.#checked ? 'checked' : ''} />
        </div>
        <div class="card-header">
          <span class="priority-dot" style="background: ${priorityColors[priority]}"></span>
          <p class="title">${this.escapeHtml(title)}</p>
        </div>
        ${descPreview ? `<p class="description">${this.escapeHtml(descPreview)}</p>` : ''}
        ${tagsHtml}
        <div class="card-footer">
          ${pointsHtml}
          <div class="actions">
            <button class="btn-action edit" title="Editar" data-action="edit">✏️</button>
            <button class="btn-action delete" title="Eliminar" data-action="delete">🗑️</button>
          </div>
        </div>
      </div>
    `

    this.setupSelection()
    this.setupDrag()

    this.shadowRoot.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
