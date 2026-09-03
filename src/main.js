import { state } from './state.js';
import { renderSidebar } from './components/Sidebar.js';
import { renderHeader } from './components/Header.js';
import { renderDashboard } from './components/Dashboard.js';
import { renderPlanner } from './components/Planner.js';
import { renderNonNegotiables } from './components/NonNegotiables.js';
import { renderFinance } from './components/Finance.js';
import { renderAnalytics } from './components/Analytics.js';
import { renderCalendar } from './components/Calendar.js';
import { renderSettings } from './components/Settings.js';
import { renderStudy } from './components/Study.js';
import { renderEtsySeo } from './components/EtsySeo.js';
import { renderCategoryTracker } from './components/CategoryTracker.js';
import { renderProjects } from './components/Projects.js';
import { icons } from './icons.js';

// Elements
const appContainer = document.getElementById('app');
const sidebarContainer = document.getElementById('sidebar-container');
const headerContainer = document.getElementById('header-container');
const viewContainer = document.getElementById('view-container');
const appLoader = document.getElementById('app-loader');

// Global router-renderer mapping active state views to modules
function renderApp(appState) {
  if (!appState.initialized) return;

  // Preserve scroll positions before DOM modifications
  const docScrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  const docScrollLeft = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
  const viewScrollTop = viewContainer ? viewContainer.scrollTop : 0;
  const viewScrollLeft = viewContainer ? viewContainer.scrollLeft : 0;
  
  // Track inner scroll positions of scrollable elements
  const innerScrolls = [];
  if (viewContainer) {
    viewContainer.querySelectorAll('.task-list, .spreadsheet-container, .table-wrapper, #chat-messages-log').forEach((el, idx) => {
      if (el.scrollTop > 0 || el.scrollLeft > 0) {
        innerScrolls.push({
          selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
          index: idx,
          top: el.scrollTop,
          left: el.scrollLeft
        });
      }
    });
  }

  // Toggle sidebar-collapsed class on the app container
  if (appContainer) {
    appContainer.classList.toggle('sidebar-collapsed', !!appState.sidebarCollapsed);
  }

  // 1. Render Sidebar & Header layout frames
  renderSidebar(sidebarContainer, appState);
  renderHeader(headerContainer, appState);

  // 2. Render targeted View
  switch (appState.currentView) {
    case 'dashboard':
      renderDashboard(viewContainer, appState);
      break;
    case 'planner':
      renderPlanner(viewContainer, appState);
      break;
    case 'non-negotiables':
      renderNonNegotiables(viewContainer, appState);
      break;
    case 'finance':
      renderFinance(viewContainer, appState);
      break;
    case 'analytics':
      renderAnalytics(viewContainer, appState);
      break;
    case 'calendar':
      renderCalendar(viewContainer, appState);
      break;
    case 'settings':
      renderSettings(viewContainer, appState);
      break;
    case 'projects':
      renderProjects(viewContainer, appState);
      break;
    case 'study':
      renderStudy(viewContainer, appState);
      break;
    case 'etsy-seo':
      renderEtsySeo(viewContainer, appState);
      break;
    default:
      if (appState.currentView.startsWith('sec-')) {
        const customSec = appState.customSections.find(s => s.id === appState.currentView);
        if (customSec) {
          let secIcon = icons.planner;
          if (customSec.icon === 'study') secIcon = icons.study;
          else if (customSec.icon === 'etsy') secIcon = icons.etsy;
          else if (customSec.icon === 'finance') secIcon = icons.finance;
          
          renderCategoryTracker(viewContainer, appState, customSec.id, customSec.label, customSec.type, secIcon);
        } else {
          viewContainer.innerHTML = `<div class="card">Custom Section "${appState.currentView}" not found.</div>`;
        }
      } else {
        viewContainer.innerHTML = `<div class="card">View "${appState.currentView}" is not implemented.</div>`;
      }
  }

  // 3. Remove application loader once initialized & rendered
  if (appLoader) {
    appLoader.style.opacity = '0';
    setTimeout(() => {
      appLoader.style.display = 'none';
    }, 500);
  }

  // 4. Restore selection outlines on newly rendered cells
  updateSelectionHighlights();

  // 5. Restore scroll positions immediately & in next frame
  const restoreScrollPositions = () => {
    window.scrollTo(docScrollLeft, docScrollTop);
    if (viewContainer) {
      viewContainer.scrollTop = viewScrollTop;
      viewContainer.scrollLeft = viewScrollLeft;
      innerScrolls.forEach(item => {
        const els = viewContainer.querySelectorAll(item.selector);
        const target = els[item.index] || els[0];
        if (target) {
          target.scrollTop = item.top;
          target.scrollLeft = item.left;
        }
      });
    }
  };
  restoreScrollPositions();
  requestAnimationFrame(restoreScrollPositions);
}

