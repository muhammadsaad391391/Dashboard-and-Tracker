export function renderHeader(container, state) {
  const currentChallengeDay = state.getActiveDayIndex();
  const activeDay = state.days.find(d => d.dayIndex === currentChallengeDay);
  const dateLabel = activeDay ? activeDay.label : "June 13, 2026";

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

  container.innerHTML = `
    <div class="header-title-area" style="display:flex; align-items:center; gap:16px;">
      <button class="theme-toggle-btn" id="sidebar-collapse-toggle" style="width:36px; height:36px; padding:0; justify-content:center; display:flex; align-items:center;" title="Toggle Sidebar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>
      <div style="display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="header-subtitle" style="white-space: nowrap;">Focus Day:</span>
          <select id="global-header-day-selector" style="font-family:var(--font-sans); font-weight:700; padding: 2px 24px 2px 8px; font-size:11px; height:22px; border-radius:4px; border:1px solid var(--border-color); background-color:var(--bg-tertiary); cursor:pointer; outline:none; color:var(--text-primary); margin-top:-2px;">
            ${state.days.map(d => `
              <option value="${d.dayIndex}" ${d.dayIndex === currentChallengeDay ? 'selected' : ''}>Day ${d.dayIndex} (${d.date.substring(5)})</option>
            `).join('')}
          </select>
          <span class="header-subtitle" style="opacity: 0.6; margin-left: 4px;">— ${dateLabel}</span>
        </div>
        <h1 class="header-title">${viewTitles[state.currentView] || 'Aether Space'}</h1>
      </div>
    </div>
    
    <div class="header-metrics">
      <div class="header-metric-item">
        <span class="header-metric-val success-text">${completionPercentage}%</span>
        <span class="header-metric-lbl">Completion</span>
      </div>
      
      <div class="header-metric-item">
        <span class="header-metric-val earnings-text" id="header-earnings-val">$0.00</span>
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
  const streak = calculateStreak(state.days);
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

  // Attach global day selector change listener
  const globalDaySelector = container.querySelector('#global-header-day-selector');
  if (globalDaySelector) {
    globalDaySelector.addEventListener('change', (e) => {
      const dayIndex = parseInt(e.target.value);
      state.setActiveDayIndex(dayIndex);

      // If we are in Planner view, expand the newly selected day card
      const targetDay = state.days.find(d => d.dayIndex === dayIndex);
      if (targetDay) {
        state.setExpandedDayDate(targetDay.date);
      }
    });
  }
}

// Custom streak calculation logic
export function calculateStreak(days) {
  let maxStreak = 0;
  let currentStreak = 0;
  
  // Sort days by dayIndex
  const sortedDays = [...days].sort((a, b) => a.dayIndex - b.dayIndex);
  
  for (const day of sortedDays) {
    // Check if user has interacted with this day
    const hasInteracted = (day.schedule && day.schedule.some(t => t.status !== 'pending')) ||
                          (day.satisfaction && day.satisfaction.score !== 5 && day.satisfaction.score !== null) ||
                          (day.finance && (day.finance.revenue > 0 || day.finance.expenses > 0 || day.finance.savings > 0)) ||
                          (day.notes && day.notes.trim() !== '');
    
    if (!hasInteracted) {
      // It is a future day, stop counting
      break;
    }
    
    if (isDaySuccessful(day)) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }
  
  return currentStreak; // Return current active streak
}

export function isDaySuccessful(day) {
  // Criteria for a successful day:
  // 1. Task completion rate >= 60%
  const totalTasks = day.schedule ? day.schedule.length : 0;
  const completedTasks = day.schedule ? day.schedule.filter(t => t.status === 'completed' || t.status === 'delayed').length : 0;
  const taskRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  
  // 2. Satisfaction score >= 6
  const satisfaction = day.satisfaction ? day.satisfaction.score : null;
  
  // 3. Non-negotiables: at least 3 completed if any non-negotiables are set
  const nonNegValues = day.nonNegotiables ? Object.values(day.nonNegotiables) : [];
  const completedNonNegs = nonNegValues.filter(v => v === 'done').length;
  
  // Day is successful if:
  // - There are tasks and completion rate >= 60% AND satisfaction >= 6
  // - OR satisfaction is very high (>= 8)
  // - OR completed non-negotiables >= 3
  if (totalTasks > 0 && taskRate >= 0.6 && (satisfaction === null || satisfaction >= 6)) return true;
  if (satisfaction !== null && satisfaction >= 8) return true;
  if (completedNonNegs >= 3) return true;
  
  return false;
}
