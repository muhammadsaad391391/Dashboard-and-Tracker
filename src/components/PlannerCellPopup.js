import { icons } from '../icons.js';
import confetti from 'canvas-confetti';

export function showPlannerCellPopup(e, cell, date, time, state, categoryType, onSaveCallback) {
  e.stopPropagation();

  // Remove existing popups
  const existing = document.querySelector('.status-popup');
  if (existing) existing.remove();

  // Find matching projects for this category
  // If categoryType is 'general', we show all projects. Otherwise, filter by type
  const matchingProjects = state.projects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Paused') return false;
    if (categoryType === 'general') return true;
    return p.type === categoryType;
  });

  const overlay = document.createElement('div');
  overlay.className = 'status-popup';
  overlay.style.width = '300px';
  overlay.style.padding = '16px';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.gap = '12px';
  overlay.style.top = `${Math.min(window.innerHeight - 350, e.clientY + window.scrollY + 10)}px`;
  overlay.style.left = `${Math.min(window.innerWidth - 320, Math.max(10, e.clientX + window.scrollX - 150))}px`;
  overlay.style.zIndex = '1000';
  overlay.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';

  // Check if clipboard is active to show Paste option
  const clipName = state.clipboard ? (state.clipboard.name || (state.clipboard.tasks && state.clipboard.tasks[0] && state.clipboard.tasks[0].name) || '') : '';

  overlay.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:4px;">
      <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">Plan Time Slot (${time})</span>
      <button id="popup-close-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px;">&times;</button>
    </div>

    <!-- Section A: Custom Text Input -->
    <div style="display:flex; flex-direction:column; gap:6px;">
      <label style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Custom Task Details</label>
      <div style="display:flex; gap:6px;">
        <input type="text" id="popup-custom-task" class="premium-input" placeholder="Enter custom task name..." style="height:32px; font-size:12px;" autofocus>
        <button class="btn btn-primary btn-sm" id="popup-save-custom-btn" style="height:32px; padding:0 12px; font-size:11px;">Save</button>
      </div>
    </div>

    ${clipName ? `
      <!-- Section Paste -->
      <button class="btn btn-secondary btn-sm" id="popup-paste-btn" style="justify-content:center; gap:6px; font-size:11px; padding:6px 0;">
        📋 Paste: "${clipName.substring(0, 25)}${clipName.length > 25 ? '...' : ''}"
      </button>
    ` : ''}

    <!-- Section B: Select from Projects -->
    <div style="display:flex; flex-direction:column; gap:6px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <hr style="flex:1; border:none; border-top:1px solid var(--border-color);">
        <span style="font-size:9px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Link Project Task</span>
        <hr style="flex:1; border:none; border-top:1px solid var(--border-color);">
      </div>
      
      <select id="popup-proj-task-select" class="premium-select" style="width:100%; font-size:12px; padding:6px; height:32px;">
        <option value="">-- Choose Project Task --</option>
        ${matchingProjects.map(proj => `
          <optgroup label="${proj.name} ${proj.isDailyAllocation ? '(Daily Goal)' : ''}">
            ${proj.isDailyAllocation ? `<option value="${proj.id}|daily">General Work (Daily Goal)</option>` : ''}
            ${proj.subtasks ? proj.subtasks.filter(s => !s.completed).map(sub => `
              <option value="${proj.id}|${sub.id}">${sub.name}</option>
            `).join('') : ''}
          </optgroup>
        `).join('')}
      </select>
    </div>

    <!-- Section C: Quick Add Tools Toggle -->
    <div style="display:flex; align-items:center; gap:8px;">
      <hr style="flex:1; border:none; border-top:1px solid var(--border-color);">
      <span style="font-size:9px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">Quick Actions</span>
      <hr style="flex:1; border:none; border-top:1px solid var(--border-color);">
    </div>

    <div style="display:flex; gap:6px;">
      <button class="btn btn-secondary btn-sm" id="popup-toggle-quick-task" style="flex:1; font-size:10px; justify-content:center; padding:6px 0;">+ Add Task</button>
      <button class="btn btn-secondary btn-sm" id="popup-toggle-quick-proj" style="flex:1; font-size:10px; justify-content:center; padding:6px 0;">+ New Project</button>
    </div>

    <!-- Hidden Sub-Panels for Quick Actions -->
    <div id="popup-quick-task-panel" style="display:none; flex-direction:column; gap:8px; background:var(--bg-tertiary); padding:8px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
      <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">Add Subtask to Project</span>
      <select id="popup-target-project" class="premium-select" style="font-size:11px; padding:4px; height:28px;">
        ${matchingProjects.filter(p => !p.isDailyAllocation).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
      <input type="text" id="popup-new-task-name" class="premium-input" placeholder="Task name..." style="height:28px; font-size:11px; padding:4px 8px;">
      <button class="btn btn-primary btn-sm" id="popup-quick-task-save" style="height:24px; font-size:11px; justify-content:center;">Save & Schedule</button>
    </div>

    <div id="popup-quick-proj-panel" style="display:none; flex-direction:column; gap:8px; background:var(--bg-tertiary); padding:8px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
      <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">Create New Project</span>
      <input type="text" id="popup-new-proj-name" class="premium-input" placeholder="Project name..." style="height:28px; font-size:11px; padding:4px 8px;">
      
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="popup-new-proj-is-daily" style="width:14px; height:14px; cursor:pointer;">
        <label for="popup-new-proj-is-daily" style="font-size:10px; font-weight:600; color:var(--text-secondary); cursor:pointer;">Fixed Daily Goal</label>
      </div>

      <div id="popup-new-proj-daily-wrapper" style="display:none; flex-direction:column; gap:2px;">
        <label style="font-size:9px; color:var(--text-muted); font-weight:700;">Daily Allocation (mins)</label>
        <input type="number" id="popup-new-proj-daily-minutes" class="premium-input" value="60" style="height:26px; font-size:11px; padding:4px 8px; width:80px;">
      </div>

      <button class="btn btn-primary btn-sm" id="popup-quick-proj-save" style="height:24px; font-size:11px; justify-content:center;">Create & Reload</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  const closePopup = () => { overlay.remove(); };
  overlay.querySelector('#popup-close-btn').addEventListener('click', closePopup);

  const customInput = overlay.querySelector('#popup-custom-task');
  const saveCustomBtn = overlay.querySelector('#popup-save-custom-btn');

  const executeCustomSave = () => {
    const val = customInput.value.trim();
    if (val) {
      onSaveCallback(val);
      closePopup();
    }
  };

  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeCustomSave();
    if (e.key === 'Escape') closePopup();
  });
  saveCustomBtn.addEventListener('click', executeCustomSave);

  // Select dropdown trigger
  const taskSelect = overlay.querySelector('#popup-proj-task-select');
  taskSelect.addEventListener('change', async () => {
    const val = taskSelect.value;
    if (!val) return;

    const [projIdStr, taskIdStr] = val.split('|');
    const projId = Number(projIdStr);
    const project = state.projects.find(p => p.id === projId);
    
    if (project) {
      let taskName = '';
      if (taskIdStr === 'daily') {
        taskName = `${project.name}: General Work`;
        project.lastWorkedOn = Date.now();
        await state.updateProject(projId, { lastWorkedOn: project.lastWorkedOn });
      } else {
        const sub = project.subtasks.find(s => s.id === taskIdStr);
        if (sub) {
          taskName = `${project.name}: ${sub.name}`;
          sub.completed = true;
          project.lastWorkedOn = Date.now();
          await state.updateProject(projId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
        }
      }

      if (taskName) {
        onSaveCallback(taskName);
        confetti({ particleCount: 40, spread: 30 });
      }
    }
    closePopup();
  });

  // Toggle Action Panels
  const taskPanel = overlay.querySelector('#popup-quick-task-panel');
  const projPanel = overlay.querySelector('#popup-quick-proj-panel');

  overlay.querySelector('#popup-toggle-quick-task').addEventListener('click', () => {
    projPanel.style.display = 'none';
    taskPanel.style.display = taskPanel.style.display === 'none' ? 'flex' : 'none';
  });

  overlay.querySelector('#popup-toggle-quick-proj').addEventListener('click', () => {
    taskPanel.style.display = 'none';
    projPanel.style.display = projPanel.style.display === 'none' ? 'flex' : 'none';
  });

  // Daily allocation toggle inside new project form
  const isDailyCheck = overlay.querySelector('#popup-new-proj-is-daily');
  const dailyWrapper = overlay.querySelector('#popup-new-proj-daily-wrapper');
  isDailyCheck.addEventListener('change', () => {
    dailyWrapper.style.display = isDailyCheck.checked ? 'flex' : 'none';
  });

  // Save new task to project
  overlay.querySelector('#popup-quick-task-save').addEventListener('click', async () => {
    const targetProjId = Number(overlay.querySelector('#popup-target-project').value);
    const newTaskName = overlay.querySelector('#popup-new-task-name').value.trim();
    
    if (!targetProjId) {
      alert("No project selected! Make sure you create a project first.");
      return;
    }
    if (!newTaskName) {
      alert("Please enter task name!");
      return;
    }

    const project = state.projects.find(p => p.id === targetProjId);
    if (project) {
      const newTask = {
        id: 'sub-' + Date.now() + Math.random().toString(36).substring(7),
        name: newTaskName,
        estimatedMinutes: 30,
        completed: true // since we are scheduling it right now
      };
      
      project.subtasks = project.subtasks || [];
      project.subtasks.push(newTask);
      project.lastWorkedOn = Date.now();
      await state.updateProject(targetProjId, { subtasks: project.subtasks, lastWorkedOn: project.lastWorkedOn });
      
      onSaveCallback(`${project.name}: ${newTaskName}`);
      confetti({ particleCount: 30, spread: 20 });
      closePopup();
    }
  });

  // Save new project
  overlay.querySelector('#popup-quick-proj-save').addEventListener('click', async () => {
    const newProjName = overlay.querySelector('#popup-new-proj-name').value.trim();
    if (!newProjName) {
      alert("Please enter project name!");
      return;
    }

    const isDaily = isDailyCheck.checked;
    const dailyMins = Number(overlay.querySelector('#popup-new-proj-daily-minutes').value) || 60;

    const newProj = {
      name: newProjName,
      status: 'In progress',
      priority: 'medium',
      type: categoryType === 'general' ? 'flexible' : categoryType,
      isDailyAllocation: isDaily,
      dailyAllocationMinutes: isDaily ? dailyMins : 0,
      subtasks: []
    };

    await state.addProject(newProj);
    closePopup();

    // Re-spawn popup so new project shows up in the dropdown
    showPlannerCellPopup(e, cell, date, time, state, categoryType, onSaveCallback);
  });

  // Paste Action
  const pasteBtn = overlay.querySelector('#popup-paste-btn');
  if (pasteBtn) {
    pasteBtn.addEventListener('click', () => {
      onSaveCallback(clipName);
      closePopup();
    });
  }
}
