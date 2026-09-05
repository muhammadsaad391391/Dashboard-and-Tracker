import { db, seedDatabase } from './db.js';
import { getRandomQuote } from './quotes.js';

class AppState {
  constructor() {
    this.currentView = 'dashboard';
    this.theme = 'light';
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
    this.customSections = [];
    this.projects = [];
    this.syncCode = '';
    this.syncEnabled = false;
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.availableTimeToday = '2h';
    this.chatHistory = [];
    this.lastSyncTimestamp = 0;
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
    
    try {
      if (window.setAetherLoaderText) window.setAetherLoaderText('Seeding database schema...');
      // Seed DB if it's the first run
      await seedDatabase();



      if (window.setAetherLoaderText) window.setAetherLoaderText('Checking database migrations...');
      // Perform database migration to update non-negotiables to user's 10 daily essentials
      const nnVersionSetting = await db.settings.get('non_negotiables_version');
      const nnVersion = nnVersionSetting ? nnVersionSetting.value : 0;
      const nnCount = await db.nonNegotiables.count();
      if (nnVersion < 2 || nnCount === 0) {
        if (window.setAetherLoaderText) window.setAetherLoaderText('Migrating non-negotiables...');
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
      
      if (window.setAetherLoaderText) window.setAetherLoaderText('Loading active theme...');
      // Always start in light theme by default when the app opens, as requested
      this.theme = 'light';
      document.documentElement.className = 'light';

      if (window.setAetherLoaderText) window.setAetherLoaderText('Loading current view...');
      // Load active view
      const viewSetting = await db.settings.get('current_view');
      this.currentView = viewSetting ? viewSetting.value : 'dashboard';

      if (window.setAetherLoaderText) window.setAetherLoaderText('Loading date & week...');
      // Always start on today's current date and current week when app opens
      this.activeDate = this.getTodayDateStr();
      this.expandedDayDate = this.activeDate;
      await db.settings.put({ key: 'active_date', value: this.activeDate });

      if (window.setAetherLoaderText) window.setAetherLoaderText('Fetching collections from IndexedDB...');
      await this.fetchData();
      
      if (window.setAetherLoaderText) window.setAetherLoaderText('Ensuring rolling calendar week exists...');
      await this.ensureActiveWeekExists(this.activeDate);

      if (window.setAetherLoaderText) window.setAetherLoaderText('Loading custom categories...');
      // Load custom sections setting
      const sectionsSetting = await db.settings.get('custom_sections');
      this.customSections = sectionsSetting ? sectionsSetting.value : [];

      if (window.setAetherLoaderText) window.setAetherLoaderText('Loading cloud synchronization...');
      // Force syncCode to global_shared_backup to ensure all devices share the exact same DB entry
      this.syncCode = 'global_shared_backup';
      await db.settings.put({ key: 'sync_code', value: 'global_shared_backup' });

      const syncEnabledSetting = await db.settings.get('sync_enabled');
      this.syncEnabled = syncEnabledSetting ? !!syncEnabledSetting.value : true;
      if (!syncEnabledSetting) {
        await db.settings.put({ key: 'sync_enabled', value: true });
      }

      if (window.setAetherLoaderText) window.setAetherLoaderText('Loading artificial intelligence...');
      const geminiKeySetting = await db.settings.get('gemini_api_key');
      this.geminiApiKey = geminiKeySetting ? geminiKeySetting.value : (import.meta.env.VITE_GEMINI_API_KEY || '');

      const availTimeSetting = await db.settings.get('available_time_today');
      this.availableTimeToday = availTimeSetting ? availTimeSetting.value : '2h';

      // Set initial sidebar collapse status for wide views
      const view = this.currentView;
      this.sidebarCollapsed = (view === 'planner' || view === 'study' || view === 'etsy-seo' || view === 'finance' || view === 'calendar' || view.startsWith('sec-'));

      // Automate Cloud database sync at launch
      if (this.syncEnabled) {
        if (window.setAetherLoaderText) window.setAetherLoaderText('Syncing with PostgreSQL database...');
        try {
          await this.pullFromCloud(this.syncCode);
        } catch (e) {
          console.warn("Could not sync with cloud database at launch (offline or DB not set up yet):", e);
        }
      }

      if (window.setAetherLoaderText) window.setAetherLoaderText('Initializing workspace...');
      this.initialized = true;

      // Start Background Sync polling & Focus listeners
      if (this.syncEnabled) {
        // Poll for updates in the background every 8 seconds
        setInterval(() => this.pollCloudUpdates(), 8000);

        // Immediate background pull when page gains focus / visibility
        window.addEventListener('focus', () => this.pollCloudUpdates());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.pollCloudUpdates();
          }
        });
      }

