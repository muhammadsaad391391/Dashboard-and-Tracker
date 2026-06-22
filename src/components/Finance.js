import { Chart, BarController, BarElement, LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';
import { icons } from '../icons.js';

// Register Chart.js components
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

// Store chart instances to destroy on re-render
let chartRevExp = null;
let chartProfitSav = null;
let chartGrowth = null;

export function renderFinance(container, state) {
  // 1. Identify active day (to compute daily and weekly stats)
  const currentChallengeDay = state.getActiveDayIndex();
  const activeDay = state.days.find(d => d.dayIndex === currentChallengeDay);
  const activeDayIndex = activeDay ? activeDay.dayIndex : 4;

  // 2. Perform financial aggregations
  let totalRevenue = 0;
  let totalExpenses = 0;
  let dailyProfit = 0;
  let weeklyRevenue = 0;
  let weeklyExpenses = 0;
  
  // Find which week the active day falls in
  // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-30
  let activeWeek = 1;
  if (activeDayIndex >= 8 && activeDayIndex <= 14) activeWeek = 2;
  else if (activeDayIndex >= 15 && activeDayIndex <= 21) activeWeek = 3;
  else if (activeDayIndex >= 22 && activeDayIndex <= 28) activeWeek = 4;
  else if (activeDayIndex >= 29) activeWeek = 5;

  const labels = [];
  const revenues = [];
  const expenses = [];
  const profits = [];
  const cumProfits = [];
  
  let runningProfit = 0;

  state.days.forEach(day => {
    const rev = day.finance?.revenue || 0;
    const exp = day.finance?.expenses || 0;
    const profit = rev - exp;

    // Globals
    totalRevenue += rev;
    totalExpenses += exp;

    // Array trackers for charts
    labels.push(`Day ${day.dayIndex}`);
    revenues.push(rev);
    expenses.push(exp);
    profits.push(profit);

    // Cumulative sums
    runningProfit += profit;
    cumProfits.push(runningProfit);

    // Today/Active day specifically
    if (day.dayIndex === activeDayIndex) {
      dailyProfit = profit;
    }

    // Weekly aggregator
    let dayWeek = 1;
    if (day.dayIndex >= 8 && day.dayIndex <= 14) dayWeek = 2;
    else if (day.dayIndex >= 15 && day.dayIndex <= 21) dayWeek = 3;
    else if (day.dayIndex >= 22 && day.dayIndex <= 28) dayWeek = 4;
    else if (day.dayIndex >= 29) dayWeek = 5;

    if (dayWeek === activeWeek) {
      weeklyRevenue += rev;
      weeklyExpenses += exp;
    }
  });

  const totalProfit = totalRevenue - totalExpenses;
  const weeklyProfit = weeklyRevenue - weeklyExpenses;
  const avgDailyProfit = totalProfit / 30;

  // $1k Net Profit Target Circle calculations
  const targetGoal = 1000;
  const progressPct = Math.max(0, Math.min(100, Math.round((totalProfit / targetGoal) * 100)));
  const progressOffset = 251.2 - (251.2 * progressPct) / 100;
  const remainingGoal = targetGoal - totalProfit;

  // Render HTML structure
  container.innerHTML = `
    <!-- Target Progress Card -->
    <div class="card" style="display:flex; align-items:center; gap:32px; padding:24px; margin-bottom:24px; flex-wrap:wrap; background:linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%); border: 1px solid var(--accent);">
      <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg viewBox="0 0 100 100" style="width:120px; height:120px; transform: rotate(-90deg);">
          <circle cx="50" cy="50" r="40" stroke="var(--border-color)" stroke-width="6" fill="transparent" />
          <circle cx="50" cy="50" r="40" stroke="url(#progress-grad)" stroke-width="8" stroke-linecap="round" fill="transparent"
            stroke-dasharray="251.2" stroke-dashoffset="${progressOffset}" style="transition: stroke-dashoffset 0.5s ease;" />
          <defs>
            <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6366f1" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <div style="position:absolute; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
          <span style="font-family:var(--font-header); font-size:24px; font-weight:800; color:var(--text-primary); line-height:1;">${progressPct}%</span>
          <span style="font-size:10px; color:var(--text-secondary); margin-top:2px; text-transform:uppercase;">Goal</span>
        </div>
      </div>
      
      <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
        <h2 style="font-size: 20px; font-weight: 800; margin: 0; background:var(--accent-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          $1,000 Net Profit Target
        </h2>
        <p style="font-size:13px; color:var(--text-secondary); margin:0; line-height:1.4;">
          Your target for this 30-day challenge is to accumulate **$1,000.00** in net profit. Update your daily logs in the table below to track your progress!
        </p>
        <div style="display:flex; gap:24px; margin-top:4px;">
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Current Profit</div>
            <div style="font-size:18px; font-weight:700; color:${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-family:var(--font-mono);">$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Target Goal</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); font-family:var(--font-mono);">$1,000.00</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Remaining</div>
            <div style="font-size:18px; font-weight:700; color:${remainingGoal <= 0 ? 'var(--success)' : 'var(--text-secondary)'}; font-family:var(--font-mono);">
              $${Math.max(0, remainingGoal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Financial Overview Stats -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card earnings">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Total Revenue</span>
        <span class="stat-value">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span class="stat-desc">Accumulated challenge revenue</span>
      </div>

      <div class="stat-card danger">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Total Expenses</span>
        <span class="stat-value" style="color:var(--danger)">$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span class="stat-desc">Accumulated challenge expenses</span>
      </div>

      <div class="stat-card success">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Net Profit</span>
        <span class="stat-value" style="color: ${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
          $${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span class="stat-desc">Revenue minus expenses</span>
      </div>
    </div>

    <!-- Secondary Tracker section showing breakdown -->
    <div class="section-title" style="font-size:18px; margin-bottom:16px;">
      Financial Breakdown (Focused on Day ${activeDayIndex})
    </div>
    
    <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 32px;">
      <div class="stat-card">
        <span class="stat-label">Daily Earnings</span>
        <span class="stat-value" style="font-size: 22px; color: ${dailyProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
          $${dailyProfit.toFixed(2)}
        </span>
        <span class="stat-desc">Today's Net Profit</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Weekly Earnings</span>
        <span class="stat-value" style="font-size: 22px; color: ${weeklyProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
          $${weeklyProfit.toFixed(2)}
        </span>
        <span class="stat-desc">Week ${activeWeek} Net Profit</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Avg Daily Profit</span>
        <span class="stat-value" style="font-size: 22px; color: var(--accent-light)">
          $${avgDailyProfit.toFixed(2)}
        </span>
        <span class="stat-desc">Total Net Profit / 30 Days</span>
      </div>
    </div>

    <!-- Premium Interactive Charts -->
    <div class="charts-grid">
      <div class="chart-wrapper">
        <div class="card-title">Revenue vs Expenses (Daily)</div>
        <canvas id="chart-rev-exp"></canvas>
      </div>

      <div class="chart-wrapper">
        <div class="card-title">Net Profit Trend</div>
        <canvas id="chart-profit-sav"></canvas>
      </div>

      <div class="chart-wrapper" style="grid-column: span 2;">
        <div class="card-title">Cumulative Net Profit Curve</div>
        <canvas id="chart-growth"></canvas>
      </div>
    </div>

    <!-- Daily Financial Logs Spreadsheet -->
    <div class="card" style="margin-top: 32px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Daily Financial Logs</span>
        <span style="font-size: 11px; font-weight:normal; color:var(--text-secondary);">💡 Click inside any input box to edit. Press Enter or click away to save and update calculations automatically.</span>
      </div>
      <div class="spreadsheet-container" style="max-height: 400px; overflow-y: auto; border:1px solid var(--border-color); border-radius:var(--radius-md);">
        <table class="spreadsheet-table" style="width: 100%; border-collapse: separate; border-spacing: 0;">
          <thead>
            <tr>
              <th class="spreadsheet-th sticky-col" style="z-index: 25; background-color: var(--bg-tertiary); text-align:center;">Day</th>
              <th class="spreadsheet-th" style="text-align:center;">Date</th>
              <th class="spreadsheet-th" style="text-align:right; padding-right:16px;">Revenue ($)</th>
              <th class="spreadsheet-th" style="text-align:right; padding-right:16px;">Expenses ($)</th>
              <th class="spreadsheet-th" style="text-align:right; padding-right:24px;">Net Profit ($)</th>
            </tr>
          </thead>
          <tbody>
            ${state.days.map(day => {
              const rev = day.finance?.revenue || 0;
              const exp = day.finance?.expenses || 0;
              const profit = rev - exp;
              
              return `
                <tr>
                  <td class="spreadsheet-td sticky-col" style="text-align:center; font-weight:700;">Day ${day.dayIndex}</td>
                  <td class="spreadsheet-td" style="text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--text-secondary);">${day.date.substring(5)}</td>
                  <td class="spreadsheet-td" style="text-align:right;">
                    <input type="number" class="premium-input daily-fin-input" data-date="${day.date}" data-field="revenue" value="${rev}" step="any" style="width: 100px; text-align:right; font-family:var(--font-mono); font-weight:600; padding: 4px 8px; font-size: 13px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary);">
                  </td>
                  <td class="spreadsheet-td" style="text-align:right;">
                    <input type="number" class="premium-input daily-fin-input" data-date="${day.date}" data-field="expenses" value="${exp}" step="any" style="width: 100px; text-align:right; font-family:var(--font-mono); font-weight:600; padding: 4px 8px; font-size: 13px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background-color: var(--bg-secondary); color: var(--text-primary);">
                  </td>
                  <td class="spreadsheet-td" id="daily-profit-display-${day.date}" style="text-align:right; font-family:var(--font-mono); font-weight:700; padding-right:24px; color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    $${profit.toFixed(2)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 3. Render charts inside requestAnimationFrame or setTimeout
  setTimeout(() => {
    initCharts(labels, revenues, expenses, profits, cumProfits, state.theme);
  }, 50);

  // 4. Attach input change event handlers to save modifications instantly
  container.querySelectorAll('.daily-fin-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const date = input.getAttribute('data-date');
      const field = input.getAttribute('data-field');
      const val = Math.max(0, parseFloat(input.value) || 0);

      const day = state.days.find(d => d.date === date);
      if (day) {
        day.finance = day.finance || { revenue: 0, expenses: 0, savings: 0 };
        day.finance[field] = val;

        await state.updateDay(date, { finance: day.finance });
        
        // Re-render the Finance board to update cards and charts dynamically!
        renderFinance(container, state);
      }
    });
  });
}

