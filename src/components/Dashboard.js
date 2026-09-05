import { icons } from '../icons.js';
import { calculateStreak } from './Header.js';
import confetti from 'canvas-confetti';
import { showPlannerCellPopup } from './PlannerCellPopup.js';
import { showToast } from '../main.js';

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

  // Total efficiency = average of task completion rate and habit efficiency
  const totalEfficiency = Math.round((completionPercentage + nnEfficiencyPercentage) / 2);

  const avgSatisfaction = ratedDaysCount > 0 ? (satisfactionSum / ratedDaysCount).toFixed(1) : 'N/A';
  const totalProfit = totalRevenue - totalExpenses;
  const currentStreak = calculateStreak(state.days, activeDate);

  // Determine encouragement message based on streak and completion
  let streakMessage = "Every day is a new chance to stack wins. Start ticking tasks!";
  if (currentStreak > 0) {
    streakMessage = `Incredible focus! You are maintaining a ${currentStreak}-day success streak. Keep it up! 🔥`;
  }

  // Calculate Cadence & Priority Recommendations for Dashboard
  const todayDateObj = new Date(activeDate + 'T00:00:00');
  const processedProjects = (state.projects || []).map(proj => {
    const cadence = state.getProjectCadenceInfo(proj, activeDate);
    let urgency = 20;
    let daysRemaining = 999;
    if (proj.deadline) {
      const deadlineDate = new Date(proj.deadline + 'T00:00:00');
      const diffTime = deadlineDate - todayDateObj;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) urgency = 100;
      else if (daysRemaining <= 3) urgency = 90;
      else if (daysRemaining <= 7) urgency = 75;
      else urgency = 40;
    }
    let importance = 50;
    if (proj.priority === 'critical') importance = 100;
    else if (proj.priority === 'high') importance = 75;
    else if (proj.priority === 'medium') importance = 50;
    else if (proj.priority === 'low') importance = 25;

    const cadenceBoost = cadence.urgencyBoost || 0;
    let priorityScore = Math.round(
      (urgency * 0.25) +
      (importance * 0.20) +
      (cadenceBoost * 0.25) +
      (10)
    );
    if (cadence.isCompleted) {
      priorityScore = Math.max(5, priorityScore - 40);
    }
    return { ...proj, cadence, daysRemaining, priorityScore };
  });

  processedProjects.sort((a, b) => b.priorityScore - a.priorityScore);

  let dashboardNextTask = null;
  let dashboardNextProject = null;
  let dashboardNextReason = '';

  for (const proj of processedProjects) {
    if (proj.status === 'Completed' || proj.status === 'Paused') continue;
    if (proj.cadence && proj.cadence.isCompleted) continue;

    const sessionDuration = proj.durationPerSessionMinutes || proj.dailyAllocationMinutes || 60;
    const activePendingForToday = (proj.subtasks || []).filter(s => !s.completed && !state.isTaskCompletedToday(s, activeDate));
    if (activePendingForToday.length > 0) {
      dashboardNextTask = activePendingForToday[0];
      dashboardNextProject = proj;
      if (proj.cadence && proj.cadence.isDue) {
        dashboardNextReason = `Due today • ${proj.cadence.label} cadence`;
      } else if (proj.deadline && proj.daysRemaining <= 3) {
        dashboardNextReason = `Urgent deadline (${proj.daysRemaining}d left)`;
      } else {
        dashboardNextReason = `Top priority project (${proj.priorityScore} Priority)`;
      }
      break;
    } else {
      dashboardNextTask = {
        id: 'session-' + proj.id,
        name: `${proj.name}: Focus Session`,
        estimatedMinutes: sessionDuration
      };
      dashboardNextProject = proj;
      if (proj.cadence && proj.cadence.isDue) {
        dashboardNextReason = `Due today • ${proj.cadence.label} commitment`;
      } else {
        dashboardNextReason = `Top priority project session`;
      }
      break;
    }
  }

  const dailyCapacity = state.calculateDailyTimeCapacity(activeDate);

  // Render Dashboard HTML
  container.innerHTML = `
    <!-- Streak / Milestone Banner -->
    <div class="streak-banner" style="margin-bottom: 20px;">
      <div class="streak-banner-info">
        <h2 class="streak-banner-title">Welcome to Aether space</h2>
        <p class="streak-banner-desc">${streakMessage}</p>
      </div>
      <div class="streak-banner-badge">
        <span style="display:inline-block; animation: pulse 1.5s infinite;">${icons.streak}</span>
        <span>Streak: ${currentStreak} Day${currentStreak === 1 ? '' : 's'}</span>
      </div>
      <div class="streak-banner-bg">${currentStreak}</div>
    </div>

    <!-- ⚡ What To Do Next & Daily Capacity Banner -->
    <div class="hero-next-action-card" style="margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; flex-direction:column; gap:6px; max-width:650px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:var(--accent); display:flex; align-items:center; gap:4px;">
              ⚡ RECOMMENDED NEXT ACTION
            </span>
            ${dashboardNextProject ? `
              <span class="cadence-badge ${dashboardNextProject.cadence.badgeClass}">${dashboardNextProject.cadence.label}</span>
              <span class="cadence-status-pill ${dashboardNextProject.cadence.isDue ? 'due-today' : 'on-track'}">${dashboardNextProject.cadence.statusText}</span>
            ` : ''}
          </div>
          ${dashboardNextTask ? `
            <h3 style="font-size:18px; font-weight:900; color:var(--text-primary); margin:0; line-height:1.3;">
              ${dashboardNextTask.name}
            </h3>
            <div style="display:flex; align-items:center; gap:10px; font-size:12px; color:var(--text-secondary); flex-wrap:wrap;">
              <span>Project: <strong style="color:var(--text-primary);">${dashboardNextProject.name}</strong></span>
              <span>•</span>
              <span style="color:var(--accent); font-weight:700; font-family:var(--font-mono);">Priority: ${dashboardNextProject.priorityScore}/100</span>
              <span>•</span>
              <span style="font-family:var(--font-mono); background:var(--bg-secondary); padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; color:var(--text-primary);">⏱ ~${dashboardNextTask.estimatedMinutes || 45} mins</span>
              <span>•</span>
              <span style="font-style:italic;">${dashboardNextReason}</span>
            </div>
          ` : `
            <h3 style="font-size:16px; font-weight:800; color:var(--text-primary); margin:0;">
              🎉 All Priority Actions Completed Today!
            </h3>
            <p style="font-size:12px; color:var(--text-secondary); margin:0;">
              Check Project Hub for more milestones or enjoy your free time.
            </p>
          `}
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
          ${dashboardNextTask ? `
            <button class="btn btn-primary" id="dashboard-schedule-next-btn" data-proj-id="${dashboardNextProject.id}" data-task-name="${dashboardNextTask.name}" data-task-est="${dashboardNextTask.estimatedMinutes || 45}" data-proj-type="${dashboardNextProject.type || 'general'}" style="height:38px; padding:0 18px; font-size:12px; font-weight:800; box-shadow:0 4px 14px rgba(99, 102, 241, 0.4); display:flex; align-items:center; gap:6px;">
              <span>⚡</span> Schedule Right Now
            </button>
          ` : ''}
          <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-secondary); flex-wrap:wrap;">
            <span>Free Time Left: <strong style="color:var(--success); font-family:var(--font-mono);">${dailyCapacity.remainingFreeHours}h</strong></span>
            <span>•</span>
            <span>Doables: <strong style="color:var(--accent); font-family:var(--font-mono);">${dailyCapacity.doablesHours}h</strong></span>
            <span>•</span>
            <span>Scheduled: <strong style="color:#3b82f6; font-family:var(--font-mono);">${dailyCapacity.scheduledHours}h</strong></span>
          </div>
        </div>
      </div>
    </div>

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
      <!-- Total Efficiency Card -->
      <div class="stat-card success" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(129, 140, 248, 0.1) 100%); border: 1px solid var(--accent);">
        <span class="stat-icon">${icons.streak}</span>
        <span class="stat-label" style="font-weight:800;">Total Efficiency</span>
        <span class="stat-value" style="color:var(--accent); font-weight:900;">${totalEfficiency}%</span>
        <span class="stat-desc">Overall average efficiency starting tomorrow</span>
      </div>

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
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="replicate-prev-day-btn" style="display:flex; align-items:center; gap:4px; font-size:11px; padding:3px 8px;" title="Clone all tasks from previous day with status reset to Pending">
              📋 Replicate Yesterday
            </button>
            <button class="btn btn-secondary btn-sm" id="goto-planner-btn">Open Planner</button>
          </div>
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
    
    <!-- Disclaimer info at the end of the dashboard -->
    <div style="font-size: 11px; text-align: center; color: var(--text-secondary); margin-top: 32px; padding: 16px 12px 0 12px; border-top: 1px solid var(--border-color); width: 100%; font-weight: 600; line-height: 1.4;">
      ℹ️ Note: All statistics (Total Efficiency, Completion Rate, Schedule Accuracy, Habit Efficiency, Net Profit, and Savings) represent overall/cumulative metrics calculated starting from August 31, 2026.
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

  // 1-Tap Schedule Next Recommended Action from Dashboard
  const dbScheduleNextBtn = container.querySelector('#dashboard-schedule-next-btn');
  if (dbScheduleNextBtn) {
    dbScheduleNextBtn.addEventListener('click', async () => {
      const projId = Number(dbScheduleNextBtn.getAttribute('data-proj-id'));
      const taskName = dbScheduleNextBtn.getAttribute('data-task-name');
      const type = dbScheduleNextBtn.getAttribute('data-proj-type') || 'general';
      const proj = state.projects.find(p => p.id === projId);
      if (!proj) return;

      const firstFreeSlot = state.timeIntervals.find(slot => !activeDay.schedule.some(t => t.plannedTime === slot));
      if (!firstFreeSlot) {
        alert("No free time slots available on your schedule for today! Please free up a slot in Daily Planner first.");
        return;
      }

      const formattedName = taskName.includes(proj.name) ? taskName : `${proj.name}: ${taskName}`;
      const newTask = {
        id: 't-' + Date.now() + Math.random().toString(36).substring(7),
        name: formattedName,
        plannedTime: firstFreeSlot,
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: type || proj.type || 'general'
      };

      activeDay.schedule.push(newTask);
      activeDay.schedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });

      await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      await state.updateProject(proj.id, { lastWorkedOn: Date.now() });

      confetti({ particleCount: 50, spread: 45 });
      showToast(`⚡ Scheduled "${formattedName}" for ${firstFreeSlot} today!`);
      renderDashboard(container, state);
    });
  }

  // Replicate previous day tasks handler
  const replicateBtn = container.querySelector('#replicate-prev-day-btn');
  if (replicateBtn) {
    replicateBtn.addEventListener('click', async () => {
      const curDateObj = new Date(activeDate + 'T00:00:00');
      curDateObj.setDate(curDateObj.getDate() - 1);
      const prevYear = curDateObj.getFullYear();
      const prevMonth = String(curDateObj.getMonth() + 1).padStart(2, '0');
      const prevDayOfMonth = String(curDateObj.getDate()).padStart(2, '0');
      const prevDateStr = `${prevYear}-${prevMonth}-${prevDayOfMonth}`;

      const prevDay = state.days.find(d => d.date === prevDateStr);
      if (!prevDay || !prevDay.schedule || prevDay.schedule.length === 0) {
        alert(`No scheduled tasks found on the previous day (${prevDateStr}) to replicate.`);
        return;
      }

      const taskCount = prevDay.schedule.length;
      const confirmed = confirm(`Replicate ${taskCount} task${taskCount === 1 ? '' : 's'} from yesterday (${prevDateStr}) into today (${activeDate})?\n\nTasks will be copied with their status reset to Pending.`);
      if (!confirmed) return;

      // Clone tasks with fresh IDs and pending status
      const replicatedTasks = prevDay.schedule.map((task, idx) => ({
        ...task,
        id: 't-' + Date.now() + '-' + idx,
        status: 'pending',
        missedReason: '',
        actualTime: ''
      }));

      // Merge into activeDay.schedule:
      const existingOtherSlots = activeDay.schedule.filter(t => !replicatedTasks.some(r => r.plannedTime === t.plannedTime));
      const mergedSchedule = [...existingOtherSlots, ...replicatedTasks];

      mergedSchedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });

      activeDay.schedule = mergedSchedule;
      await state.updateDay(activeDay.date, { schedule: activeDay.schedule });

      confetti({ particleCount: 50, spread: 45 });
      alert(`✨ Successfully replicated ${taskCount} task${taskCount === 1 ? '' : 's'} from yesterday into today!`);
      renderDashboard(container, state);
    });
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

  // Quick Add Task Event Handler: Open rich planning popup/modal
  const onQuickAddClick = (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const row = btn.closest('.task-row');
    const time = btn.getAttribute('data-time');

    showPlannerCellPopup(e, row, activeDay.date, time, state, 'general', async (taskName, taskType) => {
      const newTask = {
        id: 't-' + Date.now(),
        name: taskName,
        plannedTime: time,
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: taskType || 'general'
      };
      activeDay.schedule.push(newTask);
      activeDay.schedule.sort((a, b) => {
        const indexA = state.timeIntervals.indexOf(a.plannedTime);
        const indexB = state.timeIntervals.indexOf(b.plannedTime);
        return indexA - indexB;
      });
      await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      renderDashboard(container, state);
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
  // Mobile responsive full-width bottom sheet editor
  if (window.innerWidth <= 768) {
    const existingModal = document.querySelector('#mobile-task-edit-modal');
    if (existingModal) existingModal.remove();
    const existingBackdrop = document.querySelector('.modal-backdrop-fade');
    if (existingBackdrop) existingBackdrop.remove();

    const allTypes = [
      { type: 'general', label: 'General' },
      { type: 'study', label: 'Study' },
      { type: 'etsy_seo', label: 'Etsy + SEO' },
      { type: 'quran', label: 'Quran Hifz' },
      ...state.customSections.filter(s => s.type !== 'quran').map(s => ({ type: s.type, label: s.label }))
    ];

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop-fade';
    backdrop.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
      z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.id = 'mobile-task-edit-modal';
    modal.className = 'status-popup';
    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">
        <span style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">Edit Scheduled Task</span>
        <button id="close-mobile-edit" style="background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer;">&times;</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div>
          <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Task Name</label>
          <input type="text" id="mobile-edit-task-name" class="premium-input" value="${task.name}" style="width:100%; height:36px; font-size:14px; margin-top:4px;">
        </div>
        <div style="display:flex; gap:10px;">
          <div style="flex:1;">
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Time Slot</label>
            <select id="mobile-edit-slot" class="premium-select" style="width:100%; height:36px; font-size:12px; margin-top:4px; font-family:var(--font-mono);">
              ${state.timeIntervals.map(t => `<option value="${t}" ${task.plannedTime === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1;">
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Category</label>
            <select id="mobile-edit-type" class="premium-select" style="width:100%; height:36px; font-size:12px; margin-top:4px;">
              ${allTypes.map(t => `<option value="${t.type}" ${task.type === t.type ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:8px;">
          <button class="btn btn-secondary" id="mobile-cancel-edit" style="flex:1; justify-content:center; height:36px;">Cancel</button>
          <button class="btn btn-primary" id="mobile-save-edit" style="flex:1; justify-content:center; height:36px; font-weight:700;">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const closeModal = () => {
      modal.remove();
      backdrop.remove();
    };
    backdrop.addEventListener('click', closeModal);
    modal.querySelector('#close-mobile-edit').addEventListener('click', closeModal);
    modal.querySelector('#mobile-cancel-edit').addEventListener('click', closeModal);

    const nameInput = modal.querySelector('#mobile-edit-task-name');
    nameInput.focus();

    modal.querySelector('#mobile-save-edit').addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      const newSlot = modal.querySelector('#mobile-edit-slot').value;
      const newType = modal.querySelector('#mobile-edit-type').value;

      if (!newName) {
        alert("Task name cannot be empty");
        return;
      }

      if (newSlot !== task.plannedTime && activeDay.schedule.some(t => t.plannedTime === newSlot && t.id !== task.id)) {
        if (!confirm(`A task is already scheduled in slot "${newSlot}". Overwrite it?`)) return;
        activeDay.schedule = activeDay.schedule.filter(t => t.plannedTime !== newSlot || t.id === task.id);
      }

      task.name = newName;
      task.plannedTime = newSlot;
      task.type = newType;

      activeDay.schedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });

      closeModal();
      await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      renderDashboard(container, state);
    });
    return;
  }

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
