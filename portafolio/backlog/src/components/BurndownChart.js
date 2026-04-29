// src/components/BurndownChart.js

import { TaskStatus } from '../models/Task.js'
import { store } from '../store/TaskStore.js'

export class BurndownChart extends HTMLElement {
  #collapsed = true
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
    const sprintId = store.getSelectedSprintId()
    if (!sprintId) {
      this.renderEmpty()
      return
    }

    const sprint = store.getSprint(sprintId)
    if (!sprint) {
      this.renderEmpty()
      return
    }

    const tasks = store.getTasksBySprint(sprintId)
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const startDate = new Date(sprint.startDate)
    const endDate = new Date(sprint.endDate)
    const today = new Date()
    
    // Calculate sprint days
    const sprintDays = this.getDaysBetween(startDate, endDate)
    const daysPassed = Math.max(0, Math.min(sprintDays, this.getDaysBetween(startDate, today)))
    
    // Generate ideal burndown data
    const idealBurndown = []
    for (let i = 0; i <= sprintDays; i++) {
      const remaining = totalPoints - (totalPoints / sprintDays) * i
      idealBurndown.push({ day: i, points: Math.max(0, remaining) })
    }
    
    // Generate actual burndown data from done tasks
    const actualBurndown = this.calculateActualBurndown(tasks, startDate, sprintDays, totalPoints)

    this.render(sprint, totalPoints, sprintDays, idealBurndown, actualBurndown, this.#collapsed)
  }

  getDaysBetween(start, end) {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.ceil((end - start) / msPerDay) + 1
  }

  calculateActualBurndown(tasks, startDate, sprintDays, totalPoints) {
    const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE)
    
    // Create a map of points burned per day
    const pointsPerDay = new Map()
    
    // Initialize all days with remaining points (no change yet)
    for (let i = 0; i <= sprintDays; i++) {
      pointsPerDay.set(i, 0)
    }
    
    // Distribute done tasks' points across days based on their updatedAt
    doneTasks.forEach(task => {
      const updatedDate = new Date(task.updatedAt)
      const dayIndex = Math.max(0, Math.min(sprintDays, this.getDaysBetween(startDate, updatedDate)))
      const current = pointsPerDay.get(dayIndex) || 0
      pointsPerDay.set(dayIndex, current + (task.storyPoints || 0))
    })
    
    // Calculate cumulative burndown
    const actual = []
    let remaining = totalPoints
    
    for (let i = 0; i <= sprintDays; i++) {
      const burnedToday = pointsPerDay.get(i) || 0
      remaining = remaining - burnedToday
      actual.push({ day: i, points: Math.max(0, remaining) })
    }
    
