# 2048 – Functional Specification (PWA, Full‑Screen, Multi‑Device)

> **Scope:** Functional requirements and game mechanics only. No technology choices, libraries, or implementation details.

## 1. Product Overview
A portable, installable version of the classic **2048** sliding‑tile puzzle that runs full‑screen and offline on desktop, iPad, and iPhone. The objective is to combine tiles with the same value to create higher‑valued tiles, ultimately reaching **2048** (or beyond).

## 2. Target Devices & Form Factors
- **Desktop:** Keyboard input, resizable window, full‑screen play.
- **Tablet (iPad):** Touch & gesture input, both orientations.
- **Phone (iPhone):** Touch & gesture input, portrait by default; landscape supported.
- **Common requirement:** Full‑screen experience on all devices with safe‑area insets respected (e.g., notches, home indicators).

## 3. Game Modes
- **Classic:** 4×4 board, win at 2048; play continues beyond 2048 if the player chooses.
- **Optional Variants (toggleable):**
  - **Board Size:** 3×3, 4×4, 5×5, 6×6.
  - **Win Targets:** 1024, 2048, 4096 (show current target in UI).
  - **Hard Mode:** New tile can be placed in the **worst possible** empty cell based on a deterministic rule set (see §8.6).
  - **Timed Mode:** Soft timer that awards bonus score for speed (no hard timeout).
  - **Move Limit Mode:** Fixed number of moves; achieve the highest score possible.

> Variants are disabled by default; Classic is the baseline for acceptance.

## 4. Core Gameplay Loop
1. **Spawn:** At game start, spawn two tiles on random empty cells. Values: 2 (90%) or 4 (10%).
2. **Input:** Player initiates a move in one of four directions (left, right, up, down) using keyboard, swipe, or on‑screen controls.
3. **Slide:** All tiles slide as far as possible **in parallel** toward the chosen direction until obstructed by either the grid boundary or another tile.
4. **Merge:** After sliding completes, adjacent tiles with the same value **collide and merge once per move** producing a tile with **value = sum**. Merges occur **per row/column in move direction order** (see §8.2).
5. **Score:** Add the **merged value** to the score each time a merge occurs.
6. **Post‑Merge Slide:** Any tiles with space created by merges immediately fill gaps in the **same move** (no extra input).
7. **Spawn New Tile:** After all merges resolve, **one** new tile spawns: 2 (90%) or 4 (10%) in a random empty cell (or per the active variant’s rule).
8. **End Check:** If no legal moves remain (no empty cells and no adjacent equal tiles), the game ends.
9. **Win Check:** Upon first creating the target tile (default 2048), show a **Win** prompt with options: **Continue** or **New Game**.

## 5. Board & Tiles
- **Grid:** Uniform square cells with consistent spacing/margins that scale with screen size.
- **Tiles:** Display numeric value; visual emphasis increases with value (color intensity/contrast). Values double on merge (2, 4, 8, …).
- **Empty Cells:** Clearly indicated by background or subtle grid lines.
- **Accessibility:** Ensure legible tile numbers and sufficient contrast at all sizes.

## 6. Controls & Input
### 6.1 Keyboard (Desktop)
- **Arrow Keys**: Move Up/Down/Left/Right.
- **WASD**: Alternative movement.
- **R**: Restart (confirm if a game is in progress).
- **U**: Undo last move (if enabled).
- **Esc**: Open pause/settings.

### 6.2 Touch & Gestures (Tablet/Phone)
- **Swipe Up/Down/Left/Right**: Move tiles.
  - Minimum swipe distance threshold to avoid accidental moves.
  - Direction based on dominant axis; diagonal swipes resolve to the stronger axis.
- **Tap UI Controls**: New Game, Undo, Settings, Help.

### 6.3 On‑Screen Controls (Optional)
- Overlay directional pad or arrow buttons; hidden on large screens by default, visible on small screens via Settings.

## 7. UI & Layout
- **HUD elements:**
  - **Score** (current)
  - **Best** (highest historical score on device)
  - **Target** (e.g., 2048)
  - **New Game** button
  - **Undo** button (if enabled)
  - **Settings** (gear) and **Help** (info)
- **Dialogs:** Pause/Settings, Win, Game Over, Confirm Restart.
- **Responsive behavior:**
  - Board remains centered with maximal size that fits within safe areas.
  - Consistent margins around the board; HUD remains visible without overlap.
  - Orientation changes maintain state and layout.

## 8. Rules & Determinism
### 8.1 Spawn Distribution
- Default: **2** with 90% probability, **4** with 10%.
- Ensure reproducible randomness via a seeded generator for **deterministic replays** (seed stored in save state).

### 8.2 Merge Ordering
- For a given move direction, evaluate rows/columns **from the far edge moving inward**:
  - **Left move:** process each row left→right.
  - **Right move:** process each row right→left.
  - **Up move:** process each column top→bottom.
  - **Down move:** process each column bottom→top.
- A tile can be involved in **at most one merge per move**.
- After a merge, the resulting tile **cannot merge again** in the same move.

### 8.3 Illegal Moves
- If a move would not change board state (no slides or merges), the input is ignored (no new tile spawns).

### 8.4 Undo (Optional, default **On** for Classic)
- Stores a **single full previous state** (board, score, best, seed, and RNG position).
- **One‑step undo** per move; cannot chain multiple undos beyond the last action.
- Undo is disabled after **Continue** from a Win dialog until the next move completes.

