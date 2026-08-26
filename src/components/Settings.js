import { icons } from '../icons.js';
import confetti from 'canvas-confetti';

export function renderSettings(container, state) {
  container.innerHTML = `
    <!-- Backup and Restore card -->
    <div class="card">
      <div class="card-title">Data Backup & Recovery</div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
        All Aether data is stored locally in your browser's IndexedDB. Export a JSON backup to keep your records safe or transfer them to another device.
      </p>

      <div class="settings-section">
        <!-- Export row -->
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-title">Export Tracking Data</span>
            <span class="settings-row-desc">Generate and download a secure JSON file containing all history.</span>
          </div>
          <button class="btn btn-secondary" id="export-backup-btn">
            ${icons.export} Export Backup
          </button>
        </div>

        <!-- Import row -->
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-title">Import Tracking Data</span>
            <span class="settings-row-desc">Restore or load histories from a previously exported JSON backup.</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <input type="file" id="import-backup-file" accept=".json" style="display:none;">
            <button class="btn btn-secondary" id="trigger-import-btn">
              ${icons.import} Upload JSON
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Intervals Editor card -->
    <div class="card">
      <div class="card-title">Schedule Time Intervals</div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
        Define the fixed time slots available in your daily schedules, study hours, and Etsy + SEO planners. You can add, edit, or delete slots.
      </p>

      <div style="display:flex; flex-direction:column; gap:12px;" id="intervals-editor-container">
        <!-- New Interval entry -->
        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <input type="text" id="new-interval-input" class="premium-input" placeholder="e.g. 05:30 AM - 06:30 AM" style="font-family:var(--font-mono); font-size:13px;">
          <button class="btn btn-primary" id="add-interval-btn" style="white-space:nowrap;">
            ${icons.plus} Add Slot
          </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:10px;" id="intervals-list-area">
          ${state.timeIntervals.map((interval, idx) => `
            <div style="display:flex; align-items:center; justify-content:space-between; background-color:var(--bg-tertiary); padding:10px 14px; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              <span class="interval-text-label" id="interval-lbl-${idx}" style="font-family:var(--font-mono); font-size:13px; font-weight:600;">${interval}</span>
              <input type="text" class="premium-input interval-edit-input" id="interval-edit-${idx}" value="${interval}" style="display:none; flex:1; max-width:140px; font-family:var(--font-mono); font-size:13px; padding: 4px 8px;">
              
              <div style="display:flex; gap:4px;">
                <button class="btn btn-secondary btn-sm edit-interval-btn" data-index="${idx}" style="padding:6px; height:28px; width:28px; justify-content:center;">${icons.edit}</button>
                <button class="btn btn-primary btn-sm save-interval-btn" data-index="${idx}" style="display:none; background:var(--success); padding:6px; height:28px; width:28px; justify-content:center;">${icons.completed}</button>
                <button class="btn btn-danger btn-sm delete-interval-btn" data-index="${idx}" style="padding:6px; height:28px; width:28px; justify-content:center;">${icons.trash}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Custom Planners Manager card -->
    <div class="card">
      <div class="card-title">Custom Category Planners</div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
        Create customized, 7-day rolling spreadsheet grids for specific goals (e.g. "MBBS Study", "Arabic Hub", "Gym Log").
      </p>

      <!-- New Section entry -->
      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px; padding:16px; background-color:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md);">
        <h4 style="font-size:13px; font-weight:700; margin:0;">Create New Section</h4>
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <input type="text" id="new-section-label" class="premium-input" placeholder="e.g. MBBS Hub" style="flex:1; min-width:180px; font-size:13px;">
          
          <select id="new-section-icon" class="premium-select" style="min-width:120px; font-size:13px;">
            <option value="planner">📋 Icon: Planner</option>
            <option value="study">📘 Icon: Study</option>
            <option value="etsy">🍊 Icon: Etsy</option>
            <option value="finance">💰 Icon: Money</option>
          </select>
          
          <button class="btn btn-primary" id="add-section-btn" style="white-space:nowrap;">
            ${icons.plus} Create Section
          </button>
        </div>
      </div>

      <!-- Existing Custom Sections List -->
      <div style="display:flex; flex-direction:column; gap:10px;" id="custom-sections-list-area">
        ${state.customSections.length === 0 ? `
          <div class="cell-empty" style="padding: 20px 0; text-align:center;">No custom sections added yet. Create one above!</div>
        ` : state.customSections.map(sec => `
          <div style="display:flex; align-items:center; justify-content:space-between; background-color:var(--bg-tertiary); padding:12px 16px; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="nav-icon" style="color:var(--accent); display:flex; align-items:center; justify-content:center;">
                ${sec.icon === 'study' ? icons.study : sec.icon === 'etsy' ? icons.etsy : sec.icon === 'finance' ? icons.finance : icons.planner}
              </span>
              <span style="font-size:14px; font-weight:700;">${sec.label}</span>
              <span style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted); background:var(--bg-secondary); padding:2px 6px; border-radius:4px; text-transform:uppercase;">${sec.type}</span>
            </div>
            
            <button class="btn btn-danger btn-sm delete-section-btn" data-id="${sec.id}" style="padding:6px; height:28px; width:28px; justify-content:center;">
              ${icons.trash}
            </button>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- System Control Danger Zone -->
    <div class="card" style="border-color: var(--danger-border); background-color: rgba(239, 68, 68, 0.02)">
      <div class="card-title" style="color:var(--danger)">Danger Zone</div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
        Actions here are destructive and cannot be undone. Always export a backup before executing resets.
      </p>

      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-title">Wipe & Reset System</span>
            <span class="settings-row-desc">Permanently wipe all schedules, financial entries, satisfaction scores, and habits. Re-seed default challenge dates.</span>
          </div>
          <button class="btn btn-danger" id="reset-system-btn">
            ${icons.reset} Hard Reset Data
          </button>
        </div>
      </div>
    </div>
  `;

  // --- Export Backup Event handler ---
  container.querySelector('#export-backup-btn').addEventListener('click', () => {
    try {
      const dataStr = state.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `aether_backup_${timestamp}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      confetti({ particleCount: 50, spread: 35 });
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  });

  // --- Import Backup Event Handlers ---
  const fileInput = container.querySelector('#import-backup-file');
  const triggerBtn = container.querySelector('#trigger-import-btn');

  triggerBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target.result;
        const success = await state.importData(jsonContent);
        if (success) {
          confetti({ particleCount: 80, spread: 60 });
          alert('Backup data successfully imported and synced!');
          state.setView('dashboard'); // Redirect to dashboard
        }
      } catch (err) {
        alert('Failed to import backup: ' + err.message + '. Make sure the JSON file is valid Aether format.');
      }
    };
    reader.readAsText(file);
  });

  // --- Reset Database Handler ---
  container.querySelector('#reset-system-btn').addEventListener('click', async () => {
    const confirmation = confirm('⚠️ CRITICAL WARNING: Are you sure you want to perform a Hard Reset? This will permanently erase all habits, planner logs, satisfaction values, and earnings across all 30 days. This action CANNOT be undone.');
    
    if (confirmation) {
      const finalCheck = confirm('Final Confirmation: Do you really want to clear all data and start over?');
      if (finalCheck) {
        try {
          await state.resetData();
          alert('Aether Space database has been wiped and reset to default seeds!');
          state.setView('dashboard');
        } catch (err) {
          alert('Reset failed: ' + err.message);
        }
      }
    }
  });

  // --- Time Intervals Editor Listeners ---
  const addIntervalBtn = container.querySelector('#add-interval-btn');
  const newIntervalInput = container.querySelector('#new-interval-input');

  if (addIntervalBtn && newIntervalInput) {
    const handleAddInterval = async () => {
      const val = newIntervalInput.value.trim();
      if (val) {
        const updated = [...state.timeIntervals, val];
        await state.updateTimeIntervals(updated);
        renderSettings(container, state);
      }
    };
    addIntervalBtn.addEventListener('click', handleAddInterval);
    newIntervalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddInterval();
    });
  }

  container.querySelectorAll('.edit-interval-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.getAttribute('data-index');
      const label = container.querySelector(`#interval-lbl-${idx}`);
      const input = container.querySelector(`#interval-edit-${idx}`);
      const saveBtn = container.querySelector(`.save-interval-btn[data-index="${idx}"]`);
      
      label.style.display = 'none';
      btn.style.display = 'none';
      input.style.display = 'block';
      saveBtn.style.display = 'block';
      input.focus();
    });
  });

  container.querySelectorAll('.save-interval-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      const input = container.querySelector(`#interval-edit-${idx}`);
      const newVal = input.value.trim();
      const oldVal = state.timeIntervals[idx];
      
      if (newVal && newVal !== oldVal) {
        await state.renameTimeInterval(oldVal, newVal);
      }
      renderSettings(container, state);
    });
  });

  container.querySelectorAll('.delete-interval-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      if (confirm('Delete this time interval slot? This will hide tasks scheduled at this slot across grid views.')) {
        const updated = state.timeIntervals.filter((_, i) => i !== idx);
        await state.updateTimeIntervals(updated);
        renderSettings(container, state);
      }
    });
  });

  // --- Custom Category Sections Manager Listeners ---
  const addSectionBtn = container.querySelector('#add-section-btn');
  const newSectionLabel = container.querySelector('#new-section-label');
  const newSectionIcon = container.querySelector('#new-section-icon');

  if (addSectionBtn && newSectionLabel) {
    const handleAddSection = async () => {
      const label = newSectionLabel.value.trim();
      const icon = newSectionIcon.value;
      if (label) {
        await state.addCustomSection(label, icon);
        confetti({ particleCount: 40, spread: 30 });
        renderSettings(container, state);
      }
    };
    addSectionBtn.addEventListener('click', handleAddSection);
    newSectionLabel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddSection();
    });
  }

  container.querySelectorAll('.delete-section-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const sec = state.customSections.find(s => s.id === id);
      if (!sec) return;
      
      const confirmDelete = confirm(`⚠️ WARNING: Deleting "${sec.label}" will permanently remove this planner section AND delete all tasks associated with it across all dates in your database. This action CANNOT be undone.\n\nAre you sure you want to proceed?`);
      if (confirmDelete) {
        await state.deleteCustomSection(id);
        renderSettings(container, state);
      }
    });
  });
}
