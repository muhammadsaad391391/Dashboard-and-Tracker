import { db, seedDatabase } from './db.js';
import { getRandomQuote } from './quotes.js';

class AppState {
  constructor() {
    this.currentView = 'dashboard';
    this.theme = 'dark';
    this.days = [];
    this.nonNegotiables = [];
    this.timeIntervals = [];
    this.sessionQuote = getRandomQuote();
    this.listeners = new Set();
    this.expandedDayDate = null;
    this.activeDayIndex = null;
    this.initialized = false;
    this.plannerScrollNeedsInit = true;
    this.studyScrollNeedsInit = true;
    this.etsyScrollNeedsInit = true;
    this.selectedCells = [];
    this.selectionAnchor = null;
  }

  getTodayDateStr() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getActiveDate() {
    return this.activeDate || this.getTodayDateStr();
  }

  async setActiveDate(dateStr) {
    this.activeDate = dateStr;
    await this.ensureActiveWeekExists(dateStr);
    await db.settings.put({ key: 'active_date', value: this.activeDate });
    this.notify();
  }

  getActiveDayIndex() {
    const active = this.getActiveDate();
    const [year, month, day] = active.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 ? 7 : dayOfWeek;
  }

  async setActiveDayIndex(index) {
    // Retained for compatibility. Map index (1-7) to corresponding date in active week
    const weekDays = this.getDaysForActiveWeek();
    const dayObj = weekDays[index - 1];
    if (dayObj) {
      await this.setActiveDate(dayObj.date);
    }
  }

  getDaysForActiveWeek() {
    const active = this.getActiveDate();
    const [year, month, day] = active.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      weekDates.push(`${y}-${m}-${da}`);
    }
    
