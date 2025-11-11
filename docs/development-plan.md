# pwa-game-2048 — Step-by-Step Development Plan
**Base:** `@erlandlindmark/pwa-game-2d-framework`  
**Unit tests:** Jest  
**Repo:** `pwa-game-2048`

> Goal: Implement a polished, testable 2048 clone as a full-screen PWA using your framework’s scene/services patterns. Keep logic pure and decoupled from rendering for robust Jest tests.

---

## Phase 0 — Repository & Scaffolding
1. **Create repo:** `pwa-game-2048` (clean package).  
2. **Scaffold game package** using your framework’s scaffold (or copy demo as a template):  
   - App title: **2048**  
   - Scenes: `BootScene → PreloadScene → GameScene (+ UIScene)`
   - Ensure Services registry (`GameServices`), theme, `BoardFitter`, input controller are wired.
3. **Jest setup:**  
   - Configure `ts-jest` or Babel preset for TS.  
   - `jest.config.(ts|js)`: jsdom env for UI-lite tests, node env for core logic tests.  
   - Add coverage thresholds for core logic.
4. **CI basic workflow (optional):** Run install, build, lint, and test on push/PR.

**Exit criteria:** repo builds; empty game runs; Jest runs with a sample test.

---

## Phase 1 — Core Domain (Pure Logic, No Phaser)
Create a pure TS module under `src/game/core` with all 2048 rules. This is 100% covered by Jest.

1. **Types & Constants (`types.ts`)**
   - `type Cell = number` (0 = empty, powers of two otherwise)  
   - `type Grid = number[][]`
   - `enum MoveDir { Up, Down, Left, Right }`
   - `interface GameState { grid: Grid; score: number; best: number; size: 3|4|5|6; target: 1024|2048|4096; rngSeed: string; rngState: number; canUndo: boolean; prev?: Snapshot }`
   - `interface SpawnRule { twoProb: number /* 0.9 */ }`
   - `type Snapshot = { grid: Grid; score: number; rngState: number }`
2. **RNG (`rng.ts`)**  
   - Deterministic PRNG (e.g., mulberry32/xorshift). Expose `nextFloat()`, `nextInt(max)`, serializable `{seed, state}`.
3. **Grid Ops (`grid.ts`)**  
   - `cloneGrid`, `emptyCells`, `transpose`, `reverseRows`, `equalGrid`.
4. **Row Merge Engine (`merge.ts`)**  
   - `slideAndMerge(row: number[]): { row: number[]; gainedScore: number }`  
   - Enforce *one merge per tile per move*; preserve order semantics.
5. **Reducer (`reducer.ts`)**  
   - `newGame(size, target, seed, spawnRule) → GameState` (spawn 2 tiles: 90% 2 / 10% 4).  
   - `tryMove(state, dir) → { next: GameState; changed: boolean; mergeMap: MergeInfo[] }`  
     - Build directional line views (transpose/reverse).  
     - Apply `slideAndMerge` per line.  
     - If `changed`, spawn one tile (2 or 4).  
     - Update `score`, `best`, and set `prev` snapshot.
   - `spawnTile(state, strategy?)` (default random placement; hook for **Hard Mode**).  
   - `hasMoves(grid)`, `hasWon(grid, target)`.  
   - `undo(state)` (one-step only).
6. **Serialization (`serialize.ts`)**  
   - `serialize(state)` and `deserialize(json)`.

**Exit criteria:** All domain logic compiles; no Phaser imports anywhere.

---

## Phase 2 — Jest Unit Tests (Core Logic)
Create `src/game/core/__tests__` with focused tests.

1. **Row merge tests:** edge cases, single merge per move, spacing/zeros handling.  
2. **Move engine tests:** directionality, no-op vs change detection, score accumulation.  
3. **RNG/determinism:** fixed seed produces identical sequences; spawn distribution sanity (e.g., 2 ≈ 90%, 4 ≈ 10% within bounds).  
4. **Win/Lose detection:** reach `target`; no-moves terminal state.  
5. **Undo:** exactly one-step undo includes `grid`, `score`, and `rngState`.

**Exit criteria:** ≥95% coverage on `core` module; green on CI.

---

## Phase 3 — Rendering & Scene Integration
Wire the core logic into your framework’s scene lifecycle.

1. **GameScene (`src/game/scenes/GameScene.ts`)**
   - Read settings (board size, target, undo on/off, reduced motion).  
   - Create state via reducer; keep a local `animLock` while a move resolves.  
   - Use `BoardFitter` to compute a logical board rect → derive `cellSize` + `gap`.  
   - Maintain a pool of `TileView` objects (numbers as text on rounded rects).  
   - Map `GameState.grid` to views; position by cell (row, col).
2. **UIScene/HUD (`src/game/scenes/UIScene.ts` or `ui/Hud.ts`)**
   - Show **Score**, **Best**, **Target**.  
   - Buttons: **New Game**, **Undo**, **Settings**, **Help**.  
   - Dispatch events to `GameScene` via EventEmitter or shared service.
3. **Input**
   - Desktop: arrows + WASD.  
   - Touch: swipe (dominant-axis, distance threshold).  
   - Ignore input or queue it while `animLock=true`.
4. **Animations**
   - Slide: tween from old to new cell position.  
   - Merge: brief pulse/scaling on resulting tile.  
   - Spawn: fade/scale-in.  
   - Invalid move: subtle “nudge”.
