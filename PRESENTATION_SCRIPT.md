# Quantum Maze Escape — Demo Presentation Script

> Use this as a slide-by-slide guide for your PPT demo. Each section = one slide (or slide group).

---

## SLIDE 1 — Title Slide

**Title:** Quantum Maze Escape  
**Subtitle:** Learning Quantum Computing Concepts Through Gameplay  
**Your name, Roll No, Course, Date**

**Talking points:**
- "This is a browser-only game that teaches three core quantum computing concepts — Superposition, Measurement, and Entanglement — through a maze escape metaphor."
- "Built entirely with HTML, CSS, and JavaScript. No backend, no libraries, no frameworks."

---

## SLIDE 2 — Problem Statement

**Title:** Why This Project?

**Talking points:**
- Quantum computing concepts like superposition and entanglement are abstract and hard to visualize.
- Traditional teaching uses math-heavy explanations (Dirac notation, Bloch spheres) that intimidate beginners.
- **Our solution:** Turn quantum ideas into playable game mechanics so students can *feel* the concepts before studying the formulas.
- This is an **educational metaphor**, not a quantum simulator.

---

## SLIDE 3 — Three Quantum Concepts We Teach

**Title:** Core Quantum Concepts in the Game

| Real Quantum Physics | Game Mechanic | What the Player Experiences |
|---|---|---|
| **Superposition** — a qubit exists in multiple states simultaneously | **Split button** — player splits into 2-3 ghost positions on the maze | Player sees themselves in multiple places at once; all ghosts move together |
| **Measurement** — observing a qubit forces it into one definite state | **Measure button** — randomly collapses to one position | One ghost survives, others vanish — outcome is probabilistic (random) |
| **Entanglement** — two qubits are linked; measuring one instantly affects the other | **Portal pairs** — stepping on one teleports you to its linked partner | Paired tiles with matching Greek symbols (alpha-alpha, beta-beta) act as linked quantum pairs |

**Key phrase for viva:** "In quantum computing, a qubit can be 0 and 1 at the same time. In our game, the player can be at position A and position B at the same time. Measurement collapses this to just one."

---

## SLIDE 4 — Game Architecture (Technical)

**Title:** Technical Architecture

**Stack:**
- HTML5 — structure and screens (title, instructions, game, win overlay, modals)
- CSS3 — grid-based maze rendering, animations, glowing effects, responsive layout
- JavaScript — game logic, procedural generation, Web Audio API for sound
- localStorage — save/load player progress per name and difficulty mode

**No Canvas used** — the entire maze is an HTML/CSS grid (`display: grid`), making it accessible and DOM-inspectable.

**Key Design Decision:** Each quantum concept lives in its own function so you can point to it during a viva:

```
createSuperposition()  →  Superposition (Split)
collapseMeasurement()  →  Measurement (Collapse)
applyPortals()         →  Entanglement (Teleport)
resolveTurn()          →  Runs portals → energy → win check after every action
```

---

## SLIDE 5 — Eight Core Functions

**Title:** Code Structure — 8 Core Functions

| Function | What It Does | Quantum Concept |
|---|---|---|
| `getLevelDefinition(levelIndex, tier)` | Generates a complete level: maze size, portals, energy, split/measure budgets. Uses a seeded RNG so the same level+mode always produces the same maze. | Level scaling |
| `carveMaze(roomR, roomC, rand)` | Creates a perfect maze using Depth-First Search (DFS) with randomized neighbor selection. Guarantees exactly one path between any two cells. | Maze generation |
| `buildMazeDOM()` | Converts the 2D grid array into HTML div elements styled with CSS grid. Each cell gets classes for wall, path, start, exit, portal, or energy. | Rendering |
| `moveDir(dr, dc)` | Moves ALL player positions (including ghosts) one step in the given direction. If a ghost hits a wall, it stays in place. Then calls `resolveTurn()`. | Movement |
| `createSuperposition()` | Finds 2-3 walkable neighboring cells around current positions. Replaces the player with ghost tokens at those cells. Uses one Split charge. | **Superposition** |
| `collapseMeasurement()` | Picks one random cell from all ghost positions. Removes all others. Uses one Measure charge. Plays collapse animation. | **Measurement** |
| `applyPortals()` | Checks if any player cell is on a portal tile. If yes, teleports to the paired partner tile. Handles chained portals (up to 12 jumps). | **Entanglement** |
| `resolveTurn()` | Called after every action (move/split/measure). Runs: portals → energy collection → win check. Single resolution point prevents bugs. | Game loop |

---

## SLIDE 6 — How Levels Work (Procedural Generation)

