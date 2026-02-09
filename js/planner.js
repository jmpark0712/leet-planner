/**
 * Automatic Planning Engine
 *
 * Determines phase, generates daily/weekly/monthly plans
 * based on remaining time, completion rate, and mistake patterns.
 *
 * Core rules:
 * - Max 3 tasks per day
 * - Problem-solving : Review = 40 : 60
 * - Phases NOT hardcoded by month; determined by time + performance
 */

const Planner = (() => {
  // ── Phase Definitions ──
  const PHASES = [
    {
      id: 1,
      name: '1단계: 사고력 및 복습 체계 구축',
      desc: '기본 강의 수강, 기출 분석, 복습 루틴 형성',
      focus: '기초 이해와 복습 습관 형성에 집중합니다.'
    },
    {
      id: 2,
      name: '2단계: 유형별 훈련 및 부분 시간 관리',
      desc: '문제 유형 분류, 유형별 풀이 연습, 부분 시간 제한',
      focus: '유형 파악과 시간 배분 연습에 집중합니다.'
    },
    {
      id: 3,
      name: '3단계: 전범위 실전 연습 및 주간 모의고사',
      desc: '전범위 시간 제한 풀이, 주 1회 모의고사, 오답 분석',
      focus: '실전 감각과 모의고사에 집중합니다.'
    },
    {
      id: 4,
      name: '4단계: 최종 최적화',
      desc: '새로운 자료 없음, 취약 유형 반복, 컨디션 관리',
      focus: '약점 반복과 컨디션 관리에 집중합니다.'
    }
  ];

  // ── Category Labels ──
  const CATEGORY_LABELS = {
    language: '언어이해',
    logic: '추리논증',
    essay: '논술',
    review: '복습',
    resolve: '재풀이',
    mock: '모의고사'
  };

  // ── Phase Determination ──
  // Based on remaining days and overall task completion rate
  function determinePhase(remainingDays, completionRate) {
    // Total study period from initial to exam
    // Phase boundaries shift based on performance
    if (remainingDays <= 14) return 4;
    if (remainingDays <= 35 && completionRate >= 0.5) return 4;

    if (remainingDays <= 45) return 3;
    if (remainingDays <= 70 && completionRate >= 0.6) return 3;

    if (remainingDays <= 90) return 2;
    if (remainingDays <= 120 && completionRate >= 0.4) return 2;

    return 1;
  }

  function getPhaseInfo(phaseId) {
    return PHASES.find(p => p.id === phaseId) || PHASES[0];
  }

  // ── Calculate Remaining Days ──
  function getRemainingDays(examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate + 'T00:00:00');
    const diff = exam.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ── Completion Rate ──
  async function getCompletionRate(dateStr) {
    const tasks = await Storage.getTasksByDate(dateStr);
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.completed).length;
    return done / tasks.length;
  }

  async function getOverallCompletionRate() {
    const settings = Storage.getSettings();
    const today = new Date();
    // Look back 30 days for overall rate
    const lookback = 30;
    let totalTasks = 0;
    let completedTasks = 0;

    for (let i = 0; i < lookback; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = Storage.dateStr(d);
      const tasks = await Storage.getTasksByDate(ds);
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
    }

    return totalTasks > 0 ? completedTasks / totalTasks : 0;
  }

  // ── Daily Plan Generation ──
  async function generateDailyPlan(date) {
    const settings = Storage.getSettings();
    const remaining = getRemainingDays(settings.examDate);
    const completionRate = await getOverallCompletionRate();
    const phase = determinePhase(remaining, completionRate);
    const langRatio = settings.languageRatio / 100;
    const logicRatio = 1 - langRatio;

    // Check for pending re-solves (sorted by due date, overdue first)
    const pendingResolves = await Storage.getPendingResolves();
    const tasks = [];
    let taskId = 0;

    const makeId = () => `task-${date}-${taskId++}-${Math.random().toString(36).slice(2, 7)}`;

    // Rule: 40% problem-solving, 60% review (review includes re-solve)
    // Max 3 tasks per day
    // With 3 tasks: 1 problem-solving + 2 review/re-solve ≈ 33:67

    // Priority 1: Add re-solve tasks if due (review-type, counts toward 60%)
    const addedSubjects = new Set();
    for (const resolveItem of pendingResolves) {
      if (tasks.length >= 2) break; // Leave at least 1 slot for other tasks
      if (addedSubjects.has(resolveItem.subject)) continue;
      addedSubjects.add(resolveItem.subject);
      const subjectLabel = CATEGORY_LABELS[resolveItem.subject] || '언어이해';
      tasks.push({
        id: makeId(),
        date: date,
        title: `${subjectLabel} 오답 재풀이`,
        category: 'resolve',
        estimatedMinutes: 30,
        completed: false,
        completedAt: null
      });
    }

    // Generate phase-appropriate tasks
    // Ratio enforcement: ~40% problem-solving, ~60% review
    // Re-solve counts as review. With 3 tasks and re-solves already added,
    // fill remaining slots to approach 40:60.
    const reviewSlotsFilled = tasks.length; // re-solves count as review
    const needProblem = reviewSlotsFilled >= 2 ? 0 : 1; // aim for 1 problem task
    const needReview = 3 - tasks.length - needProblem;

    if (phase === 1) {
      // Phase 1: Focus on building foundation + review
      if (tasks.length < 3) {
        const subject = langRatio >= logicRatio ? 'language' : 'logic';
        const subjectLabel = subject === 'language' ? '언어이해' : '추리논증';
        tasks.push({
          id: makeId(),
          date: date,
          title: `${subjectLabel} 기본 강의 복습`,
          category: 'review',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.4),
          completed: false,
          completedAt: null
        });
      }

      if (tasks.length < 3) {
        const subject = langRatio >= logicRatio ? 'logic' : 'language';
        const subjectLabel = subject === 'language' ? '언어이해' : '추리논증';
        tasks.push({
          id: makeId(),
          date: date,
          title: `${subjectLabel} 기출문제 분석`,
          category: subject,
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.35),
          completed: false,
          completedAt: null
        });
      }

      if (tasks.length < 3) {
        tasks.push({
          id: makeId(),
          date: date,
          title: '오늘 학습 내용 정리 및 복습',
          category: 'review',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.25),
          completed: false,
          completedAt: null
        });
      }

    } else if (phase === 2) {
      // Phase 2: Question-type training with partial time management
      // 40:60 ratio → 1 problem task + 2 review tasks (or re-solve fills review)
      const subject = langRatio >= logicRatio ? 'language' : 'logic';
      const subjectLabel = subject === 'language' ? '언어이해' : '추리논증';
      const altSubject = subject === 'language' ? '추리논증' : '언어이해';

      if (tasks.length < 3 && needProblem > 0) {
        tasks.push({
          id: makeId(),
          date: date,
          title: `${subjectLabel} 유형별 문제 풀이 (시간 제한)`,
          category: subject,
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.4),
          completed: false,
          completedAt: null
        });
      }

      if (tasks.length < 3) {
        tasks.push({
          id: makeId(),
          date: date,
          title: `${altSubject} 기출 복습 및 유형 분석`,
          category: 'review',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.35),
          completed: false,
          completedAt: null
        });
      }

      if (tasks.length < 3) {
        tasks.push({
          id: makeId(),
          date: date,
          title: '오답 노트 복습 및 약점 정리',
          category: 'review',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.25),
          completed: false,
          completedAt: null
        });
      }

    } else if (phase === 3) {
      // Phase 3: Full-range practice + weekly mocks
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      const isMockDay = dayOfWeek === 6; // Saturday = mock exam day

      if (isMockDay) {
        tasks.push({
          id: makeId(),
          date: date,
          title: '모의고사 풀이 (시간 제한)',
          category: 'mock',
          estimatedMinutes: 120,
          completed: false,
          completedAt: null
        });

        if (tasks.length < 3) {
          tasks.push({
            id: makeId(),
            date: date,
            title: '모의고사 오답 분석',
            category: 'review',
            estimatedMinutes: 90,
            completed: false,
            completedAt: null
          });
        }
      } else {
        // Non-mock days: 40:60 ratio → 1 problem + 2 review
        const subject = langRatio >= logicRatio ? 'language' : 'logic';
        const subjectLabel = subject === 'language' ? '언어이해' : '추리논증';

        if (tasks.length < 3 && needProblem > 0) {
          tasks.push({
            id: makeId(),
            date: date,
            title: `${subjectLabel} 전범위 시간 제한 풀이`,
            category: subject,
            estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.4),
            completed: false,
            completedAt: null
          });
        }

        if (tasks.length < 3) {
          tasks.push({
            id: makeId(),
            date: date,
            title: '기출 오답 분석 및 유형 복습',
            category: 'review',
            estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.35),
            completed: false,
            completedAt: null
          });
        }

        if (tasks.length < 3) {
          tasks.push({
            id: makeId(),
            date: date,
            title: '약점 유형 집중 복습',
            category: 'review',
            estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.25),
            completed: false,
            completedAt: null
          });
        }
      }

    } else if (phase === 4) {
      // Phase 4: Final optimization — no new materials, repeat weaknesses
      if (tasks.length < 3) {
        tasks.push({
          id: makeId(),
          date: date,
          title: '취약 유형 기출문제 재풀이',
          category: 'resolve',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.4),
          completed: false,
          completedAt: null
        });
      }

      if (tasks.length < 3) {
        tasks.push({
          id: makeId(),
          date: date,
          title: '오답 노트 최종 점검',
          category: 'review',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.35),
          completed: false,
          completedAt: null
        });
      }

      if (tasks.length < 3) {
        tasks.push({
          id: makeId(),
          date: date,
          title: '핵심 개념 정리 복습',
          category: 'review',
          estimatedMinutes: Math.round(settings.dailyStudyHours * 60 * 0.25),
          completed: false,
          completedAt: null
        });
      }
    }

    // Ensure max 3 tasks
    return tasks.slice(0, 3);
  }

  // ── Weekly Plan Generation ──
  async function generateWeeklyPlan(weekStartDate) {
    const days = {};
    for (let i = 0; i < 7; i++) {
      const d = Storage.addDays(weekStartDate, i);
      const existing = await Storage.getTasksByDate(d);
      if (existing.length > 0) {
        days[d] = existing;
      } else {
        const tasks = await generateDailyPlan(d);
        await Storage.saveTasks(tasks);
        days[d] = tasks;
      }
    }

    const plan = {
      weekStart: weekStartDate,
      days: days,
      generatedAt: new Date().toISOString()
    };

    await Storage.saveWeeklyPlan(plan);
    return plan;
  }

  // ── Monthly Phase Roadmap ──
  function generatePhaseRoadmap(examDate) {
    const remaining = getRemainingDays(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (remaining <= 0) {
      return [{ ...PHASES[3], startDate: Storage.dateStr(today), endDate: examDate, isCurrent: true }];
    }

    // Divide remaining days into phases proportionally
    // Phase 1: ~35% of time, Phase 2: ~30%, Phase 3: ~25%, Phase 4: ~10%
    const p1Days = Math.max(14, Math.round(remaining * 0.35));
    const p2Days = Math.max(14, Math.round(remaining * 0.30));
    const p3Days = Math.max(7, Math.round(remaining * 0.25));
    const p4Days = Math.max(7, remaining - p1Days - p2Days - p3Days);

    const phases = [];
    let cursor = new Date(today);

    const addPhase = (phaseIdx, days) => {
      const start = Storage.dateStr(cursor);
      cursor.setDate(cursor.getDate() + days - 1);
      const end = Storage.dateStr(cursor);
      cursor.setDate(cursor.getDate() + 1);

      const todayStr = Storage.dateStr(today);
      const isCurrent = todayStr >= start && todayStr <= end;
      const isCompleted = todayStr > end;

      phases.push({
        ...PHASES[phaseIdx],
        startDate: start,
        endDate: end,
        days: days,
        isCurrent,
        isCompleted
      });
    };

    addPhase(0, p1Days);
    addPhase(1, p2Days);
    addPhase(2, p3Days);
    addPhase(3, p4Days);

    return phases;
  }

  // ── Monthly Milestones ──
  function generateMilestones(examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate + 'T00:00:00');
    const milestones = [];
    const cursor = new Date(today.getFullYear(), today.getMonth(), 1);

    while (cursor <= exam) {
      const month = cursor.getMonth() + 1;
      const year = cursor.getFullYear();
      const remaining = getRemainingDays(examDate) - Math.round((cursor - today) / (1000 * 60 * 60 * 24));

      let milestone = '';
      if (remaining > 120) {
        milestone = '기초 개념 확립, 복습 루틴 정착';
      } else if (remaining > 90) {
        milestone = '기출 분석 완료, 약점 파악';
      } else if (remaining > 60) {
        milestone = '유형별 훈련 심화, 시간 관리 시작';
      } else if (remaining > 30) {
        milestone = '실전 모의고사 시작, 주간 점검';
      } else if (remaining > 14) {
        milestone = '취약 유형 집중 반복';
      } else {
        milestone = '최종 정리, 컨디션 관리';
      }

      milestones.push({
        month: `${year}.${String(month).padStart(2, '0')}`,
        text: milestone
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return milestones;
  }

  // ── Get week start (Monday) for a given date ──
  function getWeekStart(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return Storage.dateStr(d);
  }

  // ── Calculate weekly rates ──
  async function getWeeklyRates(weekStart) {
    let reviewTotal = 0, reviewDone = 0;
    let resolveTotal = 0, resolveDone = 0;

    for (let i = 0; i < 7; i++) {
      const d = Storage.addDays(weekStart, i);
      const tasks = await Storage.getTasksByDate(d);
      for (const t of tasks) {
        if (t.category === 'review') {
          reviewTotal++;
          if (t.completed) reviewDone++;
        }
        if (t.category === 'resolve') {
          resolveTotal++;
          if (t.completed) resolveDone++;
        }
      }
    }

    return {
      reviewRate: reviewTotal > 0 ? Math.round((reviewDone / reviewTotal) * 100) : 0,
      resolveRate: resolveTotal > 0 ? Math.round((resolveDone / resolveTotal) * 100) : 0
    };
  }

  // ── Overall Progress (completed / total planned until exam) ──
  async function getOverallProgress() {
    const settings = Storage.getSettings();
    const remaining = getRemainingDays(settings.examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count actual tasks for past/present days (look back 365 days max)
    const lookback = Math.min(365, 365);
    let completedTasks = 0;
    let actualPastTasks = 0;

    for (let i = 0; i < lookback; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = Storage.dateStr(d);
      const tasks = await Storage.getTasksByDate(ds);
      actualPastTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
    }

    // Estimate future tasks: 3 per day (max) for remaining days
    const futureTasks = Math.max(0, remaining) * 3;
    const totalPlanned = actualPastTasks + futureTasks;

    return {
      completed: completedTasks,
      total: totalPlanned,
      rate: totalPlanned > 0 ? Math.round((completedTasks / totalPlanned) * 100) : 0
    };
  }

  // ── Completion Counts ──
  async function getDailyCompletionCount(date) {
    const tasks = await Storage.getTasksByDate(date);
    const done = tasks.filter(t => t.completed).length;
    return { done, total: tasks.length };
  }

  async function getWeeklyCompletionCount(weekStart) {
    let done = 0, total = 0;
    for (let i = 0; i < 7; i++) {
      const d = Storage.addDays(weekStart, i);
      const tasks = await Storage.getTasksByDate(d);
      total += tasks.length;
      done += tasks.filter(t => t.completed).length;
    }
    return { done, total };
  }

  async function getMonthlyCompletionCount(year, month) {
    let done = 0, total = 0;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const numDays = lastDay.getDate();

    for (let i = 1; i <= numDays; i++) {
      const d = Storage.dateStr(new Date(year, month - 1, i));
      const tasks = await Storage.getTasksByDate(d);
      total += tasks.length;
      done += tasks.filter(t => t.completed).length;
    }
    return { done, total };
  }

  return {
    PHASES,
    CATEGORY_LABELS,
    determinePhase,
    getPhaseInfo,
    getRemainingDays,
    getCompletionRate,
    getOverallCompletionRate,
    getOverallProgress,
    getDailyCompletionCount,
    getWeeklyCompletionCount,
    getMonthlyCompletionCount,
    generateDailyPlan,
    generateWeeklyPlan,
    generatePhaseRoadmap,
    generateMilestones,
    getWeekStart,
    getWeeklyRates
  };
})();
