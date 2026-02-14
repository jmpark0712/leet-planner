/**
 * Calendar Module
 * - Monthly planner, Daily planner, Monthly Evaluation, Online Class Check
 */

const Calendar = (() => {
  const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'];
  const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'];

  let currentTab = 'monthly';
  let monthlyYear, monthlyMonth;
  let dailyDate;
  let evalYear, evalMonth;
  let classYear, classMonth;

  let debounceTimers = {};

  function debounce(key, fn, delay = 500) {
    clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(fn, delay);
  }

  // ── Init / Render ──
  async function render() {
    setupSubTabs();
    await renderCurrentTab();
  }

  function setupSubTabs() {
    document.querySelectorAll('.cal-tab-btn').forEach(btn => {
      btn.onclick = async () => {
        currentTab = btn.dataset.calTab;
        document.querySelectorAll('.cal-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.cal-tab-content').forEach(c => c.classList.toggle('active', c.id === `cal-${currentTab}`));
        await renderCurrentTab();
      };
    });
  }

  async function renderCurrentTab() {
    switch (currentTab) {
      case 'monthly': await renderMonthly(); break;
      case 'daily': await renderDaily(); break;
      case 'evaluation': await renderEvaluation(); break;
      case 'classes': await renderClasses(); break;
    }
  }

  // ══════════════════════════════════════
  // ══ MONTHLY PAGE
  // ══════════════════════════════════════

  async function renderMonthly() {
    const now = new Date();
    if (!monthlyYear) { monthlyYear = now.getFullYear(); monthlyMonth = now.getMonth() + 1; }

    const data = await Storage.getCalendarMonthly(monthlyYear, monthlyMonth);
    const container = document.getElementById('cal-monthly');

    const daysInMonth = new Date(monthlyYear, monthlyMonth, 0).getDate();
    // Monday-start: getDay() returns 0=Sun, so Mon=1. We want Mon=0
    const firstDayIdx = (new Date(monthlyYear, monthlyMonth - 1, 1).getDay() + 6) % 7;
    const weeks = Math.ceil((firstDayIdx + daysInMonth) / 7);

    // Month bubbles
    let bubblesHtml = '';
    for (let m = 1; m <= 12; m++) {
      const active = m === monthlyMonth ? 'active' : '';
      bubblesHtml += `<span class="month-bubble ${active}" data-month="${m}">${MONTH_NAMES[m - 1]}</span>`;
    }

    // Calendar grid
    let gridHtml = `
      <div class="cal-grid-header">
        <span>월</span><span>화</span><span>수</span>
        <span>목</span><span>금</span><span>토</span>
        <span class="sunday">일</span>
      </div>
      <div class="cal-grid-body">`;

    const today = Storage.dateStr(new Date());
    let cellIdx = 0;
    for (let w = 0; w < weeks; w++) {
      gridHtml += '<div class="cal-grid-row">';
      for (let d = 0; d < 7; d++) {
        const dayNum = cellIdx - firstDayIdx + 1;
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          const dateStr = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isToday = dateStr === today;
          const hasNote = data.dailyNotes[dayNum] ? 'has-note' : '';
          const isSunday = d === 6 ? 'sunday' : '';
          const todayClass = isToday ? 'today' : '';
          gridHtml += `<div class="cal-grid-cell ${hasNote} ${isSunday} ${todayClass}" data-day="${dayNum}">
            <span class="cal-day-num">${dayNum}</span>
            ${data.dailyNotes[dayNum] ? '<span class="cal-note-dot"></span>' : ''}
          </div>`;
        } else {
          gridHtml += '<div class="cal-grid-cell empty"></div>';
        }
        cellIdx++;
      }
      gridHtml += '</div>';
    }
    gridHtml += '</div>';

    // Todos HTML
    let todosHtml = data.todos.map((t, i) => `
      <div class="cal-todo-item">
        <div class="cal-todo-check ${t.completed ? 'checked' : ''}" data-idx="${i}"></div>
        <input type="text" class="cal-todo-text" value="${escapeHtml(t.text)}" data-idx="${i}" placeholder="할 일 입력">
        <button class="cal-todo-del" data-idx="${i}">&times;</button>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="cal-month-selector">
        <button class="cal-nav-btn" id="cal-month-prev">&larr;</button>
        <span class="cal-month-title">${monthlyYear}년 ${monthlyMonth}월</span>
        <button class="cal-nav-btn" id="cal-month-next">&rarr;</button>
      </div>
      <div class="cal-month-bubbles">${bubblesHtml}</div>
      <div class="cal-calendar-grid">${gridHtml}</div>
      <div class="cal-bottom-section">
        <div class="cal-bottom-left">
          <div class="cal-card">
            <div class="cal-card-title">GOAL</div>
            <textarea class="cal-textarea" id="cal-monthly-goal" placeholder="이번 달 목표를 적어보세요">${escapeHtml(data.goal)}</textarea>
          </div>
          <div class="cal-card">
            <div class="cal-card-title">MEMO</div>
            <textarea class="cal-textarea" id="cal-monthly-memo" placeholder="메모를 적어보세요">${escapeHtml(data.memo)}</textarea>
          </div>
        </div>
        <div class="cal-bottom-right">
          <div class="cal-card">
            <div class="cal-card-title">TO-DO</div>
            <div class="cal-todo-list" id="cal-monthly-todos">${todosHtml}</div>
            <button class="cal-add-todo-btn" id="cal-add-todo">+ 추가</button>
          </div>
        </div>
      </div>
    `;

    // Events
    document.getElementById('cal-month-prev').onclick = () => { changeMonth(-1); };
    document.getElementById('cal-month-next').onclick = () => { changeMonth(1); };

    // Month bubbles
    container.querySelectorAll('.month-bubble').forEach(b => {
      b.onclick = () => {
        monthlyMonth = parseInt(b.dataset.month);
        renderMonthly();
      };
    });

    // Day cell click → prompt for note
    container.querySelectorAll('.cal-grid-cell:not(.empty)').forEach(cell => {
      cell.onclick = async () => {
        const day = parseInt(cell.dataset.day);
        const existing = data.dailyNotes[day] || '';
        const note = prompt(`${monthlyMonth}월 ${day}일 메모`, existing);
        if (note !== null) {
          data.dailyNotes[day] = note;
          await Storage.saveCalendarMonthly(data);
          renderMonthly();
        }
      };
    });

    // Goal auto-save
    document.getElementById('cal-monthly-goal').oninput = (e) => {
      debounce('monthly-goal', async () => {
        data.goal = e.target.value;
        await Storage.saveCalendarMonthly(data);
      });
    };

    // Memo auto-save
    document.getElementById('cal-monthly-memo').oninput = (e) => {
      debounce('monthly-memo', async () => {
        data.memo = e.target.value;
        await Storage.saveCalendarMonthly(data);
      });
    };

    // Todos
    setupMonthlyTodos(data, container);
  }

  function setupMonthlyTodos(data, container) {
    // Add todo
    document.getElementById('cal-add-todo').onclick = async () => {
      data.todos.push({ id: `todo-${Date.now()}`, text: '', completed: false });
      await Storage.saveCalendarMonthly(data);
      renderMonthly();
    };

    // Check/uncheck
    container.querySelectorAll('.cal-todo-check').forEach(cb => {
      cb.onclick = async (e) => {
        e.stopPropagation();
        const idx = parseInt(cb.dataset.idx);
        data.todos[idx].completed = !data.todos[idx].completed;
        await Storage.saveCalendarMonthly(data);
        renderMonthly();
      };
    });

    // Edit text
    container.querySelectorAll('.cal-todo-text').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(input.dataset.idx);
        debounce(`monthly-todo-${idx}`, async () => {
          data.todos[idx].text = e.target.value;
          await Storage.saveCalendarMonthly(data);
        });
      };
    });

    // Delete
    container.querySelectorAll('.cal-todo-del').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        data.todos.splice(idx, 1);
        await Storage.saveCalendarMonthly(data);
        renderMonthly();
      };
    });
  }

  function changeMonth(delta) {
    monthlyMonth += delta;
    if (monthlyMonth > 12) { monthlyMonth = 1; monthlyYear++; }
    if (monthlyMonth < 1) { monthlyMonth = 12; monthlyYear--; }
    renderMonthly();
  }

  // ══════════════════════════════════════
  // ══ DAILY PAGE
  // ══════════════════════════════════════

  async function renderDaily() {
    if (!dailyDate) dailyDate = Storage.dateStr(new Date());
    const data = await Storage.getCalendarDaily(dailyDate);
    const container = document.getElementById('cal-daily');

    const dateObj = new Date(dailyDate + 'T00:00:00');
    const dayName = DAY_NAMES_KR[dateObj.getDay()];
    const displayDate = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')} (${dayName})`;

    // Hourly timeline: 05:00 ~ 27:00 (3AM next day)
    let timelineHtml = '';
    for (let h = 5; h <= 27; h++) {
      const displayHour = h >= 24 ? h - 24 : h;
      const label = `${String(displayHour).padStart(2, '0')}:00`;
      const entry = data.hourlySchedule[h] || {};
      const hasText = entry.text ? 'has-entry' : '';
      timelineHtml += `
        <div class="cal-hour-row ${hasText}" data-hour="${h}">
          <span class="cal-hour-label">${label}</span>
          <div class="cal-hour-content">
            <input type="text" class="cal-hour-input" value="${escapeHtml(entry.text || '')}" placeholder="일정 입력" data-hour="${h}">
          </div>
        </div>`;
    }

    // Top priorities
    let prioritiesHtml = (data.topPriorities.length > 0 ? data.topPriorities : [
      { id: 'p1', text: '', completed: false },
      { id: 'p2', text: '', completed: false },
      { id: 'p3', text: '', completed: false }
    ]).map((p, i) => `
      <div class="cal-priority-item">
        <div class="cal-todo-check ${p.completed ? 'checked' : ''}" data-pidx="${i}"></div>
        <input type="text" class="cal-priority-text" value="${escapeHtml(p.text)}" data-pidx="${i}" placeholder="우선순위 ${i + 1}">
      </div>
    `).join('');

    // Todos
    let todosHtml = data.todos.map((t, i) => `
      <div class="cal-todo-item">
        <div class="cal-todo-check ${t.completed ? 'checked' : ''}" data-idx="${i}"></div>
        <input type="text" class="cal-todo-text" value="${escapeHtml(t.text)}" data-idx="${i}" placeholder="할 일 입력">
        <button class="cal-todo-del" data-idx="${i}">&times;</button>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="cal-month-selector">
        <button class="cal-nav-btn" id="cal-daily-prev">&larr;</button>
        <span class="cal-month-title">${displayDate}</span>
        <button class="cal-nav-btn" id="cal-daily-next">&rarr;</button>
      </div>
      <div class="cal-daily-timeline">${timelineHtml}</div>
      <div class="cal-daily-sections">
        <div class="cal-card">
          <div class="cal-card-title">TOP PRIORITIES</div>
          <div class="cal-priority-list">${prioritiesHtml}</div>
        </div>
        <div class="cal-card">
          <div class="cal-card-title">TO-DO</div>
          <div class="cal-todo-list" id="cal-daily-todos">${todosHtml}</div>
          <button class="cal-add-todo-btn" id="cal-daily-add-todo">+ 추가</button>
        </div>
        <div class="cal-card">
          <div class="cal-card-title">MEMO</div>
          <textarea class="cal-textarea" id="cal-daily-memo" placeholder="오늘의 메모">${escapeHtml(data.memo)}</textarea>
        </div>
        <div class="cal-card">
          <div class="cal-card-title">GOAL</div>
          <textarea class="cal-textarea cal-textarea-sm" id="cal-daily-goal" placeholder="오늘의 목표 달성률 및 다짐">${escapeHtml(data.goal)}</textarea>
        </div>
      </div>
    `;

    // Date navigation
    document.getElementById('cal-daily-prev').onclick = () => {
      dailyDate = Storage.addDays(dailyDate, -1);
      renderDaily();
    };
    document.getElementById('cal-daily-next').onclick = () => {
      dailyDate = Storage.addDays(dailyDate, 1);
      renderDaily();
    };

    // Hourly inputs
    container.querySelectorAll('.cal-hour-input').forEach(input => {
      input.oninput = (e) => {
        const h = parseInt(input.dataset.hour);
        debounce(`daily-hour-${h}`, async () => {
          if (!data.hourlySchedule[h]) data.hourlySchedule[h] = {};
          data.hourlySchedule[h].text = e.target.value;
          await Storage.saveCalendarDaily(data);
        });
      };
    });

    // Top priorities
    if (data.topPriorities.length === 0) {
      data.topPriorities = [
        { id: 'p1', text: '', completed: false },
        { id: 'p2', text: '', completed: false },
        { id: 'p3', text: '', completed: false }
      ];
    }
    container.querySelectorAll('.cal-priority-text').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(input.dataset.pidx);
        debounce(`daily-priority-${idx}`, async () => {
          data.topPriorities[idx].text = e.target.value;
          await Storage.saveCalendarDaily(data);
        });
      };
    });
    container.querySelectorAll('.cal-priority-item .cal-todo-check').forEach(cb => {
      cb.onclick = async () => {
        const idx = parseInt(cb.dataset.pidx);
        data.topPriorities[idx].completed = !data.topPriorities[idx].completed;
        await Storage.saveCalendarDaily(data);
        renderDaily();
      };
    });

    // Memo & Goal
    document.getElementById('cal-daily-memo').oninput = (e) => {
      debounce('daily-memo', async () => {
        data.memo = e.target.value;
        await Storage.saveCalendarDaily(data);
      });
    };
    document.getElementById('cal-daily-goal').oninput = (e) => {
      debounce('daily-goal', async () => {
        data.goal = e.target.value;
        await Storage.saveCalendarDaily(data);
      });
    };

    // Todos
    setupDailyTodos(data, container);
  }

  function setupDailyTodos(data, container) {
    document.getElementById('cal-daily-add-todo').onclick = async () => {
      data.todos.push({ id: `todo-${Date.now()}`, text: '', completed: false });
      await Storage.saveCalendarDaily(data);
      renderDaily();
    };
    container.querySelectorAll('#cal-daily-todos .cal-todo-check').forEach(cb => {
      cb.onclick = async (e) => {
        e.stopPropagation();
        const idx = parseInt(cb.dataset.idx);
        data.todos[idx].completed = !data.todos[idx].completed;
        await Storage.saveCalendarDaily(data);
        renderDaily();
      };
    });
    container.querySelectorAll('#cal-daily-todos .cal-todo-text').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(input.dataset.idx);
        debounce(`daily-todo-${idx}`, async () => {
          data.todos[idx].text = e.target.value;
          await Storage.saveCalendarDaily(data);
        });
      };
    });
    container.querySelectorAll('#cal-daily-todos .cal-todo-del').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        data.todos.splice(idx, 1);
        await Storage.saveCalendarDaily(data);
        renderDaily();
      };
    });
  }

  // ══════════════════════════════════════
  // ══ MONTHLY EVALUATION PAGE
  // ══════════════════════════════════════

  async function renderEvaluation() {
    const now = new Date();
    if (!evalYear) { evalYear = now.getFullYear(); evalMonth = now.getMonth() + 1; }
    const data = await Storage.getCalendarEvaluation(evalYear, evalMonth);
    const container = document.getElementById('cal-evaluation');

    container.innerHTML = `
      <div class="cal-month-selector">
        <button class="cal-nav-btn" id="cal-eval-prev">&larr;</button>
        <span class="cal-month-title">${evalYear}년 ${evalMonth}월</span>
        <button class="cal-nav-btn" id="cal-eval-next">&rarr;</button>
      </div>
      <div class="cal-eval-cards">
        <div class="cal-eval-card">
          <div class="cal-eval-header good">Good 👍</div>
          <textarea class="cal-textarea cal-textarea-lg" id="cal-eval-good" placeholder="이번 달 잘한 점을 적어보세요">${escapeHtml(data.good)}</textarea>
        </div>
        <div class="cal-eval-card">
          <div class="cal-eval-header bad">Bad 👎</div>
          <textarea class="cal-textarea cal-textarea-lg" id="cal-eval-bad" placeholder="아쉬웠던 점이나 달성하지 못한 부분을 적어보세요">${escapeHtml(data.bad)}</textarea>
        </div>
        <div class="cal-eval-card">
          <div class="cal-eval-header promise">Promise 🤝</div>
          <textarea class="cal-textarea cal-textarea-lg" id="cal-eval-promise" placeholder="다음 달을 위한 다짐을 적어보세요">${escapeHtml(data.promise)}</textarea>
        </div>
      </div>
    `;

    // Nav
    document.getElementById('cal-eval-prev').onclick = () => {
      evalMonth--;
      if (evalMonth < 1) { evalMonth = 12; evalYear--; }
      renderEvaluation();
    };
    document.getElementById('cal-eval-next').onclick = () => {
      evalMonth++;
      if (evalMonth > 12) { evalMonth = 1; evalYear++; }
      renderEvaluation();
    };

    // Auto-save
    ['good', 'bad', 'promise'].forEach(field => {
      document.getElementById(`cal-eval-${field}`).oninput = (e) => {
        debounce(`eval-${field}`, async () => {
          data[field] = e.target.value;
          await Storage.saveCalendarEvaluation(data);
        });
      };
    });
  }

  // ══════════════════════════════════════
  // ══ ONLINE CLASS CHECK PAGE
  // ══════════════════════════════════════

  async function renderClasses() {
    const now = new Date();
    if (!classYear) { classYear = now.getFullYear(); classMonth = now.getMonth() + 1; }
    const data = await Storage.getCalendarClasses(classYear, classMonth);
    const container = document.getElementById('cal-classes');

    const daysInMonth = new Date(classYear, classMonth, 0).getDate();

    // Overall rate
    let totalChecks = 0, totalCells = 0;
    data.courses.forEach(c => {
      for (let d = 1; d <= daysInMonth; d++) {
        totalCells++;
        if (c.checks[d]) totalChecks++;
      }
    });
    const overallRate = totalCells > 0 ? Math.round((totalChecks / totalCells) * 100) : 0;

    // Day headers
    let dayHeaders = '';
    for (let d = 1; d <= daysInMonth; d++) {
      dayHeaders += `<span class="class-day-header">${d}</span>`;
    }

    // Course rows
    let rowsHtml = data.courses.map((course, ci) => {
      let courseChecks = 0;
      let cellsHtml = '';
      for (let d = 1; d <= daysInMonth; d++) {
        const checked = course.checks[d] ? 'checked' : '';
        if (course.checks[d]) courseChecks++;
        cellsHtml += `<div class="class-cell ${checked}" data-ci="${ci}" data-day="${d}"></div>`;
      }
      const courseRate = Math.round((courseChecks / daysInMonth) * 100);
      return `
        <div class="class-row">
          <div class="class-row-header">
            <input type="text" class="class-name-input" value="${escapeHtml(course.name)}" data-ci="${ci}" placeholder="강의명">
            <span class="class-rate">${courseRate}%</span>
            <button class="class-del-btn" data-ci="${ci}">&times;</button>
          </div>
          <div class="class-cells">${cellsHtml}</div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="cal-month-selector">
        <button class="cal-nav-btn" id="cal-class-prev">&larr;</button>
        <span class="cal-month-title">${classYear}년 ${classMonth}월</span>
        <button class="cal-nav-btn" id="cal-class-next">&rarr;</button>
      </div>
      <div class="class-overall-rate">전체 수강률: <strong>${overallRate}%</strong></div>
      <div class="class-grid">
        <div class="class-day-headers">
          <span class="class-header-spacer"></span>
          ${dayHeaders}
        </div>
        ${rowsHtml}
      </div>
      <button class="cal-add-todo-btn" id="cal-add-course">+ 강의 추가</button>
    `;

    // Nav
    document.getElementById('cal-class-prev').onclick = () => {
      classMonth--;
      if (classMonth < 1) { classMonth = 12; classYear--; }
      renderClasses();
    };
    document.getElementById('cal-class-next').onclick = () => {
      classMonth++;
      if (classMonth > 12) { classMonth = 1; classYear++; }
      renderClasses();
    };

    // Add course
    document.getElementById('cal-add-course').onclick = async () => {
      data.courses.push({ id: `course-${Date.now()}`, name: '', checks: {} });
      await Storage.saveCalendarClasses(data);
      renderClasses();
    };

    // Cell toggle
    container.querySelectorAll('.class-cell').forEach(cell => {
      cell.onclick = async () => {
        const ci = parseInt(cell.dataset.ci);
        const day = parseInt(cell.dataset.day);
        data.courses[ci].checks[day] = !data.courses[ci].checks[day];
        await Storage.saveCalendarClasses(data);
        renderClasses();
      };
    });

    // Course name edit
    container.querySelectorAll('.class-name-input').forEach(input => {
      input.oninput = (e) => {
        const ci = parseInt(input.dataset.ci);
        debounce(`class-name-${ci}`, async () => {
          data.courses[ci].name = e.target.value;
          await Storage.saveCalendarClasses(data);
        });
      };
    });

    // Delete course
    container.querySelectorAll('.class-del-btn').forEach(btn => {
      btn.onclick = async () => {
        const ci = parseInt(btn.dataset.ci);
        if (confirm('이 강의를 삭제하시겠습니까?')) {
          data.courses.splice(ci, 1);
          await Storage.saveCalendarClasses(data);
          renderClasses();
        }
      };
    });
  }

  // ── Helpers ──
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render };
})();
