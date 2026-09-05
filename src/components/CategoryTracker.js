import { icons } from '../icons.js';
import confetti from 'canvas-confetti';
import { showPlannerCellPopup } from './PlannerCellPopup.js';
import { showToast } from '../main.js';

export function renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon) {
  let savedScrollLeft = 0;
  const oldSpreadsheet = container.querySelector('.spreadsheet-container');
  if (oldSpreadsheet) {
    savedScrollLeft = oldSpreadsheet.scrollLeft;
  }

  // Get all projects for this category
  const catProjects = state.projects.filter(p => p.type === categoryType);
  let totalPendingTasks = 0;
  let totalCompletedTasks = 0;
  catProjects.forEach(p => {
    if (p.subtasks) {
      totalPendingTasks += p.subtasks.filter(s => !s.completed).length;
      totalCompletedTasks += p.subtasks.filter(s => s.completed).length;
    }
  });

  const weekDays = state.getDaysForActiveWeek();
  const startLabel = weekDays[0] ? weekDays[0].label.replace(/, \d{4}/, '') : '';
  const endLabel = weekDays[6] ? weekDays[6].label.replace(/, \d{4}/, '') : '';
  const year = weekDays[0] ? new Date(weekDays[0].date).getFullYear() : '';
  const weekRangeText = `${startLabel} – ${endLabel}, ${year}`;

  // Build spreadsheet grid headers
  const headerHtml = weekDays.map(day => `
    <th class="spreadsheet-th" id="cat-header-${categoryId}-${day.date}">
      <div style="font-size: 13px; font-weight:700;">${day.weekday.substring(0, 3)}</div>
      <div style="font-size: 10px; opacity:0.7;">${day.date.substring(5)}</div>
    </th>
  `).join('');

  // Helper to get name of task types occupying blocked slots
  const getTaskTypeLabel = (type) => {
    if (type === 'study') return 'Study Planner';
    if (type === 'etsy_seo') return 'Etsy + SEO';
    if (type === 'general') return 'Daily Planner';
    const custom = state.customSections.find(s => s.type === type);
    return custom ? custom.label : 'Other Activity';
  };

  // Build rows based on user-configured time intervals
  let rowsHtml = '';
  state.timeIntervals.forEach((slot, rowIdx) => {
    rowsHtml += `<tr>`;
    rowsHtml += `<td class="spreadsheet-td sticky-col">${slot}</td>`;
    
    weekDays.forEach((day, colIdx) => {
      // Find tasks matching this time slot and type === categoryType
      const task = day.schedule.find(t => t.plannedTime === slot && t.type === categoryType);
      
      if (task) {
        let statusClass = 'status-pending';
        let statusSymbol = '⚪';
        if (task.status === 'completed') { statusClass = 'status-completed'; statusSymbol = '✅'; }
        if (task.status === 'delayed') { statusClass = 'status-delayed'; statusSymbol = '⚠'; }
        if (task.status === 'missed') { statusClass = 'status-missed'; statusSymbol = '❌'; }
        
        let typeColorClass = 'type-study';
        if (categoryType === 'etsy_seo') typeColorClass = 'type-etsy';
        else if (categoryType === 'general') typeColorClass = 'type-general';
        else typeColorClass = 'type-study'; // Default custom category coloring matches blue/indigo

        rowsHtml += `
          <td class="spreadsheet-td cell-task ${statusClass} ${typeColorClass}" 
              data-date="${day.date}" 
              data-task-id="${task.id}" 
              data-time="${slot}"
              data-col-idx="${colIdx}"
              data-row-idx="${rowIdx}">
            <div class="cell-inner">
              <span class="cell-text" title="${task.name}">${task.name}</span>
              <div class="cell-meta">
                <span class="cell-time">${categoryLabel}</span>
                <span style="font-size:11px;">${statusSymbol}</span>
              </div>
            </div>
          </td>
        `;
      } else {
        // Check if there is another task at this time (non-category)
        const otherTask = day.schedule.find(t => t.plannedTime === slot);
        
        if (otherTask) {
          // Time slot is already filled by another activity
          rowsHtml += `
            <td class="spreadsheet-td cell-blocked" style="background-color:rgba(0,0,0,0.02); opacity:0.4; cursor:not-allowed;" title="Filled by: ${otherTask.name}">
              <div style="font-size:10px; text-align:center; padding:12px 0;">[ ${getTaskTypeLabel(otherTask.type)} ]</div>
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
              <div class="cell-empty">+ ${categoryLabel}</div>
            </td>
          `;
        }
      }
    });
    
    rowsHtml += `</tr>`;
  });

  container.innerHTML = `
    <div class="card" style="padding: 16px; margin-bottom: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="font-size: 16px; font-weight:700;">${categoryLabel} Grid</h3>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top:2px;">
            Schedule and track your ${categoryLabel} blocks. Any slot filled here automatically populates in your main Daily Planner view.
          </p>
        </div>
        <span class="nav-icon" style="color:var(--accent);">${categoryIcon || icons.planner}</span>
      </div>
    </div>

    <!-- Category Tasks & Projects Backlog Card -->
    <div class="card" style="padding: 16px; margin-bottom: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:16px; font-weight:800; color:var(--text-primary);">🎯 ${categoryLabel} Pending Tasks & Roadmap</span>
          <span class="badge" style="background:var(--accent-glow); color:var(--accent); font-weight:800; font-size:11px; padding:3px 10px; border-radius:12px;">
            ${totalPendingTasks} Pending
          </span>
          ${totalCompletedTasks > 0 ? `
            <span class="badge" style="background:rgba(16, 185, 129, 0.15); color:var(--success); font-weight:700; font-size:11px; padding:3px 8px; border-radius:12px;">
              ✓ ${totalCompletedTasks} Done
            </span>
          ` : ''}
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${totalPendingTasks + totalCompletedTasks > 0 ? `
            <button class="btn btn-danger btn-sm" id="cat-clear-all-tasks-btn" style="font-size:11px; gap:4px; padding:4px 8px;" title="Remove all tasks in ${categoryLabel}">
              🗑 Clear All Tasks
            </button>
          ` : ''}
          <button class="btn btn-primary btn-sm" id="cat-toggle-new-proj-btn" style="font-size:11px; gap:4px;">
            + New ${categoryLabel} Project
          </button>
        </div>
      </div>

      <!-- Expandable New Project Form -->
      <div id="cat-new-proj-form" style="display:none; flex-direction:column; gap:10px; background:var(--bg-tertiary); padding:14px; border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">Create New ${categoryLabel} Project</span>
          <button id="cat-close-new-proj-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:18px;">&times;</button>
        </div>
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px;" class="cat-form-row">
          <input type="text" id="cat-new-proj-name" class="premium-input" placeholder="Project name (e.g. Ophthalmology Review)..." style="height:32px; font-size:12px;">
          <select id="cat-new-proj-priority" class="premium-select" style="height:32px; font-size:12px;">
            <option value="medium">Medium Priority</option>
            <option value="high" selected>High Priority</option>
            <option value="critical">Critical Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
        <input type="text" id="cat-new-proj-goal" class="premium-input" placeholder="Goal / Milestone description..." style="height:32px; font-size:12px;">
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-secondary btn-sm" id="cat-cancel-new-proj-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="cat-save-new-proj-btn">Save Project</button>
        </div>
      </div>

      <!-- Projects and Tasks Content -->
      ${catProjects.length === 0 ? `
        <div style="text-align:center; padding:24px 16px; color:var(--text-muted); font-size:13px; background:var(--bg-tertiary); border-radius:var(--radius-sm); border:1px dashed var(--border-color);">
          <div style="font-size:24px; margin-bottom:6px;">📚</div>
          <div style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">No ${categoryLabel} Projects Yet</div>
          <div>Create a project above to organize your tasks and schedule them directly into the grid!</div>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${catProjects.map(proj => {
            const pendingTasks = (proj.subtasks || []).filter(s => !s.completed);
            const completedTasks = (proj.subtasks || []).filter(s => s.completed);
            const total = (proj.subtasks || []).length;
            const pct = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;

            return `
              <div class="cat-proj-card" style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px;">
                <!-- Project Title Bar -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:14px; font-weight:800; color:var(--text-primary);">${proj.name}</span>
                    <span class="badge priority-${proj.priority || 'medium'}" style="font-size:10px; text-transform:uppercase; font-weight:700; padding:2px 6px; border-radius:4px;">${proj.priority || 'medium'}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">${completedTasks.length} / ${total} tasks</span>
                    <div style="width:70px; height:6px; background:var(--bg-secondary); border-radius:3px; overflow:hidden;">
                      <div style="width:${pct}%; height:100%; background:var(--accent-gradient); border-radius:3px;"></div>
                    </div>
                  </div>
                </div>

                ${proj.goal ? `<div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">🎯 ${proj.goal}</div>` : ''}

                <!-- Quick Add Task Row -->
                <div style="display:flex; gap:6px; margin-bottom:10px;">
                  <input type="text" class="premium-input cat-add-task-input" data-proj-id="${proj.id}" placeholder="Add task to ${proj.name}..." style="flex:1; height:30px; font-size:12px; padding:4px 8px;">
                  <input type="number" class="premium-input cat-add-task-est" data-proj-id="${proj.id}" placeholder="Mins" value="45" style="width:65px; height:30px; font-size:12px; padding:4px 6px;">
                  <button class="btn btn-primary btn-sm cat-add-task-btn" data-proj-id="${proj.id}" style="height:30px; padding:0 12px; font-size:11px; font-weight:700;">+ Add</button>
                </div>

                <!-- Pending Tasks List -->
                ${pendingTasks.length === 0 ? `
                  <div style="font-size:12px; color:var(--text-muted); font-style:italic; padding:6px 0;">
                    ✓ All tasks completed! Add a new task above.
                  </div>
                ` : `
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    ${pendingTasks.map(task => `
                      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-secondary); padding:8px 10px; border-radius:4px; border:1px solid var(--border-color); gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                          <input type="checkbox" class="cat-task-check" data-proj-id="${proj.id}" data-task-id="${task.id}" style="width:16px; height:16px; cursor:pointer;">
                          <span style="font-size:13px; font-weight:600; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${task.name}</span>
                          <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); background:var(--bg-tertiary); padding:1px 5px; border-radius:3px; margin-left:auto; flex-shrink:0;">~${task.estimatedMinutes || 30}m</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                          <button class="btn btn-primary btn-sm cat-schedule-task-btn" data-proj-id="${proj.id}" data-task-id="${task.id}" data-task-name="${encodeURIComponent(task.name)}" style="height:26px; padding:0 8px; font-size:11px; font-weight:700;" title="Schedule into today's first available slot">
                            ⚡ Schedule
                          </button>
                          <button class="btn btn-secondary btn-sm cat-delete-task-btn" data-proj-id="${proj.id}" data-task-id="${task.id}" style="height:26px; width:26px; padding:0; justify-content:center; color:var(--text-muted);" title="Delete task">&times;</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}

                <!-- Completed Tasks Collapsible -->
                ${completedTasks.length > 0 ? `
                  <details style="margin-top:10px; font-size:12px; color:var(--text-muted);">
                    <summary style="cursor:pointer; font-weight:600; padding:4px 0;">✓ Show ${completedTasks.length} Completed Task${completedTasks.length > 1 ? 's' : ''}</summary>
                    <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px; padding-left:8px;">
                      ${completedTasks.map(ct => `
                        <div style="display:flex; align-items:center; gap:6px; font-size:12px; text-decoration:line-through; opacity:0.65;">
                          <span>✓</span>
                          <span>${ct.name}</span>
                        </div>
                      `).join('')}
                    </div>
                  </details>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Quick navigation bar for weeks -->
    <div class="card" style="padding: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" id="cat-prev-week-btn-${categoryId}">◀ Prev Week</button>
        <span style="font-size: 13px; font-weight: 700; color: var(--text-primary); font-family: var(--font-header);" id="cat-week-range-${categoryId}">${weekRangeText}</span>
        <button class="btn btn-secondary btn-sm" id="cat-next-week-btn-${categoryId}">Next Week ▶</button>
        <button class="btn btn-secondary btn-sm" id="cat-today-btn-${categoryId}" style="margin-left: 6px;">Today</button>
      </div>
      <div style="display: flex; gap: 6px;" id="grid-scroll-controls">
        <button class="btn btn-secondary btn-sm scroll-grid-btn" data-dir="left">◀ Scroll Left</button>
        <button class="btn btn-secondary btn-sm scroll-grid-btn" data-dir="right">Scroll Right ▶</button>
      </div>
    </div>

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

  // Click handler
  container.querySelectorAll('.cell-task').forEach(cell => {
    const handleCatAction = (e) => {
      if (cell.querySelector('input')) return;

      const date = cell.getAttribute('data-date');
      const taskId = cell.getAttribute('data-task-id');
      const time = cell.getAttribute('data-time');

      if (taskId) {
        showCatCellStatusOverlay(e, cell, date, taskId, state, categoryId, categoryLabel, categoryType, categoryIcon);
      } else {
        showPlannerCellPopup(e, cell, date, time, state, categoryType, async (taskName, taskType) => {
          const day = state.days.find(d => d.date === date);
          if (day) {
            const newTask = {
              id: 't-' + Date.now(),
              name: taskName,
              plannedTime: time,
              status: 'pending',
              missedReason: '',
              actualTime: '',
              type: taskType || categoryType
            };
            day.schedule.push(newTask);
            day.schedule.sort((a, b) => {
              const indexA = state.timeIntervals.indexOf(a.plannedTime);
              const indexB = state.timeIntervals.indexOf(b.plannedTime);
              return indexA - indexB;
            });
            await state.updateDay(date, { schedule: day.schedule });
            renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
          }
        });
      }
    };

    cell.addEventListener('dblclick', handleCatAction);
    if (window.innerWidth <= 768) {
      cell.addEventListener('click', (e) => {
        if (state.selectedCells.length <= 1) {
          handleCatAction(e);
        }
      });
    }
  });

  // Clear All Tasks in Category
  const clearAllCatTasksBtn = container.querySelector('#cat-clear-all-tasks-btn');
  if (clearAllCatTasksBtn) {
    clearAllCatTasksBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to remove all tasks in ${categoryLabel}? This will clear all tasks across ${categoryLabel} projects.`)) {
        await state.clearCategoryTasks(categoryType);
        showToast(`Cleared all tasks in ${categoryLabel}`);
        renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
      }
    });
  }

  // 1. Toggle New Project Form
  const toggleNewProjBtn = container.querySelector('#cat-toggle-new-proj-btn');
  const newProjForm = container.querySelector('#cat-new-proj-form');
  if (toggleNewProjBtn && newProjForm) {
    toggleNewProjBtn.addEventListener('click', () => {
      newProjForm.style.display = newProjForm.style.display === 'none' ? 'flex' : 'none';
      if (newProjForm.style.display === 'flex') {
        const nameInput = container.querySelector('#cat-new-proj-name');
        if (nameInput) nameInput.focus();
      }
    });
  }

  const closeNewProjBtn = container.querySelector('#cat-close-new-proj-btn');
  const cancelNewProjBtn = container.querySelector('#cat-cancel-new-proj-btn');
  const closeForm = () => { if (newProjForm) newProjForm.style.display = 'none'; };
  if (closeNewProjBtn) closeNewProjBtn.addEventListener('click', closeForm);
  if (cancelNewProjBtn) cancelNewProjBtn.addEventListener('click', closeForm);

  // 2. Save New Project
  const saveNewProjBtn = container.querySelector('#cat-save-new-proj-btn');
  if (saveNewProjBtn) {
    saveNewProjBtn.addEventListener('click', async () => {
      const name = container.querySelector('#cat-new-proj-name').value.trim();
      const priority = container.querySelector('#cat-new-proj-priority').value;
      const goal = container.querySelector('#cat-new-proj-goal').value.trim();

      if (!name) {
        alert("Please enter project name!");
        return;
      }

      const newProj = {
        name,
        status: 'In progress',
        priority,
        type: categoryType,
        goal,
        nextGoal: '',
        deadline: '',
        estimatedHours: 20,
        availableHoursPerDay: 2,
        isDailyAllocation: false,
        dailyAllocationMinutes: 0,
        subtasks: []
      };

      await state.addProject(newProj);
      confetti({ particleCount: 40, spread: 30 });
      showToast(`Created new ${categoryLabel} project "${name}"`);
      renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
    });
  }

  // 3. Add Task to Project
  container.querySelectorAll('.cat-add-task-btn').forEach(btn => {
    const projId = Number(btn.getAttribute('data-proj-id'));
    const parent = btn.closest('.cat-proj-card');
    const input = parent.querySelector(`.cat-add-task-input[data-proj-id="${projId}"]`);
    const estInput = parent.querySelector(`.cat-add-task-est[data-proj-id="${projId}"]`);

    const handleAdd = async () => {
      const val = input.value.trim();
      const est = parseInt(estInput ? estInput.value : '45') || 45;
      if (!val) {
        alert("Please enter a task name!");
        return;
      }
      const project = state.projects.find(p => p.id === projId);
      if (project) {
        project.subtasks = project.subtasks || [];
        project.subtasks.push({
          id: 'sub-' + Date.now() + Math.random().toString(36).substring(7),
          name: val,
          estimatedMinutes: est,
          completed: false
        });
        project.lastWorkedOn = Date.now();
        await state.updateProject(projId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
        showToast(`Added "${val}" to ${project.name}`);
        renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
      }
    };

    btn.addEventListener('click', handleAdd);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdd();
      });
    }
  });

  // 4. Mark Task Complete
  container.querySelectorAll('.cat-task-check').forEach(chk => {
    chk.addEventListener('change', async () => {
      const projId = Number(chk.getAttribute('data-proj-id'));
      const taskId = chk.getAttribute('data-task-id');
      const project = state.projects.find(p => p.id === projId);
      if (project && project.subtasks) {
        const sub = project.subtasks.find(s => s.id === taskId);
        if (sub) {
          sub.completed = chk.checked;
          project.lastWorkedOn = Date.now();
          await state.updateProject(projId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
          if (chk.checked) confetti({ particleCount: 30, spread: 25 });
          renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
        }
      }
    });
  });

  // 5. Schedule Task into Grid
  container.querySelectorAll('.cat-schedule-task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-proj-id'));
      const taskName = decodeURIComponent(btn.getAttribute('data-task-name'));
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
        type: categoryType
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
      renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
    });
  });

  // 6. Delete Task
  container.querySelectorAll('.cat-delete-task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-proj-id'));
      const taskId = btn.getAttribute('data-task-id');
      const project = state.projects.find(p => p.id === projId);
      if (project && project.subtasks) {
        if (confirm("Delete this task?")) {
          project.subtasks = project.subtasks.filter(s => s.id !== taskId);
          await state.updateProject(projId, { subtasks: project.subtasks });
          renderCategoryTracker(container, state, categoryId, categoryLabel, categoryType, categoryIcon);
        }
      }
    });
  });

  // Week Navigation Listeners
  container.querySelector(`#cat-prev-week-btn-${categoryId}`).addEventListener('click', async () => {
    const current = new Date(state.getActiveDate());
    current.setDate(current.getDate() - 7);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    await state.setActiveDate(`${y}-${m}-${d}`);
  });

  container.querySelector(`#cat-next-week-btn-${categoryId}`).addEventListener('click', async () => {
    const current = new Date(state.getActiveDate());
    current.setDate(current.getDate() + 7);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    await state.setActiveDate(`${y}-${m}-${d}`);
  });

  container.querySelector(`#cat-today-btn-${categoryId}`).addEventListener('click', async () => {
    await state.setActiveDate(state.getTodayDateStr());
  });

  // Restore scroll position
  const spreadsheetContainer = container.querySelector('.spreadsheet-container');
  if (spreadsheetContainer) {
    if (savedScrollLeft > 0) {
      spreadsheetContainer.scrollLeft = savedScrollLeft;
    } else {
      setTimeout(() => {
        const activeDate = state.getActiveDate();
        const activeHeader = container.querySelector(`[id="cat-header-${categoryId}-${activeDate}"]`);
        if (spreadsheetContainer && activeHeader) {
          const offsetLeft = activeHeader.offsetLeft;
          const containerWidth = spreadsheetContainer.clientWidth;
          spreadsheetContainer.scrollLeft = offsetLeft - (containerWidth / 2) + (activeHeader.clientWidth / 2);
        }
      }, 100);
    }
  }
}

