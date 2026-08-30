import { icons } from '../icons.js';
import { calculateStreak } from './Header.js';
import confetti from 'canvas-confetti';

export function renderDashboard(container, state) {
  // 1. Identify the active date
  const activeDate = state.getActiveDate();

  // Get active day data
  const activeDay = state.days.find(d => d.date === activeDate);
  if (!activeDay) {
    container.innerHTML = `<div class="card">Error: Active day not found.</div>`;
    return;
  }

  // 2. Perform global calculations
  let totalTasks = 0;
  let completedTasksCount = 0;
  let missedTasksCount = 0;
  let satisfactionSum = 0;
  let ratedDaysCount = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalSavings = 0;

  let interactedDaysCount = 0;
  let totalNNDone = 0;

  state.days.forEach(day => {
    // Tasks stats
    if (day.schedule) {
      day.schedule.forEach(t => {
        totalTasks++;
        if (t.status === 'completed' || t.status === 'delayed') {
          completedTasksCount++;
        } else if (t.status === 'missed') {
          missedTasksCount++;
        }
      });
    }

    // Satisfaction average (ignoring default/unrated unless they have inputs)
    const hasInteracted = (day.schedule && day.schedule.some(t => t.status !== 'pending')) ||
                          (day.satisfaction && day.satisfaction.score !== 5 && day.satisfaction.score !== null) ||
                          (day.finance && (day.finance.revenue > 0 || day.finance.expenses > 0 || day.finance.savings > 0)) ||
                          (day.nonNegotiables && Object.values(day.nonNegotiables).some(v => v !== 'pending'));
    
    if (hasInteracted) {
      interactedDaysCount++;
      
      // Calculate non-negotiables completion count
      if (day.nonNegotiables) {
        Object.keys(day.nonNegotiables).forEach(id => {
          if (day.nonNegotiables[id] === 'done') {
            totalNNDone++;
          } else if (day.nonNegotiables[id] === 'partial') {
            totalNNDone += 0.5;
          }
        });
      }
    }

    if (day.satisfaction && day.satisfaction.score !== null && hasInteracted) {
      satisfactionSum += day.satisfaction.score;
      ratedDaysCount++;
    }

    // Finance stats
    if (day.finance) {
      totalRevenue += day.finance.revenue || 0;
      totalExpenses += day.finance.expenses || 0;
      totalSavings += day.finance.savings || 0;
    }
  });

  // Calculate completion percentage over ALL time slots across active days (including unscheduled ones)
  const totalSlotOpportunities = interactedDaysCount * state.timeIntervals.length;
  const completionPercentage = totalSlotOpportunities > 0 ? Math.round((completedTasksCount / totalSlotOpportunities) * 100) : 0;
  
  // Schedule accuracy = completed / scheduled tasks
  const scheduleAccuracy = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
  
  // Non-negotiables efficiency
  const totalNNOpportunities = interactedDaysCount * state.nonNegotiables.length;
  const nnEfficiencyPercentage = totalNNOpportunities > 0 ? Math.round((totalNNDone / totalNNOpportunities) * 100) : 0;

  const avgSatisfaction = ratedDaysCount > 0 ? (satisfactionSum / ratedDaysCount).toFixed(1) : 'N/A';
  const totalProfit = totalRevenue - totalExpenses;
  const currentStreak = calculateStreak(state.days, activeDate);

  // Determine encouragement message based on streak and completion
  let streakMessage = "Every day is a new chance to stack wins. Start ticking tasks!";
  if (currentStreak > 0) {
    streakMessage = `Incredible focus! You are maintaining a ${currentStreak}-day success streak. Keep it up! 🔥`;
  }

  // Render Dashboard HTML
  container.innerHTML = `

    <!-- Motivational Quote -->
    <div class="card" style="background: var(--bg-secondary); border-left: 4px solid var(--accent); margin-bottom: 24px; display:flex; align-items:center; gap:20px; padding:16px 20px;">
      <div style="font-size: 32px; color: var(--accent); font-family: Georgia, serif; line-height: 0; margin-top: 14px;">“</div>
      <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
        <span style="font-size:13px; font-weight:500; font-style:italic; line-height:1.4; color:var(--text-primary)">
          ${state.sessionQuote.text}
        </span>
        <span style="font-family:var(--font-mono); font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">
          — ${state.sessionQuote.author}
        </span>
      </div>
    </div>

    <!-- Overview Stat Cards Grid -->
    <div class="dashboard-grid">
      <div class="stat-card success">
        <span class="stat-icon">${icons.planner}</span>
        <span class="stat-label">Completion Rate</span>
        <span class="stat-value">${completionPercentage}%</span>
        <span class="stat-desc">Of all daily time intervals completed</span>
      </div>

      <div class="stat-card success">
        <span class="stat-icon">${icons.completed}</span>
        <span class="stat-label">Schedule Accuracy</span>
        <span class="stat-value">${scheduleAccuracy}%</span>
        <span class="stat-desc">Of scheduled tasks successfully ticked</span>
      </div>

      <div class="stat-card warning">
        <span class="stat-icon">${icons.streak}</span>
        <span class="stat-label">Habit Efficiency</span>
        <span class="stat-value" style="color:var(--accent-light);">${nnEfficiencyPercentage}%</span>
        <span class="stat-desc">Non-Negotiable essentials ticked</span>
      </div>

      <div class="stat-card warning">
        <span class="stat-icon">${icons.sun}</span>
        <span class="stat-label">Satisfaction Avg</span>
        <span class="stat-value">${avgSatisfaction}</span>
        <span class="stat-desc">Based on 1-10 daily ratings</span>
      </div>

      <div class="stat-card earnings">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Net Profit</span>
        <span class="stat-value" style="color: ${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">
          $${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span class="stat-desc">Rev: $${totalRevenue.toLocaleString()} | Exp: $${totalExpenses.toLocaleString()}</span>
      </div>

      <div class="stat-card earnings">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Total Saved</span>
        <span class="stat-value">$${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        <span class="stat-desc">Accumulated savings balance</span>
      </div>
    </div>

    <!-- Active day summary list and quick-toggle options -->
    <div class="today-highlight-grid">
      
      <!-- Day's Daily Schedule -->
      <div class="card">
        <div class="card-title">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="white-space: nowrap;">Daily Schedule:</span>
            <div style="display:flex; align-items:center; gap:4px;">
              <button class="btn btn-secondary btn-sm" id="dashboard-prev-day-btn" style="padding: 2px 6px; font-size: 11px; height: 22px; display:flex; align-items:center; justify-content:center;">◀</button>
              <input type="date" id="dashboard-date-input" value="${activeDate}" style="font-family:var(--font-sans); font-weight:700; padding: 2px 8px; font-size:11px; height:22px; border-radius:4px; border:1px solid var(--border-color); background-color:var(--bg-secondary); cursor:pointer; outline:none; color:var(--text-primary);">
              <button class="btn btn-secondary btn-sm" id="dashboard-next-day-btn" style="padding: 2px 6px; font-size: 11px; height: 22px; display:flex; align-items:center; justify-content:center;">▶</button>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="goto-planner-btn">Open Planner</button>
        </div>
        
        <div class="task-list" style="max-height: 480px; overflow-y: auto; padding-right: 4px;">
          ${state.timeIntervals.map(slot => {
            const task = activeDay.schedule.find(t => t.plannedTime === slot);
            
            if (task) {
              let statusClass = '';
              if (task.status === 'completed') statusClass = 'done';
              else if (task.status === 'missed') statusClass = 'missed-row';
              else if (task.status === 'delayed') statusClass = 'delayed-row';
              
              let typeBadge = '';
              if (task.type === 'study') {
                typeBadge = `<span style="font-size: 10px; font-weight:600; padding: 2px 6px; border-radius: 4px; background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); white-space: nowrap;">Study</span>`;
              } else if (task.type === 'etsy_seo') {
                typeBadge = `<span style="font-size: 10px; font-weight:600; padding: 2px 6px; border-radius: 4px; background-color: rgba(249, 115, 22, 0.1); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); white-space: nowrap;">Etsy + SEO</span>`;
              } else {
                typeBadge = `<span style="font-size: 10px; font-weight:600; padding: 2px 6px; border-radius: 4px; background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); white-space: nowrap;">General</span>`;
              }

              return `
                <div class="task-row ${statusClass}" data-task-id="${task.id}" style="margin-bottom: 8px;">
                  <div class="task-info-side" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0;">
                    <span class="task-time-lbl editable-time-slot" data-time="${slot}" style="background-color: var(--bg-tertiary); cursor: pointer;" title="Double-click to rename time slot globally">${slot}</span>
                    <span class="task-name-lbl" title="${task.name}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; font-weight: 600;">${task.name}</span>
                    ${typeBadge}
                  </div>
                  
                  <div class="task-actions-side" style="display:flex; align-items:center; gap:8px;">
                    <select class="premium-select ${task.status}" data-task-id="${task.id}">
                      <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                      <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                      <option value="missed" ${task.status === 'missed' ? 'selected' : ''}>❌ Missed</option>
                      <option value="delayed" ${task.status === 'delayed' ? 'selected' : ''}>⚠ Delayed</option>
                    </select>
                    <button class="btn btn-danger btn-sm delete-dashboard-task-btn" data-task-id="${task.id}" style="padding:4px; height:28px; width:28px; display:flex; justify-content:center; align-items:center;" title="Delete Task">
                      ${icons.trash}
                    </button>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="task-row empty-slot" style="margin-bottom: 8px; opacity: 0.65; background-color: transparent; border-style: dashed; padding: 10px 16px;">
                  <div class="task-info-side" style="display: flex; align-items: center; gap: 8px;">
                    <span class="task-time-lbl editable-time-slot" data-time="${slot}" style="background-color: var(--bg-tertiary); cursor: pointer;" title="Double-click to rename time slot globally">${slot}</span>
                    <span class="task-name-lbl" style="color: var(--text-secondary); font-style: italic; font-size: 13px;">Free Slot</span>
                  </div>
                  <div class="task-actions-side">
                    <button class="btn btn-secondary btn-sm quick-add-task-btn" data-time="${slot}" style="padding: 2px 8px; font-size: 11px;">+ Schedule</button>
                  </div>
                </div>
              `;
            }
          }).join('')}
        </div>
      </div>

      <!-- Quick Non-Negotiables -->
      <div class="card">
        <div class="card-title">
          <span>Non-Negotiables</span>
          <button class="btn btn-secondary btn-sm" id="goto-nonneg-btn">Manage</button>
        </div>
        
        <div class="non-neg-list">
          ${state.nonNegotiables.length === 0 ? `
            <div class="cell-empty">No Non-Negotiables created yet.</div>
          ` : state.nonNegotiables.map(nn => {
            const status = activeDay.nonNegotiables[nn.id] || 'pending';
            
            return `
              <div class="non-neg-row" data-nn-id="${nn.id}">
                <span class="non-neg-name">${nn.name}</span>
                <div class="status-pill-group">
                  <button class="status-pill ${status === 'done' ? 'active done' : ''}" data-status="done">Done</button>
                  <button class="status-pill ${status === 'partial' ? 'active partial' : ''}" data-status="partial">Partial</button>
                  <button class="status-pill ${status === 'not_done' ? 'active not-done' : ''}" data-status="not_done">Missed</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    
    <!-- Modal placeholders for missed reasons and actual completion times -->
    <div id="dashboard-modal-container"></div>
  `;

  // Attach event handlers
  const gotoPlanner = container.querySelector('#goto-planner-btn');
  if (gotoPlanner) {
    gotoPlanner.addEventListener('click', () => state.setView('planner'));
  }

  const gotoNonNeg = container.querySelector('#goto-nonneg-btn');
  if (gotoNonNeg) {
    gotoNonNeg.addEventListener('click', () => state.setView('non-negotiables'));
  }

  // Date Selector Handlers
  const dbDateInput = container.querySelector('#dashboard-date-input');
  if (dbDateInput) {
    dbDateInput.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val) await state.setActiveDate(val);
    });
  }

  const dbPrevBtn = container.querySelector('#dashboard-prev-day-btn');
  if (dbPrevBtn) {
    dbPrevBtn.addEventListener('click', async () => {
      const current = new Date(state.getActiveDate());
      current.setDate(current.getDate() - 1);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      await state.setActiveDate(`${y}-${m}-${d}`);
    });
  }

  const dbNextBtn = container.querySelector('#dashboard-next-day-btn');
  if (dbNextBtn) {
    dbNextBtn.addEventListener('click', async () => {
      const current = new Date(state.getActiveDate());
      current.setDate(current.getDate() + 1);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      await state.setActiveDate(`${y}-${m}-${d}`);
    });
  }

  // Global Time Slot Rename Handler (on double-click of time badges)
  container.querySelectorAll('.editable-time-slot').forEach(badge => {
    badge.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const oldTime = badge.getAttribute('data-time');
      enterTimeSlotRenameMode(badge, oldTime, state, container);
    });
  });

  // Quick Add Task Event Handler
  const onQuickAddClick = (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const row = btn.closest('.task-row');
    const time = btn.getAttribute('data-time');
    const originalHTML = row.innerHTML;
    
    row.innerHTML = `
      <div class="task-info-side" style="display: flex; align-items: center; gap: 8px; flex: 1; margin-right: 8px; flex-wrap: wrap;">
        <span class="task-time-lbl">${time}</span>
        <input type="text" class="premium-input inline-dashboard-input" placeholder="Task name..." style="flex: 2; font-size: 13px; height: 28px; padding: 4px 8px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;" autofocus>
        <select class="premium-select inline-dashboard-type-select" style="flex: 1; min-width: 100px; height: 28px; font-size: 12px; padding: 2px 4px;">
          <option value="general">General</option>
          <option value="study">Study</option>
          <option value="etsy_seo">Etsy + SEO</option>
          ${state.customSections.map(s => `
            <option value="${s.type}">${s.label}</option>
          `).join('')}
        </select>
      </div>
      <div class="task-actions-side" style="display: flex; gap: 4px;">
        <button class="btn btn-secondary btn-sm cancel-dashboard-input" style="padding: 2px 6px; font-size: 11px; height: 28px;">Cancel</button>
        <button class="btn btn-primary btn-sm save-dashboard-input" style="padding: 2px 6px; font-size: 11px; height: 28px;">Save</button>
      </div>
    `;

    const input = row.querySelector('.inline-dashboard-input');
    const typeSelect = row.querySelector('.inline-dashboard-type-select');
    const cancelBtn = row.querySelector('.cancel-dashboard-input');
    const saveBtn = row.querySelector('.save-dashboard-input');
    
    input.focus();

    const handleSave = async () => {
      const value = input.value.trim();
      const type = typeSelect.value;
      if (value) {
        const newTask = {
          id: 't-' + Date.now(),
          name: value,
          plannedTime: time,
          status: 'pending',
          missedReason: '',
          actualTime: '',
          type: type
        };
        activeDay.schedule.push(newTask);
        activeDay.schedule.sort((a, b) => {
          const indexA = state.timeIntervals.indexOf(a.plannedTime);
          const indexB = state.timeIntervals.indexOf(b.plannedTime);
          return indexA - indexB;
        });
        await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      } else {
        row.innerHTML = originalHTML;
        row.querySelector('.quick-add-task-btn').addEventListener('click', onQuickAddClick);
      }
    };

    const handleCancel = () => {
      row.innerHTML = originalHTML;
      row.querySelector('.quick-add-task-btn').addEventListener('click', onQuickAddClick);
    };

    cancelBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      handleCancel();
    });
    
    saveBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      handleSave();
    });
    
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.stopPropagation();
        handleSave();
      }
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        handleCancel();
      }
    });
  };

  container.querySelectorAll('.quick-add-task-btn').forEach(btn => {
    btn.addEventListener('click', onQuickAddClick);
  });

  // Edit Task Details click handler
  container.querySelectorAll('.task-name-lbl').forEach(label => {
    label.addEventListener('click', (e) => {
      const row = label.closest('.task-row');
      const taskId = row.getAttribute('data-task-id');
      const task = activeDay.schedule.find(t => t.id === taskId);
      if (task) {
        enterDashboardTaskEditMode(row, task, activeDay, state, container);
      }
    });
    // Add custom cursor/pointer look
    label.style.cursor = 'pointer';
    label.title = 'Click to edit task name or category';
  });

  // Delete Task Handler
  container.querySelectorAll('.delete-dashboard-task-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task-id');
      if (confirm('Delete this task from schedule?')) {
        activeDay.schedule = activeDay.schedule.filter(t => t.id !== taskId);
        await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
        renderDashboard(container, state);
      }
    });
  });

  // Task Status Select Change
  container.querySelectorAll('.premium-select[data-task-id]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const taskId = e.target.getAttribute('data-task-id');
      const newStatus = e.target.value;
      const taskIndex = activeDay.schedule.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const task = activeDay.schedule[taskIndex];
      const oldStatus = task.status;
      
      if (newStatus === 'completed') {
        task.status = 'completed';
        task.missedReason = '';
        task.actualTime = '';
        
        // Fire confetti for instant feedback celebration!
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        
        await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      } else if (newStatus === 'missed') {
        // Show inline Modal to collect missed explanation
        showExplanationModal(
          "Why was this task not completed?",
          "Enter explanation...",
          async (reason) => {
            task.status = 'missed';
            task.missedReason = reason || 'No reason provided';
            task.actualTime = '';
            await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
          },
          () => {
            // Revert dropdown if cancelled
            e.target.value = oldStatus;
          }
        );
      } else if (newStatus === 'delayed') {
        // Show inline Modal to collect actual completion time
        showExplanationModal(
          "When was this task actually completed?",
          "e.g. 15:30",
          async (time) => {
            task.status = 'delayed';
            task.actualTime = time || 'Unknown';
            task.missedReason = '';
            
            confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 } });
            
            await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
          },
          () => {
            e.target.value = oldStatus;
          }
        );
      } else {
        task.status = 'pending';
        task.missedReason = '';
        task.actualTime = '';
        await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      }
    });
  });

  // Non-Negotiable Toggle Status
  container.querySelectorAll('.non-neg-row').forEach(row => {
    const nnId = row.getAttribute('data-nn-id');
    row.querySelectorAll('.status-pill').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.getAttribute('data-status');
        const currentNonNegs = { ...activeDay.nonNegotiables };
        
        // Toggle/update status
        currentNonNegs[nnId] = newStatus;
        
        if (newStatus === 'done') {
          confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
        }
        
        await state.updateDay(activeDay.date, { nonNegotiables: currentNonNegs });
      });
    });
  });

  // Modal display utility
  function showExplanationModal(title, placeholder, onSave, onCancel) {
    const modalContainer = container.querySelector('#dashboard-modal-container');
    modalContainer.innerHTML = `
      <div class="modal-overlay active" id="explanation-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" id="modal-cancel-btn">&times;</button>
          </div>
          <div class="modal-body">
            <input type="text" class="premium-input" id="modal-input" placeholder="${placeholder}" autofocus>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="modal-close-action">Cancel</button>
            <button class="btn btn-primary" id="modal-save-action">Save Status</button>
          </div>
        </div>
      </div>
    `;

    const modal = modalContainer.querySelector('#explanation-modal');
    const input = modal.querySelector('#modal-input');
    
    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => { modalContainer.innerHTML = ''; }, 200);
    };

    modal.querySelector('#modal-cancel-btn').addEventListener('click', () => {
      onCancel();
      closeModal();
    });
    
    modal.querySelector('#modal-close-action').addEventListener('click', () => {
      onCancel();
      closeModal();
    });

    const handleSave = () => {
      onSave(input.value.trim());
      closeModal();
    };

    modal.querySelector('#modal-save-action').addEventListener('click', handleSave);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSave();
    });
  }
}

function enterDashboardTaskEditMode(row, task, activeDay, state, container) {
  const originalHTML = row.innerHTML;
  
  // Custom sections map
  const allTypes = [
    { type: 'general', label: 'General' },
    { type: 'study', label: 'Study' },
    { type: 'etsy_seo', label: 'Etsy + SEO' },
    ...state.customSections.map(s => ({ type: s.type, label: s.label }))
  ];
  
  row.innerHTML = `
    <div class="task-info-side" style="display: flex; align-items: center; gap: 8px; flex: 1; margin-right: 8px; flex-wrap: wrap;">
      <select class="premium-select edit-dashboard-slot-select" style="flex: 1.5; min-width: 140px; height: 28px; font-size: 11px; padding: 2px 4px; font-family:var(--font-mono); font-weight:700;">
        ${state.timeIntervals.map(t => `
          <option value="${t}" ${task.plannedTime === t ? 'selected' : ''}>${t}</option>
        `).join('')}
      </select>
      <input type="text" class="premium-input edit-dashboard-input" value="${task.name}" style="flex: 2; font-size: 13px; height: 28px; padding: 4px 8px; background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;" autofocus>
      
      <select class="premium-select edit-dashboard-type-select" style="flex: 1; min-width: 100px; height: 28px; font-size: 12px; padding: 2px 4px;">
        ${allTypes.map(t => `
          <option value="${t.type}" ${task.type === t.type ? 'selected' : ''}>${t.label}</option>
        `).join('')}
      </select>
    </div>
    <div class="task-actions-side" style="display: flex; gap: 4px;">
      <button class="btn btn-secondary btn-sm cancel-dashboard-edit" style="padding: 2px 6px; font-size: 11px; height: 28px;">Cancel</button>
      <button class="btn btn-primary btn-sm save-dashboard-edit" style="padding: 2px 6px; font-size: 11px; height: 28px;">Save</button>
    </div>
  `;

  const input = row.querySelector('.edit-dashboard-input');
  const slotSelect = row.querySelector('.edit-dashboard-slot-select');
  const typeSelect = row.querySelector('.edit-dashboard-type-select');
  const cancelBtn = row.querySelector('.cancel-dashboard-edit');
  const saveBtn = row.querySelector('.save-dashboard-edit');

  // Place cursor at end of text input
  input.focus();
  const val = input.value;
  input.value = '';
  input.value = val;

  const saveEdit = async () => {
    const newName = input.value.trim();
    const newSlot = slotSelect.value;
    const newType = typeSelect.value;
    
    if (newName) {
      // Rescheduling collision check
      if (newSlot !== task.plannedTime) {
        const existingTask = activeDay.schedule.find(t => t.plannedTime === newSlot);
        if (existingTask) {
          alert(`Reschedule Aborted: The slot "${newSlot}" is already occupied by the task "${existingTask.name}". Please clear or reschedule that task first.`);
          return;
        }
        task.plannedTime = newSlot;
      }
      
      task.name = newName;
      task.type = newType;
      
      // Sort schedule
      activeDay.schedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });
      
      await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      renderDashboard(container, state);
    } else {
      renderDashboard(container, state);
    }
  };

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderDashboard(container, state);
  });
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    saveEdit();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      saveEdit();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      renderDashboard(container, state);
    }
  });
}

function enterTimeSlotRenameMode(badgeEl, oldTime, state, container) {
  if (badgeEl.querySelector('input')) return;
  const originalHTML = badgeEl.innerHTML;
  
  badgeEl.innerHTML = `
    <input type="text" class="premium-input rename-slot-input" value="${oldTime}" style="width: 140px; font-family:var(--font-mono); font-size:10px; font-weight:700; padding: 2px 4px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--bg-secondary); color: var(--text-primary); outline: none; display: inline-block; vertical-align: middle;" autofocus>
  `;
  
  const input = badgeEl.querySelector('.rename-slot-input');
  input.focus();
  input.select();
  
  const saveRename = async () => {
    const newVal = input.value.trim();
    if (newVal && newVal !== oldTime) {
      if (state.timeIntervals.includes(newVal)) {
        alert(`The slot "${newVal}" already exists in settings.`);
        badgeEl.innerHTML = originalHTML;
        return;
      }
      await state.renameTimeInterval(oldTime, newVal);
      renderDashboard(container, state);
    } else {
      badgeEl.innerHTML = originalHTML;
    }
  };

  input.addEventListener('blur', saveRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      saveRename();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      badgeEl.innerHTML = originalHTML;
    }
  });
}