    return weekDates.map(dateStr => {
      return this.days.find(d => d.date === dateStr);
    }).filter(Boolean);
  }

  async ensureActiveWeekExists(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      weekDates.push({
        dateStr: `${y}-${m}-${da}`,
        label: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayIndex: i + 1
      });
    }
    
    let dbChanged = false;
    for (const wd of weekDates) {
      let dayObj = this.days.find(d => d.date === wd.dateStr);
      if (!dayObj) {
        dayObj = {
          date: wd.dateStr,
          dayIndex: wd.dayIndex,
          label: wd.label,
          weekday: wd.weekday,
          schedule: [],
          nonNegotiables: {},
          satisfaction: { score: 5, successText: '', improvementText: '' },
          finance: { revenue: 0, expenses: 0, savings: 0 },
          notes: ''
        };
        await db.days.put(JSON.parse(JSON.stringify(dayObj)));
        this.days.push(dayObj);
        dbChanged = true;
      }
    }
    
    if (dbChanged) {
      this.days = await db.days.toArray();
    }
  }

  // Set active expanded day in list view
  setExpandedDayDate(date) {
    this.expandedDayDate = date;
    this.notify();
  }

  // Subscribe components to state updates
  subscribe(listener) {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Notify all subscribed components
  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  }

  // Initialize DB, seed if empty, and fetch variables
  async init() {
    if (this.initialized) return;
    
    // Seed DB if it's the first run
    await seedDatabase();

    // Perform database migration to update non-negotiables to user's 10 daily essentials
    const nnVersionSetting = await db.settings.get('non_negotiables_version');
    const nnVersion = nnVersionSetting ? nnVersionSetting.value : 0;
    if (nnVersion < 2) {
      await db.nonNegotiables.clear();
      const userEssentials = [
        { id: 'nn-seo', name: 'SEO', order: 0 },
        { id: 'nn-quran', name: 'Quran', order: 1 },
        { id: 'nn-arabic', name: 'Arabic', order: 2 },
        { id: 'nn-exercise', name: 'Exercise', order: 3 },
        { id: 'nn-mbbs', name: 'Extraordinary in MBBS', order: 4 },
        { id: 'nn-communication', name: 'Communication', order: 5 },
        { id: 'nn-social', name: 'Quit Social media', order: 6 },
        { id: 'nn-phone', name: 'Quit Mobile Phone', order: 7 },
        { id: 'nn-read', name: 'Read Book about 10 mins daily', order: 8 },
        { id: 'nn-schedule', name: 'Make and report daily schedule', order: 9 }
      ];
      await db.nonNegotiables.bulkAdd(userEssentials);
      await db.settings.put({ key: 'non_negotiables_version', value: 2 });
    }
    
    // Load theme from settings
    const themeSetting = await db.settings.get('theme');
    this.theme = themeSetting ? themeSetting.value : 'dark';
    document.documentElement.className = this.theme;

    // Load active view
    const viewSetting = await db.settings.get('current_view');
    this.currentView = viewSetting ? viewSetting.value : 'dashboard';

    // Load active date setting
    const activeDateSetting = await db.settings.get('active_date');
    this.activeDate = activeDateSetting ? activeDateSetting.value : this.getTodayDateStr();
    await this.ensureActiveWeekExists(this.activeDate);

    // Set initial sidebar collapse status for wide views
    const view = this.currentView;
    this.sidebarCollapsed = (view === 'planner' || view === 'study' || view === 'etsy-seo' || view === 'finance' || view === 'calendar');

    await this.fetchData();
    this.initialized = true;
    this.notify();
  }

  // Fetch lists directly from IndexedDB
  async fetchData() {
    this.days = await db.days.toArray();
    // Sort days chronologically by date string
    this.days.sort((a, b) => a.date.localeCompare(b.date));

    this.nonNegotiables = await db.nonNegotiables.toArray();
    this.nonNegotiables.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const intervalsSetting = await db.settings.get('time_intervals');
    this.timeIntervals = intervalsSetting ? intervalsSetting.value : [
      '04:30 AM - 05:30 AM',
      '05:30 AM - 06:30 AM',
      '06:30 AM - 07:30 AM',
      '07:30 AM - 08:30 AM',
      '08:30 AM - 09:30 AM',
      '09:30 AM - 10:30 AM',
      '10:30 AM - 11:30 AM',
      '11:30 AM - 12:30 PM',
      '01:30 PM - 02:30 PM',
      '02:30 PM - 03:30 PM',
      '03:30 PM - 04:30 PM',
      '04:30 PM - 05:30 PM',
      '06:00 PM - 07:00 PM',
      '07:30 PM - 09:00 PM',
      '09:30 PM - 10:30 PM'
    ];

    // Purge any ghost tasks (seeded tasks that do not match any time intervals)
    let needsSave = false;
    for (const day of this.days) {
      if (day.schedule) {
        const originalLength = day.schedule.length;
        day.schedule = day.schedule.filter(t => this.timeIntervals.includes(t.plannedTime));
        if (day.schedule.length !== originalLength) {
          needsSave = true;
        }
      }
    }
    if (needsSave) {
      await db.days.bulkPut(JSON.parse(JSON.stringify(this.days)));
    }
  }

  // Set the active navigation view
  async setView(view) {
    this.currentView = view;
    await db.settings.put({ key: 'current_view', value: view });

    if (view === 'planner') this.plannerScrollNeedsInit = true;
    if (view === 'study') this.studyScrollNeedsInit = true;
    if (view === 'etsy-seo') this.etsyScrollNeedsInit = true;

    // Reset cell selection
    this.selectedCells = [];
    this.selectionAnchor = null;

    // Auto-collapse sidebar on wide views to maximize screen space
    if (view === 'planner' || view === 'study' || view === 'etsy-seo' || view === 'finance' || view === 'calendar') {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false;
    }

    this.notify();
  }

  // Toggle sidebar visibility
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.notify();
  }

  // Update time intervals
  async updateTimeIntervals(intervals) {
    this.timeIntervals = intervals;
    await db.settings.put({ key: 'time_intervals', value: intervals });
    this.notify();
  }

  // Set application light/dark theme
  async setTheme(theme) {
    this.theme = theme;
    document.documentElement.className = theme;
    await db.settings.put({ key: 'theme', value: theme });
    this.notify();
  }

  // Update a specific day's records
  async updateDay(date, updates) {
    let dayIndex = this.days.findIndex(d => d.date === date);
    if (dayIndex === -1) {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const formattedWeekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const newDay = {
        date: date,
        dayIndex: d.getDay() === 0 ? 7 : d.getDay(),
        label: formattedLabel,
        weekday: formattedWeekday,
        schedule: [],
        nonNegotiables: {},
        satisfaction: { score: 5, successText: '', improvementText: '' },
        finance: { revenue: 0, expenses: 0, savings: 0 },
        notes: '',
        ...updates
      };
      this.days.push(newDay);
      this.days.sort((a, b) => a.date.localeCompare(b.date));
      await db.days.put(JSON.parse(JSON.stringify(newDay)));
    } else {
      // Deep merge changes into memory representation
      this.days[dayIndex] = {
        ...this.days[dayIndex],
        ...updates
      };
      // Save to IndexedDB
      await db.days.put(JSON.parse(JSON.stringify(this.days[dayIndex])));
    }
    this.notify();
  }

  // Update multiple days at once and notify listeners once
  async updateDaysBulk(updatesMap) {
    for (const item of updatesMap) {
      const dayIndex = this.days.findIndex(d => d.date === item.date);
      if (dayIndex !== -1) {
        this.days[dayIndex] = {
          ...this.days[dayIndex],
          ...item.updates
        };
      }
    }
    // Save to IndexedDB
    const daysToPut = updatesMap.map(item => {
      const day = this.days.find(d => d.date === item.date);
      return JSON.parse(JSON.stringify(day));
    });
    await db.days.bulkPut(daysToPut);
    this.notify();
  }

  // Add a new global recurring daily non-negotiable
  async addNonNegotiable(name) {
    const id = 'nn-' + Date.now();
    const newNN = { id, name, order: this.nonNegotiables.length };
    await db.nonNegotiables.add(newNN);
    await this.fetchData();
    this.notify();
    return id;
  }

  // Update an existing global non-negotiable name
  async updateNonNegotiable(id, name) {
    await db.nonNegotiables.update(id, { name });
    await this.fetchData();
    this.notify();
  }

  // Remove a global non-negotiable and clean daily maps
  async deleteNonNegotiable(id) {
    await db.nonNegotiables.delete(id);
    
    // Clean up key from all day records to optimize space
    for (const day of this.days) {
      if (day.nonNegotiables && day.nonNegotiables[id]) {
        delete day.nonNegotiables[id];
        await db.days.put(JSON.parse(JSON.stringify(day)));
      }
    }
    
    await this.fetchData();
    this.notify();
  }

  // Reorder non-negotiables
  async reorderNonNegotiables(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.nonNegotiables.update(orderedIds[i], { order: i });
    }
    await this.fetchData();
    this.notify();
  }

  // Hard reset database
  async resetData() {
    await db.days.clear();
    await db.nonNegotiables.clear();
    await db.settings.clear();
    this.initialized = false;
    await this.init();
  }

  // Import JSON backup data
  async importData(jsonData) {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.days || !parsed.nonNegotiables) {
        throw new Error("Invalid backup JSON structure. Missing 'days' or 'nonNegotiables'.");
      }
      
      // Bulk overwrite Dexie tables
      await db.transaction('rw', db.days, db.nonNegotiables, async () => {
        await db.days.clear();
        await db.nonNegotiables.clear();
        await db.days.bulkAdd(parsed.days);
        await db.nonNegotiables.bulkAdd(parsed.nonNegotiables);
      });

      await this.fetchData();
      this.notify();
      return true;
    } catch (err) {
      console.error("Backup import error: ", err);
      throw err;
    }
  }

  // Export database as JSON string
  exportData() {
    const data = {
      days: this.days,
      nonNegotiables: this.nonNegotiables
    };
    return JSON.stringify(data, null, 2);
  }
}

export const state = new AppState();
state.init(); // Initialize state immediately
