# LEET Planner PWA – Requirements

## Document Information
- Version: v1.0
- Target Exam: LEET
- Exam Date: 2026-07-19 (Sun)
- Purpose: A PWA-based LEET study planner that automatically determines study direction,
  priorities, and schedules based on user status and remaining time.

---

## 1. Product Overview

### One-line Description
A LEET-specific study planner PWA that automatically sets learning direction,
daily/weekly/monthly plans, and priorities without requiring users to manually plan.

### Core Philosophy
- Improve scores by eliminating mistake patterns, not increasing volume
- Prioritize review and re-solving over raw problem counts
- Build a sustainable study structure rather than short-term motivation

### Assumed Initial User State
- LEET past exam accuracy: ~50–60%
- Currently taking basic lectures for Language Reasoning and Logical Reasoning
- Available study time: 6 hours per day

---

## 2. Scope

### Included (MUST)
- LEET Language Reasoning and Logical Reasoning planner
- Automatic daily / weekly / monthly plan generation
- Phase-based long-term roadmap
- Study timer, completion rate, growth visualization
- Mistake logging and scheduled re-solving
- iOS Safari–compatible PWA
- Offline usage support

### Excluded (Out of Scope – v1)
- Login / authentication
- Cloud sync
- Payments / subscriptions
- Social or study group features
- Push notifications (may be added later)

---

## 3. Success Metrics
- User does not need to decide what to study each day
- Review completion rate is higher than problem-solving completion rate
- Mistake patterns decrease over time
- Re-solving (7-day / 30-day) completion rate increases

---

## 4. Study Principles (Based on High Scorers)

### Core Rules
- Maximum of 3 study tasks per day
- Default problem-solving : review ratio = 40 : 60
- Score improvement comes from repeated re-solving of past exams
- Heavy time pressure is restricted in early phases

### Phase Definition
- Phases must NOT be hardcoded by calendar month
- Phases are determined by remaining time until the exam and user performance

### Example Phases
- Phase 1: Thinking & review system building
- Phase 2: Question-type training and partial time management
- Phase 3: Full-range practice and weekly mock exams
- Phase 4: Final optimization (no new materials, repeat weaknesses)

---

## 5. Main Screen (Today View)

### Fixed Top Elements
- D-day countdown (based on exam date)
- Study timer
- Overall completion rate (%)

### Study Timer
- Default duration: 6 hours (user-adjustable)
- Start / Pause / Resume / Reset
- Timer state must persist across app reloads
- When timer ends, show a congratulatory/supportive message
  (UI message language: Korean)

### Timer Character Animation
- Character appearance changes by timer state:
  - IDLE: waiting state
  - RUNNING: sweating and running animation
  - PAUSED: resting animation
  - DONE: happy/celebration state (optional)
- Animation switches immediately when state changes
- Must run smoothly on iOS Safari
- Animation ON/OFF option available in settings

### Today's Tasks
- 1–3 tasks automatically generated
- Each task includes:
  - Checkbox
  - Category tag (Language / Logic / Essay / Review / Re-solve / Mock)
  - Estimated duration (optional)
- Completion instantly updates progress

### Completion Rate Visualization
- Numeric percentage display (e.g., 37%)
- Growth-stage visual indicator shown next to percentage

### Growth Stages
- 0–9%: Seed
- 10–29%: Sprout
- 30–49%: Stem
- 50–69%: Bud
- 70–89%: Half Bloom
- 90–100%: Full Bloom

---

## 6. Weekly / Monthly Views

### Weekly View
- Weekly goals (review rate, re-solve rate, not raw score)
- Daily task breakdown
- Weekly completion indicators
- Button to auto-generate next week's plan

### Monthly View
- Phase timeline until exam date
- Monthly milestones
- Recommended subject focus ratios (Language vs Logic)

---

## 7. Logging & Analysis

### Logged Data
- Date
- Subject (Language / Logic / Essay)
- Material type (Past exam / Mock)
- Correct or incorrect
- Mistake reason (selectable):
  - Misread condition
  - Missing evidence
  - Failed option comparison
  - Time pressure
  - Guess
- Scheduled re-solving date (7 days / 30 days)

### Analysis Display
- Top mistake reasons
- Top weak question types
- Pending re-solving list

---

## 8. Automatic Planning Engine

### Inputs
- Remaining time until exam
- User completion rate
- Mistake patterns
- Available daily study time

### Outputs
- Daily plan (1–3 tasks)
- Weekly plan
- Monthly phase roadmap

### Re-solving Rules
- When a mistake is logged:
  - Automatically schedule re-solving after 7 days
  - Automatically schedule re-solving after 30 days

---

## 9. Settings Screen

### Core Settings
- Exam date
- Daily study time
- Language vs Logic ratio
- Timer duration
- Character animation ON/OFF

### Theme Settings
- User selects from predefined color theme sets
- Individual color picking is NOT allowed

### Default Themes
- LEET Red
- Calm Blue
- Forest Green
- Charcoal Dark
- Warm Sand

### Theme Implementation Rules
- CSS variable–based theming
- Applied via `data-theme` attribute
- System theme follows OS light/dark setting

---

## 10. PWA / Technical Requirements
- iOS Safari compatible
- Add-to-home-screen support
- Offline usage enabled
- LocalStorage or IndexedDB for data storage
- Service Worker caching

### Timer Reliability
- On returning from background, remaining time must be recalculated
  using actual elapsed time

---

## 11. MVP Scope (v1)
- Main screen (timer, today's tasks, completion rate)
- Phase 1 automatic planning
- Mistake logging and re-solving
- Theme system
- Character animation

---

## 12. Future Extensions (MAY)
- Push notifications
- Cloud backup
- Score trend graphs
- Essay-focused mode
