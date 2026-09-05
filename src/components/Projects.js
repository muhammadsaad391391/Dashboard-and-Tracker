import { icons } from '../icons.js';
import confetti from 'canvas-confetti';
import { showToast } from '../main.js';

export function getDailyAllocationStats(proj, state) {
  const activeDate = state.getActiveDate();
  const day = state.days.find(d => d.date === activeDate);
  if (!day) {
    return { completedMinutes: 0, totalMinutes: 0, targetMinutes: proj.dailyAllocationMinutes || 60, percent: 0 };
  }
  
  // Find scheduled tasks for this project (starts with name + ':' or matches name exactly)
  const prefix = proj.name + ':';
  const projectTasks = day.schedule.filter(t => t.name.startsWith(prefix) || t.name === proj.name);
  
  // Each task slot represents 60 minutes
  const totalMinutes = projectTasks.length * 60;
  const completedMinutes = projectTasks.filter(t => t.status === 'completed').length * 60;
  const targetMinutes = proj.dailyAllocationMinutes || 60;
  const percent = Math.min(100, Math.round((completedMinutes / targetMinutes) * 100));
  
  return { completedMinutes, totalMinutes, targetMinutes, percent };
}

export function getProjectDetailsContentHTML(proj, state) {
  const allocStats = proj.isDailyAllocation ? getDailyAllocationStats(proj, state) : null;
  return `
    <div style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Subtasks Section -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">
            ${proj.isDailyAllocation ? 'Daily Allocation Progress' : `Subtasks & Roadmap (${(proj.subtasks || []).length})`}
          </span>
          ${(!proj.isDailyAllocation && proj.subtasks && proj.subtasks.length > 0) ? `
            <button class="btn btn-danger btn-sm clear-proj-tasks-btn" data-proj-id="${proj.id}" style="font-size:10px; height:22px; padding:0 8px;" title="Remove all tasks from this project">
              🗑 Clear All Tasks
            </button>
          ` : ''}
        </div>
        <div>
          ${proj.isDailyAllocation ? `
            <div style="background-color:var(--bg-tertiary); padding:16px; border-radius:var(--radius-sm); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:700; color:var(--text-primary);">🎯 Daily Goal: ${allocStats.targetMinutes} mins</span>
                <span style="font-size:12px; font-weight:700; color:var(--accent);">${allocStats.completedMinutes} / ${allocStats.targetMinutes} mins completed today</span>
              </div>
              <div style="height:8px; background-color:var(--bg-secondary); border-radius:4px; overflow:hidden;">
                <div style="width:${allocStats.percent}%; height:100%; background:var(--accent-gradient); border-radius:4px;"></div>
              </div>
              <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                <span style="font-size:11px; color:var(--text-muted); font-weight:600;">Scheduled Today: ${allocStats.totalMinutes} mins</span>
                <button class="btn btn-primary btn-sm quick-schedule-alloc-btn" data-proj-id="${proj.id}" style="margin-left:auto; font-size:11px; height:24px; padding:0 8px;">
                  ⚡ Schedule 1 hr Slot
                </button>
              </div>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${(!proj.subtasks || proj.subtasks.length === 0) ? `
                <span style="font-size:12px; color:var(--text-muted); font-style:italic;">No tasks added to this project yet. Add one below!</span>
              ` : proj.subtasks.map((sub, sIdx) => `
                <div style="display:flex; align-items:center; gap:8px; background:var(--bg-tertiary); padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-color);" class="subtask-row" data-proj-id="${proj.id}" data-idx="${sIdx}">
                  <input type="checkbox" class="subtask-checkbox" data-proj-id="${proj.id}" data-idx="${sIdx}" ${sub.completed ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                  <span style="font-size:13px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${sub.completed ? 'text-decoration:line-through; color:var(--text-muted);' : 'font-weight:600; color:var(--text-primary);'}" class="subtask-name-text">${sub.name}</span>
                  <span style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono); background:var(--bg-secondary); padding:2px 6px; border-radius:4px; flex-shrink:0;">~${sub.estimatedMinutes || 30} mins</span>
                  <button class="btn btn-secondary btn-sm edit-subtask-btn" data-proj-id="${proj.id}" data-idx="${sIdx}" style="padding:2px 6px; height:24px; font-size:11px;" title="Edit Task">
                    ${icons.edit}
                  </button>
                  <button class="btn btn-danger btn-sm delete-subtask-btn" data-proj-id="${proj.id}" data-idx="${sIdx}" style="padding:2px 6px; height:24px; font-size:11px;" title="Delete Task">
                    ${icons.trash}
                  </button>
                </div>
              `).join('')}
            </div>
            
            <!-- Add Subtask Input Form -->
            <div style="display:flex; gap:8px; margin-top:12px;">
              <input type="text" class="premium-input new-subtask-name" data-proj-id="${proj.id}" placeholder="New subtask name..." style="flex:2; height:28px; font-size:12px; padding:2px 8px;">
              <input type="number" class="premium-input new-subtask-est" data-proj-id="${proj.id}" placeholder="Est. Mins (e.g. 30)" style="flex:1; height:28px; font-size:12px; padding:2px 8px;">
              <button class="btn btn-primary btn-sm add-subtask-btn" data-proj-id="${proj.id}" style="height:28px; padding:0 12px; font-size:11px;">Add Task</button>
            </div>
          `}
        </div>
      </div>
      
      <hr style="border:0; border-top:1px solid var(--border-color); margin:0;">
      
      <!-- Project Details / Stats Summary -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; font-size:12px;">
        <div>
          <span style="color:var(--text-muted);">
            ${proj.isDailyAllocation ? 'Daily Target Goal:' : 'Estimated Remaining Effort:'}
          </span>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
            ${proj.isDailyAllocation ? `
              <input type="number" class="premium-input edit-proj-daily-minutes" data-proj-id="${proj.id}" value="${proj.dailyAllocationMinutes || 60}" style="width:70px; height:24px; padding:2px 6px;">
              <span>minutes</span>
            ` : `
              <input type="number" class="premium-input edit-proj-effort" data-proj-id="${proj.id}" value="${proj.estimatedHours}" style="width:70px; height:24px; padding:2px 6px;">
              <span>hours</span>
            `}
          </div>
        </div>
        <div>
          <span style="color:var(--text-muted);">Available Time:</span>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
            <input type="number" class="premium-input edit-proj-available" data-proj-id="${proj.id}" value="${proj.availableHoursPerDay}" style="width:70px; height:24px; padding:2px 6px;">
            <span>hours/day</span>
          </div>
        </div>
        <div>
          <span style="color:var(--text-muted);">Next Milestone:</span>
          <div style="margin-top:4px;">
            <input type="text" class="premium-input edit-proj-nextgoal" data-proj-id="${proj.id}" value="${proj.nextGoal || ''}" placeholder="Next goal..." style="width:100%; height:24px; padding:2px 6px;">
          </div>
        </div>
        <div style="display:flex; align-items:flex-end;">
          <button class="btn btn-primary btn-sm save-proj-details-btn" data-id="${proj.id}" style="height:24px; width:100%; font-size:11px; padding:0; justify-content:center;">Save Details</button>
        </div>
      </div>

    </div>
  `;
}

