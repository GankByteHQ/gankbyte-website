(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("signal-canvas");
  const ctx = canvas.getContext("2d");
  const config = window.GANKBYTE_XP_CONFIG || {};
  const W = canvas.width;
  const H = canvas.height;
  const gravity = 760;
  const signalHeight = 18;
  const terrainTile = 4;
  const terrainWidth = Math.ceil(W / terrainTile);
  const terrainHeight = Math.ceil(H / terrainTile);
  const skillKeys = ["climber", "floater", "bomber", "blocker", "builder", "basher", "miner", "digger"];
  const skillNames = {
    climber: "CLIMBER", floater: "FLOATER", bomber: "BOMBER", blocker: "BLOCKER",
    builder: "BUILDER", basher: "BASHER", miner: "MINER", digger: "DIGGER"
  };
  const speedNames = ["SAFE", "PUSH", "GANK", "OVERCLOCK"];
  const speedFactors = [0.72, 1, 1.28, 1.55];
  const levelPlans = [
    { name: "FIRST DROP", signals: 12, goal: 58, spawnEvery: 1.3, layout: 0 },
    { name: "THE CROSSING", signals: 14, goal: 62, spawnEvery: 1.15, layout: 1 },
    { name: "SPLIT SIGNAL", signals: 16, goal: 66, spawnEvery: 1.05, layout: 2 },
    { name: "THE DESCENT", signals: 18, goal: 68, spawnEvery: .98, layout: 3 },
    { name: "FAULT LINE", signals: 20, goal: 70, spawnEvery: .92, layout: 4 },
    { name: "OVERLOAD", signals: 21, goal: 72, spawnEvery: .88, layout: 5 },
    { name: "THE MAZE", signals: 22, goal: 75, spawnEvery: .84, layout: 6 },
    { name: "SYSTEM COLLAPSE", signals: 24, goal: 78, spawnEvery: .8, layout: 7 }
  ];
  const levelLayouts = [
    { hatch: { x: 100, y: 50 }, platforms: [{ x1: 50, x2: 440, y: 160, d: 1 }, { x1: 250, x2: 600, y: 225, d: -1 }, { x1: 80, x2: 480, y: 300, d: 1 }, { x1: 400, x2: 820, y: 375, d: -1 }, { x1: 200, x2: 900, y: 450, d: 1 }] },
    { hatch: { x: 820, y: 50 }, platforms: [{ x1: 650, x2: 920, y: 145, d: -1 }, { x1: 500, x2: 760, y: 205, d: 1 }, { x1: 810, x2: 920, y: 265, d: 1 }, { x1: 740, x2: 940, y: 325, d: -1 }, { x1: 300, x2: 780, y: 385, d: 1 }, { x1: 650, x2: 900, y: 420, d: -1 }, { x1: 120, x2: 700, y: 450, d: -1 }, { x1: 60, x2: 270, y: 525, d: 1 }] },
    { hatch: { x: 90, y: 50 }, platforms: [{ x1: 30, x2: 130, y: 140, d: 1 }, { x1: 190, x2: 600, y: 205, d: -1 }, { x1: 80, x2: 760, y: 275, d: 1 }, { x1: 240, x2: 900, y: 345, d: -1 }, { x1: 100, x2: 420, y: 410, d: 1 }, { x1: 360, x2: 900, y: 480, d: 1 }] },
    { hatch: { x: 500, y: 50 }, platforms: [{ x1: 360, x2: 880, y: 150, d: -1 }, { x1: 300, x2: 560, y: 205, d: 1 }, { x1: 600, x2: 800, y: 260, d: 1 }, { x1: 600, x2: 900, y: 320, d: -1 }, { x1: 400, x2: 760, y: 380, d: 1 }, { x1: 260, x2: 900, y: 435, d: -1 }, { x1: 180, x2: 760, y: 525, d: 1 }] },
    { hatch: { x: 540, y: 50 }, platforms: [{ x1: 430, x2: 850, y: 155, d: -1 }, { x1: 300, x2: 620, y: 215, d: -1 }, { x1: 100, x2: 490, y: 275, d: 1 }, { x1: 530, x2: 940, y: 335, d: -1 }, { x1: 420, x2: 700, y: 395, d: 1 }, { x1: 600, x2: 900, y: 445, d: 1 }] },
    { hatch: { x: 80, y: 50 }, platforms: [{ x1: 60, x2: 260, y: 145, d: 1 }, { x1: 310, x2: 680, y: 205, d: -1 }, { x1: 150, x2: 540, y: 265, d: 1 }, { x1: 580, x2: 900, y: 325, d: -1 }, { x1: 500, x2: 760, y: 385, d: 1 }, { x1: 300, x2: 790, y: 440, d: -1 }, { x1: 220, x2: 900, y: 490, d: 1 }] },
    { hatch: { x: 470, y: 50 }, platforms: [{ x1: 330, x2: 600, y: 130, d: 1 }, { x1: 640, x2: 760, y: 180, d: 1 }, { x1: 600, x2: 900, y: 230, d: -1 }, { x1: 400, x2: 650, y: 280, d: -1 }, { x1: 180, x2: 500, y: 330, d: 1 }, { x1: 540, x2: 710, y: 380, d: -1 }, { x1: 480, x2: 720, y: 425, d: 1 }, { x1: 680, x2: 900, y: 450, d: 1 }, { x1: 760, x2: 920, y: 525, d: -1 }] },
    { hatch: { x: 75, y: 50 }, platforms: [{ x1: 40, x2: 150, y: 150, d: 1 }, { x1: 200, x2: 520, y: 215, d: -1 }, { x1: 100, x2: 400, y: 280, d: 1 }, { x1: 360, x2: 940, y: 345, d: 1 }, { x1: 700, x2: 940, y: 405, d: -1 }, { x1: 500, x2: 830, y: 455, d: 1 }, { x1: 870, x2: 900, y: 500, d: -1 }, { x1: 600, x2: 890, y: 525, d: 1 }] }
  ];
  const wallPlans = [
    [{ x: 440, y1: 95, y2: 160 }],
    [{ x: 650, y1: 85, y2: 145 }, { x: 780, y1: 265, y2: 325 }],
    [{ x: 130, y1: 84, y2: 140 }, { x: 600, y1: 150, y2: 205 }],
    [{ x: 560, y1: 150, y2: 205 }, { x: 800, y1: 205, y2: 260 }],
    [{ x: 430, y1: 95, y2: 155 }, { x: 620, y1: 215, y2: 275 }],
    [{ x: 260, y1: 85, y2: 145 }, { x: 680, y1: 325, y2: 385 }],
    [{ x: 600, y1: 180, y2: 230 }, { x: 500, y1: 280, y2: 330 }],
    [{ x: 520, y1: 150, y2: 215 }, { x: 830, y1: 405, y2: 455 }]
  ];
  const glitchPlans = [
    [], [{ platform: 2, ratio: .55 }], [{ platform: 3, ratio: .35 }], [{ platform: 1, ratio: .65 }, { platform: 5, ratio: .45 }],
    [{ platform: 2, ratio: .5 }, { platform: 4, ratio: .7 }], [{ platform: 1, ratio: .45 }, { platform: 5, ratio: .55 }],
    [{ platform: 2, ratio: .55 }, { platform: 6, ratio: .35 }], [{ platform: 3, ratio: .52 }, { platform: 6, ratio: .6 }]
  ];
  const bestKey = "gankbyte-signal-swarm-best";
  const statsKey = "gankbyte-signal-swarm-stats";
  const achievementsKey = "gankbyte-signal-swarm-achievements";

  let platforms = [], walls = [], exits = [], spawnPoint = { x: 90, y: 50 }, terrain = new Uint8Array(terrainWidth * terrainHeight);
  let running = false, paused = false, finished = false, lastFrame = 0, elapsed = 0;
  let score = 0, saved = 0, lost = 0, combo = 1, bestCombo = 1, fastestRescue = null, speed = 0;
  let selectedAbility = "climber", charges = {}, signals = [], corruption = [], bridges = [], particles = [];
  let nextSpawn = 0, nextCorruption = 8, levelIndex = 0, levelElapsed = 0, levelSpawned = 0, levelSaved = 0, levelLost = 0;
  let target = { x: 300, y: 450 }, selectedSignalId = null, client = null, user = null, lastRun = null;
  let pointerStart = null, pointerMoved = false, viewOffset = { x: 0, y: 0 };

  const random = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const format = (value) => Number(value || 0).toLocaleString();
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));

  function terrainIndex(x, y) { return y * terrainWidth + x; }
  function terrainRect(x1, y1, x2, y2, value = 1) {
    const left = clamp(Math.floor(Math.min(x1, x2) / terrainTile), 0, terrainWidth - 1);
    const right = clamp(Math.ceil(Math.max(x1, x2) / terrainTile), 0, terrainWidth);
    const top = clamp(Math.floor(Math.min(y1, y2) / terrainTile), 0, terrainHeight - 1);
    const bottom = clamp(Math.ceil(Math.max(y1, y2) / terrainTile), 0, terrainHeight);
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) terrain[terrainIndex(x, y)] = value;
  }
  function rebuildTerrain() {
    terrain.fill(0);
    platforms.forEach((platform) => terrainRect(platform.x1, platform.y, platform.x2, platform.y + 13, platform.built ? 2 : 1));
    walls.forEach((wall) => terrainRect(wall.x - 7, wall.y1, wall.x + 7, wall.y2, 1));
  }
  function solidAt(x, y) {
    const gx = Math.floor(x / terrainTile), gy = Math.floor(y / terrainTile);
    return gx >= 0 && gx < terrainWidth && gy >= 0 && gy < terrainHeight && terrain[terrainIndex(gx, gy)] > 0;
  }

  function localStats() { try { return JSON.parse(localStorage.getItem(statsKey) || "null") || { runs: 0, saved: 0, perfect: 0, bestCombo: 1 }; } catch { return { runs: 0, saved: 0, perfect: 0, bestCombo: 1 }; } }
  function achievement(name) { let list = []; try { list = JSON.parse(localStorage.getItem(achievementsKey) || "[]"); } catch { list = []; } if (!list.includes(name)) list.push(name); localStorage.setItem(achievementsKey, JSON.stringify(list)); }
  function burst(x, y, color, amount = 16) { for (let i = 0; i < Math.min(amount, 16); i += 1) { const a = random(0, Math.PI * 2), force = random(20, 95); particles.push({ x, y, vx: Math.cos(a) * force, vy: Math.sin(a) * force, life: random(.25, .65), color, size: random(2, 4) }); } }
  function getLevelPlan() { if (levelIndex < levelPlans.length) return levelPlans[levelIndex]; const extra = levelIndex - levelPlans.length; return { name: `OVERCLOCK ${levelIndex + 1}`, signals: Math.min(30, 24 + extra * 2), goal: Math.min(92, 78 + extra * 2), spawnEvery: Math.max(.68, .8 - extra * .035), layout: levelIndex % levelLayouts.length }; }
  function chargesForLevel() {
    const extra = Math.min(3, Math.floor(levelIndex / 2));
    return { climber: 1 + extra, floater: 1 + extra, bomber: 1 + extra, blocker: 2 + extra, builder: 7 + extra * 2, basher: 1 + extra, miner: 1 + extra, digger: 1 + extra };
  }
  function applyLevelLayout() {
    const plan = getLevelPlan();
    const layout = levelLayouts[plan.layout % levelLayouts.length];
    platforms = layout.platforms.map((platform, index) => ({ ...platform, id: `platform-${index}`, built: false }));
    spawnPoint = { ...layout.hatch };
    walls = (wallPlans[plan.layout % wallPlans.length] || []).map((wall, index) => ({ ...wall, id: `wall-${index}` }));
    const last = platforms[platforms.length - 1];
    const direction = last.d > 0 ? 1 : -1;
    const gateX = direction > 0 ? last.x2 + 28 : last.x1 - 28;
    exits = [{ x: clamp(gateX, 20, W - 20), y: last.y, direction, platformId: last.id }];
    corruption = (glitchPlans[plan.layout % glitchPlans.length] || []).map((spot, index) => {
      const platform = platforms[spot.platform % platforms.length];
      return { id: `glitch-${index}`, x: platform.x1 + (platform.x2 - platform.x1) * spot.ratio, y: platform.y - signalHeight, platformId: platform.id, pulse: random(0, 7) };
    });
    rebuildTerrain();
  }
  function updateHud() {
    const currentLevel = getLevelPlan();
    const percentage = levelSpawned ? Math.round((levelSaved / levelSpawned) * 100) : 0;
    $("swarm-score").textContent = format(score); $("swarm-saved").textContent = saved; $("swarm-combo").textContent = `x${combo}`; $("swarm-lost").textContent = lost;
    $("swarm-phase").textContent = `${levelIndex + 1}`; $("swarm-drops").textContent = `${levelSpawned} / ${currentLevel.signals}`; $("swarm-goal").textContent = `${percentage}% / ${currentLevel.goal}%`;
    $("swarm-speed-label").textContent = speedNames[speed]; $("swarm-power").textContent = skillNames[selectedAbility];
    Object.keys(charges).forEach((name) => { const node = $(`charges-${name}`); if (!node) return; node.textContent = charges[name]; node.closest(".signal-ability")?.classList.toggle("is-empty", charges[name] === 0); node.closest(".signal-ability")?.setAttribute("aria-label", `${skillNames[name]}, ${charges[name]} charges`); });
  }
  function resetRun() {
    running = false; paused = false; finished = false; elapsed = 0; score = 0; saved = 0; lost = 0; combo = 1; bestCombo = 1; fastestRescue = null; speed = 0;
    levelIndex = 0; charges = chargesForLevel(); nextSpawn = 0; nextCorruption = 8; levelElapsed = 0; levelSpawned = 0; levelSaved = 0; levelLost = 0; target = { x: 300, y: 450 }; signals = []; bridges = []; particles = []; selectedSignalId = null; viewOffset = { x: 0, y: 0 }; applyLevelLayout();
    $("signal-message").hidden = false; $("signal-message").innerHTML = "<strong>READY?</strong><span>Signals walk automatically. Select a skill, click a Signal, and build the route before the network breaks.</span>"; $("signal-collapse").classList.remove("show"); $("swarm-result").hidden = true; $("swarm-pause").hidden = true; $("swarm-restart").hidden = true; $("swarm-start").hidden = false; $("swarm-start").innerHTML = "Start run <span>&rarr;</span>"; $("swarm-status").textContent = localStorage.getItem(bestKey) ? `Best score on this device: ${format(localStorage.getItem(bestKey))}.` : "Save the swarm, build the route, and beat your best."; updateHud();
  }
  function createSignal() {
    const roll = Math.random(); const type = roll < .2 ? "carrier" : roll < .44 ? "spark" : "runner"; const first = platforms[0];
    signals.push({ id: `${elapsed}-${Math.random()}`, alive: true, x: spawnPoint.x, y: spawnPoint.y + 30, vx: type === "runner" ? 64 : type === "carrier" ? 39 : 52, vy: 0, direction: first.d || 1, type, platformId: null, state: "falling", fallStartY: spawnPoint.y + 30, fallDistance: 0, phase: random(0, 7), spawnTime: elapsed, lastSafeX: spawnPoint.x, lastSafeY: first.y - signalHeight, climber: false, floater: false, bombAt: 0, blockerUntil: 0, buildSteps: 0, actionClock: 0, actionStarted: false, dangerCooldown: 0 });
  }
  function supportAt(x, bottom, platformId = null) {
    const candidates = platforms.filter((platform) => (!platformId || platform.id === platformId) && x >= platform.x1 && x <= platform.x2 && Math.abs(platform.y - bottom) < 18);
    return candidates[0] || null;
  }
  function landingAt(x, previousBottom, nextBottom) {
    return platforms.filter((platform) => x >= platform.x1 - 3 && x <= platform.x2 + 3 && platform.y >= previousBottom - 1 && platform.y <= nextBottom + 3).sort((a, b) => a.y - b.y)[0] || null;
  }
  function currentPlatform(signal) {
    const bottom = signal.y + signalHeight;
    const byId = platforms.find((platform) => platform.id === signal.platformId);
    if (byId && signal.x >= byId.x1 && signal.x <= byId.x2 && Math.abs(byId.y - bottom) < 18) return byId;
    return supportAt(signal.x, bottom);
  }
  function wallAhead(signal, nextX) { return walls.find((wall) => Math.abs(wall.x - nextX) < 10 && signal.y + signalHeight > wall.y1 - 18 && signal.y < wall.y2 + 8) || null; }
  function glitchAt(signal, nextX) { return corruption.find((glitch) => Math.abs(glitch.x - nextX) < 14 && Math.abs(glitch.y - signal.y) < 19) || null; }
  function blockerAhead(signal, nextX) { return signals.find((other) => other !== signal && other.alive && other.state === "blocked" && Math.abs(other.y - signal.y) < 15 && Math.abs(other.x - nextX) < 16) || null; }
  function turnSignal(signal, message) { signal.direction *= -1; signal.vx = Math.abs(signal.vx) * signal.direction; signal.x += signal.direction * 5; signal.dangerCooldown = elapsed + .65; combo = 1; $("swarm-status").textContent = message || "The route turned this Signal around."; burst(signal.x, signal.y, "#ff4f68", 12); }
  function splitPlatformAt(platform, x, radius = 22) {
    const index = platforms.indexOf(platform); if (index < 0) return;
    const left = { ...platform, id: `${platform.id}-a`, x2: x - radius }; const right = { ...platform, id: `${platform.id}-b`, x1: x + radius };
    platforms.splice(index, 1); if (left.x2 - left.x1 > 18) platforms.push(left); if (right.x2 - right.x1 > 18) platforms.push(right);
    rebuildTerrain();
  }
  function addPlatform(x1, x2, y, direction, built = true) { const platform = { id: `built-${elapsed}-${Math.random()}`, x1: Math.min(x1, x2), x2: Math.max(x1, x2), y, d: direction, built }; platforms.push(platform); rebuildTerrain(); return platform; }
  function removeWall(wall) { walls = walls.filter((item) => item !== wall); rebuildTerrain(); burst(wall.x, (wall.y1 + wall.y2) / 2, "#55e8ff", 20); }
  function nearestSignal(point, maxDistance = 55) { return signals.filter((signal) => signal.alive && distance(signal, point) <= maxDistance).sort((a, b) => distance(a, point) - distance(b, point))[0]; }
  function selectedSignal(point) { return nearestSignal(point, 68) || signals.find((signal) => signal.alive && signal.id === selectedSignalId); }
  function assignSkill(name, point = target) {
    if (!running || paused || !charges[name]) return;
    target = point; const signal = selectedSignal(point);
    if (!signal) { $("swarm-status").textContent = "Select an active Signal first."; return; }
    if (["climber", "floater"].includes(name) && signal[name]) { $("swarm-status").textContent = `${skillNames[name]} is already active on this Signal.`; return; }
    if (name === "blocker" && signal.state !== "walking") { $("swarm-status").textContent = "Blocker must be assigned to a Signal on a platform."; return; }
    if (["builder", "basher", "miner", "digger"].includes(name) && signal.state !== "walking") { $("swarm-status").textContent = `${skillNames[name]} needs a walking Signal on terrain.`; return; }
    if (name === "bomber" && signal.bombAt) { $("swarm-status").textContent = "This Signal is already counting down."; return; }
    charges[name] -= 1; selectedSignalId = signal.id; signal.actionClock = 0; signal.actionStarted = true;
    if (name === "climber") { signal.climber = true; $("swarm-status").textContent = "Climber assigned. It will climb the next vertical wall."; }
    if (name === "floater") { signal.floater = true; $("swarm-status").textContent = "Floater assigned. A long fall is now survivable."; }
    if (name === "bomber") { signal.bombAt = elapsed + 4.5; $("swarm-status").textContent = "Bomber armed. The countdown will remove terrain when it reaches zero."; }
    if (name === "blocker") { signal.state = "blocked"; signal.blockerUntil = elapsed + 7; signal.vx = 0; $("swarm-status").textContent = "Blocker active for about 7 seconds. Followers will turn around."; }
    if (name === "builder") { signal.state = "building"; signal.buildSteps = 0; $("swarm-status").textContent = "Builder started. It is laying a route one step at a time."; }
    if (name === "basher") { signal.state = "bashing"; $("swarm-status").textContent = "Basher started. It is breaking through the wall ahead."; }
    if (name === "miner") { signal.state = "mining"; $("swarm-status").textContent = "Miner started. It is cutting a diagonal tunnel."; }
    if (name === "digger") { signal.state = "digging"; $("swarm-status").textContent = "Digger started. It is removing the platform below."; }
    burst(signal.x, signal.y, name === "bomber" ? "#ff4f68" : "#c6ff3d", 16); updateHud();
  }
  function explode(signal) { const platform = currentPlatform(signal); if (platform) splitPlatformAt(platform, signal.x, 52); burst(signal.x, signal.y, "#ff4f68", 28); lose(signal, "Bomber detonation. The terrain was removed."); }
  function updateFalling(signal, dt) {
    const previousBottom = signal.y + signalHeight; const fallSpeed = signal.floater ? 115 : gravity;
    signal.vy = Math.min(signal.vy + fallSpeed * dt, signal.floater ? 115 : 620); const nextY = signal.y + signal.vy * dt; const landing = landingAt(signal.x, previousBottom, nextY + signalHeight);
    signal.y = nextY; signal.fallDistance = signal.y - signal.fallStartY;
    if (landing) { if (signal.fallDistance > 150 && !signal.floater) { lose(signal, "The drop was too far."); return; } signal.platformId = landing.id; signal.y = landing.y - signalHeight; signal.state = "walking"; signal.vy = 0; signal.fallDistance = 0; signal.lastSafeX = signal.x; signal.lastSafeY = signal.y; return; }
    if (signal.y > H + 30 || (signal.fallDistance > 190 && !signal.floater)) lose(signal, "Signal lost in the gap.");
  }
  function updateClimbing(signal, dt) {
    const wall = walls.find((item) => Math.abs(item.x - signal.x) < 16);
    if (!wall) { signal.state = "walking"; return; }
    signal.x = wall.x - signal.direction * 2; signal.y -= 58 * dt;
    if (signal.y <= wall.y1 - signalHeight) { signal.y = wall.y1 - signalHeight; signal.state = "walking"; const top = platforms.find((platform) => Math.abs(platform.y - wall.y1) < 14 && signal.x >= platform.x1 - 8 && signal.x <= platform.x2 + 8); if (top) signal.platformId = top.id; else { const ledge = addPlatform(wall.x - 48, wall.x + 48, wall.y1, signal.direction); signal.platformId = ledge.id; } burst(signal.x, signal.y, "#55e8ff", 12); }
  }
  function updateBuilder(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .3) return; signal.actionClock = 0;
    const stepX = signal.x + signal.direction * 28; const stepY = signal.y - 9; addPlatform(signal.x - (signal.direction < 0 ? 28 : 0), signal.x + (signal.direction > 0 ? 28 : 0), signal.y + signalHeight - 8, signal.direction);
    signal.x = clamp(stepX, 20, W - 20); signal.y = stepY; signal.buildSteps += 1; burst(signal.x, signal.y + signalHeight, "#55e8ff", 6);
    if (signal.buildSteps >= 7) { signal.state = "walking"; signal.platformId = supportAt(signal.x, signal.y + signalHeight)?.id || signal.platformId; $("swarm-status").textContent = "Builder finished its staircase. The stream can continue."; }
  }
  function updateBasher(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .28) return; signal.actionClock = 0;
    const wall = wallAhead(signal, signal.x + signal.direction * 15); if (wall) { removeWall(wall); signal.x += signal.direction * 18; return; }
    const platform = currentPlatform(signal); if (platform) { splitPlatformAt(platform, signal.x + signal.direction * 28, 18); signal.x += signal.direction * 14; }
    signal.state = "walking"; signal.platformId = currentPlatform(signal)?.id || signal.platformId; $("swarm-status").textContent = "Basher finished. The new route is open.";
  }
  function updateMiner(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .26) return; signal.actionClock = 0;
    const platform = currentPlatform(signal); if (platform) splitPlatformAt(platform, signal.x + signal.direction * 28, 20);
    signal.x += signal.direction * 13; signal.y += 9; signal.state = "falling"; signal.fallStartY = signal.y; signal.fallDistance = 0; signal.vy = 40; $("swarm-status").textContent = "Miner broke through. The Signal is dropping to the next route.";
  }
  function updateDigger(signal, dt) {
    signal.actionClock += dt; if (signal.actionClock < .24) return; signal.actionClock = 0;
    const platform = currentPlatform(signal); if (platform) splitPlatformAt(platform, signal.x, 24); signal.y += 9; signal.state = "falling"; signal.fallStartY = signal.y; signal.fallDistance = 0; signal.vy = 40; $("swarm-status").textContent = "Digger opened a shaft. The Signal is falling through it.";
  }
  function updateWalking(signal, dt) {
    const platform = currentPlatform(signal); if (!platform) { signal.platformId = null; signal.state = "falling"; signal.fallStartY = signal.y; signal.fallDistance = 0; signal.vy = 20; return; }
    signal.platformId = platform.id; signal.y = platform.y - signalHeight; signal.lastSafeX = signal.x; signal.lastSafeY = signal.y;
    if (signal.bombAt && elapsed >= signal.bombAt) { explode(signal); return; }
    const step = Math.abs(signal.vx) * speedFactors[speed] * dt; const nextX = signal.x + signal.direction * step; const exit = exits[0];
    const atExit = platform.id === exit.platformId && (exit.direction > 0 ? nextX >= platform.x2 - 3 : nextX <= platform.x1 + 3);
    if (atExit) { signal.x = nextX; rescue(signal); return; }
    const blocker = blockerAhead(signal, nextX); if (blocker) { turnSignal(signal, "A Blocker turned the following Signal around."); return; }
    const wall = wallAhead(signal, nextX); if (wall) { if (signal.climber) { signal.state = "climbing"; signal.actionClock = 0; $("swarm-status").textContent = "Climber engaged on the wall."; } else turnSignal(signal, "A wall turned the Signal around. Assign Climber to scale it."); return; }
    const glitch = signal.dangerCooldown <= elapsed ? glitchAt(signal, nextX) : null; if (glitch) { signal.dangerCooldown = elapsed + .75; turnSignal(signal, "Red glitch reversed the Signal."); return; }
    signal.x = nextX;
    if (nextX < platform.x1 || nextX > platform.x2) { signal.platformId = null; signal.state = "falling"; signal.fallStartY = signal.y; signal.fallDistance = 0; signal.vy = 20; }
  }
  function updateSignal(signal, dt) {
    if (!signal.alive) return; signal.phase += dt * 5;
    if (signal.bombAt && elapsed >= signal.bombAt && signal.state !== "falling") { explode(signal); return; }
    if (signal.state === "blocked") { if (elapsed >= signal.blockerUntil) { signal.state = "walking"; signal.vx = signal.type === "runner" ? 64 : signal.type === "carrier" ? 39 : 52; $("swarm-status").textContent = "Blocker expired. The Signal is walking again."; } return; }
    if (signal.state === "falling") updateFalling(signal, dt);
    else if (signal.state === "walking") updateWalking(signal, dt);
    else if (signal.state === "climbing") updateClimbing(signal, dt);
    else if (signal.state === "building") updateBuilder(signal, dt);
    else if (signal.state === "bashing") updateBasher(signal, dt);
    else if (signal.state === "mining") updateMiner(signal, dt);
    else if (signal.state === "digging") updateDigger(signal, dt);
  }
  function lose(signal, reason) { if (!signal.alive) return; signal.alive = false; if (selectedSignalId === signal.id) selectedSignalId = null; lost += 1; levelLost += 1; combo = 1; score = Math.max(0, score - 25); burst(signal.x, signal.y, "#ff4f68", 18); $("swarm-status").textContent = reason || "Signal lost. Combo broken."; }
  function rescue(signal) { if (!signal.alive) return; signal.alive = false; if (selectedSignalId === signal.id) selectedSignalId = null; saved += 1; levelSaved += 1; const base = signal.type === "carrier" ? 180 : signal.type === "spark" ? 110 : 75; combo = Math.min(10, combo + (signal.type === "carrier" ? 2 : 1)); bestCombo = Math.max(bestCombo, combo); const rescueTime = Math.max(0, elapsed - signal.spawnTime); fastestRescue = fastestRescue === null ? rescueTime : Math.min(fastestRescue, rescueTime); score += Math.round(base * combo * (1 + speed * .18)); $("swarm-status").textContent = `${signal.type.toUpperCase()} rescued. Keep the chain alive.`; burst(signal.x, signal.y, "#c6ff3d", 20); }
  function spawnCorruption() { const candidates = platforms.filter((platform) => platform.x2 - platform.x1 > 80 && !corruption.some((glitch) => glitch.platformId === platform.id)); if (!candidates.length || corruption.length >= Math.min(3, Math.floor(levelIndex / 2) + 1)) return; const platform = candidates[Math.floor(random(0, candidates.length))]; corruption.push({ id: `glitch-${elapsed}-${Math.random()}`, x: random(platform.x1 + 30, platform.x2 - 30), y: platform.y - signalHeight, platformId: platform.id, pulse: random(0, 7) }); }
  function resolveLevel() {
    const plan = getLevelPlan(); const rescuedPercent = levelSpawned ? Math.round((levelSaved / levelSpawned) * 100) : 0;
    if (rescuedPercent < plan.goal) { $("swarm-status").textContent = `LEVEL ${levelIndex + 1} FAILED // ${rescuedPercent}% rescued. ${plan.goal}% is required.`; finishRun(); return; }
    levelIndex += 1; levelElapsed = 0; levelSpawned = 0; levelSaved = 0; levelLost = 0; signals = []; bridges = []; particles = []; nextSpawn = elapsed + .8; nextCorruption = elapsed + getLevelPlan().spawnEvery * 7; charges = chargesForLevel(); applyLevelLayout();
    $("swarm-status").textContent = `LEVEL ${levelIndex + 1} // ${getLevelPlan().name}. Rescue at least ${getLevelPlan().goal}% to continue.`; $("signal-message").hidden = false; $("signal-message").innerHTML = `<strong>LEVEL ${levelIndex + 1}</strong><span>${getLevelPlan().name} // Build the route and rescue ${getLevelPlan().goal}%.</span>`; window.setTimeout(() => { if (running && !finished) $("signal-message").hidden = true; }, 1100); burst(W / 2, H / 2, "#c6ff3d", 30); updateHud();
  }
  function update(dt) {
    if (!running || paused || finished) return; elapsed += dt; levelElapsed += dt; const plan = getLevelPlan();
    if (levelSpawned < plan.signals && elapsed >= nextSpawn) { createSignal(); levelSpawned += 1; nextSpawn = elapsed + plan.spawnEvery / speedFactors[speed]; }
    if (levelElapsed >= 9 && elapsed >= nextCorruption) { spawnCorruption(); nextCorruption = elapsed + random(8, 13); }
    corruption.forEach((glitch) => { glitch.pulse += dt * 4; }); signals.forEach((signal) => updateSignal(signal, dt)); signals = signals.filter((signal) => signal.alive);
    particles = particles.filter((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .96; particle.vy *= .96; particle.life -= dt; return particle.life > 0; });
    updateHud(); if (levelSpawned >= plan.signals && levelSaved + levelLost >= plan.signals) resolveLevel();
  }
  function drawHatch() {
    ctx.save(); ctx.translate(spawnPoint.x, spawnPoint.y); ctx.fillStyle = "#151b22"; ctx.strokeStyle = "#c6ff3d"; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = "#c6ff3d"; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, -18); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = "#20262d"; ctx.fillRect(-16, 0, 32, 20); ctx.strokeRect(-16, 0, 32, 20); ctx.fillStyle = "#c6ff3d"; ctx.fillRect(-6, 8, 12, 12); ctx.fillStyle = "#0b0f14"; ctx.fillRect(-3, 12, 2, 2); ctx.fillRect(2, 12, 2, 2); ctx.fillStyle = "#8f949c"; ctx.font = "700 8px Arial"; ctx.textAlign = "center"; ctx.fillText("DROP", 0, 32); ctx.restore();
  }
  function drawGate(exit) {
    const finalPlatform = platforms.find((platform) => platform.id === exit.platformId); if (!finalPlatform) return; const x = exit.direction > 0 ? finalPlatform.x2 + 28 : finalPlatform.x1 - 28;
    ctx.save(); ctx.translate(x, finalPlatform.y - 27); const pulse = 1 + Math.sin(elapsed * 4) * .08; ctx.scale(pulse, pulse); ctx.fillStyle = "rgba(198,255,61,.12)"; ctx.strokeStyle = "#c6ff3d"; ctx.shadowBlur = 22; ctx.shadowColor = "#c6ff3d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 27); ctx.lineTo(-17, -9); ctx.quadraticCurveTo(0, -28, 17, -9); ctx.lineTo(17, 27); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = "#c6ff3d"; ctx.fillRect(-2, -18, 4, 45); ctx.fillStyle = "#0b0f14"; ctx.font = "700 8px Arial"; ctx.textAlign = "center"; ctx.fillText("GATE", 0, 4); ctx.restore();
  }
  function drawSignal(signal) {
    // Every Signal uses the same GankByte mark. Type differences affect scoring
    // and behaviour, not the game's visual language.
    const color = "#c6ff3d";
    ctx.save(); ctx.translate(signal.x, signal.y); if (signal.id === selectedSignalId) { ctx.strokeStyle = "#f4f2ea"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 21 + Math.sin(signal.phase) * 2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = color; ctx.shadowBlur = 14; ctx.shadowColor = color; ctx.scale(signal.direction, 1); ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0);
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    if (signal.state === "blocked") { ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 2; ctx.strokeRect(-17, -17, 34, 34); ctx.fillStyle = "#ffb347"; ctx.font = "700 7px Arial"; ctx.fillText("BLOCK", 0, -22); }
    if (signal.climber) { ctx.strokeStyle = "#55e8ff"; ctx.lineWidth = 2; ctx.strokeRect(-18, -18, 36, 36); }
    if (signal.floater) { ctx.strokeStyle = "#f4f2ea"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (signal.bombAt) { ctx.fillStyle = "#ff4f68"; ctx.font = "700 10px Arial"; ctx.fillText(Math.max(1, Math.ceil(signal.bombAt - elapsed)), 0, -21); }
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b0f14"; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.translate(viewOffset.x, viewOffset.y);
    ctx.strokeStyle = "rgba(244,242,234,.05)"; ctx.lineWidth = 1; for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    drawHatch(); platforms.forEach((platform) => { ctx.fillStyle = platform.built ? "#13303a" : "#20262d"; ctx.fillRect(platform.x1, platform.y, platform.x2 - platform.x1, 13); ctx.strokeStyle = platform.built ? "#55e8ff" : "#59636f"; ctx.lineWidth = 2; ctx.strokeRect(platform.x1, platform.y, platform.x2 - platform.x1, 13); });
    walls.forEach((wall) => { ctx.fillStyle = "#1c2229"; ctx.strokeStyle = "#55e8ff"; ctx.shadowBlur = 10; ctx.shadowColor = "#55e8ff"; ctx.fillRect(wall.x - 7, wall.y1, 14, wall.y2 - wall.y1); ctx.strokeRect(wall.x - 7, wall.y1, 14, wall.y2 - wall.y1); ctx.shadowBlur = 0; });
    bridges.forEach((bridge) => { ctx.fillStyle = "#55e8ff"; ctx.shadowBlur = 15; ctx.shadowColor = "#55e8ff"; ctx.fillRect(bridge.x1, bridge.y, bridge.x2 - bridge.x1, 8); ctx.shadowBlur = 0; });
    exits.forEach(drawGate); corruption.forEach((glitch) => { const pulse = 1 + Math.sin(glitch.pulse) * .15; ctx.save(); ctx.translate(glitch.x, glitch.y); ctx.scale(pulse, pulse); ctx.fillStyle = "rgba(255,79,104,.2)"; ctx.strokeStyle = "#ff4f68"; ctx.shadowBlur = 16; ctx.shadowColor = "#ff4f68"; ctx.lineWidth = 2; ctx.fillRect(-11, -11, 22, 22); ctx.strokeRect(-11, -11, 22, 22); ctx.shadowBlur = 0; ctx.fillStyle = "#ff4f68"; ctx.font = "700 8px Arial"; ctx.textAlign = "center"; ctx.fillText("TURN", 0, 3); ctx.restore(); });
    signals.forEach(drawSignal); particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life / .8); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1; ctx.fillStyle = "#646a74"; ctx.font = "700 10px Arial"; ctx.textAlign = "left"; ctx.fillText("SELECT A SIGNAL // ASSIGN A SKILL // BUILD THE ROUTE", 24, H - 24); ctx.restore();
  }
  function collapse() { const overlay = $("signal-collapse"); overlay.innerHTML = "<span>WARNING</span><small>SIGNAL UNSTABLE</small>"; overlay.classList.add("show"); window.setTimeout(() => { overlay.innerHTML = "<span>ROUTE COLLAPSED</span><small>CRITICAL</small>"; }, 260); window.setTimeout(() => { overlay.innerHTML = "<span>SIGNAL LOST</span>"; }, 550); }
  async function finishRun() {
    if (!running || finished) return; finished = true; running = false; paused = false; signals.filter((signal) => signal.alive).forEach((signal) => lose(signal, "The run ended before this Signal reached the gate.")); const previousBest = Number(localStorage.getItem(bestKey) || 0); const newBest = score > previousBest; if (newBest) localStorage.setItem(bestKey, String(score)); const stats = localStats(); stats.runs += 1; stats.saved += saved; stats.bestCombo = Math.max(stats.bestCombo, bestCombo); if (lost === 0 && saved > 0) stats.perfect += 1; localStorage.setItem(statsKey, JSON.stringify(stats)); if (saved) achievement("FIRST SIGNAL"); if (lost === 0 && saved) achievement("CLEAN RUN"); if (bestCombo >= 10) achievement("OVERCLOCKED"); if (previousBest > 0 && score >= previousBest * 1.25) achievement("GANK THE SCORE"); lastRun = { score: Math.round(score), saved, lost, bestCombo, fastestRescueMs: fastestRescue === null ? 0 : Math.round(fastestRescue * 1000), highestPhase: levelIndex + 1, levelReached: levelIndex + 1, runSeconds: Math.round(elapsed), xpEarned: Math.min(250, Math.max(10, Math.round(score / 100))), achievements: JSON.parse(localStorage.getItem(achievementsKey) || "[]"), submitted: false }; collapse(); window.setTimeout(() => showResult(newBest), 850);
  }
  function showResult(newBest) { $("signal-message").hidden = false; $("signal-message").innerHTML = "<strong>RUN ENDED</strong><span>Save the swarm. Build a better route. Run it again.</span>"; $("swarm-start").hidden = false; $("swarm-start").innerHTML = "Run again <span>&rarr;</span>"; $("swarm-pause").hidden = true; $("swarm-restart").hidden = true; $("swarm-result").hidden = false; $("result-score").textContent = format(lastRun.score); $("result-saved").textContent = lastRun.saved; $("result-lost").textContent = lastRun.lost; $("result-combo").textContent = `x${lastRun.bestCombo}`; $("result-fastest").textContent = lastRun.fastestRescueMs ? `${(lastRun.fastestRescueMs / 1000).toFixed(2)}s` : "--"; $("result-level").textContent = `${lastRun.levelReached}`; $("result-mark").textContent = newBest ? "NEW RECORD" : "RUN ENDED"; $("result-record").textContent = newBest ? "New personal best. The network wants another run." : `Reached level ${lastRun.levelReached}. Build a better route next run.`; $("swarm-status").textContent = newBest ? `New personal best: ${format(lastRun.score)}.` : `Best score on this device: ${format(Math.max(Number(localStorage.getItem(bestKey) || 0), lastRun.score))}.`; $("signal-collapse").classList.remove("show"); updateHud(); submitScore(); }
  async function loadLeaderboard() { const body = $("swarm-leaderboard-body"); if (!client) { body.innerHTML = '<tr><td colspan="5">Global scores need the XP backend connection.</td></tr>'; return; } const result = await client.from("signal_swarm_leaderboard").select("display_name,best_score,best_saved,best_combo").order("best_score", { ascending: false }).limit(25); if (result.error) { body.innerHTML = '<tr><td colspan="5">Run the Signal Swarm migration to enable global scores.</td></tr>'; return; } body.innerHTML = result.data?.length ? result.data.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>${format(row.best_score)}</td><td>${row.best_saved}</td><td>x${row.best_combo}</td></tr>`).join("") : '<tr><td colspan="5">No approved runs yet. Be the first to save the swarm.</td></tr>'; }
  async function submitScore() { if (!client || !user || !lastRun || lastRun.submitted) return; const result = await client.from("signal_swarm_scores").insert({ user_id: user.id, score: lastRun.score, signals_saved: lastRun.saved, signals_lost: lastRun.lost, best_combo: lastRun.bestCombo, fastest_rescue_ms: lastRun.fastestRescueMs, highest_phase: lastRun.highestPhase, run_seconds: lastRun.runSeconds, xp_earned: lastRun.xpEarned, achievements: lastRun.achievements, status: "approved" }); if (result.error) { $("swarm-auth-status").textContent = "Run complete, but the online score could not be saved."; return; } lastRun.submitted = true; $("swarm-auth-status").textContent = "Score posted. XP and profile history updated."; await loadLeaderboard(); const rank = await client.from("signal_swarm_leaderboard").select("id,best_score").order("best_score", { ascending: false }).limit(500); if (!rank.error && user) { const position = (rank.data || []).findIndex((row) => row.id === user.id); $("result-rank").textContent = position >= 0 ? `#${position + 1}` : "Saved"; } }
  async function loadSession(session) { user = session?.user || null; if (!user) { $("swarm-auth-status").textContent = "Sign in with Discord to submit scores."; $("swarm-login").hidden = false; $("swarm-logout").hidden = true; return; } const name = user.user_metadata?.global_name || user.user_metadata?.full_name || "Discord player"; $("swarm-auth-status").textContent = `Signed in as ${name}. Completed runs save automatically.`; $("swarm-login").hidden = true; $("swarm-logout").hidden = false; await submitScore(); }
  async function initOnline() { if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) { $("swarm-login").disabled = true; $("swarm-auth-status").textContent = "Local play is ready. Online scores are unavailable."; return; } client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey); client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0)); const session = await client.auth.getSession(); await loadSession(session.data.session); await loadLeaderboard(); }
  function startRun() { resetRun(); running = true; $("signal-message").hidden = true; $("swarm-start").hidden = true; $("swarm-pause").hidden = false; $("swarm-restart").hidden = false; $("swarm-status").textContent = "Signals are dropping. Assign skills to open a safe route."; canvas.focus(); }
  function chooseAbility(name) { if (!skillNames[name]) return; selectedAbility = name; document.querySelectorAll(".signal-ability").forEach((button) => button.classList.toggle("is-selected", button.dataset.ability === name)); $("swarm-status").textContent = `${skillNames[name]} selected. Click a Signal to assign it.`; updateHud(); }
  function boardPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left) * W / rect.width - viewOffset.x, 0, W), y: clamp((event.clientY - rect.top) * H / rect.height - viewOffset.y, 0, H) }; }
  function frame(timestamp) { const dt = Math.min(.05, (timestamp - lastFrame) / 1000 || 0); lastFrame = timestamp; update(dt); draw(); window.requestAnimationFrame(frame); }
  document.querySelectorAll(".signal-ability").forEach((button) => { button.addEventListener("click", () => chooseAbility(button.dataset.ability)); button.addEventListener("pointerdown", () => { button.dataset.holdTimer = String(window.setTimeout(() => { $("swarm-status").textContent = `${skillNames[button.dataset.ability]} preview: click a Signal to assign this skill.`; }, 500)); }); button.addEventListener("pointerup", () => window.clearTimeout(Number(button.dataset.holdTimer || 0))); });
  canvas.addEventListener("pointerdown", (event) => { if (!running || paused) return; event.preventDefault(); pointerStart = { x: event.clientX, y: event.clientY, pointerType: event.pointerType }; pointerMoved = false; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener("pointermove", (event) => { if (!pointerStart || pointerStart.pointerType !== "touch" || !event.buttons) return; const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y; if (Math.hypot(dx, dy) < 7) return; pointerMoved = true; viewOffset.x = clamp(viewOffset.x + dx * W / canvas.clientWidth, -100, 100); viewOffset.y = clamp(viewOffset.y + dy * H / canvas.clientHeight, -55, 55); pointerStart = { x: event.clientX, y: event.clientY, pointerType: "touch" }; canvas.classList.add("dragging"); });
  canvas.addEventListener("pointerup", (event) => { if (!pointerStart) return; if (!pointerMoved) { target = boardPoint(event); const signal = nearestSignal(target, 68); if (signal) { selectedSignalId = signal.id; assignSkill(selectedAbility, target); } else $("swarm-status").textContent = "Click directly on a Signal to assign the selected skill."; } pointerStart = null; pointerMoved = false; canvas.classList.remove("dragging"); });
  canvas.addEventListener("pointercancel", () => { pointerStart = null; pointerMoved = false; canvas.classList.remove("dragging"); });
  $("swarm-speed").addEventListener("input", (event) => { speed = Number(event.target.value); updateHud(); if (running) $("swarm-status").textContent = `${speedNames[speed]} game speed selected.`; });
  $("swarm-start").addEventListener("click", startRun); $("swarm-run-again").addEventListener("click", startRun); $("swarm-restart").addEventListener("click", startRun); $("swarm-pause").addEventListener("click", () => { paused = !paused; $("swarm-pause").innerHTML = paused ? "Resume <span>&rarr;</span>" : "Pause <span>&#10074;&#10074;</span>"; $("swarm-status").textContent = paused ? "Run paused." : "Run resumed."; }); $("swarm-help").addEventListener("click", () => $("swarm-help-dialog").showModal()); $("swarm-help-close").addEventListener("click", () => $("swarm-help-dialog").close()); $("swarm-help-dialog").addEventListener("click", (event) => { if (event.target === $("swarm-help-dialog")) $("swarm-help-dialog").close(); });
  $("swarm-login").addEventListener("click", async () => { if (client) await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.href.split("#")[0] } }); }); $("swarm-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  window.addEventListener("keydown", (event) => { const key = event.key.toLowerCase(); if (/^[1-8]$/.test(key)) { chooseAbility(skillKeys[Number(key) - 1]); return; } if (event.code === "Space") { event.preventDefault(); if (running && !paused) assignSkill(selectedAbility, target); } if (event.key === "Escape" && running) $("swarm-pause").click(); if (key === "r" && running) startRun(); });
  const keyboardGuide = $("swarm-help-dialog").querySelectorAll(".section-copy")[1]; if (keyboardGuide) keyboardGuide.innerHTML = "<strong>Keyboard:</strong> <kbd>1-8</kbd> select a skill, <kbd>Space</kbd> assigns it to the selected Signal, <kbd>Escape</kbd> pauses, and <kbd>R</kbd> restarts.";
  resetRun(); initOnline().catch(() => { $("swarm-auth-status").textContent = "Local play is ready. Online scores are unavailable."; }); window.requestAnimationFrame(frame);
})();
