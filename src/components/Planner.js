import { icons } from '../icons.js';
import confetti from 'canvas-confetti';
import { showPlannerCellPopup } from './PlannerCellPopup.js';
import { showToast } from '../main.js';

// Fixed time slots for spreadsheet grid matching the user's reference
const TIME_SLOTS = [
  '06:30 AM', '07:30 AM', '08:30 AM', '09:30 AM', '10:30 AM', '11:30 AM',
  '12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM', '05:30 PM',
  '06:30 PM', '07:30 PM', '08:30 PM', '09:30 PM', '10:30 PM'
];

let activePlannerSubView = 'grid'; // default view sub-tab ('grid' or 'list')

export function renderPlanner(container, state) {
  // If no day expanded yet, default to the active date
  if (!state.expandedDayDate) {
    state.expandedDayDate = state.getActiveDate();
  }

  // Aggregate all pending tasks across categories
  const allPendingTasks = [];
  state.projects.forEach(p => {
    if (p.subtasks) {
      p.subtasks.filter(s => !s.completed).forEach(sub => {
        allPendingTasks.push({
          ...sub,
          projectId: p.id,
          projectName: p.name,
          projectType: p.type
        });
      });
    }
  });

  const weekDays = state.getDaysForActiveWeek();
  const startLabel = weekDays[0] ? weekDays[0].label.replace(/, \d{4}/, '') : '';
  const endLabel = weekDays[6] ? weekDays[6].label.replace(/, \d{4}/, '') : '';
  const year = weekDays[0] ? new Date(weekDays[0].date).getFullYear() : '';
  const weekRangeText = `${startLabel} – ${endLabel}, ${year}`;

  // 1. Render outer layout with sub-tabs (Spreadsheet vs Detailed List)
  container.innerHTML = `
    <div class="section-header">
      <div class="section-title">
        <span>Daily Schedule Planner</span>
      </div>
      <div class="view-tabs">
        <button class="tab-btn ${activePlannerSubView === 'grid' ? 'active' : ''}" id="tab-subview-grid">
          <span>Grid Planner</span>
        </button>
        <button class="tab-btn ${activePlannerSubView === 'list' ? 'active' : ''}" id="tab-subview-list">
          <span>Detailed Cards</span>
        </button>
      </div>
    </div>

    <!-- Quick navigation bar for weeks -->
    <div class="card" style="padding: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" id="planner-prev-week-btn">◀ Prev Week</button>
        <span style="font-size: 13px; font-weight: 700; color: var(--text-primary); font-family: var(--font-header);" id="planner-week-range">${weekRangeText}</span>
        <button class="btn btn-secondary btn-sm" id="planner-next-week-btn">Next Week ▶</button>
        <button class="btn btn-secondary btn-sm" id="planner-today-btn" style="margin-left: 6px;">Today</button>
      </div>
      <div style="display: flex; gap: 6px;" id="grid-scroll-controls">
        <button class="btn btn-secondary btn-sm scroll-grid-btn" data-dir="left">◀ Scroll Left</button>
        <button class="btn btn-secondary btn-sm scroll-grid-btn" data-dir="right">Scroll Right ▶</button>
      </div>
    </div>

    <!-- Collapsible Category Tasks Backlog in Daily Planner -->
    <div class="card" style="padding: 12px 16px; margin-bottom: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggle-planner-backlog-btn">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:14px; font-weight:800; color:var(--text-primary);">🎯 Category Tasks Backlog & Roadmap</span>
          <span class="badge" style="background:var(--accent-glow); color:var(--accent); font-weight:800; font-size:11px; padding:2px 8px; border-radius:12px;">
            ${allPendingTasks.length} Pending
          </span>
          <span style="font-size:11px; color:var(--text-muted);">(Study, Etsy, Quran, Projects)</span>
        </div>
        <span id="planner-backlog-toggle-icon" style="font-size:12px; color:var(--accent); font-weight:700;">Show Backlog ▾</span>
      </div>

      <div id="planner-backlog-content" style="display:none; margin-top:12px; border-top:1px solid var(--border-color); padding-top:12px;">
        <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm planner-cat-filter active" data-cat="all">All (${allPendingTasks.length})</button>
          <button class="btn btn-secondary btn-sm planner-cat-filter" data-cat="study">Study (${allPendingTasks.filter(t => t.projectType === 'study').length})</button>
          <button class="btn btn-secondary btn-sm planner-cat-filter" data-cat="etsy_seo">Etsy (${allPendingTasks.filter(t => t.projectType === 'etsy_seo').length})</button>
          <button class="btn btn-secondary btn-sm planner-cat-filter" data-cat="quran">Quran (${allPendingTasks.filter(t => t.projectType === 'quran').length})</button>
          ${state.customSections.filter(s => s.type !== 'quran').map(s => `
            <button class="btn btn-secondary btn-sm planner-cat-filter" data-cat="${s.type}">${s.label} (${allPendingTasks.filter(t => t.projectType === s.type).length})</button>
          `).join('')}
        </div>

        <div id="planner-backlog-items" style="display:flex; flex-direction:column; gap:6px; max-height:260px; overflow-y:auto; padding-right:4px;">
          ${allPendingTasks.length === 0 ? `
            <div style="font-size:12px; color:var(--text-muted); font-style:italic; padding:8px 0;">No pending category tasks!</div>
          ` : allPendingTasks.map(task => {
            const catLabel = task.projectType === 'study' ? 'Study' : task.projectType === 'etsy_seo' ? 'Etsy' : task.projectType === 'quran' ? 'Quran' : 'Project';
            return `
              <div class="planner-backlog-item" data-cat="${task.projectType}" style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-tertiary); padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-color); gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                  <span class="badge" style="font-size:9px; font-weight:800; text-transform:uppercase; padding:2px 5px; border-radius:3px; background:var(--bg-secondary); color:var(--accent);">${catLabel}</span>
                  <span style="font-size:12px; font-weight:600; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${task.projectName}: ${task.name}">
                    ${task.projectName}: <strong>${task.name}</strong>
                  </span>
                  <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); margin-left:auto; flex-shrink:0;">~${task.estimatedMinutes || 30}m</span>
                </div>
                <button class="btn btn-primary btn-sm planner-schedule-backlog-btn" data-proj-id="${task.projectId}" data-task-name="${encodeURIComponent(task.name)}" data-cat="${task.projectType}" style="height:24px; padding:0 8px; font-size:10px; font-weight:700;">
                  ⚡ Schedule
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- View Content Area -->
    <div id="planner-content-area"></div>
    
    <!-- Modal containers -->
    <div id="planner-modal-container"></div>
  `;

  // Backlog toggle handler
  const toggleBacklogBtn = container.querySelector('#toggle-planner-backlog-btn');
  const backlogContent = container.querySelector('#planner-backlog-content');
  const backlogToggleIcon = container.querySelector('#planner-backlog-toggle-icon');
  if (toggleBacklogBtn && backlogContent) {
    toggleBacklogBtn.addEventListener('click', () => {
      const isHidden = backlogContent.style.display === 'none';
      backlogContent.style.display = isHidden ? 'block' : 'none';
      if (backlogToggleIcon) {
        backlogToggleIcon.textContent = isHidden ? 'Hide Backlog ▴' : 'Show Backlog ▾';
      }
    });
  }

  // Backlog category filtering
  container.querySelectorAll('.planner-cat-filter').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.planner-cat-filter').forEach(t => {
        t.classList.remove('btn-primary', 'active');
        t.classList.add('btn-secondary');
      });
      tab.classList.remove('btn-secondary');
      tab.classList.add('btn-primary', 'active');

      const filterCat = tab.getAttribute('data-cat');
      container.querySelectorAll('.planner-backlog-item').forEach(item => {
        if (filterCat === 'all' || item.getAttribute('data-cat') === filterCat) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Schedule backlog task
  container.querySelectorAll('.planner-schedule-backlog-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-proj-id'));
      const taskName = decodeURIComponent(btn.getAttribute('data-task-name'));
      const taskCat = btn.getAttribute('data-cat') || 'general';
      const project = state.projects.find(p => p.id === projId);

      const activeDate = state.getActiveDate();
      const day = state.days.find(d => d.date === activeDate);
      if (!day) return;

      const freeSlot = state.timeIntervals.find(slot => !day.schedule.some(t => t.plannedTime === slot));
      if (!freeSlot) {
        alert(`No free time slots available on your schedule for ${activeDate}! Please free up a slot in the grid.`);
        return;
      }

      const newTask = {
        id: 't-' + Date.now(),
        name: `${project ? project.name + ': ' : ''}${taskName}`,
        plannedTime: freeSlot,
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: taskCat
      };

      day.schedule.push(newTask);
      day.schedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });

      await state.updateDay(day.date, { schedule: day.schedule });

      if (project) {
        project.lastWorkedOn = Date.now();
        await state.updateProject(projId, { lastWorkedOn: project.lastWorkedOn });
      }

      confetti({ particleCount: 50, spread: 35 });
      showToast(`⚡ Scheduled "${taskName}" at ${freeSlot} on ${activeDate}!`);
      renderPlanner(container, state);
    });
  });

  // Register outer navigation click listeners
  container.querySelector('#tab-subview-grid').addEventListener('click', () => {
    activePlannerSubView = 'grid';
    renderSubView(state);
  });

  container.querySelector('#tab-subview-list').addEventListener('click', () => {
    activePlannerSubView = 'list';
    renderSubView(state);
  });

  // Week Navigation Listeners
  container.querySelector('#planner-prev-week-btn').addEventListener('click', async () => {
    const current = new Date(state.getActiveDate());
    current.setDate(current.getDate() - 7);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    await state.setActiveDate(`${y}-${m}-${d}`);
  });

  container.querySelector('#planner-next-week-btn').addEventListener('click', async () => {
    const current = new Date(state.getActiveDate());
    current.setDate(current.getDate() + 7);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    await state.setActiveDate(`${y}-${m}-${d}`);
  });

  container.querySelector('#planner-today-btn').addEventListener('click', async () => {
    await state.setActiveDate(state.getTodayDateStr());
  });

  // Render the current subview
  renderSubView(state);

  // Grid Scroll Buttons click handlers
  container.querySelectorAll('.scroll-grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-dir');
      const spreadsheetContainer = container.querySelector('.spreadsheet-container');
      if (spreadsheetContainer) {
        const amount = dir === 'left' ? -350 : 350;
        spreadsheetContainer.scrollBy({ left: amount, behavior: 'smooth' });
      }
    });
  });
}

function renderSubView(state) {
  const contentArea = document.getElementById('planner-content-area');
  if (!contentArea) return;

  if (activePlannerSubView === 'grid') {
    renderGridSubView(contentArea, state);
  } else {
    renderListSubView(contentArea, state);
  }
}

// -------------------------------------------------------------
// SPREADSHEET GRID VIEW SUB-COMPONENT
// -------------------------------------------------------------
function renderGridSubView(container, state) {
  // Save scroll position of spreadsheet container before overwriting DOM
  let savedScrollLeft = 0;
  const oldSpreadsheet = container.querySelector('.spreadsheet-container');
  if (oldSpreadsheet) {
    savedScrollLeft = oldSpreadsheet.scrollLeft;
  }

  const weekDays = state.getDaysForActiveWeek();

  // Build spreadsheet grid headers
  const headerHtml = weekDays.map(day => `
    <th class="spreadsheet-th" id="grid-header-${day.date}">
      <div style="font-size: 13px; font-weight:700;">${day.weekday.substring(0, 3)}</div>
      <div style="font-size: 10px; opacity:0.7;">${day.date.substring(5)}</div>
    </th>
   `).join('');

  // Build spreadsheet rows based on time slots
  let rowsHtml = '';
  state.timeIntervals.forEach((slot, rowIdx) => {
    rowsHtml += `<tr>`;
    rowsHtml += `<td class="spreadsheet-td sticky-col">${slot}</td>`;
    
    // For each day, find the task matching this time slot
    weekDays.forEach((day, colIdx) => {
      const task = day.schedule.find(t => t.plannedTime === slot);
      
      if (task) {
        let statusClass = 'status-pending';
        let statusSymbol = '⚪';
        if (task.status === 'completed') { statusClass = 'status-completed'; statusSymbol = '✅'; }
        if (task.status === 'delayed') { statusClass = 'status-delayed'; statusSymbol = '⚠'; }
        if (task.status === 'missed') { statusClass = 'status-missed'; statusSymbol = '❌'; }
        
        let typeClass = 'type-general';
        if (task.type === 'study') typeClass = 'type-study';
        else if (task.type === 'etsy_seo') typeClass = 'type-etsy';
        
        rowsHtml += `
          <td class="spreadsheet-td cell-task ${statusClass} ${typeClass}" 
              data-date="${day.date}" 
              data-task-id="${task.id}" 
              data-time="${slot}"
              data-col-idx="${colIdx}"
              data-row-idx="${rowIdx}">
            <div class="cell-inner">
              <span class="cell-text" title="${task.name}">${task.name}</span>
              <div class="cell-meta">
                <span class="cell-time">${task.plannedTime}</span>
                <span style="font-size:11px;">${statusSymbol}</span>
              </div>
            </div>
          </td>
        `;
      } else {
        // Empty Cell
        rowsHtml += `
          <td class="spreadsheet-td cell-task" 
              data-date="${day.date}" 
              data-time="${slot}"
              data-col-idx="${colIdx}"
              data-row-idx="${rowIdx}">
            <div class="cell-empty">+ Add Task</div>
          </td>
        `;
      }
    });
    
    rowsHtml += `</tr>`;
  });

  container.innerHTML = `
    <div class="spreadsheet-container">
      <table class="spreadsheet-table">
        <thead>
          <tr>
            <th class="spreadsheet-th sticky-col" style="z-index: 40; width: 100px;">Time</th>
            ${headerHtml}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div style="font-size:11px; color:var(--text-muted); margin-top:10px;">
      💡 Pro tip: Double-click or press Enter on a cell to add/edit it. Click & drag or use Shift/Ctrl keys to select multiple cells, then use Ctrl+C / Ctrl+V to copy/paste!
    </div>
  `;

  // Attach spreadsheet cell event click handlers
  container.querySelectorAll('.cell-task').forEach(cell => {
    const handleCellAction = (e) => {
      // Ignore click if it's already editing
      if (cell.querySelector('input')) return;

      const date = cell.getAttribute('data-date');
      const taskId = cell.getAttribute('data-task-id');
      const time = cell.getAttribute('data-time');

      if (taskId) {
        // Cell already has a task, show Status Switcher overlay
        showCellStatusOverlay(e, cell, date, taskId, state);
      } else {
        showPlannerCellPopup(e, cell, date, time, state, 'general', async (taskName, taskType) => {
          const day = state.days.find(d => d.date === date);
          if (day) {
            const newTask = {
              id: 't-' + Date.now(),
              name: taskName,
              plannedTime: time,
              status: 'pending',
              missedReason: '',
              actualTime: '',
              type: taskType || 'general'
            };
            day.schedule.push(newTask);
            day.schedule.sort((a, b) => {
              const indexA = state.timeIntervals.indexOf(a.plannedTime);
              const indexB = state.timeIntervals.indexOf(b.plannedTime);
              return indexA - indexB;
            });
            await state.updateDay(date, { schedule: day.schedule });
            renderPlanner(container, state);
          }
        });
      }
    };

    cell.addEventListener('dblclick', handleCellAction);
    if (window.innerWidth <= 768) {
      cell.addEventListener('click', (e) => {
        if (state.selectedCells.length <= 1) {
          handleCellAction(e);
        }
      });
    }
  });

  // Restore scroll position or perform initial focus day scroll
  const spreadsheetContainer = container.querySelector('.spreadsheet-container');
  if (spreadsheetContainer) {
    if (savedScrollLeft > 0) {
      spreadsheetContainer.scrollLeft = savedScrollLeft;
    } else if (state.plannerScrollNeedsInit) {
      setTimeout(() => {
        const activeDate = state.getActiveDate();
        const activeDayHeader = container.querySelector(`[id="grid-header-${activeDate}"]`);
        if (spreadsheetContainer && activeDayHeader) {
          const offsetLeft = activeDayHeader.offsetLeft;
          const containerWidth = spreadsheetContainer.clientWidth;
          spreadsheetContainer.scrollLeft = offsetLeft - (containerWidth / 2) + (activeDayHeader.clientWidth / 2);
          state.plannerScrollNeedsInit = false;
        }
      }, 100);
    }
  }

  // Mouse grab-to-scroll (drag-to-scroll)
  if (spreadsheetContainer) {
    let isDown = false;
    let startX;
    let scrollLeft;
    let dragStartPos = { x: 0, y: 0 };
    let dragActive = false;

    spreadsheetContainer.addEventListener('mousedown', (e) => {
      if (e.button !== 1) return; // Middle mouse click only for grab-to-scroll
      // Don't drag if clicking input, dropdown, status-popup, etc.
      if (e.target.tagName === 'INPUT' || e.target.closest('.status-popup') || e.target.closest('button') || e.target.closest('select')) return;
      
      isDown = true;
      spreadsheetContainer.classList.add('grabbing');
      startX = e.pageX - spreadsheetContainer.offsetLeft;
      scrollLeft = spreadsheetContainer.scrollLeft;
      dragStartPos = { x: e.clientX, y: e.clientY };
      dragActive = false;
    });

    spreadsheetContainer.addEventListener('mouseleave', () => {
      isDown = false;
      spreadsheetContainer.classList.remove('grabbing');
    });

    spreadsheetContainer.addEventListener('mouseup', () => {
      isDown = false;
      spreadsheetContainer.classList.remove('grabbing');
    });

    spreadsheetContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - spreadsheetContainer.offsetLeft;
      const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
      if (dist > 5) {
        dragActive = true;
        e.preventDefault();
        const walk = (x - startX) * 1.5; // Drag sensitivity multiplier
        spreadsheetContainer.scrollLeft = scrollLeft - walk;
      }
    });

    // Prevent click actions on cells if drag was active
    container.querySelectorAll('.cell-task').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (dragActive) {
          e.stopImmediatePropagation();
          return;
        }
      }, { capture: true });
    });
  }
}

// Inline input editor inside cell
function enterCellEditMode(cell, date, time, state) {
  const currentHTML = cell.innerHTML;
  cell.innerHTML = `
    <input type="text" class="premium-input" id="inline-cell-input" 
           placeholder="Task name..." 
           style="height: 100%; border: none; font-size:12px; padding:4px;" autofocus>
  `;

  const input = cell.querySelector('#inline-cell-input');
  
  const saveTask = async () => {
    const value = input.value.trim();
    if (value) {
      const day = state.days.find(d => d.date === date);
      if (day) {
        const newTask = {
          id: 't-' + Date.now(),
          name: value,
          plannedTime: time,
          status: 'pending',
          missedReason: '',
          actualTime: '',
          type: 'general'
        };

        day.schedule.push(newTask);
        
        // Sort schedule by interval index
        day.schedule.sort((a, b) => {
          const indexA = state.timeIntervals.indexOf(a.plannedTime);
          const indexB = state.timeIntervals.indexOf(b.plannedTime);
          return indexA - indexB;
        });
        
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
      }
    } else {
      cell.innerHTML = currentHTML;
    }
  };

  input.addEventListener('blur', saveTask);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTask();
    if (e.key === 'Escape') cell.innerHTML = currentHTML;
  });
}

// Popup overlay to change cell details
function showCellStatusOverlay(e, cell, date, taskId, state) {
  e.stopPropagation(); // Stop click from propagating

  // Remove existing overlays
  const existing = document.querySelector('.status-popup');
  if (existing) existing.remove();

  const day = state.days.find(d => d.date === date);
  if (!day) return;
  const task = day.schedule.find(t => t.id === taskId);
  if (!task) return;

  const overlay = document.createElement('div');
  overlay.className = 'status-popup';
  overlay.style.top = `${e.clientY + window.scrollY + 10}px`;
  overlay.style.left = `${e.clientX + window.scrollX - 50}px`;

  overlay.innerHTML = `
    <div class="status-option" data-status="completed">${icons.completed} Completed</div>
    <div class="status-option" data-status="delayed">${icons.delayed} Rescheduled/Delayed</div>
    <div class="status-option" data-status="missed">${icons.missed} Missed</div>
    <div class="status-option" data-status="pending">⚪ Mark Pending</div>
    <div style="border-top: 1px solid var(--border-color); margin-top:4px; padding-top:4px;">
      <div style="font-size:10px; color:var(--text-secondary); padding: 2px 8px; font-weight:600;">CATEGORIZE</div>
      <div class="status-option" data-type="general">🟣 General Task</div>
      <div class="status-option" data-type="study">🔵 Study Hour</div>
      <div class="status-option" data-type="etsy_seo">🟠 Etsy + SEO</div>
    </div>
    <div class="status-option" data-status="copy" style="border-top: 1px solid var(--border-color); margin-top:4px; padding-top:4px;">📋 Copy Task</div>
    <div class="status-option text-danger" data-status="delete" style="color:var(--danger);">
      ${icons.trash} Delete Task
    </div>
  `;

  document.body.appendChild(overlay);

  // Close overlay when clicking outside
  const closeHandler = () => {
    overlay.remove();
    document.removeEventListener('click', closeHandler);
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 50);

  overlay.querySelectorAll('.status-option').forEach(option => {
    option.addEventListener('click', async () => {
      const status = option.getAttribute('data-status');
      const type = option.getAttribute('data-type');
      
      if (type) {
        task.type = type;
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
        return;
      }

      if (status === 'copy') {
        state.clipboard = {
          name: task.name,
          type: task.type,
          status: task.status
        };
        window.showToast(`Copied task: "${task.name}"`);
        return;
      }
      
      if (status === 'delete') {
        day.schedule = day.schedule.filter(t => t.id !== taskId);
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
        return;
      }

      if (status === 'completed') {
        task.status = 'completed';
        task.missedReason = '';
        task.actualTime = '';
        
        confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
      } else if (status === 'missed') {
        showPlannerModal(
          "Why was this task not completed?",
          "e.g. Spent too long on client project",
          async (reason) => {
            task.status = 'missed';
            task.missedReason = reason || 'No reason provided';
            task.actualTime = '';
            await state.updateDay(date, { schedule: day.schedule });
            renderSubView(state);
          }
        );
      } else if (status === 'delayed') {
        showPlannerModal(
          "When was this task actually completed?",
          "e.g. 18:30",
          async (time) => {
            task.status = 'delayed';
            task.actualTime = time || 'Unknown';
            task.missedReason = '';
            
            confetti({ particleCount: 40, spread: 30, origin: { y: 0.7 } });
            await state.updateDay(date, { schedule: day.schedule });
            renderSubView(state);
          }
        );
      } else {
        task.status = 'pending';
        task.missedReason = '';
        task.actualTime = '';
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
      }
    });
  });
}

function showPlannerModal(title, placeholder, onSave) {
  const modalContainer = document.getElementById('planner-modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="modal-overlay active" id="planner-action-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="p-modal-close-x">&times;</button>
        </div>
        <div class="modal-body">
          <input type="text" class="premium-input" id="p-modal-input" placeholder="${placeholder}" autofocus>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="p-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="p-modal-save">Save</button>
        </div>
      </div>
    </div>
  `;

  const modal = modalContainer.querySelector('#planner-action-modal');
  const input = modal.querySelector('#p-modal-input');

  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => { modalContainer.innerHTML = ''; }, 200);
  };

  modal.querySelector('#p-modal-close-x').addEventListener('click', closeModal);
  modal.querySelector('#p-modal-cancel').addEventListener('click', closeModal);

  const handleSave = () => {
    const val = input.value.trim();
    onSave(val);
    closeModal();
  };

  modal.querySelector('#p-modal-save').addEventListener('click', handleSave);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') closeModal();
  });
}

