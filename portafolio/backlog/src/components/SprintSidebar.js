// src/components/SprintSidebar.js — Apple Design Language

import { store } from '../store/TaskStore.js'
import { eventBus, Events } from '../utils/EventBus.js'
import { notify } from '../utils/Notifications.js'

export class SprintSidebar extends HTMLElement {
  #unsubscribe = null
  #showCreateProduct = false
  #showCreateProject = false
  #collapsedProducts = new Set()
  #collapsed = false   // mobile toggle

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    this.refresh()
  }

  disconnectedCallback() { this.#unsubscribe?.() }

  refresh() { this.render() }

  render() {
    const products = store.getProducts()
    const activeProductId = store.getActiveProductId()
    const activeProjectId = store.getActiveProjectId()
    const activeSprintId = store.getActiveSprintId()
    const activeProduct = products.find(p => p.id === activeProductId)

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 256px;
          min-width: 256px;
          background: var(--apple-surface-1);
          border-right: 0.5px solid rgba(255,255,255,0.06);
          height: 100%;
          overflow: hidden;
          flex-shrink: 0;
          font-family: var(--font);
        }

        /* ─── Top bar ─── */
        .sidebar-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-4) var(--space-3);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .sidebar-label {
          font-size: 10px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--apple-tertiary);
        }
        .collapse-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--apple-tertiary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s var(--ease-apple);
        }
        .collapse-btn:hover {
          background: var(--apple-surface-2);
          color: var(--apple-label);
        }

        /* ─── Product selector ─── */
        .product-selector {
          padding: var(--space-3) var(--space-4);
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .product-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 9px 12px;
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-md);
          color: var(--apple-label);
          font-size: 13px;
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s var(--ease-apple);
        }
        .product-btn:hover {
          background: var(--apple-surface-3);
          border-color: rgba(255,255,255,0.12);
        }
        .product-icon { font-size: 15px; flex-shrink: 0; }
        .product-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--apple-label);
        }
        .product-count {
          font-size: 11px;
          color: var(--apple-tertiary);
          background: var(--apple-surface-3);
          padding: 1px 7px;
          border-radius: 10px;
        }
        .product-arrow { font-size: 10px; color: var(--apple-tertiary); transition: transform 0.2s; }
        .product-arrow.open { transform: rotate(90deg); }

        /* ─── Product dropdown ─── */
        .product-dropdown {
          position: absolute;
          width: calc(100% - 32px);
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-elevated);
          z-index: 200;
          overflow: hidden;
          animation: slideDown 0.2s var(--ease-spring);
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 14px;
          cursor: pointer;
          font-size: 13px;
          color: var(--apple-label);
          transition: background 0.15s;
        }
        .dropdown-item:hover { background: var(--apple-surface-3); }
        .dropdown-item.active { color: var(--apple-blue); }
        .dropdown-item.active::before {
          content: '✓';
          font-size: 11px;
          margin-right: 4px;
        }
        .dropdown-new {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 14px;
          cursor: pointer;
          font-size: 13px;
          color: var(--apple-blue);
          border-top: 0.5px solid rgba(255,255,255,0.06);
          transition: background 0.15s;
        }
        .dropdown-new:hover { background: var(--apple-surface-3); }

        /* ─── Scrollable body ─── */
        .sidebar-body {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-3) var(--space-3);
        }

        /* ─── Section label ─── */
        .section-label {
          font-size: 10px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--apple-tertiary);
          padding: var(--space-3) var(--space-2) var(--space-2);
        }

        /* ─── Project item ─── */
        .project-item { margin-bottom: 2px; }
        .project-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 8px var(--space-2);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-label);
          transition: background 0.15s;
          user-select: none;
        }
        .project-header:hover { background: rgba(255,255,255,0.04); }
        .project-header.active {
          background: var(--apple-blue-fill);
          color: var(--apple-blue);
        }
        .project-chevron {
          font-size: 9px;
          color: var(--apple-tertiary);
          transition: transform 0.2s var(--ease-apple);
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }
        .project-chevron.open { transform: rotate(90deg); }
        .project-icon { font-size: 13px; flex-shrink: 0; }
        .project-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .project-badge {
          font-size: 10px;
          color: var(--apple-tertiary);
          background: var(--apple-surface-3);
          padding: 1px 6px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .project-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .project-header:hover .project-actions { opacity: 1; }
        .action-btn {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 5px;
          color: var(--apple-tertiary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s;
        }
        .action-btn:hover { background: var(--apple-surface-3); color: var(--apple-label); }
        .action-btn.delete:hover { color: var(--apple-red); }

        /* ─── Sprint list (indented) ─── */
        .sprint-list { padding-left: 22px; margin: 1px 0; }
        .sprint-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 7px var(--space-2);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 12px;
          color: var(--apple-secondary);
          transition: all 0.15s;
        }
        .sprint-item:hover { background: rgba(255,255,255,0.04); color: var(--apple-label); }
        .sprint-item.active {
          background: var(--apple-blue-fill);
          color: var(--apple-blue);
          font-weight: var(--font-weight-medium);
        }
        .sprint-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--apple-surface-3);
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .sprint-item.active .sprint-dot { background: var(--apple-blue); }
        .sprint-item.completed .sprint-dot { background: var(--apple-green); }
        .sprint-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sprint-pts {
          font-size: 10px;
          color: var(--apple-tertiary);
          flex-shrink: 0;
        }
        .sprint-actions { display: none; }
        .sprint-item:hover .sprint-actions { display: flex; gap: 1px; }

        /* ─── All tasks row ─── */
        .all-tasks-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 7px var(--space-2);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 12px;
          color: var(--apple-secondary);
          margin-top: 4px;
          transition: all 0.15s;
        }
        .all-tasks-row:hover { background: rgba(255,255,255,0.04); color: var(--apple-label); }
        .all-tasks-row.active { background: var(--apple-blue-fill); color: var(--apple-blue); font-weight: 500; }
        .all-tasks-row .sprint-dot { background: var(--apple-tertiary); }

        /* ─── Add button ─── */
        .add-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 8px var(--space-2);
          background: transparent;
          border: 0.5px dashed rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          color: var(--apple-tertiary);
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          width: 100%;
          margin-top: var(--space-2);
          transition: all 0.2s;
        }
        .add-btn:hover {
          border-color: var(--apple-blue);
          color: var(--apple-blue);
          background: var(--apple-blue-fill);
        }

        /* ─── Forms ─── */
        .create-form {
          margin: var(--space-3) var(--space-2) 0;
          padding: var(--space-4);
          background: var(--apple-surface-2);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-md);
          animation: scaleIn 0.2s var(--ease-spring);
        }
        .form-title {
          font-size: 12px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
          margin-bottom: var(--space-3);
        }
        .form-group { margin-bottom: var(--space-3); }
        .form-group label {
          display: block;
          font-size: 11px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-tertiary);
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-group input, .form-group select {
          width: 100%;
          background: var(--apple-bg);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          padding: 9px 11px;
          font-size: 13px;
          color: var(--apple-label);
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: var(--font);
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--apple-blue);
        }
        .form-group input::placeholder { color: var(--apple-tertiary); }
        .form-actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
        .btn {
          flex: 1;
          padding: 8px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all 0.2s var(--ease-apple);
          font-family: var(--font);
        }
        .btn-primary { background: var(--apple-blue); color: #fff; }
        .btn-primary:hover { background: #2593ff; transform: scale(1.01); }
        .btn-secondary { background: var(--apple-surface-3); color: var(--apple-label); }
        .btn-secondary:hover { background: #4a4a4c; }
        .btn-danger { background: transparent; border: 0.5px solid rgba(255,69,58,0.3); color: var(--apple-red); }
        .btn-danger:hover { background: rgba(255,69,58,0.1); }

        /* ─── Confirm overlay ─── */
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s;
        }
        .confirm-box {
          background: var(--apple-surface-1);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-xl);
          padding: 28px;
          max-width: 280px;
          text-align: center;
          box-shadow: var(--shadow-modal);
          animation: scaleIn 0.25s var(--ease-spring);
        }
        .confirm-box h3 {
          margin: 0 0 var(--space-2);
          font-size: 17px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
          letter-spacing: -0.01em;
        }
        .confirm-box p {
          margin: 0 0 var(--space-5);
          font-size: 13px;
          color: var(--apple-secondary);
          line-height: 1.5;
        }
        .confirm-box .form-actions { margin-top: 0; }

        /* ─── Mobile ─── */
        @media (max-width: 768px) {
          :host {
            width: 100% !important;
            min-width: unset !important;
            height: auto;
            border-right: none !important;
            border-bottom: 0.5px solid rgba(255,255,255,0.06);
            max-height: none;
            overflow: visible;
          }
          .sidebar-body {
            max-height: 260px;
          }
          .collapse-btn { display: none; }
        }

        @media (max-width: 480px) {
          :host { display: ${this.#collapsed ? 'none' : 'flex'}; }
        }
      </style>

      <div class="sidebar-topbar">
        <span class="sidebar-label">Navegación</span>
        <button class="collapse-btn" id="collapseBtn" title="Colapsar">◀</button>
      </div>

      <div class="product-selector" style="position:relative">
        <button class="product-btn" id="productBtn">
          <span class="product-icon">📦</span>
          <span class="product-name">${this.escapeHtml(activeProduct?.name ?? 'Seleccionar producto')}</span>
          <span class="product-count">${products.length}</span>
          <span class="product-arrow" id="productArrow">▸</span>
        </button>
        <div class="product-dropdown" id="productDropdown" style="display:none">
          ${products.map(p => `
            <div class="dropdown-item ${p.id === activeProductId ? 'active' : ''}" data-product-id="${p.id}">
              📦 ${this.escapeHtml(p.name)}
            </div>
          `).join('')}
          <div class="dropdown-new" id="newProductBtn">➕ Nuevo producto</div>
        </div>
      </div>

      <div class="sidebar-body">
        ${this.#renderProjects(activeProductId, activeProjectId, activeSprintId)}
      </div>
    `

    this.setupEventListeners(products, activeProductId)
  }

  #renderProjects(activeProductId, activeProjectId, activeSprintId) {
    if (!activeProductId) return `
      <div style="color:var(--apple-tertiary);font-size:12px;padding:var(--space-4) var(--space-2);text-align:center">
        Selecciona un producto
      </div>
    `
    const projects = store.getProjects(activeProductId)
    if (projects.length === 0) {
      return `
        <div style="color:var(--apple-tertiary);font-size:12px;padding:var(--space-3) var(--space-2)">
          Sin proyectos
        </div>
        ${this.#showCreateProject ? this.#renderNewProjectForm() : `
          <button class="add-btn" id="showProjectForm">➕ Nuevo proyecto</button>
        `}
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
              <span class="project-icon">📁</span>
              <span class="project-name">${this.escapeHtml(project.name)}</span>
              <span class="project-badge">${sprints.length}</span>
              <div class="project-actions">
                <button class="action-btn sprint-add" title="Nuevo sprint">➕</button>
                <button class="action-btn delete project-del" title="Eliminar">🗑</button>
              </div>
            </div>
            ${isOpen ? `
              <div class="sprint-list">
                <div class="all-tasks-row ${!activeSprintId && project.id === activeProjectId ? 'active' : ''}" data-scope="all" data-project-id="${project.id}">
                  <span class="sprint-dot"></span>
                  <span class="sprint-name">📋 Todas</span>
                </div>
                ${sprints.map(s => {
                  const stats = store.getSprintStats(s.id)
                  return `
                    <div class="sprint-item ${s.id === activeSprintId ? 'active' : ''} ${s.status === 'completed' ? 'completed' : ''}" data-sprint-id="${s.id}" data-project-id="${project.id}">
                      <span class="sprint-dot"></span>
                      <span class="sprint-name">${this.escapeHtml(s.name)}</span>
                      <span class="sprint-pts">${stats.total}★</span>
                      <div class="sprint-actions">
                        <button class="action-btn delete sprint-del" title="Eliminar">🗑</button>
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
        <button class="add-btn" id="showProjectForm">➕ Nuevo proyecto</button>
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
    shadow.getElementById('productBtn')?.addEventListener('click', e => {
      e.stopPropagation()
      const dd = shadow.getElementById('productDropdown')
      const arrow = shadow.getElementById('productArrow')
      const isOpen = dd.style.display !== 'none'
      dd.style.display = isOpen ? 'none' : 'block'
      arrow?.classList.toggle('open', !isOpen)
    })

    document.addEventListener('click', () => {
      shadow.getElementById('productDropdown').style.display = 'none'
      shadow.getElementById('productArrow')?.classList.remove('open')
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

    // Product form
    shadow.getElementById('cancelProduct')?.addEventListener('click', () => {
      this.#showCreateProduct = false; this.refresh()
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
      this.#showCreateProject = true; this.refresh()
      setTimeout(() => shadow.getElementById('newProjectName')?.focus(), 10)
    })
    shadow.getElementById('cancelProject')?.addEventListener('click', () => {
      this.#showCreateProject = false; this.refresh()
    })
    shadow.getElementById('saveProject')?.addEventListener('click', () => {
      const name = shadow.getElementById('newProjectName')?.value.trim()
      if (!name) { notify.error('El nombre es requerido'); return }
      const productId = store.getActiveProductId()
      if (!productId) { notify.error('Selecciona un producto primero'); return }
      try {
        const proj = store.addProject({ name, productId })
        store.setActiveProject(proj.id)
        this.#showCreateProject = false
        notify.success(`Proyecto "${name}" creado`)
      } catch (e) { notify.error(e.message) }
    })

    // Collapse toggle (project)
    shadow.querySelectorAll('.project-chevron').forEach(chev => {
      chev.closest('.project-header')?.addEventListener('click', e => {
        if (e.target.closest('.project-actions')) return
        const projectId = e.currentTarget.closest('.project-item')?.dataset.projectId
        if (!projectId) return
        if (this.#collapsedProducts.has(projectId)) {
          this.#collapsedProducts.delete(projectId)
        } else {
          this.#collapsedProducts.add(projectId)
        }
        this.refresh()
      })
    })

    // Select project
    shadow.querySelectorAll('.project-name, .project-icon').forEach(el => {
      el.closest('.project-header')?.addEventListener('click', e => {
        if (e.target.closest('.project-actions') || e.target.closest('.project-chevron')) return
        const projectId = e.currentTarget.closest('.project-item')?.dataset.projectId
        if (projectId) store.setActiveProject(projectId)
      })
    })

    // All tasks row
    shadow.querySelectorAll('.all-tasks-row').forEach(row => {
      row.addEventListener('click', () => {
        const projectId = row.dataset.projectId
        store.setActiveProject(projectId)
        store.setActiveSprint(null)
      })
    })

    // Sprint item
    shadow.querySelectorAll('.sprint-item').forEach(item => {
      item.addEventListener('click', () => {
        store.setActiveProject(item.dataset.projectId)
        store.setActiveSprint(item.dataset.sprintId)
      })
    })

    // Project delete
    shadow.querySelectorAll('.project-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const projectId = e.target.closest('.project-item')?.dataset.projectId
        if (!projectId) return
        const project = store.getProject(projectId)
        const sprints = store.getSprintsByProject(projectId)
        const tasks = sprints.flatMap(s => store.getTasksBySprint(s.id))
        this.showConfirm(
          `${project?.name}\n\nSe eliminarán ${sprints.length} sprints y ${tasks.length} tareas.`,
          () => {
            sprints.forEach(s => store.deleteSprint(s.id))
            store.deleteProject(projectId)
            notify.info('Proyecto eliminado')
          }
        )
      })
    })

    // Sprint add
    shadow.querySelectorAll('.sprint-add').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const projectId = e.currentTarget.closest('.project-item')?.dataset.projectId
        if (!projectId) return
        // Remove existing sprint form
        shadow.querySelectorAll('.create-form').forEach(f => f.remove())
        const projectEl = shadow.querySelector(`.project-item[data-project-id="${projectId}"]`)
        projectEl?.insertAdjacentHTML('beforeend', this.#renderNewSprintForm(projectId))
        this.setupSprintForm(projectId)
      })
    })

    // Sprint delete
    shadow.querySelectorAll('.sprint-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const sprintId = e.currentTarget.closest('.sprint-item')?.dataset.sprintId
        if (!sprintId) return
        const sprint = store.getSprint(sprintId)
        const tasks = store.getTasksBySprint(sprintId)
        this.showConfirm(
          `${sprint?.name}\n\nSe eliminarán ${tasks.length} tareas.`,
          () => { store.deleteSprint(sprintId); notify.info('Sprint eliminado') }
        )
      })
    })

    // Product form (create)
    if (this.#showCreateProduct) {
      const form = shadow.querySelector('#newProductForm')
      if (form) {
        form.querySelector('#cancelProduct')?.addEventListener('click', () => {
          this.#showCreateProduct = false; this.refresh()
        })
        form.querySelector('#saveProduct')?.addEventListener('click', () => {
          const name = form.querySelector('#newProductName')?.value.trim()
          if (!name) { notify.error('El nombre es requerido'); return }
          try {
            const p = store.addProduct({ name })
            store.setActiveProduct(p.id)
            this.#showCreateProduct = false
            notify.success(`Producto "${name}" creado`)
          } catch (e) { notify.error(e.message) }
        })
      }
    }
  }

  setupSprintForm(projectId) {
    const shadow = this.shadowRoot
    const form = shadow.querySelector('#newSprintForm')
    if (!form) return

    form.querySelector('#cancelSprint')?.addEventListener('click', () => form.remove())
    form.querySelector('#saveSprint')?.addEventListener('click', () => {
      const name = form.querySelector('#newSprintName')?.value.trim()
      const startDate = form.querySelector('#newSprintStart')?.value
      const endDate = form.querySelector('#newSprintEnd')?.value
      if (!name) { notify.error('El nombre es requerido'); return }
      try {
        const sprint = store.addSprint({ name, projectId, startDate, endDate })
        store.setActiveSprint(sprint.id)
        form.remove()
        notify.success(`Sprint "${name}" creado`)
      } catch (e) { notify.error(e.message) }
    })
  }

  showConfirm(message, onYes) {
    const overlay = this.shadowRoot.querySelector('.sidebar-body')
    overlay.insertAdjacentHTML('beforeend', this.#renderConfirmDelete(message))
    const shadow = this.shadowRoot
    shadow.getElementById('confirmYes')?.addEventListener('click', () => {
      onYes()
      shadow.getElementById('confirmOverlay')?.remove()
    })
    shadow.getElementById('confirmNo')?.addEventListener('click', () => {
      shadow.getElementById('confirmOverlay')?.remove()
    })
    shadow.getElementById('confirmOverlay')?.addEventListener('click', e => {
      if (e.target === shadow.getElementById('confirmOverlay')) {
        shadow.getElementById('confirmOverlay')?.remove()
      }
    })
  }

  escapeHtml(text) {
    const d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }
}

customElements.define('sprint-sidebar', SprintSidebar)
