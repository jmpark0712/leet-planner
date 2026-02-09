/**
 * Storage Layer
 * - IndexedDB for structured data (logs, tasks)
 * - localStorage for settings and timer state
 */

const Storage = (() => {
  const DB_NAME = 'leet-planner';
  const DB_VERSION = 1;
  let db = null;

  // ── IndexedDB Setup ──
  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('logs')) {
          const logStore = d.createObjectStore('logs', { keyPath: 'id' });
          logStore.createIndex('date', 'date', { unique: false });
          logStore.createIndex('subject', 'subject', { unique: false });
          logStore.createIndex('resolveDate7', 'resolveDate7', { unique: false });
          logStore.createIndex('resolveDate30', 'resolveDate30', { unique: false });
        }
        if (!d.objectStoreNames.contains('tasks')) {
          const taskStore = d.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('date', 'date', { unique: false });
        }
        if (!d.objectStoreNames.contains('weeklyPlans')) {
          d.createObjectStore('weeklyPlans', { keyPath: 'weekStart' });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ── Generic CRUD ──
  async function getAll(storeName) {
    await openDB();
    return promisify(tx(storeName, 'readonly').getAll());
  }

  async function get(storeName, key) {
    await openDB();
    return promisify(tx(storeName, 'readonly').get(key));
  }

  async function put(storeName, item) {
    await openDB();
    return promisify(tx(storeName, 'readwrite').put(item));
  }

  async function remove(storeName, key) {
    await openDB();
    return promisify(tx(storeName, 'readwrite').delete(key));
  }

  async function getAllByIndex(storeName, indexName, value) {
    await openDB();
    const store = tx(storeName, 'readonly');
    const index = store.index(indexName);
    return promisify(index.getAll(value));
  }

  // ── Logs ──
  async function addLog(entry) {
    entry.id = entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await put('logs', entry);
    return entry;
  }

  async function getLogs() {
    const logs = await getAll('logs');
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  async function getLogsByDate(date) {
    return getAllByIndex('logs', 'date', date);
  }

  async function updateLog(entry) {
    return put('logs', entry);
  }

  async function getPendingResolves() {
    const logs = await getAll('logs');
    const today = dateStr(new Date());
    return logs.filter(l => {
      if (l.correct) return false;
      const need7 = !l.resolved7 && l.resolveDate7 && l.resolveDate7 <= today;
      const need30 = !l.resolved30 && l.resolveDate30 && l.resolveDate30 <= today;
      return need7 || need30;
    });
  }

  async function getUpcomingResolves() {
    const logs = await getAll('logs');
    const today = dateStr(new Date());
    return logs.filter(l => {
      if (l.correct) return false;
      const pending7 = !l.resolved7 && l.resolveDate7;
      const pending30 = !l.resolved30 && l.resolveDate30;
      return pending7 || pending30;
    }).map(l => {
      const items = [];
      if (!l.resolved7 && l.resolveDate7) {
        items.push({ ...l, resolveType: '7일', dueDate: l.resolveDate7, overdue: l.resolveDate7 <= today });
      }
      if (!l.resolved30 && l.resolveDate30) {
        items.push({ ...l, resolveType: '30일', dueDate: l.resolveDate30, overdue: l.resolveDate30 <= today });
      }
      return items;
    }).flat().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  // ── Tasks ──
  async function getTasksByDate(date) {
    return getAllByIndex('tasks', 'date', date);
  }

  async function saveTasks(tasks) {
    await openDB();
    const store = tx('tasks', 'readwrite');
    for (const t of tasks) {
      store.put(t);
    }
    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async function updateTask(task) {
    return put('tasks', task);
  }

  async function getTasksInRange(startDate, endDate) {
    const all = await getAll('tasks');
    return all.filter(t => t.date >= startDate && t.date <= endDate);
  }

  // ── Weekly Plans ──
  async function getWeeklyPlan(weekStart) {
    return get('weeklyPlans', weekStart);
  }

  async function saveWeeklyPlan(plan) {
    return put('weeklyPlans', plan);
  }

  // ── Settings (localStorage) ──
  const DEFAULT_SETTINGS = {
    examDate: '2026-07-19',
    dailyStudyHours: 6,
    languageRatio: 50,
    timerHours: 6,
    theme: 'red'
  };

  function getSettings() {
    try {
      const stored = localStorage.getItem('leet-settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings) {
    localStorage.setItem('leet-settings', JSON.stringify(settings));
  }

  // ── Timer State (localStorage) ──
  const DEFAULT_TIMER = {
    state: 'idle',         // idle | running | paused | done
    remainingMs: 0,
    totalMs: 0,
    lastTickAt: null       // timestamp for background recovery
  };

  function getTimerState() {
    try {
      const stored = localStorage.getItem('leet-timer');
      if (stored) return { ...DEFAULT_TIMER, ...JSON.parse(stored) };
    } catch (e) { /* ignore */ }
    return { ...DEFAULT_TIMER };
  }

  function saveTimerState(timerState) {
    localStorage.setItem('leet-timer', JSON.stringify(timerState));
  }

  // ── Helpers ──
  function dateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(dateString, days) {
    const d = new Date(dateString + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return dateStr(d);
  }

  // ── Delete Task ──
  async function deleteTask(taskId) {
    return remove('tasks', taskId);
  }

  // ── Reset All Data ──
  async function resetAllData() {
    await openDB();
    const storeNames = ['logs', 'tasks', 'weeklyPlans'];
    for (const name of storeNames) {
      await new Promise((resolve, reject) => {
        const store = tx(name, 'readwrite');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
    localStorage.removeItem('leet-settings');
    localStorage.removeItem('leet-timer');
  }

  // ── Init ──
  async function init() {
    await openDB();
  }

  return {
    init,
    // Logs
    addLog, getLogs, getLogsByDate, updateLog,
    getPendingResolves, getUpcomingResolves,
    // Tasks
    getTasksByDate, saveTasks, updateTask, deleteTask, getTasksInRange,
    // Weekly
    getWeeklyPlan, saveWeeklyPlan,
    // Settings
    getSettings, saveSettings,
    // Timer
    getTimerState, saveTimerState,
    // Reset
    resetAllData,
    // Helpers
    dateStr, addDays,
    DEFAULT_SETTINGS
  };
})();