function showEmptyCellOverlay(e, cell, date, time, state) {
  e.stopPropagation();

  // Remove existing overlays
  const existing = document.querySelector('.status-popup');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'status-popup';
  overlay.style.top = `${e.clientY + window.scrollY + 10}px`;
  overlay.style.left = `${e.clientX + window.scrollX - 50}px`;

  const clipName = state.clipboard.name || (state.clipboard.tasks && state.clipboard.tasks[0] && state.clipboard.tasks[0].name) || '';
  const clipType = state.clipboard.type || (state.clipboard.tasks && state.clipboard.tasks[0] && state.clipboard.tasks[0].type) || 'general';

  overlay.innerHTML = `
    <div class="status-option" data-action="paste">📋 Paste: "${clipName}"</div>
    <div class="status-option" data-action="paste-all">🔁 Paste to All Days (Whole Row)</div>
    <div class="status-option" data-action="write">✍ Write New Task</div>
  `;

  document.body.appendChild(overlay);

  const closeHandler = () => {
    overlay.remove();
    document.removeEventListener('click', closeHandler);
  };
  setTimeout(() => { document.addEventListener('click', closeHandler); }, 50);

  overlay.querySelector('[data-action="paste"]').addEventListener('click', async () => {
    if (!state.clipboard) return;
    const day = state.days.find(d => d.date === date);
    if (day) {
      const newTask = {
        id: 't-' + Date.now(),
        name: clipName,
        plannedTime: time,
        status: 'pending', // Paste as pending status
        missedReason: '',
        actualTime: '',
        type: clipType
      };
      day.schedule.push(newTask);
      day.schedule.sort((a, b) => {
        const indexA = state.timeIntervals.indexOf(a.plannedTime);
        const indexB = state.timeIntervals.indexOf(b.plannedTime);
        return indexA - indexB;
      });
      await state.updateDay(date, { schedule: day.schedule });
      renderSubView(state);
      window.showToast(`Pasted task: "${newTask.name}"`);
    }
  });

  overlay.querySelector('[data-action="paste-all"]').addEventListener('click', async () => {
    if (!state.clipboard) return;
    
    const updatesMap = [];
    state.days.forEach(day => {
      const schedule = [...day.schedule];
      const existingIndex = schedule.findIndex(t => t.plannedTime === time);
      
      const newTask = {
        id: 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        name: clipName,
        plannedTime: time,
        status: 'pending', // Paste as pending status
        missedReason: '',
        actualTime: '',
        type: clipType
      };

      if (existingIndex !== -1) {
        schedule[existingIndex] = newTask;
      } else {
        schedule.push(newTask);
        schedule.sort((a, b) => {
          const indexA = state.timeIntervals.indexOf(a.plannedTime);
          const indexB = state.timeIntervals.indexOf(b.plannedTime);
          return indexA - indexB;
        });
      }
      updatesMap.push({ date: day.date, updates: { schedule } });
    });

    await state.updateDaysBulk(updatesMap);
    renderSubView(state);
    window.showToast(`Pasted task "${clipName}" to all days!`);
  });

  overlay.querySelector('[data-action="write"]').addEventListener('click', () => {
    enterCellEditMode(cell, date, time, state);
  });
}

