// src/app.js — Apple Design Language

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
  `

  // ─── Layout styles ───
  const style = document.createElement('style')
  style.textContent = `
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      height: calc(100vh - 52px);
    }
    .content-area {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      min-width: 0;
      background: var(--apple-bg);
    }
    .board {
      display: flex;
      gap: var(--space-4);
      padding: var(--space-5) var(--space-5);
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      align-items: flex-start;
    }
    .board::-webkit-scrollbar { height: 5px; }
    .board::-webkit-scrollbar-track { background: transparent; }
    .board::-webkit-scrollbar-thumb { background: var(--apple-surface-3); border-radius: 3px; }

    /* ─── Bulk Action Bar (Apple floating pill) ─── */
    .bulk-bar-wrap {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 800;
      animation: scaleIn 0.3s var(--ease-spring);
    }
    .bulk-bar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: rgba(44, 44, 46, 0.92);
      backdrop-filter: saturate(180%) blur(24px);
      -webkit-backdrop-filter: saturate(180%) blur(24px);
      border: 0.5px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 10px 16px;
      box-shadow: var(--shadow-elevated);
    }
    .bulk-count {
      font-size: 13px;
      font-weight: var(--font-weight-semibold);
      color: var(--apple-label);
      padding: 0 var(--space-2) 0 0;
      border-right: 0.5px solid rgba(255,255,255,0.1);
      margin-right: var(--space-1);
    }
    .bulk-select {
      background: var(--apple-surface-2);
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 7px 28px 7px 12px;
      font-size: 12px;
      font-weight: var(--font-weight-medium);
      color: var(--apple-label);
      cursor: pointer;
      font-family: var(--font);
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2398989d'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }
    .bulk-select:focus { outline: none; border-color: var(--apple-blue); }
    .bulk-btn {
      padding: 7px 14px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all 0.2s var(--ease-apple);
      font-family: var(--font);
    }
    .bulk-btn.move { background: var(--apple-blue); color: #fff; }
    .bulk-btn.move:hover { background: #2593ff; transform: scale(1.02); }
    .bulk-btn.delete { background: transparent; border: 0.5px solid rgba(255,69,58,0.3); color: var(--apple-red); }
    .bulk-btn.delete:hover { background: rgba(255,69,58,0.1); }
    .bulk-btn.clear { background: var(--apple-surface-2); color: var(--apple-secondary); }
    .bulk-btn.clear:hover { background: var(--apple-surface-3); color: var(--apple-label); }

    /* ─── Tablet ─── */
    @media (max-width: 1024px) {
      sprint-sidebar { width: 220px !important; min-width: 220px !important; }
    }

    /* ─── Mobile ─── */
    @media (max-width: 768px) {
      .main-container { flex-direction: column; height: auto; overflow: visible; }
      sprint-sidebar {
        width: 100% !important; min-width: unset !important;
        height: auto; max-height: none;
        border-right: none !important; border-bottom: 0.5px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
      }
      .content-area { overflow: visible; }
      .board {
        flex-direction: column;
        padding: var(--space-4);
        overflow-x: unset;
        overflow-y: unset;
        min-height: 0;
        gap: var(--space-3);
      }
      .bulk-bar-wrap { bottom: 16px; }
      .bulk-bar { padding: 8px 12px; gap: var(--space-2); }
    }

    @media (max-width: 480px) {
      .board { padding: var(--space-3); gap: var(--space-3); }
      .bulk-bar { flex-wrap: wrap; justify-content: center; }
    }
  `
  app.appendChild(style)

  const taskDetail = app.querySelector('task-detail')

  // ─── Bulk action bar ───
  const bulkBar = document.createElement('div')
  bulkBar.className = 'bulk-bar-wrap'
  bulkBar.style.display = 'none'
  app.appendChild(bulkBar)

  function renderBulkBar() {
    const count = selectedTaskIds.size
    bulkBar.style.display = count > 0 ? 'block' : 'none'
    bulkBar.innerHTML = `
      <div class="bulk-bar">
        <span class="bulk-count">${count} seleccionada${count !== 1 ? 's' : ''}</span>
        <select class="bulk-select" id="bulkMoveSelect">
          <option value="">Mover a…</option>
          <option value="todo">◻ Por hacer</option>
          <option value="in_progress">◉ En curso</option>
          <option value="done">✓ Hecho</option>
        </select>
        <button class="bulk-btn delete" id="bulkDeleteBtn">🗑 Eliminar</button>
        <button class="bulk-btn clear" id="bulkClearBtn">Limpiar</button>
      </div>
    `
    bulkBar.querySelector('#bulkMoveSelect')?.addEventListener('change', e => {
      if (e.target.value) {
        selectedTaskIds.forEach(id => store.moveTask(id, e.target.value))
        notify.success(`${selectedTaskIds.size} tareas movidas`)
        clearSelection()
      }
    })
    bulkBar.querySelector('#bulkDeleteBtn')?.addEventListener('click', () => {
      if (confirm(`¿Eliminar ${selectedTaskIds.size} tareas?`)) {
        selectedTaskIds.forEach(id => store.deleteTask(id))
        notify.info(`${selectedTaskIds.size} tareas eliminadas`)
        clearSelection()
      }
    })
    bulkBar.querySelector('#bulkClearBtn')?.addEventListener('click', clearSelection)
  }

  // ─── Events ───
  window.addEventListener('open-task-detail', e => taskDetail?.show(e.detail.taskId))
  window.addEventListener('toggle-task-selection', e => toggleTaskSelection(e.detail.taskId))

  // ─── Keyboard shortcuts ───
  document.addEventListener('keydown', e => {
    const isInput = e.target.matches('input, textarea, select')
    if (e.key === 'Escape') {
      taskDetail?.hide()
      document.querySelector('task-modal')?.hide()
      clearSelection()
      return
    }
    if (isInput) return
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      app.querySelector('task-modal')?.dispatchEvent(new CustomEvent('open-create-modal'))
      return
    }
    if ((e.key === 'f' || e.key === 'F' || e.key === '/')) {
      e.preventDefault()
      document.querySelector('filter-bar')?.focusSearch()
      return
    }
    if (e.key === '1' && selectedTaskId) {
      store.moveTask(selectedTaskId, TaskStatus.TODO)
      notify.success('Movida a Por hacer')
      eventBus.emit(Events.TASK_MOVED, { taskId: selectedTaskId, newStatus: TaskStatus.TODO })
      return
    }
    if (e.key === '2' && selectedTaskId) {
      store.moveTask(selectedTaskId, TaskStatus.IN_PROGRESS)
      notify.success('Movida a En curso')
      eventBus.emit(Events.TASK_MOVED, { taskId: selectedTaskId, newStatus: TaskStatus.IN_PROGRESS })
      return
    }
    if (e.key === '3' && selectedTaskId) {
      store.moveTask(selectedTaskId, TaskStatus.DONE)
      notify.success('Movida a Hecho')
      eventBus.emit(Events.TASK_MOVED, { taskId: selectedTaskId, newStatus: TaskStatus.DONE })
      return
    }
    if ((e.key === 'e' || e.key === 'E') && selectedTaskId) {
      e.preventDefault()
      app.querySelector('task-modal')?.dispatchEvent(new CustomEvent('task-edit', { detail: { id: selectedTaskId }, bubbles: true }))
      return
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTaskId) {
      e.preventDefault()
      if (confirm('¿Eliminar esta tarea?')) {
        store.deleteTask(selectedTaskId)
        notify.info('Tarea eliminada')
        selectedTaskId = null
      }
    }
  })

  function toggleTaskSelection(taskId) {
    if (selectedTaskIds.has(taskId)) {
      selectedTaskIds.delete(taskId)
    } else {
      selectedTaskIds.add(taskId)
    }
    if (selectedTaskIds.size === 1) selectedTaskId = Array.from(selectedTaskIds)[0]
    else if (selectedTaskIds.size === 0) selectedTaskId = null

    document.querySelectorAll('task-card').forEach(card => {
      const id = card.getAttribute('task-id')
      card.selected = id === selectedTaskId
      card.checked = selectedTaskIds.has(id)
    })
    renderBulkBar()
  }

  function clearSelection() {
    selectedTaskIds.clear()
    selectedTaskId = null
    document.querySelectorAll('task-card').forEach(card => {
      card.selected = false
      card.checked = false
    })
    renderBulkBar()
  }

  store.subscribe(() => {
    if (selectedTaskId && !store.getTask(selectedTaskId)) {
      selectedTaskId = null
      selectedTaskIds.clear()
      renderBulkBar()
    }
  })
}