// Subscribe global render trigger to state changes
state.subscribe(renderApp);

// Run initial render if state is already initialized
if (state.initialized) {
  renderApp(state);
}

// Global Clipboard Toast notification helper
export function showToast(message) {
  let toast = document.getElementById('aether-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'aether-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      box-shadow: var(--glass-shadow);
      padding: 12px 20px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      z-index: 10000;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 0;
      transform: translateY(10px);
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 2500);
}
window.showToast = showToast; // Bind globally

// Global cell selection state tracking & highlighting
export function updateSelectionHighlights() {
  document.querySelectorAll('.cell-task').forEach(c => {
    c.classList.remove('selected-cell');
    const existingHandle = c.querySelector('.selection-handle');
    if (existingHandle) existingHandle.remove();
  });
  
  if (state.selectedCells && state.selectedCells.length > 0) {
    state.selectedCells.forEach(cellData => {
      const selector = `.cell-task[data-date="${cellData.date}"][data-time="${cellData.time}"]`;
      document.querySelectorAll(selector).forEach(c => c.classList.add('selected-cell'));
    });

    // Find the bottom-right cell of the selection to anchor selection drag-handle
    let maxCol = -1;
    let maxRow = -1;
    state.selectedCells.forEach(cell => {
      if (cell.colIdx > maxCol) maxCol = cell.colIdx;
      if (cell.rowIdx > maxRow) maxRow = cell.rowIdx;
    });

    if (maxCol !== -1 && maxRow !== -1) {
      const targetCell = document.querySelector(`.cell-task[data-col-idx="${maxCol}"][data-row-idx="${maxRow}"]`);
      if (targetCell) {
        const handle = document.createElement('div');
        handle.className = 'selection-handle';
        handle.style.cssText = `
          position: absolute;
          right: -5px;
          bottom: -5px;
          width: 12px;
          height: 12px;
          background-color: var(--accent);
          border: 2px solid var(--bg-secondary);
          border-radius: 50%;
          cursor: nwse-resize;
          z-index: 100;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          touch-action: none;
        `;
        targetCell.appendChild(handle);
      }
    }
  }
}
window.updateSelectionHighlights = updateSelectionHighlights;

let isSelecting = false;
let isDraggingHandle = false;