export function renderProjects(container, state) {
  // 1. Calculate Priority Scores & Health for all projects with Cadence Boost
  const activeDate = state.getActiveDate();
  const today = new Date(activeDate + 'T00:00:00');
  
  const processedProjects = state.projects.map(proj => {
    // Cadence & Recurrence evaluation
    const cadence = state.getProjectCadenceInfo(proj, activeDate);

    // A. Urgency score calculation
    let urgency = 20; // Default low urgency for no deadline
    let daysRemaining = 999;
    if (proj.deadline) {
      const deadlineDate = new Date(proj.deadline + 'T00:00:00');
      const diffTime = deadlineDate - today;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) urgency = 100;
      else if (daysRemaining === 1) urgency = 95;
      else if (daysRemaining <= 3) urgency = 90;
      else if (daysRemaining <= 7) urgency = 75;
      else if (daysRemaining <= 14) urgency = 60;
      else if (daysRemaining <= 30) urgency = 40;
      else urgency = 20;
    }
    
    // B. Deadline Risk score
    let deadlineRisk = 0;
    let paceStatus = 'On Track';
    let paceClass = 'status-ontrack';
    let requiredDailyHours = 0;
    
    if (proj.deadline && proj.availableHoursPerDay > 0) {
      const neededDays = proj.estimatedHours / proj.availableHoursPerDay;
      if (daysRemaining <= 0) {
        deadlineRisk = 100;
        paceStatus = 'Behind';
        paceClass = 'status-behind';
      } else {
        requiredDailyHours = proj.estimatedHours / daysRemaining;
        const ratio = neededDays / daysRemaining;
        
        if (ratio > 1.2) {
          deadlineRisk = Math.min(100, Math.round(ratio * 75));
          paceStatus = 'Behind';
          paceClass = 'status-behind';
        } else if (ratio > 0.9) {
          deadlineRisk = Math.min(100, Math.round(ratio * 55));
          paceStatus = 'At Risk';
          paceClass = 'status-atrisk';
        } else {
          deadlineRisk = Math.round(ratio * 40);
          paceStatus = ratio > 0.5 ? 'On Track' : 'Ahead';
          paceClass = ratio > 0.5 ? 'status-ontrack' : 'status-ahead';
        }
      }
    }
    
    // C. Neglect Factor
    const lastWorked = proj.lastWorkedOn || today.getTime();
    const neglectDays = Math.max(0, Math.floor((today.getTime() - lastWorked) / (1000 * 60 * 60 * 24)));
    const neglectFactor = Math.min(100, neglectDays * 8);
    
    // D. Importance (manual priority weight)
    let importance = 50;
    if (proj.priority === 'critical') importance = 100;
    else if (proj.priority === 'high') importance = 75;
    else if (proj.priority === 'medium') importance = 50;
    else if (proj.priority === 'low') importance = 25;
    
    // E. Priority Score Formula with Cadence Boost (0-100)
    const cadenceBoost = cadence.urgencyBoost || 0;
    let priorityScore = Math.round(
      (urgency * 0.25) +
      (importance * 0.20) +
      (cadenceBoost * 0.25) +
      (deadlineRisk * 0.15) +
      (neglectFactor * 0.15)
    );
    // If completed for this cadence cycle, gently demote in queue
    if (cadence.isCompleted) {
      priorityScore = Math.max(5, priorityScore - 40);
    }
    priorityScore = Math.min(100, Math.max(0, priorityScore));
    
    // F. Progress Percentage
    const totalSub = proj.subtasks ? proj.subtasks.length : 0;
    const completedSub = proj.subtasks ? proj.subtasks.filter(s => s.completed).length : 0;
    const subtaskProgress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
    
    let progress = 0;
    if (proj.isDailyAllocation) {
      const stats = getDailyAllocationStats(proj, state);
      progress = stats.percent;
    } else if (totalSub > 0) {
      progress = subtaskProgress;
    } else if (cadence.isCompleted) {
      progress = 100;
    } else {
      progress = 0;
    }
    
    return {
      ...proj,
      cadence,
      daysRemaining,
      deadlineRisk,
      neglectDays,
      requiredDailyHours,
      paceStatus,
      paceClass,
      priorityScore,
      progress
    };
  });
  
  // Sort projects by priority score descending
  processedProjects.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // 2. Determine "⚡ What To Do Next" recommended action
  let recommendedTask = null;
  let recommendedProject = null;
  let recommendationReason = '';
  
  for (const proj of processedProjects) {
    if (proj.status === 'Completed' || proj.status === 'Paused') continue;
    if (proj.cadence && proj.cadence.isCompleted) continue; // Already completed in current period

    const sessionDuration = proj.durationPerSessionMinutes || proj.dailyAllocationMinutes || 60;

    if (proj.subtasks && proj.subtasks.some(s => !s.completed)) {
      const nextTask = proj.subtasks.find(s => !s.completed);
      recommendedTask = nextTask;
      recommendedProject = proj;
      if (proj.cadence && proj.cadence.isDue) {
        recommendationReason = `Due today • ${proj.cadence.label} cadence`;
      } else if (proj.deadline && proj.daysRemaining <= 3) {
        recommendationReason = `Urgent milestone due in ${proj.daysRemaining} day${proj.daysRemaining === 1 ? '' : 's'}`;
      } else {
        recommendationReason = `Top priority queue item (${proj.priorityScore} priority)`;
      }
      break;
    } else {
      // Focus session block for daily, periodic, or flexible project without subtasks
      recommendedTask = {
        id: 'session-' + proj.id,
        name: `${proj.name}: Focus Session`,
        estimatedMinutes: sessionDuration,
        completed: false
      };
      recommendedProject = proj;
      if (proj.cadence && proj.cadence.isDue) {
        recommendationReason = `Due today • ${proj.cadence.label} commitment`;
      } else {
        recommendationReason = `High priority project focus session`;
      }
      break;
    }
  }

  // 3. Daily Available Time vs Doables Calculator
  const capacity = state.calculateDailyTimeCapacity(activeDate);
  const totalMinutes = capacity.totalCapacityMinutes || (16 * 60);
  const doablesPct = Math.min(100, Math.round((capacity.doablesMinutes / totalMinutes) * 100));
  const scheduledPct = Math.min(100 - doablesPct, Math.round((capacity.scheduledMinutes / totalMinutes) * 100));
  const freePct = Math.max(0, 100 - doablesPct - scheduledPct);

  // Build smart list of tasks that fit inside remaining free time
  const remainingFreeMins = Math.max(0, capacity.remainingFreeMinutes);
  let allocatedMinutes = 0;
  const recommendedTodayList = [];
  
  for (const proj of processedProjects) {
    if (proj.status === 'Completed' || proj.status === 'Paused') continue;
    if (proj.cadence && proj.cadence.isCompleted) continue;

    const uncompleted = proj.subtasks ? proj.subtasks.filter(s => !s.completed) : [];
    if (uncompleted.length > 0) {
      for (const task of uncompleted) {
        const est = task.estimatedMinutes || 30;
        if (allocatedMinutes + est <= remainingFreeMins) {
          allocatedMinutes += est;
          recommendedTodayList.push({
            project: proj,
            task: task,
            estimate: est
          });
        }
      }
    } else {
      const sessionMins = proj.durationPerSessionMinutes || proj.dailyAllocationMinutes || 60;
      if (allocatedMinutes + sessionMins <= remainingFreeMins) {
        allocatedMinutes += sessionMins;
        recommendedTodayList.push({
          project: proj,
          task: {
            id: 'session-' + proj.id,
            name: `${proj.name}: Focus Session`,
            estimatedMinutes: sessionMins,
            completed: false
          },
          estimate: sessionMins
        });
      }
    }
  }

  // Render Page Layout
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">
      
      <!-- ⚡ Top Hero: What To Do Next & Priority Engine -->
      <div class="hero-next-action-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div style="display:flex; flex-direction:column; gap:6px; max-width:680px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:var(--accent); display:flex; align-items:center; gap:4px;">
                ⚡ WHAT TO DO NEXT • PRIORITY ENGINE
              </span>
              ${recommendedProject ? `
                <span class="cadence-badge ${recommendedProject.cadence.badgeClass}">${recommendedProject.cadence.label}</span>
                <span class="cadence-status-pill ${recommendedProject.cadence.isDue ? 'due-today' : 'on-track'}">${recommendedProject.cadence.statusText}</span>
              ` : ''}
            </div>
            ${recommendedTask ? `
              <h2 style="font-size:20px; font-weight:900; color:var(--text-primary); margin:0; line-height:1.3;">
                ${recommendedTask.name}
              </h2>
              <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-secondary); flex-wrap:wrap;">
                <span>Project: <strong style="color:var(--text-primary);">${recommendedProject.name}</strong></span>
                <span>•</span>
                <span style="color:var(--accent); font-weight:700; font-family:var(--font-mono);">Priority Score: ${recommendedProject.priorityScore}/100</span>
                <span>•</span>
                <span style="font-family:var(--font-mono); background:var(--bg-secondary); padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; color:var(--text-primary);">⏱ ~${recommendedTask.estimatedMinutes || 45} mins</span>
                <span>•</span>
                <span style="font-style:italic; font-size:12px; color:var(--text-secondary);">${recommendationReason}</span>
              </div>
            ` : `
              <h2 style="font-size:18px; font-weight:800; color:var(--text-primary); margin:0;">
                🎉 All Priority Commitments Completed For Today!
              </h2>
              <p style="font-size:13px; color:var(--text-secondary); margin:0;">
                All daily routines, due cadences, and urgent milestones are on track. Add a new task below or enjoy your free time!
              </p>
            `}
          </div>
          ${recommendedTask ? `
            <div style="display:flex; gap:10px; align-items:center;">
              <button class="btn btn-primary" id="hero-schedule-next-btn" data-proj-id="${recommendedProject.id}" data-task-name="${recommendedTask.name}" data-task-est="${recommendedTask.estimatedMinutes || 45}" data-proj-type="${recommendedProject.type || 'general'}" style="height:42px; padding:0 22px; font-size:13px; font-weight:800; box-shadow:0 4px 14px rgba(99, 102, 241, 0.4); display:flex; align-items:center; gap:8px;">
                <span>⚡</span> Schedule Right Now
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px; align-items: start;" class="projects-grid">
        
        <!-- Left Column: Priority Trackers -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Daily Available Time vs Doables Calculator Card -->
          <div class="card">
            <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span>⚖️ Daily Time Capacity vs Doables</span>
                <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">(${activeDate})</span>
              </div>
              <span style="font-size:11px; font-weight:700; color:var(--accent); font-family:var(--font-mono);">
                ${capacity.freeSlotsCount} free slot${capacity.freeSlotsCount === 1 ? '' : 's'} (${capacity.remainingFreeHours}h free)
              </span>
            </div>

            <!-- Visual Segmented Capacity Progress Bar -->
            <div style="margin: 12px 0 8px 0;">
              <div class="capacity-progress-bar">
                <div class="capacity-seg-doables" style="width: ${doablesPct}%;" title="Committed Doables: ${capacity.doablesHours}h (${doablesPct}%)"></div>
                <div class="capacity-seg-scheduled" style="width: ${scheduledPct}%;" title="Scheduled in Calendar: ${capacity.scheduledHours}h (${scheduledPct}%)"></div>
                <div class="capacity-seg-free" style="width: ${freePct}%;" title="Remaining Free Time: ${capacity.remainingFreeHours}h (${freePct}%)"></div>
              </div>
              <!-- Legend & Breakdown -->
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:8px; font-size:11px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="width:10px; height:10px; border-radius:3px; background:#6366f1; display:inline-block;"></span>
                  <span><strong>Doables:</strong> ${capacity.doablesHours}h (${capacity.doablesMinutes}m)</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="width:10px; height:10px; border-radius:3px; background:#3b82f6; display:inline-block;"></span>
                  <span><strong>Scheduled:</strong> ${capacity.scheduledHours}h (${capacity.scheduledCount} task${capacity.scheduledCount === 1 ? '' : 's'})</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="width:10px; height:10px; border-radius:3px; background:#10b981; display:inline-block;"></span>
                  <span><strong>Free Time Left:</strong> <strong style="color:var(--success); font-family:var(--font-mono);">${capacity.remainingFreeHours}h</strong></span>
                </div>
              </div>
            </div>

            <hr style="border:0; border-top:1px solid var(--border-color); margin:14px 0 12px 0;">

            <!-- Priority Queue Fitting inside Free Time -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">
                  🎯 Recommended Tasks To Fill Remaining Free Time (${allocatedMinutes}m / ${remainingFreeMins}m)
                </span>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;" id="focus-plan-list-area">
                ${recommendedTodayList.length === 0 ? `
                  <div class="cell-empty" style="text-align:center; padding:16px 0; color:var(--text-muted); font-size:12px;">
                    ${remainingFreeMins <= 0 ? 'Your schedule is full for today! No free slots remaining.' : 'All pending tasks completed or scheduled! 🎉'}
                  </div>
                ` : recommendedTodayList.map(item => `
                  <div style="display:flex; align-items:center; justify-content:space-between; background-color:var(--bg-tertiary); padding:8px 12px; border:1px solid var(--border-color); border-radius:var(--radius-sm); gap:12px;">
                    <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary);">${item.task.name}</span>
                        <span class="cadence-badge ${item.project.cadence.badgeClass}" style="font-size:9px; padding:1px 6px;">${item.project.cadence.label}</span>
                      </div>
                      <span style="font-size:11px; color:var(--text-muted);">${item.project.name} • <span style="color:var(--accent); font-weight:600;">${item.project.priorityScore} Priority</span></span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                      <span style="font-size:11px; font-family:var(--font-mono); font-weight:700; color:var(--accent); background:var(--bg-secondary); padding:2px 8px; border-radius:4px; white-space:nowrap;">
                        ~${item.estimate} min
                      </span>
                      <button class="btn btn-primary btn-sm quick-schedule-task-btn" data-proj-id="${item.project.id}" data-task-name="${item.task.name}" data-task-est="${item.estimate}" data-proj-type="${item.project.type || 'general'}" style="height:26px; padding:0 8px; font-size:11px; font-weight:700;">
                        ⚡ Schedule
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Project Queue & Health Table -->
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div class="card-title" style="margin-bottom:0;">📊 Project Queue & Health</div>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <select id="proj-category-filter-select" class="premium-select" style="height:28px; font-size:12px; padding:2px 8px;">
                  <option value="all">All Categories</option>
                  <option value="study">Study</option>
                  <option value="etsy_seo">Etsy + SEO</option>
                  <option value="quran">Quran Hifz</option>
                  <option value="flexible">General / Flexible</option>
                  ${(state.customSections || []).filter(s => s.type !== 'quran').map(s => `
                    <option value="${s.type}">${s.label}</option>
                  `).join('')}
                </select>
                <button class="btn btn-danger btn-sm" id="clear-cat-tasks-btn" style="height:28px; font-size:11px; padding:0 10px;" title="Remove all tasks from projects in selected category">
                  🗑 Clear All Tasks in Category
                </button>
              </div>
            </div>
            
            <!-- Desktop Table View -->
            <div class="desktop-only-table-wrapper" style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; min-width:650px;" class="spreadsheet-table">
                <thead>
                  <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:10px; font-size:12px; font-weight:700;">Project</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Cadence</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Priority</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Progress</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Deadline</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Status</th>
                    <th style="padding:10px; font-size:12px; font-weight:700; text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${processedProjects.length === 0 ? `
                    <tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No projects created yet. Use form below to add your first project!</td></tr>
                  ` : processedProjects.map(proj => {
                    const priorityClass = proj.priority === 'critical' ? 'badge-danger' : proj.priority === 'high' ? 'badge-warning' : 'badge-info';
                    const cadencePillClass = proj.cadence.isDue ? 'due-today' : proj.cadence.isCompleted ? 'done-today' : 'on-track';
                    return `
                      <tr style="border-bottom:1px solid var(--border-color);" data-proj-row-id="${proj.id}" data-proj-type="${proj.type || 'flexible'}">
                        <td style="padding:12px 10px;">
                          <div style="display:flex; flex-direction:column; min-width:0;">
                            <span style="font-weight:700; font-size:14px;">${proj.name}</span>
                            <span style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${proj.goal || 'No goal set'}</span>
                          </div>
                        </td>
                        <td style="padding:12px 10px;">
                          <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                            <span class="cadence-badge ${proj.cadence.badgeClass}">${proj.cadence.label}</span>
                            <span class="cadence-status-pill ${cadencePillClass}">${proj.cadence.statusText}</span>
                          </div>
                        </td>
                        <td style="padding:12px 10px;">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-family:var(--font-mono); font-weight:700; font-size:14px; color:var(--accent);">${proj.priorityScore}</span>
                            <span class="badge ${priorityClass}" style="font-size:9px; text-transform:uppercase;">${proj.priority}</span>
                          </div>
                        </td>
                        <td style="padding:12px 10px; width:130px;">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; height:6px; background-color:var(--bg-tertiary); border-radius:3px; overflow:hidden;">
                              <div style="width:${proj.progress}%; height:100%; background:var(--accent-gradient);"></div>
                            </div>
                            <span style="font-size:11px; font-family:var(--font-mono); font-weight:700;">${proj.progress}%</span>
                          </div>
                        </td>
                        <td style="padding:12px 10px; font-size:12px;">
                          ${proj.deadline ? `
                            <span style="font-weight:600;">${proj.deadline}</span><br>
                            <span style="font-size:10px; color:var(--text-muted);">${proj.daysRemaining}d left</span>
                          ` : '<span style="color:var(--text-muted);">None</span>'}
                        </td>
                        <td style="padding:12px 10px;">
                          <span class="badge ${proj.paceClass}" style="font-size:10px;">${proj.paceStatus}</span>
                        </td>
                        <td style="padding:12px 10px; text-align:right;">
                          <div style="display:flex; justify-content:flex-end; gap:6px;">
                            <button class="btn btn-secondary btn-sm toggle-proj-details-btn" data-id="${proj.id}" style="padding:4px; width:28px; height:28px; justify-content:center;" title="View Tasks">
                              ${icons.chevronDown}
                            </button>
                            <button class="btn btn-secondary btn-sm edit-proj-btn" data-id="${proj.id}" style="padding:4px; width:28px; height:28px; justify-content:center;" title="Edit Project">
                              ${icons.edit}
                            </button>
                            <button class="btn btn-danger btn-sm delete-proj-btn" data-id="${proj.id}" style="padding:4px; width:28px; height:28px; justify-content:center;" title="Delete Project">
                              ${icons.trash}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      <!-- Collapsible subtasks panel -->
                      <tr id="proj-details-pane-${proj.id}" style="display:none; background-color:rgba(255,255,255,0.01);">
                        <td colspan="7" style="padding:16px; border-bottom:1px solid var(--border-color);">
                          ${getProjectDetailsContentHTML(proj, state)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="mobile-only-project-list" style="display:none; flex-direction:column; gap:16px;">
              ${processedProjects.length === 0 ? `
                <div class="cell-empty" style="text-align:center; padding:20px; color:var(--text-muted);">No projects created yet. Use form below!</div>
              ` : processedProjects.map(proj => {
                const priorityClass = proj.priority === 'critical' ? 'badge-danger' : proj.priority === 'high' ? 'badge-warning' : 'badge-info';
                const cadencePillClass = proj.cadence.isDue ? 'due-today' : proj.cadence.isCompleted ? 'done-today' : 'on-track';
                return `
                  <div class="project-mobile-card" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; gap:12px;" data-proj-row-id="${proj.id}" data-proj-type="${proj.type || 'flexible'}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                      <div style="min-width:0; flex:1;">
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
                          <span style="font-weight:800; font-size:15px; color:var(--text-primary);">${proj.name}</span>
                          <span class="cadence-badge ${proj.cadence.badgeClass}">${proj.cadence.label}</span>
                        </div>
                        <span style="font-size:11px; color:var(--text-secondary); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${proj.goal || 'No goal set'}</span>
                      </div>
                      <span class="cadence-status-pill ${cadencePillClass}">${proj.cadence.statusText}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; font-size:12px; border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); padding:8px 0;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-weight:700; color:var(--text-secondary);">Score:</span>
                        <span style="font-family:var(--font-mono); font-weight:800; color:var(--accent);">${proj.priorityScore}</span>
                        <span class="badge ${priorityClass}" style="font-size:9px; text-transform:uppercase;">${proj.priority}</span>
                      </div>
                      <div>
                        ${proj.deadline ? `
                          <span style="font-weight:600; color:var(--text-primary);">${proj.deadline}</span>
                          <span style="font-size:10px; color:var(--text-secondary);">(${proj.daysRemaining}d left)</span>
                        ` : '<span style="color:var(--text-muted);">No deadline</span>'}
                      </div>
                      <span class="badge ${proj.paceClass}" style="font-size:10px;">${proj.paceStatus}</span>
                    </div>

                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:4px; font-weight:700;">
                        <span>Progress</span>
                        <span style="font-family:var(--font-mono);">${proj.progress}%</span>
                      </div>
                      <div style="width:100%; height:6px; background-color:var(--bg-tertiary); border-radius:3px; overflow:hidden;">
                        <div style="width:${proj.progress}%; height:100%; background:var(--accent-gradient);"></div>
                      </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
                      <button class="btn btn-secondary btn-sm toggle-proj-details-btn" data-id="${proj.id}" style="padding:6px 12px; font-size:11px; display:flex; align-items:center; gap:4px; height:28px;">
                        Tasks
                        <span class="chevron-indicator" style="display:inline-block; transition:transform 0.2s;">▼</span>
                      </button>
                      <button class="btn btn-secondary btn-sm edit-proj-btn" data-id="${proj.id}" style="padding:6px; width:28px; height:28px; justify-content:center; display:flex; align-items:center;" title="Edit Project">
                        ${icons.edit}
                      </button>
                      <button class="btn btn-danger btn-sm delete-proj-btn" data-id="${proj.id}" style="padding:6px; width:28px; height:28px; justify-content:center; display:flex; align-items:center;" title="Delete Project">
                        ${icons.trash}
                      </button>
                    </div>

                    <!-- Collapsible subtasks list for mobile -->
                    <div id="proj-details-pane-mobile-${proj.id}" style="display:none; border-top:1px dashed var(--border-color); padding-top:12px; margin-top:8px;">
                      ${getProjectDetailsContentHTML(proj, state)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

          </div>

          <!-- Add Project Form -->
          <div class="card">
            <div class="card-title">➕ Add New Project / Cadence Goal</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:12px;" class="project-form-grid">
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Project Name</label>
                  <input type="text" id="new-proj-name" class="premium-input" placeholder="E.g. Daily Quran Revision, Etsy Audit" style="height:32px; padding:4px 8px;">
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Manual Priority</label>
                  <select id="new-proj-priority" class="premium-select" style="height:32px; padding:4px 8px;">
                    <option value="low">Low Priority</option>
                    <option value="medium" selected>Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Category / Section</label>
                  <select id="new-proj-type" class="premium-select" style="height:32px; padding:4px 8px;">
                    <option value="flexible">Flexible / General</option>
                    <option value="study">Study Planner</option>
                    <option value="etsy_seo">Etsy + SEO</option>
                    <option value="quran">Quran Hifz</option>
                    ${state.customSections.map(sec => `
                      <option value="${sec.type}">${sec.label}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Cadence / Recurrence & Session Duration Controls -->
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; background:var(--bg-tertiary); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);" class="project-form-grid">
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                    <span>🔁 Cadence / Recurrence</span>
                    <span style="font-size:10px; color:var(--accent); font-weight:600;">(Key Feature)</span>
                  </label>
                  <select id="new-proj-cadence" class="premium-select" style="height:32px; padding:4px 8px;">
                    <option value="flexible" selected>Flexible / Milestone (As needed)</option>
                    <option value="daily">Daily (Must do every single day)</option>
                    <option value="every_2_days">Every 2 Days (Alternate days)</option>
                    <option value="every_3_days">Every 3 Days (Twice a week)</option>
                    <option value="weekly">Weekly (Once a week)</option>
                  </select>
                  <span style="font-size:10px; color:var(--text-muted);" id="cadence-helper-text">Milestone roadmap based on deadline and tasks.</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-primary);">⏱ Session Timing & Duration</label>
                  <select id="new-proj-session-duration" class="premium-select" style="height:32px; padding:4px 8px;">
                    <option value="60" selected>60 minutes (1 hour)</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="90">90 minutes (1.5 hours)</option>
                    <option value="120">120 minutes (2 hours)</option>
                    <option value="custom">✏️ Custom Timing (enter mins)...</option>
                    <option value="available">⚡ Available Time ("As much as I can when free")</option>
                  </select>
                  <div id="new-proj-custom-duration-wrapper" style="display:none; align-items:center; gap:6px; margin-top:2px;">
                    <input type="number" id="new-proj-custom-minutes" class="premium-input" placeholder="Custom mins (e.g. 75)" min="5" max="720" style="height:28px; width:150px; font-size:12px; padding:2px 8px;">
                    <span style="font-size:11px; color:var(--text-muted); font-weight:600;">mins per session</span>
                  </div>
                  <span style="font-size:10px; color:var(--text-muted);" id="new-proj-timing-helper">Fixed: Adds 60m to your daily doable capacity.</span>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;" class="project-form-grid">
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Deadline Date (Optional)</label>
                  <input type="date" id="new-proj-deadline" class="premium-input" style="height:32px; padding:4px 8px;">
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Est. Total Hours Left</label>
                  <input type="number" id="new-proj-hours" class="premium-input" placeholder="E.g. 20" style="height:32px; padding:4px 8px;">
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Available Hours/Day</label>
                  <input type="number" id="new-proj-avail" class="premium-input" placeholder="E.g. 2" style="height:32px; padding:4px 8px;">
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Ultimate Goal / Description</label>
                <input type="text" id="new-proj-goal" class="premium-input" placeholder="What does success look like for this project?" style="height:32px; padding:4px 8px;">
              </div>

              <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Next Milestone</label>
                <input type="text" id="new-proj-nextgoal" class="premium-input" placeholder="E.g. Memorize Surah Al-Mulk / Launch 5 products" style="height:32px; padding:4px 8px;">
              </div>

              <div style="display:flex; flex-direction:column; gap:4px;" id="new-proj-subtasks-wrapper">
                <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Initial Tasks list (comma separated, optional)</label>
                <input type="text" id="new-proj-subtasks" class="premium-input" placeholder="Task 1, Task 2, Task 3..." style="height:32px; padding:4px 8px;">
              </div>

              <button class="btn btn-primary" id="save-new-proj-btn" style="height:36px; font-weight:700; justify-content:center; margin-top:8px;">
                Create Project
              </button>
            </div>
          </div>

        </div>

        <!-- Right Column: Interactive AI Chat Planner -->
        <div class="card" style="display:flex; flex-direction:column; height: 600px; padding:0; overflow:hidden;">
          <div style="padding:16px 20px; border-bottom:1px solid var(--border-color); background-color:var(--bg-tertiary);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px; font-weight:800;">🧠 Aether AI Chat Planner</span>
              <span style="width:8px; height:8px; border-radius:50%; background-color:${state.geminiApiKey ? 'var(--success)' : 'var(--danger-border)'};" title="${state.geminiApiKey ? 'Gemini API Key Connected' : 'API Key Missing'}"></span>
            </div>
            <span style="font-size:11px; color:var(--text-secondary);">Your productivity companion. Ask questions or plan tasks.</span>
          </div>

          <!-- Chat messages area -->
          <div id="chat-messages-log" style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
            <div class="ai-chat-bubble" style="background-color:var(--bg-tertiary); border:1px solid var(--border-color); padding:12px; border-radius:12px; align-self:flex-start; max-width:85%; font-size:13px; line-height:1.5; color:var(--text-primary);">
              Hi, I'm AETHER AI! I can help you plan your day. 
              <br><br>
              I see your projects and schedules. Ask me to structure tasks for you, check deadlines, or suggest slots! Let's get started.
            </div>
            
            ${state.chatHistory.map(msg => `
              <div class="${msg.role}-chat-bubble" style="background-color:${msg.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)'}; border:${msg.role === 'user' ? 'none' : '1px solid var(--border-color)'}; padding:12px; border-radius:12px; align-self:${msg.role === 'user' ? 'flex-end' : 'flex-start'}; max-width:85%; font-size:13px; line-height:1.5; color:${msg.role === 'user' ? 'white' : 'var(--text-primary)'}; white-space:pre-wrap;">
                ${msg.text}
              </div>
            `).join('')}
          </div>

          <!-- Chat Input Area -->
          <div style="padding:12px 16px; border-top:1px solid var(--border-color); background-color:var(--bg-tertiary); display:flex; gap:8px; align-items:center;">
            <input type="text" id="ai-chat-input" class="premium-input" placeholder="${state.geminiApiKey ? 'Ask Aether AI...' : 'Enter Gemini API key first...'}" style="flex:1; height:36px; padding:4px 10px; font-size:13px;" ${state.geminiApiKey ? '' : 'disabled'}>
            <button class="btn btn-primary" id="ai-chat-send-btn" style="height:36px; padding:0 14px;" ${state.geminiApiKey ? '' : 'disabled'}>Send</button>
          </div>
        </div>

      </div>

    </div>
  `;

  // Bind All Event Handlers
  bindProjectsEvents(container, state, processedProjects);
}

function bindProjectsEvents(container, state, processedProjects) {
  // 1-Tap Scheduling Helper into the first free slot on today's calendar
  const scheduleTaskInFirstFreeSlot = async (proj, taskName, estimatedMinutes, type) => {
    const activeDate = state.getActiveDate();
    const day = state.days.find(d => d.date === activeDate);
    if (!day) return;

    const firstFreeSlot = state.timeIntervals.find(slot => !day.schedule.some(t => t.plannedTime === slot));
    if (!firstFreeSlot) {
      alert("No free time slots available on your schedule for today! Please free up or reschedule a slot in Daily Planner.");
      return;
    }

    const formattedTaskName = taskName.includes(proj.name) ? taskName : `${proj.name}: ${taskName}`;
    const newTask = {
      id: 't-' + Date.now() + Math.random().toString(36).substring(7),
      name: formattedTaskName,
      plannedTime: firstFreeSlot,
      status: 'pending',
      missedReason: '',
      actualTime: '',
      type: type || proj.type || 'general'
    };

    day.schedule.push(newTask);
    day.schedule.sort((a, b) => {
      const idxA = state.timeIntervals.indexOf(a.plannedTime);
      const idxB = state.timeIntervals.indexOf(b.plannedTime);
      return idxA - idxB;
    });

    await state.updateDay(day.date, { schedule: day.schedule });
    await state.updateProject(proj.id, { lastWorkedOn: Date.now() });

    confetti({ particleCount: 50, spread: 45 });
    showToast(`⚡ Scheduled "${formattedTaskName}" for ${firstFreeSlot} today!`);
    renderProjects(container, state);
  };

  // Hero Schedule Next Action Button
  const heroScheduleBtn = container.querySelector('#hero-schedule-next-btn');
  if (heroScheduleBtn) {
    heroScheduleBtn.addEventListener('click', async () => {
      const projId = Number(heroScheduleBtn.getAttribute('data-proj-id'));
      const taskName = heroScheduleBtn.getAttribute('data-task-name');
      const est = Number(heroScheduleBtn.getAttribute('data-task-est')) || 45;
      const type = heroScheduleBtn.getAttribute('data-proj-type') || 'general';
      const proj = state.projects.find(p => p.id === projId);
      if (proj) {
        await scheduleTaskInFirstFreeSlot(proj, taskName, est, type);
      }
    });
  }

  // Quick Schedule buttons in Time Capacity Planner
  container.querySelectorAll('.quick-schedule-task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-proj-id'));
      const taskName = btn.getAttribute('data-task-name');
      const est = Number(btn.getAttribute('data-task-est')) || 45;
      const type = btn.getAttribute('data-proj-type') || 'general';
      const proj = state.projects.find(p => p.id === projId);
      if (proj) {
        await scheduleTaskInFirstFreeSlot(proj, taskName, est, type);
      }
    });
  });

  // Cadence selection helper text in New Project form
  const cadenceSelect = container.querySelector('#new-proj-cadence');
  const cadenceHelperText = container.querySelector('#cadence-helper-text');
  if (cadenceSelect && cadenceHelperText) {
    const helperMap = {
      flexible: 'Milestone roadmap based on deadline and tasks.',
      daily: 'Commitment required every day. Calculated in your daily doable capacity.',
      every_2_days: 'Alternate days cadence. Urgency automatically peaks if 2+ days have passed.',
      every_3_days: 'Twice-a-week cadence. Urgency automatically peaks if 3+ days have passed.',
      weekly: 'Targeted weekly cadence. Urgency automatically peaks towards the end of the week.'
    };
    cadenceSelect.addEventListener('change', () => {
      cadenceHelperText.textContent = helperMap[cadenceSelect.value] || '';
    });
  }

  // Session duration / timing mode change in New Project form
  const durationSelect = container.querySelector('#new-proj-session-duration');
  const customDurationWrapper = container.querySelector('#new-proj-custom-duration-wrapper');
  const customDurationInput = container.querySelector('#new-proj-custom-minutes');
  const timingHelper = container.querySelector('#new-proj-timing-helper');

  if (durationSelect) {
    durationSelect.addEventListener('change', () => {
      const val = durationSelect.value;
      if (val === 'custom') {
        if (customDurationWrapper) customDurationWrapper.style.display = 'flex';
        if (timingHelper) timingHelper.textContent = 'Fixed: Enter custom minutes added to daily doable capacity.';
      } else if (val === 'available') {
        if (customDurationWrapper) customDurationWrapper.style.display = 'none';
        if (timingHelper) timingHelper.textContent = 'Flexible buffer: Spend available free time whenever you are free (not counted in mandatory fixed doables).';
      } else {
        if (customDurationWrapper) customDurationWrapper.style.display = 'none';
        if (timingHelper) timingHelper.textContent = `Fixed: Adds ${val}m to your daily doable capacity.`;
      }
    });
  }

  // D. Collapsible project details row triggers
  container.querySelectorAll('.toggle-proj-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const pane = container.querySelector(`#proj-details-pane-${id}`);
      const paneMobile = container.querySelector(`#proj-details-pane-mobile-${id}`);
      
      if (pane) {
        const isCollapsed = pane.style.display === 'none';
        pane.style.display = isCollapsed ? 'table-row' : 'none';
        btn.innerHTML = isCollapsed ? icons.chevronDown : icons.chevronRight; // flip arrow
      }
      if (paneMobile) {
        const isCollapsed = paneMobile.style.display === 'none';
        paneMobile.style.display = isCollapsed ? 'block' : 'none';
        const indicator = btn.querySelector('.chevron-indicator');
        if (indicator) {
          indicator.style.transform = isCollapsed ? 'rotate(180deg)' : '';
        }
      }
    });
  });

  // E. Project subtask checkbox change
  container.querySelectorAll('.subtask-checkbox').forEach(check => {
    check.addEventListener('change', async () => {
      const projId = Number(check.getAttribute('data-proj-id'));
      const idx = parseInt(check.getAttribute('data-idx'));
      
      const project = state.projects.find(p => p.id === projId);
      if (project && project.subtasks && project.subtasks[idx]) {
        project.subtasks[idx].completed = check.checked;
        project.lastWorkedOn = Date.now();
        await state.updateProject(projId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
        renderProjects(container, state);
      }
    });
  });

  // Edit Subtask Name & Estimate
  container.querySelectorAll('.edit-subtask-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = Number(btn.getAttribute('data-proj-id'));
      const idx = parseInt(btn.getAttribute('data-idx'));
      const project = state.projects.find(p => p.id === projId);
      if (project && project.subtasks && project.subtasks[idx]) {
        const current = project.subtasks[idx];
        const newName = prompt("Edit task name:", current.name);
        if (newName === null) return;
        const trimmed = newName.trim();
        if (!trimmed) {
          alert("Task name cannot be empty!");
          return;
        }
        const newEstStr = prompt("Estimated minutes:", current.estimatedMinutes || 30);
        const newEst = parseInt(newEstStr) || current.estimatedMinutes || 30;
        project.subtasks[idx].name = trimmed;
        project.subtasks[idx].estimatedMinutes = newEst;
        project.lastWorkedOn = Date.now();
        await state.updateProject(projId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
        showToast("Task updated");
        renderProjects(container, state);
      }
    });
  });

  // Delete Subtask
  container.querySelectorAll('.delete-subtask-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = Number(btn.getAttribute('data-proj-id'));
      const idx = parseInt(btn.getAttribute('data-idx'));
      const project = state.projects.find(p => p.id === projId);
      if (project && project.subtasks && project.subtasks[idx]) {
        if (confirm(`Delete task "${project.subtasks[idx].name}"?`)) {
          project.subtasks.splice(idx, 1);
          project.lastWorkedOn = Date.now();
          await state.updateProject(projId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
          showToast("Task deleted");
          renderProjects(container, state);
        }
      }
    });
  });

  // Clear All Tasks from Project
  container.querySelectorAll('.clear-proj-tasks-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const projId = Number(btn.getAttribute('data-proj-id'));
      const project = state.projects.find(p => p.id === projId);
      if (project) {
        if (confirm(`Remove all tasks from "${project.name}"?`)) {
          await state.clearProjectTasks(projId);
          showToast(`All tasks removed from "${project.name}"`);
          renderProjects(container, state);
        }
      }
    });
  });

  // F. Add Subtask to Project (Properly scoped for both mobile cards and desktop table)
  container.querySelectorAll('.add-subtask-btn').forEach(btn => {
    const parentContainer = btn.closest('.mobile-project-card, .project-accordion-row') || container;
    const projId = Number(btn.getAttribute('data-proj-id'));
    const nameInput = parentContainer.querySelector(`.new-subtask-name[data-proj-id="${projId}"]`);
    const estInput = parentContainer.querySelector(`.new-subtask-est[data-proj-id="${projId}"]`);
    
    const handleAddSubtask = async () => {
      if (!nameInput) return;
      const nameVal = nameInput.value.trim();
      const estVal = parseInt(estInput ? estInput.value.trim() : '30') || 30;
      
      if (nameVal) {
        const project = state.projects.find(p => p.id === projId);
        if (project) {
          const subtasks = project.subtasks || [];
          subtasks.push({
            id: 'sub-' + Date.now() + Math.random().toString(36).substring(7),
            name: nameVal,
            estimatedMinutes: estVal,
            completed: false
          });
          project.lastWorkedOn = Date.now();
          await state.updateProject(projId, { subtasks, lastWorkedOn: project.lastWorkedOn });
          renderProjects(container, state);
        }
      } else {
        alert("Please enter a task name first!");
      }
    };

    btn.addEventListener('click', handleAddSubtask);
    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddSubtask();
      });
    }
  });

  // Quick Schedule Daily Allocation Block Today
  container.querySelectorAll('.quick-schedule-alloc-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-proj-id'));
      const project = state.projects.find(p => p.id === projId);
      if (!project) return;

      const activeDate = state.getActiveDate();
      const day = state.days.find(d => d.date === activeDate);
      if (!day) return;

      // Find the first free time slot in day
      const firstFreeSlot = state.timeIntervals.find(slot => {
        return !day.schedule.some(item => item.plannedTime === slot);
      });
      
      if (!firstFreeSlot) {
        alert("No free time slots available on your schedule for today! Free up a slot in the Daily Planner first.");
        return;
      }

      // Add general work block task to day schedule
      const newTask = {
        id: 't-' + Date.now(),
        name: `${project.name}: General Work`,
        plannedTime: firstFreeSlot,
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: project.type === 'flexible' ? 'general' : project.type
      };
      
      day.schedule.push(newTask);
      day.schedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });
      
      await state.updateDay(day.date, { schedule: day.schedule });
      project.lastWorkedOn = Date.now();
      await state.updateProject(projId, { lastWorkedOn: project.lastWorkedOn });

      confetti({ particleCount: 50, spread: 35 });
      alert(`Scheduled 1 hr block for "${project.name}" at ${firstFreeSlot} today!`);
      renderProjects(container, state);
    });
  });

  // G. Edit Project Details Save Button (Scoped for mobile & desktop)
  container.querySelectorAll('.save-proj-details-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const parentContainer = btn.closest('.mobile-project-card, .project-accordion-row') || container;
      const projId = Number(btn.getAttribute('data-id'));
      const project = state.projects.find(p => p.id === projId);
      if (!project) return;

      const availInput = parentContainer.querySelector(`.edit-proj-available[data-proj-id="${projId}"]`);
      const nextInput = parentContainer.querySelector(`.edit-proj-nextgoal[data-proj-id="${projId}"]`);
      
      const avail = availInput ? (Number(availInput.value) || 0) : project.availableHoursPerDay;
      const nextGoal = nextInput ? nextInput.value.trim() : project.nextGoal;

      const updates = {
        availableHoursPerDay: avail,
        nextGoal: nextGoal
      };

      if (project.isDailyAllocation) {
        const dailyMinutesInput = parentContainer.querySelector(`.edit-proj-daily-minutes[data-proj-id="${projId}"]`);
        updates.dailyAllocationMinutes = dailyMinutesInput ? (Number(dailyMinutesInput.value) || 60) : project.dailyAllocationMinutes;
      } else {
        const effortInput = parentContainer.querySelector(`.edit-proj-effort[data-proj-id="${projId}"]`);
        updates.estimatedHours = effortInput ? (Number(effortInput.value) || 0) : project.estimatedHours;
      }
      
      await state.updateProject(projId, updates);
      
      alert("Project details saved successfully!");
      renderProjects(container, state);
    });
  });

  // H. Edit Project button
  container.querySelectorAll('.edit-proj-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projId = Number(btn.getAttribute('data-id'));
      showEditProjectModal(projId, state, container);
    });
  });

  // H2. Delete Project button
  container.querySelectorAll('.delete-proj-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const project = state.projects.find(p => p.id === Number(id));
      const projName = project ? `"${project.name}"` : 'this project';
      if (confirm(`Are you sure you want to permanently delete ${projName}? This will not return.`)) {
        await state.deleteProject(id);
        showToast("Project deleted successfully");
        renderProjects(container, state);
      }
    });
  });

  // H3. Category Filter & Clear Tasks in Category
  const catFilterSelect = container.querySelector('#proj-category-filter-select');
  if (catFilterSelect) {
    catFilterSelect.addEventListener('change', () => {
      const selected = catFilterSelect.value;
      const rows = container.querySelectorAll('tr[data-proj-row-id]');
      const cards = container.querySelectorAll('.project-mobile-card[data-proj-row-id]');
      
      rows.forEach(r => {
        const type = r.getAttribute('data-proj-type') || 'flexible';
        r.style.display = (selected === 'all' || type === selected) ? '' : 'none';
      });
      cards.forEach(c => {
        const type = c.getAttribute('data-proj-type') || 'flexible';
        c.style.display = (selected === 'all' || type === selected) ? 'flex' : 'none';
      });
    });
  }

  const clearCatTasksBtn = container.querySelector('#clear-cat-tasks-btn');
  if (clearCatTasksBtn) {
    clearCatTasksBtn.addEventListener('click', async () => {
      const selected = catFilterSelect ? catFilterSelect.value : 'all';
      const label = selected === 'all' ? 'All Categories' : selected;
      if (confirm(`Are you sure you want to remove all tasks from projects in ${label}? This cannot be undone.`)) {
        await state.clearCategoryTasks(selected);
        showToast(`Cleared all tasks in ${label}`);
        renderProjects(container, state);
      }
    });
  }

  // I. Save New Project Form
  const saveNewProjBtn = container.querySelector('#save-new-proj-btn');
  if (saveNewProjBtn) {
    saveNewProjBtn.addEventListener('click', async () => {
      const name = container.querySelector('#new-proj-name').value.trim();
      const priority = container.querySelector('#new-proj-priority').value;
      const type = container.querySelector('#new-proj-type').value;
      const frequency = cadenceSelect ? cadenceSelect.value : 'flexible';
      const timingVal = durationSelect ? durationSelect.value : '60';
      let durationMode = 'fixed';
      let durationPerSessionMinutes = 60;
      if (timingVal === 'available') {
        durationMode = 'available';
        durationPerSessionMinutes = 0;
      } else if (timingVal === 'custom') {
        durationMode = 'fixed';
        durationPerSessionMinutes = Number(customDurationInput ? customDurationInput.value : '60') || 60;
      } else {
        durationMode = 'fixed';
        durationPerSessionMinutes = Number(timingVal) || 60;
      }

      const deadline = container.querySelector('#new-proj-deadline').value;
      const hours = Number(container.querySelector('#new-proj-hours').value) || 0;
      const avail = Number(container.querySelector('#new-proj-avail').value) || 0;
      const goal = container.querySelector('#new-proj-goal').value.trim();
      const nextGoal = container.querySelector('#new-proj-nextgoal').value.trim();
      const subtaskStr = container.querySelector('#new-proj-subtasks').value.trim();
      
      if (!name) {
        alert("Please enter a project name!");
        return;
      }
      
      const subtasks = subtaskStr ? subtaskStr.split(',')
        .map(t => t.trim())
        .filter(t => t)
        .map(t => ({
          id: 'sub-' + Date.now() + Math.random().toString(36).substring(7),
          name: t,
          estimatedMinutes: 30,
          completed: false
        })) : [];
        
      await state.addProject({
        name,
        priority,
        type,
        frequency,
        durationMode,
        durationPerSessionMinutes,
        targetSessionsPerWeek: frequency === 'daily' ? 7 : frequency === 'weekly' ? 1 : 3,
        deadline,
        goal,
        nextGoal,
        estimatedHours: hours,
        availableHoursPerDay: avail,
        status: 'In progress',
        isDailyAllocation: frequency === 'daily' && durationMode === 'fixed',
        dailyAllocationMinutes: durationPerSessionMinutes,
        subtasks
      });
      
      confetti({ particleCount: 50, spread: 30 });
      showToast(`Project "${name}" created successfully`);
      renderProjects(container, state);
    });
  }

  // J. Interactive AI Chat Planner
  const chatInput = container.querySelector('#ai-chat-input');
  const chatSendBtn = container.querySelector('#ai-chat-send-btn');
  const chatMessagesLog = container.querySelector('#chat-messages-log');
  
  if (chatSendBtn && chatInput) {
    const handleSendMsg = async () => {
      const userText = chatInput.value.trim();
      if (!userText) return;
      
      // Clear input
      chatInput.value = '';
      
      // Append user bubble to local chat history & UI
      state.chatHistory.push({ role: 'user', text: userText });
      appendMessageToLog(chatMessagesLog, 'user', userText);
      
      // Append thinking bubble
      const thinkingEl = appendMessageToLog(chatMessagesLog, 'ai', 'Aether AI is analyzing slots and planning...');
      
      try {
        const responseText = await callGeminiAPI(userText, state);
        
        // Remove thinking bubble
        thinkingEl.remove();
        
        // Append response to state log
        state.chatHistory.push({ role: 'model', text: responseText });
        appendMessageToLog(chatMessagesLog, 'ai', responseText);
        
        // Execute JSON action scripts
        await executeJSONActions(responseText, state, container);
      } catch (err) {
        thinkingEl.remove();
        appendMessageToLog(chatMessagesLog, 'ai', "AI Connection Error: " + err.message + ". Make sure your Gemini API key is correct and valid.");
      }
    };
    
    chatSendBtn.addEventListener('click', handleSendMsg);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMsg();
    });
  }
}

