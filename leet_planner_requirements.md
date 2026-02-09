# LEET Planner PWA – Requirements

## Document Information
- Version: v1.1
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
- Improve scores by eliminating mistake patterns, not by increasing volume
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
- Study timer and progress tracking
- Editable plans (daily / weekly / monthly)
- Mistake logging and scheduled re-solving
- iOS Safari–compatible PWA
- Offline usage support

### Excluded (Out of Scope – v1)
- Login / authentication
- Cloud sync
- Payments / subscriptions
- Social or study group features
- Push notifications

---

## 3. Success Metrics
- User does not need to decide what to study each day
- Review completion rate is higher than problem-solving completion rate
- Mistake patterns decrease over time
- Re-solving (7-day / 30-day) completion rate increases
- Progress increases steadily toward the exam date

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

### Top Banner Encouragement Message (MUST)

- A short encouragement message must be displayed at the top area of the main screen.
- This message is shown above or within the Top Summary Card.
- The purpose of this message is emotional support and motivation, not information delivery.

### Message Rules
- Messages must be written in Korean.
- Messages may include emojis.
- Tone: friendly, warm, supportive (not formal, not instructional).
- Messages should feel like cheering from a close supporter.

### Message Variations
- The encouragement message must change daily.
- Messages are randomly selected from a predefined message pool.
- Repetition is allowed but should be minimized when possible.

### Example Messages (Non-exhaustive)
- "오늘도 한 걸음! 🔥 파이팅이에요 💪"
- "지금 이 순간도 실력입니다 ✨"
- "백미람 화이팅~~! 오늘도 응원해요 😊"
- "천천히 가도 괜찮아요 🐢 꾸준함이 답이에요"
- "오늘 공부한 당신, 이미 대단해요 👏"

### Personalization (Optional, v1)
- If a user name or nickname is available, the message may include it.
- Personalization is optional and must not be required for core functionality.

---

### Top Summary Card (MUST)
The top area must be implemented as a **single card container** that includes:

- D-day countdown (based on exam date)
- Study timer
- Overall progress rate

All three elements must be visually grouped in the same box/card.

---

### Study Timer
- Default duration: 6 hours (user-adjustable)
- Start / Pause / Resume / Reset
- Timer state must persist across reloads

---

### Encouragement Message Triggers (IMPORTANT)

Encouragement messages must be displayed not only on app open,
but also when meaningful study milestones are reached.

#### Timer Completion Trigger

- When a study timer ends, an encouragement message MAY be displayed
  depending on the timer duration.

##### Rules
- If the timer duration is LESS than the daily study target time:
  - No encouragement message is shown.
  - Rationale: short timers are assumed to be partial sessions
    (e.g. mock exams, drills).

- If the timer duration is EQUAL TO or GREATER than the daily study target time:
  - Display a dedicated encouragement message.
  - This message represents completion of the day’s study goal.

##### Example Messages (Daily Study Completion)
- "오늘 하루도 정말 고생했어요 🌙"
- "6시간 완주! 스스로에게 박수 👏"
- "오늘 할 일, 끝까지 해낸 미람이가 대단해요 ✨"
- "이만큼 해냈다는 게 중요해요 💯"

---

#### Daily Plan Completion Trigger

- When all tasks in the daily plan are marked as completed:
  - Display an encouragement message.
- This trigger is independent of the timer.

##### Priority Rule
- If both timer completion and daily plan completion occur on the same day:
  - The message must be shown only once.
  - Priority order:
    1) Daily plan completion
    2) Timer completion

---

#### Message Behavior Rules
- Encouragement messages triggered by completion must:
  - Appear as a modal, toast, or banner overlay
  - Be visually distinguishable from the daily rotating banner message
- Messages must NOT interrupt an active timer session.
- Messages must NOT stack or repeat excessively.

---

### Overall Progress Rate
- Progress represents advancement toward the exam date.
- Progress is calculated as:
  completed study units / total study units planned until the exam date
- Progress must NOT be based only on daily task completion.
- Display format:
  - Numeric percentage (e.g. 37%)

---

## 6. Plan Completion Counts

### Completion Count Display (MUST)
Completion counts must be displayed as a ratio of completed items to total items.

- Daily: completed tasks / total daily tasks (e.g. 2/3)
- Weekly: completed items / total weekly items (e.g. 5/10)
- Monthly: completed items / total monthly items (e.g. 12/40)

Counts must be shown alongside percentage-based progress indicators.

---

## 7. Plan Editing (MUST)

### Editable Plans
Users must be able to manually edit:
- Daily plans
- Weekly plans
- Monthly plans

### Editable Actions
- Add a task
- Remove a task
- Modify task content

### Constraints
- System-generated plans remain the default baseline
- Manual edits must not break overall plan integrity
- All edits must be reflected in progress and completion calculations

---

## 8. Weekly / Monthly Views

### Weekly View
- Weekly goals (focused on review rate and re-solving rate)
- Daily task breakdown
- Weekly completion counts and progress
- Button to auto-generate the next week’s plan

### Monthly View
- Phase timeline until exam date
- Monthly milestones
- Recommended subject focus ratios (Language vs Logic)
- Monthly completion counts

---

## 9. Logging & Analysis

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

## 10. Automatic Planning Engine

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

## 11. Settings Screen

### Core Settings
- Exam date
- Daily study time
- Language vs Logic ratio
- Timer duration

### Theme Settings
- Users select from predefined color themes only
- Individual color picking is NOT allowed

### Theme Options
- Red
- Blue
- Green
- Dark
- Sand
- Pink

### Theme Rules
- Theme names must be generic color names only
- No exam-specific naming in theme labels
- Themes affect background, surface, and primary accent color
- Layout and structure must remain identical across themes

### Data Management
- Provide a "Reset All Data" button
- Reset must:
  - Clear all locally stored data (plans, logs, progress)
  - Require a confirmation step
- After reset, the app returns to the initial state

---

## 12. PWA / Technical Requirements
- iOS Safari compatible
- Add-to-home-screen support
- Offline usage enabled
- LocalStorage or IndexedDB for data storage
- Service Worker caching

### Timer Reliability
- When returning from background, remaining time must be recalculated
  using actual elapsed time

---

## 13. MVP Scope (v1)
- Main screen (timer, D-day, progress)
- Editable daily / weekly / monthly plans
- Phase 1 automatic planning
- Progress calculation based on exam-date total plan
- Completion count displays
- Theme system
- Data reset functionality

---

## 14. Future Extensions (MAY)
- Push notifications
- Cloud backup
- Score trend graphs
- Essay-focused mode