// Selection Mousedown Delegation
document.addEventListener('mousedown', (e) => {
  const cell = e.target.closest('.cell-task');
  if (!cell) return;
  
  // Ignore clicks inside inputs, overlays, select boxes, action buttons, or selection handles
  if (e.target.tagName === 'INPUT' || e.target.closest('.status-popup') || e.target.closest('button') || e.target.closest('select') || e.target.closest('.selection-handle')) {
    return;
  }
  
  if (e.button !== 0) return; // Left clicks only

  const colIdx = parseInt(cell.getAttribute('data-col-idx'));
  const rowIdx = parseInt(cell.getAttribute('data-row-idx'));
  const date = cell.getAttribute('data-date');
  const time = cell.getAttribute('data-time');
  const taskId = cell.getAttribute('data-task-id') || null;

  // Track if this cell was already selected prior to this click sequence
  const wasSelectedBefore = state.selectedCells.some(c => c.date === date && c.time === time);
  cell.setAttribute('data-was-selected-before', wasSelectedBefore ? 'true' : 'false');

  if (e.ctrlKey || e.metaKey) {
    const existsIdx = state.selectedCells.findIndex(c => c.date === date && c.time === time);
    if (existsIdx !== -1) {
      state.selectedCells.splice(existsIdx, 1);
    } else {
      state.selectedCells.push({ date, time, taskId, colIdx, rowIdx });
    }
    state.selectionAnchor = { date, time, colIdx, rowIdx };
    state.selectionCursor = { date, time, colIdx, rowIdx };
  } else if (e.shiftKey && state.selectionAnchor) {
    const anchorCol = state.selectionAnchor.colIdx;
    const anchorRow = state.selectionAnchor.rowIdx;

    const minCol = Math.min(anchorCol, colIdx);
    const maxCol = Math.max(anchorCol, colIdx);
    const minRow = Math.min(anchorRow, rowIdx);
    const maxRow = Math.max(anchorRow, rowIdx);

    const newSelection = [];
    document.querySelectorAll('.cell-task').forEach(c => {
      const cCol = parseInt(c.getAttribute('data-col-idx'));
      const cRow = parseInt(c.getAttribute('data-row-idx'));
      if (cCol >= minCol && cCol <= maxCol && cRow >= minRow && cRow <= maxRow) {
        newSelection.push({
          date: c.getAttribute('data-date'),
          time: c.getAttribute('data-time'),
          taskId: c.getAttribute('data-task-id') || null,
          colIdx: cCol,
          rowIdx: cRow
        });
      }
    });
    state.selectedCells = newSelection;
    state.selectionCursor = { date, time, colIdx, rowIdx };
  } else {
    state.selectedCells = [{ date, time, taskId, colIdx, rowIdx }];
    state.selectionAnchor = { date, time, colIdx, rowIdx };
    state.selectionCursor = { date, time, colIdx, rowIdx };
    isSelecting = true;
  }
  updateSelectionHighlights();
});

// Drag Selection Mouseover
document.addEventListener('mouseover', (e) => {
  if (!isSelecting || !state.selectionAnchor) return;
  const cell = e.target.closest('.cell-task');
  if (!cell) return;

  const colIdx = parseInt(cell.getAttribute('data-col-idx'));
  const rowIdx = parseInt(cell.getAttribute('data-row-idx'));
  const date = cell.getAttribute('data-date');
  const time = cell.getAttribute('data-time');

  state.selectionCursor = { date, time, colIdx, rowIdx };

  const anchorCol = state.selectionAnchor.colIdx;
  const anchorRow = state.selectionAnchor.rowIdx;

  const minCol = Math.min(anchorCol, colIdx);
  const maxCol = Math.max(anchorCol, colIdx);
  const minRow = Math.min(anchorRow, rowIdx);
  const maxRow = Math.max(anchorRow, rowIdx);

  const newSelection = [];
  document.querySelectorAll('.cell-task').forEach(c => {
    const cCol = parseInt(c.getAttribute('data-col-idx'));
    const cRow = parseInt(c.getAttribute('data-row-idx'));
    if (cCol >= minCol && cCol <= maxCol && cRow >= minRow && cRow <= maxRow) {
      newSelection.push({
        date: c.getAttribute('data-date'),
        time: c.getAttribute('data-time'),
        taskId: c.getAttribute('data-task-id') || null,
        colIdx: cCol,
        rowIdx: cRow
      });
    }
  });
  state.selectedCells = newSelection;
  updateSelectionHighlights();
});

// End Drag Selecting
document.addEventListener('mouseup', () => {
  isSelecting = false;
});

