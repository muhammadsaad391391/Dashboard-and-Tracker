import { icons } from '../icons.js';

export function renderNonNegotiables(container, state) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Create Daily Non-Negotiable</div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
        Non-negotiables are habits or tasks that automatically repeat on every day of the 30-day challenge. They form your foundation for success.
      </p>
      
      <!-- Input bar to add a new recurring task -->
      <div class="manager-input-area">
        <input type="text" id="new-nn-input" class="premium-input" placeholder="e.g. Read 15 pages of philosophy..." style="flex:1;">
        <button class="btn btn-primary" id="add-nn-btn">
          ${icons.plus} Add Habit
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Global Repeating Tasks Checklist</div>
      
      <div class="manager-list" id="nn-items-list">
        ${state.nonNegotiables.length === 0 ? `
          <div class="cell-empty" style="padding: 40px 0;">No repeating habits found. Add your first non-negotiable above.</div>
        ` : state.nonNegotiables.map((nn, index) => `
          <div class="manager-row" data-id="${nn.id}">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
              <!-- Ordering arrows -->
              <div style="display:flex; flex-direction:column; gap:4px;">
                <button class="btn btn-secondary order-arrow-btn nn-up-btn" data-id="${nn.id}" style="padding:2px 6px; height:20px;" ${index === 0 ? 'disabled style="opacity:0.3"' : ''}>▲</button>
                <button class="btn btn-secondary order-arrow-btn nn-down-btn" data-id="${nn.id}" style="padding:2px 6px; height:20px;" ${index === state.nonNegotiables.length - 1 ? 'disabled style="opacity:0.3"' : ''}>▼</button>
              </div>
              
              <!-- Text element -->
              <span class="nn-name-label" id="nn-label-${nn.id}" style="font-weight:600; font-size:14px;">${nn.name}</span>
              <input type="text" class="premium-input nn-edit-input" id="nn-edit-${nn.id}" value="${nn.name}" style="display:none; flex:1; max-width:400px;">
            </div>

            <!-- Actions buttons -->
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm nn-edit-btn" data-id="${nn.id}">${icons.edit} Edit</button>
              <button class="btn btn-primary btn-sm nn-save-btn" data-id="${nn.id}" style="display:none; background:var(--success);">${icons.completed} Save</button>
              <button class="btn btn-danger btn-sm nn-delete-btn" data-id="${nn.id}">${icons.trash} Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // --- Add new habit handler ---
  const addBtn = container.querySelector('#add-nn-btn');
  const addInput = container.querySelector('#new-nn-input');
  
  const handleAdd = async () => {
    const name = addInput.value.trim();
    if (!name) return;
    await state.addNonNegotiable(name);
    addInput.value = '';
  };

  addBtn.addEventListener('click', handleAdd);
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdd();
  });

  // --- List items handlers (Edit, Save, Delete, Order) ---
  container.querySelectorAll('.nn-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const label = container.querySelector(`#nn-label-${id}`);
      const input = container.querySelector(`#nn-edit-${id}`);
      const saveBtn = container.querySelector(`.nn-save-btn[data-id="${id}"]`);
      
      label.style.display = 'none';
      btn.style.display = 'none';
      input.style.display = 'block';
      saveBtn.style.display = 'block';
      input.focus();
    });
  });

  container.querySelectorAll('.nn-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const input = container.querySelector(`#nn-edit-${id}`);
      const newName = input.value.trim();
      
      if (newName) {
        await state.updateNonNegotiable(id, newName);
      } else {
        // Revert UI if empty
        const label = container.querySelector(`#nn-label-${id}`);
        const editBtn = container.querySelector(`.nn-edit-btn[data-id="${id}"]`);
        label.style.display = 'block';
        editBtn.style.display = 'block';
        input.style.display = 'none';
        btn.style.display = 'none';
      }
    });
  });

  container.querySelectorAll('.nn-edit-input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      const id = input.getAttribute('id').replace('nn-edit-', '');
      if (e.key === 'Enter') {
        const newName = input.value.trim();
        if (newName) await state.updateNonNegotiable(id, newName);
      } else if (e.key === 'Escape') {
        renderNonNegotiables(container, state);
      }
    });
  });

  container.querySelectorAll('.nn-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this repeating task globally? Past days completion records for this item will be removed.')) {
        await state.deleteNonNegotiable(id);
      }
    });
  });

  // Reordering controls
  container.querySelectorAll('.nn-up-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const listIds = state.nonNegotiables.map(nn => nn.id);
      const currIndex = listIds.indexOf(id);
      if (currIndex > 0) {
        // Swap IDs
        [listIds[currIndex], listIds[currIndex - 1]] = [listIds[currIndex - 1], listIds[currIndex]];
        await state.reorderNonNegotiables(listIds);
      }
    });
  });

  container.querySelectorAll('.nn-down-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const listIds = state.nonNegotiables.map(nn => nn.id);
      const currIndex = listIds.indexOf(id);
      if (currIndex < listIds.length - 1) {
        // Swap IDs
        [listIds[currIndex], listIds[currIndex + 1]] = [listIds[currIndex + 1], listIds[currIndex]];
        await state.reorderNonNegotiables(listIds);
      }
    });
  });
}
