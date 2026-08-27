(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("fighter-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, GROUND = 430;
  const BEST_KEY = "gankbyte-stick-fighter-best";
  const LAST_KEY = "gankbyte-stick-fighter-last-played";
  const STAGE_KEY = "gankbyte-stick-fighter-unlocked-stage";
  const config = window.GANKBYTE_XP_CONFIG || {};
  const keys = new Set();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const format = (value) => Number(value || 0).toLocaleString();
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const makeOpponent = (name, style, hp, stamina, damage, aiMin, aiMax, boss = false, color = "#ff526b") => ({ name, style, hp, stamina, damage, aiMin, aiMax, boss, color });

  const LEVELS = [
    { name: "TRAINING RING", note: "A readable first fight. Learn spacing, guard timing, and clean punches.", opponents: [makeOpponent("Rookie", "balanced", 76, 92, .78, 560, 760)] },
    { name: "RUSH CIRCUIT", note: "Rush closes distance quickly. Dash away, then punish the recovery.", opponents: [makeOpponent("Rush", "rushdown", 88, 100, .86, 390, 560)] },
    { name: "COUNTER VAULT", note: "The Watcher waits for swings. Feint with movement and break the guard.", opponents: [makeOpponent("The Watcher", "counter", 96, 100, .9, 420, 620)] },
    { name: "HEAVY PLATFORM", note: "A heavier stick absorbs punishment and hits harder.", opponents: [makeOpponent("Juggernaut", "heavy", 122, 112, 1.02, 470, 680, false, "#e7b35d")] },
    { name: "FIREWALL GATE", note: "The first boss mixes pressure with a charged special.", opponents: [makeOpponent("Firewall", "boss", 142, 112, 1.08, 360, 520, true, "#ff526b")] },
    { name: "NEON CROSSING", note: "A technical rival changes rhythm and attacks from awkward ranges.", opponents: [makeOpponent("Sidewinder", "technical", 112, 108, .98, 340, 520, false, "#55e8ff")] },
    { name: "PRESSURE DECK", note: "Keep your guard disciplined against a rival that never gives space.", opponents: [makeOpponent("Brawler", "rushdown", 118, 112, 1.02, 300, 450)] },
    { name: "TWO-SIGNAL TEST", note: "Two rivals share the ring. Separate them and avoid being surrounded.", opponents: [makeOpponent("Spark", "rushdown", 72, 90, .82, 330, 500, false, "#55e8ff"), makeOpponent("Shade", "counter", 78, 96, .86, 410, 590, false, "#b889ff")] },
    { name: "VECTOR YARD", note: "The rival uses jumps and dashes to attack from changing angles.", opponents: [makeOpponent("Vector", "technical", 126, 115, 1.02, 290, 460, false, "#55e8ff")] },
    { name: "CORE BREAKER", note: "The second boss has armour, patience, and a dangerous counter window.", opponents: [makeOpponent("Core Breaker", "boss", 158, 120, 1.12, 300, 460, true, "#c6ff3d")] },
    { name: "LOW SIGNAL", note: "A defensive specialist tests whether you can create safe openings.", opponents: [makeOpponent("Null Guard", "counter", 134, 120, 1.05, 300, 500, false, "#b889ff")] },
    { name: "GANK ALLEY", note: "Fast attacks and short recoveries punish hesitation.", opponents: [makeOpponent("Alley", "rushdown", 130, 118, 1.08, 260, 410)] },
    { name: "OVERCLOCK", note: "Everything speeds up. Save stamina for the moments that matter.", opponents: [makeOpponent("Overclock", "technical", 145, 125, 1.1, 240, 390, false, "#55e8ff")] },
    { name: "DOUBLE BREACH", note: "Two coordinated attackers force you to move, block, and pick a target.", opponents: [makeOpponent("Breaker", "rushdown", 86, 100, .94, 280, 430), makeOpponent("Counterbyte", "counter", 92, 104, .98, 330, 500, false, "#b889ff")] },
    { name: "IRON RING", note: "The armour specialist shrugs off mistakes and controls the centre.", opponents: [makeOpponent("Ironclad", "heavy", 178, 130, 1.14, 350, 520, false, "#e7b35d")] },
    { name: "BOSS // GANK ENGINE", note: "The engine reads patterns and changes approach when its health drops.", opponents: [makeOpponent("Gank Engine", "boss", 184, 130, 1.16, 230, 380, true, "#ff526b")] },
    { name: "LAST CIRCUIT", note: "A veteran rival combines rushdown, counters, and sudden dashes.", opponents: [makeOpponent("Veteran", "technical", 168, 128, 1.12, 220, 360, false, "#55e8ff")] },
    { name: "FINAL TWO", note: "Two elite sticks protect the final gate. Do not trade health carelessly.", opponents: [makeOpponent("Edge", "rushdown", 104, 112, 1.02, 240, 390), makeOpponent("Aegis", "counter", 116, 120, 1.08, 270, 430, false, "#b889ff")] },
    { name: "GANKBYTE FINALS", note: "The champion has every answer. Read the tell, use the guard, and finish clean.", opponents: [makeOpponent("The Champion", "boss", 220, 140, 1.2, 190, 320, true, "#f4f2ea")] }
  ];

  let player, rivals = [], running = false, paused = false, ended = false, stageIndex = 0;
  let score = 0, hits = 0, levelsCleared = 0, bestCombo = 1, combo = 1, perfectBlocks = 0, specials = 0;
  let lastFrame = 0, nextAi = 0, particles = [], floatingText = [], user = null, client = null, pointerStart = null, transitionId = 0;

  try { stageIndex = clamp(Number(window.localStorage.getItem(STAGE_KEY) || 0), 0, LEVELS.length - 1); } catch { stageIndex = 0; }
  const currentStage = () => LEVELS[stageIndex] || LEVELS[0];
  function saveUnlockedStage() { try { const old = Number(window.localStorage.getItem(STAGE_KEY) || 0); window.localStorage.setItem(STAGE_KEY, String(Math.max(old, stageIndex))); } catch {} }
  function updateStageUi() { $("fighter-stage").value = String(stageIndex); $("fighter-level").textContent = `${stageIndex + 1} / ${LEVELS.length}`; $("fighter-stage-note").textContent = `${currentStage().opponents.map((opponent) => opponent.name).join(" + ")} // ${currentStage().note}`; }

  function fighter(x, facing, isPlayer, spec = {}) {
    return { x, y: GROUND - 92, w: 38, h: 92, vx: 0, vy: 0, facing, hp: spec.hp || 100, maxHp: spec.hp || 100, stamina: spec.stamina || 100, maxStamina: spec.stamina || 100, focus: spec.focus || 0, grounded: true, jumps: 0, blocking: false, attacking: false, attack: null, attackTime: 0, attackHit: false, cooldown: 0, hurt: 0, invulnerable: 0, isPlayer, actionLock: 0, attackChain: 0, lastAttackKind: null, lastAttackAt: 0, name: spec.name || (isPlayer ? "PLAYER 1" : "RIVAL"), style: spec.style || "balanced", damage: spec.damage || 1, aiMin: spec.aiMin || 400, aiMax: spec.aiMax || 600, boss: Boolean(spec.boss), color: spec.color || "#ff526b" };
  }

  function resetLevel() {
    const stage = currentStage();
    player = fighter(240, 1, true, { name: "PLAYER 1", hp: 100, stamina: 100, focus: 0, color: "#c6ff3d" });
    rivals = stage.opponents.map((spec, index) => fighter(680 + index * 150, -1, false, spec));
    nextAi = 0; particles = []; floatingText = [];
    updateHud(); draw();
  }

  function resetMatch() {
    transitionId += 1; running = false; paused = false; ended = false; score = 0; hits = 0; levelsCleared = 0; bestCombo = 1; combo = 1; perfectBlocks = 0; specials = 0;
    updateStageUi(); resetLevel(); $("fighter-message").hidden = false; $("fighter-message").innerHTML = "<strong>READY?</strong><span>Defeat the rival to unlock the next level.</span>"; $("fighter-result").hidden = true; $("fighter-start").hidden = false; $("fighter-start").innerHTML = "Start campaign <span>&rarr;</span>"; $("fighter-pause").hidden = true; $("fighter-restart").hidden = true; setStatus("A/D move · W jump · S block · F punch · G kick · Space dash · E special.");
  }
  function setStatus(message) { $("fighter-status").textContent = message; }
  function updateHud() {
    if (!player || !rivals.length) return;
    const active = rivals.filter((rival) => rival.hp > 0);
    const lead = active[0] || rivals[0];
    $("fighter-level").textContent = `${stageIndex + 1} / ${LEVELS.length}`; $("fighter-enemies").textContent = `${active.length}`; $("fighter-player-health").textContent = `${Math.max(0, Math.ceil(player.hp))}%`; $("fighter-enemy-health").textContent = lead.boss ? `BOSS ${Math.max(0, Math.ceil(lead.hp))}%` : `${Math.max(0, Math.ceil(lead.hp))}%`; $("fighter-score").textContent = format(score);
  }
  function burst(x, y, color, amount = 12) { for (let i = 0; i < amount; i += 1) particles.push({ x, y, vx: rand(-130, 130), vy: rand(-150, 20), life: rand(.25, .7), color, size: rand(2, 5) }); }
  function pop(text, x, y, color = "#c6ff3d") { floatingText.push({ text, x, y, color, life: 1 }); }
  function bodyBox(f) { return { x: f.x - f.w / 2, y: f.y, w: f.w, h: f.h }; }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function distanceTo(f) { return Math.abs(player.x - f.x); }

  function start() {
    resetMatch(); running = true; $("fighter-message").hidden = true; $("fighter-start").hidden = true; $("fighter-pause").hidden = false; $("fighter-restart").hidden = false; setStatus($("fighter-mode").value === "local" ? "Player 1 versus Player 2. Defeat every stick in the level." : "Read the rival. Clean hits build focus for your special."); canvas.focus();
  }
  function move(f, direction) { if (!running || paused || ended) return; f.vx = direction * (f.blocking ? 75 : 210); f.facing = direction; }
  function jump(f) { if (!running || paused || ended || f.actionLock > 0) return; if (f.grounded || f.jumps < 2) { f.vy = -470; f.grounded = false; f.jumps += 1; f.blocking = false; burst(f.x, GROUND, "#55e8ff", 5); } }
  function dash(f) { if (!running || paused || ended || f.actionLock > 0 || f.stamina < 22) return; f.stamina -= 22; f.invulnerable = .22; f.vx = f.facing * 610; f.actionLock = .16; burst(f.x, f.y + 48, "#b889ff", 10); }
  function block(f, active) { if (!running || paused || ended) return; if (active && f.actionLock <= 0 && f.stamina > 1) { f.blocking = true; f.vx = 0; } else f.blocking = false; }
  function attack(f, kind) {
    if (!running || paused || ended || f.cooldown > 0 || f.actionLock > 0) return;
    const data = { punch: { time: .42, hit: .15, cooldown: .42, damage: 7, reach: 60, knock: 110, focus: 7, stamina: 13 }, kick: { time: .58, hit: .23, cooldown: .58, damage: 12, reach: 82, knock: 180, focus: 11, stamina: 21 }, special: { time: .78, hit: .3, cooldown: .72, damage: 24, reach: 105, knock: 330, focus: 0, stamina: 0 } }[kind];
    if (!data || (kind === "special" && f.focus < 100)) return;
    if (f.stamina < data.stamina) { if (f.isPlayer) setStatus("Too tired. Move or guard briefly to recover stamina."); return; }
    if (!f.isPlayer) data.damage = Math.round(data.damage * f.damage);
    f.stamina = Math.max(0, f.stamina - data.stamina);
    if (kind === "special") { f.focus = 0; if (f.isPlayer) specials += 1; }
    if (f.isPlayer) { f.attackChain = f.lastAttackKind === kind && f.lastAttackAt < 1.1 ? f.attackChain + 1 : 1; f.lastAttackKind = kind; f.lastAttackAt = 0; }
    f.blocking = false; f.attacking = true; f.attack = { kind, ...data }; f.attackTime = 0; f.attackHit = false; f.actionLock = data.time;
  }
  function hitTarget(attacker, target) {
    const a = attacker.attack; if (!a || attacker.attackHit || !target || target.hp <= 0) return;
    const attackX = attacker.x + attacker.facing * (attacker.w / 2 + a.reach / 2 - 8);
    const box = { x: attackX - a.reach / 2, y: attacker.y + (a.kind === "kick" ? 34 : 12), w: a.reach, h: a.kind === "kick" ? 38 : 30 };
    if (!overlap(box, bodyBox(target)) || Math.abs(attacker.y - target.y) > 54) return;
    const facingHit = Math.sign(target.x - attacker.x) === attacker.facing || Math.abs(target.x - attacker.x) < 24;
    if (!facingHit) return;
    attacker.attackHit = true;
    const blocked = target.blocking && a.kind !== "special"; const perfect = blocked && target.stamina > 70;
    if (blocked) { const damage = perfect ? 1 : Math.ceil(a.damage * .24); target.hp = Math.max(0, target.hp - damage); target.stamina = Math.max(0, target.stamina - (perfect ? 12 : 25)); target.focus = clamp(target.focus + 12, 0, 100); if (perfect && target.isPlayer) { perfectBlocks += 1; pop("PERFECT BLOCK", target.x, target.y - 16, "#55e8ff"); score += 80; burst(target.x, target.y + 36, "#55e8ff", 10); } else pop("BLOCK", target.x, target.y - 12, "#e6f7a5"); if (target.stamina <= 1) { target.blocking = false; target.actionLock = .3; pop("GUARD BREAK", target.x, target.y - 25, "#ff526b"); } }
    else { target.hp = Math.max(0, target.hp - a.damage); target.hurt = .18; target.invulnerable = .16; target.vx = attacker.facing * a.knock; target.vy = a.kind === "special" ? -100 : -40; attacker.focus = clamp(attacker.focus + a.focus, 0, 100); if (attacker.isPlayer) { hits += 1; combo = combo < 10 ? combo + 1 : 10; bestCombo = Math.max(bestCombo, combo); score += a.damage * 10 * combo + (a.kind === "special" ? 500 : 0); pop(a.kind === "special" ? "GANK HIT" : `+${a.damage * combo}`, target.x, target.y - 16, a.kind === "special" ? "#c6ff3d" : "#f4f2ea"); } else { combo = 1; } burst(target.x, target.y + 34, a.kind === "special" ? "#c6ff3d" : "#ff526b", a.kind === "special" ? 24 : 12); }
  }
  function cpuThink(rival) {
    if (!running || paused || ended || rival.hp <= 0 || rival.actionLock > 0) return;
    const d = distanceTo(rival), style = rival.style, roll = Math.random(); rival.facing = player.x < rival.x ? -1 : 1;
    const threatened = player.attacking && d < 145;
    const spamRead = player.attackChain >= 2;
    if (threatened && (spamRead || style === "counter" || style === "boss" || roll < .25)) { block(rival, true); return; }
    if (rival.hp < rival.maxHp * .28 && rival.stamina > 28 && roll < .28) { dash(rival); return; }
    if (d > (style === "rushdown" ? 92 : 118)) { move(rival, rival.facing); if ((style === "technical" || style === "boss") && roll < .2) jump(rival); return; }
    rival.vx = 0;
    if (rival.focus >= 100 && (style === "boss" || style === "rushdown" || roll < .32)) attack(rival, "special");
    else if (style === "counter" && roll < .5) block(rival, true);
    else if (style === "technical" && roll < .24) { jump(rival); attack(rival, "kick"); }
    else if (style === "rushdown" && roll < .62) attack(rival, "punch");
    else attack(rival, roll < .56 ? "kick" : "punch");
  }
  function updateFighter(f, dt, opponent) {
    f.cooldown = Math.max(0, f.cooldown - dt); f.actionLock = Math.max(0, f.actionLock - dt); f.hurt = Math.max(0, f.hurt - dt); f.invulnerable = Math.max(0, f.invulnerable - dt); if (f.isPlayer) { f.lastAttackAt += dt; if (f.lastAttackAt > 1.1) f.attackChain = 0; }
    if (!f.blocking && f.stamina < f.maxStamina) f.stamina = clamp(f.stamina + dt * 19, 0, f.maxStamina);
    if (f.attacking) { f.attackTime += dt; if (!f.attackHit && f.attackTime >= f.attack.hit) hitTarget(f, opponent); if (f.attackTime >= f.attack.time) { f.attacking = false; f.attack = null; f.cooldown = .12; } }
    if (f.blocking) { f.stamina = Math.max(0, f.stamina - dt * 10); if (f.stamina <= 0) f.blocking = false; }
    f.vy += 1120 * dt; const oldBottom = f.y + f.h; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(.001, dt); f.x = clamp(f.x, 40, W - 40);
    if (f.y + f.h >= GROUND && f.vy >= 0) { f.y = GROUND - f.h; f.vy = 0; f.grounded = true; f.jumps = 0; } else f.grounded = false;
    if (oldBottom < GROUND && f.y + f.h >= GROUND) burst(f.x, GROUND, "#555b68", 3);
  }
  function completeLevel() {
    if (!running || ended || rivals.some((rival) => rival.hp > 0)) return;
    running = false; levelsCleared = Math.max(levelsCleared, stageIndex + 1); score += 500 + (stageIndex + 1) * 100 + Math.ceil(player.hp); pop("LEVEL CLEAR", player.x, player.y - 40); updateHud();
    if (stageIndex >= LEVELS.length - 1) { finish("CAMPAIGN COMPLETE"); return; }
    const token = ++transitionId; $("fighter-message").hidden = false; $("fighter-message").innerHTML = `<strong>LEVEL ${stageIndex + 1} CLEAR</strong><span>Health restored. Preparing level ${stageIndex + 2}.</span>`; setStatus(`Level ${stageIndex + 1} cleared. Health restored for the next fight.`);
    window.setTimeout(() => { if (ended || token !== transitionId) return; stageIndex += 1; saveUnlockedStage(); updateStageUi(); resetLevel(); $("fighter-message").hidden = true; running = true; setStatus(`Level ${stageIndex + 1}: ${currentStage().note}`); }, 1100);
  }
  function finish(reason) {
    if (ended) return; ended = true; running = false; paused = false; const oldBest = readBest(); const record = score > Number(oldBest?.score || 0); const result = { score: Math.round(score), levelsCleared, levelReached: stageIndex + 1, hits, bestCombo, perfectBlocks, specials, at: Date.now() };
    $("fighter-result").hidden = false; $("result-fighter-score").textContent = format(result.score); $("result-fighter-record").textContent = record ? "NEW PERSONAL BEST" : reason; $("result-fighter-mark").textContent = reason; $("result-fighter-rounds").textContent = `${levelsCleared} / ${LEVELS.length}`; $("result-fighter-hits").textContent = hits; $("result-fighter-combo").textContent = `x${bestCombo}`; $("result-fighter-blocks").textContent = perfectBlocks; $("result-fighter-specials").textContent = specials; $("result-fighter-best").textContent = record ? "NEW RECORD" : (oldBest ? format(oldBest.score) : "-"); $("result-fighter-rank").textContent = user ? "Saving..." : "Sign in"; $("fighter-start").hidden = false; $("fighter-start").innerHTML = "Start again <span>&rarr;</span>"; $("fighter-pause").hidden = true; $("fighter-restart").hidden = true; $("fighter-message").hidden = false; $("fighter-message").innerHTML = `<strong>${reason}</strong><span>${reason === "CAMPAIGN COMPLETE" ? "Every level cleared. Run it again and beat your score." : "Recover, choose your approach, and run it back."}</span>`; setStatus(record ? "New personal best. Gank it again." : "Campaign run complete. Start again whenever you are ready."); window.localStorage.setItem(LAST_KEY, String(Date.now())); if (record) window.localStorage.setItem(BEST_KEY, JSON.stringify(result)); saveScore(result); updateHud(); draw();
  }
  function readBest() { try { return JSON.parse(window.localStorage.getItem(BEST_KEY) || "null"); } catch { return null; } }
  function update(dt) {
    if (!running || paused || ended) return;
    const pLeft = keys.has("a"), pRight = keys.has("d"); if (pLeft) move(player, -1); else if (pRight) move(player, 1); else if (!player.attacking) player.vx *= .86; block(player, keys.has("s") || keys.has("l"));
    if ($("fighter-mode").value === "local") { const localRival = rivals[0]; if (localRival) { if (keys.has("arrowleft")) move(localRival, -1); else if (keys.has("arrowright")) move(localRival, 1); else if (!localRival.attacking) localRival.vx *= .86; block(localRival, keys.has("numpad4")); } if (performance.now() > nextAi) { rivals.slice(1).forEach((rival) => cpuThink(rival)); nextAi = performance.now() + rand(420, 680); } }
    else if (performance.now() > nextAi) { rivals.forEach((rival) => cpuThink(rival)); nextAi = performance.now() + rand(Math.min(...rivals.filter((rival) => rival.hp > 0).map((rival) => rival.aiMin)), Math.max(...rivals.filter((rival) => rival.hp > 0).map((rival) => rival.aiMax))); }
    const target = rivals.filter((rival) => rival.hp > 0).sort((a, b) => distanceTo(a) - distanceTo(b))[0]; updateFighter(player, dt, target); rivals.forEach((rival) => updateFighter(rival, dt, player));
    if (player.hp <= 0) finish("CAMPAIGN RUN OVER"); else if (rivals.every((rival) => rival.hp <= 0)) completeLevel();
    if (combo > 1 && !player.attacking && player.cooldown > .1) combo = Math.max(1, combo - dt * .5); particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }); particles = particles.filter((p) => p.life > 0); floatingText.forEach((p) => { p.y -= 24 * dt; p.life -= dt; }); floatingText = floatingText.filter((p) => p.life > 0); updateHud();
  }
  function drawStick(f, color, accent) {
    const x = f.x, y = f.y, facing = f.facing || 1, glow = f.invulnerable > 0 ? "#ffffff" : color; const moving = Math.abs(f.vx) > 35 && f.grounded && !f.attacking && !f.blocking; const gait = moving ? Math.sin(performance.now() / 85) : 0; const attackProgress = f.attacking && f.attack ? clamp(f.attackTime / f.attack.time, 0, 1) : 0; const attackPhase = Math.sin(attackProgress * Math.PI); const kind = f.attack?.kind; const point = (px, py) => ({ x: x + px * facing, y: y + py }); const limb = (from, elbow, to, width = 5, limbColor = glow) => { ctx.strokeStyle = limbColor; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(elbow.x, elbow.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.fillStyle = limbColor; ctx.beginPath(); ctx.arc(elbow.x, elbow.y, Math.max(2, width - 2), 0, Math.PI * 2); ctx.fill(); };
    ctx.save(); if (f.hurt > 0) ctx.translate(rand(-2, 2), 0); ctx.strokeStyle = glow; ctx.fillStyle = "#090c12"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.shadowColor = glow; ctx.shadowBlur = f.hurt > 0 ? 18 : 8; ctx.beginPath(); ctx.arc(x, y + 14, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + 29); ctx.lineTo(x, y + 60); ctx.stroke(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 9, y + 11); ctx.lineTo(x - 4, y + 11); ctx.moveTo(x + 4, y + 11); ctx.lineTo(x + 9, y + 11); ctx.stroke();
    const shoulder = point(0, 38), hip = point(0, 60);
    if (f.blocking) { limb(point(0, 38), point(12, 31), point(25, 45), 5, "#55e8ff"); limb(point(0, 43), point(-10, 48), point(16, 57), 5, "#55e8ff"); }
    else if (kind === "punch") { limb(shoulder, point(18 + attackPhase * 8, 31 - attackPhase * 4), point(34 + attackPhase * 28, 30 - attackPhase * 5), 6, glow); limb(point(0, 43), point(-14, 51), point(-24, 45 + gait * 2), 5, glow); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x + facing * (34 + attackPhase * 28), y + 30 - attackPhase * 5, 6, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === "kick") { limb(shoulder, point(16, 34), point(26, 45), 5, glow); limb(hip, point(18 + attackPhase * 14, 68 - attackPhase * 17), point(38 + attackPhase * 38, 67 - attackPhase * 25), 7, glow); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x + facing * (38 + attackPhase * 38), y + 67 - attackPhase * 25, 7, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === "special") { limb(shoulder, point(20 + attackPhase * 8, 27), point(48 + attackPhase * 22, 27), 6, glow); limb(point(0, 44), point(20 + attackPhase * 8, 52), point(44 + attackPhase * 22, 51), 6, glow); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x + facing * (48 + attackPhase * 22), y + 27, 6, 0, Math.PI * 2); ctx.arc(x + facing * (44 + attackPhase * 22), y + 51, 6, 0, Math.PI * 2); ctx.fill(); }
    else { limb(shoulder, point(16, 35 + gait * 7), point(26, 45 + gait * 10), 5, glow); limb(point(0, 43), point(-15, 49 - gait * 7), point(-24, 43 - gait * 10), 5, glow); }
    if (kind !== "kick") { limb(hip, point(-12, 72 + gait * 7), point(-16, 88 + gait * 10), 5, glow); limb(hip, point(14, 72 - gait * 7), point(20, 88 - gait * 10), 5, glow); } else limb(hip, point(-13, 73), point(-18, 88), 5, glow);
    if (!f.grounded) { ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - facing * 2, y + 60); ctx.lineTo(x - facing * 18, y + 69); ctx.moveTo(x + facing * 2, y + 60); ctx.lineTo(x + facing * 20, y + 72); ctx.stroke(); }
    if (f.blocking) { ctx.strokeStyle = "#55e8ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + facing * 16, y + 42, 29, facing > 0 ? -1.2 : 1.9, facing > 0 ? 1.2 : 4.3); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = color; ctx.font = "700 9px Arial"; ctx.textAlign = "center"; ctx.fillText(f.name, x, y - 12); ctx.fillStyle = "#181b22"; ctx.fillRect(x - 34, y - 4, 68, 5); ctx.fillStyle = f.isPlayer ? "#c6ff3d" : "#ff526b"; ctx.fillRect(x - 34, y - 4, 68 * (f.hp / f.maxHp), 5);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#090c12"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "rgba(154,123,255,.08)"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(244,242,234,.055)"; ctx.lineWidth = 1; for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 30; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#121922"; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.strokeStyle = "#c6ff3d"; ctx.shadowColor = "#c6ff3d"; ctx.shadowBlur = 12; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke(); ctx.shadowBlur = 0; ctx.strokeStyle = "#333b46"; ctx.setLineDash([8, 12]); ctx.beginPath(); ctx.moveTo(80, GROUND + 28); ctx.lineTo(W - 80, GROUND + 28); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#c6ff3d"; ctx.font = "800 10px Arial"; ctx.textAlign = "left"; ctx.fillText("GANKBYTE // NEON RING", 20, 24); ctx.font = "700 9px Arial"; ctx.fillText(`LEVEL ${stageIndex + 1} // ${currentStage().name}`, 20, 42); ctx.textAlign = "right"; ctx.fillStyle = "#8f949c"; ctx.fillText("CAMPAIGN // HEALTH RESETS // ONE MORE LEVEL", W - 20, 24); if (player) drawStick(player, "#c6ff3d", "#55e8ff"); rivals.forEach((rival) => { if (rival.hp > 0) drawStick(rival, rival.color, "#b889ff"); });
    particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); floatingText.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.font = "800 15px Arial"; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); }); ctx.globalAlpha = 1; if (player && player.focus >= 100) { ctx.fillStyle = "#c6ff3d"; ctx.font = "800 12px Arial"; ctx.textAlign = "left"; ctx.fillText("SPECIAL READY // E", 20, H - 22); }
    if (paused && running) { ctx.fillStyle = "rgba(5,7,10,.75)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#c6ff3d"; ctx.font = "800 40px Arial"; ctx.textAlign = "center"; ctx.fillText("PAUSED", W / 2, H / 2); }
  }
  async function saveScore(result) { if (!client || !user) return; const response = await client.from("stick_fighter_scores").insert({ user_id: user.id, score: result.score, rounds_won: result.levelsCleared, levels_cleared: result.levelsCleared, hits_landed: result.hits, best_combo: result.bestCombo, perfect_blocks: result.perfectBlocks, specials: result.specials, level_reached: result.levelReached, xp_earned: Math.min(250, 25 + result.levelsCleared * 12 + result.hits), status: "approved" }).select("id").single(); if (!response.error) { $("result-fighter-rank").textContent = "Submitted"; loadLeaderboard(); } }
  async function loadLeaderboard() { if (!client) return; const result = await client.from("stick_fighter_leaderboard").select("display_name,best_score,best_wins,best_hits,level_reached").order("best_score", { ascending: false }).limit(500); const body = $("fighter-leaderboard-body"); if (result.error) { body.innerHTML = "<tr><td colspan=\"6\">Leaderboard temporarily unavailable.</td></tr>"; return; } body.innerHTML = result.data?.length ? result.data.map((row, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>${format(row.best_score)}</td><td>${row.level_reached || 1}</td><td>${row.best_wins || 0}</td><td>${row.best_hits || 0}</td></tr>`).join("") : "<tr><td colspan=\"6\">No approved campaign runs yet. Be the first.</td></tr>"; }
  async function authInit() { if (!window.supabase || !config.supabaseUrl || !config.supabasePublishableKey) { $("fighter-login").disabled = true; $("fighter-auth-status").textContent = "Local play is ready. Online scores are unavailable."; return; } client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey); const result = await client.auth.getSession(); user = result.data?.session?.user || null; updateAuth(); client.auth.onAuthStateChange((_event, session) => { user = session?.user || null; updateAuth(); }); await loadLeaderboard(); }
  function updateAuth() { if (user) { $("fighter-auth-status").textContent = `Signed in as ${user.user_metadata?.global_name || user.user_metadata?.full_name || "Discord player"}. Scores submit automatically.`; $("fighter-login").hidden = true; $("fighter-logout").hidden = false; } else { $("fighter-auth-status").textContent = "Sign in with Discord to submit scores."; $("fighter-login").hidden = false; $("fighter-logout").hidden = true; } }
  function action(name, f = player) { if (name === "left") move(f, -1); else if (name === "right") move(f, 1); else if (name === "jump") jump(f); else if (name === "punch") attack(f, "punch"); else if (name === "kick") attack(f, "kick"); else if (name === "dash") dash(f); else if (name === "special") attack(f, "special"); }
  function keyName(event) { if (event.code?.startsWith("Numpad")) return event.code.toLowerCase(); return event.key.toLowerCase() === " " ? "space" : event.key.toLowerCase(); }
  window.addEventListener("keydown", (event) => { const key = keyName(event); if (["a", "d", "w", "s", "e", "f", "g", "j", "k", "l", "i", "shift", "arrowleft", "arrowright", "arrowup", "numpad1", "numpad2", "numpad3", "numpad4", "numpad5", "numpad6", "space", "escape", "r"].includes(key)) event.preventDefault(); const first = !keys.has(key); keys.add(key); if (!first) return; if (key === "w") jump(player); if (key === "f" || key === "j") attack(player, "punch"); if (key === "g" || key === "k") attack(player, "kick"); if (key === "space" || key === "shift") dash(player); if (key === "e" || key === "i") attack(player, "special"); if ($("fighter-mode").value === "local") { const localRival = rivals[0]; if (localRival && key === "numpad1") attack(localRival, "punch"); if (localRival && key === "numpad3") attack(localRival, "kick"); if (localRival && key === "numpad5") dash(localRival); if (localRival && key === "numpad6") attack(localRival, "special"); if (localRival && key === "numpad2") jump(localRival); } if (key === "escape" && running) { paused = !paused; $("fighter-pause").innerHTML = paused ? "Resume <span>&rarr;</span>" : "Pause <span>&#10074;&#10074;</span>"; setStatus(paused ? "Fight paused." : "Fight resumed."); } if (key === "r" && running) start(); }, { passive: false });
  window.addEventListener("keyup", (event) => keys.delete(keyName(event)));
  document.querySelectorAll("[data-fighter-action]").forEach((button) => { const name = button.dataset.fighterAction; button.addEventListener("pointerdown", (event) => { event.preventDefault(); if (["left", "right", "block"].includes(name)) { button.setPointerCapture?.(event.pointerId); if (name === "block") block(player, true); else action(name); } else action(name); }); const release = () => { if (name === "left" || name === "right") player.vx = 0; if (name === "block") block(player, false); }; button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release); button.addEventListener("pointerleave", release); });
  canvas.addEventListener("pointerdown", (event) => { pointerStart = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture?.(event.pointerId); }); canvas.addEventListener("pointerup", (event) => { if (!pointerStart) return; const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y; pointerStart = null; if (Math.abs(dx) > 34) action(dx < 0 ? "left" : "right"); else if (dy < -28) action("jump"); else action("punch"); });
  $("fighter-mode").addEventListener("change", () => { $("fighter-mode-note").textContent = $("fighter-mode").value === "local" ? "Player 2 uses the arrow keys and numpad buttons." : "The CPU reads distance, stamina, and openings."; if (!running) resetLevel(); }); $("fighter-start").addEventListener("click", start); $("fighter-run-again").addEventListener("click", start); $("fighter-restart").addEventListener("click", start); $("fighter-pause").addEventListener("click", () => { if (!running || ended) return; paused = !paused; $("fighter-pause").innerHTML = paused ? "Resume <span>&rarr;</span>" : "Pause <span>&#10074;&#10074;</span>"; setStatus(paused ? "Fight paused." : "Fight resumed."); }); $("fighter-help-button").addEventListener("click", () => $("fighter-help").showModal()); $("fighter-help-close").addEventListener("click", () => $("fighter-help").close()); $("fighter-login").addEventListener("click", () => { window.location.href = `login.html?returnTo=${encodeURIComponent("stick-fighter.html")}`; }); $("fighter-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  $("fighter-stage").addEventListener("change", () => { if (running) { $("fighter-stage").value = String(stageIndex); return; } stageIndex = clamp(Number($("fighter-stage").value), 0, LEVELS.length - 1); resetMatch(); });
  function frame(now) { const dt = Math.min(.05, (now - lastFrame) / 1000 || 0); lastFrame = now; update(dt); draw(); window.requestAnimationFrame(frame); }
  resetMatch(); authInit().catch(() => { $("fighter-auth-status").textContent = "Local play is ready. Online scores are unavailable."; }); window.requestAnimationFrame(frame);
})();