function initCharts(labels, revenues, expenses, profits, cumProfits, theme) {
  // Theme options
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#a1a1aa' : '#475569';

  // Helper chart configurations
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor, font: { family: 'Inter', size: 11 } }
      },
      tooltip: {
        backgroundColor: isDark ? '#1a1a1e' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#0f172a',
        bodyColor: isDark ? '#a1a1aa' : '#475569',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        font: { family: 'Inter' }
      }
    },
    scales: {
      x: {
        grid: { color: 'transparent' },
        ticks: { color: textColor, font: { family: 'Space Grotesk', size: 9 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Space Grotesk', size: 9 } }
      }
    }
  };

  // Destroy existing charts to prevent memory leak / duplicate renders
  if (chartRevExp) chartRevExp.destroy();
  if (chartProfitSav) chartProfitSav.destroy();
  if (chartGrowth) chartGrowth.destroy();

  // Chart 1: Revenue vs Expenses (Bar Chart)
  const ctxRevExp = document.getElementById('chart-rev-exp').getContext('2d');
  chartRevExp = new Chart(ctxRevExp, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenues,
          backgroundColor: 'rgba(16, 185, 129, 0.65)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Expenses ($)',
          data: expenses,
          backgroundColor: 'rgba(239, 68, 68, 0.65)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: commonOptions
  });

  // Chart 2: Net Profit Trend (Line Chart)
  const ctxProfitSav = document.getElementById('chart-profit-sav').getContext('2d');
  chartProfitSav = new Chart(ctxProfitSav, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Net Profit ($)',
          data: profits,
          borderColor: '#6366f1',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 1,
          pointHoverRadius: 4
        }
      ]
    },
    options: commonOptions
  });

  // Chart 3: Cumulative Net Profit Curve (Line Chart with Area fill)
  const ctxGrowth = document.getElementById('chart-growth').getContext('2d');
  
  // Custom Gradient for fill
  const gradProfit = ctxGrowth.createLinearGradient(0, 0, 0, 300);
  gradProfit.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
  gradProfit.addColorStop(1, 'rgba(99, 102, 241, 0)');

  chartGrowth = new Chart(ctxGrowth, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cumulative Net Profit ($)',
          data: cumProfits,
          borderColor: '#6366f1',
          backgroundColor: gradProfit,
          fill: true,
          borderWidth: 3,
          tension: 0.2,
          pointRadius: 2
        }
      ]
    },
    options: commonOptions
  });
}