**Title:** 100 Procedurally Generated Levels x 6 Difficulty Modes = 600 Unique Mazes

**How `getLevelDefinition()` works step-by-step:**

1. **Seed calculation:** `seed = (levelIndex * 9776209 + tier * 3141592653 + 3735928559)` — deterministic, so Level 5 Easy is always the same maze.
2. **Maze size:** Starts at 4x4 rooms (9x9 grid). Grows with level index. Capped per mode (Easy caps at 12, Extreme at 16).
3. **Carve maze:** DFS algorithm carves corridors through a wall grid. Result: a perfect maze (exactly one path between any two cells).
4. **Place exit:** Bottom-right walkable cell becomes the exit (star).
5. **Scatter portals:** Portal pairs placed on random path cells. Count increases every N levels (depends on mode).
6. **Scatter energy orbs:** Bonus score pickups placed on remaining path cells.
7. **Set budgets:** Split and Measure charges decrease as level index increases (harder = fewer charges).

**Difficulty scaling table (MODE_CURVE):**

| Mode | Maze Size Growth | Max Portals | Max Energy | Split Budget | Measure Budget |
|---|---|---|---|---|---|
| Easy | Slow (+0.052/level), cap 12 | 5 pairs | 7 orbs | Generous | Generous |
| Medium | +0.062/level, cap 13 | 6 | 8 | Moderate | Moderate |
| Hard | +0.074/level, cap 14 | 7 | 10 | Tighter | Tighter |
| Expert | +0.086/level, cap 15 | 8 | 11 | Low | Low |
| Master | +0.098/level, cap 16 | 8 | 12 | Very low | Very low |
| Extreme | +0.115/level, cap 16 | 8 | 12 | Minimal | Minimal |

**Example progression (Easy mode):**
- Level 1: 9x9 grid, 0 portals, 1 energy, 8 splits, 9 measures
- Level 20: 11x11 grid, 1 portal pair, 2 energy, 7 splits, 8 measures
- Level 50: 15x15 grid, 2 portal pairs, 5 energy, 6 splits, 7 measures
- Level 100: 25x25 grid, 5 portal pairs, 7 energy, 5 splits, 6 measures

---

## SLIDE 7 — Gameplay Flow (Live Demo Script)

**Title:** Live Demo — How to Play

### Step 1: Title Screen
- Type your name (progress is saved per name in localStorage)
- Pick difficulty mode (Easy recommended for demo)
- Click "Enter the maze"

### Step 2: Basic Movement
- Use Arrow keys or W/A/S/D to navigate
- Player (cyan circle) starts at top-left
- Exit (star icon) is at bottom-right
- Walls block movement; corridors are the only paths
- "Notice the Moves counter increasing with each step"

### Step 3: Demonstrate Superposition (Split)
- Click "Split — superposition" button
- Player splits into 2-3 ghost positions on adjacent walkable tiles
- State changes from "Classical" to "Superposition"
- "This is like a qubit being in state |0> and |1> at the same time"
- All ghosts move together when you press arrow keys
- Split charge decreases by 1

### Step 4: Demonstrate Measurement (Collapse)
- Click "Measure — collapse" button (only available during superposition)
- One ghost is randomly selected to survive; others disappear
- Collapse animation plays (screen flash)
- State returns to "Classical"
- "This is wavefunction collapse — observation forces a definite outcome"
- Measure charge decreases by 1

### Step 5: Demonstrate Entanglement (Portals)
- Navigate to a portal tile (colored circle with Greek symbol like alpha, beta)
- Stepping on it instantly teleports you to the paired portal
- Teleport beam animation plays
- "These paired portals are like entangled qubits — action on one instantly affects the other"

### Step 6: Collect Energy
- Walk over pink energy orbs
- +50 score per orb
- "Optional bonus — rewards exploration"

### Step 7: Win the Level
- When ANY position (including a ghost) reaches the exit star, you win
- Win overlay appears showing Score, Moves, and difficulty
- Buttons: Next Level, Restart, Back to Title
- Progress is saved to localStorage

---

## SLIDE 8 — Feature Checklist

**Title:** Complete Feature List

**Core Gameplay:**
- Grid-based maze rendered with HTML/CSS grid (no Canvas)
- 100 procedurally generated levels per difficulty mode
- 6 difficulty modes: Easy, Medium, Hard, Expert, Master, Extreme
- Deterministic seeded RNG (same level always produces same maze)
- Superposition: Split into 2-3 ghost positions
- Measurement: Random collapse to one position
- Entanglement: Paired portal teleportation with matching symbols
- Energy orb collection (+50 score each)
- Scoring: energy + completion bonus (200 + max(0, 100 - moves))

