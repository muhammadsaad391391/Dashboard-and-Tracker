import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { icons } from '../icons.js';
import { calculateStreak } from './Header.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

let chartRadar = null;

export function renderAnalytics(container, state) {
  // 1. Core aggregations and computations
  let totalTasks = 0;
  let completedTasksCount = 0;
  let missedTasksCount = 0;
  let satisfactionSum = 0;
  let ratedDaysCount = 0;
  
  const completedTallies = {};
  const missedTallies = {};

  let totalNN = state.nonNegotiables.length;
  let totalNNOpportunities = 0;
  let totalNNDone = 0;
  let savingsDaysCount = 0;
  let profitDaysCount = 0;
  let interactedDaysCount = 0;

  let bestDay = { label: "None yet", score: -1 };
  let worstDay = { label: "None yet", score: 101 };

  state.days.forEach(day => {
    // Check if user has interacted with this day
    const hasInteracted = (day.schedule && day.schedule.some(t => t.status !== 'pending')) ||
                          (day.satisfaction && day.satisfaction.score !== 5 && day.satisfaction.score !== null) ||
                          (day.finance && (day.finance.revenue > 0 || day.finance.expenses > 0 || day.finance.savings > 0));
    
    if (!hasInteracted) return;
    
    interactedDaysCount++;

    // Task tallies
    if (day.schedule) {
      day.schedule.forEach(t => {
        totalTasks++;
        const name = t.name.trim();
        if (t.status === 'completed' || t.status === 'delayed') {
          completedTasksCount++;
          completedTallies[name] = (completedTallies[name] || 0) + 1;
        } else if (t.status === 'missed') {
          missedTasksCount++;
          missedTallies[name] = (missedTallies[name] || 0) + 1;
        }
      });
    }

    // Satisfaction score
    if (day.satisfaction && day.satisfaction.score !== null) {
      satisfactionSum += day.satisfaction.score;
      ratedDaysCount++;
    }

    // Non-negotiables tallies
    if (day.nonNegotiables) {
      Object.keys(day.nonNegotiables).forEach(id => {
        totalNNOpportunities++;
        if (day.nonNegotiables[id] === 'done') {
          totalNNDone++;
        } else if (day.nonNegotiables[id] === 'partial') {
          totalNNDone += 0.5; // partial credit
        }
      });
    }

    // Finance consistency
    if (day.finance) {
      if (day.finance.savings > 0) savingsDaysCount++;
      if ((day.finance.revenue - day.finance.expenses) > 0) profitDaysCount++;
    }

    // Calculate this day's performance score (weighted out of 100)
    // 50% Schedule, 30% Non-negotiables, 20% Satisfaction
    const schedCount = day.schedule ? day.schedule.length : 0;
    const schedDone = day.schedule ? day.schedule.filter(t => t.status === 'completed' || t.status === 'delayed').length : 0;
    const schedRate = schedCount > 0 ? schedDone / schedCount : 1;

    const nnDone = day.nonNegotiables ? Object.values(day.nonNegotiables).filter(v => v === 'done').length : 0;
    const nnRate = totalNN > 0 ? nnDone / totalNN : 1;

    const satVal = day.satisfaction ? day.satisfaction.score : 5;

    const perfScore = Math.round((schedRate * 50) + (nnRate * 30) + (satVal * 2));

    if (perfScore > bestDay.score) {
      bestDay = { label: `Day ${day.dayIndex} (${day.date.substring(5)})`, score: perfScore };
    }
    if (perfScore < worstDay.score && perfScore >= 0) {
      worstDay = { label: `Day ${day.dayIndex} (${day.date.substring(5)})`, score: perfScore };
    }
  });

  // Streaks
  let longestStreak = 0;
  let currentStreak = 0;
  state.days.forEach(day => {
    // We compute consecutive successful days
    const isSuccess = isDaySuccessfulForStreak(day, state.nonNegotiables.length);
    if (isSuccess) {
      currentStreak++;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      const hasInteracted = (day.schedule && day.schedule.some(t => t.status !== 'pending')) ||
                            (day.satisfaction && day.satisfaction.score !== 5 && day.satisfaction.score !== null);
      if (hasInteracted) {
        currentStreak = 0;
      }
    }
  });

  // Calculate most completed task
  let mostCompletedTask = "None yet";
  let maxCompleted = 0;
  for (const [name, count] of Object.entries(completedTallies)) {
    if (count > maxCompleted) {
      maxCompleted = count;
      mostCompletedTask = `${name} (${count}x)`;
    }
  }

  // Calculate most missed task
  let mostMissedTask = "None yet";
  let maxMissed = 0;
  for (const [name, count] of Object.entries(missedTallies)) {
    if (count > maxMissed) {
      maxMissed = count;
      mostMissedTask = `${name} (${count}x)`;
    }
  }

  // Averages
  const taskRate = totalTasks > 0 ? completedTasksCount / totalTasks : 0;
  const habitRate = totalNNOpportunities > 0 ? totalNNDone / totalNNOpportunities : 0;
  const avgSatisfaction = ratedDaysCount > 0 ? satisfactionSum / ratedDaysCount : 5;
  const consistencyScore = Math.round((taskRate * 60) + (habitRate * 40));

  const savingsConsistency = interactedDaysCount > 0 ? (savingsDaysCount / interactedDaysCount) * 100 : 0;
  const profitConsistency = interactedDaysCount > 0 ? (profitDaysCount / interactedDaysCount) * 100 : 0;

  container.innerHTML = `
    <!-- Top Stats row -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card success">
        <span class="stat-label">Daily Consistency</span>
        <span class="stat-value">${consistencyScore}%</span>
        <span class="stat-desc">60% Tasks + 40% Non-negotiables</span>
      </div>

      <div class="stat-card warning">
        <span class="stat-label">Longest Streak</span>
        <span class="stat-value">${longestStreak} Days</span>
        <span class="stat-desc">Consecutive successful days</span>
      </div>

      <div class="stat-card success">
        <span class="stat-label">Best Performing Day</span>
        <span class="stat-value" style="font-size: 15px; height: 35px; display: flex; align-items: center;">${bestDay.label}</span>
        <span class="stat-desc">Score: ${bestDay.score >= 0 ? bestDay.score + '/100' : 'N/A'}</span>
      </div>

      <div class="stat-card danger">
        <span class="stat-label">Worst Performing Day</span>
        <span class="stat-value" style="font-size: 15px; height: 35px; display: flex; align-items: center;">${worstDay.label}</span>
        <span class="stat-desc">Score: ${worstDay.score <= 100 ? worstDay.score + '/100' : 'N/A'}</span>
      </div>
    </div>

    <!-- Secondary aggregations grid -->
    <div class="dashboard-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 32px;">
      <div class="stat-card">
        <span class="stat-label">Most Completed Task</span>
        <span class="stat-value" style="font-size: 14px; font-weight: 700; height: 35px; display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis;">
          ${mostCompletedTask}
        </span>
        <span class="stat-desc">Most frequent schedule tick</span>
      </div>
      
      <div class="stat-card">
        <span class="stat-label">Most Missed Task</span>
        <span class="stat-value" style="font-size: 14px; font-weight: 700; color:var(--danger); height: 35px; display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis;">
          ${mostMissedTask}
        </span>
        <span class="stat-desc">Most frequent missed flag</span>
      </div>
      
      <div class="stat-card">
        <span class="stat-label">Average Satisfaction</span>
        <span class="stat-value" style="color:var(--warning)">${avgSatisfaction.toFixed(1)} / 10</span>
        <span class="stat-desc">Based on subjective daily scores</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">Total Days Active</span>
        <span class="stat-value">${interactedDaysCount} / 30</span>
        <span class="stat-desc">Days with logged activity</span>
      </div>
    </div>

    <div class="charts-grid" style="grid-template-columns: 1.2fr 2fr;">
      <!-- Life Dimensions Radar -->
      <div class="chart-wrapper">
        <div class="card-title">Productivity Balance Matrix</div>
        <canvas id="chart-radar-performance"></canvas>
      </div>

      <!-- Historical Summary List -->
      <div class="card" style="height: 320px; overflow-y: auto; margin: 0;">
        <div class="card-title">Daily Reflection Log</div>
        <div class="task-list">
          ${state.days.filter(d => d.notes && d.notes.trim() !== '').length === 0 ? `
            <div class="cell-empty" style="padding: 60px 0;">No personal notes logged yet. Use the Daily Planner to write daily journals!</div>
          ` : state.days.filter(d => d.notes && d.notes.trim() !== '').map(day => `
            <div class="task-row" style="flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px;">
              <div style="display:flex; justify-content:space-between; width:100%; font-size:12px; font-weight:700;">
                <span>Day ${day.dayIndex} — ${day.label}</span>
                <span style="color: var(--warning)">★ ${day.satisfaction?.score || 'N/A'}/10</span>
              </div>
              <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">
                ${day.notes}
              </div>
              ${day.satisfaction?.successText ? `
                <div style="font-size: 11px; color: var(--success); margin-top: 4px;">
                  <strong>Win:</strong> ${day.satisfaction.successText}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Render Radar Chart
  setTimeout(() => {
    initRadarChart(
      Math.round(taskRate * 100),
      Math.round(habitRate * 100),
      Math.round(avgSatisfaction * 10),
      Math.round(profitConsistency),
      Math.round(savingsConsistency),
      state.theme
    );
  }, 50);
}

function initRadarChart(taskRate, habitRate, satisfactionRate, profitRate, savingsRate, theme) {
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#a1a1aa' : '#475569';
  const accentLight = '#818cf8';

  const ctx = document.getElementById('chart-radar-performance').getContext('2d');
  
  if (chartRadar) chartRadar.destroy();

  chartRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        'Task Completion',
        'Habit Consistency',
        'Subjective Satisfaction',
        'Profit Generation',
        'Savings Discipline'
      ],
      datasets: [{
        label: 'Current Performance Score (%)',
        data: [taskRate, habitRate, satisfactionRate, profitRate, savingsRate],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1a1a1e' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#a1a1aa' : '#475569',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1
        }
      },
      scales: {
        r: {
          grid: { color: gridColor },
          angleLines: { color: gridColor },
          pointLabels: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }
          },
          ticks: {
            display: false,
            stepSize: 20
          },
          min: 0,
          max: 100
        }
      }
    }
  });
}

function isDaySuccessfulForStreak(day, totalNNCount) {
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
