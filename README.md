# Quantum Maze Escape Game

Browser-only maze game for student demos: **superposition** (split into ghost paths), **measurement** (collapse to one position), and **entanglement** (paired portals).

**Players:** see **[WHY_PLAY.md](WHY_PLAY.md)** for what you get from playing (fun, learning, mental challenge) in plain language.

## How to run

1. **Direct open:** Double-click `index.html` (some browsers limit `file://` for audio; gameplay still works).
2. **Local server (recommended):** In this folder run:
   - `npx --yes serve .` then open the URL shown, or  
   - `python -m http.server 8080` then visit `http://localhost:8080`

## Controls

- **Move:** Arrow keys or **W A S D** (swipe on the maze on touch devices).
- **Split:** Branch into 2–3 possible positions (uses a split charge).
- **Measure:** Collapse superposition to one random surviving position (uses a measure charge).
- **Pause:** Button or **Esc**.
- **Sound / Music:** Toggles in the header (Web Audio API, no external files).

## Code map (`script.js`)

| Concept        | Function / area              |
|----------------|------------------------------|
| Superposition  | `createSuperposition()`      |
| Measurement    | `collapseMeasurement()`       |
| Entanglement   | `applyPortals()`             |

## Features

- **100 levels** (`NUMBER_OF_LEVELS`): each maze is **procedurally generated** in `getLevelDefinition()` using a seeded RNG (same level index ⇒ same layout between reloads).
- Difficulty **tier** (1–6, Easy→Extreme), maze size, portal pairs, energy count, and split/measure limits **scale with stage**.
- Quantum energy orbs for bonus score.
- Win overlay with **Next level**, **Play from level 1**, **Title**; side panel **Next level** after a clear (hidden on stage 100).

## License / credits

Student project — modify freely for coursework or demos.

---

# Project document structure (for report / evaluation)

Great choice — this game fits a **project document** well because it combines **gameplay + quantum concepts + code**.

Use the outline below for a professional write-up. Where this repo differs from a generic template, it is noted so your report matches **this** implementation.

---

## 1. Title page

Include:

- **Project title:** Quantum Maze Escape  
- Your name  
- College / course  
- Subject name  
- Date  
- Guide / faculty name  

---

## 2. Abstract (important)

Short summary (5–8 lines). Example:

> This project presents an interactive browser game, *Quantum Maze Escape*, that illustrates ideas from quantum computing education—**superposition**, **measurement**, and **entanglement**—through playable rules (not a full quantum simulator). The player navigates procedurally generated mazes, may **split** into several possible positions, **measure** to collapse to one outcome, and uses **paired portals** as an entanglement metaphor. The application is built with **HTML, CSS, and JavaScript** only and runs locally without a backend, supporting demonstrations and vivas.

---

## 3. Objectives

Suggested 4–6 points:

- Build an interactive, grid-based maze game.  
- Explain quantum *metaphors* (superposition, collapse, linked locations) in simple terms.  
- Make abstract ideas tangible through visuals and feedback (tokens, animations, rules panel).  
- Implement clear, maintainable game logic (movement, quantum actions, win conditions).  
- Support repeatable demos (seeded levels, per-player progress in the browser).  

---

## 4. Background / theory

Explain in simple language:

### Superposition

- In quantum education: a system can be described as being in a combination of states until measured.  
- **In this game:** **Split** creates 2–3 “ghost” positions on neighbouring path cells (limited charges per stage).

### Measurement

- Observing / measuring can leave one definite outcome.  
- **In this game:** **Measure** randomly keeps **one** of your positions and removes the others (collapse).

### Entanglement

- Some systems are described with correlated / linked behaviour.  
- **In this game:** **Portals** with the **same Greek symbol** form a pair—stepping on one **teleports** you to the partner tile.

### Observer effect (related idea)

- Interaction with a system can change what you can know about it.  
- **In this repo:** The closest analogue is **Measure**, which forces a single position; there are **no separate “observer zones”** in the current code—mention this honestly if asked.

---

## 5. Technologies used

- **HTML** — structure, screens, modal rulebook, semantic layout.  
- **CSS** — futuristic UI, maze cell styling, animations, responsive layout.  
- **JavaScript** — game loop, maze generation, input, audio (Web Audio API), `localStorage` progress.  
- **Rendering:** the maze is drawn with **HTML/CSS grid** (div cells), **not** the Canvas 2D API—state this clearly in your report if your faculty asks.

---

## 6. System design

### Game architecture

- **Procedural maze** in `getLevelDefinition()` / `carveMaze()` — size and content scale with **stage** and **difficulty mode** (Easy → Extreme); not a fixed 15×15 grid.  
- **Grid** stored as a 2D character array; start (**S**), exit (**E**), walls, paths.  
- **Player:** one or more `{ row, col }` positions in an array (`playerCells`).  
- **State:** level index, score, split/measure counts, pause, win overlay, selected difficulty tier, optional per-name completion flags.