// Append Bubble helper
function appendMessageToLog(logEl, role, text) {
  const bubble = document.createElement('div');
  bubble.className = `${role}-chat-bubble`;
  bubble.style.backgroundColor = role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)';
  bubble.style.border = role === 'user' ? 'none' : '1px solid var(--border-color)';
  bubble.style.padding = '12px';
  bubble.style.borderRadius = '12px';
  bubble.style.alignSelf = role === 'user' ? 'flex-end' : 'flex-start';
  bubble.style.maxWidth = '85%';
  bubble.style.fontSize = '13px';
  bubble.style.lineHeight = '1.5';
  bubble.style.color = role === 'user' ? 'white' : 'var(--text-primary)';
  bubble.style.whiteSpace = 'pre-wrap';
  bubble.textContent = text;
  
  logEl.appendChild(bubble);
  logEl.scrollTop = logEl.scrollHeight;
  return bubble;
}

// Client-side Direct call to Google Gemini APIs
async function callGeminiAPI(userMessage, state) {
  const apiKey = state.geminiApiKey;
  if (!apiKey) throw new Error("API Key missing");
  
  // Format dates, projects, and free slots context
  const activeDate = state.getActiveDate();
  const activeDay = state.days.find(d => d.date === activeDate) || { schedule: [] };
  
  const emptySlots = state.timeIntervals.filter(slot => {
    return !activeDay.schedule.some(task => task.plannedTime === slot);
  });
  
  const projectsSummary = state.projects.map(p => {
    const totalSub = p.subtasks ? p.subtasks.length : 0;
    const completedSub = p.subtasks ? p.subtasks.filter(s => s.completed).length : 0;
    const incompleteTasks = p.subtasks ? p.subtasks.filter(s => !s.completed).map(s => `${s.name} (~${s.estimatedMinutes || 30} mins)`) : [];
    
    return `
      - Project Name: ${p.name}
        Goal: ${p.goal}
        Priority: ${p.priority}
        Deadline: ${p.deadline || 'No deadline'}
        Remaining Hours: ${p.estimatedHours}h
        Hours/Day Available: ${p.availableHoursPerDay}h/day
        Milestone Goal: ${p.nextGoal}
        Incomplete Subtasks: [${incompleteTasks.join(', ')}]
        Progress: ${completedSub}/${totalSub} completed
    `;
  }).join('\n');
  
  const systemInstruction = `
    You are "Aether AI", an interactive scheduling and peak-performance coach integrated into AETHER personal planner.
    Your goal is to optimize the user's focus, plan their day, and scheduling priorities.
    
    Here is the user's context:
    - Active Selected Date: ${activeDate}
    - Available Empty Time Slots today: [${emptySlots.join(', ')}]
    - Current Projects Health Matrix:
      ${projectsSummary}
    
    INSTRUCTIONS FOR INTERACTION:
    1. Check the available empty time slots. Ask questions to help the user schedule their priorities (e.g. asking if they have any new tasks or deadlines, or recommending a slot).
    2. Guide the user in scheduling the highest priority task first to maximize momentum.
    3. To automatically execute actions on the planner, you can write database commands. You can output one or more JSON code blocks (using \`\`\`json code tags) in your response containing structured command objects. 
    
    Available database JSON actions:
    - Schedule a task on a specific time slot:
      {
        "action": "schedule_task",
        "date": "${activeDate}",
        "time": "TIME_SLOT_STRING",
        "name": "TASK_NAME_STRING",
        "type": "study / etsy_seo / general"
      }
    - Add a new project:
      {
        "action": "add_project",
        "name": "PROJECT_NAME",
        "goal": "GOAL_DESCRIPTION",
        "deadline": "YYYY-MM-DD",
        "priority": "low / medium / high / critical",
        "estimatedHours": 20,
        "availableHoursPerDay": 2,
        "subtasks": ["Task A", "Task B"]
      }

    Example of creating a task:
    "I've scheduled 'Anatomy Practice' at 08:30 AM today."
    \`\`\`json
    {
      "action": "schedule_task",
      "date": "${activeDate}",
      "time": "08:30 AM - 09:30 AM",
      "name": "Anatomy Practice",
      "type": "study"
    }
    \`\`\`

    Keep text chat responses concise, actionable, and encouraging! Do not output long introductory texts. Suggest only what fits today's schedule.
  `;
  
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nUser Message: ${userMessage}` }]
      }
    ]
  };
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API returned status ${response.status}: ${errorBody}`);
  }
  
  const json = await response.json();
  if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
    return json.candidates[0].content.parts[0].text;
  }
  
  throw new Error("Invalid response format received from Google Gemini API.");
}

