// src/components/BurndownChart.js — Apple Design Language

import { TaskStatus } from '../models/Task.js'
import { store } from '../store/TaskStore.js'

export class BurndownChart extends HTMLElement {
  #collapsed = true
  #unsubscribe = null

  constructor() { super(); this.attachShadow({ mode: 'open' }) }

  connectedCallback() {
    this.#unsubscribe = store.subscribe(() => this.refresh())
    this.refresh()
  }

  disconnectedCallback() { this.#unsubscribe?.() }

  refresh() {
    const sprintId = store.getActiveSprintId()
    if (!sprintId) { this.renderEmpty(); return }
    const sprint = store.getSprint(sprintId)
    if (!sprint) { this.renderEmpty(); return }

    const tasks = store.getTasksBySprint(sprintId)
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const startDate = new Date(sprint.startDate)
    const endDate = new Date(sprint.endDate)
    const today = new Date()
    const sprintDays = this.getDaysBetween(startDate, endDate)
    const daysPassed = Math.max(0, Math.min(sprintDays, this.getDaysBetween(startDate, today)))

    const idealBurndown = []
    for (let i = 0; i <= sprintDays; i++) {
      const remaining = totalPoints - (totalPoints / sprintDays) * i
      idealBurndown.push({ day: i, points: Math.max(0, remaining) })
    }

    const actualBurndown = this.calculateActualBurndown(tasks, startDate, sprintDays, totalPoints)
    this.render(sprint, totalPoints, sprintDays, idealBurndown, actualBurndown, daysPassed)
  }

  getDaysBetween(start, end) {
    return Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1
  }

  calculateActualBurndown(tasks, startDate, sprintDays, totalPoints) {
    const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE)
    const pointsPerDay = new Map()
    for (let i = 0; i <= sprintDays; i++) pointsPerDay.set(i, 0)

    doneTasks.forEach(task => {
      const updatedDate = new Date(task.updatedAt)
      const dayIndex = Math.max(0, Math.min(sprintDays, this.getDaysBetween(startDate, updatedDate)))
      pointsPerDay.set(dayIndex, (pointsPerDay.get(dayIndex) || 0) + (task.storyPoints || 0))
    })

    const actual = []
    let remaining = totalPoints
    for (let i = 0; i <= sprintDays; i++) {
      remaining = Math.max(0, remaining - (pointsPerDay.get(i) || 0))
      actual.push({ day: i, points: remaining })
    }
    return actual
  }

