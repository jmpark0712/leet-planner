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
  let currentWeekStart = null;

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

  // ── Mistake reason labels ──
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

  // ── Init ──
  async function init() {
    await Storage.init();
    loadSettings();
    setupNavigation();
    setupTimer();
    setupSettingsEvents();
    setupLogModal();
    setupRecordsTabs();

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
    document.getElementById('setting-ratio').value = s.languageRatio;
    document.getElementById('setting-ratio-label').textContent = `${s.languageRatio}:${100 - s.languageRatio}`;
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
      case 'weekly': await renderWeeklyView(); break;
      case 'monthly': renderMonthlyView(); break;
      case 'calendar': await Calendar.render(); break;
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
  // ══ WEEKLY VIEW
  // ══════════════════════════════════════

  async function renderWeeklyView() {
    const today = Storage.dateStr(new Date());
    if (!currentWeekStart) {
      currentWeekStart = Planner.getWeekStart(today);
    }

    // Week label
    const weekDate = new Date(currentWeekStart + 'T00:00:00');
    const month = weekDate.getMonth() + 1;
    const weekNum = Math.ceil(weekDate.getDate() / 7);
    document.getElementById('week-label').textContent = `${month}월 ${weekNum}주차`;

    // Navigation
    document.getElementById('prev-week').onclick = async () => {
      currentWeekStart = Storage.addDays(currentWeekStart, -7);
      await renderWeeklyView();
    };
    document.getElementById('next-week').onclick = async () => {
      currentWeekStart = Storage.addDays(currentWeekStart, 7);
      await renderWeeklyView();
    };

    // Generate button
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

    // Days
    const daysContainer = document.getElementById('weekly-days');
    let daysHtml = '';

    for (let i = 0; i < 7; i++) {
      const d = Storage.addDays(currentWeekStart, i);
      const dateObj = new Date(d + 'T00:00:00');
      const dayName = DAY_NAMES[dateObj.getDay()];
      const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      const isToday = d === today;

      let tasks = await Storage.getTasksByDate(d);
      const doneCount = tasks.filter(t => t.completed).length;
      const totalCount = tasks.length;
      const dayCompletion = totalCount > 0 ? `${doneCount}/${totalCount}` : '-';

      const tasksHtml = tasks.map(t => {
        const done = t.completed ? 'done' : '';
        const checkDone = t.completed ? 'done' : '';
        const catLabel = Planner.CATEGORY_LABELS[t.category] || '';
        return `
          <div class="day-task ${done}">
            <span class="day-task-check ${checkDone}">${t.completed ? '✓' : ''}</span>
            <span>${catLabel} ${t.title}</span>
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
        </div>
      `;
    }

    daysContainer.innerHTML = daysHtml;
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

    // Subject ratio
    const langRatio = settings.languageRatio;
    const logicRatio = 100 - langRatio;
    const ratioBar = document.getElementById('monthly-ratio-bar');
    ratioBar.innerHTML = `
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
    const recordsView = document.getElementById('view-records');
    recordsView.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        recordsView.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        recordsView.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
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
        const reasonLabel = REASON_LABELS[l.mistakeReason] || l.mistakeReason;
        reasonHtml = `<div class="log-reason">원인: ${reasonLabel}</div>`;
      }

      let resolveHtml = '';
      if (!l.correct) {
        const r7Status = l.resolved7 ? '완료' : l.resolveDate7;
        const r30Status = l.resolved30 ? '완료' : l.resolveDate30;
        resolveHtml = `<div class="log-resolve-info">재풀이: 7일(${r7Status}) / 30일(${r30Status})</div>`;
      }

      return `
        <div class="log-item">
          <div class="log-item-header">
            <span class="log-date">${formatDateShort(l.date)}</span>
            <span class="log-result ${resultClass}">${resultLabel}</span>
          </div>
          <div class="log-detail">
            <span class="tag tag-${l.subject === 'language' ? 'language' : l.subject === 'logic' ? 'logic' : 'essay'}">${subjectLabel}</span>
            ${materialLabel}
          </div>
          ${reasonHtml}
          ${resolveHtml}
        </div>
      `;
    }).join('');
  }

  async function renderAnalysis() {
    const logs = await Storage.getLogs();
    const incorrectLogs = logs.filter(l => !l.correct);

    // Top mistake reasons
    const reasonCounts = {};
    incorrectLogs.forEach(l => {
      if (l.mistakeReason) {
        reasonCounts[l.mistakeReason] = (reasonCounts[l.mistakeReason] || 0) + 1;
      }
    });

    const reasonContainer = document.getElementById('mistake-reasons');
    const maxReasonCount = Math.max(1, ...Object.values(reasonCounts));

    if (Object.keys(reasonCounts).length === 0) {
      reasonContainer.innerHTML = '<div class="empty-state">오답 데이터가 없습니다.</div>';
    } else {
      const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
      reasonContainer.innerHTML = sortedReasons.map(([reason, count]) => {
        const label = REASON_LABELS[reason] || reason;
        const pct = Math.round((count / maxReasonCount) * 100);
        return `
          <div class="reason-bar-item">
            <span class="reason-label">${label}</span>
            <div class="reason-bar"><div class="reason-bar-fill" style="width:${pct}%"></div></div>
            <span class="reason-count">${count}</span>
          </div>
        `;
      }).join('');
    }

    // Weak subjects
    const subjectCounts = {};
    incorrectLogs.forEach(l => {
      subjectCounts[l.subject] = (subjectCounts[l.subject] || 0) + 1;
    });

    const subjectContainer = document.getElementById('weak-subjects');
    const maxSubjectCount = Math.max(1, ...Object.values(subjectCounts));

    if (Object.keys(subjectCounts).length === 0) {
      subjectContainer.innerHTML = '<div class="empty-state">오답 데이터가 없습니다.</div>';
    } else {
      const sortedSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]);
      subjectContainer.innerHTML = sortedSubjects.map(([subject, count]) => {
        const label = SUBJECT_LABELS[subject] || subject;
        const pct = Math.round((count / maxSubjectCount) * 100);
        return `
          <div class="reason-bar-item">
            <span class="reason-label">${label}</span>
            <div class="reason-bar"><div class="reason-bar-fill" style="width:${pct}%"></div></div>
            <span class="reason-count">${count}</span>
          </div>
        `;
      }).join('');
    }

    // Pending re-solves
    const resolves = await Storage.getUpcomingResolves();
    const resolveContainer = document.getElementById('resolve-list');

    if (resolves.length === 0) {
      resolveContainer.innerHTML = '<div class="empty-state">재풀이 대기 항목이 없습니다.</div>';
    } else {
      resolveContainer.innerHTML = resolves.map(r => {
        const subjectLabel = SUBJECT_LABELS[r.subject] || r.subject;
        const overdueClass = r.overdue ? 'style="color:var(--primary);font-weight:700;"' : '';
        return `
          <div class="resolve-item">
            <div>
              <div class="resolve-info">${subjectLabel} (${r.resolveType} 재풀이)</div>
              <div class="resolve-date" ${overdueClass}>${formatDateShort(r.dueDate)}${r.overdue ? ' (기한 도래)' : ''}</div>
            </div>
            <button class="resolve-complete-btn" data-log-id="${r.id}" data-type="${r.resolveType}">완료</button>
          </div>
        `;
      }).join('');

      // Bind complete buttons
      resolveContainer.querySelectorAll('.resolve-complete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const logId = btn.dataset.logId;
          const type = btn.dataset.type;
          const logs = await Storage.getLogs();
          const log = logs.find(l => l.id === logId);
          if (!log) return;

          if (type === '7일') log.resolved7 = true;
          if (type === '30일') log.resolved30 = true;

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
      resetModalSelections();
      modal.classList.add('open');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // Radio groups
    setupRadioGroup('log-subject');
    setupRadioGroup('log-material');
    setupRadioGroup('log-correct', (value) => {
      document.getElementById('mistake-reason-group').style.display = value === 'false' ? 'block' : 'none';
    });

    // Mistake reason chips
    document.querySelectorAll('#log-reason .form-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#log-reason .form-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });

    // Save
    saveBtn.addEventListener('click', async () => {
      const date = document.getElementById('log-date').value;
      const subject = getRadioValue('log-subject');
      const materialType = getRadioValue('log-material');
      const correct = getRadioValue('log-correct') === 'true';
      let mistakeReason = null;

      if (!correct) {
        const selectedChip = document.querySelector('#log-reason .form-chip.selected');
        mistakeReason = selectedChip ? selectedChip.dataset.value : null;
      }

      const entry = {
        date,
        subject,
        materialType,
        correct,
        mistakeReason,
        resolveDate7: correct ? null : Storage.addDays(date, 7),
        resolveDate30: correct ? null : Storage.addDays(date, 30),
        resolved7: false,
        resolved30: false
      };

      await Storage.addLog(entry);
      modal.classList.remove('open');
      await renderRecordsView();
    });
  }

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
    const selected = document.querySelector(`#${containerId} .form-radio.selected`);
    return selected ? selected.dataset.value : null;
  }

  function resetModalSelections() {
    // Reset subject
    document.querySelectorAll('#log-subject .form-radio').forEach((r, i) => {
      r.classList.toggle('selected', i === 0);
    });
    // Reset material
    document.querySelectorAll('#log-material .form-radio').forEach((r, i) => {
      r.classList.toggle('selected', i === 0);
    });
    // Reset correct
    document.querySelectorAll('#log-correct .form-radio').forEach((r, i) => {
      r.classList.toggle('selected', i === 0);
    });
    // Reset reason
    document.querySelectorAll('#log-reason .form-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('mistake-reason-group').style.display = 'none';
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

    // Ratio slider
    const ratioSlider = document.getElementById('setting-ratio');
    ratioSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('setting-ratio-label').textContent = `${val}:${100 - val}`;
    });
    ratioSlider.addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.languageRatio = parseInt(e.target.value);
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
