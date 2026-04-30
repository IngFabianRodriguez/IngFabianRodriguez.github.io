// src/components/FilterBar.js — Apple Design Language

import { TaskPriority } from '../models/Task.js'
import { store } from '../store/TaskStore.js'

export class FilterBar extends HTMLElement {
  #unsubscribe = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    this.refresh()
  }

  disconnectedCallback() { this.#unsubscribe?.() }

  refresh() {
    const criteria = store.getFilterCriteria()
    const tags = store.getAllTags()
    const stats = store.getStats()
    const hasFilters = !!(criteria.search || criteria.priority || criteria.tag)

    this.render(criteria, tags, stats, hasFilters)
  }

  render(criteria, tags, stats, hasFilters) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: saturate(180%) blur(16px);
          -webkit-backdrop-filter: saturate(180%) blur(16px);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px var(--space-6);
          flex-wrap: wrap;
        }

        /* ─── Search ─── */
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 160px;
          max-width: 240px;
        }
        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: var(--apple-tertiary);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: var(--apple-surface-1);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-sm);
          padding: 7px 12px 7px 30px;
          font-size: 12px;
          color: var(--apple-label);
          font-family: var(--font);
          transition: border-color 0.2s, background 0.2s;
        }
        .search-input::placeholder { color: var(--apple-tertiary); }
        .search-input:focus {
          outline: none;
          background: var(--apple-surface-2);
          border-color: var(--apple-blue);
        }

        /* ─── Select ─── */
        .filter-select {
          background: var(--apple-surface-1);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-sm);
          padding: 7px 28px 7px 10px;
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-secondary);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
          font-family: var(--font);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23636366'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        .filter-select:focus {
          outline: none;
          border-color: var(--apple-blue);
          color: var(--apple-label);
        }
        .filter-select.has-value {
          color: var(--apple-label);
          border-color: rgba(255,255,255,0.12);
        }

        /* ─── Clear button ─── */
        .clear-btn {
          display: ${hasFilters ? 'flex' : 'none'};
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          background: rgba(255,69,58,0.1);
          border: 0.5px solid rgba(255,69,58,0.2);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-red);
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font);
        }
        .clear-btn:hover {
          background: rgba(255,69,58,0.18);
        }

        /* ─── Results count ─── */
        .results-count {
          margin-left: auto;
          font-size: 11px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-tertiary);
          white-space: nowrap;
        }
        .results-count strong { color: var(--apple-secondary); }

        /* ─── Responsive ─── */
        @media (max-width: 768px) {
          .filter-bar { padding: 8px var(--space-4); gap: var(--space-2); }
          .search-wrap { min-width: 120px; max-width: none; }
        }
        @media (max-width: 480px) {
          .filter-bar { padding: 8px var(--space-3); gap: var(--space-1); }
          .search-wrap, .filter-select { min-width: unset; }
          .filter-select { padding: 6px 24px 6px 8px; font-size: 11px; }
          .results-count { display: none; }
        }
      </style>

      <div class="filter-bar">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            id="searchInput"
            placeholder="Buscar tareas…"
            value="${this.escapeAttr(criteria.search || '')}"
          />
        </div>

        <select class="filter-select ${criteria.priority ? 'has-value' : ''}" id="priorityFilter">
          <option value="">Prioridad</option>
          <option value="low" ${criteria.priority === 'low' ? 'selected' : ''}>Baja</option>
          <option value="medium" ${criteria.priority === 'medium' ? 'selected' : ''}>Media</option>
          <option value="high" ${criteria.priority === 'high' ? 'selected' : ''}>Alta</option>
          <option value="critical" ${criteria.priority === 'critical' ? 'selected' : ''}>Crítica</option>
        </select>

        <select class="filter-select ${criteria.tag ? 'has-value' : ''}" id="tagFilter">
          <option value="">Etiqueta</option>
          ${tags.map(tag => `
            <option value="${this.escapeAttr(tag)}" ${criteria.tag === tag ? 'selected' : ''}>${this.escapeHtml(tag)}</option>
          `).join('')}
        </select>

        <button class="clear-btn" id="clearBtn">✕ Limpiar</button>

        <span class="results-count">
          ${stats.filteredTotal !== stats.total
            ? `<strong>${stats.filteredTotal}</strong> / ${stats.total}`
            : `<strong>${stats.total}</strong> tareas`}
        </span>
      </div>
    `

    this.setupEventListeners()
  }

  setupEventListeners() {
    const searchInput = this.shadowRoot.getElementById('searchInput')
    const priorityFilter = this.shadowRoot.getElementById('priorityFilter')
    const tagFilter = this.shadowRoot.getElementById('tagFilter')
    const clearBtn = this.shadowRoot.getElementById('clearBtn')

    let timer
    searchInput?.addEventListener('input', e => {
      clearTimeout(timer)
      timer = setTimeout(() => store.setFilterCriteria({ search: e.target.value }), 150)
    })

    priorityFilter?.addEventListener('change', e => store.setFilterCriteria({ priority: e.target.value }))
    tagFilter?.addEventListener('change', e => store.setFilterCriteria({ tag: e.target.value }))

    clearBtn?.addEventListener('click', () => {
      store.clearFilters()
      if (searchInput) searchInput.value = ''
      if (priorityFilter) priorityFilter.value = ''
      if (tagFilter) tagFilter.value = ''
      priorityFilter?.classList.remove('has-value')
      tagFilter?.classList.remove('has-value')
    })
  }

  focusSearch() {
    this.shadowRoot.getElementById('searchInput')?.focus()
  }

  escapeHtml(text) {
    const d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }

  escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}

customElements.define('filter-bar', FilterBar)
