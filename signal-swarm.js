(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("signal-canvas");
  const ctx = canvas.getContext("2d");
  const config = window.GANKBYTE_XP_CONFIG || {};
  const W = canvas.width;
  const H = canvas.height;
  const LANES = [118, 270, 422];
  const NODES = [120, 300, 480, 660, 840];
  const speedNames = ["SAFE", "PUSH", "GANK"];
  const speedFactors = [0.72, 1, 1.32];
  const speedMultipliers = [0.8, 1.15, 1.6];
  const abilityNames = { redirect: "REDIRECT", bridge: "BRIDGE", cleanse: "CLEANSE", pulse: "SIGNAL PULSE", recall: "EMERGENCY RECALL" };
  const abilityInitialCharges = { redirect: 5, bridge: 3, cleanse: 3, pulse: 2, recall: 1 };
  const bestKey = "gankbyte-signal-swarm-best";
  const statsKey = "gankbyte-signal-swarm-stats";
  const achievementsKey = "gankbyte-signal-swarm-achievements";

  let running = false;
  let paused = false;
  let finished = false;
  let lastTime = 0;
  let elapsed = 0;
  let score = 0;
  let saved = 0;
  let lost = 0;
  let combo = 1;
  let bestCombo = 1;
  let fastestRescue = null;
  let speed = 0;
  let selectedAbility = "redirect";
  let signals = [];
  let hazards = [];
  let corruption = [];
  let powerups = [];
  let bridges = [];
  let particles = [];
  let charges = { ...abilityInitialCharges };
  let redirectLane = 1;
  let redirectUntil = 0;
  let pulseUntil = 0;
  let freezeUntil = 0;
  let doubleUntil = 0;
  let safeRouteUntil = 0;
  let echoUntil = 0;
  let nextSpawn = 0;
  let nextHazard = 0;
  let nextCorruption = 2.5;
  let nextPowerup = 8;
  let activeTarget = { x: 300, y: 270 };
  let pointerStart = null;
  let pointerMoved = false;
  let viewOffset = { x: 0, y: 0 };
  let lastRun = null;
  let client = null;
  let user = null;

  const random = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const laneForY = (y) => LANES.reduce((best, lane, index) => Math.abs(LANES[best] - y) < Math.abs(lane - y) ? best : index, 0);
  const format = (value) => Number(value || 0).toLocaleString();
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));

  function updateHud() {
    $("swarm-score").textContent = format(score);
    $("swarm-saved").textContent = saved;
    $("swarm-time").textContent = Math.ceil(Math.max(0, 60 - elapsed));
    $("swarm-combo").textContent = `x${combo}`;
    $("swarm-lost").textContent = lost;
    $("swarm-phase").textContent = elapsed >= 45 ? "FINAL" : elapsed >= 30 ? "3" : elapsed >= 15 ? "2" : "1";
    $("swarm-speed-label").textContent = speedNames[speed];
    $("swarm-power").textContent = pulseUntil > elapsed ? "PULSE" : doubleUntil > elapsed ? "DOUBLE" : freezeUntil > elapsed ? "FREEZE" : safeRouteUntil > elapsed ? "SAFE ROUTE" : "NONE";
    Object.keys(charges).forEach((name) => {
      const node = $(`charges-${name}`);
      node.textContent = charges[name];
      node.closest(".signal-ability")?.classList.toggle("is-empty", charges[name] === 0);
      node.closest(".signal-ability")?.setAttribute("aria-label", `${abilityNames[name]}, ${charges[name]} charges`);
    });
  }

  function localStats() {
    try { return JSON.parse(localStorage.getItem(statsKey) || "null") || { runs: 0, saved: 0, perfect: 0, bestCombo: 1 }; } catch { return { runs: 0, saved: 0, perfect: 0, bestCombo: 1 }; }
  }

  function setAchievement(name) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(achievementsKey) || "[]"); } catch { list = []; }
    if (!list.includes(name)) list.push(name);
    localStorage.setItem(achievementsKey, JSON.stringify(list));
  }

  function addBurst(x, y, color, amount = 18) {
    for (let i = 0; i < amount; i += 1) {
      const angle = random(0, Math.PI * 2);
      const force = random(25, 150);
      particles.push({ x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, life: random(.3, .8), color, size: random(2, 5) });
    }
  }

  function resetRun() {
    running = false; paused = false; finished = false; elapsed = 0; score = 0; saved = 0; lost = 0; combo = 1; bestCombo = 1; fastestRescue = null;
    speed = 0; charges = { ...abilityInitialCharges }; redirectLane = 1; redirectUntil = 0; pulseUntil = 0; freezeUntil = 0; doubleUntil = 0; safeRouteUntil = 0; echoUntil = 0;
    nextSpawn = 0; nextHazard = 3; nextCorruption = 3; nextPowerup = 7; activeTarget = { x: 300, y: 270 }; viewOffset = { x: 0, y: 0 };
    signals = []; hazards = []; corruption = []; powerups = []; bridges = []; particles = [];
    $("signal-message").hidden = false;
    $("signal-message").innerHTML = "<strong>READY?</strong><span>Guide the Signals to the exits. Tap an ability, then tap the network.</span>";
    $("signal-collapse").classList.remove("show");
    $("swarm-result").hidden = true;
    $("swarm-pause").hidden = true;
    $("swarm-restart").hidden = true;
    $("swarm-start").hidden = false;
    $("swarm-start").innerHTML = "Start run <span>&rarr;</span>";
    $("swarm-speed").value = "0";
    $("swarm-status").textContent = localStorage.getItem(bestKey) ? `Best score on this device: ${format(localStorage.getItem(bestKey))}.` : "Save the swarm or push the score. Your best run is saved on this device.";
    updateHud();
  }

  function createSignal() {
    const roll = Math.random();
    const type = roll < .2 ? "carrier" : roll < .44 ? "spark" : "runner";
    signals.push({ id: `${elapsed}-${Math.random()}`, x: 45, lane: Math.floor(random(0, 3)), targetLane: 1, type, speed: type === "runner" ? 80 : type === "carrier" ? 48 : 62, lastSafeX: 45, lastNode: 0, alive: true, phase: random(0, 7), repaired: false });
  }

  function spawnHazard() {
    hazards.push({ x: random(250, 840), lane: Math.floor(random(0, 3)), direction: Math.random() > .5 ? 1 : -1, speed: random(55, 100), phase: random(0, 7), radius: random(13, 19) });
  }

  function spawnCorruption() {
    const lane = Math.floor(random(0, 3));
    corruption.push({ x: random(270, 820), lane, ttl: elapsed + random(12, 24), pulse: random(0, 7) });
  }

  function spawnPowerup() {
    const types = ["clean", "freeze", "double", "safe", "echo"];
    powerups.push({ x: random(250, 780), lane: Math.floor(random(0, 3)), type: types[Math.floor(random(0, types.length))], pulse: random(0, 7), ttl: elapsed + 15 });
  }

  function currentSpeedFactor() { return speedFactors[speed] * (pulseUntil > elapsed ? 1.35 : 1); }
  function currentScoreMultiplier() { return speedMultipliers[speed] * (pulseUntil > elapsed ? 1.25 : 1); }
  function nearestTarget(x, y) { const lane = laneForY(y); const node = NODES.reduce((best, value) => Math.abs(value - x) < Math.abs(best - x) ? value : best, NODES[0]); return { x: node, y: LANES[lane], lane }; }

  function abilityUse(name, target = activeTarget) {
    if (!running || paused || charges[name] <= 0) return;
    const location = nearestTarget(target.x, target.y);
    activeTarget = location;
    charges[name] -= 1;
    if (name === "redirect") {
      redirectLane = location.lane;
      redirectUntil = elapsed + 9;
      $("swarm-status").textContent = `Redirect armed for lane ${location.lane + 1}. The next Signals will follow it.`;
      addBurst(location.x, location.y, "#c6ff3d", 22);
    } else if (name === "bridge") {
      bridges.push({ x: location.x, lane: location.lane, ttl: elapsed + 8 });
      $("swarm-status").textContent = "Temporary bridge deployed. Get the next group across the gap.";
      addBurst(location.x, location.y, "#55e8ff", 24);
    } else if (name === "cleanse") {
      const before = corruption.length;
      corruption = corruption.filter((zone) => Math.hypot(zone.x - location.x, LANES[zone.lane] - location.y) > 155);
      $("swarm-status").textContent = before === corruption.length ? "No nearby corruption. Save Cleanse for the next spread." : `Cleanse removed ${before - corruption.length} corruption zone${before - corruption.length === 1 ? "" : "s"}.`;
      addBurst(location.x, location.y, "#c6ff3d", 30);
    } else if (name === "pulse") {
      pulseUntil = Math.max(pulseUntil, elapsed) + 6;
      $("swarm-status").textContent = "SIGNAL PULSE active. More speed, more score, less time to react.";
      addBurst(location.x, location.y, "#ffb347", 28);
    } else if (name === "recall") {
      let recalled = 0;
      signals.forEach((signal) => { if (signal.alive && Math.hypot(signal.x - location.x, LANES[signal.lane] - location.y) < 190) { signal.x = Math.max(45, signal.lastSafeX); signal.targetLane = signal.lane; recalled += 1; } });
      combo = 1;
      score = Math.max(0, score - 120);
      $("swarm-status").textContent = recalled ? `Emergency Recall returned ${recalled} Signals. Score penalty applied.` : "Emergency Recall fired, but no Signals were close enough.";
      addBurst(location.x, location.y, "#ff4f68", 30);
    }
    updateHud();
  }

  function loseSignal(signal, reason) {
    if (!signal.alive) return;
    signal.alive = false; lost += 1; combo = 1;
    score = Math.max(0, score - 30);
    addBurst(signal.x, LANES[signal.lane], "#ff4f68", 16);
    $("swarm-status").textContent = reason || "Signal lost. Combo broken.";
  }

  function rescueSignal(signal) {
    if (!signal.alive) return;
    signal.alive = false; saved += 1;
    const base = signal.type === "carrier" ? 180 : signal.type === "spark" ? 95 : 65;
    combo = Math.min(10, combo + (signal.type === "carrier" ? 2 : 1));
    bestCombo = Math.max(bestCombo, combo);
    const rescueTime = Math.max(0, elapsed - signal.spawnedAt);
    if (fastestRescue === null || rescueTime < fastestRescue) fastestRescue = rescueTime;
    const perfect = signal.type === "carrier" && combo >= 5;
    let gained = Math.round(base * combo * currentScoreMultiplier());
    if (doubleUntil > elapsed) gained *= 2;
    if (echoUntil > elapsed) gained += 75;
    if (perfect) { gained += 450; $("swarm-status").textContent = `PERFECT RESCUE // +${format(gained)} // COMBO x${combo}`; } else { $("swarm-status").textContent = `${signal.type.toUpperCase()} rescued // +${format(gained)} // COMBO x${combo}`; }
    score += gained;
    addBurst(900, LANES[signal.lane], signal.type === "carrier" ? "#ffb347" : "#c6ff3d", perfect ? 34 : 16);
  }

  function updateSignals(dt) {
    const factor = currentSpeedFactor();
    signals.forEach((signal) => {
      if (!signal.alive) return;
      const previousX = signal.x;
      const atNode = NODES.findIndex((node) => previousX < node && previousX + signal.speed * factor * dt >= node);
      if (atNode >= 0) {
        signal.lastSafeX = NODES[atNode] - 8; signal.lastNode = atNode;
        if (redirectUntil > elapsed) signal.targetLane = redirectLane;
        else if (Math.random() < .23) signal.targetLane = Math.floor(random(0, 3));
      }
      if (signal.lane !== signal.targetLane && signal.x > 100) {
        if (LANES[signal.lane] < LANES[signal.targetLane]) signal.y = (signal.y || LANES[signal.lane]) + 90 * dt;
        else signal.y = (signal.y || LANES[signal.lane]) - 90 * dt;
        if (Math.abs((signal.y || LANES[signal.lane]) - LANES[signal.targetLane]) < 7) { signal.lane = signal.targetLane; signal.y = LANES[signal.lane]; }
      } else signal.y = LANES[signal.lane];
      signal.x += signal.speed * factor * dt;
      signal.phase += dt * 5;
      if (signal.type === "spark" && !signal.repaired) {
        const zone = corruption.find((item) => item.lane === signal.lane && Math.abs(item.x - signal.x) < 42);
        if (zone) { zone.ttl = Math.min(zone.ttl, elapsed + 2); signal.repaired = true; addBurst(zone.x, LANES[zone.lane], "#55e8ff", 14); }
      }
      if (signal.x >= 892) { rescueSignal(signal); return; }
      const gap = signal.x > 405 && signal.x < 455 && signal.lane === 1;
      const hasBridge = bridges.some((bridge) => bridge.lane === signal.lane && Math.abs(bridge.x - 430) < 90 && bridge.ttl > elapsed);
      if (gap && !hasBridge) { loseSignal(signal, "A gap opened under the route. Bridge it before the next group arrives."); return; }
      const zone = corruption.find((item) => item.lane === signal.lane && Math.abs(item.x - signal.x) < 21);
      if (zone && !(safeRouteUntil > elapsed && signal.lane === redirectLane)) { loseSignal(signal, "Corruption reached the route. Cleanse the node or redirect the swarm."); return; }
      const hazard = hazards.find((item) => item.lane === signal.lane && Math.abs(item.x - signal.x) < item.radius + 12);
      if (hazard) { loseSignal(signal, "Moving hazard hit the route. Slow down or redirect at the next node."); }
      const power = powerups.find((item) => item.lane === signal.lane && Math.abs(item.x - signal.x) < 20);
      if (power) collectPowerup(power);
    });
    signals = signals.filter((signal) => signal.alive);
  }

  function collectPowerup(power) {
    powerups = powerups.filter((item) => item !== power);
    const x = power.x; const y = LANES[power.lane];
    if (power.type === "clean") { corruption = corruption.slice(Math.min(3, corruption.length)); $("swarm-status").textContent = "CLEAN SWEEP cleared the oldest corruption."; }
    if (power.type === "freeze") { freezeUntil = elapsed + 6; $("swarm-status").textContent = "TIME FREEZE stopped moving hazards."; }
    if (power.type === "double") { doubleUntil = elapsed + 8; $("swarm-status").textContent = "DOUBLE SIGNAL is active. Rescue points doubled."; }
    if (power.type === "safe") { safeRouteUntil = elapsed + 9; $("swarm-status").textContent = "SAFE ROUTE revealed the best lane temporarily."; }
    if (power.type === "echo") { echoUntil = elapsed + 8; $("swarm-status").textContent = "SWARM ECHO is active. Rescues carry bonus points."; }
    addBurst(x, y, "#55e8ff", 28);
  }

  function update(dt) {
    if (!running || paused || finished) return;
    elapsed += dt;
    const finalPressure = elapsed >= 45 ? 1.8 : elapsed >= 30 ? 1.35 : elapsed >= 15 ? 1.1 : 1;
    if (elapsed >= nextSpawn) { createSignal(); signals[signals.length - 1].spawnedAt = elapsed; nextSpawn = elapsed + Math.max(.55, 1.2 / finalPressure / (speed === 2 ? 1.15 : 1)); }
    if (elapsed >= nextHazard) { spawnHazard(); nextHazard = elapsed + Math.max(2, random(3.8, 6) / finalPressure); }
    if (elapsed >= nextCorruption) { spawnCorruption(); nextCorruption = elapsed + Math.max(1.7, random(3.8, 6) / finalPressure / (speed === 2 ? 1.25 : 1)); }
    if (elapsed >= nextPowerup) { spawnPowerup(); nextPowerup = elapsed + random(8, 12); }
    hazards.forEach((hazard) => { if (freezeUntil <= elapsed) { hazard.x += hazard.direction * hazard.speed * dt * (1 + elapsed / 100); if (hazard.x < 100 || hazard.x > 860) hazard.direction *= -1; } hazard.phase += dt * 3; });
    corruption = corruption.filter((zone) => { zone.pulse += dt * 4; return zone.ttl > elapsed; });
    bridges = bridges.filter((bridge) => bridge.ttl > elapsed);
    powerups = powerups.filter((power) => power.ttl > elapsed);
    updateSignals(dt);
    particles = particles.filter((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .96; particle.vy *= .96; particle.life -= dt; return particle.life > 0; });
    updateHud();
    if (elapsed >= 60) finishRun();
  }

  function drawPath(points, color, width = 3) { ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0c0f14"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(viewOffset.x, viewOffset.y);
    ctx.save();
    ctx.globalAlpha = .42;
    for (let lane = 0; lane < 3; lane += 1) drawPath([[45, LANES[lane]], [220, LANES[lane]], [360, LANES[(lane + 1) % 3]], [520, LANES[lane]], [690, LANES[(lane + 2) % 3]], [900, LANES[lane]]], lane === redirectLane && redirectUntil > elapsed ? "#c6ff3d" : "#343946", lane === redirectLane && redirectUntil > elapsed ? 6 : 3);
    ctx.restore();
    NODES.forEach((x, index) => { LANES.forEach((y, lane) => { ctx.fillStyle = index === 0 || index === NODES.length - 1 ? "#c6ff3d" : lane === redirectLane && redirectUntil > elapsed ? "#c6ff3d" : "#3a414c"; ctx.shadowBlur = lane === redirectLane && redirectUntil > elapsed ? 18 : 0; ctx.shadowColor = "#c6ff3d"; ctx.beginPath(); ctx.arc(x, y, index === 0 || index === NODES.length - 1 ? 8 : 5, 0, Math.PI * 2); ctx.fill(); }); });
    ctx.shadowBlur = 0; ctx.fillStyle = "#8e949e"; ctx.font = "700 10px Arial"; ctx.textAlign = "left"; ctx.fillText("SPAWN", 38, 31); ctx.textAlign = "right"; ctx.fillText("EXIT GATES", 920, 31);
    ctx.textAlign = "left"; ctx.fillStyle = "#646a74"; ctx.fillText("ROUTE NETWORK", 40, H - 22);
    bridges.forEach((bridge) => { ctx.strokeStyle = "#55e8ff"; ctx.shadowBlur = 20; ctx.shadowColor = "#55e8ff"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(400, LANES[bridge.lane]); ctx.lineTo(460, LANES[bridge.lane]); ctx.stroke(); ctx.shadowBlur = 0; });
    corruption.forEach((zone) => { const pulse = 1 + Math.sin(zone.pulse) * .15; ctx.save(); ctx.translate(zone.x, LANES[zone.lane]); ctx.scale(pulse, pulse); ctx.fillStyle = "rgba(255,79,104,.16)"; ctx.strokeStyle = "#ff4f68"; ctx.shadowBlur = 24; ctx.shadowColor = "#ff4f68"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(18, 0); ctx.lineTo(0, 20); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    hazards.forEach((hazard) => { ctx.save(); ctx.translate(hazard.x, LANES[hazard.lane]); ctx.rotate(hazard.phase); ctx.strokeStyle = "#ffb347"; ctx.fillStyle = "rgba(255,179,71,.15)"; ctx.shadowBlur = 22; ctx.shadowColor = "#ffb347"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -hazard.radius); ctx.lineTo(hazard.radius, 0); ctx.lineTo(0, hazard.radius); ctx.lineTo(-hazard.radius, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    powerups.forEach((power) => { const label = { clean: "C", freeze: "T", double: "2X", safe: "S", echo: "E" }[power.type]; ctx.save(); ctx.translate(power.x, LANES[power.lane]); ctx.fillStyle = "#55e8ff"; ctx.shadowBlur = 20; ctx.shadowColor = "#55e8ff"; ctx.fillRect(-12, -12, 24, 24); ctx.shadowBlur = 0; ctx.fillStyle = "#0a0b0f"; ctx.font = "700 9px Arial"; ctx.textAlign = "center"; ctx.fillText(label, 0, 3); ctx.restore(); });
    signals.forEach((signal) => { const y = signal.y || LANES[signal.lane]; const color = signal.type === "carrier" ? "#ffb347" : signal.type === "spark" ? "#55e8ff" : "#c6ff3d"; ctx.save(); ctx.translate(signal.x, y); ctx.rotate(Math.sin(signal.phase) * .15); ctx.fillStyle = color; ctx.shadowBlur = 18; ctx.shadowColor = color; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#0a0b0f"; ctx.shadowBlur = 0; ctx.font = "700 7px Arial"; ctx.textAlign = "center"; ctx.fillText(signal.type === "carrier" ? "C" : signal.type === "spark" ? "S" : "R", 0, 3); ctx.restore(); });
    particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life / .8); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1;
    if (safeRouteUntil > elapsed) { ctx.strokeStyle = "rgba(85,232,255,.7)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(50, LANES[redirectLane]); ctx.lineTo(900, LANES[redirectLane]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }

  function showCollapse() {
    const collapse = $("signal-collapse");
    collapse.innerHTML = "<span>WARNING</span><small>SIGNAL UNSTABLE</small>";
    collapse.classList.add("show");
    window.setTimeout(() => { collapse.innerHTML = "<span>CORRUPTION SPREADING</span><small>CRITICAL</small>"; }, 260);
    window.setTimeout(() => { collapse.innerHTML = "<span>SIGNAL LOST</span>"; }, 550);
  }

  async function finishRun() {
    if (!running || finished) return;
    finished = true; running = false; paused = false;
    signals.filter((signal) => signal.alive).forEach((signal) => loseSignal(signal, "The signal collapsed before this route reached an exit."));
    const totalSignals = saved + lost;
    const previousBest = Number(localStorage.getItem(bestKey) || 0);
    const newBest = score > previousBest;
    if (newBest) localStorage.setItem(bestKey, String(score));
    const stats = localStats(); stats.runs += 1; stats.saved += saved; stats.bestCombo = Math.max(stats.bestCombo, bestCombo); if (lost === 0 && totalSignals > 0) stats.perfect += 1; localStorage.setItem(statsKey, JSON.stringify(stats));
    if (saved > 0) setAchievement("FIRST SIGNAL");
    if (lost === 0 && totalSignals > 0) setAchievement("CLEAN RUN");
    if (bestCombo >= 10) setAchievement("OVERCLOCKED");
    if (previousBest > 0 && score >= previousBest * 1.25) setAchievement("GANK THE SCORE");
    lastRun = { score: Math.round(score), saved, lost, bestCombo, fastestRescueMs: fastestRescue === null ? 0 : Math.round(fastestRescue * 1000), highestPhase: 3, runSeconds: 60, xpEarned: Math.min(250, Math.max(10, Math.round(score / 100))), achievements: JSON.parse(localStorage.getItem(achievementsKey) || "[]"), submitted: false };
    showCollapse();
    window.setTimeout(() => showResult(newBest), 850);
  }

  function showResult(newBest) {
    $("signal-message").hidden = false; $("signal-message").innerHTML = "<strong>SIGNAL LOST</strong><span>Save the swarm. Gank the score. Run it again.</span>";
    $("swarm-start").hidden = false; $("swarm-start").innerHTML = "Run again <span>&rarr;</span>"; $("swarm-pause").hidden = true; $("swarm-restart").hidden = true;
    $("swarm-result").hidden = false; $("result-score").textContent = format(lastRun.score); $("result-saved").textContent = lastRun.saved; $("result-lost").textContent = lastRun.lost; $("result-combo").textContent = `x${lastRun.bestCombo}`; $("result-fastest").textContent = lastRun.fastestRescueMs ? `${(lastRun.fastestRescueMs / 1000).toFixed(2)}s` : "--"; $("result-mark").textContent = newBest ? "NEW RECORD" : "SIGNAL LOST"; $("result-record").textContent = newBest ? "New personal best. The network wants another run." : "The signal collapsed. Your best run is still beatable.";
    $("swarm-status").textContent = newBest ? `New personal best: ${format(lastRun.score)}.` : `Best score on this device: ${format(Math.max(Number(localStorage.getItem(bestKey) || 0), lastRun.score))}.`;
    $("signal-collapse").classList.remove("show"); updateHud(); submitScore();
  }

  async function loadLeaderboard() {
    const body = $("swarm-leaderboard-body");
    if (!client) { body.innerHTML = '<tr><td colspan="5">Global scores need the XP backend connection.</td></tr>'; return; }
    const result = await client.from("signal_swarm_leaderboard").select("display_name,best_score,best_saved,best_combo").order("best_score", { ascending: false }).limit(25);
    if (result.error) { body.innerHTML = '<tr><td colspan="5">Run the Signal Swarm migration to enable global scores.</td></tr>'; return; }
    body.innerHTML = result.data?.length ? result.data.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>${format(row.best_score)}</td><td>${row.best_saved}</td><td>x${row.best_combo}</td></tr>`).join("") : '<tr><td colspan="5">No approved runs yet. Be the first to save the swarm.</td></tr>';
  }

  async function submitScore() {
    if (!client || !user || !lastRun || lastRun.submitted) return;
    const result = await client.from("signal_swarm_scores").insert({ user_id: user.id, score: lastRun.score, signals_saved: lastRun.saved, signals_lost: lastRun.lost, best_combo: lastRun.bestCombo, fastest_rescue_ms: lastRun.fastestRescueMs, highest_phase: lastRun.highestPhase, run_seconds: lastRun.runSeconds, xp_earned: lastRun.xpEarned, achievements: lastRun.achievements, status: "approved" });
    if (result.error) { $("swarm-auth-status").textContent = "Run complete, but the online score could not be saved."; return; }
    lastRun.submitted = true; $("swarm-auth-status").textContent = "Score posted. XP and profile history updated."; await loadLeaderboard();
    const rank = await client.from("signal_swarm_leaderboard").select("id,best_score").order("best_score", { ascending: false }).limit(500);
    if (!rank.error && user) { const position = (rank.data || []).findIndex((row) => row.id === user.id); $("result-rank").textContent = position >= 0 ? `#${position + 1}` : "Saved"; }
  }

  async function loadSession(session) {
    user = session?.user || null;
    if (!user) { $("swarm-auth-status").textContent = "Sign in with Discord to submit scores."; $("swarm-login").hidden = false; $("swarm-logout").hidden = true; return; }
    const name = user.user_metadata?.global_name || user.user_metadata?.full_name || "Discord player";
    $("swarm-auth-status").textContent = `Signed in as ${name}. Completed runs save automatically.`; $("swarm-login").hidden = true; $("swarm-logout").hidden = false; await submitScore();
  }

  async function initOnline() {
    if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) { $("swarm-login").disabled = true; $("swarm-auth-status").textContent = "Local play is ready. Online scores are unavailable."; return; }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0));
    const session = await client.auth.getSession(); await loadSession(session.data.session); await loadLeaderboard();
  }

  function startRun() {
    resetRun(); running = true; $("signal-message").hidden = true; $("swarm-start").hidden = true; $("swarm-pause").hidden = false; $("swarm-restart").hidden = false; $("swarm-status").textContent = "Route the swarm. Save Signals. Push the speed when you are ready."; canvas.focus();
  }

  function chooseAbility(name) { selectedAbility = name; document.querySelectorAll(".signal-ability").forEach((button) => button.classList.toggle("is-selected", button.dataset.ability === name)); $("swarm-status").textContent = `${abilityNames[name]} selected. Tap a node on the network to use it.`; }
  function targetFromPointer(event) { const rect = canvas.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left) * W / rect.width - viewOffset.x, 0, W), y: clamp((event.clientY - rect.top) * H / rect.height - viewOffset.y, 0, H) }; }
  function animationFrame(timestamp) { const dt = Math.min(.05, (timestamp - lastTime) / 1000 || 0); lastTime = timestamp; update(dt); draw(); window.requestAnimationFrame(animationFrame); }

  document.querySelectorAll(".signal-ability").forEach((button) => { button.addEventListener("click", () => chooseAbility(button.dataset.ability)); button.addEventListener("pointerdown", () => { button.dataset.holdTimer = String(window.setTimeout(() => { $("swarm-status").textContent = `${abilityNames[button.dataset.ability]} preview: choose a node near the route you want to affect.`; }, 500)); }); button.addEventListener("pointerup", () => window.clearTimeout(Number(button.dataset.holdTimer || 0))); });
  canvas.addEventListener("pointerdown", (event) => { if (!running || paused) return; event.preventDefault(); pointerStart = { x: event.clientX, y: event.clientY }; pointerMoved = false; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener("pointermove", (event) => { if (!pointerStart || !event.buttons) return; const dx = event.clientX - pointerStart.x; const dy = event.clientY - pointerStart.y; if (Math.hypot(dx, dy) < 7) return; pointerMoved = true; viewOffset.x = clamp(viewOffset.x + dx * W / canvas.clientWidth, -110, 110); viewOffset.y = clamp(viewOffset.y + dy * H / canvas.clientHeight, -70, 70); pointerStart = { x: event.clientX, y: event.clientY }; canvas.classList.add("dragging"); });
  canvas.addEventListener("pointerup", (event) => { if (!pointerStart) return; if (!pointerMoved) { activeTarget = targetFromPointer(event); abilityUse(selectedAbility, activeTarget); } pointerStart = null; pointerMoved = false; canvas.classList.remove("dragging"); });
  canvas.addEventListener("pointercancel", () => { pointerStart = null; pointerMoved = false; canvas.classList.remove("dragging"); });
  $("swarm-speed").addEventListener("input", (event) => { speed = Number(event.target.value); updateHud(); if (running) $("swarm-status").textContent = `${speedNames[speed]} speed selected. ${speed === 2 ? "Corruption is spreading faster." : ""}`; });
  $("swarm-start").addEventListener("click", startRun); $("swarm-run-again").addEventListener("click", startRun); $("swarm-restart").addEventListener("click", startRun);
  $("swarm-pause").addEventListener("click", () => { paused = !paused; $("swarm-pause").innerHTML = paused ? "Resume <span>&rarr;</span>" : "Pause <span>&#10074;&#10074;</span>"; $("swarm-status").textContent = paused ? "Run paused." : "Run resumed."; });
  $("swarm-login").addEventListener("click", async () => { if (client) await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.href.split("#")[0] } }); });
  $("swarm-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  window.addEventListener("keydown", (event) => { const key = event.key.toLowerCase(); if (["1", "2", "3", "4", "5"].includes(key)) { chooseAbility(["redirect", "bridge", "cleanse", "pulse", "recall"][Number(key) - 1]); return; } if (event.code === "Space") { event.preventDefault(); if (running && !paused) abilityUse(selectedAbility, activeTarget); } if (event.key === "Escape" && running) $("swarm-pause").click(); if (key === "r" && running) startRun(); });

  resetRun(); initOnline().catch(() => { $("swarm-auth-status").textContent = "Local play is ready. Online scores are unavailable."; }); window.requestAnimationFrame(animationFrame);
})();