    return actual
  }

  renderEmpty() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: #11111b;
          border-top: 1px solid #313244;
        }
        .chart-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          cursor: pointer;
          user-select: none;
        }
        .chart-toggle:hover {
          background: #181825;
        }
        .toggle-label {
          font-size: 13px;
          color: #6c7086;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-icon {
          font-size: 12px;
          transition: transform 0.2s;
        }
        .toggle-icon.expanded {
          transform: rotate(180deg);
        }
        .no-sprint-msg {
          padding: 12px 24px;
          font-size: 12px;
          color: #6c7086;
          text-align: center;
        }
      </style>
      <div class="chart-toggle" id="toggle">
        <span class="toggle-label">
          <span>📊</span>
          Burndown
        </span>
        <span class="toggle-icon ${this.#collapsed ? '' : 'expanded'}">▼</span>
      </div>
    `
    this.setupEventListeners()
  }

  render(sprint, totalPoints, sprintDays, idealBurndown, actualBurndown, collapsed) {
    const chartWidth = 600
    const chartHeight = 200
    const padding = { top: 20, right: 30, bottom: 30, left: 50 }
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom

    // Scales
    const xScale = (day) => padding.left + (day / sprintDays) * innerWidth
    const yScale = (points) => padding.top + innerHeight - (points / totalPoints) * innerHeight

    // Generate path
    const idealPath = idealBurndown.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(d.day)} ${yScale(d.points)}`
    ).join(' ')

    const actualPath = actualBurndown.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(d.day)} ${yScale(d.points)}`
    ).join(' ')

    // Y-axis ticks
    const yTicks = []
    const tickStep = Math.ceil(totalPoints / 5)
    for (let i = 0; i <= totalPoints; i += tickStep) {
      yTicks.push(i)
    }

    // X-axis ticks (every few days)
    const xTicks = []
    const dayStep = Math.max(1, Math.floor(sprintDays / 6))
    for (let i = 0; i <= sprintDays; i += dayStep) {
      xTicks.push(i)
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: #11111b;
          border-top: 1px solid #313244;
        }
        .chart-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          cursor: pointer;
          user-select: none;
        }
        .chart-toggle:hover {
          background: #181825;
        }
        .toggle-label {
          font-size: 13px;
          color: #6c7086;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-icon {
          font-size: 12px;
          transition: transform 0.2s;
        }
        .toggle-icon.expanded {
          transform: rotate(180deg);
        }
        .chart-container {
          padding: 0 24px 16px;
          display: ${collapsed ? 'none' : 'block'};
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .sprint-name {
          font-size: 14px;
          font-weight: 600;
          color: #cdd6f4;
        }
        .sprint-dates {
          font-size: 11px;
          color: #6c7086;
        }
        .chart-legend {
          display: flex;
          gap: 16px;
          font-size: 11px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .legend-line {
          width: 16px;
          height: 2px;
        }
        .legend-line.ideal {
          background: #6c7086;
        }
        .legend-line.actual {
          background: #89b4fa;
        }
        .chart-svg {
          display: block;
          width: 100%;
          max-width: 600px;
        }
        .axis-label {
          font-size: 10px;
          fill: #6c7086;
        }
        .grid-line {
          stroke: #313244;
          stroke-width: 1;
        }
        .ideal-line {
          fill: none;
          stroke: #6c7086;
          stroke-width: 1.5;
          stroke-dasharray: 4 2;
        }
        .actual-line {
          fill: none;
          stroke: #89b4fa;
          stroke-width: 2;
        }
        .data-point {
          fill: #89b4fa;
          r: 3;
        }
      </style>
      
      <div class="chart-toggle" id="toggle">
        <span class="toggle-label">
          <span>📊</span>
          Burndown - ${sprint.name}
        </span>
        <span class="toggle-icon ${collapsed ? '' : 'expanded'}">▼</span>
      </div>
      
      <div class="chart-container">
        <div class="chart-header">
          <span class="sprint-name">${sprint.name} - ${totalPoints} puntos totales</span>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-line ideal"></span>
              <span>Ideal</span>
            </div>
            <div class="legend-item">
              <span class="legend-line actual"></span>
              <span>Real</span>
            </div>
          </div>
        </div>
        
        <svg class="chart-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
          <!-- Grid lines -->
          ${yTicks.map(tick => `
            <line class="grid-line" 
              x1="${padding.left}" 
              y1="${yScale(tick)}" 
              x2="${chartWidth - padding.right}" 
              y2="${yScale(tick)}" />
          `).join('')}
          
          <!-- Y-axis labels -->
          ${yTicks.map(tick => `
            <text class="axis-label" x="${padding.left - 8}" y="${yScale(tick) + 3}" text-anchor="end">${tick}</text>
          `).join('')}
          
          <!-- X-axis labels -->
          ${xTicks.map(tick => `
            <text class="axis-label" x="${xScale(tick)}" y="${chartHeight - 8}" text-anchor="middle">Día ${tick}</text>
          `).join('')}
          
          <!-- Ideal burndown line -->
          <path class="ideal-line" d="${idealPath}" />
          
          <!-- Actual burndown line -->
          <path class="actual-line" d="${actualPath}" />
          
          <!-- Data points for actual -->
          ${actualBurndown.filter((_, i) => i % Math.max(1, Math.floor(sprintDays / 8)) === 0 || i === actualBurndown.length - 1).map(d => `
            <circle class="data-point" cx="${xScale(d.day)}" cy="${yScale(d.points)}" />
          `).join('')}
        </svg>
      </div>
    `
    this.setupEventListeners()
  }

  setupEventListeners() {
    this.shadowRoot.getElementById('toggle')?.addEventListener('click', () => {
      this.#collapsed = !this.#collapsed
      this.refresh()
    })
  }
}

customElements.define('burndown-chart', BurndownChart)
