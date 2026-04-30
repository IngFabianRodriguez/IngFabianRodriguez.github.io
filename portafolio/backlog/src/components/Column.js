// src/components/Column.js — Apple Design Language

import { TaskStatus } from '../models/Task.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { store } from '../store/TaskStore.js'
import { notify } from '../utils/Notifications.js'

const columnConfig = {
  [TaskStatus.TODO]:         { title: 'Por hacer',  icon: '◻', color: 'var(--apple-secondary)' },
  [TaskStatus.IN_PROGRESS]: { title: 'En curso',   icon: '◉', color: 'var(--apple-orange)' },
  [TaskStatus.DONE]:        { title: 'Hecho',      icon: '✓', color: 'var(--apple-green)' }
}

export class TaskColumn extends HTMLElement {
  #status = null
  #tasks = []
  #unsubscribe = null
  #quickAddMode = false

  static get observedAttributes() { return ['status'] }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    this.setupDropZone()
    this.refresh()
  }

  disconnectedCallback() { this.#unsubscribe?.() }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'status' && oldVal !== newVal) {
      this.#status = newVal
      this.refresh()
    }
  }

  refresh() {
    if (!this.#status) return
    const criteria = store.getFilterCriteria()
    const filteredTasks = store.getFilteredTasks(criteria)
    this.#tasks = filteredTasks
      .filter(t => t.status === this.#status)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    this.render()
    this.setupDropZone()
  }

  setupDropZone() {
    const column = this.shadowRoot.querySelector('.column')
    const taskList = this.shadowRoot.querySelector('.task-list')
    if (!column || !taskList) return

    column.addEventListener('dragover', e => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      column.classList.add('drag-over')
      const cards = Array.from(taskList.querySelectorAll('task-card'))
      const afterElement = this.getDragAfterElement(cards, e.clientY)
      taskList.querySelectorAll('.drop-indicator').forEach(el => el.remove())
      const indicator = document.createElement('div')
      indicator.className = 'drop-indicator'
      indicator.style.cssText = `
        height: 2px;
        background: ${columnConfig[this.#status]?.color};
        border-radius: 1px;
        margin: 4px 0;
      `
      if (afterElement) {
        taskList.insertBefore(indicator, afterElement)
      } else {
        taskList.appendChild(indicator)
      }
    })

    column.addEventListener('dragleave', e => {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over')
        taskList.querySelectorAll('.drop-indicator').forEach(el => el.remove())
      }
    })

    column.addEventListener('drop', e => {
      e.preventDefault()
      column.classList.remove('drag-over')
      taskList.querySelectorAll('.drop-indicator').forEach(el => el.remove())
      const taskId = e.dataTransfer.getData('text/plain')
      if (!taskId) return
      const task = store.getTask(taskId)
      if (!task) return
      const cards = Array.from(taskList.querySelectorAll('task-card'))
      const afterElement = this.getDragAfterElement(cards, e.clientY)
      let newIndex = afterElement
        ? cards.indexOf(afterElement)
        : cards.length
      if (task.status === this.#status) {
        store.reorderTask(taskId, this.#status, newIndex)
      } else {
        store.moveTask(taskId, this.#status)
        if (newIndex > 0) store.reorderTask(taskId, this.#status, newIndex)
      }
      notify.success(`Tarea movida a ${columnConfig[this.#status]?.title}`)
      eventBus.emit(Events.TASK_MOVED, { taskId, newStatus: this.#status })
    })
  }

  getDragAfterElement(cards, y) {
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect()
      const offset = y - box.top - box.height / 2
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: card }
      }
      return closest
    }, { offset: Number.NEGATIVE_INFINITY }).element
  }

  render() {
    const config = columnConfig[this.#status] || { title: '—', icon: '', color: 'var(--apple-secondary)' }
    const columnPoints = this.#tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const isEmpty = this.#tasks.length === 0

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 280px;
          max-width: 360px;
          animation: fadeInUp 0.3s var(--ease-apple);
        }

        /* ─── Column card ─── */
        .column {
          background: var(--apple-surface-1);
          border: 0.5px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 0;
          height: fit-content;
          min-height: 160px;
          transition: border-color 0.2s, box-shadow 0.2s;
          overflow: hidden;
        }
        .column.drag-over {
          border-color: var(--apple-blue);
          box-shadow: 0 0 0 1px var(--apple-blue), var(--shadow-elevated);
        }

        /* ─── Column header ─── */
        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-4) var(--space-3);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
        }
        .column-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .column-icon {
          font-size: 14px;
          color: ${config.color};
        }
        .column-name {
          font-size: 13px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
          letter-spacing: 0.01em;
        }
        .column-count {
          font-size: 11px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-tertiary);
          background: var(--apple-surface-2);
          padding: 2px 8px;
          border-radius: 10px;
          min-width: 24px;
          text-align: center;
        }
        .column-right {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .points-badge {
          font-size: 10px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-tertiary);
          background: var(--apple-surface-2);
          padding: 2px 7px;
          border-radius: 6px;
        }
        .col-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 7px;
          color: var(--apple-tertiary);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s var(--ease-apple);
        }
        .col-btn:hover {
          background: var(--apple-surface-2);
          color: var(--apple-label);
        }

        /* ─── Task list ─── */
        .task-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-3);
          min-height: 100px;
        }
        .task-list.empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100px;
        }
        .empty-state {
          text-align: center;
          padding: var(--space-6);
        }
        .empty-icon {
          font-size: 28px;
          margin-bottom: var(--space-2);
          opacity: 0.4;
        }
        .empty-text {
          font-size: 12px;
          color: var(--apple-tertiary);
          line-height: 1.5;
        }

        /* ─── Quick add ─── */
        .quick-add {
          margin: 0 var(--space-3) var(--space-3);
          display: flex;
          gap: var(--space-2);
          animation: fadeInUp 0.2s var(--ease-apple);
        }
        .quick-add-input {
          flex: 1;
          background: var(--apple-bg);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          font-size: 13px;
          color: var(--apple-label);
          font-family: var(--font);
          transition: border-color 0.2s;
        }
        .quick-add-input:focus {
          outline: none;
          border-color: ${config.color};
        }
        .quick-add-input::placeholder { color: var(--apple-tertiary); }
        .quick-add-btn {
          padding: 9px 14px;
          background: ${config.color};
          border: none;
          border-radius: var(--radius-sm);
          color: #000;
          font-size: 14px;
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all 0.2s var(--ease-apple);
        }
        .quick-add-btn:hover { opacity: 0.85; transform: scale(1.03); }
        .quick-add-btn:active { transform: scale(0.97); }

        /* ─── Mobile ─── */
        @media (max-width: 768px) {
          :host {
            min-width: unset;
            max-width: unset;
            width: 100%;
          }
        }
      </style>

      <div class="column">
        <div class="column-header">
          <div class="column-title">
            <span class="column-icon">${config.icon}</span>
            <span class="column-name">${config.title}</span>
            <span class="column-count">${this.#tasks.length}</span>
          </div>
          <div class="column-right">
            <span class="points-badge">${columnPoints} pts</span>
            <button class="col-btn" id="quickAddBtn" title="Agregar tarea">+</button>
            <button class="col-btn" id="selectAllBtn" title="Seleccionar">☐</button>
          </div>
        </div>

        ${this.#quickAddMode ? `
          <div class="quick-add">
            <input type="text" class="quick-add-input" id="quickAddInput"
              placeholder="Nombre de la tarea..." autofocus />
            <button class="quick-add-btn" id="quickAddSubmit">✓</button>
          </div>
        ` : ''}

        <div class="task-list ${isEmpty ? 'empty' : ''}">
          ${isEmpty && !this.#quickAddMode ? `
            <div class="empty-state">
              <div class="empty-icon">${config.icon === '✓' ? '🎉' : '📭'}</div>
              <div class="empty-text">Sin tareas<br><span style="font-size:10px;opacity:0.6">Arrastra o presiona +</span></div>
            </div>
          ` : isEmpty ? `
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <div class="empty-text">Sin tareas</div>
            </div>
          ` : this.#tasks.map(task => `<task-card task-id="${task.id}"></task-card>`).join('')}
        </div>
      </div>
    `

    this.setupEventListeners()
    this.setupDropZone()
  }

  setupEventListeners() {
    this.shadowRoot.getElementById('quickAddBtn')?.addEventListener('click', () => {
      this.#quickAddMode = true
      this.render()
      setTimeout(() => this.shadowRoot.getElementById('quickAddInput')?.focus(), 10)
    })

    const input = this.shadowRoot.getElementById('quickAddInput')
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const title = e.target.value.trim()
        if (title) { store.addTaskQuick(title, this.#status); notify.success('Tarea creada') }
        this.#quickAddMode = false
        this.refresh()
      } else if (e.key === 'Escape') {
        this.#quickAddMode = false
        this.refresh()
      }
    })

    this.shadowRoot.getElementById('quickAddSubmit')?.addEventListener('click', () => {
      const title = input?.value.trim()
      if (title) { store.addTaskQuick(title, this.#status); notify.success('Tarea creada') }
      this.#quickAddMode = false
      this.refresh()
    })

    this.shadowRoot.getElementById('selectAllBtn')?.addEventListener('click', () => {
      this.#tasks.forEach(task => {
        window.dispatchEvent(new CustomEvent('toggle-task-selection', { detail: { taskId: task.id } }))
      })
    })
  }
}

customElements.define('task-column', TaskColumn)
