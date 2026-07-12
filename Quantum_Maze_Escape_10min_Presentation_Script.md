# Quantum Maze Escape — 10-Minute Presentation Script
**Group 4:** Chennaiah Birru · Raveendra Pati · Sachin Sadagopan · Sriram Damodharan
**Repo:** github.com/vikaschenny/Quantum-Maze-Escape-Game

Your deck already has 12 slides — that's too many to cover deeply in 10 minutes (that's ~50 sec/slide with zero buffer). Below is a **timing plan that condenses to 8 speaking blocks**, a **word-for-word script** you can adapt, and a **viva Q&A prep** section. Practice out loud once with a timer before the real thing.

---

## Timing Plan (10:00 total)

| # | Block | Slides Used | Time |
|---|-------|-------------|------|
| 1 | Intro + Problem | 1, 2 | 1:00 |
| 2 | Quantum Concepts → Mechanics | 3 | 2:00 |
| 3 | Architecture & 8 Core Functions | 4, 5 | 1:45 |
| 4 | Maze Generation + Difficulty Scaling | 6, 9 (merge) | 1:15 |
| 5 | Live Demo | 7 | 2:00 |
| 6 | Feature Checklist (fast scroll) | 8 | 0:30 |
| 7 | Technical Highlights (only if time allows) | 11 | 0:30 |
| 8 | Summary + Learning Outcomes + Close | 10, 12 | 1:00 |

**If running short on time:** cut Block 7 entirely, and compress Block 6 to a single sentence ("Full checklist is in the appendix slide — every control, overlay, and audio cue is implemented and tested"). Never cut the demo — it's what makes the project memorable.

---

## 1. Introduction (0:00–1:00)

**Say:**
> "Good [morning/afternoon]. We're Group 4, and we built Quantum Maze Escape — a browser-based puzzle game that teaches three real quantum computing ideas — superposition, measurement, and entanglement — through actual gameplay, not equations. It's built entirely in vanilla HTML, CSS, and JavaScript — zero frameworks, zero external libraries — with 100 procedurally generated levels across 6 difficulty modes.
>
> The problem we wanted to solve: quantum concepts are hard to grasp from text and math alone, and there's no lightweight, zero-install browser tool that lets you *feel* what superposition or collapse actually does. So our solution was to make the abstract tangible — you literally split into multiple ghost versions of yourself, and then collapse down to one."

**Show:** Slide 1 (title), then Slide 2 (problem statement) — don't read every bullet, just hit the one-line "Solution" callout at the bottom.

---

## 2. Quantum Concepts → Game Mechanics (1:00–3:00)

This is the conceptual heart of the talk — spend the most time here.

**Say:**
> "Here's how we mapped three real quantum phenomena onto playable rules.
>
> **Superposition** — in physics, a particle exists in multiple states at once until observed. In our game, pressing **S** triggers `createSuperposition()`, which deducts a split charge and spawns 2 to 3 semi-transparent ghost tokens on open adjacent cells. All ghosts move together on every subsequent turn — you're genuinely playing multiple positions simultaneously.
>
> **Measurement**, or wavefunction collapse — observation forces a quantum system to pick one definite state. In-game, pressing **M** calls `collapseMeasurement()`, which deducts a measure charge and uses `Math.random()` to randomly select one ghost as your real position — every other ghost vanishes.
>
> **Entanglement** — two linked particles affect each other instantly regardless of distance. We modeled this with paired portal tiles, marked with Greek letters — alpha and beta. Step on one, and `applyPortals()` teleports you instantly to its entangled partner."

**Show:** Slide 3, pointing at each of the three concept→mechanic pairs as you say them.

---

## 3. Architecture & Core Functions (3:00–4:45)

**Say:**
> "Structurally, the entire game runs on 8 mandatory, single-responsibility functions — no external game engine.
>
> `getLevelDefinition()` returns a config object — grid size, portal count, orb count, split and measure budgets — all difficulty scaling lives in this one function. `carveMaze()` uses recursive-backtracking DFS to guarantee a perfect maze with exactly one solution path. `buildMazeDOM()` renders that maze as a CSS grid — we deliberately did **not** use Canvas or WebGL, because CSS Grid gives us accessible, keyboard-navigable `div` elements and trivial DOM queries via class names.
>
> `moveDir()` handles collision detection and movement. And the three quantum functions — `createSuperposition()`, `collapseMeasurement()`, `applyPortals()` — sit on top of a single orchestrator, `resolveTurn()`, which runs after every move: apply portals, check win, update score, sync the DOM. Routing everything through one resolution point avoids race conditions."

**Show:** Slide 4 briefly (just the "Why No Canvas?" reasoning), then Slide 5 (the function table) — you don't need to read every row aloud; name the 3 quantum functions and resolveTurn() explicitly since those are the functions most likely to come up in questions.

---

## 4. Maze Generation + Difficulty Scaling (4:45–6:00)

**Say:**
> "The maze itself is generated with a recursive-backtracking depth-first search — starting at the top-left cell, we visit random unvisited neighbours, knock down walls, and recurse until every cell is visited. This guarantees a *perfect* maze: exactly one path between any two cells, no loops, no isolated cells.
>
> Difficulty scales across 6 modes — Easy at 9-by-9 up to Extreme at 21-by-21 — and as the grid grows, we deliberately *reduce* the number of split and measure charges, and *increase* the number of portals and orbs. So harder levels force more efficient, more entangled play instead of just brute-force splitting."