### Logical components (map to `script.js`)

- **Level / maze** — `getLevelDefinition()`, `loadLevelIntoGrid()`, `buildMazeDOM()`.  
- **Player / input** — `moveDir()`, keyboard + touch.  
- **Quantum rules** — `createSuperposition()`, `collapseMeasurement()`, `applyPortals()`.  
- **Turn resolution** — `resolveTurn()` (portals → energy → win) for consistent behaviour.  
- **UI** — stats, progress grid, rules modal, win panel.  

---

## 7. Game features (this version)

- **Superposition:** Split with limited charges; multiple tokens on the grid.  
- **Measurement:** Random collapse with limited charges.  
- **Entanglement:** Portal pairs with matching symbols and teleport + VFX/sound.  
- **Six difficulty modes**, **100 stages each**; changing mid-game starts a **new run** at stage 1 for that mode (see current behaviour).  
- **Energy orbs** for bonus score; **completion tracking** per player name and mode (`localStorage`).  
- **Rules modal**, tooltips, particle / beam effects; optional ambient music.  
- *Not implemented:* dedicated “observer zones”; multiplayer; Canvas rendering.  

---

## 8. Working of the game (step-by-step)

1. Player enters name and mode on the title / brief screen, then starts the game.  
2. **Move** with **arrow keys** or **W A S D** (or swipe on the maze).  
3. **Split** — creates superposition on adjacent path cells (button **Split — superposition**).  
4. **Measure** — collapses to one random position (**Measure — collapse**; only when multiple positions exist).  
5. **Portals** — walk onto a tile with a Greek letter; you **teleport** to the matching partner.  
6. **Energy** — optional orbs for extra score when stepped on.  
7. **Exit (★)** — if **any** position reaches the exit, the stage is **cleared**; **Next level** advances within the same mode.  

*(If your institute gave you a template mentioning **Space / M** or observer zones, update those lines to match the bullets above.)*

---

## 9. Algorithms / logic (simple explanation)

- **Movement** — delta rows/columns (`STEP_DR`, `STEP_DC`); each ghost moves one step; walls block that token.  
- **Positions** — `playerCells` array; **deduplication** with a `Set` of `"r,c"` keys (`uniqueCells`).  
- **Collapse** — `Math.random()` picks one surviving cell index among unique positions.  
- **Portals** — `Map` from cell key to partner cell; loop applies jumps until stable (handles short chains).  
- **Maze generation** — seeded RNG + recursive backtracker variant for carveable grids.  

---

## 10. Screenshots

Add for your bound report:

- Title / setup screen with name and difficulty.  
- Gameplay with maze, sidebar stats, and **progress bar / grid**.  
- **Superposition** (multiple ghost tokens).  
- After **Measure** (single token).  
- **Win** overlay.  
- Optional: **Game Rules** modal.  

Put a **short caption** under each figure.

---

## 11. Advantages

- Concepts explained through play, not only equations.  
- Runs in any modern browser; no install.  
- Code is structured by concept (`createSuperposition`, `collapseMeasurement`, `applyPortals`)—good for vivas.  
- Deterministic levels aid marking and repeat demos.  

---

## 12. Limitations (be honest)

- **Educational metaphor**, not quantum hardware or exact physics.  
- **Collapse** uses uniform random choice, not formal quantum probabilities.  
- Progress is **per browser / device** (`localStorage`), not a real login server.  
- Mazes and resources are **procedural**, not hand-authored puzzles.  

---

## 13. Future enhancements

- Cloud save / real accounts.  
- Extra mechanics (hazards, keys, moving obstacles) **or** a labelled “observer tile” if you add it in code.  
- Deeper probability model for measurement outcomes.  
- PWA / mobile packaging.  
*(Difficulty tiers Easy → Extreme and 100 stages per mode are **already** in this project.)*

---

## 14. Conclusion (example)

> This project shows how core quantum *ideas* can be communicated through an interactive, grid-based game. By separating superposition, measurement, and entanglement-inspired portals into small functions, the implementation stays explainable in a viva while remaining engaging for players.

---

## 15. References

- Course notes / standard texts on introductory quantum concepts (used metaphorically).  
- [MDN Web Docs](https://developer.mozilla.org/) — HTML, CSS, JavaScript, Web Audio, `localStorage`.  
- Any maze or game-design articles you consulted.  

---

## Bonus (extra marks)

- Flowchart: title → play → move / split / measure → portals → win / next level.  
- Simple architecture diagram: UI ↔ game state ↔ level generator ↔ quantum actions.  
- Short pseudocode for `resolveTurn()` and `applyPortals()`.  

---

## Viva tip (one sentence)

> “This project turns quantum *teaching metaphors* into playable rules: many positions until you measure, then one; portals stand in for linked locations—implemented in plain JavaScript so every rule maps to a named function I can open in the editor.”