// Click outside grid cells clears selection, but second-click on same cell opens context menu
document.addEventListener('click', (e) => {
  const cell = e.target.closest('.cell-task');
  if (cell) {
    const wasSelectedBefore = cell.getAttribute('data-was-selected-before') === 'true';
    cell.removeAttribute('data-was-selected-before');
    
    if (wasSelectedBefore && !e.target.closest('.selection-handle')) {
      // Toggle Context menu directly on mobile/touch selection tapping
      showSpreadsheetContextMenu(e);
    }
    return;
  }

  // Avoid clearing when clicking options, wrappers, menus, modals, or handles
  if (e.target.closest('.spreadsheet-container') || e.target.closest('.status-popup') || e.target.closest('.modal-content') || e.target.closest('#inline-cell-input') || e.target.closest('#inline-study-input') || e.target.closest('#inline-etsy-input') || e.target.closest('.quick-add-task-btn') || e.target.closest('.inline-dashboard-input') || e.target.closest('#spreadsheet-context-menu') || e.target.closest('.selection-handle')) {
    return;
  }
  state.selectedCells = [];
  state.selectionAnchor = null;
  state.selectionCursor = null;
  updateSelectionHighlights();
});

// Mobile touch long-press detection for opening spreadsheet context menu cleanly
let touchTimer = null;
let touchMoved = false;