**Show:** Slide 6 (scaling table) — point at the Easy row and Extreme row only, don't read every cell. Optionally flash Slide 9's 6×6 example maze image if you have time, otherwise skip it and mention "the report has a step-by-step trace of the algorithm."

---

## 5. Live Demo (6:00–8:00)

**This is the highest-impact block — keep the browser open on Easy Mode, Level 1, before you start talking.**

**Say while doing it:**
> "Let me show this live rather than just describe it."

1. **(15s)** Title screen → enter name → pick Easy. *"Notice the 100-cell progress grid at the bottom — all grey, since we haven't cleared anything yet."*
2. **(20s)** Move with arrows/WASD. *"Move counter increments, walls are impassable, this is a completely deterministic classical maze so far."*
3. **(30s)** Press **S**. *"Splits drops from 8 to 7, two ghost tokens appear, status bar reads 'Superposition: 2 states' — watch both ghosts move together as I press an arrow key."*
4. **(25s)** Press **M**. *"One ghost is randomly chosen, the other disappears — 'Wavefunction collapsed, one reality' — that's `Math.random()` doing real work here, not a scripted outcome."*
5. **(20s)** Walk onto a portal. *"Instant teleport to the paired portal — if I split first and then step onto a portal, watch — every ghost that's on a portal tile teleports independently."*
6. **(10s)** Step on an energy orb. *"+50 score, collected."*
7. **(20s)** Reach the exit. *"Win overlay, score and moves are shown, progress grid updates, and Next Level bumps up the maze size and shrinks the budgets."*

If live demo risks technical failure, have a 20–30 second screen-recording as backup and say so upfront ("I'll walk through a quick recording in case of Wi-Fi issues").

---

## 6. Feature Checklist — fast (8:00–8:30)

**Say:**
> "Everything else you'd expect is implemented and tested — full keyboard and touch controls, a pause overlay, a rules modal, Web-Audio-generated sound effects and background music with zero audio files, and `localStorage` persistence of your level progress. It's all on this slide if you want to look closer afterward."

**Show:** Slide 8, don't read it — just gesture at it as a "yes, it's all done" slide.

---

## 7. Technical Highlights — only if ahead of schedule (8:30–9:00)

**Say (pick ONE, not all four):**
> "One detail worth mentioning for the viva: portal placement uses a Fisher-Yates shuffle seeded by the level number, so the same level always produces the same layout — that makes bugs reproducible and demos repeatable."

**Show:** Slide 11 — only mention this if you're under 9 minutes; otherwise skip straight to summary.

---

## 8. Summary + Learning Outcomes + Close (9:00–10:00)

**Say:**
> "To summarize: 100 levels, 6 difficulty modes, 8 core functions, 3 real quantum mechanics, zero external libraries. Along the way we applied recursive backtracking to procedural generation, modeled probabilistic quantum behaviour as concrete game-state logic, used the Web Audio API to synthesize sound with no audio files at all, and built a fully stateful single-page app with clean module boundaries and no framework.
>
> Looking ahead, we'd like to add a multiplayer mode where two players share one entangled maze state, an online leaderboard, and a deeper, non-uniform probability model for the collapse mechanic.
>
> That's Quantum Maze Escape — thank you. Happy to take questions or walk through any function in the code."

**Show:** Slide 12 (project summary numbers), then Slide 10 if there's a spare 10 seconds.

---

## Viva / Q&A Prep

Be ready for these — they're the most likely follow-ups given what's actually in your code:

**Q: Is this a real quantum simulator?**
> No — it's an educational metaphor. Collapse uses uniform `Math.random()`, not actual quantum amplitudes or interference. We say this openly; it's a teaching tool, not physics software.

**Q: Why CSS Grid instead of Canvas?**
> Each maze cell is a `div` with a class name for its type (wall/floor/portal/orb), which makes DOM queries, styling, and accessibility (keyboard nav, screen readers) trivial. Canvas would need a manual redraw loop and hit-testing logic we don't need.

**Q: How does `resolveTurn()` prevent bugs?**
> Every event — movement, split, measure — funnels through one function after each action: apply portals → check win → update score → sync DOM → play audio. Single resolution point avoids race conditions from multiple code paths updating state independently.

**Q: How do multiple ghost positions interact with portals?**
> `positions[]` holds N coordinate pairs during superposition. `moveDir()` applies the same movement vector to all of them, and `applyPortals()` checks each position independently — so two ghosts can each teleport through a different portal pair on the same turn.

**Q: What's not implemented / what are the limitations?**
> No true multiplayer yet, no formal quantum-probability model (it's uniform random), progress is per-browser via `localStorage` rather than a real account system, and levels are procedurally generated rather than hand-authored puzzles.

**Q: Why vanilla JS instead of a framework or game engine?**
> To keep the codebase transparent and dependency-free for a coursework/viva context — every one of the 8 required functions can be opened and traced directly, with no framework abstraction hiding the logic.

---

## Delivery Tips
- Rehearse with a visible timer once, out loud, before presenting — the demo block is the easiest place to overrun.
- Assign one speaker per block (or per 2 slides) so it's clearly a group effort — mention team member names once at the start, not repeatedly.
- Keep the live demo browser tab already open and logged into Easy Mode Level 1 before you're called up, so you don't burn time navigating during your slot.
- If asked something outside this script, it's fine to say "that's not implemented in this version, but it's on our future-enhancements list" — the limitations slide gives you permission to be honest rather than guess.
