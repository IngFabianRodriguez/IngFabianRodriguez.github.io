// src/utils/Notifications.js — Apple Design Language

class NotificationSystem {
  #container = null
  #toasts = []
  #maxToasts = 3
  #defaultDuration = 2800

  constructor() { this.#initContainer() }

  #initContainer() {
    if (this.#container) return
    this.#container = document.createElement('div')
    this.#container.id = 'notifications-container'
    this.#container.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 9999;
      pointer-events: none;
    `
    document.body.appendChild(this.#container)
  }

  notify(message, type = 'info', duration = this.#defaultDuration) {
    this.#initContainer()

    if (this.#toasts.length >= this.#maxToasts) {
      const oldest = this.#toasts.shift()
      oldest?.element.classList.add('toast-exit')
      setTimeout(() => oldest?.element.remove(), 200)
    }

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.style.cssText = `
      background: ${this.#getColor(type)};
      color: #000;
      padding: 11px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 5100;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 1px rgba(0,0,0,0.3);
      pointer-events: auto;
      animation: toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      backdrop-filter: blur(8px);
    `

    toast.innerHTML = `
      <span style="font-size:14px">${this.#getIcon(type)}</span>
      <span style="font-weight:500">${this.escapeHtml(message)}</span>
    `

    const closeBtn = document.createElement('button')
    closeBtn.innerHTML = '✕'
    closeBtn.style.cssText = `
      background: rgba(0,0,0,0.12);
      border: none;
      color: #000;
      cursor: pointer;
      font-size: 11px;
      padding: 3px 7px;
      border-radius: 6px;
      margin-left: 4px;
      opacity: 0.7;
      transition: opacity 0.15s;
    `
    closeBtn.onmouseover = () => closeBtn.style.opacity = '1'
    closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7'
    closeBtn.onclick = () => this.dismiss(toast)
    toast.appendChild(closeBtn)

    this.#container.appendChild(toast)
    const toastObj = { element: toast, message, type }
    this.#toasts.push(toastObj)

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration)
    }
    return toast
  }

  dismiss(toast) {
    if (!toast?.parentElement) return
    toast.classList.add('toast-exit')
    setTimeout(() => {
      toast.remove()
      this.#toasts = this.#toasts.filter(t => t.element !== toast)
    }, 250)
  }

  #getColor(type) {
    return {
      success: 'rgba(48, 209, 88, 0.95)',
      error:   'rgba(255, 69, 58, 0.95)',
      info:    'rgba(10, 132, 255, 0.95)',
      warning: 'rgba(255, 159, 10, 0.95)',
      delete:  'rgba(255, 69, 58, 0.95)'
    }[type] || 'rgba(10,132,255,0.95)'
  }

  #getIcon(type) {
    return {
      success: '✓',
      error:   '✕',
      info:    'ℹ',
      warning: '⚠',
      delete:  '🗑'
    }[type] || 'ℹ'
  }

  escapeHtml(text) {
    const d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }

  success(message, duration) { return this.notify(message, 'success', duration) }
  error(message, duration)   { return this.notify(message, 'error', duration) }
  info(message, duration)    { return this.notify(message, 'info', duration) }
  warning(message, duration)  { return this.notify(message, 'warning', duration) }
  delete(message, onUndo)    { return this.notify(message, 'delete', 5000) }
}

// Inject toast animation
if (typeof document !== 'undefined') {
  const s = document.createElement('style')
  s.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(16px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .toast-exit {
      animation: toastOut 0.25s ease forwards !important;
    }
    @keyframes toastOut {
      to { opacity: 0; transform: translateY(8px) scale(0.95); }
    }
  `
  document.head?.appendChild(s)
}

export const notify = new NotificationSystem()
