import { icons } from '../icons.js';
import confetti from 'canvas-confetti';

export function renderStudy(container, state) {
  let savedScrollLeft = 0;
  const oldSpreadsheet = container.querySelector('.spreadsheet-container');
  if (oldSpreadsheet) {
    savedScrollLeft = oldSpreadsheet.scrollLeft;
  }

  const weekDays = state.getDaysForActiveWeek();
  const startLabel = weekDays[0] ? weekDays[0].label.replace(/, \d{4}/, '') : '';
  const endLabel = weekDays[6] ? weekDays[6].label.replace(/, \d{4}/, '') : '';
  const year = weekDays[0] ? new Date(weekDays[0].date).getFullYear() : '';
  const weekRangeText = `${startLabel} – ${endLabel}, ${year}`;

  // Build spreadsheet grid headers
  const headerHtml = weekDays.map(day => `
    <th class="spreadsheet-th" id="study-header-${day.date}">
      <div style="font-size: 13px; font-weight:700;">${day.weekday.substring(0, 3)}</div>
      <div style="font-size: 10px; opacity:0.7;">${day.date.substring(5)}</div>
    </th>
  `).join('');

  // Build rows based on user-configured time intervals
  let rowsHtml = '';
  state.timeIntervals.forEach((slot, rowIdx) => {
    rowsHtml += `<tr>`;
    rowsHtml += `<td class="spreadsheet-td sticky-col">${slot}</td>`;
    
    weekDays.forEach((day, colIdx) => {
      // Find tasks matching this time slot and type === 'study'
      const task = day.schedule.find(t => t.plannedTime === slot && t.type === 'study');
      
      if (task) {
        let statusClass = 'status-pending';
        let statusSymbol = '⚪';
        if (task.status === 'completed') { statusClass = 'status-completed'; statusSymbol = '✅'; }
        if (task.status === 'delayed') { statusClass = 'status-delayed'; statusSymbol = '⚠'; }
        if (task.status === 'missed') { statusClass = 'status-missed'; statusSymbol = '❌'; }
        
        rowsHtml += `
          <td class="spreadsheet-td cell-task ${statusClass} type-study" 
              data-date="${day.date}" 
              data-task-id="${task.id}" 
              data-time="${slot}"
              data-col-idx="${colIdx}"
              data-row-idx="${rowIdx}">
            <div class="cell-inner">
              <span class="cell-text" title="${task.name}">${task.name}</span>
              <div class="cell-meta">
                <span class="cell-time">Study Slot</span>
                <span style="font-size:11px;">${statusSymbol}</span>
              </div>
            </div>
          </td>
        `;
      } else {
        // Check if there is another task at this time (non-study)
        const otherTask = day.schedule.find(t => t.plannedTime === slot);
        
        if (otherTask) {
          // Time slot is already filled by another activity (Etsy or General)
          rowsHtml += `
            <td class="spreadsheet-td cell-blocked" style="background-color:rgba(0,0,0,0.02); opacity:0.4; cursor:not-allowed;" title="Filled by: ${otherTask.name}">
              <div style="font-size:10px; text-align:center; padding:12px 0;">[ ${otherTask.type === 'etsy_seo' ? 'Etsy/SEO' : 'Daily Task'} ]</div>
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
              <div class="cell-empty">+ Study Hour</div>
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
          <h3 style="font-size: 16px; font-weight:700;">Study Hours Grid</h3>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top:2px;">
            Manage and schedule your study blocks. Any slot filled here automatically populates in your main Daily Planner view.
          </p>
        </div>
        <span class="nav-icon" style="color:var(--accent);">${icons.study}</span>
      </div>
    </div>

    <!-- Quick navigation bar for weeks -->
    <div class="card" style="padding: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" id="study-prev-week-btn">◀ Prev Week</button>
        <span style="font-size: 13px; font-weight: 700; color: var(--text-primary); font-family: var(--font-header);" id="study-week-range">${weekRangeText}</span>
        <button class="btn btn-secondary btn-sm" id="study-next-week-btn">Next Week ▶</button>
        <button class="btn btn-secondary btn-sm" id="study-today-btn" style="margin-left: 6px;">Today</button>
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
    cell.addEventListener('dblclick', (e) => {
      if (cell.querySelector('input')) return;

      const date = cell.getAttribute('data-date');
      const taskId = cell.getAttribute('data-task-id');
      const time = cell.getAttribute('data-time');

      if (taskId) {
        showStudyCellStatusOverlay(e, cell, date, taskId, state);
      } else {
        if (state.clipboard) {
          showStudyEmptyCellOverlay(e, cell, date, time, state);
        } else {
          enterStudyCellEditMode(cell, date, time, state);
        }
      }
    });
  });

  // Week Navigation Listeners
  container.querySelector('#study-prev-week-btn').addEventListener('click', async () => {
    const current = new Date(state.getActiveDate());
    current.setDate(current.getDate() - 7);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    await state.setActiveDate(`${y}-${m}-${d}`);
  });

  container.querySelector('#study-next-week-btn').addEventListener('click', async () => {
    const current = new Date(state.getActiveDate());
    current.setDate(current.getDate() + 7);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    await state.setActiveDate(`${y}-${m}-${d}`);
  });

  container.querySelector('#study-today-btn').addEventListener('click', async () => {
    await state.setActiveDate(state.getTodayDateStr());
  });

  // Restore scroll position or perform initial focus day scroll
  const spreadsheetContainer = container.querySelector('.spreadsheet-container');
  if (spreadsheetContainer) {
    if (savedScrollLeft > 0) {
      spreadsheetContainer.scrollLeft = savedScrollLeft;
    } else if (state.studyScrollNeedsInit) {
      setTimeout(() => {
        const activeDate = state.getActiveDate();
        const activeHeader = container.querySelector(`[id="study-header-${activeDate}"]`);
        if (spreadsheetContainer && activeHeader) {
          const offsetLeft = activeHeader.offsetLeft;
          const containerWidth = spreadsheetContainer.clientWidth;
          spreadsheetContainer.scrollLeft = offsetLeft - (containerWidth / 2) + (activeHeader.clientWidth / 2);
          state.studyScrollNeedsInit = false;
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
        const walk = (x - startX) * 1.5;
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

function enterStudyCellEditMode(cell, date, time, state) {
  const currentHTML = cell.innerHTML;
  cell.innerHTML = `
    <input type="text" class="premium-input" id="inline-study-input" 
           placeholder="Study topic..." 
           style="height: 100%; border: none; font-size:12px; padding:4px;" autofocus>
  `;

  const input = cell.querySelector('#inline-study-input');
  
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
          type: 'study' // Force study category type
        };

        day.schedule.push(newTask);
        
        // Sort by index in intervals
        day.schedule.sort((a, b) => {
          const idxA = state.timeIntervals.indexOf(a.plannedTime);
          const idxB = state.timeIntervals.indexOf(b.plannedTime);
          return idxA - idxB;
        });
        
        await state.updateDay(date, { schedule: day.schedule });
        renderStudy(cell.closest('.view-container'), state);
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

function showStudyCellStatusOverlay(e, cell, date, taskId, state) {
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
        renderStudy(cell.closest('.view-container'), state);
        return;
      }

      if (status === 'completed') {
        task.status = 'completed';
        task.missedReason = '';
        task.actualTime = '';
        confetti({ particleCount: 60, spread: 45, origin: { y: 0.7 } });
      } else if (status === 'missed') {
        showStudyModal("Why was this study hour missed?", "Enter explanation...", async (reason) => {
          task.status = 'missed';
          task.missedReason = reason || 'No reason provided';
          task.actualTime = '';
          await state.updateDay(date, { schedule: day.schedule });
          renderStudy(cell.closest('.view-container'), state);
        });
        return;
      } else if (status === 'delayed') {
        showStudyModal("When was this study block completed?", "e.g. 20:00", async (time) => {
          task.status = 'delayed';
          task.actualTime = time || 'Unknown';
          task.missedReason = '';
          confetti({ particleCount: 30, spread: 30, origin: { y: 0.7 } });
          await state.updateDay(date, { schedule: day.schedule });
          renderStudy(cell.closest('.view-container'), state);
        });
        return;
      } else {
        task.status = 'pending';
        task.missedReason = '';
        task.actualTime = '';
      }
      
      await state.updateDay(date, { schedule: day.schedule });
      renderStudy(cell.closest('.view-container'), state);
    });
  });
}

function showStudyEmptyCellOverlay(e, cell, date, time, state) {
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
        status: 'pending', // Force pending
        missedReason: '',
        actualTime: '',
        type: 'study' // Force study category type
      };
      day.schedule.push(newTask);
      day.schedule.sort((a, b) => {
        const indexA = state.timeIntervals.indexOf(a.plannedTime);
        const indexB = state.timeIntervals.indexOf(b.plannedTime);
        return indexA - indexB;
      });
      await state.updateDay(date, { schedule: day.schedule });
      renderStudy(cell.closest('.view-container'), state);
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
        status: 'pending', // Force pending
        missedReason: '',
        actualTime: '',
        type: 'study' // Force study category type
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
    renderStudy(cell.closest('.view-container'), state);
    window.showToast(`Pasted study block to all days!`);
  });

  overlay.querySelector('[data-action="write"]').addEventListener('click', () => {
    enterStudyCellEditMode(cell, date, time, state);
  });
}

function showStudyModal(title, placeholder, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="st-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <input type="text" class="premium-input" id="st-modal-input" placeholder="${placeholder}" autofocus>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="st-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="st-modal-save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); };
  overlay.querySelector('#st-modal-close').addEventListener('click', close);
  overlay.querySelector('#st-modal-cancel').addEventListener('click', close);
  
  const handleSave = () => {
    const val = overlay.querySelector('#st-modal-input').value.trim();
    onSave(val);
    close();
  };
  overlay.querySelector('#st-modal-save').addEventListener('click', handleSave);
  overlay.querySelector('#st-modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSave();
  });
}