**Controls:**
- Arrow keys (Up/Down/Left/Right)
- WASD keys
- Mobile swipe (touchstart/touchend with dx/dy threshold)
- On-screen buttons for Split, Measure, Pause, Restart

**UI/UX:**
- Title screen with player name input and difficulty selector
- Mission brief / How to Play screen
- Game rules modal (explains all three quantum concepts)
- Real-time stats: Stage, Mode, Moves, Score, State (Classical/Superposition)
- Split and Measure charge counters
- Progress grid showing all 100 levels (cleared = checkmark)
- Percentage progress bar per mode
- Win overlay with Next Level / Restart / Back to Title
- Pause modal with Resume and Rules buttons
- Difficulty can be changed mid-game (starts new run)

**Visual Effects:**
- Futuristic dark-space theme with cyan/violet accents
- Glowing portal animations
- Particle burst effects on split, measure, teleport, energy, and win
- Collapse overlay flash animation
- Teleport beam animation
- Glass-panel UI design (backdrop-filter blur)
- CSS keyframe animations throughout

**Audio (Web Audio API):**
- Move sound (short beep)
- Split sound (ascending tone)
- Measure/collapse sound (descending sweep)
- Teleport sound (portal whoosh)
- Energy collection sound
- Win fanfare
- Blocked movement sound
- Background ambient music (toggleable)
- All sounds generated programmatically — no audio files needed

**Data Persistence (localStorage):**
- Player progress saved per name + per difficulty mode
- Completing Easy Level 5 does NOT mark Hard Level 5
- Progress survives browser refresh
- Storage key: `quantumMazeEscape_progress_v1`

---

## SLIDE 9 — Maze Generation Algorithm

**Title:** How `carveMaze()` Works — DFS Perfect Maze

**Algorithm: Randomized Depth-First Search**

1. Start with a grid of all walls (`#`)
2. Mark cell (0,0) as visited, push to stack
3. While stack is not empty:
   - Look at the top cell
   - Find unvisited neighbors (shuffle order randomly using seeded RNG)
   - If neighbors exist: pick one, carve wall between current and neighbor, push neighbor
   - If no neighbors: backtrack (pop stack)
4. Seal all border cells as walls

**Why DFS?**
- Produces a "perfect maze" — exactly one path between any two cells
- Long winding corridors (good for gameplay)
- Simple to implement (stack-based, no complex data structures)
- Deterministic with seeded RNG (reproducible levels)

**Grid mapping:** Room coordinates (r,c) map to physical grid at position (2r+1, 2c+1). Walls between rooms are at odd+even positions.

---

## SLIDE 10 — What Students Learn from Playing

**Title:** Learning Outcomes

| Quantum Concept | What the Game Teaches | Real-World Connection |
|---|---|---|
| **Superposition** | A particle (player) can exist in multiple states (positions) simultaneously until observed | Qubits in quantum computers exist as |0> and |1> simultaneously, enabling parallel computation |
| **Measurement / Collapse** | Observing (measuring) forces one random outcome — you cannot predict which position survives | In quantum mechanics, measurement collapses the wavefunction; the outcome is probabilistic, not deterministic |
| **Entanglement** | Two objects (portal pairs) are linked — acting on one instantly affects the other regardless of distance | Entangled qubits share correlated states; measuring one instantly determines the other, even across vast distances |
| **Probabilistic Outcomes** | Measurement picks a random ghost — you might land somewhere useful or somewhere bad | Quantum algorithms work with probability amplitudes; outcomes are inherently random but can be biased |
| **Resource Management** | Limited splits and measures force strategic planning | Real quantum computers have limited coherence time and gate fidelity — every operation counts |
| **No Cloning** | You cannot duplicate your position without using a Split (and you lose the original) | The no-cloning theorem states you cannot copy an unknown quantum state |

---

## SLIDE 11 — Technical Highlights for Viva

**Title:** Technical Highlights

**1. Seeded Pseudo-Random Number Generator (Mulberry32)**
- `mulberry32(seed)` returns a deterministic RNG function
- Seed formula: `(levelIndex * 9776209 + tier * 3141592653 + 3735928559) >>> 0`
- Same seed = same maze layout every time
- Different difficulty mode changes the seed, so Level 5 Easy differs from Level 5 Hard

**2. Single Resolution Point (`resolveTurn`)**
- Every action (move, split, measure) ends by calling `resolveTurn()`
- `resolveTurn()` runs: `applyPortals()` → `tryCollectEnergy()` → `checkWin()`
- Prevents bugs where one action forgets to check portals or win condition

