// src/components/Header.js — Apple Design Language

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

    this.innerHTML = `
      <style>
        :host { display: block; }

        /* ─── Apple Header Bar ─── */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-6);
          height: 52px;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-bottom: 0.5px solid rgba(255,255,255,0.08);
          gap: var(--space-4);
          flex-shrink: 0;
        }

        /* ─── Title area ─── */
        .title-area {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: var(--font-weight-medium);
          letter-spacing: 0.01em;
          color: var(--apple-secondary);
        }
        .breadcrumb-sep { color: var(--apple-tertiary); font-size: 8px; }
        .breadcrumb-item.active span { color: var(--apple-label); }

        .title-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          line-height: 1.2;
        }
        .title {
          font-size: 15px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .title-sub {
          font-size: 14px;
          font-weight: var(--font-weight-regular);
          color: var(--apple-secondary);
          white-space: nowrap;
        }

        .filter-badge {
          font-size: 9px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-blue);
          background: var(--apple-blue-fill);
          padding: 2px 7px;
          border-radius: 10px;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }

        /* ─── Stats pill (Apple style) ─── */
        .stats {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: var(--apple-surface-1);
          border-radius: 8px;
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-secondary);
          transition: background 0.2s var(--ease-apple);
        }
        .stat-pill:hover { background: var(--apple-surface-2); }
        .stat-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .stat-pill.done .stat-dot { background: var(--apple-green); }
        .stat-pill.progress .stat-dot { background: var(--apple-orange); }
        .stat-pill.total .stat-dot { background: var(--apple-blue); }

        /* ─── Progress bar ─── */
        .progress-wrap {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .progress-track {
          width: 64px;
          height: 4px;
          background: var(--apple-surface-2);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--apple-blue), var(--apple-green));
          border-radius: 2px;
          transition: width 0.5s var(--ease-apple);
        }
        .progress-pct {
          font-size: 11px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-secondary);
          min-width: 28px;
        }

        /* ─── Action buttons ─── */
        .actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all 0.2s var(--ease-apple);
          letter-spacing: 0.01em;
        }
        .btn-primary {
          background: var(--apple-blue);
          color: #fff;
          box-shadow: 0 1px 3px rgba(10, 132, 255, 0.3);
        }
        .btn-primary:hover {
          background: #2593ff;
          transform: scale(1.02);
          box-shadow: 0 2px 8px rgba(10, 132, 255, 0.4);
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-secondary {
          background: var(--apple-surface-1);
          color: var(--apple-label);
          border: 0.5px solid rgba(255,255,255,0.1);
        }
        .btn-secondary:hover {
          background: var(--apple-surface-2);
        }
        .btn-icon {
          padding: 7px;
          background: var(--apple-surface-1);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          color: var(--apple-secondary);
          cursor: pointer;
          transition: all 0.2s var(--ease-apple);
          font-size: 14px;
        }
        .btn-icon:hover {
          background: var(--apple-surface-2);
          color: var(--apple-label);
        }

        /* ─── Responsive ─── */
        @media (max-width: 1024px) {
          .stats { gap: 6px; }
          .progress-wrap { display: none; }
        }
        @media (max-width: 768px) {
          .header { padding: 0 var(--space-4); height: 48px; gap: var(--space-3); }
          .title { font-size: 14px; }
          .title-sub { display: none; }
          .breadcrumb { display: none; }
          .stat-pill.total { display: none; }
          .btn-secondary { display: none; }
        }
        @media (max-width: 480px) {
          .btn { padding: 7px 10px; font-size: 12px; }
          .btn span { display: none; }
        }
      </style>

      <div class="header">
        <!-- Title -->
        <div class="title-area">
          <div class="breadcrumb">
            <span>📦 ${product ? this.escapeHtml(product.name) : 'Sin producto'}</span>
            ${project ? `
              <span class="breadcrumb-sep">›</span>
              <span>📁 ${this.escapeHtml(project.name)}</span>
            ` : ''}
          </div>
          <div class="title-row">
            <span class="title">Scrum</span>
            ${project ? `<span class="title-sub"> · ${this.escapeHtml(project.name)}</span>` : ''}
            ${hasFilters ? '<span class="filter-badge">Filtrado</span>' : ''}
          </div>
        </div>

        <!-- Stats -->
        <div class="stats">
          <div class="stat-pill total">
            <span class="stat-dot"></span>
            <span>${stats.filteredTotal !== stats.total ? `${stats.filteredTotal}/` : ''}${stats.total}</span>
          </div>
          <div class="stat-pill progress">
            <span class="stat-dot"></span>
            <span>${stats.inProgress}</span>
          </div>
          <div class="stat-pill done">
            <span class="stat-dot"></span>
            <span>${stats.done}</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="progress-pct">${progressPercent}%</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn btn-secondary" id="exportBtn" title="Exportar a CSV">📥</button>
          <button class="btn btn-primary" id="addTaskBtn">➕ <span>Nueva</span></button>
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
    const escapeCSV = v => {
      if (v == null) return ''
      const s = String(v)
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const headers = ['id','title','description','status','priority','storyPoints','tags','sprintId','createdAt','updatedAt']
    const csvRows = [
      headers.join(','),
      ...tasks.map(t =>
        [t.id, t.title, t.description, t.status, t.priority, t.storyPoints, (t.tags||[]).join(';'), t.sprintId, t.createdAt, t.updatedAt]
          .map(escapeCSV).join(',')
      )
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `scrum-backlog-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    notify.success(`Exportadas ${tasks.length} tareas`)
  }

  escapeHtml(text) {
    const d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }
}

customElements.define('app-header', Header)
