import { icons } from '../icons.js';
import confetti from 'canvas-confetti';

export function renderProjects(container, state) {
  // 1. Calculate Priority Scores & Health for all projects
  const activeDate = state.getActiveDate();
  const today = new Date(activeDate + 'T00:00:00');
  
  const processedProjects = state.projects.map(proj => {
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
    
    // E. Priority Score Formula (0-100)
    let priorityScore = Math.round(
      (urgency * 0.30) +
      (importance * 0.25) +
      (deadlineRisk * 0.20) +
      (neglectFactor * 0.15) +
      (10) // base baseline
    );
    priorityScore = Math.min(100, Math.max(0, priorityScore));
    
    // F. Progress Percentage
    const totalSub = proj.subtasks ? proj.subtasks.length : 0;
    const completedSub = proj.subtasks ? proj.subtasks.filter(s => s.completed).length : 0;
    const subtaskProgress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
    
    return {
      ...proj,
      daysRemaining,
      deadlineRisk,
      neglectDays,
      requiredDailyHours,
      paceStatus,
      paceClass,
      priorityScore,
      progress: totalSub > 0 ? subtaskProgress : 0
    };
  });
  
  // Sort projects by priority score descending
  processedProjects.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // 2. Determine "What Should I Do Now?" recommended task
  let recommendedTask = null;
  let recommendedProject = null;
  
  for (const proj of processedProjects) {
    if (proj.status === 'Completed' || proj.status === 'Paused') continue;
    const nextIncompleteTask = proj.subtasks ? proj.subtasks.find(s => !s.completed) : null;
    if (nextIncompleteTask) {
      recommendedTask = nextIncompleteTask;
      recommendedProject = proj;
      break;
    }
  }

  // 3. Available Time Today Scheduler Logic
  const timeMapping = { '30m': 30, '1h': 60, '2h': 120, '3h': 180, '4h': 240 };
  const maxMinutes = timeMapping[state.availableTimeToday] || 120;
  
  let allocatedMinutes = 0;
  const recommendedTodayList = [];
  
  processedProjects.forEach(proj => {
    if (proj.status === 'Completed' || proj.status === 'Paused') return;
    if (proj.subtasks) {
      proj.subtasks.forEach(task => {
        if (!task.completed) {
          const est = task.estimatedMinutes || 30;
          if (allocatedMinutes + est <= maxMinutes) {
            allocatedMinutes += est;
            recommendedTodayList.push({
              project: proj,
              task: task,
              estimate: est
            });
          }
        }
      });
    }
  });

  // Render Page Layout
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">
      
      <!-- Collapsible Setup Warning if Gemini Key is missing -->
      ${!state.geminiApiKey ? `
        <div class="card" style="border-left: 4px solid var(--accent); background-color: rgba(99, 102, 241, 0.05); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-weight:700; color:var(--text-primary);">🧠 Enable Aether AI Day Planner Chat</span>
              <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">You haven't added a Gemini API Key yet. Go to Settings or enter your key below to unlock interactive AI scheduling.</p>
            </div>
            <button class="btn btn-primary btn-sm" id="quick-save-gemini-btn" style="white-space:nowrap; padding: 6px 12px;">Add API Key</button>
          </div>
          <div id="quick-gemini-input-wrapper" style="display:none; margin-top:12px; gap:8px;">
            <input type="password" id="quick-gemini-key" class="premium-input" placeholder="AIzaSy..." style="flex:1; height:32px; font-size:11px; font-family:var(--font-mono); padding:4px 8px;">
            <button class="btn btn-primary btn-sm" id="quick-save-key-action" style="height:32px;">Save</button>
          </div>
        </div>
      ` : ''}

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px; align-items: start;" class="projects-grid">
        
        <!-- Left Column: Priority Trackers -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- ⚡ Hero Card: What Should I Do Now? -->
          <div class="card streak-banner" style="margin-bottom:0; box-shadow:var(--glass-shadow); min-height: 160px; display:flex; justify-content:space-between; flex-direction:row; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:8px; flex:1; min-width:0; padding-right:16px;">
              <span style="font-size:11px; text-transform:uppercase; font-weight:800; letter-spacing:0.1em; color:rgba(255,255,255,0.7);">⚡ Recommended Next Action</span>
              ${recommendedTask ? `
                <h2 style="font-size:24px; font-weight:800; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${recommendedTask.name}">${recommendedTask.name}</h2>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12px; color:rgba(255,255,255,0.85); font-weight:600;">
                  <span>Project: <strong>${recommendedProject.name}</strong></span>
                  <span>•</span>
                  <span>Est: <strong>${recommendedTask.estimatedMinutes || 30} mins</strong></span>
                  <span>•</span>
                  <span class="badge ${recommendedProject.paceClass}" style="color:white; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2);">${recommendedProject.paceStatus}</span>
                </div>
                <p style="font-size:12px; color:rgba(255,255,255,0.75); margin-top:8px; font-style:italic;">
                  <strong>Why this is #1:</strong> This project has a priority score of ${recommendedProject.priorityScore}/100. ${recommendedProject.paceStatus === 'Behind' ? 'You are currently behind the required pace to meet your deadline.' : 'It requires consistent progress to stay on track.'}
                </p>
              ` : `
                <h2 style="font-size:20px; font-weight:800; color:white;">No pending actions!</h2>
                <p style="font-size:12px; color:rgba(255,255,255,0.75);">Add tasks to your projects or start a new project to generate priority suggestions.</p>
              `}
            </div>
            ${recommendedTask ? `
              <button class="btn btn-secondary" id="action-start-recommended-task-btn" data-proj-id="${recommendedProject.id}" data-task-id="${recommendedTask.id}" style="color:var(--accent); background-color:white; border:none; padding:10px 16px; font-weight:700; border-radius:var(--radius-sm); white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                Start Task
              </button>
            ` : ''}
          </div>

          <!-- Daily Available Time Planner Card -->
          <div class="card">
            <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
              <span>📅 Available Time Today Planner</span>
              <select class="premium-select" id="available-time-select" style="width:120px; height:28px; font-size:12px; padding:2px 6px;">
                <option value="30m" ${state.availableTimeToday === '30m' ? 'selected' : ''}>30 Mins</option>
                <option value="1h" ${state.availableTimeToday === '1h' ? 'selected' : ''}>1 Hour</option>
                <option value="2h" ${state.availableTimeToday === '2h' ? 'selected' : ''}>2 Hours</option>
                <option value="3h" ${state.availableTimeToday === '3h' ? 'selected' : ''}>3 Hours</option>
                <option value="4h" ${state.availableTimeToday === '4h' ? 'selected' : ''}>4 Hours</option>
              </select>
            </div>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">
              The system calculates a custom task list that fits exactly inside your available capacity today.
            </p>
            
            <div style="display:flex; flex-direction:column; gap:8px;" id="focus-plan-list-area">
              ${recommendedTodayList.length === 0 ? `
                <div class="cell-empty" style="text-align:center; padding:16px 0;">No tasks fit in this time frame or all tasks completed!</div>
              ` : recommendedTodayList.map(item => `
                <div style="display:flex; align-items:center; justify-content:space-between; background-color:var(--bg-tertiary); padding:10px 14px; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                  <div style="display:flex; flex-direction:column; min-width:0;">
                    <span style="font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.task.name}</span>
                    <span style="font-size:11px; color:var(--text-muted);">Project: ${item.project.name} (${item.project.priorityScore} Priority)</span>
                  </div>
                  <span style="font-size:11px; font-family:var(--font-mono); font-weight:700; color:var(--accent); background:var(--bg-secondary); padding:2px 8px; border-radius:4px; white-space:nowrap;">
                    ~${item.estimate} min
                  </span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Project Queue & Health Table -->
          <div class="card">
            <div class="card-title">📊 Project Queue & Health</div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; min-width:600px;" class="spreadsheet-table">
                <thead>
                  <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:10px; font-size:12px; font-weight:700;">Project</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Priority Score</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Progress</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Deadline</th>
                    <th style="padding:10px; font-size:12px; font-weight:700;">Pace Status</th>
                    <th style="padding:10px; font-size:12px; font-weight:700; text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${processedProjects.length === 0 ? `
                    <tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">No projects created yet. Form below!</td></tr>
                  ` : processedProjects.map(proj => {
                    const priorityClass = proj.priority === 'critical' ? 'badge-danger' : proj.priority === 'high' ? 'badge-warning' : 'badge-info';
                    return `
                      <tr style="border-bottom:1px solid var(--border-color);" data-proj-row-id="${proj.id}">
                        <td style="padding:12px 10px;">
                          <div style="display:flex; flex-direction:column; min-width:0;">
                            <span style="font-weight:700; font-size:14px;">${proj.name}</span>
                            <span style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${proj.goal || 'No goal set'}</span>
                          </div>
                        </td>
                        <td style="padding:12px 10px;">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-family:var(--font-mono); font-weight:700; font-size:14px; color:var(--accent);">${proj.priorityScore}</span>
                            <span class="badge ${priorityClass}" style="font-size:9px; text-transform:uppercase;">${proj.priority}</span>
                          </div>
                        </td>
                        <td style="padding:12px 10px; width:150px;">
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
                            <span style="font-size:10px; color:var(--text-muted);">${proj.daysRemaining} days left</span>
                          ` : '<span style="color:var(--text-muted);">None</span>'}
                        </td>
                        <td style="padding:12px 10px;">
                          <span class="badge ${proj.paceClass}" style="font-size:10px;">${proj.paceStatus}</span>
                        </td>
                        <td style="padding:12px 10px; text-align:right;">
                          <div style="display:flex; justify-content:flex-end; gap:6px;">
                            <button class="btn btn-secondary btn-sm toggle-proj-details-btn" data-id="${proj.id}" style="padding:4px; width:28px; height:28px; justify-content:center;">
                              ${icons.chevronDown}
                            </button>
                            <button class="btn btn-danger btn-sm delete-proj-btn" data-id="${proj.id}" style="padding:4px; width:28px; height:28px; justify-content:center;">
                              ${icons.trash}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      <!-- Collapsible subtasks panel -->
                      <tr id="proj-details-pane-${proj.id}" style="display:none; background-color:rgba(255,255,255,0.01);">
                        <td colspan="6" style="padding:16px; border-bottom:1px solid var(--border-color);">
                          <div style="display:flex; flex-direction:column; gap:16px;">
                            
                            <!-- Subtasks Section -->
                            <div>
                              <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">Subtasks & Roadmap</span>
                              <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                                ${(!proj.subtasks || proj.subtasks.length === 0) ? `
                                  <span style="font-size:12px; color:var(--text-muted); font-style:italic;">No tasks added to this project yet. Add one below!</span>
                                ` : proj.subtasks.map((sub, sIdx) => `
                                  <div style="display:flex; align-items:center; gap:8px;">
                                    <input type="checkbox" class="subtask-checkbox" data-proj-id="${proj.id}" data-idx="${sIdx}" ${sub.completed ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                                    <span style="font-size:13px; ${sub.completed ? 'text-decoration:line-through; color:var(--text-muted);' : 'font-weight:600;'}">${sub.name}</span>
                                    <span style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono); margin-left:auto; background:var(--bg-tertiary); padding:2px 6px; border-radius:4px;">~${sub.estimatedMinutes || 30} mins</span>
                                  </div>
                                `).join('')}
                              </div>
                              
                              <!-- Add Subtask Input Form -->
                              <div style="display:flex; gap:8px; margin-top:12px;">
                                <input type="text" class="premium-input new-subtask-name" data-proj-id="${proj.id}" placeholder="New subtask name..." style="flex:2; height:28px; font-size:12px; padding:2px 8px;">
                                <input type="number" class="premium-input new-subtask-est" data-proj-id="${proj.id}" placeholder="Est. Mins (e.g. 30)" style="flex:1; height:28px; font-size:12px; padding:2px 8px;">
                                <button class="btn btn-primary btn-sm add-subtask-btn" data-proj-id="${proj.id}" style="height:28px; padding:0 12px; font-size:11px;">Add Task</button>
                              </div>
                            </div>
                            
                            <hr style="border:0; border-top:1px solid var(--border-color); margin:0;">
                            
                            <!-- Project Details / Stats Summary -->
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; font-size:12px;">
                              <div>
                                <span style="color:var(--text-muted);">Estimated Remaining Effort:</span>
                                <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                                  <input type="number" class="premium-input edit-proj-effort" data-proj-id="${proj.id}" value="${proj.estimatedHours}" style="width:70px; height:24px; padding:2px 6px;">
                                  <span>hours</span>
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
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add Project Form -->
          <div class="card">
            <div class="card-title">➕ Add New Project</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="display:grid; grid-template-columns: 2fr 1fr; gap:12px;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Project Name</label>
                  <input type="text" id="new-proj-name" class="premium-input" placeholder="E.g. Etsy Crochet Shop" style="height:32px; padding:4px 8px;">
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
              </div>

              <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Deadline Date</label>
                  <input type="date" id="new-proj-deadline" class="premium-input" style="height:32px; padding:4px 8px;">
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Est. Hours Left</label>
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
                <input type="text" id="new-proj-nextgoal" class="premium-input" placeholder="E.g. Publish Halloween listings" style="height:32px; padding:4px 8px;">
              </div>

              <div style="display:flex; flex-direction:column; gap:4px;">
                <label style="font-size:11px; font-weight:700; color:var(--text-secondary);">Initial Tasks list (comma separated)</label>
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
  // A. Quick Gemini API Save
  const quickSaveBtn = container.querySelector('#quick-save-gemini-btn');
  const quickWrapper = container.querySelector('#quick-gemini-input-wrapper');
  const quickSaveAction = container.querySelector('#quick-save-key-action');
  
  if (quickSaveBtn) {
    quickSaveBtn.addEventListener('click', () => {
      quickWrapper.style.display = quickWrapper.style.display === 'none' ? 'flex' : 'none';
    });
  }
  
  if (quickSaveAction) {
    quickSaveAction.addEventListener('click', async () => {
      const keyVal = container.querySelector('#quick-gemini-key').value.trim();
      if (keyVal) {
        await state.saveGeminiApiKey(keyVal);
        alert("Gemini API Key saved successfully!");
        renderProjects(container, state);
      }
    });
  }

  // B. Available Time select dropdown
  const timeSelect = container.querySelector('#available-time-select');
  if (timeSelect) {
    timeSelect.addEventListener('change', async () => {
      await state.saveAvailableTimeToday(timeSelect.value);
      renderProjects(container, state);
    });
  }

  // C. Start Recommended Task
  const startRecBtn = container.querySelector('#action-start-recommended-task-btn');
  if (startRecBtn) {
    startRecBtn.addEventListener('click', async () => {
      const projId = Number(startRecBtn.getAttribute('data-proj-id'));
      const taskId = startRecBtn.getAttribute('data-task-id');
      
      const project = state.projects.find(p => p.id === projId);
      if (!project) return;
      
      const taskIndex = project.subtasks.findIndex(s => s.id === taskId);
      if (taskIndex === -1) return;
      
      const task = project.subtasks[taskIndex];
      
      // Load active day
      const activeDate = state.getActiveDate();
      const activeDay = state.days.find(d => d.date === activeDate);
      if (!activeDay) return;
      
      // Find the first free time slot in activeDay
      const firstFreeSlot = state.timeIntervals.find(slot => {
        return !activeDay.schedule.some(item => item.plannedTime === slot);
      });
      
      if (!firstFreeSlot) {
        alert("No free time slots available on your schedule for today! Free up a slot in the Daily Planner first.");
        return;
      }
      
      // Add task to activeDay schedule
      const newTask = {
        id: 't-' + Date.now(),
        name: `${project.name}: ${task.name}`,
        plannedTime: firstFreeSlot,
        status: 'pending',
        missedReason: '',
        actualTime: '',
        type: 'general'
      };
      
      activeDay.schedule.push(newTask);
      // Sort schedule
      activeDay.schedule.sort((a, b) => {
        const idxA = state.timeIntervals.indexOf(a.plannedTime);
        const idxB = state.timeIntervals.indexOf(b.plannedTime);
        return idxA - idxB;
      });
      
      // Update day database
      await state.updateDay(activeDay.date, { schedule: activeDay.schedule });
      
      // Mark subtask as completed in the project
      project.subtasks[taskIndex].completed = true;
      project.lastWorkedOn = Date.now();
      await state.updateProject(project.id, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
      
      confetti({ particleCount: 60, spread: 40 });
      alert(`Scheduled "${task.name}" at ${firstFreeSlot} today!`);
      
      renderProjects(container, state);
    });
  }

  // D. Collapsible project details row triggers
  container.querySelectorAll('.toggle-proj-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const pane = container.querySelector(`#proj-details-pane-${id}`);
      if (pane) {
        const isCollapsed = pane.style.display === 'none';
        pane.style.display = isCollapsed ? 'table-row' : 'none';
        btn.innerHTML = isCollapsed ? icons.chevronDown : icons.chevronRight; // flip arrow
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

  // F. Add Subtask to Project
  container.querySelectorAll('.add-subtask-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-proj-id'));
      const nameInput = container.querySelector(`.new-subtask-name[data-proj-id="${projId}"]`);
      const estInput = container.querySelector(`.new-subtask-est[data-proj-id="${projId}"]`);
      
      const nameVal = nameInput.value.trim();
      const estVal = parseInt(estInput.value.trim()) || 30;
      
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
          await state.updateProject(projId, { subtasks });
          renderProjects(container, state);
        }
      }
    });
  });

  // G. Edit Project Details Save Button
  container.querySelectorAll('.save-proj-details-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projId = Number(btn.getAttribute('data-id'));
      const effortInput = container.querySelector(`.edit-proj-effort[data-proj-id="${projId}"]`);
      const availInput = container.querySelector(`.edit-proj-available[data-proj-id="${projId}"]`);
      const nextInput = container.querySelector(`.edit-proj-nextgoal[data-proj-id="${projId}"]`);
      
      const effort = Number(effortInput.value) || 0;
      const avail = Number(availInput.value) || 0;
      const nextGoal = nextInput.value.trim();
      
      await state.updateProject(projId, {
        estimatedHours: effort,
        availableHoursPerDay: avail,
        nextGoal: nextGoal
      });
      
      alert("Project details saved successfully!");
      renderProjects(container, state);
    });
  });

  // H. Delete Project button
  container.querySelectorAll('.delete-proj-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this project?")) {
        await state.deleteProject(id);
        renderProjects(container, state);
      }
    });
  });

  // I. Save New Project Form
  const saveNewProjBtn = container.querySelector('#save-new-proj-btn');
  if (saveNewProjBtn) {
    saveNewProjBtn.addEventListener('click', async () => {
      const name = container.querySelector('#new-proj-name').value.trim();
      const priority = container.querySelector('#new-proj-priority').value;
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
      
      const subtasks = subtaskStr.split(',')
        .map(t => t.trim())
        .filter(t => t)
        .map(t => ({
          id: 'sub-' + Date.now() + Math.random().toString(36).substring(7),
          name: t,
          estimatedMinutes: 30,
          completed: false
        }));
        
      await state.addProject({
        name,
        priority,
        deadline,
        goal,
        nextGoal,
        estimatedHours: hours,
        availableHoursPerDay: avail,
        status: 'In progress',
        subtasks
      });
      
      confetti({ particleCount: 50, spread: 30 });
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
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
