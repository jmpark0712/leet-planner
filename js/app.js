/**
 * Main Application Controller (v1.1)
 * - Navigation / view routing
 * - View rendering
 * - Task editing (add/edit/delete)
 * - Completion counts & overall progress
 * - Data reset
 * - Service Worker registration
 */

const App = (() => {
  // ── State ──
  let currentView = 'today';
  let currentWeekStart = null;

  // ── Day names ──
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  // ── Encouragement Messages ──
  const DAILY_MESSAGES = [
    "오늘도 한 걸음! 🔥 파이팅이에요 💪",
    "지금 이 순간도 실력입니다 ✨",
    "백미람 화이팅~~! 오늘도 응원해요 😊",
    "천천히 가도 괜찮아요 🐢 꾸준함이 답이에요",
    "오늘 공부한 당신, 이미 대단해요 👏",
    "한 문제씩, 한 걸음씩! 할 수 있어요 🌟",
    "포기하지 않는 게 가장 중요해요 💜",
    "오늘 하루도 최선을 다하는 당신이 멋져요 🌈",
    "작은 노력이 큰 결과를 만들어요 🌱",
    "힘들 때일수록 성장하고 있는 거예요 💫",
    "당신의 노력은 절대 배신하지 않아요 🍀",
    "지치더라도 쉬어가면서 하면 돼요 ☕",
    "오늘도 열심히 하는 당신, 최고예요! 🏆",
    "매일 조금씩, 그게 비결이에요 📚",
    "응원합니다! 끝까지 함께할게요 🤝"
  ];

  const TIMER_COMPLETION_MESSAGES = [
    "오늘 하루도 정말 고생했어요 🌙",
    "6시간 완주! 스스로에게 박수 👏",
    "오늘 할 일, 끝까지 해낸 당신이 대단해요 ✨",
    "이만큼 해냈다는 게 중요해요 💯",
    "긴 시간 집중한 당신, 정말 멋져요 🌟",
    "오늘도 성실하게 완주! 대단합니다 🔥",
    "목표 시간 달성! 자랑스러워요 🏅"
  ];

  const PLAN_COMPLETION_MESSAGES = [
    "오늘의 할 일 모두 완료! 🎉 대단해요!",
    "완벽한 하루! 모든 계획을 해냈어요 ✨",
    "오늘 계획 올클리어! 👏 정말 수고했어요",
    "할 일 전부 끝! 💪 이 기세 그대로!",
    "오늘의 미션 컴플리트! 🏆 최고예요!"
  ];

  // ── Labels ──
  const REASON_LABELS = {
    'misread': '조건 오독',
    'missing-evidence': '근거 누락',
    'comparison-fail': '선지 비교 실패',
    'time-pressure': '시간 부족',
    'guess': '찍기'
  };

  const SUBJECT_LABELS = {
    'language': '언어이해',
    'logic': '추리논증',
    'essay': '논술'
  };

  const MATERIAL_LABELS = {
    'past-exam': '기출문제',
    'mock': '모의고사'
  };

  // ── Encouragement Helpers ──

  // Returns a deterministic daily index to select from a message pool
  function getDailyIndex(pool) {
    const today = Storage.dateStr(new Date());
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % pool.length;
  }

  function getDailyEncouragementMessage() {
    return DAILY_MESSAGES[getDailyIndex(DAILY_MESSAGES)];
  }

  // Key for tracking whether a milestone encouragement was shown today
  function getEncouragementShownKey() {
    return `leet-encouragement-${Storage.dateStr(new Date())}`;
  }

  function wasEncouragementShownToday() {
    return localStorage.getItem(getEncouragementShownKey()) === 'true';
  }

  function markEncouragementShownToday() {
    localStorage.setItem(getEncouragementShownKey(), 'true');
  }

  function showEncouragementToast(message) {
    if (wasEncouragementShownToday()) return;
    markEncouragementShownToday();

    const overlay = document.getElementById('encouragement-overlay');
    const toast = document.getElementById('encouragement-toast');
    toast.textContent = message;
    overlay.classList.add('open');

    // Auto-dismiss after 3 seconds, or tap to dismiss
    const dismiss = () => {
      overlay.classList.remove('open');
      overlay.removeEventListener('click', dismiss);
    };
    overlay.addEventListener('click', dismiss);
    setTimeout(dismiss, 3000);
  }

  function getRandomMessage(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Init ──
  async function init() {
    await Storage.init();
    loadSettings();
    setupNavigation();
    setupTimer();
    setupSettingsEvents();
    setupLogModal();
    setupTaskModal();
    setupRecordsTabs();
    setupResetData();

    await renderTodayView();
    registerSW();
  }

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
    document.getElementById('setting-ratio').value = s.languageRatio;
    document.getElementById('setting-ratio-label').textContent = `${s.languageRatio}:${100 - s.languageRatio}`;
    document.getElementById('setting-timer-hours').value = s.timerHours;

    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.theme === s.theme);
    });
  }

  // ── Navigation ──
  function setupNavigation() {
    document.querySelectorAll('#bottom-nav button').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });
  }

  async function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('#bottom-nav button').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');

    switch (view) {
      case 'today': await renderTodayView(); break;
      case 'weekly': await renderWeeklyView(); break;
      case 'monthly': await renderMonthlyView(); break;
      case 'records': await renderRecordsView(); break;
      case 'settings': loadSettings(); break;
    }
  }

  // ══════════════════════════════════════
  // ══ TODAY VIEW
  // ══════════════════════════════════════

  async function renderTodayView() {
    const settings = Storage.getSettings();
    const remaining = Planner.getRemainingDays(settings.examDate);
    const today = Storage.dateStr(new Date());

    // Daily encouragement banner
    document.getElementById('encouragement-banner').textContent = getDailyEncouragementMessage();

    // D-day
    const ddayEl = document.getElementById('dday-display');
    ddayEl.textContent = remaining > 0 ? `D-${remaining}` : (remaining === 0 ? 'D-Day' : `D+${Math.abs(remaining)}`);

    // Overall progress (completed / total planned until exam)
    const progress = await Planner.getOverallProgress();
    document.getElementById('progress-rate').textContent = `${progress.rate}%`;

    // Completion counts
    const dailyCount = await Planner.getDailyCompletionCount(today);
    document.getElementById('count-daily').textContent = `${dailyCount.done}/${dailyCount.total}`;

    const weekStart = Planner.getWeekStart(today);
    const weeklyCount = await Planner.getWeeklyCompletionCount(weekStart);
    document.getElementById('count-weekly').textContent = `${weeklyCount.done}/${weeklyCount.total}`;

    const now = new Date();
    const monthlyCount = await Planner.getMonthlyCompletionCount(now.getFullYear(), now.getMonth() + 1);
    document.getElementById('count-monthly').textContent = `${monthlyCount.done}/${monthlyCount.total}`;

    // Render tasks
    const tasks = await ensureTodayTasks(today);
    renderTasks(tasks, today);
  }

  async function ensureTodayTasks(date) {
    let tasks = await Storage.getTasksByDate(date);
    if (tasks.length === 0) {
      tasks = await Planner.generateDailyPlan(date);
      await Storage.saveTasks(tasks);
    }
    return tasks;
  }

  function renderTasks(tasks, date) {
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
            <div class="task-title">${escapeHtml(t.title)}</div>
            <div class="task-meta">
              <span class="tag ${catClass}">${catLabel}</span>
              ${duration ? `<span class="task-duration">${duration}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="task-action-btn" data-action="edit" data-task-id="${t.id}" title="수정">✎</button>
            <button class="task-action-btn delete" data-action="delete" data-task-id="${t.id}" title="삭제">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Checkbox events
    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', async () => {
        const task = tasks.find(t => t.id === cb.dataset.taskId);
        if (!task) return;
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        await Storage.updateTask(task);
        await renderTodayView();

        // Check if all daily tasks are now completed
        if (task.completed) {
          const updatedTasks = await Storage.getTasksByDate(date);
          if (updatedTasks.length > 0 && updatedTasks.every(t => t.completed)) {
            showEncouragementToast(getRandomMessage(PLAN_COMPLETION_MESSAGES));
          }
        }
      });
    });

    // Edit/Delete events
    container.querySelectorAll('.task-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskId = btn.dataset.taskId;
        const action = btn.dataset.action;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (action === 'edit') {
          openTaskModal(task);
        } else if (action === 'delete') {
          await Storage.deleteTask(taskId);
          await renderTodayView();
        }
      });
    });

    // Add task button
    const addBtn = document.getElementById('add-task-btn');
    addBtn.onclick = () => openTaskModal(null, date);
  }

  // ══════════════════════════════════════
  // ══ TIMER
  // ══════════════════════════════════════

  function setupTimer() {
    let prevState = null;

    Timer.init((state, remainingMs, totalMs) => {
      updateTimerUI(state, remainingMs);

      // Detect transition to 'done' for encouragement trigger
      if (state === 'done' && prevState === 'running') {
        handleTimerCompletion(totalMs);
      }
      prevState = state;
    });

    const { state, remainingMs } = Timer.getState();
    prevState = state;
    if (state === 'idle') {
      const settings = Storage.getSettings();
      const ms = settings.timerHours * 3600 * 1000;
      updateTimerUI('idle', ms);
    } else {
      updateTimerUI(state, remainingMs);
    }
  }

  function handleTimerCompletion(totalMs) {
    const settings = Storage.getSettings();
    const dailyTargetMs = settings.dailyStudyHours * 3600 * 1000;

    // Only show encouragement if timer duration >= daily study target
    if (totalMs < dailyTargetMs) return;

    // Don't show if encouragement already shown today (plan completion takes priority)
    if (wasEncouragementShownToday()) return;

    showEncouragementToast(getRandomMessage(TIMER_COMPLETION_MESSAGES));
  }

  function updateTimerUI(state, remainingMs) {
    document.getElementById('timer-display').textContent = Timer.formatTime(remainingMs);

    const controls = document.getElementById('timer-controls');
    let html = '';
    switch (state) {
      case 'idle':
        html = '<button class="timer-btn timer-btn-primary" id="btn-timer-start">시작</button>';
        break;
      case 'running':
        html = '<button class="timer-btn timer-btn-primary" id="btn-timer-pause">일시정지</button><button class="timer-btn timer-btn-secondary" id="btn-timer-reset">초기화</button>';
        break;
      case 'paused':
        html = '<button class="timer-btn timer-btn-primary" id="btn-timer-resume">이어하기</button><button class="timer-btn timer-btn-secondary" id="btn-timer-reset">초기화</button>';
        break;
      case 'done':
        html = '<button class="timer-btn timer-btn-secondary" id="btn-timer-reset">초기화</button>';
        break;
    }
    controls.innerHTML = html;

    const startBtn = document.getElementById('btn-timer-start');
    const pauseBtn = document.getElementById('btn-timer-pause');
    const resumeBtn = document.getElementById('btn-timer-resume');
    const resetBtn = document.getElementById('btn-timer-reset');
    if (startBtn) startBtn.addEventListener('click', () => Timer.start());
    if (pauseBtn) pauseBtn.addEventListener('click', () => Timer.pause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => Timer.resume());
    if (resetBtn) resetBtn.addEventListener('click', () => Timer.reset());

    // Timer message area — no longer shows a static message;
    // encouragement is handled via the toast overlay
    const msg = document.getElementById('timer-message');
    msg.classList.remove('visible');
  }

  // ══════════════════════════════════════
  // ══ TASK EDITING MODAL
  // ══════════════════════════════════════

  function setupTaskModal() {
    const modal = document.getElementById('task-modal');
    const closeBtn = document.getElementById('task-modal-close');
    const saveBtn = document.getElementById('task-save-btn');

    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    setupRadioGroup('task-edit-category');

    saveBtn.addEventListener('click', async () => {
      const title = document.getElementById('task-edit-title').value.trim();
      if (!title) return;

      const category = getRadioValue('task-edit-category') || 'review';
      const duration = parseInt(document.getElementById('task-edit-duration').value) || 0;
      const existingId = document.getElementById('task-edit-id').value;
      const date = document.getElementById('task-edit-date').value || Storage.dateStr(new Date());

      if (existingId) {
        // Edit existing task
        const tasks = await Storage.getTasksByDate(date);
        const task = tasks.find(t => t.id === existingId);
        if (task) {
          task.title = title;
          task.category = category;
          task.estimatedMinutes = duration || null;
          await Storage.updateTask(task);
        }
      } else {
        // Add new task
        const newTask = {
          id: `task-${date}-manual-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          date: date,
          title: title,
          category: category,
          estimatedMinutes: duration || null,
          completed: false,
          completedAt: null
        };
        await Storage.saveTasks([newTask]);
      }

      modal.classList.remove('open');

      // Re-render current view
      if (currentView === 'today') await renderTodayView();
      else if (currentView === 'weekly') await renderWeeklyView();
      else if (currentView === 'monthly') await renderMonthlyView();
    });
  }

  function openTaskModal(task, date) {
    const modal = document.getElementById('task-modal');
    const titleEl = document.getElementById('task-modal-title');
    const inputTitle = document.getElementById('task-edit-title');
    const inputDuration = document.getElementById('task-edit-duration');
    const inputId = document.getElementById('task-edit-id');
    const inputDate = document.getElementById('task-edit-date');

    if (task) {
      titleEl.textContent = '할 일 수정';
      inputTitle.value = task.title;
      inputDuration.value = task.estimatedMinutes || '';
      inputId.value = task.id;
      inputDate.value = task.date;
      // Select category
      document.querySelectorAll('#task-edit-category .form-radio').forEach(r => {
        r.classList.toggle('selected', r.dataset.value === task.category);
      });
    } else {
      titleEl.textContent = '할 일 추가';
      inputTitle.value = '';
      inputDuration.value = '';
      inputId.value = '';
      inputDate.value = date || Storage.dateStr(new Date());
      document.querySelectorAll('#task-edit-category .form-radio').forEach((r, i) => {
        r.classList.toggle('selected', i === 0);
      });
    }

    modal.classList.add('open');
    inputTitle.focus();
  }

  // ══════════════════════════════════════
  // ══ WEEKLY VIEW
  // ══════════════════════════════════════

  async function renderWeeklyView() {
    const today = Storage.dateStr(new Date());
    if (!currentWeekStart) {
      currentWeekStart = Planner.getWeekStart(today);
    }

    const weekDate = new Date(currentWeekStart + 'T00:00:00');
    const month = weekDate.getMonth() + 1;
    const weekNum = Math.ceil(weekDate.getDate() / 7);
    document.getElementById('week-label').textContent = `${month}월 ${weekNum}주차`;

    document.getElementById('prev-week').onclick = async () => {
      currentWeekStart = Storage.addDays(currentWeekStart, -7);
      await renderWeeklyView();
    };
    document.getElementById('next-week').onclick = async () => {
      currentWeekStart = Storage.addDays(currentWeekStart, 7);
      await renderWeeklyView();
    };
    document.getElementById('generate-week-btn').onclick = async () => {
      const nextWeek = Storage.addDays(currentWeekStart, 7);
      currentWeekStart = nextWeek;
      await Planner.generateWeeklyPlan(nextWeek);
      await renderWeeklyView();
    };

    // Weekly rates
    const rates = await Planner.getWeeklyRates(currentWeekStart);
    document.getElementById('weekly-review-rate').textContent = `${rates.reviewRate}%`;
    document.getElementById('weekly-resolve-rate').textContent = `${rates.resolveRate}%`;

    // Weekly completion count
    const weeklyCount = await Planner.getWeeklyCompletionCount(currentWeekStart);
    document.getElementById('weekly-completion-count').textContent = `${weeklyCount.done}/${weeklyCount.total}`;

    // Days
    const daysContainer = document.getElementById('weekly-days');
    let daysHtml = '';

    for (let i = 0; i < 7; i++) {
      const d = Storage.addDays(currentWeekStart, i);
      const dateObj = new Date(d + 'T00:00:00');
      const dayName = DAY_NAMES[dateObj.getDay()];
      const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      const isToday = d === today;

      const tasks = await Storage.getTasksByDate(d);
      const doneCount = tasks.filter(t => t.completed).length;
      const totalCount = tasks.length;
      const dayCompletion = totalCount > 0 ? `${doneCount}/${totalCount}` : '-';

      const tasksHtml = tasks.map(t => {
        const done = t.completed ? 'done' : '';
        const checkDone = t.completed ? 'done' : '';
        return `
          <div class="day-task ${done}">
            <span class="day-task-check ${checkDone}">${t.completed ? '✓' : ''}</span>
            <span>${escapeHtml(t.title)}</span>
            <button class="task-action-btn delete" style="margin-left:auto;width:20px;height:20px;font-size:10px;" data-weekly-delete="${t.id}" data-date="${d}" title="삭제">✕</button>
          </div>
        `;
      }).join('');

      daysHtml += `
        <div class="day-row" ${isToday ? 'style="border-left: 3px solid var(--primary);"' : ''}>
          <div class="day-header">
            <span class="day-name">${dayName} <span class="day-date">${displayDate}</span></span>
            <span class="day-completion">${dayCompletion}</span>
          </div>
          <div class="day-tasks">
            ${tasksHtml || '<div class="day-task" style="opacity:0.4;">계획 없음</div>'}
          </div>
          <button class="add-task-btn" style="margin-top:4px;padding:6px;font-size:11px;" data-add-date="${d}">+ 추가</button>
        </div>
      `;
    }

    daysContainer.innerHTML = daysHtml;

    // Bind weekly add buttons
    daysContainer.querySelectorAll('[data-add-date]').forEach(btn => {
      btn.addEventListener('click', () => openTaskModal(null, btn.dataset.addDate));
    });

    // Bind weekly delete buttons
    daysContainer.querySelectorAll('[data-weekly-delete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.deleteTask(btn.dataset.weeklyDelete);
        await renderWeeklyView();
      });
    });
  }

  // ══════════════════════════════════════
  // ══ MONTHLY VIEW
  // ══════════════════════════════════════

  async function renderMonthlyView() {
    const settings = Storage.getSettings();

    // Monthly completion count
    const now = new Date();
    const monthlyCount = await Planner.getMonthlyCompletionCount(now.getFullYear(), now.getMonth() + 1);
    document.getElementById('monthly-completion-count').textContent = `${monthlyCount.done}/${monthlyCount.total}`;

    // Phase roadmap
    const phases = Planner.generatePhaseRoadmap(settings.examDate);
    const phaseContainer = document.getElementById('phase-timeline');
    phaseContainer.innerHTML = phases.map(p => {
      const currentClass = p.isCurrent ? 'current' : '';
      const completedClass = p.isCompleted ? 'completed' : '';
      return `
        <div class="phase-card ${currentClass} ${completedClass}">
          <div class="phase-dot"></div>
          <div class="phase-name">${p.name}</div>
          <div class="phase-desc">${p.desc}</div>
          <div class="phase-dates">${formatDateShort(p.startDate)} ~ ${formatDateShort(p.endDate)} (${p.days}일)</div>
        </div>
      `;
    }).join('');

    // Milestones
    const milestones = Planner.generateMilestones(settings.examDate);
    document.getElementById('milestones-list').innerHTML = milestones.map(m => `
      <div class="milestone-item">
        <span class="milestone-month">${m.month}</span>
        <span class="milestone-text">${m.text}</span>
      </div>
    `).join('');

    // Subject ratio
    const langRatio = settings.languageRatio;
    const logicRatio = 100 - langRatio;
    document.getElementById('monthly-ratio-bar').innerHTML = `
      <div class="ratio-segment ratio-language" style="width:${langRatio}%">언어 ${langRatio}%</div>
      <div class="ratio-segment ratio-logic" style="width:${logicRatio}%">추리 ${logicRatio}%</div>
    `;
    document.getElementById('ratio-label-lang').textContent = `언어이해 ${langRatio}%`;
    document.getElementById('ratio-label-logic').textContent = `추리논증 ${logicRatio}%`;
  }

  // ══════════════════════════════════════
  // ══ RECORDS VIEW
  // ══════════════════════════════════════

  function setupRecordsTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
      });
    });
  }

  async function renderRecordsView() {
    await renderLogList();
    await renderAnalysis();
  }

  async function renderLogList() {
    const logs = await Storage.getLogs();
    const container = document.getElementById('log-list');

    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state">아직 기록이 없습니다.</div>';
      return;
    }

    container.innerHTML = logs.map(l => {
      const subjectLabel = SUBJECT_LABELS[l.subject] || l.subject;
      const materialLabel = MATERIAL_LABELS[l.materialType] || l.materialType;
      const resultClass = l.correct ? 'correct' : 'incorrect';
      const resultLabel = l.correct ? '정답' : '오답';

      let reasonHtml = '';
      if (!l.correct && l.mistakeReason) {
        reasonHtml = `<div class="log-reason">원인: ${REASON_LABELS[l.mistakeReason] || l.mistakeReason}</div>`;
      }

      let resolveHtml = '';
      if (!l.correct) {
        const r7 = l.resolved7 ? '완료' : l.resolveDate7;
        const r30 = l.resolved30 ? '완료' : l.resolveDate30;
        resolveHtml = `<div class="log-resolve-info">재풀이: 7일(${r7}) / 30일(${r30})</div>`;
      }

      return `
        <div class="log-item">
          <div class="log-item-header">
            <span class="log-date">${formatDateShort(l.date)}</span>
            <span class="log-result ${resultClass}">${resultLabel}</span>
          </div>
          <div class="log-detail">
            <span class="tag tag-${l.subject}">${subjectLabel}</span>
            ${materialLabel}
          </div>
          ${reasonHtml}${resolveHtml}
        </div>
      `;
    }).join('');
  }

  async function renderAnalysis() {
    const logs = await Storage.getLogs();
    const incorrectLogs = logs.filter(l => !l.correct);

    // Mistake reasons
    const reasonCounts = {};
    incorrectLogs.forEach(l => {
      if (l.mistakeReason) reasonCounts[l.mistakeReason] = (reasonCounts[l.mistakeReason] || 0) + 1;
    });
    const reasonContainer = document.getElementById('mistake-reasons');
    const maxR = Math.max(1, ...Object.values(reasonCounts));
    if (Object.keys(reasonCounts).length === 0) {
      reasonContainer.innerHTML = '<div class="empty-state">오답 데이터가 없습니다.</div>';
    } else {
      reasonContainer.innerHTML = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).map(([r, c]) => `
        <div class="reason-bar-item">
          <span class="reason-label">${REASON_LABELS[r] || r}</span>
          <div class="reason-bar"><div class="reason-bar-fill" style="width:${Math.round((c / maxR) * 100)}%"></div></div>
          <span class="reason-count">${c}</span>
        </div>
      `).join('');
    }

    // Weak subjects
    const subjCounts = {};
    incorrectLogs.forEach(l => { subjCounts[l.subject] = (subjCounts[l.subject] || 0) + 1; });
    const subjContainer = document.getElementById('weak-subjects');
    const maxS = Math.max(1, ...Object.values(subjCounts));
    if (Object.keys(subjCounts).length === 0) {
      subjContainer.innerHTML = '<div class="empty-state">오답 데이터가 없습니다.</div>';
    } else {
      subjContainer.innerHTML = Object.entries(subjCounts).sort((a, b) => b[1] - a[1]).map(([s, c]) => `
        <div class="reason-bar-item">
          <span class="reason-label">${SUBJECT_LABELS[s] || s}</span>
          <div class="reason-bar"><div class="reason-bar-fill" style="width:${Math.round((c / maxS) * 100)}%"></div></div>
          <span class="reason-count">${c}</span>
        </div>
      `).join('');
    }

    // Pending re-solves
    const resolves = await Storage.getUpcomingResolves();
    const resolveContainer = document.getElementById('resolve-list');
    if (resolves.length === 0) {
      resolveContainer.innerHTML = '<div class="empty-state">재풀이 대기 항목이 없습니다.</div>';
    } else {
      resolveContainer.innerHTML = resolves.map(r => {
        const overdueStyle = r.overdue ? 'style="color:var(--primary);font-weight:700;"' : '';
        return `
          <div class="resolve-item">
            <div>
              <div class="resolve-info">${SUBJECT_LABELS[r.subject] || r.subject} (${r.resolveType} 재풀이)</div>
              <div class="resolve-date" ${overdueStyle}>${formatDateShort(r.dueDate)}${r.overdue ? ' (기한 도래)' : ''}</div>
            </div>
            <button class="resolve-complete-btn" data-log-id="${r.id}" data-type="${r.resolveType}">완료</button>
          </div>
        `;
      }).join('');

      resolveContainer.querySelectorAll('.resolve-complete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const allLogs = await Storage.getLogs();
          const log = allLogs.find(l => l.id === btn.dataset.logId);
          if (!log) return;
          if (btn.dataset.type === '7일') log.resolved7 = true;
          if (btn.dataset.type === '30일') log.resolved30 = true;
          await Storage.updateLog(log);
          await renderRecordsView();
        });
      });
    }
  }

  // ══════════════════════════════════════
  // ══ LOG MODAL
  // ══════════════════════════════════════

  function setupLogModal() {
    const modal = document.getElementById('log-modal');
    const addBtn = document.getElementById('add-log-btn');
    const closeBtn = document.getElementById('log-modal-close');
    const saveBtn = document.getElementById('log-save-btn');

    addBtn.addEventListener('click', () => {
      document.getElementById('log-date').value = Storage.dateStr(new Date());
      resetLogModalSelections();
      modal.classList.add('open');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    setupRadioGroup('log-subject');
    setupRadioGroup('log-material');
    setupRadioGroup('log-correct', (value) => {
      document.getElementById('mistake-reason-group').style.display = value === 'false' ? 'block' : 'none';
    });

    document.querySelectorAll('#log-reason .form-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#log-reason .form-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });

    saveBtn.addEventListener('click', async () => {
      const date = document.getElementById('log-date').value;
      const subject = getRadioValue('log-subject');
      const materialType = getRadioValue('log-material');
      const correct = getRadioValue('log-correct') === 'true';
      let mistakeReason = null;
      if (!correct) {
        const chip = document.querySelector('#log-reason .form-chip.selected');
        mistakeReason = chip ? chip.dataset.value : null;
      }

      await Storage.addLog({
        date, subject, materialType, correct, mistakeReason,
        resolveDate7: correct ? null : Storage.addDays(date, 7),
        resolveDate30: correct ? null : Storage.addDays(date, 30),
        resolved7: false, resolved30: false
      });
      modal.classList.remove('open');
      await renderRecordsView();
    });
  }

  function resetLogModalSelections() {
    ['log-subject', 'log-material', 'log-correct'].forEach(id => {
      document.querySelectorAll(`#${id} .form-radio`).forEach((r, i) => r.classList.toggle('selected', i === 0));
    });
    document.querySelectorAll('#log-reason .form-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('mistake-reason-group').style.display = 'none';
  }

  // ══════════════════════════════════════
  // ══ SETTINGS
  // ══════════════════════════════════════

  function setupSettingsEvents() {
    document.getElementById('setting-exam-date').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.examDate = e.target.value;
      Storage.saveSettings(s);
    });

    document.getElementById('setting-daily-hours').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.dailyStudyHours = parseInt(e.target.value) || 6;
      Storage.saveSettings(s);
    });

    const ratioSlider = document.getElementById('setting-ratio');
    ratioSlider.addEventListener('input', (e) => {
      document.getElementById('setting-ratio-label').textContent = `${e.target.value}:${100 - e.target.value}`;
    });
    ratioSlider.addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.languageRatio = parseInt(e.target.value);
      Storage.saveSettings(s);
    });

    document.getElementById('setting-timer-hours').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.timerHours = parseInt(e.target.value) || 6;
      Storage.saveSettings(s);
    });

    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const theme = opt.dataset.theme;
        const s = Storage.getSettings();
        s.theme = theme;
        Storage.saveSettings(s);
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-option').forEach(o => o.classList.toggle('selected', o.dataset.theme === theme));
      });
    });
  }

  // ══════════════════════════════════════
  // ══ RESET DATA
  // ══════════════════════════════════════

  function setupResetData() {
    document.getElementById('reset-data-btn').addEventListener('click', () => {
      showConfirm('데이터 초기화', '모든 학습 기록, 계획, 설정이 삭제됩니다. 계속하시겠습니까?', async () => {
        await Storage.resetAllData();
        location.reload();
      });
    });
  }

  function showConfirm(title, msg, onConfirm) {
    const overlay = document.getElementById('confirm-dialog');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    overlay.classList.add('open');

    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');

    const cleanup = () => {
      overlay.classList.remove('open');
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      okBtn.replaceWith(okBtn.cloneNode(true));
    };

    document.getElementById('confirm-cancel').addEventListener('click', cleanup);
    document.getElementById('confirm-ok').addEventListener('click', () => {
      cleanup();
      onConfirm();
    });
  }

  // ══════════════════════════════════════
  // ══ HELPERS
  // ══════════════════════════════════════

  function setupRadioGroup(containerId, onChange) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.form-radio').forEach(radio => {
      radio.addEventListener('click', () => {
        container.querySelectorAll('.form-radio').forEach(r => r.classList.remove('selected'));
        radio.classList.add('selected');
        if (onChange) onChange(radio.dataset.value);
      });
    });
  }

  function getRadioValue(containerId) {
    const sel = document.querySelector(`#${containerId} .form-radio.selected`);
    return sel ? sel.dataset.value : null;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
