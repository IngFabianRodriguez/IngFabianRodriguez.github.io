// src/store/LocalStorage.js

const STORAGE_KEY = 'scrum_backlog_tasks'

export function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.error('Error loading tasks from localStorage:', e)
    return []
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    return true
  } catch (e) {
    console.error('Error saving tasks to localStorage:', e)
    return false
  }
}

export function clearTasks() {
  localStorage.removeItem(STORAGE_KEY)
}
