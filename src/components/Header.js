import { icons } from '../icons.js';

export function renderHeader(container, state) {
  const activeDate = state.getActiveDate();
  const activeDay = state.days.find(d => d.date === activeDate);
  const dateLabel = activeDay ? `${activeDay.weekday}, ${activeDay.label}` : activeDate;

  // Calculate task completions
  let totalTasks = 0;
  let completedTasks = 0;
  state.days.forEach(d => {
    if (d.schedule) {
      d.schedule.forEach(t => {
        totalTasks++;
        if (t.status === 'completed' || t.status === 'delayed') {
          completedTasks++;
        }
      });
    }
  });
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // View name mapping for premium header display
  const viewTitles = {
    'dashboard': 'Control Center',
    'planner': 'Daily Planner Space',
    'study': 'Study Hours Planner',
    'etsy-seo': 'Etsy + SEO Hub',
    'non-negotiables': 'Daily Non-Negotiables',
    'finance': 'Financial Hub',
    'analytics': 'Productivity Analytics',
    'calendar': 'Calendar Performance Matrix',
    'settings': 'System Settings'
  };

  const showToggle = !!state.sidebarCollapsed;

  container.innerHTML = `
    <div class="header-title-area" style="display:flex; flex-direction:row; align-items:center; gap:16px;">
      ${showToggle ? `
        <button class="theme-toggle-btn" id="sidebar-collapse-toggle" style="width:36px; height:36px; padding:0; justify-content:center; display:flex; align-items:center;" title="Expand Sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
        </button>
      ` : ''}
      <div style="display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="header-subtitle" style="white-space: nowrap;">Focus Day:</span>
          <div style="display:flex; align-items:center; gap:4px;">
            <button class="btn btn-secondary btn-sm" id="header-prev-day-btn" style="padding: 2px 6px; font-size: 11px; height: 22px; display:flex; align-items:center; justify-content:center;">◀</button>
            <input type="date" id="global-header-date-input" value="${activeDate}" style="font-family:var(--font-sans); font-weight:700; padding: 2px 8px; font-size:11px; height:22px; border-radius:4px; border:1px solid var(--border-color); background-color:var(--bg-tertiary); cursor:pointer; outline:none; color:var(--text-primary);">
            <button class="btn btn-secondary btn-sm" id="header-next-day-btn" style="padding: 2px 6px; font-size: 11px; height: 22px; display:flex; align-items:center; justify-content:center;">▶</button>
            <button class="btn btn-secondary btn-sm" id="header-today-btn" style="padding: 2px 8px; font-size: 11px; height: 22px; display:flex; align-items:center; justify-content:center; margin-left: 4px;">Today</button>
          </div>
          <span class="header-subtitle" style="opacity: 0.6; margin-left: 4px;">— ${dateLabel}</span>
        </div>
        <h1 class="header-title">${viewTitles[state.currentView] || 'Aether Space'}</h1>
      </div>
    </div>
    
    <div class="header-metrics" style="display:flex; align-items:center; gap:20px;">
      <!-- Theme Toggle Button -->
      <button class="theme-toggle-btn" id="header-theme-toggle" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color); border-radius:var(--radius-sm); cursor:pointer; color:var(--text-secondary); background:none;" title="Toggle Theme">
        ${state.theme === 'dark' ? icons.sun : icons.moon}
      </button>

      <div class="header-metric-item">
        <span class="header-metric-val success-text">${completionPercentage}%</span>
        <span class="header-metric-lbl">Completion</span>
      </div>
      
      <div class="header-metric-item">
        <span class="header-metric-val" id="header-earnings-val">$0.00</span>
        <span class="header-metric-lbl">Total Profit</span>
      </div>
      
      <div class="header-metric-item">
        <span class="header-metric-val" id="header-streak-val">0 days</span>
        <span class="header-metric-lbl">Streak</span>
      </div>
    </div>
  `;

  // Calculate earnings dynamically
  let totalProfit = 0;
  state.days.forEach(day => {
    if (day.finance) {
      const rev = day.finance.revenue || 0;
      const exp = day.finance.expenses || 0;
      totalProfit += (rev - exp);
    }
  });

  const headerEarnings = container.querySelector('#header-earnings-val');
  if (headerEarnings) {
    headerEarnings.textContent = `${totalProfit >= 0 ? '' : '-'}$${Math.abs(totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    headerEarnings.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    if (totalProfit >= 0) {
      headerEarnings.classList.add('earnings-text');
    } else {
      headerEarnings.classList.remove('earnings-text');
      headerEarnings.style.webkitTextFillColor = 'initial';
    }
  }

  // Calculate streak dynamically
  const streak = calculateStreak(state.days, activeDate);
  const headerStreak = container.querySelector('#header-streak-val');
  if (headerStreak) {
    headerStreak.textContent = `${streak} day${streak === 1 ? '' : 's'}`;
    if (streak > 0) {
      headerStreak.style.color = 'var(--warning)';
    }
  }

  // Attach collapse toggle click listener
  const toggleBtn = container.querySelector('#sidebar-collapse-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      state.toggleSidebar();
    });
  }

  // Attach date picker listeners
  const globalHeaderDateInput = container.querySelector('#global-header-date-input');
  if (globalHeaderDateInput) {
    globalHeaderDateInput.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val) {
        await state.setActiveDate(val);
        state.setExpandedDayDate(val);
      }
    });
  }

  const prevBtn = container.querySelector('#header-prev-day-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      const current = new Date(state.getActiveDate());
      current.setDate(current.getDate() - 1);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const nextStr = `${y}-${m}-${d}`;
      await state.setActiveDate(nextStr);
      state.setExpandedDayDate(nextStr);
    });
  }

  const nextBtn = container.querySelector('#header-next-day-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      const current = new Date(state.getActiveDate());
      current.setDate(current.getDate() + 1);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const nextStr = `${y}-${m}-${d}`;
      await state.setActiveDate(nextStr);
      state.setExpandedDayDate(nextStr);
    });
  }

  const todayBtn = container.querySelector('#header-today-btn');
  if (todayBtn) {
    todayBtn.addEventListener('click', async () => {
      const nextStr = state.getTodayDateStr();
      await state.setActiveDate(nextStr);
      state.setExpandedDayDate(nextStr);
    });
  }

  const headerThemeToggle = container.querySelector('#header-theme-toggle');
  if (headerThemeToggle) {
    headerThemeToggle.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.setTheme(nextTheme);
    });
  }
}

// Custom streak calculation logic
export function calculateStreak(days, activeDateStr) {
  if (!activeDateStr) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    activeDateStr = `${y}-${m}-${d}`;
  }
  
  let streak = 0;
  let checkDate = new Date(activeDateStr);
  
  // Sort days to check existence
  const activeDay = days.find(d => d.date === activeDateStr);
  const activeHasInteraction = activeDay && (
    (activeDay.schedule && activeDay.schedule.some(t => t.status !== 'pending')) ||
    (activeDay.satisfaction && activeDay.satisfaction.score !== 5 && activeDay.satisfaction.score !== null) ||
    (activeDay.finance && (activeDay.finance.revenue > 0 || activeDay.finance.expenses > 0 || activeDay.finance.savings > 0)) ||
    (activeDay.notes && activeDay.notes.trim() !== '')
  );
  
  if (!activeHasInteraction) {
    // Start checking from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Walk back up to 365 days
  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const curDateStr = `${y}-${m}-${d}`;
    
    const dayData = days.find(d => d.date === curDateStr);
    if (dayData && isDaySuccessful(dayData)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

export function calculateLongestStreak(days) {
  if (days.length === 0) return 0;
  
  // Filter to logged days and sort chronologically
  const loggedDays = days.filter(day => {
    return (day.schedule && day.schedule.some(t => t.status !== 'pending')) ||
           (day.satisfaction && day.satisfaction.score !== 5 && day.satisfaction.score !== null) ||
           (day.finance && (day.finance.revenue > 0 || day.finance.expenses > 0 || day.finance.savings > 0)) ||
           (day.notes && day.notes.trim() !== '');
  }).sort((a, b) => a.date.localeCompare(b.date));
  
  if (loggedDays.length === 0) return 0;
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate = null;
  
  for (const day of loggedDays) {
    if (!isDaySuccessful(day)) {
      currentStreak = 0;
      lastDate = null;
      continue;
    }
    
    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const diffTime = new Date(day.date) - new Date(lastDate);
      const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
      
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
    lastDate = day.date;
  }
  
  return maxStreak;
}

export function isDaySuccessful(day) {
  const totalTasks = day.schedule ? day.schedule.length : 0;
  const completedTasks = day.schedule ? day.schedule.filter(t => t.status === 'completed' || t.status === 'delayed').length : 0;
  const taskRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  
  const satisfaction = day.satisfaction ? day.satisfaction.score : null;
  
  const nonNegValues = day.nonNegotiables ? Object.values(day.nonNegotiables) : [];
  const completedNonNegs = nonNegValues.filter(v => v === 'done').length;
  
  if (totalTasks > 0 && taskRate >= 0.6 && (satisfaction === null || satisfaction >= 6)) return true;
  if (satisfaction !== null && satisfaction >= 8) return true;
  if (completedNonNegs >= 3) return true;
  
  return false;
}
