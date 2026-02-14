# Calendar Feature Requirements

## Branch
- Work on `dev/update-v1.1` branch ONLY.
- Do NOT touch or merge into `main`.
- Before any changes, run `git branch` to confirm you are on the correct branch.

---

## Overview

Add a new **Calendar** tab to the bottom navigation bar. This tab replaces or is added alongside existing nav items. Inside the Calendar view, there are **4 sub-tabs** that users can swipe or tap to switch between:

1. **Monthly** — Monthly planner
2. **Daily** — Daily planner
3. **Monthly Evaluation** — End-of-month self-review
4. **Online Class Check** — Online lecture tracking

### Design Principles
- Mobile-first, clean planner-style UI (like a physical study planner / notebook aesthetic)
- Consistent with the existing app theme system (use CSS custom properties from `themes.css`)
- Users should be able to use the selected theme color throughout the calendar pages
- Swipeable or tappable sub-tabs at the top of the Calendar view
- All data must persist via IndexedDB (extend `storage.js`)
- Offline-capable (update `sw.js` cache list if new files are added)

---

## Sub-Tab 1: Monthly Page

### Layout
- **Month selector** at the top: display current month with left/right arrows to navigate (e.g., `← 2026년 2월 →`)
- **Month check bubbles**: 12 circles (1~12) where the current month is highlighted
- **Monthly calendar grid**: Standard calendar grid (Sun~Sat or Mon~Sun) showing all days of the selected month
  - Each day cell should be tappable to add/view a short schedule note
  - Day cells should show a small dot or indicator if there is a saved entry

### Bottom Section (3 columns or stacked cards)
- **Goal**: A text area where users write their monthly study goals or resolutions
- **Todo**: A checklist (add/check/delete items) for must-do tasks this month
- **Memo**: A free-form text area for ideas, reflections, or monthly review notes

### Data to Store (per month)
- `year`, `month`
- `dailyNotes`: `{ [day]: string }` — short note per day cell
- `goal`: string
- `todos`: `[{ id, text, completed }]`
- `memo`: string

---

## Sub-Tab 2: Daily Page

### Layout
- **Date selector** at the top: display selected date with left/right arrows (e.g., `← 2026.02.13 (금) →`)
- **Hourly timeline**: Vertical time blocks from **05:00 AM to 03:00 AM (next day)**
  - Each hour block is tappable to add a schedule entry
  - Users can write what they studied/did in each time slot
  - Color-coded by subject if possible (use tag colors from existing theme)
  - This allows users to visually see how they allocated their day

### Right Side or Below Timeline
- **Top Priorities**: A small section (2~3 items) for the most important tasks of the day
- **To-do**: A checklist for daily tasks (add/check/delete)
- **Memo**: Free-form text area for daily notes
- **Goal**: A section to write daily goal achievement rate (e.g., percentage or short text) and personal daily resolution

### Data to Store (per date)
- `date`: string (YYYY-MM-DD)
- `hourlySchedule`: `{ [hour]: { text, subject? } }` — from 5 to 27 (3AM next day = hour 27)
- `topPriorities`: `[{ id, text, completed }]`
- `todos`: `[{ id, text, completed }]`
- `memo`: string
- `goal`: string

---

## Sub-Tab 3: Monthly Evaluation Page

### Layout
- **Month selector** at the top (same as Monthly page)
- Three clearly separated sections in a card or notebook-style layout:

1. **Good** 👍
   - Text area to write what went well this month
   - Prompt text (placeholder): "이번 달 잘한 점을 적어보세요"

2. **Bad** 👎
   - Text area to write what didn't go well or goals not achieved
   - Prompt text (placeholder): "아쉬웠던 점이나 달성하지 못한 부분을 적어보세요"

3. **Promise** 🤝
   - Text area to write resolutions/commitments for next month based on Good & Bad reflections
   - Prompt text (placeholder): "다음 달을 위한 다짐을 적어보세요"

### Data to Store (per month)
- `year`, `month`
- `good`: string
- `bad`: string
- `promise`: string

---

## Sub-Tab 4: Online Class Check Page

### Layout
- **Month selector** at the top
- A table/grid to track online lecture completion:
  - **Rows**: Each row represents one course/lecture series
  - **Columns**: Days of the month (1~28/29/30/31)
  - Users can tap a cell to mark it as completed (checkbox or filled circle)
  - Users can add/remove course rows

### Additional Features
- "Add Course" button to add a new lecture row
- Each course row has: course name (editable) + daily check cells
- Show completion rate per course (e.g., 15/28 = 53%)
- Show overall monthly completion rate at the top

### Data to Store (per month)
- `year`, `month`
- `courses`: `[{ id, name, checks: { [day]: boolean } }]`

---

## Technical Requirements

### Navigation
- Add "캘린더" (Calendar) button to `#bottom-nav` in `index.html`
- Icon suggestion: 📆 or similar
- Calendar view (`#view-calendar`) contains the 4 sub-tabs

### Sub-Tab Navigation
- Implement as a tab bar at the top of the Calendar view (similar to Records view tab bar)
- Tab labels: `Monthly` | `Daily` | `Evaluation` | `Classes`
- Smooth transition when switching tabs
- Remember the last active sub-tab within the session

### Storage
- Extend `storage.js` with new IndexedDB object stores:
  - `calendarMonthly` (keyPath: compound key of year+month or string like "2026-02")
  - `calendarDaily` (keyPath: date string "YYYY-MM-DD")
  - `calendarEvaluation` (keyPath: compound key of year+month)
  - `calendarClasses` (keyPath: compound key of year+month)
- Increment `DB_VERSION` when adding new stores

### Styling
- Follow existing design patterns in `style.css`
- Use CSS custom properties from `themes.css` for all colors
- Planner/notebook aesthetic: clean lines, adequate spacing, readable fonts
- All interactive elements must have proper touch targets (min 44px)

### Files to Modify
- `index.html` — Add calendar view section and nav button
- `css/style.css` — Add calendar-specific styles
- `js/storage.js` — Add new IndexedDB stores and CRUD methods
- `js/app.js` — Add calendar view rendering and event handling
- `sw.js` — Update cache list if new files are created

### Files to Possibly Create
- `js/calendar.js` — Calendar-specific logic (optional, can be in app.js)

---

## Implementation Priority
1. Navigation setup (bottom nav + sub-tabs)
2. Monthly page (calendar grid + goal/todo/memo)
3. Daily page (hourly timeline + priorities/todo/memo/goal)
4. Monthly Evaluation page (good/bad/promise)
5. Online Class Check page (course tracking grid)

---

## Notes
- All text content and labels should be in **Korean**
- Auto-save: Data should save automatically as users type (debounced, not on every keystroke)
- Existing features (Today, Weekly, Monthly roadmap, Records, Settings) must remain fully functional
- Theme changes in Settings must apply to all calendar pages as well
