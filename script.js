/**
 * ===========================================================================
 * QUANTUM MAZE ESCAPE — presentation-friendly browser game
 * ===========================================================================
 *
 * STACK: HTML + CSS + JavaScript only (no libraries, no backend).
 *
 * VIVA TALK TRACK (3 ideas, 3 code areas)
 * ---------------------------------------
 * 1) SUPERPOSITION — user presses Split. Several cells become possible at once
 *    (semi-transparent tokens). Code: createSuperposition()
 * 2) MEASUREMENT — user presses Measure. One cell is chosen at random; others
 *    disappear (collapse). Code: collapseMeasurement()
 * 3) ENTANGLEMENT — portals come in pairs. Stepping on one moves you to the
 *    partner cell. Code: applyPortals()
 *
 * MAIN FLOW: moveDir / split / measure → resolveTurn() runs portals, energy,
 * and win check so behaviour stays consistent everywhere.
 *
 * RUN: open index.html, or use a tiny local server (see README.md).
 * ===========================================================================
 */

(function () {
  "use strict";

  /** @typedef {{ r: number, c: number }} Cell */

  /**
   * Animation / UX timings (keep in sync with style.css keyframes where noted).
   * Centralising avoids “stuck” feelings when JS removes classes before CSS finishes.
   */
  const ANIM = {
    splitBoardMs: 720,
    teleportRingMs: 780,
    collapseOverlayMs: 1000,
    pickedRealityMs: 700,
    fxBeamMs: 820,
    winOverlayDelayMs: 400,
    winPanelEnterClass: "win-panel-anim",
  };

  /**
   * 100 LEVELS per difficulty mode (Easy … Extreme). Pick a mode on the title
   * screen; getLevelDefinition(levelIndex, difficultyTier) builds that stage.
   * Seed mixes mode + index so layouts differ across modes at the same stage #.
   */
  const NUMBER_OF_LEVELS = 100;

  /**
   * Per-mode progression: higher tiers = larger mazes faster, more portals,
   * tighter split/measure budgets. Index 0 = Easy … 5 = Extreme.
   * @type {ReadonlyArray<{
   *   pairEvery: number; energyEvery: number; pairMax: number; energyMax: number;
   *   roomMul: number; roomBoost: number; roomCap: number; splitDiv: number; measureDiv: number;
   * }>}
   */
  const MODE_CURVE = [
    { pairEvery: 20, energyEvery: 12, pairMax: 5, energyMax: 7, roomMul: 0.052, roomBoost: 0, roomCap: 12, splitDiv: 32, measureDiv: 30 },
    { pairEvery: 17, energyEvery: 11, pairMax: 6, energyMax: 8, roomMul: 0.062, roomBoost: 0, roomCap: 13, splitDiv: 30, measureDiv: 27 },
    { pairEvery: 15, energyEvery: 10, pairMax: 7, energyMax: 10, roomMul: 0.074, roomBoost: 1, roomCap: 14, splitDiv: 27, measureDiv: 25 },
    { pairEvery: 13, energyEvery: 9, pairMax: 8, energyMax: 11, roomMul: 0.086, roomBoost: 1, roomCap: 15, splitDiv: 25, measureDiv: 23 },
    { pairEvery: 12, energyEvery: 8, pairMax: 8, energyMax: 12, roomMul: 0.098, roomBoost: 2, roomCap: 16, splitDiv: 23, measureDiv: 21 },
    { pairEvery: 11, energyEvery: 8, pairMax: 8, energyMax: 12, roomMul: 0.115, roomBoost: 2, roomCap: 16, splitDiv: 21, measureDiv: 19 },
  ];

  /** Deterministic RNG from a numeric seed (Mulberry32-style mix). */
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DIFFICULTY_NAMES = ["Easy", "Medium", "Hard", "Expert", "Master", "Extreme"];

  /**
   * Per-player progress in localStorage (browser-only “login”: the name you type).
   * Key shape: profileKey → difficulty tier (1–6) → level index (0–99) → cleared.
   * Completing Easy stage 5 does not mark Hard stage 5; each mode has its own 100 flags.
   */
  const PROGRESS_STORAGE_KEY = "quantumMazeEscape_progress_v1";

  function progressProfileKey(displayName) {
    let s = (displayName || "").trim().toLowerCase();
    if (!s) s = "explorer";
    s = s.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!s) s = "explorer";
    return s.slice(0, 48);
  }

  function loadProgressStore() {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return { v: 1, profiles: /** @type {Record<string, Record<string, Record<string, boolean>>>} */ ({}) };
      const o = JSON.parse(raw);
      if (!o || typeof o !== "object") return { v: 1, profiles: {} };
      if (!o.profiles) o.profiles = {};
      return o;
    } catch {
      return { v: 1, profiles: {} };
    }
  }

  function saveProgressStore(store) {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      /* ignore quota / private window */
    }
  }

  function markLevelCompleted(profileKey, tier, levelIdx) {
    const t = Math.max(1, Math.min(6, tier));
    const li = Math.max(0, Math.min(NUMBER_OF_LEVELS - 1, levelIdx));
    const store = loadProgressStore();
    if (!store.profiles[profileKey]) store.profiles[profileKey] = {};
    const prof = store.profiles[profileKey];
    const tk = String(t);
    if (!prof[tk]) prof[tk] = {};
    prof[tk][String(li)] = true;
    saveProgressStore(store);
  }

  function isLevelCompleted(profileKey, tier, levelIdx) {
    const store = loadProgressStore();
    const prof = store.profiles[profileKey];
    if (!prof) return false;
    const tierMap = prof[String(tier)];
    return !!(tierMap && tierMap[String(levelIdx)]);
  }

  function countCompletedInMode(profileKey, tier) {
    let n = 0;
    for (let i = 0; i < NUMBER_OF_LEVELS; i++) {
      if (isLevelCompleted(profileKey, tier, i)) n++;
    }
    return n;
  }

  /** UI names + hint tone for the selected mode (not the stage index). */
  function metaForLevel(levelIndex, difficultyTier) {
    const tier = Math.max(1, Math.min(6, difficultyTier));
    const hints = [
      "Small mazes — learn Split and Measure on short paths.",
      "Growing grids — portals start to matter; watch pair symbols.",
      "Longer runs — plan energy and measures before big splits.",
      "Large layouts — tight resources; entanglement is key.",
      "Very large mazes — few splits; commit only at decisive forks.",
      "Maximum scale — brutal budgets; aim for the exit star.",
    ];
    const name = DIFFICULTY_NAMES[tier - 1];
    return {
      tier: tier,
      difficulty: name,
      hint: hints[tier - 1] + " · " + name + " · Stage " + (levelIndex + 1) + "/" + NUMBER_OF_LEVELS,
    };
  }

  /**
   * Carve a perfect maze: one path between any two "room" cells (DFS / N-ary stack).
   * Physical size (2*roomR+1) × (2*roomC+1); borders stay walls.
   */
  function carveMaze(roomR, roomC, rand) {
    const H = 2 * roomR + 1;
    const W = 2 * roomC + 1;
    const g = [];
    for (let r = 0; r < H; r++) {
      g[r] = [];
      for (let c = 0; c < W; c++) {
        g[r][c] = "#";
      }
    }
    const vis = [];
    for (let r = 0; r < roomR; r++) {
      vis[r] = [];
      for (let c = 0; c < roomC; c++) {
        vis[r][c] = false;
      }
    }

    function phys(dr, dc) {
      return [1 + 2 * dr, 1 + 2 * dc];
    }

    const stack = [];
    vis[0][0] = true;
    const pStart = phys(0, 0);
    g[pStart[0]][pStart[1]] = ".";
    stack.push([0, 0]);

    while (stack.length) {
      const top = stack[stack.length - 1];
      const dr = top[0];
      const dc = top[1];
      const opts = [];
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = dirs[i];
        dirs[i] = dirs[j];
        dirs[j] = tmp;
      }
      for (let di = 0; di < dirs.length; di++) {
        const ddr = dirs[di][0];
        const ddc = dirs[di][1];
        const ndr = dr + ddr;
        const ndc = dc + ddc;
        if (ndr >= 0 && ndr < roomR && ndc >= 0 && ndc < roomC && !vis[ndr][ndc]) {
          opts.push([ndr, ndc, ddr, ddc]);
        }
      }
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const pick = opts[Math.floor(rand() * opts.length)];
      const nidr = pick[0];
      const nidc = pick[1];
      const ddr = pick[2];
      const ddc = pick[3];
      vis[nidr][nidc] = true;
      const p1 = phys(dr, dc);
      const p2 = phys(nidr, nidc);
      g[p1[0]][p1[1]] = ".";
      g[p2[0]][p2[1]] = ".";
      const wr = p1[0] + ddr;
      const wc = p1[1] + ddc;
      if (wr >= 0 && wr < H && wc >= 0 && wc < W) {
        g[wr][wc] = ".";
      }
      stack.push([nidr, nidc]);
    }

    for (let c = 0; c < W; c++) {
      g[0][c] = "#";
      g[H - 1][c] = "#";
    }
    for (let r = 0; r < H; r++) {
      g[r][0] = "#";
      g[r][W - 1] = "#";
    }

    return { g, H, W };
  }

  function shuffleSeeded(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
  }

  /**
   * Full level payload for one stage index (0 … NUMBER_OF_LEVELS-1).
   * Pipeline for viva: (1) seed → (2) carve maze → (3) place exit → (4) scatter
   * portals + energy on path cells → (5) set split/measure budgets from tier.
   * @param {number} levelIndex 0 … NUMBER_OF_LEVELS-1 within this mode
   * @param {number} difficultyTier 1 … 6 (Easy … Extreme) — chosen on title screen
   */
  function getLevelDefinition(levelIndex, difficultyTier) {
    const tier = Math.max(1, Math.min(6, difficultyTier));
    const curve = MODE_CURVE[tier - 1];
    const seed =
      (levelIndex * 9776209 + tier * 3141592653 + 3735928559) >>> 0;
    const rand = mulberry32(seed);
    const meta = metaForLevel(levelIndex, tier);

    const roomR = Math.max(
      4,
      Math.min(curve.roomCap, 4 + Math.floor(levelIndex * curve.roomMul) + curve.roomBoost)
    );
    const roomC = Math.max(
      4,
      Math.min(
        curve.roomCap,
        4 + Math.floor(levelIndex * curve.roomMul * 0.92) + curve.roomBoost
      )
    );
    const { g, H, W } = carveMaze(roomR, roomC, rand);

    let er = H - 2;
    let ec = W - 2;
    if (g[er][ec] !== ".") {
      outer: for (let r = H - 2; r >= 1; r--) {
        for (let c = W - 2; c >= 1; c--) {
          if (g[r][c] === ".") {
            er = r;
            ec = c;
            break outer;
          }
        }
      }
    }

    const rows = [];
    for (let r = 0; r < H; r++) {
      let line = "";
      for (let c = 0; c < W; c++) {
        if (r === 1 && c === 1) {
          line += "S";
        } else if (r === er && c === ec) {
          line += "E";
        } else {
          line += g[r][c];
        }
      }
      rows.push(line);
    }

    const pathCells = [];
    for (let r = 1; r < H - 1; r++) {
      for (let c = 1; c < W - 1; c++) {
        if (g[r][c] === "." && !(r === 1 && c === 1) && !(r === er && c === ec)) {
          pathCells.push({ r, c });
        }
      }
    }
    shuffleSeeded(pathCells, rand);

    const pairFloor = tier >= 2 ? 1 : 0;
    let pairCount = Math.min(curve.pairMax, pairFloor + Math.floor(levelIndex / curve.pairEvery));
    const energyCount = Math.min(
      curve.energyMax,
      (tier >= 2 ? 2 : 1) + Math.floor(levelIndex / curve.energyEvery)
    );
    const pairsNeeded = pairCount * 2;
    if (pathCells.length < pairsNeeded + energyCount) {
      pairCount = Math.max(0, Math.floor((pathCells.length - energyCount) / 2));
    }

    const portals = [];
    let cursor = 0;
    for (let p = 0; p < pairCount; p++) {
      const a = pathCells[cursor++];
      const b = pathCells[cursor++];
      if (a && b) {
        portals.push([a, b]);
      }
    }

    const energy = [];
    for (let e = 0; e < energyCount && cursor < pathCells.length; e++) {
      energy.push(pathCells[cursor++]);
    }

    const splits = Math.max(2, Math.min(8, 8 - Math.floor(levelIndex / curve.splitDiv)));
    const measures = Math.max(2, Math.min(9, 9 - Math.floor(levelIndex / curve.measureDiv)));

    return {
      rows,
      portals,
      energy,
      splits,
      measures,
      difficulty: meta.difficulty,
      tier: meta.tier,
      hint: meta.hint,
    };
  }

  /** Step vectors: up, down, left, right (same order as keyboard logic). */
  const STEP_DR = [-1, 1, 0, 0];
  const STEP_DC = [0, 0, -1, 1];

  // —— DOM shortcuts ——
  const screenStart = document.getElementById("screenStart");
  const screenInstructions = document.getElementById("screenInstructions");
  const screenGame = document.getElementById("screenGame");
  const winOverlay = document.getElementById("winOverlay");
  const mazeBoard = document.getElementById("mazeBoard");
  const statusBar = document.getElementById("statusBar");
  const collapseOverlay = document.getElementById("collapseOverlay");
  const fxBeam = document.getElementById("fxBeam");
  const particleLayer = document.getElementById("particleLayer");
  const pauseModal = document.getElementById("pauseModal");
  const rulesModal = document.getElementById("rulesModal");
  const btnCloseRules = document.getElementById("btnCloseRules");
  const btnViewRules = document.getElementById("btnViewRules");
  const btnViewRulesInst = document.getElementById("btnViewRulesInst");
  const btnRulesHeader = document.getElementById("btnRulesHeader");
  const btnRulesFromPause = document.getElementById("btnRulesFromPause");
  const winFx = document.getElementById("winFx");
  const winPanel = document.getElementById("winPanel");

  const statLevel = document.getElementById("statLevel");
  const statDifficulty = document.getElementById("statDifficulty");
  const statMoves = document.getElementById("statMoves");
  const statScore = document.getElementById("statScore");
  const statMode = document.getElementById("statMode");
  const statSplits = document.getElementById("statSplits");
  const statMeasures = document.getElementById("statMeasures");
  const quantumHint = document.getElementById("quantumHint");

  const btnPlay = document.getElementById("btnPlay");
  const btnHowToPlay = document.getElementById("btnHowToPlay");
  const btnStartGame = document.getElementById("btnStartGame");
  const btnBackTitle = document.getElementById("btnBackTitle");
  const btnSplit = document.getElementById("btnSplit");
  const btnMeasure = document.getElementById("btnMeasure");
  const btnPause = document.getElementById("btnPause");
  const btnRestart = document.getElementById("btnRestart");
  const btnNextLevel = document.getElementById("btnNextLevel");
  const btnResume = document.getElementById("btnResume");
  const btnWinRestart = document.getElementById("btnWinRestart");
  const btnWinNext = document.getElementById("btnWinNext");
  const btnWinTitle = document.getElementById("btnWinTitle");
  const chkSound = document.getElementById("chkSound");
  const chkMusic = document.getElementById("chkMusic");
  const winScoreEl = document.getElementById("winScore");
  const winMovesEl = document.getElementById("winMoves");
  const winDifficultyEl = document.getElementById("winDifficulty");
  const gamePlayerDisplay = document.getElementById("gamePlayerDisplay");
  const gameDifficultyPanel = document.getElementById("gameDifficultyPanel");
  const runBanner = document.getElementById("runBanner");
  const levelProgressFill = document.getElementById("levelProgressFill");
  const levelProgressPct = document.getElementById("levelProgressPct");
  const levelProgressMeter = document.getElementById("levelProgressMeter");

  // —— Game state (kept in one place for the viva: “all variables here”) ——
  let grid = /** @type {string[][]} */ ([]);
  let rows = 0;
  let cols = 0;
  let startCell = /** @type {Cell} */ ({ r: 0, c: 0 });
  let exitCell = /** @type {Cell} */ ({ r: 0, c: 0 });
  let portalPairs = /** @type {[Cell, Cell][]} */ ([]);
  /** Map "row,col" string → partner Cell (entanglement lookup table). */
  let portalMap = new Map();

  let levelIndex = 0;
  /**
   * Selected mode: 1 = Easy … 6 = Extreme (100 stages each). Set via mode picker
   * on title / instructions before "Enter the maze" or "Start game".
   */
  let selectedDifficultyTier = 1;
  /** Display name shown in-game; set when starting from title / mission brief. */
  let playerDisplayName = "Explorer";
  /** Keeps both name inputs in sync while the player edits either box. */
  let playerNameDraft = "";
  /** Player may occupy multiple cells during superposition. */
  let playerCells = /** @type {Cell[]} */ ([]);
  let moves = 0;
  let score = 0;
  let splitsLeft = 0;
  let measuresLeft = 0;
  let energyCollected = /** @type {Set<string>} */ (new Set());
  let paused = false;
  /** True when level is finished (blocks movement & pause tricks). */
  let gameOver = false;
  /** After a win: player may advance to the next level from the panel. */
  let canAdvanceToNext = false;

  /** Current level data from getLevelDefinition(rows, portals, energy, UI labels). */
  let activeLevelDef = /** @type {ReturnType<typeof getLevelDefinition> | null} */ (null);

  let musicInterval = /** @type {ReturnType<typeof setInterval> | null} */ (null);
  let audioCtx = /** @type {AudioContext | null} */ (null);

  // —— Small helpers ——

  function cellKey(c) {
    return c.r + "," + c.c;
  }

  function getCellElement(p) {
    return mazeBoard.querySelector('.cell[data-r="' + p.r + '"][data-c="' + p.c + '"]');
  }

  /** Merge duplicate positions (two ghosts can stand on the same tile). */
  function uniqueCells(cells) {
    const seen = new Set();
    const out = [];
    for (const p of cells) {
      const k = cellKey(p);
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ r: p.r, c: p.c });
      }
    }
    return out;
  }

  function isWalkable(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    return grid[r][c] === ".";
  }

  function isSuperposition() {
    return uniqueCells(playerCells).length > 1;
  }

  /**
   * Convert level ASCII into a 2D array and remember start / exit coordinates.
   */
  function loadLevelIntoGrid(def) {
    const src = def.rows;
    rows = src.length;
    cols = src[0].length;
    grid = [];
    portalPairs = def.portals.slice();
    portalMap = new Map();
    for (let i = 0; i < portalPairs.length; i++) {
      const [a, b] = portalPairs[i];
      portalMap.set(cellKey(a), b);
      portalMap.set(cellKey(b), a);
    }

    for (let r = 0; r < rows; r++) {
      const line = src[r];
      const row = [];
      for (let c = 0; c < cols; c++) {
        const ch = line[c];
        if (ch === "S") {
          startCell = { r, c };
          row.push(".");
        } else if (ch === "E") {
          exitCell = { r, c };
          row.push(".");
        } else {
          row.push(ch);
        }
      }
      grid.push(row);
    }
  }

  /** Which portal pair (for colour / symbol). */
  function portalPairIndex(cell) {
    const k = cellKey(cell);
    if (!portalMap.has(k)) return -1;
    for (let i = 0; i < portalPairs.length; i++) {
      const [a, b] = portalPairs[i];
      if (cellKey(a) === k || cellKey(b) === k) return i;
    }
    return -1;
  }

  /**
   * Hover (cursor) explanations for maze tiles — good for demos and vivas.
   * Same Greek letter on two portals = one entangled pair; ★ = exit goal.
   */
  function tooltipForCell(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return "";
    if (grid[r][c] === "#") {
      return "Wall — solid block. You cannot move through it.";
    }
    const tips = [];
    if (r === startCell.r && c === startCell.c) {
      tips.push("Start — where you spawn at the beginning of this level.");
    }
    if (r === exitCell.r && c === exitCell.c) {
      tips.push("Exit (★) — move any of your states (including ghosts) here to clear the maze.");
    }
    if (activeLevelDef) {
      const k = cellKey({ r, c });
      const onEnergy = activeLevelDef.energy.some((e) => e.r === r && e.c === c);
      if (onEnergy) {
        if (energyCollected.has(k)) {
          tips.push("Energy orb — already collected (no extra score).");
        } else {
          tips.push("Energy orb — step here for bonus score (+50).");
        }
      }
    }
    const pIdx = portalPairIndex({ r, c });
    if (pIdx >= 0) {
      const sym = String.fromCharCode(945 + pIdx);
      tips.push(
        "Portal " +
          sym +
          " — this symbol is paired with another " +
          sym +
          " on the map. Step on one to teleport to the other (like an entangled link)."
      );
    }
    return tips.length ? tips.join(" ") : "";
  }

  function closeWinOverlay() {
    if (!winOverlay) return;
    winOverlay.classList.remove("win-overlay--open");
    winOverlay.setAttribute("aria-hidden", "true");
    canAdvanceToNext = false;
    if (btnNextLevel) btnNextLevel.disabled = true;
    if (winFx) winFx.style.display = "none";
    if (mazeBoard) mazeBoard.classList.remove("maze-board--win-dim");
    /* Strip enter animation so the next win can replay it (CSS only runs on re-add). */
    if (winPanel) winPanel.classList.remove(ANIM.winPanelEnterClass);
  }

  function openRulesModal() {
    if (!rulesModal) return;
    rulesModal.classList.add("modal--open");
    rulesModal.setAttribute("aria-hidden", "false");
  }

  function closeRulesModal() {
    if (!rulesModal) return;
    rulesModal.classList.remove("modal--open");
    rulesModal.setAttribute("aria-hidden", "true");
  }

  function showScreen(el) {
    [screenStart, screenInstructions, screenGame].forEach((s) => {
      s.classList.toggle("screen--active", s === el);
    });
    if (el !== screenGame) {
      closeWinOverlay();
      stopMusic();
    }
    if (el === screenStart || el === screenInstructions) {
      document.querySelectorAll(".js-player-name").forEach((inp) => {
        inp.value = playerNameDraft;
      });
    }
  }

  /**
   * Status line + optional CSS modifier for colour (split / collapse / teleport).
   */
  function setStatus(message, kind) {
    statusBar.textContent = message;
    statusBar.classList.remove("status-bar--split", "status-bar--collapse", "status-bar--teleport", "status-bar--success", "is-pulse");
    if (kind === "split") statusBar.classList.add("status-bar--split", "is-pulse");
    else if (kind === "collapse") statusBar.classList.add("status-bar--collapse", "is-pulse");
    else if (kind === "teleport") statusBar.classList.add("status-bar--teleport", "is-pulse");
    else if (kind === "success") statusBar.classList.add("status-bar--success", "is-pulse");
  }

  function ensureLevelProgressGrid() {
    const el = document.getElementById("levelProgressGrid");
    if (!el || el.getAttribute("data-built") === "1") return;
    el.setAttribute("data-built", "1");
    const frag = document.createDocumentFragment();
    for (let i = 0; i < NUMBER_OF_LEVELS; i++) {
      const span = document.createElement("span");
      span.className = "level-pip";
      span.setAttribute("data-level-index", String(i));
      span.setAttribute("role", "listitem");
      span.textContent = String(i + 1);
      frag.appendChild(span);
    }
    el.appendChild(frag);
  }

  /** Refresh 100 stage pips: done / current for this player name + difficulty only. */
  function updateLevelProgressVisuals() {
    const grid = document.getElementById("levelProgressGrid");
    const summary = document.getElementById("levelProgressSummary");
    const modeLbl = document.getElementById("levelProgressModeLabel");
    if (!grid || !activeLevelDef) return;
    ensureLevelProgressGrid();
    const pk = progressProfileKey(playerDisplayName);
    const tier = selectedDifficultyTier;
    let cleared = 0;
    for (let i = 0; i < NUMBER_OF_LEVELS; i++) {
      const pip = grid.querySelector('[data-level-index="' + i + '"]');
      if (!pip) continue;
      const done = isLevelCompleted(pk, tier, i);
      if (done) cleared++;
      pip.classList.toggle("level-pip--done", done);
      pip.classList.toggle("level-pip--current", i === levelIndex);
      pip.title =
        "Stage " +
        (i + 1) +
        (done ? " — cleared" : " — not cleared") +
        (i === levelIndex ? " · current" : "");
    }
    if (summary) {
      summary.textContent =
        cleared + " / " + NUMBER_OF_LEVELS + " cleared · " + (playerDisplayName || "Player") + " · this mode only";
    }
    if (modeLbl) modeLbl.textContent = activeLevelDef.difficulty;

    const pctRounded = Math.min(100, Math.round((cleared / NUMBER_OF_LEVELS) * 100));
    if (levelProgressFill) levelProgressFill.style.width = pctRounded + "%";
    if (levelProgressPct) levelProgressPct.textContent = pctRounded + "%";
    if (levelProgressMeter) {
      levelProgressMeter.setAttribute("aria-valuenow", String(cleared));
      levelProgressMeter.setAttribute("aria-valuemax", String(NUMBER_OF_LEVELS));
    }
  }

  function syncControlBar() {
    if (!activeLevelDef) {
      return;
    }
    const def = activeLevelDef;
    statLevel.textContent = levelIndex + 1 + "/" + NUMBER_OF_LEVELS;
    if (statDifficulty) {
      statDifficulty.textContent = def.difficulty;
      statDifficulty.className = "diff-badge diff-badge--t" + def.tier;
      statDifficulty.title = "Active difficulty: " + def.difficulty + " · Stage " + (levelIndex + 1) + "/" + NUMBER_OF_LEVELS;
    }
    if (runBanner) {
      runBanner.textContent =
        def.difficulty + " · Stage " + (levelIndex + 1) + "/" + NUMBER_OF_LEVELS + " · active run";
    }
    statMoves.textContent = String(moves);
    statScore.textContent = String(score);
    statMode.textContent = isSuperposition() ? "Superposition" : "Classical";
    statSplits.textContent = String(splitsLeft);
    statMeasures.textContent = String(measuresLeft);

    let hint = def.hint;
    const totalEnergy = def.energy.length;
    const ec = energyCollected.size;
    if (ec < totalEnergy) hint += " · Energy " + ec + "/" + totalEnergy;
    quantumHint.textContent = hint;

    const busy = gameOver || paused;
    btnMeasure.disabled = !isSuperposition() || measuresLeft <= 0 || busy;
    btnSplit.disabled = splitsLeft <= 0 || busy;
    if (btnNextLevel) btnNextLevel.disabled = !canAdvanceToNext;

    if (gameDifficultyPanel) {
      const locked = gameOver;
      gameDifficultyPanel.classList.toggle("game-difficulty--locked", locked);
      gameDifficultyPanel.setAttribute("aria-disabled", locked ? "true" : "false");
    }

    updateLevelProgressVisuals();
  }

  /**
   * Pick a cell size so large mazes stay on screen without unreadable 5px tiles.
   * Base size is larger for readability; we shrink only when many columns/rows.
   */
  function applyMazeCellSize() {
    const longest = Math.max(cols, rows);
    let px = 34;
    if (longest > 21) px = 30;
    if (longest > 27) px = 26;
    if (longest > 33) px = 22;
    if (longest > 39) px = 19;
    mazeBoard.style.setProperty("--cell-size", px + "px");
  }

  /**
   * Build static maze cells once per level. Players are drawn separately in renderPlayers().
   */
  function buildMazeDOM() {
    if (!activeLevelDef) {
      return;
    }
    mazeBoard.style.setProperty("--cols", String(cols));
    mazeBoard.style.setProperty("--rows", String(rows));
    applyMazeCellSize();
    mazeBoard.innerHTML = "";

    const energySet = new Set(activeLevelDef.energy.map(cellKey));
    const frag = document.createDocumentFragment();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const div = document.createElement("div");
        div.className = "cell";
        div.dataset.r = String(r);
        div.dataset.c = String(c);

        if (grid[r][c] === "#") {
          div.classList.add("cell--wall");
        } else {
          div.classList.add("cell--path");
          if (r === startCell.r && c === startCell.c) div.classList.add("cell--start");
          if (r === exitCell.r && c === exitCell.c) div.classList.add("cell--exit");

          if (energySet.has(cellKey({ r, c }))) {
            div.classList.add("cell--energy");
            if (!energyCollected.has(cellKey({ r, c }))) {
              div.classList.add("cell--has-energy");
            }
          }

          const pIdx = portalPairIndex({ r, c });
          if (pIdx >= 0) {
            div.classList.add("cell--portal");
            div.classList.add(pIdx % 2 === 0 ? "cell--portal-p0" : "cell--portal-p1");
            div.dataset.symbol = String.fromCharCode(945 + pIdx);
          }
        }
        const tip = tooltipForCell(r, c);
        if (tip) div.title = tip;
        frag.appendChild(div);
      }
    }
    mazeBoard.appendChild(frag);
    renderPlayers();
  }

  /**
   * Draw player tokens (single solid orb, or several faded “ghost” orbs).
   */
  function renderPlayers() {
    mazeBoard.querySelectorAll(".player-token").forEach((n) => n.remove());
    mazeBoard.querySelectorAll(".cell").forEach((el) => {
      el.classList.remove(
        "cell--player",
        "cell--player-primary",
        "cell--ghost",
        "cell--ghost-glow",
        "cell--picked-reality",
        "cell--teleport-ring"
      );
    });

    const uniq = uniqueCells(playerCells);
    uniq.forEach((p, idx) => {
      const el = getCellElement(p);
      if (!el || el.classList.contains("cell--wall")) return;

      el.classList.add("cell--player");
      const token = document.createElement("span");
      token.className = "player-token";
      /* Stagger ghost spawn slightly so “splitting” reads clearly on video. */
      if (uniq.length > 1) {
        token.style.setProperty("--token-stagger", String(idx * 55) + "ms");
      } else {
        token.style.removeProperty("--token-stagger");
      }
      el.appendChild(token);

      if (uniq.length > 1) {
        el.classList.add("cell--ghost", "cell--ghost-glow");
        if (idx === 0) el.classList.add("cell--player-primary");
      } else {
        el.classList.add("cell--player-primary");
      }
    });
  }

  function runSplitBoardAnimation() {
    mazeBoard.classList.add("maze-board--splitting");
    window.setTimeout(() => mazeBoard.classList.remove("maze-board--splitting"), ANIM.splitBoardMs);
  }

  function flashTeleportVisual(cellsTouched) {
    const seen = new Set();
    cellsTouched.forEach((p) => {
      const k = cellKey(p);
      if (seen.has(k)) return;
      seen.add(k);
      const el = getCellElement(p);
      if (el) {
        el.classList.add("cell--teleport-ring");
        window.setTimeout(() => el.classList.remove("cell--teleport-ring"), ANIM.teleportRingMs);
      }
    });
    if (fxBeam) {
      fxBeam.classList.add("fx-beam--on");
      window.setTimeout(() => fxBeam.classList.remove("fx-beam--on"), ANIM.fxBeamMs);
    }
    playSound("teleport");
    spawnParticles(16, "#c4b5fd");
    /* Deliberately no setStatus: avoids hiding Split / Measure messages if both happen quickly. */
  }

  /**
   * ENTANGLEMENT: any player cell on a portal jumps to its partner.
   * Loop handles chained portals (rare but safe).
   */
  function applyPortals() {
    const trail = [];
    let jumped = false;
    let guard = 0;

    while (guard++ < 12) {
      let changed = false;
      const next = playerCells.map((p) => {
        if (portalMap.has(cellKey(p))) {
          const dest = portalMap.get(cellKey(p));
          changed = true;
          jumped = true;
          trail.push(p, dest);
          return { r: dest.r, c: dest.c };
        }
        return { r: p.r, c: p.c };
      });
      playerCells = uniqueCells(next);
      if (!changed) break;
    }

    if (jumped) flashTeleportVisual(trail);
  }

  function tryCollectEnergy() {
    if (!activeLevelDef) {
      return;
    }
    for (const p of playerCells) {
      const k = cellKey(p);
      const list = activeLevelDef.energy;
      const onOrb = list.some((e) => e.r === p.r && e.c === p.c);
      if (onOrb && !energyCollected.has(k)) {
        energyCollected.add(k);
        score += 50;
        playSound("energy");
        spawnParticles(10, "#e879f9");
        setStatus("+50 quantum energy", "success");
        const el = getCellElement(p);
        if (el) {
          el.classList.remove("cell--has-energy");
          const nt = tooltipForCell(p.r, p.c);
          if (nt) el.title = nt;
          else el.removeAttribute("title");
        }
      }
    }
  }

  function checkWin() {
    return playerCells.some((p) => p.r === exitCell.r && p.c === exitCell.c);
  }

  /**
   * After every move / split / measure: portals → energy → win.
   * Keeping this single “resolve” step avoids bugs where one action forgets to check portals.
   * Returns true if the level was just completed.
   */
  function resolveTurn() {
    applyPortals();
    tryCollectEnergy();
    if (checkWin()) {
      winGame();
      return true;
    }
    return false;
  }

  function winGame() {
    gameOver = true;
    renderPlayers();
    markLevelCompleted(progressProfileKey(playerDisplayName), selectedDifficultyTier, levelIndex);
    score += 200 + Math.max(0, 100 - moves);
    playSound("win");
    spawnPixelsBurst(48);
    if (winFx) winFx.style.display = "block";
    /* Slight board dim draws attention to the win panel (paired with CSS). */
    if (mazeBoard) mazeBoard.classList.add("maze-board--win-dim");

    winScoreEl.textContent = String(score);
    winMovesEl.textContent = String(moves);
    const winSubEl = document.querySelector(".win-sub");
    if (winSubEl) {
      const modeName = activeLevelDef ? activeLevelDef.difficulty : "this mode";
      winSubEl.textContent =
        levelIndex >= NUMBER_OF_LEVELS - 1
          ? playerDisplayName +
            ", you cleared all " +
            NUMBER_OF_LEVELS +
            " " +
            modeName +
            " stages — outstanding run!"
          : playerDisplayName + " — at least one of your states reached the exit.";
    }
    if (winDifficultyEl && activeLevelDef) {
      winDifficultyEl.textContent = activeLevelDef.difficulty + " · stage " + (levelIndex + 1) + "/" + NUMBER_OF_LEVELS;
    }

    const hasNext = levelIndex < NUMBER_OF_LEVELS - 1;
    canAdvanceToNext = hasNext;
    if (btnWinNext) btnWinNext.style.display = hasNext ? "inline-flex" : "none";

    syncControlBar();
    stopMusic();

    window.setTimeout(() => {
      if (winOverlay) {
        /* Replay panel entrance animation every clear (not only the first). */
        if (winPanel) {
          winPanel.classList.remove(ANIM.winPanelEnterClass);
          void winPanel.offsetWidth;
          winPanel.classList.add(ANIM.winPanelEnterClass);
        }
        winOverlay.classList.add("win-overlay--open");
        winOverlay.setAttribute("aria-hidden", "false");
      }
    }, ANIM.winOverlayDelayMs);
  }

  function goToNextLevelFromWin() {
    if (!canAdvanceToNext || levelIndex >= NUMBER_OF_LEVELS - 1) return;
    closeWinOverlay();
    beginLevel(levelIndex + 1);
    if (chkMusic.checked) startMusic();
  }

  /**
   * SUPERPOSITION: pick 2–3 neighbouring empty tiles as new possible states.
   */
  function createSuperposition() {
    if (splitsLeft <= 0 || gameOver || paused) return;

    const seeds = uniqueCells(playerCells);
    const candidates = [];
    const blocked = new Set(seeds.map(cellKey));

    for (const p of seeds) {
      for (let d = 0; d < 4; d++) {
        const nr = p.r + STEP_DR[d];
        const nc = p.c + STEP_DC[d];
        const kk = nr + "," + nc;
        if (!isWalkable(nr, nc) || blocked.has(kk)) continue;
        blocked.add(kk);
        candidates.push({ r: nr, c: nc });
      }
    }

    if (candidates.length === 0) {
      setStatus("No free neighbour to split into.", undefined);
      playSound("blocked");
      return;
    }

    shuffleArray(candidates);
    const count = Math.min(3, Math.max(2, candidates.length));
    playerCells = candidates.slice(0, count);
    splitsLeft--;
    playSound("split");
    runSplitBoardAnimation();
    spawnParticles(22, "#22d3ee");
    setStatus("Superposition: " + playerCells.length + " possible states.", "split");

    const won = resolveTurn();
    syncControlBar();
    if (!won) renderPlayers();
  }

  /**
   * MEASUREMENT: choose one surviving cell at random (collapse).
   * One path: update state → visuals → resolveTurn (portals may still fire after collapse).
   */
  function collapseMeasurement() {
    if (!isSuperposition() || measuresLeft <= 0 || gameOver || paused) return;

    const uniq = uniqueCells(playerCells);
    const picked = uniq[Math.floor(Math.random() * uniq.length)];
    playerCells = [picked];
    measuresLeft--;

    if (collapseOverlay) {
      collapseOverlay.classList.remove("collapse-overlay--active");
      void collapseOverlay.offsetWidth;
      collapseOverlay.classList.add("collapse-overlay--active");
      window.setTimeout(() => collapseOverlay.classList.remove("collapse-overlay--active"), ANIM.collapseOverlayMs);
    }

    playSound("measure");
    spawnParticles(28, "#e879f9");
    setStatus("Wavefunction collapsed — one reality.", "collapse");

    /* Instant visual: one token before portals resolve (student sees “collapse” first). */
    renderPlayers();

    const won = resolveTurn();
    syncControlBar();
    if (!won) renderPlayers();

    /* Highlight the surviving cell after portals (partner may have moved you). */
    const elStay = getCellElement(playerCells[0]);
    if (elStay && !won) {
      elStay.classList.add("cell--picked-reality");
      window.setTimeout(() => elStay.classList.remove("cell--picked-reality"), ANIM.pickedRealityMs);
    }
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
  }

  /** One movement step for every ghost in the same direction. */
  function moveDir(dr, dc) {
    if (paused || gameOver) return;

    const next = [];
    for (const p of playerCells) {
      const nr = p.r + dr;
      const nc = p.c + dc;
      if (isWalkable(nr, nc)) next.push({ r: nr, c: nc });
      else next.push({ r: p.r, c: p.c });
    }
    playerCells = uniqueCells(next);
    moves++;
    playSound("move");

    const won = resolveTurn();
    syncControlBar();
    if (!won) renderPlayers();
  }

  /**
   * Starts or restarts a level: resets flags so pause / win never “stick”.
   */
  function beginLevel(idx) {
    closeWinOverlay();
    levelIndex = idx;
    activeLevelDef = getLevelDefinition(levelIndex, selectedDifficultyTier);
    loadLevelIntoGrid(activeLevelDef);

    playerCells = [{ r: startCell.r, c: startCell.c }];
    moves = 0;
    energyCollected = new Set();
    splitsLeft = activeLevelDef.splits;
    measuresLeft = activeLevelDef.measures;
    gameOver = false;
    paused = false;

    pauseModal.classList.remove("modal--open");
    pauseModal.setAttribute("aria-hidden", "true");
    if (btnPause) btnPause.textContent = "Pause";

    if (levelIndex === 0) score = 0;

    buildMazeDOM();
    syncControlBar();
    setStatus(
      playerDisplayName +
        " — " +
        activeLevelDef.difficulty +
        " · Stage " +
        (levelIndex + 1) +
        "/" +
        NUMBER_OF_LEVELS +
        " — reach the exit (★).",
      undefined
    );
    if (winFx) winFx.style.display = "none";
    const winSubEl = document.querySelector(".win-sub");
    if (winSubEl) {
      winSubEl.textContent =
        playerDisplayName + " — at least one of your states reached the exit.";
    }
  }

  function openGameFromMenu() {
    commitPlayerNameFromInputs();
    showScreen(screenGame);
    beginLevel(0);
    if (chkMusic.checked) startMusic();
  }

  // —— Audio (Web Audio API — toggle with “Sound” / “Music”) ——

  function getAudioContext() {
    if (!chkSound.checked && !chkMusic.checked) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || /** @type {typeof AudioContext | undefined} */ (window.webkitAudioContext);
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playSound(kind) {
    if (!chkSound.checked) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const tone = (type, f0, f1, tDur, gain0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(f0, now);
      if (f1 != null) o.frequency.exponentialRampToValueAtTime(f1, now + tDur * 0.85);
      g.gain.setValueAtTime(gain0, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + tDur);
      o.start(now);
      o.stop(now + tDur + 0.02);
    };

    if (kind === "move") tone("sine", 420, 300, 0.075, 0.055);
    else if (kind === "split") tone("triangle", 180, 720, 0.28, 0.065);
    else if (kind === "measure") tone("sawtooth", 620, 90, 0.38, 0.048);
    else if (kind === "teleport") tone("square", 480, 920, 0.14, 0.04);
    else if (kind === "energy") tone("sine", 900, 1200, 0.12, 0.055);
    else if (kind === "blocked") tone("square", 130, 80, 0.06, 0.035);
    else if (kind === "win") {
      [523.25, 659.25, 783.99, 987.77].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.connect(g);
        g.connect(ctx.destination);
        const t0 = now + i * 0.11;
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.055, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
        o.start(t0);
        o.stop(t0 + 0.3);
      });
    }
  }

  function stopMusic() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  function startMusic() {
    stopMusic();
    if (!chkMusic.checked) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    musicInterval = window.setInterval(() => {
      if (!chkMusic.checked || paused || gameOver || !screenGame.classList.contains("screen--active")) {
        stopMusic();
        return;
      }
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(
        Math.min(440, 85 + levelIndex * 4 + (selectedDifficultyTier - 1) * 9),
        t
      );
      g.gain.setValueAtTime(0.014, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      o.start(t);
      o.stop(t + 1.65);
    }, 2200);
  }

  function spawnParticles(count, color) {
    if (!particleLayer) return;
    const rect = mazeBoard.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 + window.scrollX;
    const cy = rect.top + rect.height / 2 + window.scrollY;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.style.cssText =
        "position:fixed;left:" +
        cx +
        "px;top:" +
        cy +
        "px;width:4px;height:4px;border-radius:50%;pointer-events:none;z-index:60;background:" +
        color +
        ";box-shadow:0 0 10px " +
        color +
        ";opacity:0.95;transition:transform 0.85s cubic-bezier(0.22,1,0.36,1),opacity 0.85s ease";
      particleLayer.appendChild(p);
      const ang = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 130;
      requestAnimationFrame(() => {
        p.style.transform = "translate(" + Math.cos(ang) * dist + "px," + Math.sin(ang) * dist + "px)";
        p.style.opacity = "0";
      });
      window.setTimeout(() => p.remove(), 900);
    }
  }

  /** Extra sparkles on win — reads well on camera during demos. */
  function spawnPixelsBurst(n) {
    spawnParticles(n, "#22d3ee");
    window.setTimeout(() => spawnParticles(Math.floor(n * 0.6), "#a78bfa"), 120);
  }

  function getSanitizedPlayerName(raw) {
    let s = (raw || "").trim().replace(/\s+/g, " ");
    if (!s) return "Explorer";
    if (s.length > 28) s = s.slice(0, 28);
    return s;
  }

  /** Call when entering gameplay so the header matches the name + difficulty fields. */
  function commitPlayerNameFromInputs() {
    const el = document.querySelector(".js-player-name");
    playerNameDraft = el ? el.value : playerNameDraft;
    playerDisplayName = getSanitizedPlayerName(playerNameDraft);
    document.querySelectorAll(".js-player-name").forEach((inp) => {
      inp.value = playerNameDraft;
    });
    if (gamePlayerDisplay) gamePlayerDisplay.textContent = playerDisplayName;
  }

  /** Keep both mode pickers (title + instructions) in sync when player taps a mode. */
  function setDifficultyTier(tier) {
    const t = Math.max(1, Math.min(6, tier));
    selectedDifficultyTier = t;
    document.querySelectorAll(".mode-picker [data-tier]").forEach((btn) => {
      const on = Number(btn.getAttribute("data-tier"), 10) === t;
      btn.classList.toggle("mode-picker__btn--active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function togglePause() {
    if (!screenGame.classList.contains("screen--active") || gameOver) return;
    if (winOverlay && winOverlay.classList.contains("win-overlay--open")) return;

    paused = !paused;
    pauseModal.classList.toggle("modal--open", paused);
    pauseModal.setAttribute("aria-hidden", paused ? "false" : "true");
    if (btnPause) btnPause.textContent = paused ? "Resume" : "Pause";

    if (paused) stopMusic();
    else if (chkMusic.checked) startMusic();

    setStatus(paused ? "Paused." : "Resumed.", undefined);
  }

  // —— Wire UI events ——
  document.querySelectorAll(".mode-picker").forEach((picker) => {
    picker.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const btn = target.closest("[data-tier]");
      if (!btn || !picker.contains(btn)) return;
      const val = Number(btn.getAttribute("data-tier"), 10);
      if (val < 1 || val > 6) return;

      const inGame = screenGame.classList.contains("screen--active");
      if (inGame) {
        if (gameOver) return;
        if (val === selectedDifficultyTier) return;
        setDifficultyTier(val);
        /* New run in chosen mode: always stage 1; score resets in beginLevel(0). */
        beginLevel(0);
        if (chkMusic.checked) startMusic();
      } else {
        setDifficultyTier(val);
      }
    });
  });

  document.querySelectorAll(".js-player-name").forEach((inp) => {
    inp.addEventListener("input", () => {
      playerNameDraft = inp.value;
      document.querySelectorAll(".js-player-name").forEach((o) => {
        if (o !== inp) o.value = playerNameDraft;
      });
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (
        screenStart.classList.contains("screen--active") ||
        screenInstructions.classList.contains("screen--active")
      ) {
        e.preventDefault();
        openGameFromMenu();
      }
    });
  });

  if (btnCloseRules) btnCloseRules.addEventListener("click", () => closeRulesModal());
  if (rulesModal) {
    rulesModal.addEventListener("click", (e) => {
      if (e.target === rulesModal) closeRulesModal();
    });
  }
  if (btnViewRules) btnViewRules.addEventListener("click", () => openRulesModal());
  if (btnViewRulesInst) btnViewRulesInst.addEventListener("click", () => openRulesModal());
  if (btnRulesHeader) btnRulesHeader.addEventListener("click", () => openRulesModal());
  if (btnRulesFromPause) btnRulesFromPause.addEventListener("click", () => openRulesModal());

  btnPlay.addEventListener("click", () => openGameFromMenu());
  btnHowToPlay.addEventListener("click", () => showScreen(screenInstructions));
  btnStartGame.addEventListener("click", () => openGameFromMenu());
  btnBackTitle.addEventListener("click", () => showScreen(screenStart));

  btnSplit.addEventListener("click", () => createSuperposition());
  btnMeasure.addEventListener("click", () => collapseMeasurement());
  btnRestart.addEventListener("click", () => beginLevel(levelIndex));
  if (btnNextLevel) btnNextLevel.addEventListener("click", () => goToNextLevelFromWin());
  btnResume.addEventListener("click", () => togglePause());

  btnWinRestart.addEventListener("click", () => {
    showScreen(screenGame);
    beginLevel(0);
    if (chkMusic.checked) startMusic();
  });
  if (btnWinNext) btnWinNext.addEventListener("click", () => goToNextLevelFromWin());
  btnWinTitle.addEventListener("click", () => {
    stopMusic();
    showScreen(screenStart);
  });

  chkMusic.addEventListener("change", () => {
    if (chkMusic.checked && screenGame.classList.contains("screen--active") && !paused && !gameOver) {
      startMusic();
    } else {
      stopMusic();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (rulesModal && rulesModal.classList.contains("modal--open")) {
      if (e.code === "Escape") {
        e.preventDefault();
        closeRulesModal();
      }
      return;
    }
    if (screenStart.classList.contains("screen--active") || screenInstructions.classList.contains("screen--active")) {
      return;
    }
    if (e.code === "Escape") {
      e.preventDefault();
      togglePause();
      return;
    }
    if (paused || gameOver) return;

    let dr = 0;
    let dc = 0;
    if (e.code === "ArrowUp" || e.key === "w" || e.key === "W") dr = -1;
    else if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") dr = 1;
    else if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") dc = -1;
    else if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") dc = 1;
    else return;

    e.preventDefault();
    moveDir(dr, dc);
  });

  let touchX = 0;
  let touchY = 0;
  mazeBoard.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touchX = t.clientX;
      touchY = t.clientY;
    },
    { passive: true }
  );
  mazeBoard.addEventListener(
    "touchend",
    (e) => {
      if (paused || gameOver) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
      if (Math.abs(dx) > Math.abs(dy)) moveDir(0, dx > 0 ? 1 : -1);
      else moveDir(dy > 0 ? 1 : -1, 0);
    },
    { passive: true }
  );

  showScreen(screenStart);
})();
