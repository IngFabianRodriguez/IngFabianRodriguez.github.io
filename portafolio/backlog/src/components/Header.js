// src/components/Header.js

import { store } from '../store/TaskStore.js'
import { notify } from '../utils/Notifications.js'

export class Header extends HTMLElement {
  #unsubscribe = null

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    this.refresh()
  }

  disconnectedCallback() { this.#unsubscribe?.() }

  refresh() {
    const stats = store.getStats()
    const criteria = store.getFilterCriteria()
    const hasFilters = criteria.search || criteria.priority || criteria.tag
    const progressPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

    const product = store.getProduct(store.getActiveProductId())
    const project = store.getProject(store.getActiveProjectId())
    const sprint  = store.getSprint(store.getActiveSprintId())

    this.innerHTML = `
      <style>
        :host { display: block; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 24px;
          background: #11111b;
          border-bottom: 1px solid #313244;
          gap: 16px;
        }
        .title-area { display: flex; flex-direction: column; gap: 2px; }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #6c7086;
        }
        .breadcrumb-item { display: flex; align-items: center; gap: 4px; }
        .breadcrumb-item span { color: #a6adc8; }
        .breadcrumb-item.active span { color: #cdd6f4; font-weight: 600; }
        .breadcrumb-sep { color: #45475a; }
        .title-row { display: flex; align-items: center; gap: 10px; }
        .title-icon { font-size: 22px; }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #cdd6f4;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-badge {
          font-size: 10px;
          color: #89b4fa;
          background: #89b4fa22;
          padding: 3px 7px;
          border-radius: 4px;
          font-weight: 600;
        }
        .stats {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .stat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .stat-value { font-size: 17px; font-weight: 700; color: #cdd6f4; }
        .stat-value.done { color: #a6e3a1; }
        .stat-value.progress { color: #f9e2af; }
        .stat-label { font-size: 9px; text-transform: uppercase; color: #6c7086; letter-spacing: 0.5px; }
        .progress-bar {
          width: 100px; height: 5px; background: #313244; border-radius: 3px; overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a6e3a1, #94e2d5);
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .header-actions { display: flex; gap: 8px; align-items: center; }
        .btn-add {
          background: #89b4fa; color: #11111b; border: none;
          padding: 9px 18px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 6px;
        }
        .btn-add:hover { background: #b4befe; transform: translateY(-1px); }
        .btn-export {
          background: #313244; color: #cdd6f4; border: none;
          padding: 9px 14px; border-radius: 8px; font-size: 12px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 6px;
        }
        .btn-export:hover { background: #45475a; }
        @media (max-width: 768px) {
          .header { flex-wrap: wrap; padding: 10px 16px; gap: 10px; }
          .title-area { width: 100%; }
          .stats { gap: 10px; }
          .stat-value { font-size: 15px; }
          .progress-bar { width: 70px; }
          .btn-export { display: none; }
          .header-actions { width: 100%; justify-content: flex-end; }
        }
        @media (max-width: 480px) {
          .stats { flex-wrap: wrap; gap: 6px; }
          .header { padding: 8px 12px; }
        }
      </style>
      <div class="header">
        <div class="title-area">
          <div class="breadcrumb">
            <div class="breadcrumb-item ${!product ? 'active' : ''}">
              <span>📦 ${product ? '' : 'Sin producto'}</span>
            </div>
            ${product ? `
              <span class="breadcrumb-sep">›</span>
              <div class="breadcrumb-item ${product && !project ? 'active' : ''}">
                <span>📁 ${project ? '' : 'Sin proyecto'}</span>
              </div>
            ` : ''}
            ${project ? `
              <span class="breadcrumb-sep">›</span>
              <div class="breadcrumb-item ${sprint ? '' : 'active'}">
                <span>🎯 ${sprint ? '' : 'Sin sprint'}</span>
              </div>
            ` : ''}
          </div>
          <div class="title-row">
            <span class="title-icon">🎯</span>
            <h1 class="title">
              ${product ? this.escapeHtml(product.name) : 'Scrum Backlog'}
              ${project ? ` › ${this.escapeHtml(project.name)}` : ''}
              ${hasFilters ? '<span class="filter-badge">Filtrado</span>' : ''}
            </h1>
          </div>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-value">${stats.filteredTotal !== stats.total ? `${stats.filteredTotal}/` : ''}${stats.todo}</span>
            <span class="stat-label">To Do</span>
          </div>
          <div class="stat">
            <span class="stat-value progress">${stats.inProgress}</span>
            <span class="stat-label">En curso</span>
          </div>
          <div class="stat">
            <span class="stat-value done">${stats.done}</span>
            <span class="stat-label">Hechas</span>
          </div>
          <div class="stat">
            <span class="stat-label">Progreso</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="stat-label">${progressPercent}%</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-export" id="exportBtn" title="Exportar a CSV">📥 CSV</button>
          <button class="btn-add" id="addTaskBtn">➕ Nueva tarea</button>
        </div>
      </div>
    `

    this.querySelector('#addTaskBtn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-create-modal', { bubbles: true, composed: true }))
    })
    this.querySelector('#exportBtn')?.addEventListener('click', () => this.exportToCSV())
  }

  exportToCSV() {
    const tasks = store.getFilteredTasks(store.getFilterCriteria())
    if (tasks.length === 0) { notify.warning('No hay tareas para exportar'); return }
    const headers = ['id', 'title', 'description', 'status', 'priority', 'storyPoints', 'tags', 'sprintId', 'createdAt', 'updatedAt']
    const escapeCSV = v => { if (v == null) return ''; const s = String(v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s }
    const csvRows = [headers.join(','), ...tasks.map(t => [escapeCSV(t.id), escapeCSV(t.title), escapeCSV(t.description), escapeCSV(t.status), escapeCSV(t.priority), escapeCSV(t.storyPoints), escapeCSV((t.tags || []).join(';')), escapeCSV(t.sprintId), escapeCSV(t.createdAt), escapeCSV(t.updatedAt)].join(','))]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `scrum-backlog-${new Date().toISOString().split('T')[0]}.csv`; link.click()
    URL.revokeObjectURL(url)
    notify.success(`Exportadas ${tasks.length} tareas`)
  }

  escapeHtml(text) {
    const d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }
}

customElements.define('app-header', Header)