5. **End/Win dialogs**
   - First time reaching target: **Win** dialog (Continue/New Game).  
   - No moves: **Game Over** dialog (New Game).

**Exit criteria:** Fully playable 4×4 game with input + animations + dialogs.

---

## Phase 4 — Settings, Persistence, Lifecycle
1. **Settings service** (or extend existing):  
   - Board size, target (1024/2048/4096), undo on/off, reduced motion, haptics, sound, on-screen controls.  
2. **Persistence** (storage service):  
   - Save serialized `GameState` + settings on each valid move.  
   - On app start/scene create, auto-resume saved state.  
3. **Lifecycle**  
   - Handle resize/orientation via `BoardFitter` and reflow tiles.  
   - Respect safe-area insets to prevent HUD overlap.

**Exit criteria:** Resume works across reloads/rotations; settings persisted per device.

---

## Phase 5 — Variants & Optional Modes
1. **Board sizes:** 3×3, 4×4, 5×5, 6×6.  
2. **Targets:** 1024/2048/4096.  
3. **Hard Mode (spawn strategy):**  
   - Rank empty cells by: (1) minimize potential merges next turn, (2) maximize fragmentation, (3) break monotonicity.  
   - Deterministic tie-break (top-left → bottom-right).  
4. **Timed Mode:** soft speed bonus; indicator in HUD.  
5. **Move-Limit Mode:** decrement counter per move; game over at 0 unless won.

**Exit criteria:** Variants toggleable in Settings, with clear UI indicators.

---

## Phase 6 — Accessibility, Performance, Polish
1. **Accessibility**  
   - Contrast for tile text at all values; dynamic font sizing.  
   - Screen reader announcements for moves, merges, win/lose.  
   - Reduced Motion: shorten/disable tweens.
2. **Performance**  
   - Object pooling for tiles; avoid re-creating text objects each move.  
   - Batch updates; cap animation duration to keep input snappy.
3. **Haptics & Audio (optional)**  
   - Light haptic ticks on merges; stronger for big merges.  
   - Subtle sfx; mute toggle in Settings.
4. **Error handling**  
   - Corrupt save detection → safe reset with message.

**Exit criteria:** Smooth feel on desktop, iPad, iPhone; no jank on rotations/resizes.

---

## Directory Structure (suggested)
```
pwa-game-2048/
  package.json
  jest.config.ts
  tsconfig.json
  public/
    manifest.webmanifest
    icons/
  src/
    game/
      core/
        types.ts
        rng.ts
        grid.ts
        merge.ts
        reducer.ts
        serialize.ts
        spawn_strategies.ts
        __tests__/
          merge.test.ts
          reducer.test.ts
          rng.test.ts
      scenes/
        BootScene.ts
        PreloadScene.ts
        GameScene.ts
        UIScene.ts
      ui/
        Hud.ts
        Dialogs.ts
      view/
        TileView.ts
        BoardView.ts
      services/
        SettingsService.ts
        PersistenceService.ts
```

---

## Implementation Checklists

### Core Logic (must-have)
- [ ] `slideAndMerge` enforces one-merge-per-tile-per-move.
- [ ] Correct directional processing (L/R/U/D) using transpose/reverse.
- [ ] New tile spawns after valid move only; 2 (90%) or 4 (10%).
- [ ] Undo stores exactly one snapshot.
- [ ] Win at target; continue allowed; game over when no moves.

### Rendering/Input
- [ ] Board centered and scaled via `BoardFitter`.
- [ ] Keyboard + swipe input; ignore while resolving.
- [ ] Slide/merge/spawn animations.
- [ ] Win/Game Over dialogs; buttons wired.

### Persistence/Settings
- [ ] Auto-resume exact state after refresh/orientation.
- [ ] Settings saved per device; reduced motion respected.
- [ ] Best score persists.

### Tests
- [ ] ≥95% coverage on `src/game/core`.
- [ ] Deterministic replays via seed + move list tests.
- [ ] Undo invariants; no-op moves don’t spawn tiles.

---

## Example Scripts (adjust to your tooling)
- **Test:** `jest --coverage`
- **Watch tests:** `jest --watch`
- **Lint:** `eslint "src/**/*.{ts,tsx}"`
- **Dev:** framework’s dev command (e.g., `pnpm dev` if applicable)
- **Build:** framework’s build command

---

## Milestones
- **M1 (Logic Green):** Core logic implemented & fully tested.
- **M2 (Playable):** Scenes + rendering + input + animations + dialogs.
- **M3 (Product Ready):** Persistence, settings, accessibility, reduced motion.
- **M4 (Variants & Polish):** Hard/Timed/Move-Limit, performance tune, QA pass.

---

## Risks & Mitigations
- **Input race during animations:** Use `animLock` and queue/ignore inputs until resolve.
- **Floating layout issues on rotate:** Centralize board sizing in `BoardFitter` and recompute positions.
- **Save corruption:** Validate payload shape on load; fallback to new game with notice.

---

## Acceptance Criteria (MVP: 4×4 Classic)
1. Two tiles spawn at start with 2/4 (90/10).  
2. Moves slide/merge correctly in all directions; one-merge-per-tile-per-move.  
3. Exactly one tile spawns after each valid move; none after no-op.  
4. Win (2048) prompts Continue/New; Continue works.  
5. Game Over when no moves remain.  
6. Undo reverts exactly one move (grid, score, rng).  
7. State persists across reload/orientation; full-screen on desktop/iPad/iPhone.  
8. Reduced Motion shortens animations; Best score persists.
