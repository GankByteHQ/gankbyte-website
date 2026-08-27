(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canvas = $("ninja-canvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 430;
  const BEST_KEY = "gankbyte-null-ninja-best";
  const LAST_KEY = "gankbyte-null-ninja-last-played";
  let platforms = [];
  let hazards = [];
  let enemies = [];
  let pickups = [];
  let particles = [];
  let player;
  let camera = 0;
  let running = false;
  let paused = false;
  let ended = false;
  let lastFrame = 0;
  let spawnAt = 500;
  let bossSpawned = false;
  let score = 0;
  let distance = 0;
  let kills = 0;
  let combo = 0;
  let bestCombo = 0;
  let perfectKills = 0;
  let bosses = 0;
  let flowStates = 0;
  let flow = 0;
  let flowUntil = 0;
  let gankUntil = 0;
  let comboTimeout = 0;
  let client = null;
  let user = null;
  let pointerStart = null;

  function reset() {
    platforms = [
      { x: -100, y: 410, w: 1020, h: 28 }, { x: 970, y: 365, w: 220, h: 22 },
      { x: 1250, y: 310, w: 200, h: 22 }, { x: 1510, y: 390, w: 270, h: 22 },
      { x: 1840, y: 340, w: 210, h: 22 }, { x: 2120, y: 275, w: 235, h: 22 },
      { x: 2430, y: 385, w: 280, h: 22 }, { x: 2780, y: 330, w: 180, h: 22 },
      { x: 3030, y: 250, w: 250, h: 22 }, { x: 3350, y: 400, w: 340, h: 22 },
      // The Firewall boss spawns near the end of this platform. These landing
      // platforms keep the route playable after the boss instead of dropping
      // the player into empty space.
      { x: 3735, y: 350, w: 240, h: 22 }, { x: 4015, y: 300, w: 270, h: 22 },
      { x: 4325, y: 385, w: 320, h: 22 }
    ];
    hazards = [
      { x: 650, y: 382, w: 42, type: "spikes" }, { x: 1100, y: 337, w: 34, type: "spikes" },
      { x: 1590, y: 362, w: 82, type: "laser" }, { x: 2195, y: 247, w: 42, type: "spikes" },
      { x: 2490, y: 357, w: 36, type: "spikes" }, { x: 3150, y: 222, w: 70, type: "laser" }
    ];
    enemies = [];
    pickups = [];
    particles = [];
    player = { x: 90, y: 350, w: 22, h: 56, vx: 190, vy: 0, jumps: 0, lives: 3, grounded: false, facing: 1, attack: 0, attackKind: "punch", counter: 0, dash: 0, slide: 0, invuln: 0, shield: 0, wall: false };
    camera = 0; score = 0; distance = 0; kills = 0; combo = 0; bestCombo = 0; perfectKills = 0; bosses = 0; flowStates = 0; flow = 0; flowUntil = 0; gankUntil = 0; comboTimeout = 0; spawnAt = 500; bossSpawned = false;
    updateHud();
  }

  const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const currentLevel = () => 1 + Math.floor(distance / 900);
  const addFlow = (amount) => { flow = clamp(flow + amount, 0, 100); };
  const worldTime = () => performance.now();

  function ensureCourseAhead() {
    const target = player.x + 1800;
    let last = platforms[platforms.length - 1];
    const heightPattern = [-45, 35, 0, -60, 50, 0];
    while (last.x + last.w < target) {
      const index = platforms.length;
      const gap = 48 + (index % 3) * 18;
      const y = clamp(last.y + heightPattern[index % heightPattern.length], 260, 400);
      const width = 220 + (index % 4) * 35;
      last = { x: last.x + last.w + gap, y, w: width, h: 22 };
      platforms.push(last);
    }
  }

  function spawnEnemies() {
    while (spawnAt < player.x + 1250) {
      const level = currentLevel();
      const roll = Math.random();
      const boss = !bossSpawned && spawnAt > 3500;
      const type = boss ? "boss" : level > 5 && roll < .1 ? "heavy" : level > 3 && roll < .2 ? "shield" : roll < .35 ? "blade" : roll < .47 ? "flyer" : "drone";
      const platform = platforms.find((p) => spawnAt >= p.x && spawnAt <= p.x + p.w);
      enemies.push({ x: spawnAt, y: type === "flyer" ? 235 + Math.random() * 55 : type === "boss" ? 300 : (platform?.y || GROUND) - 38, w: type === "boss" ? 72 : type === "heavy" ? 34 : 26, h: type === "boss" ? 92 : type === "flyer" ? 26 : 38, type, boss, hp: type === "boss" ? 8 : type === "heavy" ? 2 : 1, vx: type === "flyer" ? -20 : type === "boss" ? -12 : -28, alive: true, born: worldTime() });
      if (boss) { bossSpawned = true; particles.push({ text: "FIREWALL", x: spawnAt, y: 250, life: 2, max: 2, color: "#ff526b" }); }
      if (Math.random() < .3) { const pickupRoll = Math.random(); const pickupType = pickupRoll < .42 ? "byte" : pickupRoll < .64 ? "flow" : pickupRoll < .82 ? "shield" : "gank"; pickups.push({ x: spawnAt + 55, y: 285, type: pickupType, w: 16, h: 16, taken: false }); }
      spawnAt += Math.max(260, 420 - level * 18);
    }
  }

  function start() {
    reset();
    running = true; paused = false; ended = false; lastFrame = worldTime();
    $("ninja-message").hidden = true; $("ninja-result").hidden = true; $("ninja-start").hidden = true; $("ninja-pause").hidden = false; $("ninja-restart").hidden = false;
    $("ninja-status").textContent = "Run, strike, and keep the chain alive.";
    canvas.focus(); draw();
  }

  function jump() {
    if (!running || paused || ended) return;
    if (player.grounded || player.jumps < 2 || player.wall) { player.vy = -470; player.grounded = false; player.jumps += 1; player.wall = false; addFlow(5); burst(player.x, player.y + player.h, "#55e8ff", 5); }
  }

  function attack(perfect = false, kind = "punch") {
    if (!running || paused || ended) return;
    player.attack = kind === "kick" ? .28 : .18;
    player.attackKind = kind;
    let hit = false;
    const reach = kind === "kick" ? 72 : 62;
    const blade = { x: player.x + (player.facing > 0 ? player.w : -reach), y: player.y + (kind === "kick" ? 27 : 10), w: reach, h: kind === "kick" ? 38 : 34 };
    enemies.forEach((enemy) => {
      if (!enemy.alive || !rectsOverlap(blade, enemy)) return;
      const isPerfect = perfect || Math.abs(enemy.x - player.x) < 58;
      enemy.hp -= 1;
      hit = true;
      if (enemy.hp <= 0) kill(enemy, isPerfect);
      else burst(enemy.x, enemy.y, "#ff9a5c", 7);
    });
    if (!hit) { combo = Math.max(0, combo - 1); addFlow(1); }
  }

  function counter() {
    if (!running || paused || ended) return;
    player.counter = .24;
    const target = enemies.find((enemy) => enemy.alive && Math.abs(enemy.x - player.x) < 72 && Math.abs(enemy.y - player.y) < 48);
    if (target) { target.hp = 1; kill(target, true); score += 250; $("ninja-status").textContent = "PERFECT COUNTER"; }
    addFlow(8);
  }

  function dash() {
    if (!running || paused || ended || player.dash > 0) return;
    player.dash = .28; player.invuln = .32; player.vx = 560 * player.facing; addFlow(6); burst(player.x, player.y + 25, "#b889ff", 12);
    enemies.forEach((enemy) => { if (enemy.alive && Math.abs(enemy.x - player.x) < 75 && Math.abs(enemy.y - player.y) < 55) kill(enemy, true); });
  }

  function kill(enemy, perfect) {
    enemy.alive = false; kills += 1; if (enemy.boss) { bosses += 1; score += 3000; $("ninja-status").textContent = "FIREWALL DOWN"; } combo = comboTimeout > worldTime() ? combo + 1 : 1; comboTimeout = worldTime() + 2400; bestCombo = Math.max(bestCombo, combo); perfectKills += perfect ? 1 : 0;
    const multiplier = Math.min(10, Math.max(1, Math.floor(combo / 2) + 1));
    const bonus = enemy.boss ? 5000 : perfect ? 300 : enemy.type === "heavy" ? 220 : enemy.type === "shield" ? 180 : 100;
    const riskMultiplier = gankUntil > worldTime() ? 2 : 1;
    score += (bonus * multiplier + Math.max(0, Math.floor(distance / 20))) * riskMultiplier;
    addFlow(perfect ? 18 : 9);
    burst(enemy.x, enemy.y, perfect ? "#c6ff3d" : "#ff526b", perfect ? 18 : 10);
    particles.push({ text: perfect ? "PERFECT" : `+${bonus * multiplier}`, x: enemy.x, y: enemy.y - 12, life: 1, max: 1, color: perfect ? "#c6ff3d" : "#ffffff" });
    if (combo >= 10) { gankUntil = worldTime() + 7000; $("ninja-status").textContent = "GANK MODE"; }
  }

  function activateFlow() {
    if (!running || paused || ended || flow < 100) return;
    flow = 0; flowUntil = worldTime() + 6500; flowStates += 1; score += 500; $("ninja-status").textContent = "FLOW STATE"; burst(player.x, player.y, "#55e8ff", 22);
  }

  function hurt() {
    if (player.invuln > 0) return;
    if (player.shield > 0) { player.shield = 0; player.invuln = 1.1; $("ninja-status").textContent = "SHIELD BROKEN"; burst(player.x, player.y, "#55e8ff", 18); return; }
    player.lives -= 1; player.invuln = 1.1; combo = 0; gankUntil = 0; score = Math.max(0, score - 100); $("ninja-status").textContent = player.lives ? "Hit. Keep moving." : "NULL DOWN"; burst(player.x, player.y, "#ff526b", 18);
    if (!player.lives || player.y > H + 80) finish("NULL DOWN");
  }

  function update(dt, now) {
    if (!running || paused || ended) return;
    ensureCourseAhead();
    const flowActive = flowUntil > now;
    const gankActive = gankUntil > now;
    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");
    if (left) { player.vx = Math.max(125, player.vx - 800 * dt); player.facing = -1; }
    else if (right) { player.vx = Math.min(300 + currentLevel() * 12, player.vx + 800 * dt); player.facing = 1; }
    else if (player.dash <= 0) player.vx += (190 + currentLevel() * 5 - player.vx) * Math.min(1, dt * 3);
    if (keys.has("arrowdown") || keys.has("s")) player.slide = Math.max(player.slide, .05);
    player.dash = Math.max(0, player.dash - dt); player.attack = Math.max(0, player.attack - dt); player.counter = Math.max(0, player.counter - dt); player.slide = Math.max(0, player.slide - dt); player.invuln = Math.max(0, player.invuln - dt);
    if (flowActive) player.vx = Math.max(player.vx, 255);
    if (gankActive) player.vx = Math.max(player.vx, 280);
    player.vy += 1100 * dt; const oldBottom = player.y + player.h; player.x += player.vx * dt; player.y += player.vy * dt; player.grounded = false; player.wall = false;
    const body = { x: player.x, y: player.y, w: player.w, h: player.slide > 0 ? 34 : player.h };
    platforms.forEach((platform) => {
      if (player.vy >= 0 && oldBottom <= platform.y + 8 && player.y + body.h >= platform.y && player.x + player.w > platform.x + 4 && player.x < platform.x + platform.w - 4) { player.y = platform.y - body.h; player.vy = 0; player.grounded = true; player.jumps = 0; }
      if (!player.grounded && Math.abs(player.x + player.w - platform.x) < 8 && player.y + player.h > platform.y + 10) player.wall = true;
    });
    if (player.grounded && player.slide <= 0) player.y = player.y;
    enemies.forEach((enemy) => { if (!enemy.alive) return; enemy.x += enemy.vx * dt; if (enemy.type === "flyer") enemy.y += Math.sin((now - enemy.born) / 260) * dt * 18; if (rectsOverlap(body, enemy)) { if (player.attack > 0 || player.counter > 0) kill(enemy, player.counter > 0); else hurt(); } });
    hazards.forEach((hazard) => { const hitbox = { x: hazard.x, y: hazard.y, w: hazard.w, h: hazard.type === "laser" ? 16 : 30 }; if (rectsOverlap(body, hitbox) && player.slide <= 0) hurt(); });
    pickups.forEach((pickup) => { if (!pickup.taken && rectsOverlap(body, pickup)) { pickup.taken = true; if (pickup.type === "byte") score += 25; else if (pickup.type === "flow") addFlow(16); else if (pickup.type === "shield") player.shield = 1; else if (pickup.type === "gank") gankUntil = now + 6000; burst(pickup.x, pickup.y, pickup.type === "byte" || pickup.type === "gank" ? "#c6ff3d" : "#55e8ff", 8); } });
    if (player.y > H + 80) hurt();
    spawnEnemies();
    distance = Math.max(distance, Math.floor(player.x / 10));
    if (combo && comboTimeout < now) combo = 0;
    camera = Math.max(0, player.x - 210);
    particles.forEach((particle) => { particle.life -= dt; particle.y -= dt * 22; }); particles = particles.filter((particle) => particle.life > 0);
    updateHud();
  }

  function burst(x, y, color, amount) { for (let i = 0; i < amount; i += 1) particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .5) * 180, life: .5 + Math.random() * .5, max: 1, color }); }

  function draw() {
    const now = worldTime();
    ctx.fillStyle = "#080b10"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(154,123,255,.07)"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(244,242,234,.06)"; ctx.lineWidth = 1;
    for (let x = -((camera * .25) % 40); x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 30; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.save(); ctx.translate(-camera, 0);
    platforms.forEach((platform) => { ctx.fillStyle = "#171d26"; ctx.fillRect(platform.x, platform.y, platform.w, platform.h); ctx.strokeStyle = "#4b5968"; ctx.strokeRect(platform.x, platform.y, platform.w, platform.h); ctx.fillStyle = "rgba(198,255,61,.2)"; ctx.fillRect(platform.x, platform.y, platform.w, 2); });
    hazards.forEach((hazard) => { ctx.fillStyle = hazard.type === "laser" ? "#ff526b" : "#ff526b"; if (hazard.type === "laser") { ctx.shadowColor = "#ff526b"; ctx.shadowBlur = 14; ctx.fillRect(hazard.x, hazard.y, hazard.w, 5); ctx.shadowBlur = 0; } else { for (let x = hazard.x; x < hazard.x + hazard.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, hazard.y + 30); ctx.lineTo(x + 7, hazard.y); ctx.lineTo(x + 14, hazard.y + 30); ctx.fill(); } } });
     pickups.forEach((pickup) => { if (pickup.taken) return; ctx.fillStyle = pickup.type === "byte" || pickup.type === "gank" ? "#c6ff3d" : "#55e8ff"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.beginPath(); if (pickup.type === "shield") { ctx.arc(pickup.x, pickup.y, 8, Math.PI, 0); ctx.lineTo(pickup.x + 8, pickup.y + 6); ctx.lineTo(pickup.x, pickup.y + 11); ctx.lineTo(pickup.x - 8, pickup.y + 6); } else { ctx.arc(pickup.x, pickup.y, 8, 0, Math.PI * 2); } ctx.fill(); ctx.shadowBlur = 0; });
    enemies.forEach((enemy) => { if (!enemy.alive) return; drawEnemy(enemy); });
    drawPlayer();
    particles.forEach((particle) => { if (particle.text) { ctx.globalAlpha = particle.life; ctx.fillStyle = particle.color; ctx.font = "800 16px Arial"; ctx.textAlign = "center"; ctx.fillText(particle.text, particle.x, particle.y); ctx.globalAlpha = 1; } else { ctx.globalAlpha = particle.life; ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 4, 4); ctx.globalAlpha = 1; } });
    ctx.restore();
    ctx.fillStyle = "#c6ff3d"; ctx.font = "700 11px Arial"; ctx.textAlign = "left"; ctx.fillText(`SECTION ${currentLevel()} // NETWORK RUN`, 18, 24);
    if (flowUntil > now) { ctx.fillStyle = "#55e8ff"; ctx.textAlign = "right"; ctx.fillText("FLOW STATE", W - 18, 24); }
    if (gankUntil > now) { ctx.fillStyle = "#c6ff3d"; ctx.textAlign = "center"; ctx.font = "800 24px Arial"; ctx.fillText("GANK MODE", W / 2, 54); }
    if (paused && running) { ctx.fillStyle = "rgba(5,7,10,.74)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#c6ff3d"; ctx.font = "800 38px Arial"; ctx.textAlign = "center"; ctx.fillText("PAUSED", W / 2, H / 2); }
  }

  function drawPlayer() {
    const x = player.x + 11; const y = player.y; const facing = player.facing || 1; const bodyH = player.slide > 0 ? 34 : player.h;
    const glow = player.invuln > 0 ? "#ffffff" : flowUntil > worldTime() ? "#55e8ff" : gankUntil > worldTime() ? "#c6ff3d" : "#f4f2ea";
    const progress = player.attack > 0 ? 1 - player.attack / (player.attackKind === "kick" ? .28 : .18) : 0;
    const attackPhase = Math.sin(clamp(progress, 0, 1) * Math.PI);
    const gait = Math.abs(player.vx) > 210 && player.grounded && player.attack <= 0 && player.slide <= 0 ? Math.sin(worldTime() / 80) : 0;
    const point = (px, py) => ({ x: x + px * facing, y: y + py });
    const limb = (from, elbow, to, width = 5) => { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(elbow.x, elbow.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(elbow.x, elbow.y, Math.max(2, width - 2), 0, Math.PI * 2); ctx.fill(); };
    ctx.save(); ctx.strokeStyle = glow; ctx.fillStyle = "#050608"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.shadowColor = glow; ctx.shadowBlur = player.invuln > 0 ? 18 : 7;
    ctx.beginPath(); ctx.arc(x, y + 9, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x, y + 39); ctx.stroke();
    const shoulder = point(0, 23); const hip = point(0, 39);
    if (player.slide > 0) {
      ctx.beginPath(); ctx.moveTo(x - facing * 5, y + 22); ctx.lineTo(x + facing * 21, y + 26); ctx.lineTo(x + facing * 31, y + bodyH); ctx.stroke();
    } else if (player.attackKind === "kick" && player.attack > 0) {
      limb(shoulder, point(14, 28), point(25, 40), 5);
      limb(hip, point(13 + attackPhase * 16, 45 - attackPhase * 15), point(28 + attackPhase * 38, 44 - attackPhase * 24), 6);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x + facing * (28 + attackPhase * 38), y + 44 - attackPhase * 24, 6, 0, Math.PI * 2); ctx.fill();
    } else if (player.attack > 0) {
      limb(shoulder, point(14 + attackPhase * 7, 16 - attackPhase * 4), point(29 + attackPhase * 27, 15 - attackPhase * 5), 5);
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x + facing * (29 + attackPhase * 27), y + 15 - attackPhase * 5, 6, 0, Math.PI * 2); ctx.fill();
      limb(point(0, 27), point(-12, 34), point(-20, 28 + gait * 2), 4);
    } else {
      limb(shoulder, point(13, 28 + gait * 6), point(23, 39 + gait * 8), 5);
      limb(point(0, 27), point(-13, 34 - gait * 6), point(-21, 28 - gait * 8), 4);
    }
    if (player.attackKind !== "kick" || player.attack <= 0) { limb(hip, point(-11, 49 + gait * 7), point(-15, 67 + gait * 9), 5); limb(hip, point(12, 49 - gait * 7), point(19, 67 - gait * 9), 5); }
    else limb(hip, point(-12, 50), point(-17, 68), 5);
    if (!player.grounded) { ctx.beginPath(); ctx.moveTo(x - facing * 2, y + 39); ctx.lineTo(x - facing * 17, y + 49); ctx.moveTo(x + facing * 2, y + 39); ctx.lineTo(x + facing * 18, y + 52); ctx.stroke(); }
    if (player.shield > 0) { ctx.strokeStyle = "#55e8ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + facing * 14, y + 31, 25, facing > 0 ? -1.2 : 1.9, facing > 0 ? 1.2 : 4.3); ctx.stroke(); }
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const color = enemy.type === "boss" ? "#ff526b" : enemy.type === "heavy" ? "#ff9a5c" : enemy.type === "shield" ? "#b889ff" : enemy.type === "flyer" ? "#55e8ff" : "#ff526b";
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = "#080b10"; ctx.lineWidth = 4; ctx.shadowColor = color; ctx.shadowBlur = 7;
    if (enemy.type === "boss") { ctx.lineWidth = 6; ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h); ctx.beginPath(); ctx.moveTo(enemy.x + 14, enemy.y + 22); ctx.lineTo(enemy.x + enemy.w - 14, enemy.y + 22); ctx.moveTo(enemy.x + 18, enemy.y + 64); ctx.lineTo(enemy.x + enemy.w - 18, enemy.y + 64); ctx.stroke(); ctx.font = "800 11px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#ff526b"; ctx.fillText(`FIREWALL // ${enemy.hp}`, enemy.x + enemy.w / 2, enemy.y - 10); }
    else if (enemy.type === "flyer") { ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y + 12); ctx.lineTo(enemy.x + 13, enemy.y); ctx.lineTo(enemy.x + 26, enemy.y + 12); ctx.lineTo(enemy.x + 13, enemy.y + 25); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(enemy.x + enemy.w / 2, enemy.y + 9, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + 16); ctx.lineTo(enemy.x + enemy.w / 2, enemy.y + 32); ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + 21); ctx.lineTo(enemy.x + 4, enemy.y + 25); ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + 21); ctx.lineTo(enemy.x + enemy.w - 4, enemy.y + 25); ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + 32); ctx.lineTo(enemy.x + 4, enemy.y + 38); ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + 32); ctx.lineTo(enemy.x + enemy.w - 4, enemy.y + 38); ctx.stroke(); if (enemy.type === "shield") { ctx.strokeStyle = "#ffffff"; ctx.strokeRect(enemy.x - 5, enemy.y + 8, 8, 25); } }
    ctx.restore();
  }

  function updateHud() {
    $("ninja-score").textContent = score.toLocaleString(); $("ninja-distance").textContent = `${distance}m`; $("ninja-kills").textContent = kills; $("ninja-combo").textContent = `x${Math.max(1, Math.min(10, Math.floor(combo / 2) + 1))}`; $("ninja-flow").textContent = `${Math.round(flow)}%`; $("ninja-lives").textContent = Math.max(0, player?.lives || 0);
  }

  function finish(reason) {
    if (ended) return; ended = true; running = false; const oldBest = readBest(); const record = score > Number(oldBest?.score || 0); const result = { score, distance, kills, bestCombo, perfectKills, bosses, flowStates, at: Date.now() }; window.localStorage.setItem(LAST_KEY, String(Date.now())); if (record) window.localStorage.setItem(BEST_KEY, JSON.stringify(result));
    $("ninja-result").hidden = false; $("result-ninja-score").textContent = score.toLocaleString(); $("result-ninja-record").textContent = record ? "NEW PERSONAL BEST" : reason; $("result-ninja-mark").textContent = record ? "NEW RECORD" : "RUN COMPLETE"; $("result-ninja-distance").textContent = `${distance}m`; $("result-ninja-kills").textContent = kills; $("result-ninja-combo").textContent = `x${Math.max(1, Math.min(10, Math.floor(bestCombo / 2) + 1))}`; $("result-ninja-perfect").textContent = perfectKills; $("result-ninja-bosses").textContent = bosses; $("result-ninja-flow").textContent = flowStates; $("result-ninja-best").textContent = record ? "NEW RECORD" : (oldBest ? Number(oldBest.score).toLocaleString() : "-"); $("result-ninja-rank").textContent = user ? "Updating…" : "Sign in"; $("ninja-start").hidden = false; $("ninja-start").textContent = "Run again →"; $("ninja-pause").hidden = true; $("ninja-status").textContent = record ? "New personal best. Gank it again." : "One more run is always available."; draw(); saveScore(result);
  }

  function readBest() { try { return JSON.parse(window.localStorage.getItem(BEST_KEY) || "null"); } catch { return null; } }
  async function saveScore(result) { if (!client || !user) return; const response = await client.from("null_ninja_scores").insert({ user_id: user.id, score: result.score, distance: result.distance, kills: result.kills, best_combo: result.bestCombo, perfect_kills: result.perfectKills, bosses_defeated: result.bosses, flow_states: result.flowStates, xp_earned: Math.min(250, 25 + result.kills * 2), status: "approved" }).select("id").single(); if (!response.error) { $("result-ninja-rank").textContent = "Submitted"; loadLeaderboard(); } }
  async function loadLeaderboard() { if (!client) return; const result = await client.from("null_ninja_leaderboard").select("display_name,best_score,best_distance,best_kills").order("best_score", { ascending: false }).limit(500); const body = $("ninja-leaderboard-body"); if (result.error) { body.innerHTML = "<tr><td colspan=\"5\">Leaderboard temporarily unavailable.</td></tr>"; return; } body.innerHTML = result.data?.length ? result.data.map((row, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(row.display_name || "Player")}</td><td>${Number(row.best_score || 0).toLocaleString()}</td><td>${row.best_distance || 0}m</td><td>${row.best_kills || 0}</td></tr>`).join("") : "<tr><td colspan=\"5\">No approved runs yet. Be the first.</td></tr>"; }
  function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c])); }
  function togglePause() { if (!running || ended) return; paused = !paused; $("ninja-pause").innerHTML = paused ? "Resume <span>▶</span>" : "Pause <span>Ⅱ</span>"; draw(); }
  function doAction(name) { if (name === "kick") attack(false, "kick"); else ({ jump, attack, dash, counter, slide: () => { if (running && !paused) player.slide = .45; } }[name] || (() => {}))(); }

  const keys = new Set();
  window.addEventListener("keydown", (event) => { const key = event.key.toLowerCase(); if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "a", "d", "w", "s", "e", "f", "g", "j", "k", "shift", "escape", "r"].includes(key)) event.preventDefault(); keys.add(key); if (key === "w" || key === "arrowup") jump(); if (key === " " || key === "shift") dash(); if (key === "f" || key === "j" || key === "enter") attack(false, "punch"); if (key === "g") attack(false, "kick"); if (key === "k") counter(); if (key === "e") activateFlow(); if (key === "escape") togglePause(); if (key === "r") start(); }, { passive: false });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  document.querySelectorAll("[data-ninja-action]").forEach((button) => { button.addEventListener("click", () => doAction(button.dataset.ninjaAction)); });
  canvas.addEventListener("pointerdown", (event) => { pointerStart = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener("pointerup", (event) => { if (!pointerStart) return; const dx = event.clientX - pointerStart.x; const dy = event.clientY - pointerStart.y; pointerStart = null; if (Math.abs(dy) > 35 && dy < 0) jump(); else if (Math.abs(dx) > 35) dash(); else attack(); });
  $("ninja-start").addEventListener("click", start); $("ninja-run-again").addEventListener("click", start); $("ninja-restart").addEventListener("click", start); $("ninja-pause").addEventListener("click", togglePause); $("ninja-help-button").addEventListener("click", () => $("ninja-help").showModal()); $("ninja-help-close").addEventListener("click", () => $("ninja-help").close()); $("ninja-login").addEventListener("click", () => { window.location.href = `login.html?returnTo=${encodeURIComponent("null-ninja.html")}`; }); $("ninja-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });

  const config = window.GANKBYTE_XP_CONFIG || {};
  if (window.supabase && config.supabaseUrl && config.supabasePublishableKey) { client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey); client.auth.getSession().then(({ data }) => { user = data.session?.user || null; updateAuth(); loadLeaderboard(); }); client.auth.onAuthStateChange((_event, session) => { user = session?.user || null; updateAuth(); }); }
  function updateAuth() { if (user) { $("ninja-auth-status").textContent = `Signed in as ${user.user_metadata?.full_name || user.email || "player"}. Scores submit automatically.`; $("ninja-login").hidden = true; $("ninja-logout").hidden = false; } else { $("ninja-auth-status").textContent = "Sign in with Discord to submit scores."; $("ninja-login").hidden = false; $("ninja-logout").hidden = true; } }
  function frame(now) { const dt = Math.min(.05, (now - lastFrame) / 1000 || 0); lastFrame = now; update(dt, now); draw(); requestAnimationFrame(frame); }
  reset(); requestAnimationFrame(frame);
})();