document.addEventListener('touchstart', (e) => {
  const cell = e.target.closest('.cell-task');
  if (!cell) return;
  touchMoved = false;

  touchTimer = setTimeout(() => {
    if (!touchMoved) {
      if (navigator.vibrate) navigator.vibrate(40);
      const touch = e.touches ? e.touches[0] : null;
      if (!touch) return;
      const date = cell.getAttribute('data-date');
      const time = cell.getAttribute('data-time');
      const colIdx = parseInt(cell.getAttribute('data-col-idx'));
      const rowIdx = parseInt(cell.getAttribute('data-row-idx'));
      const taskId = cell.getAttribute('data-task-id') || null;
      state.selectedCells = [{ date, time, taskId, colIdx, rowIdx }];
      state.selectionAnchor = { date, time, colIdx, rowIdx };
      updateSelectionHighlights();
      showSpreadsheetContextMenu({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }, 500);
}, { passive: true });

document.addEventListener('touchmove', () => {
  touchMoved = true;
  if (touchTimer) clearTimeout(touchTimer);
}, { passive: true });

document.addEventListener('touchend', () => {
  if (touchTimer) clearTimeout(touchTimer);
}, { passive: true });

// Reusable Copy method (copies structure and resets status to pending)
export function performCopy() {
  if (state.selectedCells && state.selectedCells.length > 0) {
    // Find top-left cell in selection as anchor
    let anchor = state.selectedCells[0];
    state.selectedCells.forEach(cell => {
      if (cell.colIdx < anchor.colIdx || (cell.colIdx === anchor.colIdx && cell.rowIdx < anchor.rowIdx)) {
        anchor = cell;
      }
    });

    const copiedTasks = [];
    state.selectedCells.forEach(cell => {
      const day = state.days.find(d => d.date === cell.date);
      if (day) {
        const task = day.schedule.find(t => t.plannedTime === cell.time);
        if (task) {
          copiedTasks.push({
            name: task.name,
            status: 'pending', // Store as pending
            type: task.type,
            colOffset: cell.colIdx - anchor.colIdx,
            rowOffset: cell.rowIdx - anchor.rowIdx
          });
        }
      }
    });

    if (copiedTasks.length > 0) {
      state.clipboard = {
        tasks: copiedTasks,
        anchorTime: anchor.time
      };
      showToast(`Copied ${copiedTasks.length} task${copiedTasks.length === 1 ? '' : 's'}`);
    }
  }
}

// Reusable Paste method (always pastes as pending status)
export async function performPaste() {
  if (state.selectedCells && state.selectedCells.length > 0 && state.clipboard && state.clipboard.tasks) {
    let targetAnchor = state.selectedCells[0];
    state.selectedCells.forEach(cell => {
      if (cell.colIdx < targetAnchor.colIdx || (cell.colIdx === targetAnchor.colIdx && cell.rowIdx < targetAnchor.rowIdx)) {
        targetAnchor = cell;
      }
    });

    const updatesMap = [];
    let forcedType = null;
    if (state.currentView === 'study') forcedType = 'study';
    else if (state.currentView === 'etsy-seo') forcedType = 'etsy_seo';
    else if (state.currentView.startsWith('sec-')) {
      const customSec = state.customSections.find(s => s.id === state.currentView);
      if (customSec) forcedType = customSec.type;
    }

    const activeWeekDays = state.getDaysForActiveWeek();

    state.clipboard.tasks.forEach(task => {
      const targetColIdx = targetAnchor.colIdx + task.colOffset;
      const targetRowIdx = targetAnchor.rowIdx + task.rowOffset;

      const day = activeWeekDays[targetColIdx];
      const timeSlot = state.timeIntervals[targetRowIdx];

      if (day && timeSlot) {
        let dayUpdate = updatesMap.find(u => u.date === day.date);
        if (!dayUpdate) {
          dayUpdate = { date: day.date, schedule: [...day.schedule] };
          updatesMap.push(dayUpdate);
        }

        const existingIndex = dayUpdate.schedule.findIndex(t => t.plannedTime === timeSlot);
        const newTask = {
          id: 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          name: task.name,
          plannedTime: timeSlot,
          status: 'pending', // Always force pending on paste
          missedReason: '',
          actualTime: '',
          type: forcedType || task.type || 'general'
        };

        if (existingIndex !== -1) {
          dayUpdate.schedule[existingIndex] = newTask;
        } else {
          dayUpdate.schedule.push(newTask);
          dayUpdate.schedule.sort((a, b) => {
            const indexA = state.timeIntervals.indexOf(a.plannedTime);
            const indexB = state.timeIntervals.indexOf(b.plannedTime);
            return indexA - indexB;
          });
        }
      }
    });

    if (updatesMap.length > 0) {
      const updates = updatesMap.map(u => ({ date: u.date, updates: { schedule: u.schedule } }));
      await state.updateDaysBulk(updates);
      showToast(`Pasted ${state.clipboard.tasks.length} task${state.clipboard.tasks.length === 1 ? '' : 's'}`);
      setTimeout(updateSelectionHighlights, 50);
    }
  }
}

// Right Click Context Menu on Spreadsheet grids
document.addEventListener('contextmenu', (e) => {
  const cell = e.target.closest('.cell-task');
  if (!cell) return;

  e.preventDefault(); // Block default browser menu

  const date = cell.getAttribute('data-date');
  const time = cell.getAttribute('data-time');
  const colIdx = parseInt(cell.getAttribute('data-col-idx'));
  const rowIdx = parseInt(cell.getAttribute('data-row-idx'));
  const taskId = cell.getAttribute('data-task-id') || null;

  // Select the cell if it's not already in selection list
  const isAlreadySelected = state.selectedCells.some(c => c.date === date && c.time === time);
  if (!isAlreadySelected) {
    state.selectedCells = [{ date, time, taskId, colIdx, rowIdx }];
    state.selectionAnchor = { date, time, colIdx, rowIdx };
    updateSelectionHighlights();
  }

  showSpreadsheetContextMenu(e);
});

function showSpreadsheetContextMenu(e) {
  const existing = document.getElementById('spreadsheet-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'spreadsheet-context-menu';
  menu.style.cssText = `
    position: fixed;
    top: ${e.clientY}px;
    left: ${e.clientX}px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    border-radius: var(--radius-sm);
    padding: 6px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 170px;
  `;

  // Determine if selection has tasks to copy or clear
  const hasSelectedTasks = state.selectedCells.some(cell => {
    const day = state.days.find(d => d.date === cell.date);
    return day && day.schedule.some(t => t.plannedTime === cell.time);
  });

  const hasClipboard = !!(state.clipboard && (state.clipboard.name || (state.clipboard.tasks && state.clipboard.tasks.length > 0)));
  const singleCellSelected = state.selectedCells.length === 1;

  let menuHtml = '';

  if (singleCellSelected) {
    const selected = state.selectedCells[0];
    const isTask = !!selected.taskId;
    menuHtml += `
      <div class="context-option" data-action="edit">
        ${isTask ? '✍ Edit Task Details' : '➕ Add Task Here'}
      </div>
      <div class="context-option" data-action="select-day">
        📅 Select Entire Day (${selected.date})
      </div>
      <div style="height:1px; background-color:var(--border-color); margin: 4px 0;"></div>
    `;
  }

  menuHtml += `
    <div class="context-option ${hasSelectedTasks ? '' : 'disabled'}" data-action="copy" style="${hasSelectedTasks ? '' : 'opacity: 0.5; pointer-events: none;'}">
      📋 Copy Selected
    </div>
    <div class="context-option ${hasClipboard ? '' : 'disabled'}" data-action="paste" style="${hasClipboard ? '' : 'opacity: 0.5; pointer-events: none;'}">
      📋 Paste relative to selection
    </div>
    <div style="height:1px; background-color:var(--border-color); margin: 4px 0;"></div>
    <div class="context-option text-danger ${hasSelectedTasks ? '' : 'disabled'}" data-action="clear" style="color: var(--danger); ${hasSelectedTasks ? '' : 'opacity: 0.5; pointer-events: none;'}">
      ❌ Clear Selection
    </div>
  `;

  menu.innerHTML = menuHtml;
  document.body.appendChild(menu);

  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
    document.removeEventListener('scroll', closeMenu, true);
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('scroll', closeMenu, { capture: true, once: true });
  }, 50);

  menu.querySelectorAll('.context-option').forEach(opt => {
    if (opt.classList.contains('disabled')) return;
    opt.addEventListener('click', async (event) => {
      event.stopPropagation();
      const action = opt.getAttribute('data-action');
      closeMenu();

      if (action === 'edit') {
        const selected = state.selectedCells[0];
        const cellEl = document.querySelector(`.cell-task[data-date="${selected.date}"][data-time="${selected.time}"]`);
        if (cellEl) {
          cellEl.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: e.clientX,
            clientY: e.clientY
          }));
        }
      } else if (action === 'select-day') {
        const selected = state.selectedCells[0];
        if (selected) {
          const newSelection = [];
          document.querySelectorAll(`.cell-task[data-date="${selected.date}"]`).forEach(c => {
            newSelection.push({
              date: c.getAttribute('data-date'),
              time: c.getAttribute('data-time'),
              taskId: c.getAttribute('data-task-id') || null,
              colIdx: parseInt(c.getAttribute('data-col-idx')),
              rowIdx: parseInt(c.getAttribute('data-row-idx'))
            });
          });
          state.selectedCells = newSelection;
          updateSelectionHighlights();
          showToast(`Selected ${newSelection.length} slots for ${selected.date}`);
        }
      } else if (action === 'copy') {
        performCopy();
      } else if (action === 'paste') {
        await performPaste();
      } else if (action === 'clear') {
        const updatesMap = [];
        state.selectedCells.forEach(cell => {
          const day = state.days.find(d => d.date === cell.date);
          if (day) {
            let dayUpdate = updatesMap.find(u => u.date === day.date);
            if (!dayUpdate) {
              dayUpdate = { date: day.date, schedule: [...day.schedule] };
              updatesMap.push(dayUpdate);
            }
            dayUpdate.schedule = dayUpdate.schedule.filter(t => t.plannedTime !== cell.time);
          }
        });

        if (updatesMap.length > 0) {
          const updates = updatesMap.map(u => ({ date: u.date, updates: { schedule: u.schedule } }));
          await state.updateDaysBulk(updates);
          showToast(`Cleared tasks in selection`);
          setTimeout(updateSelectionHighlights, 50);
        }
      }
    });
  });
}

