import { icons } from '../icons.js';
import { isDaySuccessful } from './Header.js';

export function renderCalendar(container, state) {
  // We need to render June 2026 and July 2026 side-by-side or stacked.
  // Challenge runs: June 13, 2026 -> July 12, 2026.
  
  // Weekday headers (Monday first)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayHeaderHtml = weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('');

  // 1. Generate June 2026 Grid
  // June 1, 2026 is a Monday (index 0 in Mon-Sun scale)
  const juneOffset = 0; // Monday start
  const juneDaysCount = 30;
  const juneCells = [];
  
  // Fill offset cells (none needed since June 1 is Monday, but let's calculate programmatically)
  // Get day of week for June 1: (Date.getDay() returns 0 for Sunday, 1 for Monday...)
  // To map Sunday=6, Monday=0, Tuesday=1 ...
  const juneFirstDay = new Date(2026, 5, 1);
  const juneStartOffset = (juneFirstDay.getDay() + 6) % 7; // Sunday=6, Monday=0, Tue=1...
  
  for (let i = 0; i < juneStartOffset; i++) {
    juneCells.push(`<div class="calendar-cell inactive"></div>`);
  }
  
  for (let d = 1; d <= juneDaysCount; d++) {
    const dateStr = `2026-06-${String(d).padStart(2, '0')}`;
    const dayData = state.days.find(day => day.date === dateStr);
    
    juneCells.push(renderDayCell(d, dateStr, dayData, state));
  }

  // 2. Generate July 2026 Grid
  // July 1, 2026 is a Wednesday (index 2 in Mon-Sun scale)
  const julyFirstDay = new Date(2026, 6, 1);
  const julyStartOffset = (julyFirstDay.getDay() + 6) % 7; 
  const julyDaysCount = 31;
  const julyCells = [];

  // Offset cells
  for (let i = 0; i < julyStartOffset; i++) {
    julyCells.push(`<div class="calendar-cell inactive"></div>`);
  }

  for (let d = 1; d <= julyDaysCount; d++) {
    const dateStr = `2026-07-${String(d).padStart(2, '0')}`;
    const dayData = state.days.find(day => day.date === dateStr);

    julyCells.push(renderDayCell(d, dateStr, dayData, state));
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:32px;">
      
      <!-- JUNE 2026 CARD -->
      <div class="card" style="margin-bottom: 0;">
        <div class="card-title" style="margin-bottom:20px;">
          <span>June 2026</span>
          <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono)">Challenge Days 1 - 18</span>
        </div>
        <div class="calendar-grid-wrapper">
          <div class="calendar-grid" style="grid-template-columns: repeat(7, 1fr);">
            ${weekdayHeaderHtml}
            ${juneCells.join('')}
          </div>
        </div>
      </div>

      <!-- JULY 2026 CARD -->
      <div class="card" style="margin-bottom: 0;">
        <div class="card-title" style="margin-bottom:20px;">
          <span>July 2026</span>
          <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono)">Challenge Days 19 - 30</span>
        </div>
        <div class="calendar-grid-wrapper">
          <div class="calendar-grid" style="grid-template-columns: repeat(7, 1fr);">
            ${weekdayHeaderHtml}
            ${julyCells.join('')}
          </div>
        </div>
      </div>

    </div>
  `;

  // Attach event click handlers
  container.querySelectorAll('.calendar-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-date');
      state.setExpandedDayDate(date);
      state.setView('planner');
    });
  });
}

function renderDayCell(dayNum, dateStr, dayData, state) {
  // If not inside challenge, render grayed cell
  if (!dayData) {
    return `<div class="calendar-cell inactive"><span class="calendar-cell-num">${dayNum}</span></div>`;
  }

  // Calculate day completion status: Green (Success), Yellow (Mixed), Red (Poor)
  // Default is neutral if user hasn't logged anything yet.
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
    // Evaluation rules
    const isSuccessful = isDaySuccessful(dayData);
    
    // Poor day if completion rate < 30% and satisfaction < 5
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

  return `
    <div class="calendar-cell ${statusClass}" data-date="${dateStr}">
      <span class="calendar-cell-num">${dayNum}</span>
      <div class="calendar-cell-info">
        <span class="calendar-cell-rate">${hasInteracted ? completionPercentText : ''}</span>
        <span class="calendar-cell-sat">${hasInteracted ? performanceLabel : ''}</span>
      </div>
    </div>
  `;
}
