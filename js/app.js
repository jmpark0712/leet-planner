/**
 * Main Application Controller
 * - Navigation / view routing
 * - View rendering
 * - Event binding
 * - Service Worker registration
 */

const App = (() => {
  // ── State ──
  let currentView = 'today';

  // ── Day names ──
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  // ── Growth stages ──
  const GROWTH_STAGES = [
    { min: 0,  max: 9,   icon: '🌰', label: '씨앗' },
    { min: 10, max: 29,  icon: '🌱', label: '새싹' },
    { min: 30, max: 49,  icon: '🌿', label: '줄기' },
    { min: 50, max: 69,  icon: '🌷', label: '꽃봉오리' },
    { min: 70, max: 89,  icon: '🌸', label: '반개화' },
    { min: 90, max: 100, icon: '🌻', label: '만개' }
  ];

  const SUBJECT_LABELS = {
    'language': '언어이해',
    'logic': '추리논증',
    'essay': '논술'
  };

  // ── Init ──
  async function init() {
    await Storage.init();
    loadSettings();
    setupNavigation();
    setupTimer();
    setupSettingsEvents();

    // Load today view
    await renderTodayView();

    // Register service worker
    registerSW();
  }

  // ── Service Worker ──
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  // ── Settings ──
  function loadSettings() {
    const s = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', s.theme);

    document.getElementById('setting-exam-date').value = s.examDate;
    document.getElementById('setting-daily-hours').value = s.dailyStudyHours;
    document.getElementById('setting-timer-hours').value = s.timerHours;

    const animToggle = document.getElementById('setting-animation');
    animToggle.classList.toggle('on', s.animationEnabled);

    const charContainer = document.getElementById('character-container');
    charContainer.classList.toggle('animation-off', !s.animationEnabled);

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.theme === s.theme);
    });
  }

  // ── Navigation ──
  function setupNavigation() {
    document.querySelectorAll('#bottom-nav button').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        navigateTo(view);
      });
    });
  }

  async function navigateTo(view) {
    currentView = view;

    // Update nav buttons
    document.querySelectorAll('#bottom-nav button').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');

    // Render view content
    switch (view) {
      case 'today': await renderTodayView(); break;
      case 'monthly': renderMonthlyView(); break;
      case 'calendar': await Calendar.render(); break;
      case 'settings': loadSettings(); break;
    }
  }

  // ══════════════════════════════════════
  // ══ TODAY VIEW
  // ══════════════════════════════════════

  async function renderTodayView() {
    const settings = Storage.getSettings();
    const remaining = Planner.getRemainingDays(settings.examDate);

    // Encouragement message
    const ENCOURAGEMENT_MESSAGES = [
      "오늘도 한 걸음! 🔥 파이팅이에요 미람님💪",
      "오늘도 최선을 다하는 미람이가 자랑스러워 😊",
      "미람이가 노력하는 모습, 정말 멋져요 🌻",
      "미람아, 힘들어도 끝까지! 결과가 기다리고 있어 🎯",
      "미람아, 오늘도 응원해! 넌 할 수 있어 💪",
      "백미람 화이팅~~! 오늘 하루도 빛날 거야 ✨",
      "오늘 공부한 미람이에게 박수! 👏👏👏",
      "잘하고 있어요 미람님, 믿어보세요 😊",
      "오늘도 최선을 다하는 미람이가 자랑스러워 😊"
    ];
    const dayIndex = new Date().getDate() % ENCOURAGEMENT_MESSAGES.length;
    document.getElementById('encouragement-msg').textContent = ENCOURAGEMENT_MESSAGES[dayIndex];

    // D-day
    const ddayEl = document.getElementById('dday-display');
    ddayEl.textContent = remaining > 0 ? `D-${remaining}` : (remaining === 0 ? 'D-Day' : `D+${Math.abs(remaining)}`);

    // Completion rate
    const today = Storage.dateStr(new Date());
    const tasks = await ensureTodayTasks(today);
    const completedCount = tasks.filter(t => t.completed).length;
    const rate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    document.getElementById('completion-rate').textContent = `${rate}%`;

    // Growth stage
    const stage = GROWTH_STAGES.find(s => rate >= s.min && rate <= s.max) || GROWTH_STAGES[0];
    document.getElementById('growth-icon').textContent = stage.icon;
    document.getElementById('growth-label').textContent = stage.label;

    // Render tasks
    renderTasks(tasks);
  }

  async function ensureTodayTasks(date) {
    let tasks = await Storage.getTasksByDate(date);
    if (tasks.length === 0) {
      tasks = await Planner.generateDailyPlan(date);
      await Storage.saveTasks(tasks);
    }
    return tasks;
  }

  function renderTasks(tasks) {
    const container = document.getElementById('today-tasks');
    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">오늘의 할 일이 없습니다.</div>';
      return;
    }

    container.innerHTML = tasks.map(t => {
      const catClass = `tag-${t.category}`;
      const catLabel = Planner.CATEGORY_LABELS[t.category] || t.category;
      const duration = t.estimatedMinutes ? `${t.estimatedMinutes}분` : '';
      const checked = t.completed ? 'checked' : '';
      const completed = t.completed ? 'completed' : '';

      return `
        <div class="task-item ${completed}" data-task-id="${t.id}">
          <div class="task-checkbox ${checked}" data-task-id="${t.id}"></div>
          <div class="task-content">
            <div class="task-title">${t.title}</div>
            <div class="task-meta">
              <span class="tag ${catClass}">${catLabel}</span>
              ${duration ? `<span class="task-duration">${duration}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add checkbox event listeners
    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', async () => {
        const taskId = cb.dataset.taskId;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        await Storage.updateTask(task);

        // Re-render
        await renderTodayView();
      });
    });
  }

  // ══════════════════════════════════════
  // ══ TIMER
  // ══════════════════════════════════════

  function setupTimer() {
    Timer.init((state, remainingMs, totalMs) => {
      updateTimerUI(state, remainingMs, totalMs);
    });

    // Initial UI state
    const { state, remainingMs, totalMs } = Timer.getState();
    if (state === 'idle') {
      const settings = Storage.getSettings();
      const ms = settings.timerHours * 3600 * 1000;
      updateTimerUI('idle', ms, ms);
    } else {
      updateTimerUI(state, remainingMs, totalMs);
    }
  }

  function updateTimerUI(state, remainingMs, totalMs) {
    // Display
    const display = document.getElementById('timer-display');
    display.textContent = Timer.formatTime(remainingMs);

    // Controls
    const controls = document.getElementById('timer-controls');
    let html = '';
    switch (state) {
      case 'idle':
        html = `<button class="timer-btn timer-btn-primary" id="btn-timer-start">시작</button>`;
        break;
      case 'running':
        html = `
          <button class="timer-btn timer-btn-primary" id="btn-timer-pause">일시정지</button>
          <button class="timer-btn timer-btn-secondary" id="btn-timer-reset">초기화</button>
        `;
        break;
      case 'paused':
        html = `
          <button class="timer-btn timer-btn-primary" id="btn-timer-resume">이어하기</button>
          <button class="timer-btn timer-btn-secondary" id="btn-timer-reset">초기화</button>
        `;
        break;
      case 'done':
        html = `<button class="timer-btn timer-btn-secondary" id="btn-timer-reset">초기화</button>`;
        break;
    }
    controls.innerHTML = html;

    // Bind button events
    const startBtn = document.getElementById('btn-timer-start');
    const pauseBtn = document.getElementById('btn-timer-pause');
    const resumeBtn = document.getElementById('btn-timer-resume');
    const resetBtn = document.getElementById('btn-timer-reset');

    if (startBtn) startBtn.addEventListener('click', () => Timer.start());
    if (pauseBtn) pauseBtn.addEventListener('click', () => Timer.pause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => Timer.resume());
    if (resetBtn) resetBtn.addEventListener('click', () => Timer.reset());

    // Character state
    const container = document.getElementById('character-container');
    container.className = 'character-container';
    container.classList.add(`character-state-${state}`);

    const settings = Storage.getSettings();
    if (!settings.animationEnabled) {
      container.classList.add('animation-off');
    }

    // Done message
    const msg = document.getElementById('timer-message');
    msg.classList.toggle('visible', state === 'done');
  }

  // ══════════════════════════════════════
  // ══ MONTHLY VIEW
  // ══════════════════════════════════════

  function renderMonthlyView() {
    const settings = Storage.getSettings();

    // Phase roadmap
    const phases = Planner.generatePhaseRoadmap(settings.examDate);
    const phaseContainer = document.getElementById('phase-timeline');

    phaseContainer.innerHTML = phases.map(p => {
      const currentClass = p.isCurrent ? 'current' : '';
      const completedClass = p.isCompleted ? 'completed' : '';
      const startDate = formatDateShort(p.startDate);
      const endDate = formatDateShort(p.endDate);

      return `
        <div class="phase-card ${currentClass} ${completedClass}">
          <div class="phase-dot"></div>
          <div class="phase-name">${p.name}</div>
          <div class="phase-desc">${p.desc}</div>
          <div class="phase-dates">${startDate} ~ ${endDate} (${p.days}일)</div>
        </div>
      `;
    }).join('');

    // Milestones
    const milestones = Planner.generateMilestones(settings.examDate);
    const msContainer = document.getElementById('milestones-list');
    msContainer.innerHTML = milestones.map(m => `
      <div class="milestone-item">
        <span class="milestone-month">${m.month}</span>
        <span class="milestone-text">${m.text}</span>
      </div>
    `).join('');
  }

  // ══════════════════════════════════════
  // ══ SETTINGS
  // ══════════════════════════════════════

  function setupSettingsEvents() {
    // Exam date
    document.getElementById('setting-exam-date').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.examDate = e.target.value;
      Storage.saveSettings(s);
    });

    // Daily hours
    document.getElementById('setting-daily-hours').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.dailyStudyHours = parseInt(e.target.value) || 6;
      Storage.saveSettings(s);
    });

    // Timer hours
    document.getElementById('setting-timer-hours').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.timerHours = parseInt(e.target.value) || 6;
      Storage.saveSettings(s);
    });

    // Animation toggle
    document.getElementById('setting-animation').addEventListener('click', (e) => {
      const toggle = e.currentTarget;
      const s = Storage.getSettings();
      s.animationEnabled = !s.animationEnabled;
      toggle.classList.toggle('on', s.animationEnabled);
      document.getElementById('character-container').classList.toggle('animation-off', !s.animationEnabled);
      Storage.saveSettings(s);
    });

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const theme = opt.dataset.theme;
        const s = Storage.getSettings();
        s.theme = theme;
        Storage.saveSettings(s);
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.theme === theme);
        });
      });
    });
  }

  // ══════════════════════════════════════
  // ══ HELPERS
  // ══════════════════════════════════════

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return { init };
})();

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', () => App.init());