document.addEventListener('keydown', async (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Arrow keys spreadsheet cell navigation & Shift + Arrow expansion
  const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (arrowKeys.includes(e.key) && state.selectedCells && state.selectedCells.length > 0) {
    e.preventDefault();

    // Ensure we have selectionAnchor and selectionCursor references
    if (!state.selectionCursor && state.selectedCells.length > 0) {
      const last = state.selectedCells[state.selectedCells.length - 1];
      state.selectionCursor = { colIdx: last.colIdx, rowIdx: last.rowIdx, date: last.date, time: last.time };
    }
    if (!state.selectionAnchor && state.selectedCells.length > 0) {
      const first = state.selectedCells[0];
      state.selectionAnchor = { colIdx: first.colIdx, rowIdx: first.rowIdx, date: first.date, time: first.time };
    }

    let nextCol = state.selectionCursor.colIdx;
    let nextRow = state.selectionCursor.rowIdx;

    if (e.key === 'ArrowUp') nextRow--;
    if (e.key === 'ArrowDown') nextRow++;
    if (e.key === 'ArrowLeft') nextCol--;
    if (e.key === 'ArrowRight') nextCol++;

    const nextCell = document.querySelector(`.cell-task[data-col-idx="${nextCol}"][data-row-idx="${nextRow}"]`);
    if (nextCell) {
      const nextDate = nextCell.getAttribute('data-date');
      const nextTime = nextCell.getAttribute('data-time');
      const nextTaskId = nextCell.getAttribute('data-task-id') || null;

      state.selectionCursor = { colIdx: nextCol, rowIdx: nextRow, date: nextDate, time: nextTime };

      if (e.shiftKey) {
        // Expand selection range from Anchor to Cursor
        const anchorCol = state.selectionAnchor.colIdx;
        const anchorRow = state.selectionAnchor.rowIdx;

        const minCol = Math.min(anchorCol, nextCol);
        const maxCol = Math.max(anchorCol, nextCol);
        const minRow = Math.min(anchorRow, nextRow);
        const maxRow = Math.max(anchorRow, nextRow);

        const newSelection = [];
        document.querySelectorAll('.cell-task').forEach(c => {
          const cCol = parseInt(c.getAttribute('data-col-idx'));
          const cRow = parseInt(c.getAttribute('data-row-idx'));
          if (cCol >= minCol && cCol <= maxCol && cRow >= minRow && cRow <= maxRow) {
            newSelection.push({
              date: c.getAttribute('data-date'),
              time: c.getAttribute('data-time'),
              taskId: c.getAttribute('data-task-id') || null,
              colIdx: cCol,
              rowIdx: cRow
            });
          }
        });
        state.selectedCells = newSelection;
      } else {
        // Move selection to a single new cell
        state.selectionAnchor = { colIdx: nextCol, rowIdx: nextRow, date: nextDate, time: nextTime };
        state.selectedCells = [{ date: nextDate, time: nextTime, taskId: nextTaskId, colIdx: nextCol, rowIdx: nextRow }];
      }

      updateSelectionHighlights();

      // Scroll nextCell into view if it overflows the scrolling element container
      nextCell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    return;
  }

  const isEnter = e.key === 'Enter';
  if (isEnter && state.selectedCells && state.selectedCells.length === 1) {
    const selected = state.selectedCells[0];
    const cellEl = document.querySelector(`.cell-task[data-date="${selected.date}"][data-time="${selected.time}"]`);
    if (cellEl && !cellEl.querySelector('input')) {
      e.preventDefault();
      const rect = cellEl.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: clientX,
        clientY: clientY
      });
      cellEl.dispatchEvent(dblClickEvent);
      return;
    }
  }

  const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
  const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';

  if (isCopy) {
    performCopy();
  }

  if (isPaste) {
    e.preventDefault();
    await performPaste();
  }
});

// Mobile Sidebar Overlay Backdrop Click
const sidebarOverlay = document.getElementById('sidebar-overlay');
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    state.toggleSidebar(true);
  });
}