// Parses AI text for JSON code blocks and directly updates Dexie database
async function executeJSONActions(text, state, container) {
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  let actionsCount = 0;
  
  while ((match = jsonRegex.exec(text)) !== null) {
    try {
      const actionObj = JSON.parse(match[1]);
      if (actionObj.action === 'schedule_task') {
        const targetDate = actionObj.date || state.getActiveDate();
        const timeSlot = actionObj.time;
        const taskName = actionObj.name;
        const taskType = actionObj.type || 'general';
        
        const activeDay = state.days.find(d => d.date === targetDate);
        if (activeDay && timeSlot && taskName) {
          // Check collision
          const isSlotFree = !activeDay.schedule.some(t => t.plannedTime === timeSlot);
          if (isSlotFree) {
            const newTask = {
              id: 't-' + Date.now() + Math.random().toString(36).substring(7),
              name: taskName,
              plannedTime: timeSlot,
              status: 'pending',
              missedReason: '',
              actualTime: '',
              type: taskType
            };
            activeDay.schedule.push(newTask);
            // Sort
            activeDay.schedule.sort((a, b) => {
              const idxA = state.timeIntervals.indexOf(a.plannedTime);
              const idxB = state.timeIntervals.indexOf(b.plannedTime);
              return idxA - idxB;
            });
            await state.updateDay(targetDate, { schedule: activeDay.schedule });
            actionsCount++;
          }
        }
      } else if (actionObj.action === 'add_project') {
        const subtasks = (actionObj.subtasks || []).map(t => ({
          id: 'sub-' + Date.now() + Math.random().toString(36).substring(7),
          name: t,
          estimatedMinutes: 30,
          completed: false
        }));
        await state.addProject({
          name: actionObj.name,
          goal: actionObj.goal || '',
          deadline: actionObj.deadline || '',
          priority: actionObj.priority || 'medium',
          estimatedHours: Number(actionObj.estimatedHours) || 10,
          availableHoursPerDay: Number(actionObj.availableHoursPerDay) || 1,
          status: 'In progress',
          subtasks
        });
        actionsCount++;
      }
    } catch (err) {
      console.error("Failed to parse and execute AI action JSON block:", err);
    }
  }
  
  if (actionsCount > 0) {
    confetti({ particleCount: 40, spread: 35 });
    // Re-render
    renderProjects(container, state);
  }
}

