// src/components/SprintSidebar.js

import { store } from '../store/TaskStore.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { notify } from '../utils/Notifications.js'

export class SprintSidebar extends HTMLElement {
  #unsubscribe = null
  #showCreateProduct = false
  #showCreateProject = false
  #showCreateSprint  = false
  #collapsedProducts = new Set()

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
    this.render()
  }

  render() {
    const products = store.getProducts()
    const activeProductId = store.getActiveProductId()
    const activeProjectId = store.getActiveProjectId()
    const activeSprintId = store.getActiveSprintId()

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 260px;
          min-width: 260px;
          background: #11111b;
          border-right: 1px solid #313244;
          height: 100%;
          overflow-y: auto;
          font-family: 'Segoe UI', system-ui, sans-serif;
          flex-shrink: 0;
        }

        /* Mobile: full-width collapsible */
        @media (max-width: 768px) {
          :host {
            width: 100% !important;
            min-width: unset !important;
            height: auto;
            border-right: none !important;
            border-bottom: 1px solid #313244;
            overflow: visible;
          }
        }
        .sidebar-header {
          padding: 14px 16px 10px;
          border-bottom: 1px solid #1e1e2e;
        }
        .sidebar-title {
          font-size: 10px;
          font-weight: 700;
          color: #6c7086;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
        }
        .product-selector {
          position: relative;
        }
        .product-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          color: #cdd6f4;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .product-btn:hover { border-color: #89b4fa; background: #252536; }
        .product-icon { font-size: 16px; }
        .product-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .product-arrow { font-size: 10px; color: #6c7086; }
        .product-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          z-index: 100;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 13px;
          color: #cdd6f4;
          transition: background 0.1s;
        }
        .dropdown-item:hover { background: #313244; }
        .dropdown-item.active { background: #89b4fa22; color: #89b4fa; }
        .dropdown-item.new-item { color: #89b4fa; border-top: 1px solid #313244; margin-top: 4px; padding-top: 10px; }
        .dropdown-divider { height: 1px; background: #313244; margin: 4px 0; }
        .sidebar-body { flex: 1; overflow-y: auto; padding: 12px 12px; }

        /* Tree */
        .section-label {
          font-size: 9px;
          font-weight: 700;
          color: #6c7086;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          padding: 8px 4px 4px;
        }
        .add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          background: transparent;
          border: 1px dashed #313244;
          border-radius: 7px;
          color: #6c7086;
          font-size: 12px;
          cursor: pointer;
          width: 100%;
          margin-top: 6px;
          transition: all 0.15s;
        }
        .add-btn:hover { border-color: #89b4fa; color: #89b4fa; }

        /* Project items */
        .project-item { margin-bottom: 6px; }
        .project-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 13px;
          color: #cdd6f4;
          transition: background 0.1s;
        }
        .project-header:hover { background: #181825; }
        .project-header.active { background: #1e1e2e; border: 1px solid #89b4fa44; }
        .project-chevron {
          font-size: 9px;
          color: #6c7086;
          transition: transform 0.15s;
          width: 14px;
          text-align: center;
        }
        .project-chevron.open { transform: rotate(90deg); }
        .project-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .project-count { font-size: 10px; color: #6c7086; }
        .project-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.1s; }
        .project-header:hover .project-actions { opacity: 1; }
        .action-btn {
          padding: 2px 4px;
          background: none;
          border: none;
          color: #6c7086;
          cursor: pointer;
          font-size: 12px;
          border-radius: 4px;
        }
        .action-btn:hover { background: #313244; color: #cdd6f4; }
        .project-actions.delete:hover { color: #f38ba8; }

        /* Sprint items (indented) */
        .sprint-list { padding-left: 20px; margin: 2px 0; }
        .sprint-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #a6adc8;
          transition: all 0.1s;
        }
        .sprint-item:hover { background: #181825; color: #cdd6f4; }
        .sprint-item.active { background: #89b4fa22; color: #89b4fa; font-weight: 600; }
        .sprint-dot { width: 5px; height: 5px; border-radius: 50%; background: #89b4fa; flex-shrink: 0; }
        .sprint-item.completed .sprint-dot { background: #a6e3a1; }
        .sprint-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sprint-pts { font-size: 10px; color: #6c7086; }
        .sprint-actions { display: none; gap: 1px; }
        .sprint-item:hover .sprint-actions { display: flex; }
        .sprint-item.completed .sprint-name { text-decoration: line-through; }

        /* All tasks row */
        .all-tasks-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 12px;
          color: #a6adc8;
          margin-top: 8px;
          transition: all 0.1s;
        }
        .all-tasks-row:hover { background: #181825; color: #cdd6f4; }
        .all-tasks-row.active { color: #89b4fa; font-weight: 600; }
        .all-tasks-row .sprint-dot { background: #6c7086; }

        /* Forms */
        .create-form {
          margin-top: 8px;
          padding: 10px;
          background: #181825;
          border-radius: 8px;
          border: 1px solid #313244;
        }
        .form-title {
          font-size: 11px;
          font-weight: 600;
          color: #cdd6f4;
          margin-bottom: 8px;
        }
        .form-group { margin-bottom: 7px; }
        .form-group label {
          display: block;
          font-size: 10px;
          color: #6c7086;
          margin-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-group input, .form-group select {
          width: 100%;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 7px 9px;
          font-size: 12px;
          color: #cdd6f4;
          box-sizing: border-box;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .form-actions { display: flex; gap: 6px; margin-top: 8px; }
        .btn { flex: 1; padding: 7px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.1s; }
        .btn-primary { background: #89b4fa; color: #11111b; }
        .btn-primary:hover { background: #b4befe; }
        .btn-secondary { background: #313244; color: #cdd6f4; }
        .btn-secondary:hover { background: #45475a; }
        .btn-danger { background: transparent; border: 1px solid #f38ba844; color: #f38ba8; }
        .btn-danger:hover { background: #f38ba822; }

        /* Confirm dialog */
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .confirm-box {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 12px;
          padding: 20px;
          max-width: 280px;
          text-align: center;
        }
        .confirm-box h3 { margin: 0 0 8px; color: #cdd6f4; font-size: 15px; }
        .confirm-box p { margin: 0 0 16px; color: #a6adc8; font-size: 13px; }
        .confirm-box .form-actions { margin-top: 0; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #313244; border-radius: 2px; }
      </style>

      <div class="sidebar-header">
        <div class="sidebar-title">Producto</div>
        <div class="product-selector">
          <button class="product-btn" id="productBtn">
            <span class="product-icon">📦</span>
            <span class="product-name">${this.escapeHtml(products.find(p => p.id === activeProductId)?.name ?? 'Seleccionar')}</span>
            <span class="product-arrow">▸</span>
          </button>
          <div class="product-dropdown" id="productDropdown" style="display:none">
            ${products.map(p => `
              <div class="dropdown-item ${p.id === activeProductId ? 'active' : ''}" data-product-id="${p.id}">
                📦 ${this.escapeHtml(p.name)}
              </div>
            `).join('')}
            <div class="dropdown-divider"></div>
            <div class="dropdown-item new-item" id="newProductBtn">➕ Nuevo producto</div>
          </div>
        </div>
      </div>

      <div class="sidebar-body">
        ${this.#renderProjects(activeProductId, activeProjectId, activeSprintId)}
      </div>
    `

    this.setupEventListeners(products, activeProductId)
  }

  #renderProjects(activeProductId, activeProjectId, activeSprintId) {
    if (!activeProductId) return '<div style="color:#6c7086;font-size:12px;padding:12px">Selecciona un producto</div>'
    const projects = store.getProjects(activeProductId)
    if (projects.length === 0) {
      return `
        <div style="color:#6c7086;font-size:12px;padding:8px">No hay proyectos</div>
        ${this.#renderNewProjectForm()}
      `
    }

    return `
      <div class="section-label">Proyectos</div>
      ${projects.map(project => {
        const sprints = store.getSprintsByProject(project.id)
        const isOpen = !this.#collapsedProducts.has(project.id)
        return `
          <div class="project-item" data-project-id="${project.id}">
            <div class="project-header ${project.id === activeProjectId ? 'active' : ''}">
              <span class="project-chevron ${isOpen ? 'open' : ''}">▸</span>
              <span class="project-name">${this.escapeHtml(project.name)}</span>
              <span class="project-count">${sprints.length}</span>
              <div class="project-actions">
                <button class="action-btn sprint-add" title="Nuevo sprint">➕</button>
                <button class="action-btn project-del delete" title="Eliminar proyecto">🗑️</button>
              </div>
            </div>
            ${isOpen ? `
              <div class="sprint-list">
                <div class="all-tasks-row ${!activeSprintId && project.id === activeProjectId ? 'active' : ''}" data-scope="all" data-project-id="${project.id}">
                  <span class="sprint-dot"></span>
                  <span class="sprint-name">📋 Todas las tareas</span>
                </div>
                ${sprints.map(s => {
                  const stats = store.getSprintStats(s.id)
                  return `
                    <div class="sprint-item ${s.id === activeSprintId ? 'active' : ''} ${s.status === 'completed' ? 'completed' : ''}" data-sprint-id="${s.id}" data-project-id="${project.id}">
                      <span class="sprint-dot"></span>
                      <span class="sprint-name">${this.escapeHtml(s.name)}</span>
                      <span class="sprint-pts">${stats.total}⭐</span>
                      <div class="sprint-actions">
                        <button class="action-btn sprint-del" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  `
                }).join('')}
              </div>
            ` : ''}
          </div>
        `
      }).join('')}
      ${this.#showCreateProject ? this.#renderNewProjectForm() : `
        <button class="add-btn" id="showProjectForm">
          ➕ Nuevo proyecto
        </button>
      `}
    `
  }

  #renderNewProjectForm() {
    return `
      <div class="create-form" id="newProjectForm">
        <div class="form-title">Nuevo Proyecto</div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="newProjectName" placeholder="Mi proyecto" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="cancelProject">Cancelar</button>
          <button class="btn btn-primary" id="saveProject">Crear</button>
        </div>
      </div>
    `
  }

  #renderNewSprintForm(projectId) {
    return `
      <div class="create-form" id="newSprintForm" data-project-id="${projectId}">
        <div class="form-title">Nuevo Sprint</div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="newSprintName" placeholder="Sprint 1" />
        </div>
        <div class="form-group">
          <label>Fecha inicio</label>
          <input type="date" id="newSprintStart" />
        </div>
        <div class="form-group">
          <label>Fecha fin</label>
          <input type="date" id="newSprintEnd" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="cancelSprint">Cancelar</button>
          <button class="btn btn-primary" id="saveSprint">Crear</button>
        </div>
      </div>
    `
  }

  #renderNewProductForm() {
    return `
      <div class="create-form" id="newProductForm">
        <div class="form-title">Nuevo Producto</div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="newProductName" placeholder="Mi producto" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="cancelProduct">Cancelar</button>
          <button class="btn btn-primary" id="saveProduct">Crear</button>
        </div>
      </div>
    `
  }

  #renderConfirmDelete(message) {
    return `
      <div class="confirm-overlay" id="confirmOverlay">
        <div class="confirm-box">
          <h3>¿Eliminar?</h3>
          <p>${message}</p>
          <div class="form-actions">
            <button class="btn btn-secondary" id="confirmNo">Cancelar</button>
            <button class="btn btn-danger" id="confirmYes">Eliminar</button>
          </div>
        </div>
      </div>
    `
  }

  setupEventListeners(products, activeProductId) {
    const shadow = this.shadowRoot

    // Product dropdown
    shadow.getElementById('productBtn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      const dd = shadow.getElementById('productDropdown')
      dd.style.display = dd.style.display === 'none' ? 'block' : 'none'
    })

    document.addEventListener('click', () => {
      const dd = shadow.getElementById('productDropdown')
      if (dd) dd.style.display = 'none'
    })

    shadow.querySelectorAll('.dropdown-item[data-product-id]').forEach(item => {
      item.addEventListener('click', () => {
        store.setActiveProduct(item.dataset.productId)
        shadow.getElementById('productDropdown').style.display = 'none'
      })
    })

    shadow.getElementById('newProductBtn')?.addEventListener('click', () => {
      shadow.getElementById('productDropdown').style.display = 'none'
      this.#showCreateProduct = true
      this.refresh()
      setTimeout(() => shadow.getElementById('newProductName')?.focus(), 10)
    })

    // New product form
    shadow.getElementById('cancelProduct')?.addEventListener('click', () => {
      this.#showCreateProduct = false
      this.refresh()
    })
    shadow.getElementById('saveProduct')?.addEventListener('click', () => {
      const name = shadow.getElementById('newProductName')?.value.trim()
      if (!name) { notify.error('El nombre es requerido'); return }
      try {
        const p = store.addProduct({ name })
        store.setActiveProduct(p.id)
        this.#showCreateProduct = false
        notify.success(`Producto "${name}" creado`)
      } catch (e) { notify.error(e.message) }
    })

    // Show project form
    shadow.getElementById('showProjectForm')?.addEventListener('click', () => {
      this.#showCreateProject = true
      this.refresh()
      setTimeout(() => shadow.getElementById('newProjectName')?.focus(), 10)
    })

    // New project form
    shadow.getElementById('cancelProject')?.addEventListener('click', () => {
      this.#showCreateProject = false
      this.refresh()
    })
    shadow.getElementById('saveProject')?.addEventListener('click', () => {
      const name = shadow.getElementById('newProjectName')?.value.trim()
      if (!name) { notify.error('El nombre es requerido'); return }
      try {
        const p = store.addProject({ name })
        store.setActiveProject(p.id)
        this.#showCreateProject = false
        notify.success(`Proyecto "${name}" creado`)
      } catch (e) { notify.error(e.message) }
    })

    // Project toggle collapse
    shadow.querySelectorAll('.project-chevron').forEach(chev => {
      chev.addEventListener('click', (e) => {
        e.stopPropagation()
        const item = chev.closest('.project-item')
        const pid = item.dataset.projectId
        if (this.#collapsedProducts.has(pid)) {
          this.#collapsedProducts.delete(pid)
        } else {
          this.#collapsedProducts.add(pid)
        }
        this.refresh()
      })
    })

    // Project header click → set active
    shadow.querySelectorAll('.project-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn') || e.target.closest('.project-chevron')) return
        const pid = header.closest('.project-item')?.dataset.projectId
        if (pid) store.setActiveProject(pid)
      })
    })

    // Sprint click → set active
    shadow.querySelectorAll('.sprint-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return
        const sid = item.dataset.sprintId
        store.setActiveSprint(sid)
      })
    })

    // All tasks row
    shadow.querySelectorAll('.all-tasks-row').forEach(row => {
      row.addEventListener('click', () => {
        const pid = row.dataset.projectId
        store.setActiveProject(pid)
        store.setActiveSprint(null)
      })
    })

    // Sprint add
    shadow.querySelectorAll('.sprint-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const projectItem = btn.closest('.project-item')
        const pid = projectItem?.dataset.projectId
        if (!pid) return
        const sprintList = projectItem.querySelector('.sprint-list')
        const existing = projectItem.querySelector('#newSprintForm')
        if (existing) { existing.remove(); return }
        if (sprintList) sprintList.insertAdjacentHTML('beforeend', this.#renderNewSprintForm(pid))
        const form = projectItem.querySelector('#newSprintForm')
        form.querySelector('#cancelSprint').addEventListener('click', () => form.remove())
        form.querySelector('#saveSprint').addEventListener('click', () => {
          const name = form.querySelector('#newSprintName')?.value.trim()
          const start = form.querySelector('#newSprintStart')?.value
          const end   = form.querySelector('#newSprintEnd')?.value
          if (!name) { notify.error('El nombre es requerido'); return }
          try {
            store.addSprint({ name, startDate: start, endDate: end, projectId: pid })
            notify.success(`Sprint "${name}" creado`)
          } catch (e) { notify.error(e.message) }
        })
      })
    })

    // Sprint delete
    shadow.querySelectorAll('.sprint-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const item = btn.closest('.sprint-item')
        const sid = item?.dataset.sprintId
        if (!sid) return
        shadow.querySelectorAll('.confirm-overlay').forEach(el => el.remove())
        shadow.querySelector('.sidebar-body').insertAdjacentHTML('beforeend', this.#renderConfirmDelete('Este sprint y sus tareas serán eliminados.'))
        const yesBtn = shadow.getElementById('confirmYes')
        const noBtn  = shadow.getElementById('confirmNo')
        const overlay = shadow.getElementById('confirmOverlay')
        yesBtn?.addEventListener('click', () => {
          store.deleteSprint(sid)
          notify.info('Sprint eliminado')
          overlay.remove()
        })
        noBtn?.addEventListener('click', () => overlay.remove())
        overlay?.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
      })
    })

    // Project delete
    shadow.querySelectorAll('.project-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const item = btn.closest('.project-item')
        const pid = item?.dataset.projectId
        if (!pid) return
        const project = store.getProject(pid)
        shadow.querySelectorAll('.confirm-overlay').forEach(el => el.remove())
        shadow.querySelector('.sidebar-body').insertAdjacentHTML('beforeend', this.#renderConfirmDelete(`El proyecto "${project?.name}" y todos sus sprints serán eliminados.`))
        const yesBtn = shadow.getElementById('confirmYes')
        const noBtn  = shadow.getElementById('confirmNo')
        const overlay = shadow.getElementById('confirmOverlay')
        yesBtn?.addEventListener('click', () => {
          store.deleteProject(pid)
          notify.info('Proyecto eliminado')
          overlay.remove()
        })
        noBtn?.addEventListener('click', () => overlay.remove())
        overlay?.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
      })
    })
  }

  escapeHtml(text) {
    const d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }
}

customElements.define('sprint-sidebar', SprintSidebar)
