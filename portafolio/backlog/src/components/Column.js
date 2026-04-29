// src/components/Column.js

import { TaskStatus } from '../models/Task.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { store } from '../store/TaskStore.js'
import { notify } from '../utils/Notifications.js'

const columnConfig = {
  [TaskStatus.TODO]: { title: '📋 To Do', color: '#89b4fa' },
  [TaskStatus.IN_PROGRESS]: { title: '⚡ In Progress', color: '#f9e2af' },
  [TaskStatus.DONE]: { title: '✅ Done', color: '#a6e3a1' }
}

export class TaskColumn extends HTMLElement {
  #status = null
  #tasks = []
  #unsubscribe = null
  #quickAddMode = false
  #dragSourceIndex = null
  #dragSourceStatus = null

  static get observedAttributes() {
    return ['status']
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    this.setupDropZone()
    this.refresh()
  }

  disconnectedCallback() {
    this.#unsubscribe?.()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'status' && oldVal !== newVal) {
      this.#status = newVal
      this.refresh()
    }
  }

  set status(val) {
    this.#status = val
    this.refresh()
  }

  refresh() {
    if (!this.#status) return

    const criteria = store.getFilterCriteria()
    const filteredTasks = store.getFilteredTasks(criteria)

    // Get tasks for this column, filtered and sorted
    let columnTasks = filteredTasks.filter(t => t.status === this.#status)

    // Sort by position
    columnTasks = columnTasks.sort((a, b) => (a.position || 0) - (b.position || 0))

    this.#tasks = columnTasks
    this.render()
    this.setupDropZone()
  }

  setupDropZone() {
    const column = this.shadowRoot.querySelector('.column')
    const taskList = this.shadowRoot.querySelector('.task-list')
    if (!column || !taskList) return

    column.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      column.classList.add('drag-over')
      
      // Find drop position indicator
      const cards = Array.from(taskList.querySelectorAll('task-card'))
      const afterElement = this.getDragAfterElement(cards, e.clientY)
      
      // Remove existing indicators
      taskList.querySelectorAll('.drop-indicator').forEach(el => el.remove())
      
      // Add indicator
      const indicator = document.createElement('div')
      indicator.className = 'drop-indicator'
      indicator.style.cssText = `
        height: 3px;
        background: ${columnConfig[this.#status]?.color || '#89b4fa'};
        border-radius: 2px;
        margin: 4px 0;
      `
      
      if (afterElement) {
        taskList.insertBefore(indicator, afterElement)
      } else {
        taskList.appendChild(indicator)
      }
    })

    column.addEventListener('dragleave', (e) => {
      // Only remove if leaving the column entirely
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over')
        taskList.querySelectorAll('.drop-indicator').forEach(el => el.remove())
      }
    })

    column.addEventListener('drop', (e) => {
      e.preventDefault()
      column.classList.remove('drag-over')
      taskList.querySelectorAll('.drop-indicator').forEach(el => el.remove())
      
      const taskId = e.dataTransfer.getData('text/plain')
      if (!taskId) return
      
      const task = store.getTask(taskId)
      if (!task) return
      
      // Calculate drop position
      const cards = Array.from(taskList.querySelectorAll('task-card'))
      const afterElement = this.getDragAfterElement(cards, e.clientY)
      let newIndex = 0
      
      if (afterElement) {
        const afterCardIndex = cards.indexOf(afterElement)
        newIndex = afterCardIndex
      } else {
        newIndex = cards.length
      }
      
      // Check if it's the same column
      if (task.status === this.#status) {
        // Reorder within same column
        store.reorderTask(taskId, this.#status, newIndex)
      } else {
        // Move to different column
        store.moveTask(taskId, this.#status)
        // If dropped at specific position, reorder
        if (newIndex > 0) {
          store.reorderTask(taskId, this.#status, newIndex)
        }
      }
      
      notify.success(`Tarea movida a ${columnConfig[this.#status]?.title || this.#status}`)
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
    const config = columnConfig[this.#status] || { title: 'Unknown', color: '#6c7086' }
    const columnPoints = this.#tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const isEmpty = this.#tasks.length === 0

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 300px;
          max-width: 400px;
        }
        .column {
          background: #181825;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: fit-content;
          min-height: 200px;
          transition: all 0.2s ease;
        }
        .column.drag-over {
          background: #1e1e2e;
          border: 2px dashed ${config.color};
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid ${config.color}33;
        }
        .column-title {
          font-size: 15px;
          font-weight: 600;
          color: #cdd6f4;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .task-count {
          background: ${config.color}22;
          color: ${config.color};
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .points-badge {
          font-size: 11px;
          color: #6c7086;
          background: #313244;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .column-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-add-task {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-add-task:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .btn-select-all {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-select-all:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 100px;
        }
        .task-list.empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #45475a;
          font-size: 13px;
          border: 2px dashed #313244;
          border-radius: 8px;
          min-height: 100px;
        }
        .empty-content {
          text-align: center;
          padding: 20px;
        }
        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .empty-message {
          font-size: 13px;
          color: #6c7086;
        }
        .quick-add-form {
          display: flex;
          gap: 6px;
          padding: 8px;
          background: #1e1e2e;
          border-radius: 8px;
          border: 1px solid ${config.color}44;
        }
        .quick-add-input {
          flex: 1;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 8px;
          font-size: 13px;
          color: #cdd6f4;
        }
        .quick-add-input:focus {
          outline: none;
          border-color: ${config.color};
        }
        .quick-add-input::placeholder {
          color: #6c7086;
        }
        .quick-add-btn {
          background: ${config.color};
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          color: #11111b;
        }
        .quick-add-btn:hover {
          opacity: 0.9;
        }
      </style>
      <div class="column">
        <div class="column-header">
          <span class="column-title">
            ${config.title}
            <span class="task-count">${this.#tasks.length}</span>
          </span>
          <div class="column-actions">
            <span class="points-badge">${columnPoints} pts</span>
            <button class="btn-add-task" id="quickAddBtn" title="Agregar tarea">➕</button>
            <button class="btn-select-all" id="selectAllBtn" title="Seleccionar todos">☐</button>
          </div>
        </div>
        
        ${this.#quickAddMode ? `
          <div class="quick-add-form">
            <input type="text" class="quick-add-input" id="quickAddInput" placeholder="Nombre de la tarea..." />
            <button class="quick-add-btn" id="quickAddSubmit">+</button>
          </div>
        ` : ''}
        
        <div class="task-list ${isEmpty ? 'empty' : ''}">
          ${isEmpty && !this.#quickAddMode ? `
            <div class="empty-content">
              <div class="empty-icon">📭</div>
              <div class="empty-message">Sin tareas</div>
              <div class="empty-message" style="margin-top:4px;font-size:11px">Arrastra aquí o presiona N</div>
            </div>
          ` : isEmpty ? `
            <div class="empty-content">
              <div class="empty-icon">📭</div>
              <div class="empty-message">Sin tareas</div>
            </div>
          ` : this.#tasks.map(task => `<task-card task-id="${task.id}"></task-card>`).join('')
          }
        </div>
      </div>
    `

    this.setupEventListeners()
    this.setupDropZone()
  }

  setupEventListeners() {
    // Quick add button
    this.shadowRoot.getElementById('quickAddBtn')?.addEventListener('click', () => {
      this.#quickAddMode = true
      this.render()
      setTimeout(() => {
        this.shadowRoot.getElementById('quickAddInput')?.focus()
      }, 10)
    })

    // Quick add input
    const quickAddInput = this.shadowRoot.getElementById('quickAddInput')
    quickAddInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const title = e.target.value.trim()
        if (title) {
          store.addTaskQuick(title, this.#status)
          notify.success('Tarea creada')
        }
        this.#quickAddMode = false
        this.refresh()
      } else if (e.key === 'Escape') {
        this.#quickAddMode = false
        this.refresh()
      }
    })

    // Quick add submit button
    this.shadowRoot.getElementById('quickAddSubmit')?.addEventListener('click', () => {
      const input = this.shadowRoot.getElementById('quickAddInput')
      const title = input?.value.trim()
      if (title) {
        store.addTaskQuick(title, this.#status)
        notify.success('Tarea creada')
      }
      this.#quickAddMode = false
      this.refresh()
    })

    // Select all button
    this.shadowRoot.getElementById('selectAllBtn')?.addEventListener('click', () => {
      this.#tasks.forEach(task => {
        window.dispatchEvent(new CustomEvent('toggle-task-selection', { detail: { taskId: task.id } }))
      })
    })
  }
}

customElements.define('task-column', TaskColumn)