export function showEditProjectModal(projId, state, container) {
  const project = state.projects.find(p => p.id === Number(projId));
  if (!project) return;

  const existingModal = document.getElementById('edit-project-modal-backdrop');
  if (existingModal) existingModal.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'edit-project-modal-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `;

  const isAvailable = project.durationMode === 'available';
  const isPreset = [30, 45, 60, 90, 120].includes(project.durationPerSessionMinutes || project.dailyAllocationMinutes);
  const isCustom = !isAvailable && !isPreset && (project.durationPerSessionMinutes > 0 || project.dailyAllocationMinutes > 0);

  backdrop.innerHTML = `
    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); padding: 20px; display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">✏️ Edit Project</h3>
        <button id="close-edit-proj-modal" style="background: none; border: none; font-size: 22px; color: var(--text-muted); cursor: pointer; line-height: 1;">&times;</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Project Name</label>
          <input type="text" id="modal-edit-proj-name" class="premium-input" value="${project.name || ''}" style="width: 100%; height: 32px; font-size: 13px;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Category / Area</label>
            <select id="modal-edit-proj-type" class="premium-select" style="width: 100%; height: 32px; font-size: 12px;">
              <option value="study" ${project.type === 'study' ? 'selected' : ''}>Study</option>
              <option value="etsy_seo" ${project.type === 'etsy_seo' ? 'selected' : ''}>Etsy + SEO</option>
              <option value="quran" ${project.type === 'quran' ? 'selected' : ''}>Quran Hifz</option>
              <option value="flexible" ${(!project.type || project.type === 'flexible') ? 'selected' : ''}>General / Flexible</option>
              ${customTypes.filter(s => s.type !== 'quran').map(s => `
                <option value="${s.type}" ${project.type === s.type ? 'selected' : ''}>${s.label}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Priority</label>
            <select id="modal-edit-proj-priority" class="premium-select" style="width: 100%; height: 32px; font-size: 12px;">
              <option value="low" ${project.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${(!project.priority || project.priority === 'medium') ? 'selected' : ''}>Medium</option>
              <option value="high" ${project.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="critical" ${project.priority === 'critical' ? 'selected' : ''}>Critical</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--bg-tertiary); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; display: block; margin-bottom: 4px;">🔁 Cadence / Recurrence</label>
            <select id="modal-edit-proj-cadence" class="premium-select" style="width: 100%; height: 32px; font-size: 12px;">
              <option value="flexible" ${(!project.frequency || project.frequency === 'flexible') ? 'selected' : ''}>Flexible / Milestone</option>
              <option value="daily" ${project.frequency === 'daily' ? 'selected' : ''}>Daily (Every day)</option>
              <option value="every_2_days" ${project.frequency === 'every_2_days' ? 'selected' : ''}>Every 2 Days (Alternate)</option>
              <option value="every_3_days" ${project.frequency === 'every_3_days' ? 'selected' : ''}>Every 3 Days (Twice/wk)</option>
              <option value="weekly" ${project.frequency === 'weekly' ? 'selected' : ''}>Weekly (Once/wk)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; display: block; margin-bottom: 4px;">⏱ Session Timing & Duration</label>
            <select id="modal-edit-proj-duration" class="premium-select" style="width: 100%; height: 32px; font-size: 12px;">
              <option value="60" ${(!isAvailable && !isCustom && (project.durationPerSessionMinutes === 60 || project.dailyAllocationMinutes === 60)) ? 'selected' : ''}>60 mins (1 hr)</option>
              <option value="30" ${(!isAvailable && (project.durationPerSessionMinutes === 30 || project.dailyAllocationMinutes === 30)) ? 'selected' : ''}>30 mins</option>
              <option value="45" ${(!isAvailable && (project.durationPerSessionMinutes === 45 || project.dailyAllocationMinutes === 45)) ? 'selected' : ''}>45 mins</option>
              <option value="90" ${(!isAvailable && (project.durationPerSessionMinutes === 90 || project.dailyAllocationMinutes === 90)) ? 'selected' : ''}>90 mins (1.5 hr)</option>
              <option value="120" ${(!isAvailable && (project.durationPerSessionMinutes === 120 || project.dailyAllocationMinutes === 120)) ? 'selected' : ''}>120 mins (2 hr)</option>
              <option value="custom" ${isCustom ? 'selected' : ''}>✏️ Custom Timing...</option>
              <option value="available" ${isAvailable ? 'selected' : ''}>⚡ Available Time ("When free")</option>
            </select>
            <div id="modal-edit-proj-custom-wrapper" style="display:${isCustom ? 'flex' : 'none'}; align-items:center; gap:6px; margin-top:4px;">
              <input type="number" id="modal-edit-proj-custom-minutes" class="premium-input" value="${isCustom ? (project.durationPerSessionMinutes || project.dailyAllocationMinutes) : ''}" placeholder="Custom mins" min="5" max="720" style="width:110px; height:26px; font-size:11px; padding:2px 6px;">
              <span style="font-size:10px; color:var(--text-muted);">mins</span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Status</label>
            <select id="modal-edit-proj-status" class="premium-select" style="width: 100%; height: 32px; font-size: 12px;">
              <option value="Not started" ${project.status === 'Not started' ? 'selected' : ''}>Not started</option>
              <option value="In progress" ${project.status === 'In progress' ? 'selected' : ''}>In progress</option>
              <option value="Paused" ${project.status === 'Paused' ? 'selected' : ''}>Paused</option>
              <option value="Completed" ${project.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Target Deadline</label>
            <input type="date" id="modal-edit-proj-deadline" class="premium-input" value="${project.deadline || ''}" style="width: 100%; height: 32px; font-size: 12px;">
          </div>
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Strategic Goal</label>
          <input type="text" id="modal-edit-proj-goal" class="premium-input" value="${project.goal || ''}" placeholder="Big picture milestone..." style="width: 100%; height: 32px; font-size: 12px;">
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Next Immediate Milestone</label>
          <input type="text" id="modal-edit-proj-nextgoal" class="premium-input" value="${project.nextGoal || ''}" placeholder="Next stepping stone..." style="width: 100%; height: 32px; font-size: 12px;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Available Hours/Day</label>
            <input type="number" id="modal-edit-proj-avail" class="premium-input" value="${project.availableHoursPerDay || 0}" style="width: 100%; height: 32px; font-size: 12px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">Estimated Remaining Hours</label>
            <input type="number" id="modal-edit-proj-hours" class="premium-input" value="${project.estimatedHours || 0}" style="width: 100%; height: 32px; font-size: 12px;">
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 4px;">
        <button class="btn btn-danger btn-sm" id="modal-delete-proj-btn" style="font-size: 11px;">
          🗑 Delete Project
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="modal-cancel-edit-proj">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modal-save-edit-proj">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  backdrop.querySelector('#close-edit-proj-modal').addEventListener('click', closeModal);
  backdrop.querySelector('#modal-cancel-edit-proj').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Toggle custom minutes wrapper
  const modalDurationSelect = backdrop.querySelector('#modal-edit-proj-duration');
  const modalCustomWrapper = backdrop.querySelector('#modal-edit-proj-custom-wrapper');
  if (modalDurationSelect && modalCustomWrapper) {
    modalDurationSelect.addEventListener('change', () => {
      modalCustomWrapper.style.display = modalDurationSelect.value === 'custom' ? 'flex' : 'none';
    });
  }

  const refreshView = () => {
    if (container && typeof container === 'function') {
      container();
    } else if (container && container.nodeType) {
      if (container.querySelector('#available-time-select, #focus-plan-list-area')) {
        renderProjects(container, state);
      } else {
        state.notify();
      }
    } else {
      state.notify();
    }
  };

  // Delete Project from within modal
  backdrop.querySelector('#modal-delete-proj-btn').addEventListener('click', async () => {
    if (confirm(`Are you sure you want to permanently delete "${project.name}"? This will not return.`)) {
      closeModal();
      await state.deleteProject(projId);
      showToast("Project deleted successfully");
      refreshView();
    }
  });

  // Save Project from within modal
  backdrop.querySelector('#modal-save-edit-proj').addEventListener('click', async () => {
    const name = backdrop.querySelector('#modal-edit-proj-name').value.trim();
    if (!name) {
      alert("Project name cannot be empty!");
      return;
    }

    const frequency = backdrop.querySelector('#modal-edit-proj-cadence').value;
    const timingVal = backdrop.querySelector('#modal-edit-proj-duration').value;
    let durationMode = 'fixed';
    let durationPerSessionMinutes = 60;
    if (timingVal === 'available') {
      durationMode = 'available';
      durationPerSessionMinutes = 0;
    } else if (timingVal === 'custom') {
      durationMode = 'fixed';
      durationPerSessionMinutes = Number(backdrop.querySelector('#modal-edit-proj-custom-minutes')?.value) || 60;
    } else {
      durationMode = 'fixed';
      durationPerSessionMinutes = Number(timingVal) || 60;
    }

    const updates = {
      name,
      type: backdrop.querySelector('#modal-edit-proj-type').value,
      priority: backdrop.querySelector('#modal-edit-proj-priority').value,
      frequency,
      durationMode,
      durationPerSessionMinutes,
      isDailyAllocation: frequency === 'daily' && durationMode === 'fixed',
      dailyAllocationMinutes: durationPerSessionMinutes,
      status: backdrop.querySelector('#modal-edit-proj-status').value,
      deadline: backdrop.querySelector('#modal-edit-proj-deadline').value,
      goal: backdrop.querySelector('#modal-edit-proj-goal').value.trim(),
      nextGoal: backdrop.querySelector('#modal-edit-proj-nextgoal').value.trim(),
      availableHoursPerDay: Number(backdrop.querySelector('#modal-edit-proj-avail').value) || 0,
      estimatedHours: Number(backdrop.querySelector('#modal-edit-proj-hours').value) || 0,
      lastWorkedOn: Date.now()
    };

    closeModal();
    await state.updateProject(projId, updates);
    showToast("Project updated successfully");
    refreshView();
  });
}
