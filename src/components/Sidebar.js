import { icons } from '../icons.js';

export function renderSidebar(container, state) {
  // 1. Calculate overall progress across the entire 30-day challenge
  let totalTasks = 0;
  let completedTasks = 0;
  
  state.days.forEach(day => {
    if (day.schedule) {
      day.schedule.forEach(task => {
        totalTasks++;
        if (task.status === 'completed' || task.status === 'delayed') {
          completedTasks++;
        }
      });
    }
  });
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Circumference for radius=20 is 2 * Math.PI * 20 = 125.66
  const strokeDashoffset = totalTasks > 0 ? 125.66 - (125.66 * completionPercentage) / 100 : 125.66;

  const navItems = [
    { view: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
    { view: 'planner', label: 'Daily Planner', icon: icons.planner },
    { view: 'projects', label: 'Project Hub', icon: icons.projects },
    { view: 'study', label: 'Study Planner', icon: icons.study },
    { view: 'etsy-seo', label: 'Etsy + SEO', icon: icons.etsy }
  ];

  // Inject custom sections dynamically
  state.customSections.forEach(sec => {
    let secIcon = icons.planner;
    if (sec.icon === 'study') secIcon = icons.study;
    else if (sec.icon === 'etsy') secIcon = icons.etsy;
    else if (sec.icon === 'finance') secIcon = icons.finance;
    
    navItems.push({
      view: sec.id,
      label: sec.label,
      icon: secIcon
    });
  });

  navItems.push(
    { view: 'non-negotiables', label: 'Non-Negotiables', icon: icons.nonNegotiables },
    { view: 'finance', label: 'Money Hub', icon: icons.finance },
    { view: 'analytics', label: 'Analytics', icon: icons.analytics },
    { view: 'calendar', label: 'Calendar Grid', icon: icons.calendar },
    { view: 'settings', label: 'Settings', icon: icons.settings }
  );

  const themeIcon = state.theme === 'dark' ? icons.sun : icons.moon;
  const themeLabel = state.theme === 'dark' ? 'Light Mode' : 'Dark Mode';

  container.innerHTML = `
    <div class="sidebar-logo" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="sidebar-logo-icon">Æ</div>
        <span>AETHER</span>
      </div>
      <button id="sidebar-close-btn" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center; outline:none;" title="Collapse Sidebar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
    </div>
    
    <nav class="sidebar-nav">
      ${navItems.map(item => `
        <a class="nav-item ${state.currentView === item.view ? 'active' : ''}" data-view="${item.view}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>
    
    <div class="sidebar-footer">
      <div class="sidebar-progress">
        <svg class="progress-circle-svg" viewBox="0 0 50 50">
          <circle class="progress-ring-bg" cx="25" cy="25" r="20" />
          <circle class="progress-ring-fg" cx="25" cy="25" r="20" 
            style="stroke-dasharray: 125.66; stroke-dashoffset: ${strokeDashoffset};" />
        </svg>
        <div class="progress-info">
          <span class="progress-percentage">${completionPercentage}%</span>
          <span class="progress-label">Task Completion</span>
        </div>
      </div>
      
      <!-- Premium Sliding Theme Switch -->
      <div class="theme-switch-wrapper" id="sidebar-theme-switch" data-theme="${state.theme}">
        <div class="theme-switch-option ${state.theme === 'dark' ? 'active' : ''}" data-val="dark">
          <span class="nav-icon" style="width:14px; height:14px; margin-right:4px;">${icons.moon}</span>
          <span>Dark</span>
        </div>
        <div class="theme-switch-option ${state.theme === 'light' ? 'active' : ''}" data-val="light">
          <span class="nav-icon" style="width:14px; height:14px; margin-right:4px;">${icons.sun}</span>
          <span>Light</span>
        </div>
        <div class="theme-switch-thumb"></div>
      </div>
    </div>
  `;

  // Attach event handlers
  container.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      state.setView(view);
      if (window.innerWidth <= 768) {
        state.toggleSidebar(true);
      }
    });
  });

  const closeBtn = container.querySelector('#sidebar-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      state.toggleSidebar();
    });
  }

  const themeSwitch = container.querySelector('#sidebar-theme-switch');
  if (themeSwitch) {
    themeSwitch.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.setTheme(nextTheme);
    });
  }
}
