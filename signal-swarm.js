(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("signal-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const config = window.GANKBYTE_XP_CONFIG || {};
  const W = canvas.width;
  const H = canvas.height;
  const TILE = 4;
  const TW = Math.ceil(W / TILE);
  const TH = Math.ceil(H / TILE);
  const SIGNAL_H = 18;
  const GRAVITY = 760;
  const skillKeys = ["bridge", "floater", "bomber", "blocker", "builder", "basher", "miner", "digger"];
  const skillNames = {
    bridge: "BRIDGE", floater: "FLOATER", bomber: "BOMBER", blocker: "BLOCKER",
    builder: "BUILDER", basher: "BASHER", miner: "MINER", digger: "DIGGER"
  };
  const speedNames = ["SAFE", "PUSH", "GANK", "OVERCLOCK"];
  const speedFactors = [0.72, 1, 1.28, 1.55];

  // Levels use terrain, not invisible platform routes. Signals always walk
  // forwards until a wall or blocker changes their direction.
  const levelPlans = [
    { name: "FIRST DROP", signals: 12, goal: 58, release: 1.25, layout: 0 },
    { name: "THE CROSSING", signals: 14, goal: 62, release: 1.12, layout: 1 },
    { name: "SPLIT SIGNAL", signals: 16, goal: 66, release: 1.02, layout: 2 },
    { name: "THE DESCENT", signals: 18, goal: 68, release: 0.94, layout: 3 },
    { name: "FAULT LINE", signals: 20, goal: 70, release: 0.88, layout: 4 },
    { name: "OVERLOAD", signals: 21, goal: 72, release: 0.82, layout: 5 },
    { name: "THE MAZE", signals: 22, goal: 75, release: 0.78, layout: 6 },
    { name: "SYSTEM COLLAPSE", signals: 24, goal: 78, release: 0.74, layout: 7 }
  ];
  const levelLayouts = [
    { hatch: { x: 92, y: 44 }, platforms: [[52, 330, 148], [388, 610, 226], [240, 520, 306], [548, 900, 386], [170, 910, 474]], walls: [[285, 78, 148]] },
    { hatch: { x: 842, y: 44 }, platforms: [[650, 908, 136], [470, 760, 208], [790, 930, 274], [610, 900, 340], [300, 720, 410], [70, 900, 484]], walls: [[690, 74, 136], [820, 274, 340]] },
    { hatch: { x: 96, y: 44 }, platforms: [[42, 210, 132], [290, 610, 202], [100, 780, 280], [300, 920, 356], [80, 430, 426], [470, 910, 492]], walls: [[468, 80, 132], [610, 202, 280]] },
    { hatch: { x: 490, y: 44 }, platforms: [[350, 780, 136], [230, 510, 202], [585, 850, 264], [480, 920, 330], [250, 680, 402], [80, 900, 490]], walls: [[565, 76, 136], [730, 202, 264]] },
    { hatch: { x: 570, y: 44 }, platforms: [[430, 880, 142], [270, 590, 208], [60, 440, 276], [500, 930, 344], [350, 720, 416], [100, 900, 490]], walls: [[620, 82, 142], [370, 208, 276]] },
    { hatch: { x: 94, y: 44 }, platforms: [[56, 280, 132], [350, 710, 198], [170, 560, 262], [620, 930, 326], [370, 760, 392], [180, 910, 484]], walls: [[220, 72, 132], [500, 198, 262], [770, 326, 392]] },
    { hatch: { x: 470, y: 44 }, platforms: [[340, 610, 120], [670, 820, 176], [520, 920, 232], [310, 680, 292], [80, 470, 352], [500, 780, 416], [250, 920, 490]], walls: [[560, 60, 120], [740, 176, 232], [430, 292, 352]] },
    { hatch: { x: 88, y: 44 }, platforms: [[42, 176, 132], [250, 560, 192], [100, 390, 254], [450, 930, 318], [690, 930, 382], [430, 790, 438], [140, 910, 494]], walls: [[130, 72, 132], [430, 192, 254], [760, 318, 382]] }
  ];

  const bestKey = "gankbyte-signal-swarm-best";
  const statsKey = "gankbyte-signal-swarm-stats";
  const achievementsKey = "gankbyte-signal-swarm-achievements";
  let terrain = new Uint8Array(TW * TH);
  let platforms = [], walls = [], exit = null, spawnPoint = { x: 90, y: 44 };
  let signals = [], particles = [];
  let running = false, paused = false, finished = false, lastFrame = 0;
  let elapsed = 0, levelElapsed = 0, nextSpawn = 0;
  let levelIndex = 0, levelSpawned = 0, levelSaved = 0, levelLost = 0;
  let score = 0, saved = 0, lost = 0, combo = 1, bestCombo = 1, fastestRescue = null, speed = 0;
  let selectedAbility = "bridge", charges = {}, selectedSignalId = null, target = { x: 300, y: 430 };
  let client = null, user = null, lastRun = null;
  let pointerStart = null, pointerMoved = false, viewOffset = { x: 0, y: 0 };

  const random = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const format = (value) => Number(value || 0).toLocaleString();
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const index = (x, y) => y * TW + x;

  function fillTerrain(x1, y1, x2, y2, value = 1) {
    const left = clamp(Math.floor(Math.min(x1, x2) / TILE), 0, TW - 1);
    const right = clamp(Math.ceil(Math.max(x1, x2) / TILE), 0, TW);
    const top = clamp(Math.floor(Math.min(y1, y2) / TILE), 0, TH - 1);
    const bottom = clamp(Math.ceil(Math.max(y1, y2) / TILE), 0, TH);
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) terrain[index(x, y)] = value;
  }
  function clearTerrainCircle(cx, cy, radius) {
    const left = clamp(Math.floor((cx - radius) / TILE), 0, TW - 1);
    const right = clamp(Math.ceil((cx + radius) / TILE), 0, TW);
    const top = clamp(Math.floor((cy - radius) / TILE), 0, TH - 1);
    const bottom = clamp(Math.ceil((cy + radius) / TILE), 0, TH);
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
      const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
      if (Math.hypot(px - cx, py - cy) <= radius) terrain[index(x, y)] = 0;
    }
  }
  function clearTerrainRect(x1, y1, x2, y2) { fillTerrain(x1, y1, x2, y2, 0); }
  function solidAt(x, y) {
    const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
    return gx >= 0 && gx < TW && gy >= 0 && gy < TH && terrain[index(gx, gy)] > 0;
  }
  function surfaceAt(x, expectedBottom, range = 28) {
    const start = Math.max(0, Math.floor(expectedBottom - range));
    const end = Math.min(H, Math.ceil(expectedBottom + range));
    for (let y = start; y <= end; y += TILE) if (solidAt(x, y)) return y;
    return null;
  }
  function landingAt(x, previousBottom, nextBottom) {
    const start = Math.max(0, Math.floor(previousBottom));
    const end = Math.min(H, Math.ceil(nextBottom + 2));
    for (let y = start; y <= end; y += TILE) if (solidAt(x, y)) return y;
    return null;
  }
  function platformAt(signal) {
    const bottom = signal.y + SIGNAL_H;
    return platforms.find((platform) => signal.x >= platform.x1 && signal.x <= platform.x2 && Math.abs(platform.y - bottom) < 12 && solidAt(signal.x, bottom + 2)) || null;
  }
  function currentPlan() { return levelPlans[levelIndex] || { name: `OVERCLOCK ${levelIndex + 1}`, signals: Math.min(30, 24 + (levelIndex - 7) * 2), goal: Math.min(92, 78 + (levelIndex - 7) * 2), release: .7, layout: levelIndex % levelLayouts.length }; }
  function chargesForLevel() {
    const extra = Math.min(4, Math.floor(levelIndex / 2));
    return { bridge: 1 + extra, floater: 1 + extra, bomber: 1 + extra, blocker: 2 + extra, builder: 4 + extra, basher: 2 + extra, miner: 2 + extra, digger: 2 + extra };
  }
  function applyLevelLayout() {
    const layout = levelLayouts[currentPlan().layout % levelLayouts.length];
    platforms = layout.platforms.map((p, i) => ({ id: `platform-${i}`, x1: p[0], x2: p[1], y: p[2], built: false }));
    spawnPoint = { ...layout.hatch };
    walls = layout.walls.map((wall, i) => {
      // Blue walls are route turns, so their centre must sit on a real
      // platform edge. The old layouts stored approximate X values; snapping
      // them here keeps every level playable while preserving each wall's
      // intended side of the route.
      const anchor = platforms.find((platform) => Math.abs(platform.y - wall[1]) <= 1)
        || platforms.find((platform) => Math.abs(platform.y - wall[2]) <= 1)
        || platforms.reduce((closest, platform) => Math.abs(platform.y - wall[1]) < Math.abs(closest.y - wall[1]) ? platform : closest, platforms[0]);
      const isTopPlatformWall = wall[2] <= platforms[0].y + 1 && wall[1] < platforms[0].y;
      const edge = isTopPlatformWall
        ? platforms[0].x2 - 7
        : (Math.abs(wall[0] - anchor.x1) <= Math.abs(wall[0] - anchor.x2) ? anchor.x1 + 7 : anchor.x2 - 7);
      return { id: `wall-${i}`, x: clamp(edge, 14, W - 14), y1: wall[1], y2: wall[2] };
    });
    const startPlatform = platforms[0];
    const startWallTop = spawnPoint.y + 24;
    const startWallBottom = startPlatform.y - 3;
    walls.push({ id: "start-left", x: clamp(startPlatform.x1 + 7, 14, W - 14), y1: startWallTop, y2: startWallBottom });
    const last = platforms[platforms.length - 1];
    exit = { x: last.x2 - 28, y: last.y, platformId: last.id };
    terrain.fill(0);
    platforms.forEach((platform) => fillTerrain(platform.x1, platform.y, platform.x2, platform.y + 14, platform.built ? 2 : 1));
    walls.forEach((wall) => fillTerrain(wall.x - 7, wall.y1, wall.x + 7, wall.y2, 1));
  }
  function addPlatform(x1, x2, y, built = true) {
    const platform = { id: `built-${elapsed}-${Math.random()}`, x1: Math.min(x1, x2), x2: Math.max(x1, x2), y, built };
    platforms.push(platform);
    fillTerrain(platform.x1, platform.y, platform.x2, platform.y + 12, built ? 2 : 1);
    return platform;
  }

  function localStats() { try { return JSON.parse(localStorage.getItem(statsKey) || "null") || { runs: 0, saved: 0, perfect: 0, bestCombo: 1 }; } catch { return { runs: 0, saved: 0, perfect: 0, bestCombo: 1 }; } }
  function achievement(name) { let list = []; try { list = JSON.parse(localStorage.getItem(achievementsKey) || "[]"); } catch { list = []; } if (!list.includes(name)) list.push(name); localStorage.setItem(achievementsKey, JSON.stringify(list)); }
  function burst(x, y, color, amount = 16) { for (let i = 0; i < Math.min(amount, 18); i += 1) { const a = random(0, Math.PI * 2), force = random(20, 95); particles.push({ x, y, vx: Math.cos(a) * force, vy: Math.sin(a) * force, life: random(.25, .7), color, size: random(2, 4) }); } }
  function updateHud() {
    const plan = currentPlan();
    const percentage = levelSpawned ? Math.round((levelSaved / levelSpawned) * 100) : 0;
    $("swarm-score").textContent = format(score); $("swarm-saved").textContent = saved; $("swarm-combo").textContent = `x${combo}`; $("swarm-lost").textContent = lost;
    $("swarm-phase").textContent = `${levelIndex + 1}`; $("swarm-drops").textContent = `${levelSpawned} / ${plan.signals}`; $("swarm-goal").textContent = `${percentage}% / ${plan.goal}%`;
    $("swarm-speed-label").textContent = speedNames[speed]; $("swarm-power").textContent = skillNames[selectedAbility];
    Object.keys(charges).forEach((name) => { const node = $(`charges-${name}`); if (!node) return; node.textContent = charges[name]; node.closest(".signal-ability")?.classList.toggle("is-empty", charges[name] === 0); node.closest(".signal-ability")?.setAttribute("aria-label", `${skillNames[name]}, ${charges[name]} charges`); });
  }
  function resetRun() {
    running = false; paused = false; finished = false; elapsed = 0; levelElapsed = 0; levelIndex = 0; nextSpawn = 0;
    score = 0; saved = 0; lost = 0; combo = 1; bestCombo = 1; fastestRescue = null; speed = 0; levelSpawned = 0; levelSaved = 0; levelLost = 0;
    charges = chargesForLevel(); signals = []; particles = []; selectedSignalId = null; target = { x: 300, y: 430 }; viewOffset = { x: 0, y: 0 }; applyLevelLayout();
    $("signal-message").hidden = false; $("signal-message").innerHTML = "<strong>READY?</strong><span>Signals walk automatically. Assign a skill to one Signal, then shape the terrain and route the swarm to the gate.</span>";
    $("signal-collapse").classList.remove("show"); $("swarm-result").hidden = true; $("swarm-pause").hidden = true; $("swarm-restart").hidden = true; $("swarm-start").hidden = false; $("swarm-start").innerHTML = "Start run <span>&rarr;</span>";
    $("swarm-status").textContent = localStorage.getItem(bestKey) ? `Best score on this device: ${format(localStorage.getItem(bestKey))}.` : "Save the swarm, build the route, and beat your best."; updateHud();
  }
  function createSignal() {
    const roll = Math.random(); const type = roll < .2 ? "carrier" : roll < .44 ? "spark" : "runner"; const first = platforms[0];
    signals.push({ id: `${elapsed}-${Math.random()}`, alive: true, x: spawnPoint.x, y: spawnPoint.y, vx: type === "runner" ? 66 : type === "carrier" ? 42 : 54, vy: 20, direction: 1, type, state: "falling", platformId: null, fallStartY: spawnPoint.y, fallDistance: 0, phase: random(0, 7), spawnTime: elapsed, lastSafeX: spawnPoint.x, lastSafeY: first.y - SIGNAL_H, bridge: false, floater: false, bombAt: 0, buildSteps: 0, bridgeSteps: 0, mineSteps: 0, actionClock: 0, actionStarted: false, dangerCooldown: 0, wallId: null, skill: null });
  }
  function nearestSignal(point, maxDistance = 58) { return signals.filter((signal) => signal.alive && distance(signal, point) <= maxDistance).sort((a, b) => distance(a, point) - distance(b, point))[0]; }
  function setStatus(message) { $("swarm-status").textContent = message; }
  function beginFall(signal, x = signal.x, y = signal.y) { signal.x = clamp(x, 14, W - 14); signal.y = y; signal.platformId = null; signal.state = "falling"; signal.fallStartY = signal.y; signal.fallDistance = 0; signal.vy = Math.max(20, signal.vy || 20); }
  function turnSignal(signal, message) {
    signal.direction *= -1; signal.vx = Math.abs(signal.vx) * signal.direction; signal.x = clamp(signal.x + signal.direction * 8, 12, W - 12); signal.dangerCooldown = elapsed + .62; combo = 1; setStatus(message || "The Signal turned around."); burst(signal.x, signal.y, "#ff4f68", 12);
  }
  function wallAhead(signal, nextX) {
    const front = nextX + signal.direction * 7;
    return walls.find((wall) => Math.abs(wall.x - front) < 12 && signal.y + 5 < wall.y2 && signal.y + SIGNAL_H - 4 > wall.y1) || null;
  }
  function blockerAhead(signal, nextX) {
    return signals.find((other) => other !== signal && other.alive && other.state === "blocked" && Math.abs(other.y - signal.y) < 18 && ((signal.direction > 0 && other.x > signal.x && other.x <= nextX + 18) || (signal.direction < 0 && other.x < signal.x && other.x >= nextX - 18))) || null;
  }
  function releaseBlocker(signal) {
    if (!running || paused || !signal || !signal.alive || signal.state !== "blocked") return false;
    signal.state = "walking"; signal.skill = null; signal.actionStarted = false; signal.vx = Math.abs(signal.vx || 54) * signal.direction; selectedSignalId = signal.id; burst(signal.x, signal.y, "#ffb347", 14); setStatus("Blocker released. The Signal is moving again."); updateHud(); return true;
  }
  function assignSkill(name, point = target) {
    if (!running || paused) return;
    target = point; const signal = nearestSignal(point) || signals.find((item) => item.alive && item.id === selectedSignalId);
    if (!signal) { setStatus("Select an active Signal first."); return; }
    if (signal.state === "blocked") { releaseBlocker(signal); return; }
    if (!charges[name]) return;
    if (["bridge", "floater"].includes(name) && signal[name]) { setStatus(`${skillNames[name]} is already active on this Signal.`); return; }
    if (name === "blocker" && signal.state !== "walking") { setStatus("Blocker must be assigned to a walking Signal."); return; }
    if (["bridge", "builder", "basher", "miner", "digger"].includes(name) && signal.state !== "walking") { setStatus(`${skillNames[name]} needs a walking Signal on terrain.`); return; }
    if (name === "bomber" && signal.bombAt) { setStatus("This Signal is already armed."); return; }
    charges[name] -= 1; selectedSignalId = signal.id; signal.actionClock = 0; signal.actionStarted = true; signal.skill = name;
    if (name === "bridge") { signal.bridge = true; signal.state = "bridging"; signal.bridgeSteps = 0; setStatus("Bridge assigned. It is building a temporary route across the gap."); }
    if (name === "floater") { signal.floater = true; setStatus("Floater assigned. Long drops are now survivable."); }
    if (name === "bomber") { signal.bombAt = elapsed + 3; setStatus("Bomber armed. Detonation in 3 seconds."); }
    if (name === "blocker") { signal.state = "blocked"; signal.vx = 0; setStatus("Blocker placed. Click the blocked Signal to release it."); }
    if (name === "builder") { signal.state = "building"; signal.buildSteps = 0; setStatus("Builder started. It is laying a staircase across the route."); }
    if (name === "basher") { signal.state = "bashing"; setStatus("Basher started. It is cutting horizontally through the terrain."); }
    if (name === "miner") { signal.state = "mining"; signal.mineSteps = 0; setStatus("Miner started. It is cutting horizontally across the terrain."); }
    if (name === "digger") { signal.state = "digging"; setStatus("Digger started. It is opening a vertical shaft."); }
    burst(signal.x, signal.y, name === "bomber" ? "#ff4f68" : "#c6ff3d", 16); updateHud();
  }
  function updateFalling(signal, dt) {
    const previousBottom = signal.y + SIGNAL_H; const fallSpeed = signal.floater ? 115 : GRAVITY;
    signal.vy = Math.min(signal.vy + fallSpeed * dt, signal.floater ? 115 : 620); const nextY = signal.y + signal.vy * dt; const landing = landingAt(signal.x, previousBottom, nextY + SIGNAL_H);
    signal.y = nextY; signal.fallDistance = signal.y - signal.fallStartY;
    if (landing !== null) {
      if (signal.fallDistance > 160 && !signal.floater) { lose(signal, "The Signal fell too far."); return; }
      signal.y = landing - SIGNAL_H; signal.platformId = platformAt(signal)?.id || null; signal.state = "walking"; signal.vy = 0; signal.fallDistance = 0; signal.lastSafeX = signal.x; signal.lastSafeY = signal.y; return;
    }
    if (signal.y > H + 30) lose(signal, "The Signal fell out of the network.");
  }
  function updateBuilder(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .28) return; signal.actionClock = 0;
    const nextStepX = signal.x + signal.direction * 24;
    if (nextStepX <= 20 || nextStepX >= W - 20) { signal.state = "walking"; signal.skill = null; setStatus("Builder reached the board edge and stopped building."); return; }
    const stepX = nextStepX; const stepY = Math.max(34, signal.y - 10);
    addPlatform(stepX - 22, stepX + 22, stepY, true); signal.x = stepX; signal.y = stepY - SIGNAL_H; signal.platformId = platformAt(signal)?.id || null; signal.buildSteps += 1; burst(signal.x, signal.y + SIGNAL_H, "#55e8ff", 5);
    if (signal.buildSteps >= 4) { signal.state = "walking"; signal.skill = null; setStatus("Builder finished its short staircase. The route is open."); }
  }
  function updateBridge(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .22) return; signal.actionClock = 0;
    const bridgeX = signal.x + signal.direction * 24; const bridgeY = signal.y + SIGNAL_H;
    addPlatform(bridgeX - 24, bridgeX + 24, bridgeY, true); signal.x = clamp(bridgeX, 24, W - 24); signal.y = bridgeY - SIGNAL_H; signal.platformId = platformAt(signal)?.id || signal.platformId; signal.bridgeSteps += 1; burst(signal.x, signal.y + SIGNAL_H, "#55e8ff", 6);
    if (signal.bridgeSteps >= 6) { signal.state = "walking"; signal.skill = null; setStatus("Bridge finished. The temporary route is open."); }
  }
  function updateBasher(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .18) return; signal.actionClock = 0;
    const front = signal.x + signal.direction * 22; const blocked = wallAhead(signal, front);
    clearTerrainCircle(front, signal.y + 6, 18); clearTerrainRect(front - 12, signal.y - 4, front + 12, signal.y + SIGNAL_H + 8); burst(front, signal.y + 4, "#55e8ff", 5);
    if (blocked) walls = walls.filter((wall) => wall.id !== blocked.id);
    if (!blocked || signal.actionStarted === false) { signal.state = "walking"; signal.skill = null; setStatus("Basher finished. The tunnel is open."); } else signal.actionStarted = false;
  }
  function updateMiner(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .16) return; signal.actionClock = 0;
    const x = signal.x + signal.direction * 22; const y = signal.y + SIGNAL_H / 2; const wall = wallAhead(signal, x);
    clearTerrainCircle(x, y, 18); clearTerrainRect(x - 14, signal.y - 3, x + 14, signal.y + SIGNAL_H + 3); if (wall) walls = walls.filter((item) => item.id !== wall.id);
    signal.x = clamp(signal.x + signal.direction * 10, 18, W - 18); signal.mineSteps += 1; signal.actionStarted = false; burst(x, y, "#e7b35d", 5);
    if (signal.mineSteps >= 8 || (signal.mineSteps >= 3 && !wallAhead(signal, signal.x + signal.direction * 18))) { signal.state = "walking"; signal.skill = null; setStatus("Miner finished. The horizontal route is open."); }
  }
  function updateDigger(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .16) return; signal.actionClock = 0;
    clearTerrainCircle(signal.x, signal.y + SIGNAL_H + 16, 22); clearTerrainRect(signal.x - 12, signal.y + SIGNAL_H, signal.x + 12, signal.y + SIGNAL_H + 32); signal.actionStarted = false; burst(signal.x, signal.y + SIGNAL_H + 14, "#e7b35d", 5);
    if (!solidAt(signal.x, signal.y + SIGNAL_H + 4)) { beginFall(signal, signal.x, signal.y); setStatus("Digger opened a shaft. The Signal is falling."); }
  }
  function updateWalking(signal, dt) {
    const bottom = signal.y + SIGNAL_H; const currentSurface = surfaceAt(signal.x, bottom, 14);
    if (currentSurface === null || Math.abs(currentSurface - bottom) > 16) { beginFall(signal, signal.x, signal.y); return; }
    signal.y += currentSurface - bottom; signal.platformId = platformAt(signal)?.id || signal.platformId; signal.lastSafeX = signal.x; signal.lastSafeY = signal.y;
    if (signal.bombAt && elapsed >= signal.bombAt) { explode(signal); return; }
    const step = Math.abs(signal.vx) * speedFactors[speed] * dt; const nextX = signal.x + signal.direction * step;
    if (exit && Math.abs(signal.x - exit.x) < 18 && Math.abs(signal.y + SIGNAL_H - exit.y) < 16 && platformAt(signal)?.id === exit.platformId) { rescue(signal); return; }
    if (blockerAhead(signal, nextX)) { turnSignal(signal, "A Blocker turned the following Signal around."); return; }
    const wall = wallAhead(signal, nextX);
    if (wall) { turnSignal(signal, "A wall turned the Signal around. Use Basher to open it."); return; }
    const nextSurface = surfaceAt(nextX, bottom, 18);
    if (nextSurface === null || Math.abs(nextSurface - bottom) > 22) { beginFall(signal, nextX, signal.y); return; }
    signal.x = nextX; signal.y += nextSurface - (signal.y + SIGNAL_H); signal.platformId = platformAt(signal)?.id || signal.platformId;
  }
  function updateSignal(signal, dt) {
    if (!signal.alive) return; signal.phase += dt * 5;
    if (signal.bombAt && elapsed >= signal.bombAt && signal.state !== "falling") { explode(signal); return; }
    if (signal.state === "blocked") return;
    if (signal.state === "falling") updateFalling(signal, dt);
    else if (signal.state === "walking") updateWalking(signal, dt);
    else if (signal.state === "bridging") updateBridge(signal, dt);
    else if (signal.state === "building") updateBuilder(signal, dt);
    else if (signal.state === "bashing") updateBasher(signal, dt);
    else if (signal.state === "mining") updateMiner(signal, dt);
    else if (signal.state === "digging") updateDigger(signal, dt);
  }
  function explode(signal) { clearTerrainCircle(signal.x, signal.y + SIGNAL_H / 2, 48); burst(signal.x, signal.y, "#ff4f68", 28); lose(signal, "Bomber detonation removed the terrain."); }
  function lose(signal, reason) { if (!signal.alive) return; signal.alive = false; if (selectedSignalId === signal.id) selectedSignalId = null; lost += 1; levelLost += 1; combo = 1; score = Math.max(0, score - 25); burst(signal.x, signal.y, "#ff4f68", 18); setStatus(reason || "Signal lost. Combo broken."); }
  function rescue(signal) { if (!signal.alive) return; signal.alive = false; if (selectedSignalId === signal.id) selectedSignalId = null; saved += 1; levelSaved += 1; const base = signal.type === "carrier" ? 180 : signal.type === "spark" ? 110 : 75; combo = Math.min(10, combo + (signal.type === "carrier" ? 2 : 1)); bestCombo = Math.max(bestCombo, combo); const rescueTime = Math.max(0, elapsed - signal.spawnTime); fastestRescue = fastestRescue === null ? rescueTime : Math.min(fastestRescue, rescueTime); score += Math.round(base * combo * (1 + speed * .18)); setStatus(`${signal.type.toUpperCase()} rescued. Keep the chain alive.`); burst(signal.x, signal.y, "#c6ff3d", 20); }
  function resolveLevel() {
    const plan = currentPlan(); const percentage = levelSpawned ? Math.round((levelSaved / levelSpawned) * 100) : 0;
    if (percentage < plan.goal) { setStatus(`LEVEL ${levelIndex + 1} FAILED // ${percentage}% rescued. ${plan.goal}% is required.`); finishRun(); return; }
    levelIndex += 1; levelElapsed = 0; levelSpawned = 0; levelSaved = 0; levelLost = 0; signals = []; particles = []; nextSpawn = elapsed + .8; charges = chargesForLevel(); applyLevelLayout();
    setStatus(`LEVEL ${levelIndex + 1} // ${currentPlan().name}. Rescue at least ${currentPlan().goal}%.`); $("signal-message").hidden = false; $("signal-message").innerHTML = `<strong>LEVEL ${levelIndex + 1}</strong><span>${currentPlan().name} // Shape the terrain and guide the swarm.</span>`; window.setTimeout(() => { if (running && !finished) $("signal-message").hidden = true; }, 1200); burst(W / 2, H / 2, "#c6ff3d", 30); updateHud();
  }
  function update(dt) {
    if (!running || paused || finished) return; elapsed += dt; levelElapsed += dt; const plan = currentPlan();
    if (levelSpawned < plan.signals && elapsed >= nextSpawn) { createSignal(); levelSpawned += 1; nextSpawn = elapsed + plan.release / speedFactors[speed]; }
    signals.forEach((signal) => updateSignal(signal, dt)); signals = signals.filter((signal) => signal.alive);
    particles = particles.filter((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .96; particle.vy *= .96; particle.life -= dt; return particle.life > 0; }); updateHud();
    if (levelSpawned >= plan.signals && levelSaved + levelLost >= plan.signals) resolveLevel();
  }

  function drawHatch() {
    ctx.save(); ctx.translate(spawnPoint.x, spawnPoint.y); ctx.fillStyle = "#151b22"; ctx.strokeStyle = "#c6ff3d"; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = "#c6ff3d"; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, -18); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = "#20262d"; ctx.fillRect(-16, 0, 32, 20); ctx.strokeRect(-16, 0, 32, 20); ctx.fillStyle = "#c6ff3d"; ctx.fillRect(-6, 8, 12, 12); ctx.fillStyle = "#0b0f14"; ctx.fillRect(-3, 12, 2, 2); ctx.fillRect(2, 12, 2, 2); ctx.restore();
  }
  function drawGate() {
    if (!exit) return; ctx.save(); ctx.translate(exit.x, exit.y - 27); const pulse = 1 + Math.sin(elapsed * 4) * .08; ctx.scale(pulse, pulse); ctx.fillStyle = "rgba(198,255,61,.12)"; ctx.strokeStyle = "#c6ff3d"; ctx.shadowBlur = 22; ctx.shadowColor = "#c6ff3d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 27); ctx.lineTo(-17, -9); ctx.quadraticCurveTo(0, -28, 17, -9); ctx.lineTo(17, 27); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = "#c6ff3d"; ctx.fillRect(-2, -18, 4, 45); ctx.restore();
  }
  function drawSignal(signal) {
    const color = signal.type === "carrier" ? "#c6ff3d" : signal.type === "spark" ? "#e6f7a5" : "#b7f64d"; ctx.save(); ctx.translate(signal.x, signal.y); if (signal.id === selectedSignalId) { ctx.strokeStyle = "#f4f2ea"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 21 + Math.sin(signal.phase) * 2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = color; ctx.shadowBlur = 14; ctx.shadowColor = color; ctx.scale(signal.direction, 1); ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 0); ctx.lineTo(0, 12); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = "#172018"; ctx.fillRect(-5, -2, 2, 2); ctx.fillRect(3, -2, 2, 2);
    if (signal.state === "blocked") { ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 2; ctx.strokeRect(-17, -17, 34, 34); ctx.fillStyle = "#ffb347"; ctx.font = "700 7px Arial"; ctx.textAlign = "center"; ctx.fillText("BLOCK", 0, -22); }
    if (signal.bridge) { ctx.strokeStyle = "#55e8ff"; ctx.lineWidth = 2; ctx.strokeRect(-18, -18, 36, 36); }
    if (signal.floater && signal.state === "falling") { ctx.strokeStyle = "#f4f2ea"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (signal.bombAt) { ctx.fillStyle = "#ff4f68"; ctx.font = "700 10px Arial"; ctx.textAlign = "center"; ctx.fillText(Math.max(1, Math.ceil(signal.bombAt - elapsed)), 0, -21); }
    ctx.restore();
  }
  function drawTerrain() {
    for (let y = 0; y < TH; y += 1) for (let x = 0; x < TW; x += 1) { const material = terrain[index(x, y)]; if (!material) continue; ctx.fillStyle = material === 2 ? "#153641" : "#20262d"; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
    platforms.forEach((platform) => {
      const surfaceY = platform.y; ctx.strokeStyle = platform.built ? "#55e8ff" : "#59636f"; ctx.lineWidth = 1.5;
      let segmentStart = null;
      for (let x = Math.floor(platform.x1); x <= platform.x2 + TILE; x += TILE) {
        const solid = x <= platform.x2 && solidAt(x, surfaceY + 1);
        if (solid && segmentStart === null) segmentStart = x;
        if ((!solid || x > platform.x2) && segmentStart !== null) { ctx.beginPath(); ctx.moveTo(segmentStart, surfaceY + .5); ctx.lineTo(Math.min(x, platform.x2), surfaceY + .5); ctx.stroke(); segmentStart = null; }
      }
    });
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b0f14"; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.translate(viewOffset.x, viewOffset.y);
    ctx.strokeStyle = "rgba(244,242,234,.05)"; ctx.lineWidth = 1; for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    drawTerrain(); drawHatch(); drawGate(); walls.forEach((wall) => { ctx.fillStyle = "#1c2229"; ctx.strokeStyle = "#55e8ff"; ctx.shadowBlur = 10; ctx.shadowColor = "#55e8ff"; ctx.fillRect(wall.x - 7, wall.y1, 14, wall.y2 - wall.y1); ctx.strokeRect(wall.x - 7, wall.y1, 14, wall.y2 - wall.y1); ctx.shadowBlur = 0; });
    signals.forEach(drawSignal); particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life / .8); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1; ctx.fillStyle = "#646a74"; ctx.font = "700 10px Arial"; ctx.textAlign = "left"; ctx.fillText("SELECT A SIGNAL // ASSIGN A SKILL // SHAPE THE TERRAIN", 24, H - 24); ctx.restore();
  }

  function collapse() { const overlay = $("signal-collapse"); overlay.innerHTML = "<span>WARNING</span><small>SIGNAL UNSTABLE</small>"; overlay.classList.add("show"); window.setTimeout(() => { overlay.innerHTML = "<span>ROUTE COLLAPSED</span><small>CRITICAL</small>"; }, 260); window.setTimeout(() => { overlay.innerHTML = "<span>SIGNAL LOST</span>"; }, 550); }
  async function finishRun() {
    if (!running || finished) return; finished = true; running = false; paused = false; signals.filter((signal) => signal.alive).forEach((signal) => lose(signal, "The run ended before this Signal reached the goal."));
    const previousBest = Number(localStorage.getItem(bestKey) || 0); const newBest = score > previousBest; if (newBest) localStorage.setItem(bestKey, String(score)); const stats = localStats(); stats.runs += 1; stats.saved += saved; stats.bestCombo = Math.max(stats.bestCombo, bestCombo); if (lost === 0 && saved > 0) stats.perfect += 1; localStorage.setItem(statsKey, JSON.stringify(stats));
    if (saved) achievement("FIRST SIGNAL"); if (lost === 0 && saved) achievement("CLEAN RUN"); if (bestCombo >= 10) achievement("OVERCLOCKED"); if (previousBest > 0 && score >= previousBest * 1.25) achievement("GANK THE SCORE");
    lastRun = { score: Math.round(score), saved, lost, bestCombo, fastestRescueMs: fastestRescue === null ? 0 : Math.round(fastestRescue * 1000), highestPhase: levelIndex + 1, levelReached: levelIndex + 1, runSeconds: Math.round(elapsed), xpEarned: Math.min(250, Math.max(10, Math.round(score / 100))), achievements: JSON.parse(localStorage.getItem(achievementsKey) || "[]"), submitted: false };
    collapse(); window.setTimeout(() => showResult(newBest), 850);
  }
  function showResult(newBest) { $("signal-message").hidden = false; $("signal-message").innerHTML = "<strong>RUN ENDED</strong><span>Save the swarm. Shape a better route. Run it again.</span>"; $("swarm-start").hidden = false; $("swarm-start").innerHTML = "Run again <span>&rarr;</span>"; $("swarm-pause").hidden = true; $("swarm-restart").hidden = true; $("swarm-result").hidden = false; $("result-score").textContent = format(lastRun.score); $("result-saved").textContent = lastRun.saved; $("result-lost").textContent = lastRun.lost; $("result-combo").textContent = `x${lastRun.bestCombo}`; $("result-fastest").textContent = lastRun.fastestRescueMs ? `${(lastRun.fastestRescueMs / 1000).toFixed(2)}s` : "--"; $("result-level").textContent = `${lastRun.levelReached}`; $("result-mark").textContent = newBest ? "NEW RECORD" : "RUN ENDED"; $("result-record").textContent = newBest ? "New personal best. The network wants another run." : `Reached level ${lastRun.levelReached}. Shape a better route next run.`; $("swarm-status").textContent = newBest ? `New personal best: ${format(lastRun.score)}.` : `Best score on this device: ${format(Math.max(Number(localStorage.getItem(bestKey) || 0), lastRun.score))}.`; $("signal-collapse").classList.remove("show"); updateHud(); submitScore(); }
  async function loadLeaderboard() { const body = $("swarm-leaderboard-body"); if (!client) { body.innerHTML = '<tr><td colspan="5">Global scores need the XP backend connection.</td></tr>'; return; } const result = await client.from("signal_swarm_leaderboard").select("display_name,best_score,best_saved,best_combo").order("best_score", { ascending: false }).limit(500); if (result.error) { body.innerHTML = '<tr><td colspan="5">Run the Signal Swarm migration to enable global scores.</td></tr>'; return; } body.innerHTML = result.data?.length ? result.data.map((row, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>${format(row.best_score)}</td><td>${row.best_saved}</td><td>x${row.best_combo}</td></tr>`).join("") : '<tr><td colspan="5">No approved runs yet. Be the first to save the swarm.</td></tr>'; }
  async function submitScore() { if (!client || !user || !lastRun || lastRun.submitted) return; const result = await client.from("signal_swarm_scores").insert({ user_id: user.id, score: lastRun.score, signals_saved: lastRun.saved, signals_lost: lastRun.lost, best_combo: lastRun.bestCombo, fastest_rescue_ms: lastRun.fastestRescueMs, highest_phase: lastRun.highestPhase, run_seconds: lastRun.runSeconds, xp_earned: lastRun.xpEarned, achievements: lastRun.achievements, status: "approved" }); if (result.error) { $("swarm-auth-status").textContent = "Run complete, but the online score could not be saved."; return; } lastRun.submitted = true; $("swarm-auth-status").textContent = "Score posted. XP and profile history updated."; await loadLeaderboard(); }
  async function loadSession(session) { user = session?.user || null; if (!user) { $("swarm-auth-status").textContent = "Sign in with Discord to submit scores."; $("swarm-login").hidden = false; $("swarm-logout").hidden = true; return; } const name = user.user_metadata?.global_name || user.user_metadata?.full_name || "Discord player"; $("swarm-auth-status").textContent = `Signed in as ${name}. Completed runs save automatically.`; $("swarm-login").hidden = true; $("swarm-logout").hidden = false; await submitScore(); }
  async function initOnline() { if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) { $("swarm-login").disabled = true; $("swarm-auth-status").textContent = "Local play is ready. Online scores are unavailable."; return; } client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey); client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0)); const session = await client.auth.getSession(); await loadSession(session.data.session); await loadLeaderboard(); }
  function startRun() { resetRun(); running = true; $("signal-message").hidden = true; $("swarm-start").hidden = true; $("swarm-pause").hidden = false; $("swarm-restart").hidden = false; setStatus("Signals are dropping. Assign skills and shape the terrain."); canvas.focus(); }
  function chooseAbility(name) { if (!skillNames[name]) return; selectedAbility = name; document.querySelectorAll(".signal-ability").forEach((button) => button.classList.toggle("is-selected", button.dataset.ability === name)); setStatus(`${skillNames[name]} selected. Click one Signal to assign it.`); updateHud(); }
  function boardPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left) * W / rect.width - viewOffset.x, 0, W), y: clamp((event.clientY - rect.top) * H / rect.height - viewOffset.y, 0, H) }; }
  function frame(timestamp) { const dt = Math.min(.05, (timestamp - lastFrame) / 1000 || 0); lastFrame = timestamp; update(dt); draw(); window.requestAnimationFrame(frame); }

  document.querySelectorAll(".signal-ability").forEach((button) => { button.addEventListener("click", () => chooseAbility(button.dataset.ability)); button.addEventListener("pointerdown", () => { button.dataset.holdTimer = String(window.setTimeout(() => setStatus(`${skillNames[button.dataset.ability]} preview: click a Signal to assign this skill.`), 500)); }); button.addEventListener("pointerup", () => window.clearTimeout(Number(button.dataset.holdTimer || 0))); });
  canvas.addEventListener("pointerdown", (event) => { if (!running || paused) return; event.preventDefault(); pointerStart = { x: event.clientX, y: event.clientY, pointerType: event.pointerType }; pointerMoved = false; if (event.pointerType === "touch") canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener("pointermove", (event) => { if (!pointerStart || pointerStart.pointerType !== "touch" || !event.buttons) return; const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y; if (Math.hypot(dx, dy) < 7) return; pointerMoved = true; viewOffset.x = clamp(viewOffset.x + dx * W / canvas.clientWidth, -100, 100); viewOffset.y = clamp(viewOffset.y + dy * H / canvas.clientHeight, -55, 55); pointerStart = { x: event.clientX, y: event.clientY, pointerType: "touch" }; canvas.classList.add("dragging"); });
  canvas.addEventListener("pointerup", (event) => { if (!pointerStart) return; if (!pointerMoved) { target = boardPoint(event); const signal = nearestSignal(target); if (signal) { selectedSignalId = signal.id; assignSkill(selectedAbility, target); } else setStatus("Click directly on a Signal to assign the selected skill."); } pointerStart = null; pointerMoved = false; canvas.classList.remove("dragging"); });
  canvas.addEventListener("pointercancel", () => { pointerStart = null; pointerMoved = false; canvas.classList.remove("dragging"); });
  $("swarm-speed").addEventListener("input", (event) => { speed = Number(event.target.value); updateHud(); if (running) setStatus(`${speedNames[speed]} game speed selected.`); });
  $("swarm-start").addEventListener("click", startRun); $("swarm-run-again").addEventListener("click", startRun); $("swarm-restart").addEventListener("click", startRun); $("swarm-pause").addEventListener("click", () => { paused = !paused; $("swarm-pause").innerHTML = paused ? "Resume <span>&rarr;</span>" : "Pause <span>&#10074;&#10074;</span>"; setStatus(paused ? "Run paused." : "Run resumed."); }); $("swarm-help").addEventListener("click", () => $("swarm-help-dialog").showModal()); $("swarm-help-close").addEventListener("click", () => $("swarm-help-dialog").close()); $("swarm-help-dialog").addEventListener("click", (event) => { if (event.target === $("swarm-help-dialog")) $("swarm-help-dialog").close(); });
  $("swarm-login").addEventListener("click", async () => { if (client) await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.href.split("#")[0] } }); }); $("swarm-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  window.addEventListener("keydown", (event) => { const key = event.key.toLowerCase(); if (/^[1-8]$/.test(key)) { chooseAbility(skillKeys[Number(key) - 1]); return; } if (event.code === "Space") { event.preventDefault(); if (running && !paused) assignSkill(selectedAbility, target); } if (event.key === "Escape" && running) $("swarm-pause").click(); if (key === "r" && running) startRun(); });
  const keyboardGuide = $("swarm-help-dialog").querySelectorAll(".section-copy")[1]; if (keyboardGuide) keyboardGuide.innerHTML = "<strong>Keyboard:</strong> <kbd>1-8</kbd> select a skill, <kbd>Space</kbd> assigns it to the selected Signal, <kbd>Escape</kbd> pauses, and <kbd>R</kbd> restarts.";
  resetRun(); initOnline().catch(() => { $("swarm-auth-status").textContent = "Local play is ready. Online scores are unavailable."; }); window.requestAnimationFrame(frame);
})();
