/**
 * Timer Controller
 * - State machine: idle → running ↔ paused → done
 * - Background recovery via actual elapsed time
 * - Character animation state sync
 * - Persistence across reloads
 */

const Timer = (() => {
  let state = 'idle'; // idle | running | paused | done
  let remainingMs = 0;
  let totalMs = 0;
  let lastTickAt = null;
  let intervalId = null;
  let onUpdate = null; // callback(state, remainingMs, totalMs)

  function init(callback) {
    onUpdate = callback;
    const saved = Storage.getTimerState();
    state = saved.state;
    remainingMs = saved.remainingMs;
    totalMs = saved.totalMs;
    lastTickAt = saved.lastTickAt;

    // Recover from background
    if (state === 'running' && lastTickAt) {
      const elapsed = Date.now() - lastTickAt;
      remainingMs = Math.max(0, remainingMs - elapsed);
      if (remainingMs <= 0) {
        remainingMs = 0;
        state = 'done';
      }
    }

    if (state === 'running') {
      startInterval();
    }

    // Handle visibility change for background recovery
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state === 'running') {
        recoverFromBackground();
      }
    });

    persist();
    notify();
  }

  function setDuration(hours) {
    if (state !== 'idle') return;
    totalMs = hours * 3600 * 1000;
    remainingMs = totalMs;
    persist();
    notify();
  }

  function start() {
    const settings = Storage.getSettings();
    if (state === 'idle') {
      totalMs = settings.timerHours * 3600 * 1000;
      remainingMs = totalMs;
    }
    state = 'running';
    lastTickAt = Date.now();
    startInterval();
    persist();
    notify();
  }

  function pause() {
    if (state !== 'running') return;
    state = 'paused';
    clearInterval(intervalId);
    intervalId = null;
    lastTickAt = null;
    persist();
    notify();
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'running';
    lastTickAt = Date.now();
    startInterval();
    persist();
    notify();
  }

  function reset() {
    state = 'idle';
    clearInterval(intervalId);
    intervalId = null;
    const settings = Storage.getSettings();
    totalMs = settings.timerHours * 3600 * 1000;
    remainingMs = totalMs;
    lastTickAt = null;
    persist();
    notify();
  }

  function startInterval() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      tick();
    }, 1000);
  }

  function tick() {
    if (state !== 'running') return;
    const now = Date.now();
    if (lastTickAt) {
      const elapsed = now - lastTickAt;
      remainingMs = Math.max(0, remainingMs - elapsed);
    }
    lastTickAt = now;

    if (remainingMs <= 0) {
      remainingMs = 0;
      state = 'done';
      clearInterval(intervalId);
      intervalId = null;
      lastTickAt = null;
    }

    persist();
    notify();
  }

  function recoverFromBackground() {
    if (state !== 'running' || !lastTickAt) return;
    const now = Date.now();
    const elapsed = now - lastTickAt;
    remainingMs = Math.max(0, remainingMs - elapsed);
    lastTickAt = now;

    if (remainingMs <= 0) {
      remainingMs = 0;
      state = 'done';
      clearInterval(intervalId);
      intervalId = null;
      lastTickAt = null;
    }

    persist();
    notify();
  }

  function persist() {
    Storage.saveTimerState({
      state,
      remainingMs,
      totalMs,
      lastTickAt
    });
  }

  function notify() {
    if (onUpdate) onUpdate(state, remainingMs, totalMs);
  }

  function getState() {
    return { state, remainingMs, totalMs };
  }

  function formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return {
    init,
    start,
    pause,
    resume,
    reset,
    setDuration,
    getState,
    formatTime
  };
})();