### 8.5 Continue After Win
- Upon reaching the target tile:
  - Show a **Win** dialog with **Continue** and **New Game**.
  - If **Continue**: game proceeds; no additional win prompts for higher tiles in the same run.

### 8.6 Hard Mode (Variant)
- New tile spawns in the empty cell that produces the **least favorable** outcome for the player based on:
  1) minimizing number of potential merges next turn,
  2) maximizing board fragmentation (more isolated groups),
  3) breaking monotonicity of the highest‑value row/column.
- If ties remain, use deterministic tie‑break by cell order (top‑left to bottom‑right).

## 9. Scoring
- **Per‑Merge Points:** Add the merged tile’s value to the **Score** (e.g., 8→ +8).
- **Best Score:** Persisted across sessions on the device.
- **Optional Bonuses (Timed Mode only):** Grant a small bonus for quick consecutive moves; clearly indicate in the HUD when active.

## 10. Game States & Persistence
- Persist the following **locally**:
  - Current board, score, best score, game mode/variant, target, RNG seed/position, undo buffer (if available), timestamp of last move.
- **Auto‑resume**: Reopen to the exact prior state, including during orientation changes or app suspends.
- **Multiple Saves (Optional):** One slot per variant; Classic always resumes the last Classic run.

## 11. Animations & Feedback
- **Slide Animation:** Smooth translation toward the target cells.
- **Merge Animation:** Brief scale or pulse to emphasize the merged tile.
- **Spawn Animation:** New tile fades/scales in.
- **Invalid Move Feedback:** Subtle nudge or shake of the board, with optional haptic tick on supported devices.
- **Performance Requirement:** Animations should feel fluid and never block input longer than necessary; queue/reject inputs appropriately (see §12).

## 12. Input Processing & Turn Timing
- **Lock frame:** During a move, further inputs are **queued or ignored** until the slide/merge/spawn cycle completes.
- **Tap‑to‑Repeat (Optional):** If enabled, holding a direction repeats moves at a capped rate, but only when **every move** results in a valid state change.
- **Debounce:** Prevent accidental double‑swipes by ignoring secondary input within a minimal interval unless the previous move has concluded.

## 13. Accessibility
- **Contrast:** All tiles meet recommended contrast for text readability.
- **Color Independence:** Do not rely on color alone; numeric value is always visible.
- **Reduced Motion:** Setting to reduce animation intensity/duration.
- **Screen Reader Labels:** Announce moves, merges, spawns, and game over/win states in concise phrases.
- **Haptics (Optional):** Light feedback on merges, stronger on larger merges; toggleable.

## 14. Audio (Optional)
- **Merge sounds:** Scaled subtly with tile value.
- **Win/Game Over stings.**
- **Mute toggle** in Settings; remember per device.

## 15. Settings
- **General:**
  - New Game
  - Board Size (if variants enabled)
  - Win Target (1024/2048/4096)
  - Undo: On/Off
  - Haptics: On/Off (if supported)
  - Sound: On/Off
  - Reduced Motion: On/Off
  - On‑Screen Controls: Auto/On/Off (auto shows on small screens)
- **Variants:**
  - Hard Mode: On/Off
  - Timed Mode: On/Off (show timer/bonus indicator when active)
  - Move Limit Mode: On/Off (display remaining moves)

## 16. Full‑Screen & Installability (PWA Behavior)
- **Installable:** The experience can be added to the device as an app.
- **Offline:** Game starts and runs with no network connection.
- **Full‑Screen:** App opens without browser UI; respects safe areas/insets.
- **Orientation Handling:** Seamless rotation; preserves layout and state.
- **Launch Performance:** Cold start feels immediate; resume is instant.

## 17. Help & Onboarding
- **First‑Run Overlay:** Short tutorial (one screen) showing how to swipe and the goal of combining tiles.
- **Help Screen:** Summarizes rules, controls, scoring, and variants.

## 18. Telemetry & Privacy
- **Local‑only by default.** No personal data collected.
- **Opt‑in** for anonymous usage metrics if ever added (not required for MVP).

## 19. Local Leaderboards (Optional)
- **Top Scores:** Per board size/mode on the device.
- **Recent Runs:** List last N games with score and highest tile.

## 20. Error Handling & Recovery
- **State Integrity:** Detect and correct corrupted saves (fallback to New Game and message the user).
- **Safe Restart:** Confirm before abandoning an in‑progress game.

## 21. Acceptance Criteria (Classic 4×4 MVP)
1. Game starts with two tiles (2/4 with 90/10 distribution) in random empty cells.
2. Valid move slides tiles fully and merges same‑value neighbors once per line, in correct order, with score updated.
3. After a valid move, exactly one new tile spawns with 2/4 distribution.
4. Invalid move produces no state change and no spawn.
5. Game detects Win at 2048 and offers Continue/New Game; choosing Continue allows further play.
6. Game detects Game Over when no moves remain.
7. Undo reverts exactly one full move (including score and tile positions).
8. State persists across app close/reopen and orientation changes.
9. Full‑screen on desktop, iPad, and iPhone; safe areas respected.
10. Keyboard controls (desktop) and swipe controls (touch) both function reliably.
11. Reduced Motion setting reduces animation intensity/duration.
12. Best score persists on the device.

## 22. Future Enhancements (Out of Scope for MVP)
- Daily challenge with predefined seeds.
- Shareable replays via seed + move list.
- Cross‑device sync of best scores and saves.
- Skins/themes for tiles and board.
