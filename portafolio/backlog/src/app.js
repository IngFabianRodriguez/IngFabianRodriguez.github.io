// src/app.js

import './components/Header.js'
import './components/SprintSidebar.js'
import './components/FilterBar.js'
import './components/Column.js'
import './components/TaskCard.js'
import './components/TaskModal.js'
import './components/TaskDetail.js'
import './components/BurndownChart.js'
import { TaskStatus } from './models/Task.js'
import { store } from './store/TaskStore.js'
import { eventBus, Events } from './utils/EventBus.js'
import { notify } from './utils/Notifications.js'

// App state
let selectedTaskId = null
let selectedTaskIds = new Set()

export function initApp() {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML = `
    <app-header></app-header>
    <div class="main-container">
      <sprint-sidebar></sprint-sidebar>
      <div class="content-area">
        <filter-bar></filter-bar>
        <main class="board">
          <task-column status="${TaskStatus.TODO}"></task-column>
          <task-column status="${TaskStatus.IN_PROGRESS}"></task-column>
          <task-column status="${TaskStatus.DONE}"></task-column>
        </main>
        <burndown-chart></burndown-chart>
      </div>
    </div>
    <task-modal></task-modal>
    <task-detail></task-detail>
    <bulk-action-bar></bulk-action-bar>
  `

  // Add styles
  const style = document.createElement('style')
  style.textContent = `
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      height: calc(100vh - 73px);
    }
    .content-area {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .board {
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      flex: 1;
      overflow-x: auto;
      align-items: flex-start;
    }
    .board::-webkit-scrollbar {
      height: 6px;
    }
    .board::-webkit-scrollbar-track {
      background: transparent;
    }
    .board::-webkit-scrollbar-thumb {
      background: var(--bg-card);
      border-radius: 3px;
    }
    @media (max-width: 768px) {
      .main-container {
        flex-direction: column;
      }
      sprint-sidebar {
        width: 100%;
        min-width: unset;
        height: auto;
        max-height: 200px;
        border-right: none;
        border-bottom: 1px solid #313244;
      }
      .board {
        min-width: 280px;
      }
    }
  `
  app.appendChild(style)

  // Task detail panel
  const taskDetail = app.querySelector('task-detail')

  // Bulk action bar component
  class BulkActionBar extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
      this.render()
      window.addEventListener('update-bulk-bar', () => this.render())
    }

    render() {
      const count = selectedTaskIds.size
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 800;
            display: ${count > 0 ? 'block' : 'none'};
          }
          .bulk-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #1e1e2e;
            border: 1px solid #313244;
            border-radius: 12px;
            padding: 12px 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          }
          .bulk-count {
            font-size: 14px;
            font-weight: 600;
            color: #cdd6f4;
            white-space: nowrap;
          }
          .bulk-select {
            background: #11111b;
            border: 1px solid #313244;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 13px;
            color: #cdd6f4;
            cursor: pointer;
          }
          .bulk-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .bulk-btn.move {
            background: #89b4fa;
            color: #11111b;
          }
          .bulk-btn.delete {
            background: transparent;
            border: 1px solid #f38ba8;
            color: #f38ba8;
          }
          .bulk-btn.clear {
            background: #313244;
            color: #cdd6f4;
          }
          .bulk-btn:hover {
            opacity: 0.9;
          }
        </style>
        <div class="bulk-bar">
          <span class="bulk-count">${count} seleccionada${count !== 1 ? 's' : ''}</span>
          <select class="bulk-select" id="bulkMoveSelect">
            <option value="">Mover a...</option>
            <option value="todo">📋 To Do</option>
            <option value="in_progress">⚡ In Progress</option>
            <option value="done">✅ Done</option>
          </select>
          <button class="bulk-btn delete" id="bulkDeleteBtn">🗑️ Eliminar</button>
          <button class="bulk-btn clear" id="bulkClearBtn">Limpiar</button>
        </div>
      `

      this.setupListeners()
    }

    setupListeners() {
      const moveSelect = this.shadowRoot.getElementById('bulkMoveSelect')
      moveSelect?.addEventListener('change', (e) => {
        if (e.target.value) {
          selectedTaskIds.forEach(id => {
            store.moveTask(id, e.target.value)
          })
          notify.success(`${selectedTaskIds.size} tareas movidas`)
          clearSelection()
        }
      })

      const deleteBtn = this.shadowRoot.getElementById('bulkDeleteBtn')
      deleteBtn?.addEventListener('click', () => {
        if (confirm(`¿Eliminar ${selectedTaskIds.size} tareas?`)) {
          const count = selectedTaskIds.size
          selectedTaskIds.forEach(id => {
            store.deleteTask(id)
          })
          notify.info(`${count} tareas eliminadas`)
          clearSelection()
        }
      })

      const clearBtn = this.shadowRoot.getElementById('bulkClearBtn')
      clearBtn?.addEventListener('click', () => {
        clearSelection()
      })
    }
  }
  customElements.define('bulk-action-bar', BulkActionBar)

  // Task selection and detail handling
  window.addEventListener('open-task-detail', (e) => {
    taskDetail?.show(e.detail.taskId)
  })

  // Toggle task selection
  window.addEventListener('toggle-task-selection', (e) => {
    toggleTaskSelection(e.detail.taskId)
  })

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const target = e.target
    const isInput = target.matches('input, textarea, select')

    // Escape - close panels
    if (e.key === 'Escape') {
      taskDetail?.hide()
      document.querySelector('task-modal')?.hide()
      clearSelection()
      return
    }

    // Don't handle shortcuts when typing in inputs
    if (isInput) return

    // N - new task modal
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      app.querySelector('task-modal')?.dispatchEvent(new CustomEvent('open-create-modal'))
      return
    }

    // F or / - focus search
    if (e.key === 'f' || e.key === 'F' || e.key === '/') {
      e.preventDefault()
      document.querySelector('filter-bar')?.focusSearch()
      return
    }

    // 1/2/3 - move selected task to column
    if (e.key === '1' && selectedTaskId) {
      e.preventDefault()
      store.moveTask(selectedTaskId, TaskStatus.TODO)
      notify.success('Tarea movida a To Do')
      eventBus.emit(Events.TASK_MOVED, { taskId: selectedTaskId, newStatus: TaskStatus.TODO })
      return
    }
    if (e.key === '2' && selectedTaskId) {
      e.preventDefault()
      store.moveTask(selectedTaskId, TaskStatus.IN_PROGRESS)
      notify.success('Tarea movida a In Progress')
      eventBus.emit(Events.TASK_MOVED, { taskId: selectedTaskId, newStatus: TaskStatus.IN_PROGRESS })
      return
    }
    if (e.key === '3' && selectedTaskId) {
      e.preventDefault()
      store.moveTask(selectedTaskId, TaskStatus.DONE)
      notify.success('Tarea movida a Done')
      eventBus.emit(Events.TASK_MOVED, { taskId: selectedTaskId, newStatus: TaskStatus.DONE })
      return
    }

    // E - edit selected task
    if ((e.key === 'e' || e.key === 'E') && selectedTaskId) {
      e.preventDefault()
      app.querySelector('task-modal')?.dispatchEvent(new CustomEvent('task-edit', { 
        detail: { id: selectedTaskId },
        bubbles: true
      }))
      return
    }

    // Delete/Backspace - delete selected task
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTaskId) {
      e.preventDefault()
      if (confirm('¿Eliminar esta tarea?')) {
        store.deleteTask(selectedTaskId)
        notify.info('Tarea eliminada')
        selectedTaskId = null
      }
      return
    }
  })

  // Helper functions
  function toggleTaskSelection(taskId) {
    if (selectedTaskIds.has(taskId)) {
      selectedTaskIds.delete(taskId)
    } else {
      selectedTaskIds.add(taskId)
    }
    
    // Update selectedTaskId for keyboard shortcuts
    if (selectedTaskIds.size === 1) {
      selectedTaskId = Array.from(selectedTaskIds)[0]
    } else if (selectedTaskIds.size === 0) {
      selectedTaskId = null
    }
    
    // Update card visual states
    document.querySelectorAll('task-card').forEach(card => {
      const id = card.getAttribute('task-id')
      card.selected = id === selectedTaskId
      card.checked = selectedTaskIds.has(id)
    })
    
    // Update bulk action bar
    window.dispatchEvent(new CustomEvent('update-bulk-bar'))
  }

  function clearSelection() {
    selectedTaskIds.clear()
    selectedTaskId = null
    
    document.querySelectorAll('task-card').forEach(card => {
      card.selected = false
      card.checked = false
    })
    
    window.dispatchEvent(new CustomEvent('update-bulk-bar'))
  }

  // Subscribe to store changes to update card selection state
  store.subscribe(() => {
    // Clear selection if selected tasks no longer exist
    if (selectedTaskId && !store.getTask(selectedTaskId)) {
      selectedTaskId = null
      selectedTaskIds.clear()
      window.dispatchEvent(new CustomEvent('update-bulk-bar'))
    }
  })
}
