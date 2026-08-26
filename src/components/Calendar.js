import { icons } from '../icons.js';
import { isDaySuccessful } from './Header.js';

export function renderCalendar(container, state) {
  const activeDate = state.getActiveDate();
  const [activeYear, activeMonth, activeDay] = activeDate.split('-').map(Number);
  
  // Calculate first day of the month and its weekday offset (Mon-Sun)
  const firstDayOfMonth = new Date(activeYear, activeMonth - 1, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Sunday=6, Monday=0, Tuesday=1...
  
  const totalDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const monthName = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long' });
  
  // Weekday headers (Monday first)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayHeaderHtml = weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('');
  
  const cells = [];
  
  // Fill offset cells
  for (let i = 0; i < startOffset; i++) {
    cells.push(`<div class="calendar-cell inactive"></div>`);
  }
  
  // Fill days of the month
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = state.days.find(day => day.date === dateStr);
    
    cells.push(renderDayCell(d, dateStr, dayData, state));
  }
  
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:32px;">
      
      <!-- MONTHLY HEATMAP CARD -->
      <div class="card" style="margin-bottom: 0;">
        <div class="card-title" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn btn-secondary btn-sm" id="calendar-prev-month-btn" style="padding: 2px 8px; font-size:11px; height:24px;">◀ Prev Month</button>
            <span style="font-size: 16px; font-weight:800; color:var(--text-primary); text-align:center; min-width:130px;">${monthName} ${activeYear}</span>
            <button class="btn btn-secondary btn-sm" id="calendar-next-month-btn" style="padding: 2px 8px; font-size:11px; height:24px;">Next Month ▶</button>
          </div>
          <button class="btn btn-secondary btn-sm" id="calendar-current-month-btn" style="padding: 2px 8px; font-size:11px; height:24px;">Current Month</button>
        </div>
        <div class="calendar-grid-wrapper">
          <div class="calendar-grid" style="grid-template-columns: repeat(7, 1fr);">
            ${weekdayHeaderHtml}
            ${cells.join('')}
          </div>
        </div>
      </div>

    </div>
  `;

  // Attach event click handlers
  container.querySelectorAll('.calendar-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', async () => {
      const date = cell.getAttribute('data-date');
      await state.setActiveDate(date);
      state.setExpandedDayDate(date);
      state.setView('planner');
    });
  });

  // Attach Month navigation listeners
  container.querySelector('#calendar-prev-month-btn').addEventListener('click', async () => {
    const d = new Date(activeYear, activeMonth - 2, 15);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    await state.setActiveDate(`${yStr}-${mStr}-${dStr}`);
  });

  container.querySelector('#calendar-next-month-btn').addEventListener('click', async () => {
    const d = new Date(activeYear, activeMonth, 15);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    await state.setActiveDate(`${yStr}-${mStr}-${dStr}`);
  });

  container.querySelector('#calendar-current-month-btn').addEventListener('click', async () => {
    await state.setActiveDate(state.getTodayDateStr());
  });
}

function renderDayCell(dayNum, dateStr, dayData, state) {
  // If no dayData exists in IndexedDB yet, render as clickable blank neutral cell
  if (!dayData) {
    const todayStr = state.getTodayDateStr();
    const isToday = dateStr === todayStr;
    return `
      <div class="calendar-cell ${isToday ? 'today-highlight' : ''}" data-date="${dateStr}" style="cursor: pointer; opacity: 0.65; border: 1px dashed var(--border-color);">
        <span class="calendar-cell-num">${dayNum}</span>
        <div class="calendar-cell-info">
          <span class="calendar-cell-rate" style="font-size: 8px; color: var(--text-muted); text-transform:lowercase;">unlogged</span>
        </div>
      </div>
    `;
  }

  // Calculate day completion status: Green (Success), Yellow (Mixed), Red (Poor)
  const totalTasks = dayData.schedule.length;
  const completedTasks = dayData.schedule.filter(t => t.status === 'completed' || t.status === 'delayed').length;
  const taskRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  
  const nonNegValues = Object.values(dayData.nonNegotiables || {});
  const completedNonNegs = nonNegValues.filter(v => v === 'done').length;

  const satScore = dayData.satisfaction?.score;

  // Check interaction
  const hasInteracted = dayData.schedule.some(t => t.status !== 'pending') || 
                        (dayData.satisfaction && dayData.satisfaction.score !== 5 && dayData.satisfaction.score !== null) ||
                        Object.keys(dayData.nonNegotiables).length > 0;

  let statusClass = '';
  let performanceLabel = '';

  if (hasInteracted) {
    const isSuccessful = isDaySuccessful(dayData);
    const isPoor = (totalTasks > 0 && taskRate < 0.3) && (satScore !== null && satScore <= 4) && (completedNonNegs <= 1);

    if (isSuccessful) {
      statusClass = 'day-status-green';
      performanceLabel = 'GREAT';
    } else if (isPoor) {
      statusClass = 'day-status-red';
      performanceLabel = 'POOR';
    } else {
      statusClass = 'day-status-yellow';
      performanceLabel = 'MIXED';
    }
  }

  const completionPercentText = totalTasks > 0 ? `${Math.round(taskRate * 100)}%` : '0%';
  const todayStr = state.getTodayDateStr();
  const isToday = dateStr === todayStr;

  return `
    <div class="calendar-cell ${statusClass} ${isToday ? 'today-highlight' : ''}" data-date="${dateStr}" style="cursor: pointer;">
      <span class="calendar-cell-num" style="${isToday ? 'font-weight: 800; text-decoration: underline;' : ''}">${dayNum}</span>
      <div class="calendar-cell-info">
        <span class="calendar-cell-rate">${hasInteracted ? completionPercentText : ''}</span>
        <span class="calendar-cell-sat">${hasInteracted ? performanceLabel : ''}</span>
      </div>
    </div>
  `;
}