      this.notify();
    } catch (err) {
      console.error("Initialization failed:", err);
      alert("Aether Init Error: " + err.message + "\nStack: " + err.stack);
    }
  }

  // Fetch lists directly from IndexedDB
  async fetchData() {
    this.days = (await db.days.toArray()).filter(day => day.date >= '2026-08-31');
    // Sort days chronologically by date string
    this.days.sort((a, b) => a.date.localeCompare(b.date));

    this.nonNegotiables = await db.nonNegotiables.toArray();
    this.nonNegotiables.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (db.projects) {
      this.projects = await db.projects.toArray();
      
      // One-time clear of seeded tasks as requested by the user
      const clearedTasksSetting = await db.settings.get('cleared_category_tasks_user_req_v1');
      if (!clearedTasksSetting) {
        for (const p of this.projects) {
          p.subtasks = [];
          await db.projects.update(p.id, { subtasks: [] });
        }
        await db.settings.put({ key: 'cleared_category_tasks_user_req_v1', value: true });
        if (this.syncEnabled) {
          setTimeout(() => this.pushToCloud().catch(() => {}), 500);
        }
      }
    } else {
      this.projects = [];
    }

    // Ensure Quran / Hifz tracker is present in customSections if not already added
    const sectionsSetting = await db.settings.get('custom_sections');
    this.customSections = sectionsSetting ? sectionsSetting.value : [];
    if (!this.customSections.some(s => s.type === 'quran' || s.label.toLowerCase().includes('quran') || s.label.toLowerCase().includes('wuran') || s.label.toLowerCase().includes('hifz'))) {
      this.customSections.push({
        id: 'sec-quran',
        label: 'Quran Hifz',
        type: 'quran',
        icon: 'study'
      });
      await db.settings.put({ key: 'custom_sections', value: this.customSections });
    }

    const intervalsSetting = await db.settings.get('time_intervals');
    this.timeIntervals = intervalsSetting ? intervalsSetting.value : [
      '05:00 AM - 06:00 AM',
      '06:00 AM - 07:00 AM',
      '07:00 AM - 08:00 AM',
      '08:00 AM - 09:00 AM',
      '09:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 PM - 01:00 PM',
      '02:00 PM - 03:00 PM',
      '03:00 PM - 04:00 PM',
      '04:00 PM - 05:00 PM',
      '05:30 PM - 06:30 PM',
      '06:45 PM - 07:45 PM',
      '07:45 PM - 08:15 + 08:30 - 09:00 PM',
      '09:00 PM - 10:00 PM',
      '10:00 PM - 11:00 PM'
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
    if (view === 'planner' || view === 'study' || view === 'etsy-seo' || view === 'finance' || view === 'calendar' || view.startsWith('sec-')) {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false;
    }

    this.notify();
  }

  // Toggle sidebar visibility
  toggleSidebar(collapsed) {
    this.sidebarCollapsed = collapsed !== undefined ? collapsed : !this.sidebarCollapsed;
    this.notify();
  }

  // Update time intervals
  async updateTimeIntervals(intervals) {
    this.timeIntervals = intervals;
    await db.settings.put({ key: 'time_intervals', value: intervals });
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  // Rename a specific time interval and migrate scheduled tasks
  async renameTimeInterval(oldVal, newVal) {
    const idx = this.timeIntervals.indexOf(oldVal);
    if (idx === -1) return;

    this.timeIntervals[idx] = newVal;
    await db.settings.put({ key: 'time_intervals', value: this.timeIntervals });

    const updatesMap = [];
    this.days.forEach(day => {
      let changed = false;
      const schedule = day.schedule.map(task => {
        if (task.plannedTime === oldVal) {
          changed = true;
          return { ...task, plannedTime: newVal };
        }
        return task;
      });
      if (changed) {
        updatesMap.push({ date: day.date, updates: { schedule } });
      }
    });

    if (updatesMap.length > 0) {
      await this.updateDaysBulk(updatesMap);
    } else {
      if (this.syncEnabled) await this.pushToCloud();
      this.notify();
    }
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
    if (this.syncEnabled) await this.pushToCloud();
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
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  // Add a new global recurring daily non-negotiable
  async addNonNegotiable(name) {
    const id = 'nn-' + Date.now();
    const newNN = { id, name, order: this.nonNegotiables.length };
    await db.nonNegotiables.add(newNN);
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
    return id;
  }

  // Update an existing global non-negotiable name
  async updateNonNegotiable(id, name) {
    await db.nonNegotiables.update(id, { name });
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
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
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  // Reorder non-negotiables
  async reorderNonNegotiables(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.nonNegotiables.update(orderedIds[i], { order: i });
    }
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
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

  // Add a new custom category planner section
  async addCustomSection(label, iconType) {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    
    const id = 'sec-' + Date.now();
    const type = 'cust_' + Date.now().toString(36);
    
    const newSec = { id, label: cleanLabel, type, icon: iconType || 'planner' };
    this.customSections.push(newSec);
    
    await db.settings.put({ key: 'custom_sections', value: this.customSections });
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
    return id;
  }

  // Delete a custom category planner section
  async deleteCustomSection(id) {
    const sectionIndex = this.customSections.findIndex(s => s.id === id);
    if (sectionIndex === -1) return;
    
    const section = this.customSections[sectionIndex];
    
    // Clean up tasks of this category from all days in database
    for (const day of this.days) {
      if (day.schedule) {
        const cleanedSchedule = day.schedule.filter(t => t.type !== section.type);
        if (cleanedSchedule.length !== day.schedule.length) {
          await this.updateDay(day.date, { schedule: cleanedSchedule });
        }
      }
    }
    
    this.customSections.splice(sectionIndex, 1);
    await db.settings.put({ key: 'custom_sections', value: this.customSections });
    
    if (this.syncEnabled) await this.pushToCloud();
    
    // If the user was viewing this custom section, fall back to dashboard
    if (this.currentView === id) {
      await this.setView('dashboard');
    } else {
      this.notify();
    }
  }

  // Save Gemini API Key
  async saveGeminiApiKey(key) {
    this.geminiApiKey = key;
    await db.settings.put({ key: 'gemini_api_key', value: key });
    this.notify();
  }

  // Save available time today
  async saveAvailableTimeToday(val) {
    this.availableTimeToday = val;
    await db.settings.put({ key: 'available_time_today', value: val });
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  // Save Sync Code
  async saveSyncCode(code) {
    this.syncCode = code;
    await db.settings.put({ key: 'sync_code', value: code });
    this.notify();
  }

  // Save Sync Bucket ID
  async saveSyncBucketId(bucketId) {
    this.syncBucketId = bucketId;
    await db.settings.put({ key: 'sync_bucket_id', value: bucketId });
    this.notify();
  }

  // Toggle Cloud Sync
  async toggleSync(enabled) {
    this.syncEnabled = enabled;
    await db.settings.put({ key: 'sync_enabled', value: enabled });
    if (enabled && this.syncCode) {
      await this.pushToCloud();
    }
    this.notify();
  }

  // Cloud Sync: Generate a random sync code (key) locally
  async generateSyncCode() {
    const code = 'aether-usr-' + Math.random().toString(36).substring(2, 12).toLowerCase();
    this.syncCode = code;
    await db.settings.put({ key: 'sync_code', value: code });
    this.notify();
    return code;
  }

  // Cloud Sync: Push local database payload to Neon / serverless DB backend
  async pushToCloud() {
    if (!this.syncCode) {
      await this.generateSyncCode();
    }
    try {
      const payload = {
        days: this.days,
        nonNegotiables: this.nonNegotiables,
        projects: this.projects,
        customSections: this.customSections,
        timeIntervals: this.timeIntervals,
        availableTimeToday: this.availableTimeToday,
        timestamp: Date.now()
      };
      this.lastSyncTimestamp = payload.timestamp;
      const response = await fetch(`/api/sync?code=${this.syncCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Sync upload failed: Status ${response.status}`);
      }
      console.log("Cloud sync pushed successfully.");
    } catch (err) {
      console.error("Cloud push failed:", err);
      throw err;
    }
  }

  // Cloud Sync: Pull database payload from Neon / serverless DB backend and overwrite IndexedDB
  async pullFromCloud(code) {
    const targetCode = code || this.syncCode;
    if (!targetCode) return false;
    try {
      const response = await fetch(`/api/sync?code=${targetCode}&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 404) {
          // If code doesn't exist yet, we push our current local state as the starting point!
          if (code) {
            this.syncCode = code;
            await db.settings.put({ key: 'sync_code', value: code });
            await this.pushToCloud();
            return true;
          }
          return false;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Sync download failed: Status ${response.status}`);
      }
      const data = await response.json();
      if (data && data.days) {
        // Overwrite local databases
        await db.transaction('rw', db.days, db.nonNegotiables, db.projects, async () => {
          await db.days.clear();
          await db.nonNegotiables.clear();
          if (db.projects) await db.projects.clear();

          await db.days.bulkAdd(data.days);

          let finalNN = data.nonNegotiables || [];
          if (finalNN.length === 0) {
            finalNN = [
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
            setTimeout(() => this.pushToCloud(), 1000);
          }
          await db.nonNegotiables.bulkAdd(finalNN);

          if (db.projects) {
            const finalProjects = Array.isArray(data.projects) ? data.projects : [];
            await db.projects.bulkAdd(finalProjects);
          }
        });
        
        if (data.customSections) {
          this.customSections = data.customSections;
          await db.settings.put({ key: 'custom_sections', value: this.customSections });
        }

        if (data.timeIntervals) {
          this.timeIntervals = data.timeIntervals;
          await db.settings.put({ key: 'time_intervals', value: this.timeIntervals });
        }

        if (data.availableTimeToday) {
          this.availableTimeToday = data.availableTimeToday;
          await db.settings.put({ key: 'available_time_today', value: this.availableTimeToday });
        }

        if (data.timestamp) {
          this.lastSyncTimestamp = data.timestamp;
        }

        if (code) {
          this.syncCode = code;
          await db.settings.put({ key: 'sync_code', value: code });
        }

        await this.fetchData();
        this.notify();
        return true;
      }
    } catch (err) {
      console.error("Cloud pull failed:", err);
      throw err;
    }
    return false;
  }

  // Background Sync Polling
  async pollCloudUpdates() {
    if (!this.syncEnabled || !this.syncCode || !this.initialized) return;
    try {
      const response = await fetch(`/api/sync?code=${this.syncCode}&t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data && data.timestamp && data.timestamp > this.lastSyncTimestamp) {
          console.log("Background sync: Newer data found on cloud. Updating...");
          await this.pullFromCloud();
        }
      }
    } catch (err) {
      console.warn("Background update check failed:", err);
    }
  }

  // Project Hub Actions
  async addProject(project) {
    if (!db.projects) return;
    const durationMode = project.durationMode || (project.frequency === 'daily' && project.durationPerSessionMinutes === 0 ? 'available' : 'fixed');
    const cleanProj = {
      name: project.name || 'Untitled Project',
      goal: project.goal || '',
      deadline: project.deadline || '',
      status: project.status || 'Not started',
      priority: project.priority || 'medium',
      type: project.type || 'flexible',
      estimatedHours: Number(project.estimatedHours) || 0,
      availableHoursPerDay: Number(project.availableHoursPerDay) || 0,
      nextGoal: project.nextGoal || '',
      lastWorkedOn: project.lastWorkedOn || Date.now(),
      isDailyAllocation: !!project.isDailyAllocation,
      dailyAllocationMinutes: Number(project.dailyAllocationMinutes) || 0,
      frequency: project.frequency || (project.isDailyAllocation ? 'daily' : 'flexible'),
      durationMode: durationMode,
      durationPerSessionMinutes: durationMode === 'available' ? 0 : (Number(project.durationPerSessionMinutes) || (project.dailyAllocationMinutes || 60)),
      targetSessionsPerWeek: Number(project.targetSessionsPerWeek) || (project.frequency === 'daily' ? 7 : project.frequency === 'every_2_days' ? 3 : project.frequency === 'every_3_days' ? 2 : project.frequency === 'weekly' ? 1 : 0),
      lastCompletedDate: project.lastCompletedDate || '',
      completedDates: project.completedDates || [],
      subtasks: project.subtasks || []
    };
    const id = await db.projects.add(cleanProj);
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
    return id;
  }

  // Cadence evaluation for a project on a given date (defaulting to activeDate)
  getProjectCadenceInfo(project, checkDateStr = null) {
    const activeDate = checkDateStr || this.getActiveDate();
    const today = new Date(activeDate + 'T00:00:00');
    const day = this.days.find(d => d.date === activeDate);

    const freq = project.frequency || (project.isDailyAllocation ? 'daily' : 'flexible');
    const isAvailableTime = project.durationMode === 'available';
    
    // Check if scheduled today in day.schedule
    const prefix = project.name + ':';
    const isScheduledToday = day && day.schedule ? day.schedule.some(t => t.name === project.name || t.name.startsWith(prefix)) : false;
    const isCompletedToday = day && day.schedule ? day.schedule.some(t => (t.name === project.name || t.name.startsWith(prefix)) && (t.status === 'completed' || t.status === 'delayed')) : false;

    // Check if recorded in completedDates or lastCompletedDate
    const isMarkedDoneToday = isCompletedToday || (project.completedDates && project.completedDates.includes(activeDate)) || (project.lastCompletedDate === activeDate);

    if (isAvailableTime) {
      if (isMarkedDoneToday) {
        return { freq, label: freq === 'daily' ? 'Daily (Free Time)' : 'When Free', badgeClass: 'cadence-available', statusText: 'Done Today ✅', isDue: false, isCompleted: true, urgencyBoost: 0, isAvailableTime: true };
      } else if (isScheduledToday) {
        return { freq, label: freq === 'daily' ? 'Daily (Free Time)' : 'When Free', badgeClass: 'cadence-available', statusText: 'Scheduled Today 🕒', isDue: true, isCompleted: false, urgencyBoost: 60, isAvailableTime: true };
      } else {
        return { freq, label: freq === 'daily' ? 'Daily (Free Time)' : 'When Free', badgeClass: 'cadence-available', statusText: 'When Free ⚡', isDue: true, isCompleted: false, urgencyBoost: 65, isAvailableTime: true };
      }
    }

    if (freq === 'daily') {
      if (isMarkedDoneToday) {
        return { freq, label: 'Daily', badgeClass: 'cadence-daily', statusText: 'Done Today ✅', isDue: false, isCompleted: true, urgencyBoost: 0 };
      } else if (isScheduledToday) {
        return { freq, label: 'Daily', badgeClass: 'cadence-daily', statusText: 'Scheduled Today 🕒', isDue: true, isCompleted: false, urgencyBoost: 80 };
      } else {
        return { freq, label: 'Daily', badgeClass: 'cadence-daily', statusText: 'Due Today ⚡', isDue: true, isCompleted: false, urgencyBoost: 100 };
      }
    }

    if (freq === 'every_2_days' || freq === 'every_3_days') {
      const intervalDays = freq === 'every_2_days' ? 2 : 3;
      const lastDone = project.lastCompletedDate ? new Date(project.lastCompletedDate + 'T00:00:00') : (project.lastWorkedOn ? new Date(project.lastWorkedOn) : null);
      let daysSinceLast = 999;
      if (lastDone) {
        daysSinceLast = Math.max(0, Math.floor((today - lastDone) / (1000 * 60 * 60 * 24)));
      }

      if (isMarkedDoneToday) {
        return { freq, label: freq === 'every_2_days' ? 'Every 2 Days' : 'Every 3 Days', badgeClass: 'cadence-periodic', statusText: 'Done Today ✅', isDue: false, isCompleted: true, urgencyBoost: 0 };
      } else if (daysSinceLast >= intervalDays) {
        return { freq, label: freq === 'every_2_days' ? 'Every 2 Days' : 'Every 3 Days', badgeClass: 'cadence-periodic', statusText: 'Due Today ⚡', isDue: true, isCompleted: false, urgencyBoost: 90 };
      } else {
        const daysLeft = intervalDays - daysSinceLast;
        return { freq, label: freq === 'every_2_days' ? 'Every 2 Days' : 'Every 3 Days', badgeClass: 'cadence-periodic', statusText: `Next in ${daysLeft}d`, isDue: false, isCompleted: false, urgencyBoost: 20 };
      }
    }

    if (freq === 'weekly') {
      // Check if completed in the current active week
      const currentWeek = this.getDaysForActiveWeek();
      const doneInWeek = currentWeek.some(d => {
        if (project.completedDates && project.completedDates.includes(d.date)) return true;
        if (project.lastCompletedDate === d.date) return true;
        return d.schedule && d.schedule.some(t => (t.name === project.name || t.name.startsWith(prefix)) && (t.status === 'completed' || t.status === 'delayed'));
      });

      if (doneInWeek) {
        return { freq, label: 'Weekly', badgeClass: 'cadence-weekly', statusText: 'Done This Week ✅', isDue: false, isCompleted: true, urgencyBoost: 0 };
      } else {
        // Find how many days left in the week (Sunday is weekDays[6])
        const dayOfWeekIndex = today.getDay(); // 0 is Sun, 1 is Mon...
        const daysLeftInWeek = dayOfWeekIndex === 0 ? 0 : (7 - dayOfWeekIndex);
        const isUrgent = daysLeftInWeek <= 2;
        return {
          freq,
          label: 'Weekly',
          badgeClass: 'cadence-weekly',
          statusText: isUrgent ? 'Due This Week ⚠️' : 'Due This Week ⏳',
          isDue: true,
          isCompleted: false,
          urgencyBoost: isUrgent ? 85 : 60
        };
      }
    }

    // Flexible / Milestone-based
    return { freq: 'flexible', label: 'Milestone', badgeClass: 'cadence-flexible', statusText: 'Flexible', isDue: false, isCompleted: false, urgencyBoost: 0 };
  }

  // Calculate daily time capacity vs doables
  calculateDailyTimeCapacity(dateStr = null) {
    const activeDate = dateStr || this.getActiveDate();
    const day = this.days.find(d => d.date === activeDate);
    
    // Total day planning slots available (each slot is 60 minutes)
    const totalSlots = this.timeIntervals.length || 16;
    const totalCapacityHours = totalSlots;
    const totalCapacityMinutes = totalSlots * 60;

    // 1. Scheduled Tasks on today's calendar
    const scheduledTasks = day ? day.schedule || [] : [];
    const scheduledMinutes = scheduledTasks.length * 60;

    // 2. Daily Recurring Projects Commitment (e.g. daily targets, durationPerSessionMinutes)
    let dailyProjectCommitmentMinutes = 0;
    this.projects.forEach(p => {
      if (p.status === 'Completed' || p.status === 'Paused') return;
      const freq = p.frequency || (p.isDailyAllocation ? 'daily' : 'flexible');
      if (freq === 'daily') {
        // Available Time projects do NOT consume rigid daily committed doables
        if (p.durationMode === 'available') return;
        dailyProjectCommitmentMinutes += (p.durationPerSessionMinutes || p.dailyAllocationMinutes || 60);
      }
    });

    // 3. Non-Negotiables Habits (e.g. 15 mins per non-negotiable)
    const nnCount = this.nonNegotiables ? this.nonNegotiables.length : 0;
    const nonNegotiablesEstimatedMinutes = nnCount * 15;

    // Total committed doables (habits + daily project allocations)
    const doablesMinutes = dailyProjectCommitmentMinutes + nonNegotiablesEstimatedMinutes;

    // Free time slots remaining on schedule
    const freeSlots = this.timeIntervals.filter(slot => !scheduledTasks.some(t => t.plannedTime === slot));
    const freeSlotsCount = freeSlots.length;
    const remainingFreeMinutes = freeSlotsCount * 60;
    const remainingFreeHours = Number((remainingFreeMinutes / 60).toFixed(1));

    return {
      totalCapacityMinutes,
      totalCapacityHours,
      scheduledMinutes,
      scheduledHours: Number((scheduledMinutes / 60).toFixed(1)),
      scheduledCount: scheduledTasks.length,
      dailyProjectCommitmentMinutes,
      nonNegotiablesEstimatedMinutes,
      doablesMinutes,
      doablesHours: Number((doablesMinutes / 60).toFixed(1)),
      freeSlots,
      freeSlotsCount,
      remainingFreeMinutes,
      remainingFreeHours
    };
  }

  async updateProject(id, updates) {
    if (!db.projects) return;
    const projId = Number(id);
    await db.projects.update(projId, updates);
    const p = this.projects.find(proj => proj.id === projId);
    if (p) {
      Object.assign(p, updates);
    }
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  async deleteProject(id) {
    if (!db.projects) return;
    const projId = Number(id);
    await db.projects.delete(projId);
    this.projects = this.projects.filter(p => p.id !== projId);
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  async clearCategoryTasks(categoryType) {
    if (!db.projects) return;
    for (const p of this.projects) {
      if (!categoryType || categoryType === 'all' || p.type === categoryType) {
        p.subtasks = [];
        await db.projects.update(p.id, { subtasks: [] });
      }
    }
    await this.fetchData();
    if (this.syncEnabled) await this.pushToCloud();
    this.notify();
  }

  async clearProjectTasks(projectId) {
    if (!db.projects) return;
    const projId = Number(projectId);
    const p = this.projects.find(proj => proj.id === projId);
    if (p) {
      p.subtasks = [];
      await db.projects.update(projId, { subtasks: [] });
      await this.fetchData();
      if (this.syncEnabled) await this.pushToCloud();
      this.notify();
    }
  }

  getDefaultStarterProjects() {
    return [
      {
        name: 'Etsy Shop & SEO Mastery',
        status: 'In progress',
        priority: 'high',
        type: 'etsy_seo',
        deadline: '',
        goal: 'Scale listings, optimize tags, and drive organic sales',
        nextGoal: 'Publish 2 high-converting product listings',
        estimatedHours: 15,
        availableHoursPerDay: 2,
        isDailyAllocation: false,
        dailyAllocationMinutes: 0,
        subtasks: [
          { id: 'sub-etsy-1', name: 'Niche & Keyword research for high-demand items', estimatedMinutes: 30, completed: false },
          { id: 'sub-etsy-2', name: 'Create & publish 2 optimized listings', estimatedMinutes: 45, completed: false },
          { id: 'sub-etsy-3', name: 'Audit listing tags, titles & alt-text SEO', estimatedMinutes: 30, completed: false },
          { id: 'sub-etsy-4', name: 'Review conversion analytics & customer feedback', estimatedMinutes: 20, completed: false }
        ]
      },
      {
        name: 'MBBS Academic Study & Clinicals',
        status: 'In progress',
        priority: 'critical',
        type: 'study',
        deadline: '',
        goal: 'Master high-yield clinical concepts & exam excellence',
        nextGoal: 'Complete Pathology core review',
        estimatedHours: 25,
        availableHoursPerDay: 3,
        isDailyAllocation: false,
        dailyAllocationMinutes: 0,
        subtasks: [
          { id: 'sub-study-1', name: 'Pathology core chapter high-yield review', estimatedMinutes: 60, completed: false },
          { id: 'sub-study-2', name: 'Pharmacology drug mechanisms & flashcards', estimatedMinutes: 45, completed: false },
          { id: 'sub-study-3', name: 'Clinical case diagnosis practice', estimatedMinutes: 45, completed: false }
        ]
      },
      {
        name: 'Quran Hifz & Daily Revision',
        status: 'In progress',
        priority: 'critical',
        type: 'quran',
        deadline: '',
        goal: 'Hifz memorization & strong daily revision consistency',
        nextGoal: 'Solidify current Juz & new page',
        estimatedHours: 30,
        availableHoursPerDay: 2,
        isDailyAllocation: false,
        dailyAllocationMinutes: 0,
        subtasks: [
          { id: 'sub-quran-1', name: 'Memorize new lesson (Sabaq)', estimatedMinutes: 45, completed: false },
          { id: 'sub-quran-2', name: 'Recent revision (Sabqi) review', estimatedMinutes: 30, completed: false },
          { id: 'sub-quran-3', name: 'Manzil recitation & revision', estimatedMinutes: 45, completed: false }
        ]
      }
    ];
  }
}

export const state = new AppState();
state.init(); // Initialize state immediately