**3. CSS Grid Maze Rendering**
- `buildMazeDOM()` creates `<div>` elements in a CSS grid
- Cell size adapts dynamically for larger mazes (`applyMazeCellSize()`)
- Each cell has semantic classes: `cell--wall`, `cell--path`, `cell--start`, `cell--exit`, `cell--has-portal`, `cell--has-energy`

**4. Web Audio API (No Audio Files)**
- All sounds are generated programmatically using `createOscillator()`
- Different frequencies and waveforms for each action type
- Music is a looping ambient tone pattern
- Zero external dependencies

**5. Touch/Swipe Controls**
- `touchstart` records initial position
- `touchend` calculates dx/dy delta
- Larger axis determines direction (up/down/left/right)
- Minimum threshold of 30px prevents accidental swipes

**6. Progress System**
- localStorage stores JSON: `{ v: 1, profiles: { playerName: { tier: { levelIndex: true } } } }`
- Each name x mode x level combination is independent
- `progressProfileKey()` normalizes names (lowercase, strip special chars)

---

## SLIDE 12 — Demo Screenshots to Include

**Title:** Game Screenshots

Take screenshots of these states for your PPT:

1. **Title Screen** — shows name input, 6 difficulty modes, "Enter the maze" button
2. **Game Board (Classical)** — player as solid cyan circle, maze grid visible
3. **Superposition State** — 2-3 translucent ghost positions, state shows "Superposition"
4. **Measurement Collapse** — screen flash, one position survives, status shows "Wavefunction collapsed"
5. **Portal Teleportation** — player on a portal tile, beam animation visible
6. **Energy Collection** — "+50 quantum energy" status message
7. **Win Overlay** — score, moves, Next Level/Restart/Title buttons
8. **Rules Modal** — full quantum concept explanations
9. **Progress Grid** — 100-level grid with checkmarks for cleared stages
10. **Higher Difficulty** — larger maze with multiple portals (Expert/Extreme mode)

---

## SLIDE 13 — Project Summary

**Title:** Summary

- **What:** Browser-based maze game teaching quantum computing concepts
- **How:** Superposition = Split, Measurement = Collapse, Entanglement = Portals
- **Tech:** Pure HTML + CSS + JavaScript, no backend, no libraries
- **Scale:** 100 levels x 6 difficulties = 600 unique procedural mazes
- **Persistence:** localStorage saves progress per player per mode
- **Audio:** Web Audio API generates all sounds programmatically
- **Educational:** Rules modal explains each concept in simple language
- **Code:** Clean separation into 8 named functions for easy viva reference

---

## SLIDE 14 — Q&A Preparation

**Title:** Anticipated Viva Questions and Answers

**Q: Is this a real quantum simulator?**
A: No. It is an educational metaphor. Superposition in quantum physics involves complex probability amplitudes and linear algebra. Our game simplifies this to "being in multiple positions" to build intuition before studying the math.

**Q: Why did you use HTML/CSS grid instead of Canvas?**
A: CSS grid makes each cell a DOM element, which is easier to style, animate, and make accessible. Canvas would require manual hit-testing and repainting. For a maze game, grid is more maintainable.

**Q: How does the maze generation guarantee solvability?**
A: We use DFS (Depth-First Search) to carve the maze. DFS produces a "perfect maze" where there is exactly one path between any two cells. Since start and exit are both path cells, a solution always exists.

**Q: Why seeded random numbers?**
A: So Level 5 Easy always generates the same maze for every player. This makes the game fair and reproducible. The seed mixes level index and difficulty tier so the same level number in different modes produces different layouts.

**Q: How does scoring work?**
A: Energy orbs give +50 each. Completing a level gives 200 + max(0, 100 - moves). Fewer moves = higher bonus. Score carries across levels in the same run.

**Q: What happens if all splits and measures are used up?**
A: The player must navigate with pure movement. If stuck in superposition with no measures left, all ghosts still move together — you can still reach the exit with any ghost.

**Q: How does the portal/entanglement system work in code?**
A: `applyPortals()` checks each player cell against a `portalMap` (Map of "row,col" → partner Cell). If a match is found, the player teleports. A while-loop with guard counter handles chained portals (up to 12 jumps to prevent infinite loops).

---

## RUNNING THE DEMO

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
2. No server needed (but `python -m http.server 8080` works if you prefer localhost)
3. Type a name, pick Easy mode, click "Enter the maze"
4. Show: movement → split → measure → portal → energy → win → next level
5. Show the rules modal ("Game rules" button)
6. Show difficulty switching and progress grid
7. Toggle sound on/off to demonstrate Web Audio