  renderEmpty() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--apple-surface-1);
          border-top: 0.5px solid rgba(255,255,255,0.06);
        }
        .chart-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px var(--space-5);
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }
        .chart-toggle:hover { background: rgba(255,255,255,0.02); }
        .toggle-label {
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-tertiary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-icon {
          font-size: 10px;
          color: var(--apple-tertiary);
          transition: transform 0.25s var(--ease-apple);
        }
        .toggle-icon.open { transform: rotate(180deg); }
        .no-sprint {
          padding: var(--space-4) var(--space-5);
          text-align: center;
          font-size: 12px;
          color: var(--apple-tertiary);
        }
      </style>
      <div class="chart-toggle" id="toggle">
        <span class="toggle-label">
          <span>📊</span>
          Burndown
        </span>
        <span class="toggle-icon" id="chevron">▼</span>
      </div>
    `
    this.setupToggle()
  }

  render(sprint, totalPoints, sprintDays, idealBurndown, actualBurndown, daysPassed) {
    const W = 600, H = 200
    const pad = { top: 20, right: 30, bottom: 32, left: 50 }
    const innerW = W - pad.left - pad.right
    const innerH = H - pad.top - pad.bottom

    const xScale = d => pad.left + (d / sprintDays) * innerW
    const yScale = p => pad.top + innerH - (p / totalPoints) * innerH

    const idealPath = idealBurndown.map((d, i) => `${i===0?'M':'L'} ${xScale(d.day)} ${yScale(d.points)}`).join(' ')
    const actualPath = actualBurndown.map((d, i) => `${i===0?'M':'L'} ${xScale(d.day)} ${yScale(d.points)}`).join(' ')

    const yTicks = []
    const tickStep = Math.ceil(totalPoints / 4) || 1
    for (let i = 0; i <= totalPoints; i += tickStep) yTicks.push(i)

    const dayStep = Math.max(1, Math.floor(sprintDays / 5))
    const xTicks = []
    for (let i = 0; i <= sprintDays; i += dayStep) xTicks.push(i)

    const todayX = xScale(Math.min(daysPassed, sprintDays))
    const todayY0 = pad.top
    const todayY1 = H - pad.bottom

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--apple-surface-1);
          border-top: 0.5px solid rgba(255,255,255,0.06);
        }
        .chart-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px var(--space-5);
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }
        .chart-toggle:hover { background: rgba(255,255,255,0.02); }
        .toggle-label {
          font-size: 12px;
          font-weight: var(--font-weight-medium);
          color: var(--apple-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-icon {
          font-size: 10px;
          color: var(--apple-tertiary);
          transition: transform 0.25s var(--ease-apple);
        }
        .toggle-icon.open { transform: rotate(180deg); }
        .chart-wrap {
          padding: 0 var(--space-5) var(--space-4);
          display: ${this.#collapsed ? 'none' : 'block'};
          animation: fadeInUp 0.2s var(--ease-apple);
        }
        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }
        .sprint-title {
          font-size: 13px;
          font-weight: var(--font-weight-semibold);
          color: var(--apple-label);
        }
        .sprint-dates {
          font-size: 11px;
          color: var(--apple-tertiary);
        }
        .legend {
          display: flex;
          gap: var(--space-4);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--apple-tertiary);
        }
        .legend-line {
          width: 16px;
          height: 2px;
          border-radius: 1px;
        }
        .legend-line.ideal { background: var(--apple-tertiary); opacity: 0.6; }
        .legend-line.actual { background: var(--apple-blue); }
        .chart-svg {
          display: block;
          width: 100%;
          max-width: 600px;
        }
        .grid-line { stroke: rgba(255,255,255,0.04); stroke-width: 1; }
        .axis-label { font-size: 10px; fill: var(--apple-tertiary); font-family: var(--font); }
        .ideal-line { fill: none; stroke: var(--apple-tertiary); stroke-width: 1.5; stroke-dasharray: 5 3; opacity: 0.6; }
        .actual-line { fill: none; stroke: var(--apple-blue); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .today-line { stroke: var(--apple-orange); stroke-width: 1; stroke-dasharray: 4 3; opacity: 0.5; }
        .today-label { font-size: 10px; fill: var(--apple-orange); font-family: var(--font); opacity: 0.8; }
        .data-point { fill: var(--apple-blue); r: 3.5; }
      </style>

      <div class="chart-toggle" id="toggle">
        <span class="toggle-label">
          <span>📊</span>
          Burndown — ${this.escapeHtml(sprint.name)}
        </span>
        <span class="toggle-icon ${this.#collapsed ? '' : 'open'}" id="chevron">▼</span>
      </div>

      <div class="chart-wrap">
        <div class="chart-header">
          <div>
            <div class="sprint-title">${this.escapeHtml(sprint.name)}</div>
            <div class="sprint-dates">
              ${new Date(sprint.startDate).toLocaleDateString('es-ES', {day:'numeric',month:'short'})}
              —
              ${new Date(sprint.endDate).toLocaleDateString('es-ES', {day:'numeric',month:'short'})}
              · ${totalPoints} puntos
            </div>
          </div>
          <div class="legend">
            <div class="legend-item">
              <div class="legend-line ideal"></div>
              Ideal
            </div>
            <div class="legend-item">
              <div class="legend-line actual"></div>
              Real
            </div>
          </div>
        </div>

        <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <!-- Grid -->
          ${yTicks.map(tick => `
            <line class="grid-line"
              x1="${pad.left}" y1="${yScale(tick)}"
              x2="${W - pad.right}" y2="${yScale(tick)}" />
            <text class="axis-label"
              x="${pad.left - 8}" y="${yScale(tick) + 3}"
              text-anchor="end">${tick}</text>
          `).join('')}

          <!-- X labels -->
          ${xTicks.map(tick => `
            <text class="axis-label"
              x="${xScale(tick)}" y="${H - 8}"
              text-anchor="middle">Día ${tick}</text>
          `).join('')}

          <!-- Today marker -->
          <line class="today-line" x1="${todayX}" y1="${todayY0}" x2="${todayX}" y2="${todayY1}" />
          <text class="today-label" x="${todayX + 4}" y="${pad.top + 12}">Hoy</text>

          <!-- Ideal line -->
          <path class="ideal-line" d="${idealPath}" />

          <!-- Actual line -->
          <path class="actual-line" d="${actualPath}" />

          <!-- Data points (sampled) -->
          ${actualBurndown
            .filter((_, i) => i % Math.max(1, Math.floor(sprintDays / 8)) === 0 || i === actualBurndown.length - 1)
            .map(d => `<circle class="data-point" cx="${xScale(d.day)}" cy="${yScale(d.points)}" />`)
            .join('')}
        </svg>
      </div>
    `
    this.setupToggle()
  }

  setupToggle() {
    this.shadowRoot.getElementById('toggle')?.addEventListener('click', () => {
      this.#collapsed = !this.#collapsed
      const chevron = this.shadowRoot.getElementById('chevron')
      const wrap = this.shadowRoot.querySelector('.chart-wrap')
      if (chevron) chevron.classList.toggle('open', !this.#collapsed)
      if (wrap) wrap.style.display = this.#collapsed ? 'none' : 'block'
    })
  }

  escapeHtml(text) {
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML
  }
}

customElements.define('burndown-chart', BurndownChart)
