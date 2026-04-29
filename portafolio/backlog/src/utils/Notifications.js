// src/utils/Notifications.js

class NotificationSystem {
  #container = null
  #toasts = []
  #maxToasts = 3
  #defaultDuration = 3000

  constructor() {
    this.#initContainer()
  }

  #initContainer() {
    if (this.#container) return
    
    this.#container = document.createElement('div')
    this.#container.id = 'notifications-container'
    this.#container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10000;
      pointer-events: none;
    `
    document.body.appendChild(this.#container)
  }

  notify(message, type = 'info', duration = this.#defaultDuration) {
    this.#initContainer()
    
    // Remove oldest if at max
    if (this.#toasts.length >= this.#maxToasts) {
      const oldest = this.#toasts.shift()
      if (oldest) {
        oldest.element.classList.add('toast-exit')
        setTimeout(() => oldest.element.remove(), 200)
      }
    }

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.style.cssText = `
      background: ${this.#getColor(type)};
      color: #11111b;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: auto;
      animation: toast-enter 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 320px;
    `

    const icon = this.#getIcon(type)
    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`

    // Add undo button for delete notifications
    if (type === 'delete') {
      const undoBtn = document.createElement('button')
      undoBtn.textContent = '↩︎ Deshacer'
      undoBtn.style.cssText = `
        background: rgba(0,0,0,0.2);
        border: none;
        color: #11111b;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      `
      undoBtn.onclick = () => {
        if (this.onUndo) this.onUndo()
        this.dismiss(toast)
      }
      toast.appendChild(undoBtn)
    }

    const dismissBtn = document.createElement('button')
    dismissBtn.innerHTML = '✕'
    dismissBtn.style.cssText = `
      background: none;
      border: none;
      color: #11111b;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.7;
      padding: 0;
      margin-left: 4px;
    `
    dismissBtn.onclick = () => this.dismiss(toast)
    toast.appendChild(dismissBtn)

    this.#container.appendChild(toast)

    const toastObj = { element: toast, message, type }
    this.#toasts.push(toastObj)

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration)
    }

    return toast
  }

  dismiss(toast) {
    if (!toast || !toast.parentElement) return
    
    toast.classList.add('toast-exit')
    setTimeout(() => {
      toast.remove()
      this.#toasts = this.#toasts.filter(t => t.element !== toast)
    }, 200)
  }

  #getColor(type) {
    const colors = {
      success: '#a6e3a1',
      error: '#f38ba8',
      info: '#89b4fa',
      warning: '#f9e2af'
    }
    return colors[type] || colors.info
  }

  #getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
      delete: '🗑️'
    }
    return icons[type] || icons.info
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Convenience methods
  success(message, duration) {
    return this.notify(message, 'success', duration)
  }

  error(message, duration) {
    return this.notify(message, 'error', duration)
  }

  info(message, duration) {
    return this.notify(message, 'info', duration)
  }

  warning(message, duration) {
    return this.notify(message, 'warning', duration)
  }

  delete(message, onUndo) {
    this.onUndo = onUndo
    return this.notify(message, 'delete', 5000)
  }
}

export const notify = new NotificationSystem()
