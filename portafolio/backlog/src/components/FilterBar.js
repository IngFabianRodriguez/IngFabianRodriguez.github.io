// src/components/FilterBar.js

import { TaskPriority } from '../models/Task.js'
import { store } from '../store/TaskStore.js'
import { eventBus, Events } from '../utils/EventBus.js'

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

  disconnectedCallback() {
    this.#unsubscribe?.()
  }

  refresh() {
    const criteria = store.getFilterCriteria()
    const tags = store.getAllTags()
    const stats = store.getStats()
    const hasFilters = criteria.search || criteria.priority || criteria.tag

    this.render(criteria, tags, stats, hasFilters)
  }

  render(criteria, tags, stats, hasFilters) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: #11111b;
          border-bottom: 1px solid #313244;
          padding: 12px 24px;
        }
        .filter-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .search-input {
          flex: 1;
          min-width: 180px;
          max-width: 280px;
          background: #181825;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd6f4;
          transition: border-color 0.2s;
        }
        .search-input::placeholder {
          color: #6c7086;
        }
        .search-input:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .filter-select {
          background: #181825;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd6f4;
          cursor: pointer;
          min-width: 120px;
          transition: border-color 0.2s;
        }
        .filter-select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .clear-btn {
          display: ${hasFilters ? 'flex' : 'none'};
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #6c7086;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-btn:hover {
          border-color: #f38ba8;
          color: #f38ba8;
        }
        .results-count {
          margin-left: auto;
          font-size: 12px;
          color: #6c7086;
        }
        .results-count strong {
          color: #cdd6f4;
        }
        @media (max-width: 768px) {
          :host { padding: 10px 16px; }
          .filter-bar { gap: 8px; }
          .search-input { min-width: 120px; }
        }
        @media (max-width: 480px) {
          .filter-bar { gap: 6px; }
          .search-input, .filter-select { padding: 6px 8px; font-size: 12px; }
        }
      </style>
      
      <div class="filter-bar">
        <input 
          type="text" 
          class="search-input" 
          id="searchInput"
          placeholder="🔍 Buscar tareas..."
          value="${this.escapeAttr(criteria.search || '')}"
        />
        
        <select class="filter-select" id="priorityFilter">
          <option value="">Todas</option>
          <option value="low" ${criteria.priority === 'low' ? 'selected' : ''}>🟢 Baja</option>
          <option value="medium" ${criteria.priority === 'medium' ? 'selected' : ''}>🟡 Media</option>
          <option value="high" ${criteria.priority === 'high' ? 'selected' : ''}>🟠 Alta</option>
          <option value="critical" ${criteria.priority === 'critical' ? 'selected' : ''}>🔴 Crítica</option>
        </select>
        
        <select class="filter-select" id="tagFilter">
          <option value="">Todos</option>
          ${tags.map(tag => `
            <option value="${this.escapeAttr(tag)}" ${criteria.tag === tag ? 'selected' : ''}>${this.escapeHtml(tag)}</option>
          `).join('')}
        </select>
        
        <button class="clear-btn" id="clearBtn">
          ✕ Limpiar
        </button>
        
        <span class="results-count">
          ${stats.filteredTotal !== stats.total 
            ? `<strong>${stats.filteredTotal}</strong> de ${stats.total} tareas` 
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

    // Search input - real-time filtering with debounce
    let debounceTimer
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        store.setFilterCriteria({ search: e.target.value })
      }, 150)
    })

    // Priority filter
    priorityFilter?.addEventListener('change', (e) => {
      store.setFilterCriteria({ priority: e.target.value })
    })

    // Tag filter
    tagFilter?.addEventListener('change', (e) => {
      store.setFilterCriteria({ tag: e.target.value })
    })

    // Clear filters
    clearBtn?.addEventListener('click', () => {
      store.clearFilters()
      searchInput.value = ''
      priorityFilter.value = ''
      tagFilter.value = ''
    })
  }

  focusSearch() {
    this.shadowRoot.getElementById('searchInput')?.focus()
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}

customElements.define('filter-bar', FilterBar)
