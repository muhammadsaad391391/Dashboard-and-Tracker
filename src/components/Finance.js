import { Chart, BarController, BarElement, LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';
import { icons } from '../icons.js';

// Register Chart.js components
Chart.register(BarController, BarElement, LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

// Store chart instances to destroy on re-render
let chartRevExp = null;
let chartProfitSav = null;
let chartGrowth = null;

export function renderFinance(container, state) {
  const activeDate = state.getActiveDate();
  const [activeYear, activeMonth, activeDayVal] = activeDate.split('-').map(Number);
  
  // 1. Identify Month boundaries and generate all days of the selected month
  const firstDayOfMonth = new Date(activeYear, activeMonth - 1, 1);
  const monthName = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long' });
  const totalDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();

  const monthDays = [];
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let dayObj = state.days.find(day => day.date === dateStr);
    if (!dayObj) {
      dayObj = {
        date: dateStr,
        dayIndex: d,
        label: `${monthName} ${d}, ${activeYear}`,
        weekday: new Date(activeYear, activeMonth - 1, d).toLocaleDateString('en-US', { weekday: 'long' }),
        schedule: [],
        nonNegotiables: {},
        satisfaction: { score: 5, successText: '', improvementText: '' },
        finance: { revenue: 0, expenses: 0, savings: 0 },
        notes: ''
      };
    }
    monthDays.push(dayObj);
  }

  // 2. Perform financial aggregations
  // Sum ALL days in database for Year-End $10,000 target computations
  let totalRevenue = 0;
  let totalExpenses = 0;
  state.days.forEach(day => {
    totalRevenue += day.finance?.revenue || 0;
    totalExpenses += day.finance?.expenses || 0;
  });
  const totalProfit = totalRevenue - totalExpenses;

  // Selected Month aggregations
  let monthlyRevenue = 0;
  let monthlyExpenses = 0;
  
  const labels = [];
  const revenues = [];
  const expenses = [];
  const profits = [];
  const cumProfits = [];
  
  let runningProfit = 0;

  monthDays.forEach(day => {
    const rev = day.finance?.revenue || 0;
    const exp = day.finance?.expenses || 0;
    const profit = rev - exp;

    monthlyRevenue += rev;
    monthlyExpenses += exp;

    labels.push(String(new Date(day.date).getDate()).padStart(2, '0'));
    revenues.push(rev);
    expenses.push(exp);
    profits.push(profit);

    runningProfit += profit;
    cumProfits.push(runningProfit);
  });

  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  // 3. Dynamic target computations for $10,000 challenge till Dec 31
  const targetGoal = 10000;
  const progressPct = Math.max(0, Math.min(100, Math.round((totalProfit / targetGoal) * 100)));
  const remainingGoal = Math.max(0, targetGoal - totalProfit);

  // Calculate days remaining to December 31
  const today = new Date();
  today.setHours(0,0,0,0);
  const endOfYear = new Date(today.getFullYear(), 11, 31); // Dec 31
  const diffTime = endOfYear - today;
  // Calculate remaining calendar days including today
  const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // Daily and monthly needed calculations
  const dailyNeeded = remainingDays > 0 ? remainingGoal / remainingDays : 0;
  const remainingMonths = remainingDays / 30.44; // Avg days in month
  const monthlyNeeded = remainingMonths > 0 ? remainingGoal / remainingMonths : 0;

  // Render HTML structure
  container.innerHTML = `
    <!-- Month Selector Bar -->
    <div class="card" style="padding: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm" id="finance-prev-month-btn">◀ Prev Month</button>
        <span style="font-size: 14px; font-weight: 700; color: var(--text-primary); font-family: var(--font-header);" id="finance-month-label">${monthName} ${activeYear}</span>
        <button class="btn btn-secondary btn-sm" id="finance-next-month-btn">Next Month ▶</button>
        <button class="btn btn-secondary btn-sm" id="finance-current-month-btn" style="margin-left: 6px;">Current Month</button>
      </div>
    </div>

    <!-- Target Progress Card (Horizontal Completion Bar and Daily/Monthly breakdown) -->
    <div class="card" style="display:flex; flex-direction:column; gap:16px; padding:24px; margin-bottom:24px; background:linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(168,85,247,0.04) 100%); border: 1px solid var(--accent);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <h2 style="font-size: 20px; font-weight: 800; margin: 0; background:var(--accent-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-family:var(--font-header);">
          $10,000 Year-End Net Profit Challenge
        </h2>
        <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Target End: Dec 31, ${activeYear}</span>
      </div>
      
      <p style="font-size:13px; color:var(--text-secondary); margin:0; line-height:1.4;">
        Your challenge target is to accumulate **$10,000.00** in total net profit by the end of the year. Fill daily revenue and expenses below to track progress.
      </p>

      <!-- Horizontal Progress Bar for Completion Rate -->
      <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700;">
          <span style="color:var(--text-secondary);">Target Completion Rate:</span>
          <span style="color:var(--accent-light); font-family:var(--font-mono);">${progressPct}%</span>
        </div>
        <div style="width:100%; height:12px; background-color:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:6px; overflow:hidden;">
          <div style="width:${progressPct}%; height:100%; background:var(--accent-gradient); border-radius:6px; transition:width 0.5s ease; box-shadow:0 0 10px rgba(99,102,241,0.5);"></div>
        </div>
      </div>

      <!-- Financial Metrics Breakdown -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-top:8px; padding-top:16px; border-top:1px solid var(--border-color);">
        <div>
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Current Net Profit</div>
          <div style="font-size:18px; font-weight:700; color:${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-family:var(--font-mono);">$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Remaining to Target</div>
          <div style="font-size:18px; font-weight:700; color:var(--text-secondary); font-family:var(--font-mono);">$${remainingGoal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Days Remaining</div>
          <div style="font-size:18px; font-weight:700; color:var(--warning); font-family:var(--font-mono);">${remainingDays} Days</div>
        </div>
      </div>

      <!-- Required daily / monthly velocity alert blocks -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; padding:14px 18px; background-color:rgba(255,255,255,0.015); border:1px solid var(--border-color); border-radius:var(--radius-sm); margin-top:4px;">
        <div>
          <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">Daily Needed:</span>
          <span style="font-size:16px; font-weight:700; color:var(--accent-light); font-family:var(--font-mono); margin-left:6px;">$${dailyNeeded.toFixed(2)}</span>
          <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Needed every day to hit target</div>
        </div>
        <div style="padding-left:0px; border-top:1px solid var(--border-color); padding-top:12px; margin-top:0px;" class="mobile-border-fix">
          <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">Monthly Needed:</span>
          <span style="font-size:16px; font-weight:700; color:var(--accent-light); font-family:var(--font-mono); margin-left:6px;">$${monthlyNeeded.toFixed(2)}</span>
          <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Needed every month to hit target</div>
        </div>
      </div>
    </div>

    <!-- Top Financial Overview Stats -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card earnings">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Month Revenue</span>
        <span class="stat-value">$${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span class="stat-desc">Accumulated ${monthName} revenue</span>
      </div>

      <div class="stat-card danger">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Month Expenses</span>
        <span class="stat-value" style="color:var(--danger)">$${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span class="stat-desc">Accumulated ${monthName} expenses</span>
      </div>

      <div class="stat-card success">
        <span class="stat-icon">${icons.finance}</span>
        <span class="stat-label">Month Net Profit</span>
        <span class="stat-value" style="color: ${monthlyProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">
          $${monthlyProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span class="stat-desc">Month revenue minus expenses</span>
      </div>
    </div>

    <!-- Premium Interactive Charts -->
    <div class="charts-grid">
      <div class="chart-wrapper">
        <div class="card-title">${monthName} Revenue vs Expenses</div>
        <canvas id="chart-rev-exp"></canvas>
      </div>

      <div class="chart-wrapper">
        <div class="card-title">${monthName} Net Profit Trend</div>
        <canvas id="chart-profit-sav"></canvas>
      </div>

      <div class="chart-wrapper" style="grid-column: span 2;">
        <div class="card-title">${monthName} Cumulative Net Profit Curve</div>
        <canvas id="chart-growth"></canvas>
      </div>
    </div>

    <!-- Daily Financial Logs Spreadsheet -->
    <div class="card" style="margin-top: 32px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Daily Financial Logs: ${monthName} ${activeYear}</span>
        <span style="font-size: 11px; font-weight:normal; color:var(--text-secondary);">💡 Click inside any input box to edit. Press Enter or click away to save.</span>
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
            ${monthDays.map(day => {
              const rev = day.finance?.revenue || 0;
              const exp = day.finance?.expenses || 0;
              const profit = rev - exp;
              const dateObj = new Date(day.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const isSelectedDay = day.date === activeDate;
              
              return `
                <tr style="${isSelectedDay ? 'background-color: rgba(99, 102, 241, 0.05);' : ''}">
                  <td class="spreadsheet-td sticky-col" style="text-align:center; font-weight:700; ${isSelectedDay ? 'background-color: var(--bg-tertiary);' : ''}">${day.dayIndex}</td>
                  <td class="spreadsheet-td" style="text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--text-secondary);">${formattedDate}</td>
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

  // Apply responsive CSS border fix styling
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @media (min-width: 600px) {
      .mobile-border-fix {
        border-left: 1px solid var(--border-color) !important;
        padding-left: 16px !important;
        border-top: none !important;
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
    }
  `;
  container.appendChild(styleEl);

  // 4. Render charts
  setTimeout(() => {
    initCharts(labels, revenues, expenses, profits, cumProfits, state.theme);
  }, 50);

  // 5. Attach input change event handlers to save modifications instantly
  container.querySelectorAll('.daily-fin-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const date = input.getAttribute('data-date');
      const field = input.getAttribute('data-field');
      const val = Math.max(0, parseFloat(input.value) || 0);

      const day = state.days.find(d => d.date === date);
      const updates = { finance: { revenue: 0, expenses: 0, savings: 0 } };
      if (day && day.finance) {
        updates.finance = { ...day.finance };
      }
      updates.finance[field] = val;

      await state.updateDay(date, updates);
      
      // Re-render the Finance board
      renderFinance(container, state);
    });
  });

  // 6. Attach Month Navigation listeners
  container.querySelector('#finance-prev-month-btn').addEventListener('click', async () => {
    const d = new Date(activeYear, activeMonth - 2, 15);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    await state.setActiveDate(`${yStr}-${mStr}-${dStr}`);
  });

  container.querySelector('#finance-next-month-btn').addEventListener('click', async () => {
    const d = new Date(activeYear, activeMonth, 15);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    await state.setActiveDate(`${yStr}-${mStr}-${dStr}`);
  });

  container.querySelector('#finance-current-month-btn').addEventListener('click', async () => {
    await state.setActiveDate(state.getTodayDateStr());
  });
}

function initCharts(labels, revenues, expenses, profits, cumProfits, theme) {
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#a1a1aa' : '#475569';

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