function enterCatCellEditMode(cell, date, time, state, categoryId, categoryLabel, categoryType, categoryIcon) {
  const currentHTML = cell.innerHTML;
  cell.innerHTML = `
    <input type="text" class="premium-input" id="inline-cat-input" 
           placeholder="Task details..." 
           style="height: 100%; border: none; font-size:12px; padding:4px;" autofocus>
  `;

  const input = cell.querySelector('#inline-cat-input');
  
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
          type: categoryType
        };

        day.schedule.push(newTask);
        day.schedule.sort((a, b) => {
          const idxA = state.timeIntervals.indexOf(a.plannedTime);
          const idxB = state.timeIntervals.indexOf(b.plannedTime);
          return idxA - idxB;
        });
        
        await state.updateDay(date, { schedule: day.schedule });
        renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
      }
    } else {
      cell.innerHTML = currentHTML;
    }
  };

  input.focus();
  input.addEventListener('blur', saveTask);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTask();
    if (e.key === 'Escape') cell.innerHTML = currentHTML;
  });
}

function showCatCellStatusOverlay(e, cell, date, taskId, state, categoryId, categoryLabel, categoryType, categoryIcon) {
  e.stopPropagation();

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
    <div class="status-option" data-status="copy" style="border-top: 1px solid var(--border-color); margin-top:4px; padding-top:4px;">📋 Copy Task</div>
    <div class="status-option text-danger" data-status="delete" style="border-top: 1px solid var(--border-color); color:var(--danger); margin-top:4px;">
      ${icons.trash} Delete Task
    </div>
  `;

  document.body.appendChild(overlay);

  const closeHandler = () => {
    overlay.remove();
    document.removeEventListener('click', closeHandler);
  };
  
  setTimeout(() => { document.addEventListener('click', closeHandler); }, 50);

  overlay.querySelectorAll('.status-option').forEach(option => {
    option.addEventListener('click', async () => {
      const status = option.getAttribute('data-status');
      
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
        renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
        return;
      }

      if (status === 'completed') {
        task.status = 'completed';
        task.missedReason = '';
        task.actualTime = '';
        confetti({ particleCount: 60, spread: 45, origin: { y: 0.7 } });
      } else if (status === 'missed') {
        showCatModal("Why was this hour missed?", "Enter explanation...", async (reason) => {
          task.status = 'missed';
          task.missedReason = reason || 'No reason provided';
          task.actualTime = '';
          await state.updateDay(date, { schedule: day.schedule });
          renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
        });
        return;
      } else if (status === 'delayed') {
        showCatModal("When was this block completed?", "e.g. 20:00", async (time) => {
          task.status = 'delayed';
          task.actualTime = time || 'Unknown';
          task.missedReason = '';
          confetti({ particleCount: 30, spread: 30, origin: { y: 0.7 } });
          await state.updateDay(date, { schedule: day.schedule });
          renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
        });
        return;
      } else {
        task.status = 'pending';
        task.missedReason = '';
        task.actualTime = '';
      }
      
      await state.updateDay(date, { schedule: day.schedule });
      renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
    });
  });
}

function showCatEmptyCellOverlay(e, cell, date, time, state, categoryId, categoryLabel, categoryType, categoryIcon) {
  e.stopPropagation();

  const existing = document.querySelector('.status-popup');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'status-popup';
  overlay.style.top = `${e.clientY + window.scrollY + 10}px`;
  overlay.style.left = `${e.clientX + window.scrollX - 50}px`;

  const clipName = state.clipboard.name || (state.clipboard.tasks && state.clipboard.tasks[0] && state.clipboard.tasks[0].name) || '';

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
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: categoryType
      };
      day.schedule.push(newTask);
      day.schedule.sort((a, b) => {
        const indexA = state.timeIntervals.indexOf(a.plannedTime);
        const indexB = state.timeIntervals.indexOf(b.plannedTime);
        return indexA - indexB;
      });
      await state.updateDay(date, { schedule: day.schedule });
      renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
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
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: categoryType
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
    renderCategoryTracker(cell.closest('.view-container'), state, categoryId, categoryLabel, categoryType, categoryIcon);
    window.showToast(`Pasted block to all days!`);
  });

  overlay.querySelector('[data-action="write"]').addEventListener('click', () => {
    enterCatCellEditMode(cell, date, time, state, categoryId, categoryLabel, categoryType, categoryIcon);
  });
}

function showCatModal(title, placeholder, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="cat-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <input type="text" class="premium-input" id="cat-modal-input" placeholder="${placeholder}" autofocus>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cat-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="cat-modal-save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); };
  overlay.querySelector('#cat-modal-close').addEventListener('click', close);
  overlay.querySelector('#cat-modal-cancel').addEventListener('click', close);
  
  const handleSave = () => {
    const val = overlay.querySelector('#cat-modal-input').value.trim();
    onSave(val);
    close();
  };
  overlay.querySelector('#cat-modal-save').addEventListener('click', handleSave);
  overlay.querySelector('#cat-modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSave();
  });
}
