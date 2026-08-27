(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const WIDTH = COLS * CELL;
  const HEIGHT = ROWS * CELL;
  const BEST_KEY = "gankbyte-byte-stack-best";
  const LAST_KEY = "gankbyte-byte-stack-last-played";
  const COLORS = {
    I: "#55e8ff", O: "#c6ff3d", T: "#b889ff", S: "#57e389",
    Z: "#ff526b", J: "#f7d35b", L: "#ff9a5c"
  };
  const SHAPES = {
    I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]], S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
  };
  const SPECIALS = ["explosive", "chain", "freeze"];
  const canvas = $("stack-canvas");
  const ctx = canvas?.getContext("2d");
  const nextCanvas = $("stack-next");
  const nextCtx = nextCanvas?.getContext("2d");
  if (!canvas || !ctx || !nextCanvas || !nextCtx) return;

  let board = [];
  let bag = [];
  let current = null;
  let nextType = null;
  let holdType = null;
  let canHold = true;
  let running = false;
  let paused = false;
  let gameOver = false;
  let lastFrame = 0;
  let fallClock = 0;
  let score = 0;
  let level = 1;
  let lines = 0;
  let combo = 0;
  let bestCombo = 0;
  let biggestClear = 0;
  let overdrives = 0;
  let charge = 0;
  let freezeUntil = 0;
  let overdriveUntil = 0;
  let lastClearAt = 0;
  let rescueEffects = [];
  let pointerStart = null;
  let client = null;
  let user = null;

  const clone = (matrix) => matrix.map((row) => row.slice());
  const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const shuffle = (items) => {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const takeType = () => {
    if (!bag.length) bag = shuffle(Object.keys(SHAPES));
    return bag.pop();
  };
  const rotateMatrix = (matrix) => {
    const result = matrix[0].map((_, x) => matrix.map((row) => row[x]).reverse());
    return result;
  };
  const specialLabel = (special) => ({ explosive: "BLAST", chain: "CHAIN", freeze: "FREEZE" }[special] || "NORMAL");

  function resetState() {
    board = emptyBoard();
    bag = [];
    current = null;
    nextType = takeType();
    holdType = null;
    canHold = true;
    score = 0;
    level = 1;
    lines = 0;
    combo = 0;
    bestCombo = 0;
    biggestClear = 0;
    overdrives = 0;
    charge = 0;
    freezeUntil = 0;
    overdriveUntil = 0;
    lastClearAt = 0;
    rescueEffects = [];
    spawn();
    updateHud();
  }

  function makePiece(type) {
    const matrix = clone(SHAPES[type]);
    const special = level >= 3 && Math.random() < Math.min(0.18, 0.07 + (level - 3) * 0.012)
      ? SPECIALS[Math.floor(Math.random() * SPECIALS.length)] : null;
    return { type, matrix, special, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
  }

  function spawn(type = nextType) {
    nextType = takeType();
    current = makePiece(type);
    if (collides(current, 0, 0, current.matrix)) {
      finish("STACK OVERFLOW");
    }
    drawNext();
  }

  function collides(piece, dx, dy, matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const px = piece.x + x + dx;
        const py = piece.y + y + dy;
        if (px < 0 || px >= COLS || py >= ROWS) return true;
        if (py >= 0 && board[py][px]) return true;
      }
    }
    return false;
  }

  function move(dx) {
    if (!running || paused || gameOver || !current) return;
    if (!collides(current, dx, 0, current.matrix)) current.x += dx;
    draw();
  }

  function rotate() {
    if (!running || paused || gameOver || !current) return;
    const rotated = rotateMatrix(current.matrix);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(current, kick, 0, rotated)) {
        current.x += kick;
        current.matrix = rotated;
        draw();
        return;
      }
    }
  }

  function softDrop() {
    if (!running || paused || gameOver || !current) return;
    if (!collides(current, 0, 1, current.matrix)) {
      current.y += 1;
      score += 1;
    } else lockPiece();
    updateHud();
    draw();
  }

  function hardDrop() {
    if (!running || paused || gameOver || !current) return;
    let distance = 0;
    while (!collides(current, 0, 1, current.matrix)) {
      current.y += 1;
      distance += 1;
    }
    score += distance * 2;
    lockPiece();
    updateHud();
    draw();
  }

  function hold() {
    if (!running || paused || gameOver || !current || !canHold) return;
    const type = current.type;
    holdType = holdType ? holdType : null;
    canHold = false;
    if (holdType) {
      const swap = holdType;
      holdType = type;
      current = makePiece(swap);
      if (collides(current, 0, 0, current.matrix)) finish("STACK OVERFLOW");
    } else {
      holdType = type;
      spawn();
    }
    updateHud();
    draw();
  }

  function lockPiece() {
    if (!current) return;
    current.matrix.forEach((row, y) => row.forEach((filled, x) => {
      const px = current.x + x;
      const py = current.y + y;
      if (filled && py >= 0 && py < ROWS && px >= 0 && px < COLS) {
        board[py][px] = { type: current.type, special: current.special };
      }
    }));
    clearLines();
    canHold = true;
    if (!gameOver) spawn();
  }

  function clearLines() {
    const clearedRows = [];
    board.forEach((row, index) => { if (row.every(Boolean)) clearedRows.push(index); });
    if (!clearedRows.length) {
      combo = 0;
      return;
    }
    const specials = clearedRows.flatMap((row) => board[row].filter(Boolean));
    const count = clearedRows.length;
    biggestClear = Math.max(biggestClear, count);
    lines += count;
    level = 1 + Math.floor(lines / 10);
    combo = lastClearAt && performance.now() - lastClearAt < 7000 ? combo + 1 : 1;
    bestCombo = Math.max(bestCombo, combo);
    lastClearAt = performance.now();
    const base = [0, 100, 300, 700, 1500][count] || 2000;
    const multiplier = Math.max(1, combo) * (overdriveUntil > performance.now() ? 2 : 1);
    score += base * level * multiplier;
    charge = Math.min(100, charge + count * 22 + (count === 4 ? 20 : 0));
    if (charge >= 100) {
      charge = 100;
      $("stack-power-name").textContent = "BYTE BOMB READY";
      $("stack-power-button").disabled = false;
    }
    if (count >= 4) activateOverdrive();
    if (specials.some((cell) => cell.special === "explosive")) explodeAround(clearedRows[0]);
    if (specials.some((cell) => cell.special === "chain")) {
      score += 250 * level;
      rescueEffects.push({ text: "CHAIN +" + (250 * level), x: WIDTH / 2, y: 220, until: performance.now() + 900 });
    }
    if (specials.some((cell) => cell.special === "freeze")) freezeUntil = performance.now() + 4000;
    board = board.filter((_, index) => !clearedRows.includes(index));
    while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
    rescueEffects.push({ text: count === 4 ? "BYTE CRUSH!" : `${count} LINE CLEAR`, x: WIDTH / 2, y: 250, until: performance.now() + 950 });
  }

  function explodeAround(row) {
    const center = Math.floor(COLS / 2);
    for (let y = Math.max(0, row - 1); y <= Math.min(ROWS - 1, row + 1); y += 1) {
      for (let x = Math.max(0, center - 1); x <= Math.min(COLS - 1, center + 1); x += 1) board[y][x] = null;
    }
    score += 300 * level;
    rescueEffects.push({ text: "GLITCH BLAST", x: WIDTH / 2, y: 280, until: performance.now() + 950 });
  }

  function activateOverdrive() {
    overdriveUntil = performance.now() + 9000;
    overdrives += 1;
    rescueEffects.push({ text: "BYTE OVERDRIVE", x: WIDTH / 2, y: 160, until: performance.now() + 1300 });
  }

  function usePower() {
    if (!running || paused || gameOver || charge < 100) return;
    const centerX = Math.floor(COLS / 2);
    const centerY = Math.floor(ROWS / 2);
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      for (let x = centerX - 2; x <= centerX + 2; x += 1) if (board[y]?.[x]) board[y][x] = null;
    }
    charge = 0;
    score += 500 * level;
    rescueEffects.push({ text: "BYTE BOMB", x: WIDTH / 2, y: 300, until: performance.now() + 1100 });
    $("stack-power-name").textContent = "CHARGE 0%";
    $("stack-power-button").disabled = true;
    updateHud();
    draw();
  }

  function start() {
    resetState();
    running = true;
    paused = false;
    gameOver = false;
    lastFrame = performance.now();
    fallClock = 0;
    $("stack-message").hidden = true;
    $("stack-result").hidden = true;
    $("stack-start").hidden = true;
    $("stack-pause").hidden = false;
    $("stack-restart").hidden = false;
    $("stack-status").textContent = "Stack clean lines. Push the signal harder.";
    canvas.focus();
    draw();
  }

  function finish(reason = "STACK OVERFLOW") {
    if (gameOver) return;
    gameOver = true;
    running = false;
    paused = false;
    const best = readBest();
    const isRecord = score > Number(best?.score || 0);
    const result = { score, level, lines, bestCombo, biggestClear, overdrives, at: Date.now() };
    window.localStorage.setItem(LAST_KEY, String(Date.now()));
    if (isRecord) window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
    setResult(result, isRecord, reason);
    saveScore(result);
    $("stack-start").hidden = false;
    $("stack-start").textContent = "Run again →";
    $("stack-pause").hidden = true;
    $("stack-restart").hidden = false;
    $("stack-status").textContent = isRecord ? "New personal best. Gank it again." : "The stack won this run. Try again.";
    draw();
  }

  function setResult(result, isRecord, reason) {
    $("stack-result").hidden = false;
    $("result-stack-score").textContent = result.score.toLocaleString();
    $("result-stack-record").textContent = isRecord ? "NEW PERSONAL BEST" : reason;
    $("result-stack-mark").textContent = isRecord ? "NEW RECORD" : "RUN COMPLETE";
    $("result-stack-level").textContent = result.level;
    $("result-stack-lines").textContent = result.lines;
    $("result-stack-combo").textContent = `x${Math.max(1, result.bestCombo)}`;
    $("result-stack-biggest").textContent = `${result.biggestClear} line${result.biggestClear === 1 ? "" : "s"}`;
    $("result-stack-overdrives").textContent = result.overdrives;
    $("result-stack-rank").textContent = user ? "Updating…" : "Sign in";
  }

  function readBest() {
    try { return JSON.parse(window.localStorage.getItem(BEST_KEY) || "null"); } catch { return null; }
  }

  function updateHud() {
    $("stack-score").textContent = score.toLocaleString();
    $("stack-level").textContent = level;
    $("stack-lines").textContent = lines;
    $("stack-combo").textContent = `x${Math.max(1, combo)}`;
    $("stack-biggest").textContent = biggestClear;
    $("stack-charge").textContent = `${charge}%`;
    $("stack-hold").textContent = holdType ? `Hold: ${holdType}` : "Hold: empty";
    if (charge < 100) $("stack-power-name").textContent = `CHARGE ${charge}%`;
    const power = $("stack-power-button");
    power.disabled = charge < 100;
  }

  function drawCell(context, x, y, color, special = null, size = CELL) {
    const px = x * size;
    const py = y * size;
    context.fillStyle = color;
    context.fillRect(px + 2, py + 2, size - 4, size - 4);
    context.fillStyle = "rgba(255,255,255,.22)";
    context.fillRect(px + 4, py + 4, size - 8, 3);
    context.strokeStyle = special ? "#ffffff" : "rgba(4,6,8,.75)";
    context.lineWidth = special ? 2 : 1;
    context.strokeRect(px + 2, py + 2, size - 4, size - 4);
    if (special) {
      context.fillStyle = "rgba(0,0,0,.7)";
      context.font = `bold ${Math.max(7, size * .28)}px Arial`;
      context.textAlign = "center";
      context.fillText(special === "explosive" ? "×" : special === "chain" ? "↗" : "F", px + size / 2, py + size * .68);
    }
  }

  function drawGrid() {
    ctx.fillStyle = "#090c11";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "rgba(155,174,194,.10)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) { ctx.beginPath(); ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, HEIGHT); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y += 1) { ctx.beginPath(); ctx.moveTo(0, y * CELL + .5); ctx.lineTo(WIDTH, y * CELL + .5); ctx.stroke(); }
  }

  function draw() {
    drawGrid();
    board.forEach((row, y) => row.forEach((cell, x) => { if (cell) drawCell(ctx, x, y, COLORS[cell.type], cell.special); }));
    if (current && !gameOver) {
      let ghostY = current.y;
      while (!collides({ ...current, y: ghostY }, 0, 1, current.matrix)) ghostY += 1;
      current.matrix.forEach((row, y) => row.forEach((filled, x) => {
        if (!filled) return;
        ctx.globalAlpha = .2;
        drawCell(ctx, current.x + x, ghostY + y, COLORS[current.type], null);
        ctx.globalAlpha = 1;
      }));
      current.matrix.forEach((row, y) => row.forEach((filled, x) => { if (filled) drawCell(ctx, current.x + x, current.y + y, COLORS[current.type], current.special); }));
    }
    const now = performance.now();
    rescueEffects = rescueEffects.filter((effect) => effect.until > now);
    ctx.textAlign = "center";
    rescueEffects.forEach((effect) => {
      const progress = (effect.until - now) / 1300;
      ctx.globalAlpha = Math.min(1, progress * 1.8);
      ctx.fillStyle = effect.text === "BYTE OVERDRIVE" ? "#c6ff3d" : "#ffffff";
      ctx.font = "800 18px Arial";
      ctx.fillText(effect.text, effect.x, effect.y - (1 - progress) * 24);
    });
    ctx.globalAlpha = 1;
    if (paused && running) {
      ctx.fillStyle = "rgba(4,6,8,.75)"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#c6ff3d"; ctx.font = "800 32px Arial"; ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
    }
  }

  function drawNext() {
    nextCtx.fillStyle = "#090c11";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextType) return;
    const shape = SHAPES[nextType];
    const size = 18;
    const ox = (nextCanvas.width - shape[0].length * size) / 2;
    const oy = (nextCanvas.height - shape.length * size) / 2;
    shape.forEach((row, y) => row.forEach((filled, x) => { if (filled) drawCellAt(nextCtx, ox + x * size, oy + y * size, COLORS[nextType], size); }));
  }

  function drawCellAt(context, px, py, color, size) {
    context.fillStyle = color; context.fillRect(px + 1, py + 1, size - 2, size - 2);
    context.strokeStyle = "rgba(4,6,8,.75)"; context.strokeRect(px + 1, py + 1, size - 2, size - 2);
  }

  function frame(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    if (running && !paused && !gameOver) {
      fallClock += dt * 1000;
      const interval = Math.max(90, 760 - (level - 1) * 55) * (freezeUntil > now ? 1.9 : 1) * (overdriveUntil > now ? .82 : 1);
      if (fallClock >= interval) { fallClock = 0; if (!collides(current, 0, 1, current.matrix)) current.y += 1; else lockPiece(); updateHud(); }
    }
    draw();
    requestAnimationFrame(frame);
  }

  function action(name) {
    ({ left: () => move(-1), right: () => move(1), rotate, down: softDrop, drop: hardDrop }[name] || (() => {}))();
  }

  function onKey(event) {
    const key = event.key.toLowerCase();
    const actions = { arrowleft: "left", arrowright: "right", arrowdown: "down", arrowup: "rotate", x: "rotate", " ": "drop" };
    if (actions[key]) { event.preventDefault(); action(actions[key]); }
    else if (key === "c") { event.preventDefault(); hold(); }
    else if (key === "escape") { event.preventDefault(); togglePause(); }
    else if (key === "r") { event.preventDefault(); start(); }
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    $("stack-pause").innerHTML = paused ? "Resume <span>▶</span>" : "Pause <span>Ⅱ</span>";
    $("stack-status").textContent = paused ? "Run paused." : "Stack clean lines. Push the signal harder.";
    draw();
  }

  async function saveScore(result) {
    if (!client || !user) return;
    const payload = { user_id: user.id, score: result.score, level: result.level, lines: result.lines, best_combo: result.bestCombo, biggest_clear: result.biggestClear, overdrives: result.overdrives, xp_earned: Math.min(250, 25 + result.lines * 2), status: "approved" };
    const response = await client.from("byte_stack_scores").insert(payload).select("id").single();
    if (!response.error) { $("result-stack-rank").textContent = "Submitted"; loadLeaderboard(); }
  }

  async function loadLeaderboard() {
    if (!client) return;
    const result = await client.from("byte_stack_leaderboard").select("display_name,best_score,best_level,best_lines").order("best_score", { ascending: false }).limit(10);
    const body = $("stack-leaderboard-body");
    if (result.error) { body.innerHTML = "<tr><td colspan=\"5\">Leaderboard temporarily unavailable.</td></tr>"; return; }
    body.innerHTML = result.data?.length ? result.data.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.display_name || "Player")}</td><td>${Number(row.best_score || 0).toLocaleString()}</td><td>${row.best_level || 1}</td><td>${row.best_lines || 0}</td></tr>`).join("") : "<tr><td colspan=\"5\">No approved runs yet. Be the first.</td></tr>";
  }

  function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character])); }

  function wireAuth() {
    const config = window.GANKBYTE_XP_CONFIG || {};
    if (!window.supabase || !config.supabaseUrl || !config.supabasePublishableKey) return;
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    client.auth.getSession().then(({ data }) => { user = data.session?.user || null; updateAuth(); loadLeaderboard(); });
    client.auth.onAuthStateChange((_event, session) => { user = session?.user || null; updateAuth(); });
  }

  function updateAuth() {
    const status = $("stack-auth-status");
    const login = $("stack-login");
    const logout = $("stack-logout");
    if (user) { status.textContent = `Signed in as ${user.user_metadata?.full_name || user.email || "player"}. Scores submit automatically.`; login.hidden = true; logout.hidden = false; }
    else { status.textContent = "Sign in with Discord to submit scores."; login.hidden = false; logout.hidden = true; }
  }

  $("stack-start").addEventListener("click", start);
  $("stack-run-again").addEventListener("click", start);
  $("stack-restart").addEventListener("click", start);
  $("stack-pause").addEventListener("click", togglePause);
  $("stack-power-button").addEventListener("click", usePower);
  $("stack-help-button").addEventListener("click", () => $("stack-help").showModal());
  $("stack-help-close").addEventListener("click", () => $("stack-help").close());
  $("stack-login").addEventListener("click", () => window.location.href = `login.html?returnTo=${encodeURIComponent("byte-stack.html")}`);
  $("stack-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  document.querySelectorAll("[data-stack-action]").forEach((button) => button.addEventListener("click", () => action(button.dataset.stackAction)));
  window.addEventListener("keydown", onKey, { passive: false });
  canvas.addEventListener("pointerdown", (event) => { pointerStart = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x; const dy = event.clientY - pointerStart.y; pointerStart = null;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) action(dx > 0 ? "right" : "left");
    else if (dy > 35) action("down");
    else if (dy < -35) action("drop");
    else action("rotate");
  });
  resetState();
  wireAuth();
  requestAnimationFrame(frame);
})();
