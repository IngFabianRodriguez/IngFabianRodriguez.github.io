// src/utils/EventBus.js

export const Events = {
  TASK_ADDED: 'task:added',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_MOVED: 'task:moved',
  COLUMN_RENDERED: 'column:rendered',
  DRAG_START: 'drag:start',
  DRAG_END: 'drag:end',
  FILTER_CHANGED: 'filter:changed'
}

class EventBus {
  #listeners = new Map()

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set())
    }
    this.#listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  off(event, callback) {
    this.#listeners.get(event)?.delete(callback)
  }

  emit(event, data) {
    this.#listeners.get(event)?.forEach(cb => cb(data))
  }
}

export const eventBus = new EventBus()
