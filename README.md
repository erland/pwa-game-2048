
# PWA Game 2048
A polished, responsive, high-performance **2048** game implemented as a **Progressive Web App**, built using the  
**@erlandlindmark/pwa-game-2d-framework**, **Phaser**, and **TypeScript**.

Play the live version here:  
👉 **https://erland.github.io/pwa-game-2048**

---

## 🎮 Features

### Core Gameplay
- Classic swipe/arrow-key **2048 mechanics**
- Smooth tile motion, merge animations and spawn effects
- Undo support (optional)
- Dynamic board sizes **4×4, 5×5**
- Changeable win target (**512 → 4096**)

### UI & UX
- Clean HUD showing **Score**, **Best**, and **Target**
- New Game / Undo / Settings buttons
- Win dialog with **Continue** option
- Game Over dialog
- Toast notifications
- Responsive UI scaling on phone, tablet, and desktop

### Settings
- Change board size
- Change target tile value
- Reduced-motion mode (manual + auto-detect)
- Toggle Undo feature
- Settings persist across sessions

### Progressive Web App
- Installable on iOS, Android, Desktop
- Offline support
- Works well on older devices with auto-PerfMode

### Performance & Accessibility
- Auto-detect performance constraints (DPR, viewport size, old iOS Safari)
- Reduced motion fallback for older devices
- Efficient rendering using tile pooling + dirty sync
- BoardFitter ensures pixel-perfect centering on any screen

---

## 🧩 Tech Stack

| Area | Technology |
|------|------------|
| Game Engine | **Phaser 3** |
| Framework | **@erlandlindmark/pwa-game-2d-framework** |
| Language | **TypeScript** |
| Bundler | **Vite** |
| Tests | **Jest** (unit tests for core logic) |
| Deployment | GitHub Pages |
| Storage | LocalStorage (score, board, settings) |

---

## 🧱 Architecture

### Core Logic (Pure Functions)
The game logic lives in `src/game/core/` and is intentionally **framework-free**:
- `newGame()`
- `planMove()` / `tryMove()`
- `undo()`
- `hasMoves()` / `hasWon()`
- Deterministic tests with Jest

This ensures:
- Full unit-test coverage  
- Reusability  
- Predictable behavior  

### Presentation Layer
- **BoardView** renders tiles, pooling TileViews for performance.
- **UIScene** handles HUD, buttons, modals, and settings overlay.
- **PlayScene** orchestrates gameplay + animation sequencing.

### State Persistence
- Auto-save after each move
- Resume works as long as board size + target match

### Performance Mode
`PlayScene.computePerfMode()` automatically enables a toned-down animation mode if:
- Device uses old iOS Safari  
- DPR × viewport area is large  
- System requests reduced motion  
- Board size > 4×4  

This makes the game playable even on older iPads and budget Android phones.

---

## 🛠 Development

Install dependencies:
```sh
pnpm install
```
Start development server:
```sh
pnpm dev
```
Run tests:
```sh
pnpm test
```
Build production bundle:
```sh
pnpm build
```
Preview production build:
```sh
pnpm preview
```

⸻