// -------------------------------------------------------------
// DETAILED LIST ACCORDION VIEW SUB-COMPONENT
// -------------------------------------------------------------
function renderListSubView(container, state) {
  const listHtml = state.days.map(day => {
    const isExpanded = day.date === state.expandedDayDate;
    
    // Calculate daily completion stats
    const totalTasks = day.schedule.length;
    const completedTasks = day.schedule.filter(t => t.status === 'completed' || t.status === 'delayed').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Earnings calculation
    const revenue = day.finance?.revenue || 0;
    const expenses = day.finance?.expenses || 0;
    const netProfit = revenue - expenses;
    const savings = day.finance?.savings || 0;

    return `
      <div class="day-card ${isExpanded ? 'expanded active-day' : ''}" id="day-card-${day.date}">
        
        <!-- Day Card Header Trigger -->
        <div class="day-card-header" data-date="${day.date}">
          <div class="day-header-info">
            <span class="day-header-title">${day.label}</span>
            <span class="day-header-subtitle">Schedule & Reflections</span>
            <span style="font-size:13px; color:var(--text-secondary);">${day.weekday}</span>
          </div>
          
          <div class="day-header-indicators">
            <div style="font-size:12px; color:var(--text-secondary); font-family:var(--font-mono)">
              Tasks: ${completedTasks}/${totalTasks}
            </div>
            <div class="day-progress-mini">
              <div class="day-progress-bar" style="width: ${progressPercent}%;"></div>
            </div>
            <span class="nav-icon" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;">
              ${icons.chevronDown}
            </span>
          </div>
        </div>

        <!-- Day Card Expanded Body -->
        <div class="day-card-body">
          
          <!-- LEFT SIDE: Schedule & Checklist -->
          <div>
            <!-- Section 1: Daily Schedule -->
            <div class="day-section-title">
              <span>Daily Schedule Planner</span>
              <button class="btn btn-secondary btn-sm inline-add-task-btn" data-date="${day.date}">
                ${icons.plus} Add Slot
              </button>
            </div>

            <!-- Inline form to add task (initially hidden) -->
            <div class="conditional-fields inline-add-task-form" id="add-form-${day.date}" style="display:none; margin-bottom:12px;">
              <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 8px;">
                <select class="premium-select" id="new-task-time-${day.date}" style="flex:1; min-width:160px; height:38px;">
                  ${state.timeIntervals.map(interval => `<option value="${interval}">${interval}</option>`).join('')}
                </select>
                <select class="premium-select" id="new-task-type-${day.date}" style="width:120px; height:38px;">
                  <option value="general">General</option>
                  <option value="study">Study</option>
                  <option value="etsy_seo">Etsy + SEO</option>
                </select>
                <input type="text" class="premium-input" id="new-task-name-${day.date}" placeholder="Task Description..." style="flex:2; min-width:200px; height:38px;">
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-secondary btn-sm cancel-task-add" data-date="${day.date}">Cancel</button>
                <button class="btn btn-primary btn-sm save-task-add" data-date="${day.date}">Create</button>
              </div>
            </div>

            <div class="task-list" style="margin-bottom: 24px;">
              ${day.schedule.length === 0 ? `
                <div class="cell-empty" style="padding: 20px;">No tasks scheduled. Add a slot to organize your day.</div>
              ` : day.schedule.map(task => {
                const isCompleted = task.status === 'completed' || task.status === 'delayed';
                
                let conditionalFieldsHtml = '';
                if (task.status === 'missed') {
                  conditionalFieldsHtml = `
                    <div class="conditional-fields">
                      <span class="field-label">⚠️ Why was this task not completed?</span>
                      <input type="text" class="premium-input task-missed-input" 
                             data-date="${day.date}" data-task-id="${task.id}" 
                             value="${task.missedReason || ''}" placeholder="Explain reason...">
                    </div>
                  `;
                } else if (task.status === 'delayed') {
                  conditionalFieldsHtml = `
                    <div class="conditional-fields">
                      <span class="field-label">🕒 When was it actually completed?</span>
                      <input type="text" class="premium-input task-delayed-input" 
                             data-date="${day.date}" data-task-id="${task.id}" 
                             value="${task.actualTime || ''}" placeholder="e.g. 16:30">
                    </div>
                  `;
                }

                return `
                  <div>
                    <div class="task-row ${isCompleted ? 'done' : ''}">
                      <div class="task-info-side">
                        <span class="task-time-lbl">${task.plannedTime}</span>
                        <span class="task-name-lbl">${task.name}</span>
                      </div>
                      
                      <div class="task-actions-side">
                        <select class="premium-select ${task.status} list-task-status" 
                                data-date="${day.date}" data-task-id="${task.id}">
                          <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                          <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                          <option value="missed" ${task.status === 'missed' ? 'selected' : ''}>❌ Missed</option>
                          <option value="delayed" ${task.status === 'delayed' ? 'selected' : ''}>⚠ Delayed</option>
                        </select>
                        <button class="btn btn-danger btn-sm delete-task-btn" 
                                data-date="${day.date}" data-task-id="${task.id}" 
                                style="padding: 6px; width:30px; height:30px; justify-content:center;">
                          ${icons.trash}
                        </button>
                      </div>
                    </div>
                    ${conditionalFieldsHtml}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- RIGHT SIDE: Satisfaction, Earnings, Savings & Notes -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            
            <!-- Satisfaction Card -->
            <div class="satisfaction-card">
              <span class="day-section-title" style="margin-bottom:6px; border:none; padding:0;">Daily Satisfaction</span>
              
              <div class="slider-container">
                <div class="slider-header">
                  <span style="font-size:12px; color:var(--text-secondary)">Rating (1-10)</span>
                  <span class="score-display" id="score-val-${day.date}">${day.satisfaction?.score || 5}</span>
                </div>
                <input type="range" min="1" max="10" value="${day.satisfaction?.score || 5}" 
                       class="premium-slider sat-score-slider" data-date="${day.date}">
              </div>

              <div class="textarea-field">
                <span class="field-label">What made today successful?</span>
                <textarea class="premium-textarea sat-success-text" data-date="${day.date}" 
                          placeholder="Reflect on positive events...">${day.satisfaction?.successText || ''}</textarea>
              </div>

              <div class="textarea-field">
                <span class="field-label">What should improve tomorrow?</span>
                <textarea class="premium-textarea sat-improve-text" data-date="${day.date}" 
                          placeholder="Actions to take tomorrow...">${day.satisfaction?.improvementText || ''}</textarea>
              </div>
            </div>

            <!-- Earnings & Savings Card -->
            <div class="satisfaction-card">
              <span class="day-section-title" style="margin-bottom:6px; border:none; padding:0;">Financial Entry</span>
              
              <div class="finance-input-grid">
                <div class="finance-field">
                  <span class="field-label">Revenue</span>
                  <input type="number" class="premium-input fin-revenue" data-date="${day.date}" 
                         value="${revenue}" min="0" placeholder="0">
                </div>
                
                <div class="finance-field">
                  <span class="field-label">Expenses</span>
                  <input type="number" class="premium-input fin-expenses" data-date="${day.date}" 
                         value="${expenses}" min="0" placeholder="0">
                </div>
                
                <div class="finance-field">
                  <span class="field-label">Savings</span>
                  <input type="number" class="premium-input fin-savings" data-date="${day.date}" 
                         value="${savings}" min="0" placeholder="0">
                </div>

                <div class="profit-preview">
                  <span>Net Profit:</span>
                  <span class="profit-preview-val ${netProfit >= 0 ? 'positive' : 'negative'}" id="profit-val-${day.date}">
                    $${netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Notes Area -->
            <div class="textarea-field">
              <span class="day-section-title" style="margin-bottom:6px; border:none; padding:0;">Personal Journal / Notes</span>
              <textarea class="premium-textarea day-journal-notes" data-date="${day.date}" 
                        style="min-height:120px;" placeholder="Write unlimited notes/logs...">${day.notes || ''}</textarea>
            </div>
            
            <button class="btn btn-primary save-details-btn" data-date="${day.date}" style="justify-content:center;">
              ${icons.completed} Save Reflections & Finance
            </button>

          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="list-container">
      ${listHtml}
    </div>
  `;

  // --- Attach Accordion Expand Listeners ---
  container.querySelectorAll('.day-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const date = header.getAttribute('data-date');
      const isCurrentlyExpanded = state.expandedDayDate === date;
      state.setExpandedDayDate(isCurrentlyExpanded ? null : date);
    });
  });

  // --- Inline Add Task Form Toggles ---
  container.querySelectorAll('.inline-add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.getAttribute('data-date');
      const form = document.getElementById(`add-form-${date}`);
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });

  container.querySelectorAll('.cancel-task-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.getAttribute('data-date');
      document.getElementById(`add-form-${date}`).style.display = 'none';
    });
  });

  container.querySelectorAll('.save-task-add').forEach(btn => {
    btn.addEventListener('click', async () => {
      const date = btn.getAttribute('data-date');
      const nameInput = document.getElementById(`new-task-name-${date}`);
      const timeInput = document.getElementById(`new-task-time-${date}`);
      const typeInput = document.getElementById(`new-task-type-${date}`);
      const name = nameInput.value.trim();
      const plannedTime = timeInput.value;
      const type = typeInput ? typeInput.value : 'general';

      if (!name) return;

      const day = state.days.find(d => d.date === date);
      if (day) {
        day.schedule.push({
          id: 't-' + Date.now(),
          name,
          plannedTime,
          status: 'pending',
          missedReason: '',
          actualTime: '',
          type
        });
        
        // Sort by index in intervals
        day.schedule.sort((a, b) => {
          const indexA = state.timeIntervals.indexOf(a.plannedTime);
          const indexB = state.timeIntervals.indexOf(b.plannedTime);
          return indexA - indexB;
        });
        
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
      }
    });
  });

  // --- Delete Task Handler ---
  container.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const date = btn.getAttribute('data-date');
      const taskId = btn.getAttribute('data-task-id');
      const day = state.days.find(d => d.date === date);
      if (day) {
        day.schedule = day.schedule.filter(t => t.id !== taskId);
        await state.updateDay(date, { schedule: day.schedule });
        renderSubView(state);
      }
    });
  });

  // --- Dropdown Status Switcher (List Mode) ---
  container.querySelectorAll('.list-task-status').forEach(select => {
    select.addEventListener('change', async () => {
      const date = select.getAttribute('data-date');
      const taskId = select.getAttribute('data-task-id');
      const newStatus = select.value;
      const day = state.days.find(d => d.date === date);
      if (!day) return;
      const task = day.schedule.find(t => t.id === taskId);
      if (!task) return;

      // Handle conditional transitions
      task.status = newStatus;
      if (newStatus === 'completed') {
        task.missedReason = '';
        task.actualTime = '';
        confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
      } else if (newStatus === 'pending') {
        task.missedReason = '';
        task.actualTime = '';
      }
      
      await state.updateDay(date, { schedule: day.schedule });
      renderSubView(state);
    });
  });

  // --- Missed Reason and Delayed Time Inputs ---
  container.querySelectorAll('.task-missed-input').forEach(input => {
    input.addEventListener('change', async () => {
      const date = input.getAttribute('data-date');
      const taskId = input.getAttribute('data-task-id');
      const day = state.days.find(d => d.date === date);
      if (!day) return;
      const task = day.schedule.find(t => t.id === taskId);
      if (task) {
        task.missedReason = input.value.trim() || 'No reason provided';
        await state.updateDay(date, { schedule: day.schedule });
      }
    });
  });

  container.querySelectorAll('.task-delayed-input').forEach(input => {
    input.addEventListener('change', async () => {
      const date = input.getAttribute('data-date');
      const taskId = input.getAttribute('data-task-id');
      const day = state.days.find(d => d.date === date);
      if (!day) return;
      const task = day.schedule.find(t => t.id === taskId);
      if (task) {
        task.actualTime = input.value.trim() || 'Unknown';
        await state.updateDay(date, { schedule: day.schedule });
      }
    });
  });

  // --- Non Negotiables Toggles (List Mode) ---


  // --- Satisfaction Slider Display Update ---
  container.querySelectorAll('.sat-score-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      const date = slider.getAttribute('data-date');
      const scoreVal = document.getElementById(`score-val-${date}`);
      if (scoreVal) scoreVal.textContent = slider.value;
    });
    
    slider.addEventListener('change', async () => {
      const date = slider.getAttribute('data-date');
      const day = state.days.find(d => d.date === date);
      if (day) {
        day.satisfaction = day.satisfaction || {};
        day.satisfaction.score = parseInt(slider.value);
        await state.updateDay(date, { satisfaction: day.satisfaction });
      }
    });
  });

  // --- Real-time Financial Calculations & Inline updates ---
  const updateProfitVal = (date) => {
    const revInput = container.querySelector(`.fin-revenue[data-date="${date}"]`);
    const expInput = container.querySelector(`.fin-expenses[data-date="${date}"]`);
    const profitVal = document.getElementById(`profit-val-${date}`);
    
    if (revInput && expInput && profitVal) {
      const rev = parseFloat(revInput.value) || 0;
      const exp = parseFloat(expInput.value) || 0;
      const net = rev - exp;
      
      profitVal.textContent = `$${net.toFixed(2)}`;
      profitVal.className = `profit-preview-val ${net >= 0 ? 'positive' : 'negative'}`;
    }
  };

  container.querySelectorAll('.fin-revenue, .fin-expenses').forEach(input => {
    input.addEventListener('input', () => {
      const date = input.getAttribute('data-date');
      updateProfitVal(date);
    });
  });

  // --- Main Save reflections and Financial inputs handler ---
  container.querySelectorAll('.save-details-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const date = btn.getAttribute('data-date');
      const day = state.days.find(d => d.date === date);
      if (!day) return;

      const satSuccess = container.querySelector(`.sat-success-text[data-date="${date}"]`).value.trim();
      const satImprove = container.querySelector(`.sat-improve-text[data-date="${date}"]`).value.trim();
      
      const rev = parseFloat(container.querySelector(`.fin-revenue[data-date="${date}"]`).value) || 0;
      const exp = parseFloat(container.querySelector(`.fin-expenses[data-date="${date}"]`).value) || 0;
      const sav = parseFloat(container.querySelector(`.fin-savings[data-date="${date}"]`).value) || 0;

      const notes = container.querySelector(`.day-journal-notes[data-date="${date}"]`).value.trim();

      // Update in database
      const satisfaction = {
        score: day.satisfaction?.score || 5,
        successText: satSuccess,
        improvementText: satImprove
      };

      const finance = {
        revenue: rev,
        expenses: exp,
        savings: sav
      };

      await state.updateDay(date, { satisfaction, finance, notes });
      
      // Visual Feedback
      btn.textContent = '⚡ Data Saved Successfully!';
      btn.style.background = 'var(--success)';
      confetti({ particleCount: 50, spread: 40 });
      
      setTimeout(() => {
        btn.innerHTML = `${icons.completed} Save Reflections & Finance`;
        btn.style.background = '';
        renderSubView(state);
      }, 1500);
    });
  });
}
