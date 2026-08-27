/* Packet Siege: an original GankByte wave-defence shooter. */
(() => {
  "use strict";
  const canvas = document.querySelector("#packet-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const config = window.GANKBYTE_XP_CONFIG || {};
  const bestKey = "gankbyte-packet-siege-best";
  const lastPlayedKey = "gankbyte-packet-siege-last-played";
  const keys = new Set();
  const touchKeys = new Set();
  const random = (min, max) => Math.random() * (max - min) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));

  let player;
  let enemies = [];
  let bullets = [];
  let enemyBullets = [];
  let powerups = [];
  let bunkers = [];
  let particles = [];
  let floaters = [];
  let score = 0;
  let shots = 0;
  let wave = 1;
  let combo = 1;
  let bestCombo = 1;
  let destroyed = 0;
  let coreHealth = 100;
  let elapsed = 0;
  let formationDirection = 1;
  let formationSpeed = 28;
  let wallCooldown = 0;
  let shootCooldown = 0;
  let enemyShotCooldown = 1.2;
  let waveMessage = 0;
  let screenPulse = 0;
  let running = false;
  let paused = false;
  let lastFrame = 0;
  let lastRun = null;
  let client = null;
  let user = null;
  let activePower = null;
  let powerUntil = 0;
  let weaponMode = "single";
  let weaponUntil = 0;
  let shieldCharges = 0;

  const typeInfo = {
    basic: { label: "BASIC", color: "#c6ff3d", hp: 1, value: 100, width: 24, height: 18 },
    fast: { label: "FAST", color: "#b55cff", hp: 1, value: 150, width: 22, height: 17 },
    tank: { label: "TANK", color: "#f7d35b", hp: 3, value: 300, width: 30, height: 22 },
    shooter: { label: "SHOOTER", color: "#ff526b", hp: 2, value: 250, width: 28, height: 21 },
    splitter: { label: "SPLITTER", color: "#55e8ff", hp: 2, value: 350, width: 28, height: 21 },
    shielded: { label: "SHIELDED", color: "#f2f5ff", hp: 3, value: 400, width: 30, height: 22 },
    fragment: { label: "FRAGMENT", color: "#55e8ff", hp: 1, value: 60, width: 13, height: 12 },
    boss: { label: "BOSS", color: "#ff526b", hp: 30, value: 3000, width: 86, height: 42 }
  };

  function format(value) { return Math.round(value || 0).toLocaleString(); }
  function localBest() { return Number(localStorage.getItem(bestKey) || 0); }
  function burst(x, y, color, amount = 14) {
    for (let i = 0; i < amount; i += 1) {
      const angle = random(0, Math.PI * 2);
      const speed = random(30, 170);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.25, .75), color, size: random(1.5, 4) });
    }
  }
  function floatText(x, y, text, color = "#c6ff3d") { floaters.push({ x, y, text, color, life: 1 }); }
  function centerText(text, subtext = "", duration = 1.5) {
    const message = $("packet-message");
    message.hidden = false;
    message.querySelector("strong").textContent = text;
    message.querySelector("span").textContent = subtext;
    waveMessage = duration;
  }
  function updateHud() {
    $("packet-score").textContent = format(score);
    $("packet-wave").textContent = wave;
    $("packet-combo").textContent = `x${combo}`;
    $("packet-destroyed").textContent = destroyed;
    $("packet-core").textContent = `${Math.max(0, Math.round(coreHealth))}%`;
    $("packet-power").textContent = weaponMode !== "single" && weaponUntil > elapsed ? weaponMode.toUpperCase() : activePower && powerUntil > elapsed ? activePower.toUpperCase() : shieldCharges ? `SHIELD x${shieldCharges}` : "NONE";
  }
  function createEnemy(type, x, y, extra = {}) {
    const info = typeInfo[type];
    return { type, x, y, width: info.width, height: info.height, hp: info.hp + (type === "boss" ? Math.floor(wave / 5) * 2 : 0), maxHp: info.hp + (type === "boss" ? Math.floor(wave / 5) * 2 : 0), phase: random(0, 7), shieldUntil: 0, ...extra };
  }
  function createBunkers() {
    const pattern = ["00111100", "11111111", "11111111", "11100111"];
    return [WIDTH * .25, WIDTH * .5, WIDTH * .75].map((x) => ({
      x, y: HEIGHT - 148, cell: 12,
      cells: pattern.flatMap((row, rowIndex) => [...row].map((value, colIndex) => ({ row: rowIndex, col: colIndex, hp: value === "1" ? 3 : 0 })))
    }));
  }
  function damageBunker(x, y, amount = 1) {
    for (const bunker of bunkers) {
      for (const cell of bunker.cells) {
        if (cell.hp <= 0) continue;
        const cx = bunker.x - 48 + cell.col * bunker.cell + bunker.cell / 2;
        const cy = bunker.y + cell.row * bunker.cell + bunker.cell / 2;
        if (x >= cx - bunker.cell / 2 && x <= cx + bunker.cell / 2 && y >= cy - bunker.cell / 2 && y <= cy + bunker.cell / 2) {
          cell.hp = Math.max(0, cell.hp - amount);
          burst(cx, cy, cell.hp ? "#55e8ff" : "#ff526b", cell.hp ? 3 : 8);
          return true;
        }
      }
    }
    return false;
  }
  function drawBunkers() {
    bunkers.forEach((bunker) => {
      bunker.cells.forEach((cell) => {
        if (cell.hp <= 0) return;
        const x = bunker.x - 48 + cell.col * bunker.cell;
        const y = bunker.y + cell.row * bunker.cell;
        ctx.fillStyle = cell.hp === 3 ? "#55e8ff" : cell.hp === 2 ? "#3daabd" : "#296a78";
        ctx.shadowBlur = cell.hp === 3 ? 9 : 0; ctx.shadowColor = "#55e8ff";
        ctx.fillRect(x + 1, y + 1, bunker.cell - 2, bunker.cell - 2);
      });
      ctx.shadowBlur = 0; ctx.fillStyle = "#55e8ff"; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.fillText("COVER", bunker.x, bunker.y - 8);
    });
  }
  function chooseType(row, col) {
    if (wave < 2) return "basic";
    if (wave < 3) return row === 0 ? "fast" : "basic";
    if (wave < 4) return row === 0 ? "shooter" : row === 1 ? "fast" : "basic";
    const pool = ["basic", "basic", "fast", "tank", "shooter", "splitter"];
    if (wave >= 6) pool.push("shielded");
    return pool[(row * 3 + col + wave) % pool.length];
  }
  function spawnWave() {
    enemies = [];
    bullets = [];
    enemyBullets = [];
    formationDirection = wave % 2 ? 1 : -1;
    formationSpeed = 25 + wave * 3;
    const rows = Math.min(5, 3 + Math.floor((wave - 1) / 2));
    const cols = Math.min(11, 7 + Math.floor(wave / 3));
    const spacing = 62;
    const startX = WIDTH / 2 - ((cols - 1) * spacing) / 2;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const type = chooseType(row, col);
        enemies.push(createEnemy(type, startX + col * spacing, 72 + row * 42));
      }
    }
    if (wave % 5 === 0) enemies.push(createEnemy("boss", WIDTH / 2, 38, { boss: true, phase: 0 }));
    waveMessage = 1.4;
    centerText(`WAVE ${wave}`, wave % 5 === 0 ? "BOSS PACKET DETECTED" : "Formation incoming. Defend the core.", 1.4);
    updateHud();
  }
  function reset() {
    running = false;
    paused = false;
    elapsed = 0;
    score = 0;
    shots = 0;
    wave = 1;
    combo = 1;
    bestCombo = 1;
    destroyed = 0;
    coreHealth = 100;
    activePower = null;
    powerUntil = 0;
    weaponMode = "single";
    weaponUntil = 0;
    shieldCharges = 0;
    player = { x: WIDTH / 2, y: HEIGHT - 62, width: 28, height: 22, speed: 390, invulnerable: 0 };
    enemies = [];
    bullets = [];
    enemyBullets = [];
    powerups = [];
    bunkers = createBunkers();
    particles = [];
    floaters = [];
    $("packet-pause").hidden = true;
    $("packet-restart").hidden = true;
    $("packet-result").hidden = true;
    $("packet-message").hidden = false;
    document.querySelector("#packet-message strong").textContent = "READY?";
    document.querySelector("#packet-message span").textContent = "Move the cannon, shoot the packets, and keep the core alive. Press Start run to begin.";
    updateHud();
  }
  function start() {
    if (running && paused) { paused = false; $("packet-pause").textContent = "Pause  ‖"; return; }
    if (running) return;
    reset();
    running = true;
    $("packet-message").hidden = true;
    $("packet-start").hidden = true;
    $("packet-pause").hidden = false;
    $("packet-restart").hidden = false;
    $("packet-status").textContent = "Protect the core. Close packets are worth more.";
    spawnWave();
    canvas.focus();
  }
  function togglePause() {
    if (!running) return;
    paused = !paused;
    $("packet-pause").textContent = paused ? "Resume  ▶" : "Pause  ‖";
    $("packet-board").classList.toggle("is-paused", paused);
    if (paused) centerText("PAUSED", "Resume when you are ready.", 999);
    else $("packet-message").hidden = true;
  }
  function movePlayer(direction, dt) { player.x = clamp(player.x + direction * player.speed * dt, 28, WIDTH - 28); }
  function fire() {
    if (!running || paused || shootCooldown > 0) return;
    const rapid = activePower === "rapid" && powerUntil > elapsed;
    shootCooldown = rapid ? .13 : .31;
    const mode = weaponMode !== "single" && weaponUntil > elapsed ? weaponMode : "single";
    const offsets = mode === "double" ? [-9, 9] : mode === "triple" ? [-14, 0, 14] : [0];
    offsets.forEach((offset) => bullets.push({ x: player.x + offset, y: player.y - 20, speed: mode === "rocket" ? 470 : 620, rocket: mode === "rocket", pierce: activePower === "pierce" && powerUntil > elapsed, hit: new Set() }));
    burst(player.x, player.y - 20, "#c6ff3d", 3);
    shots += 1;
  }
  function damageCore(amount) {
    if (shieldCharges > 0) { shieldCharges -= 1; floatText(WIDTH / 2, HEIGHT - 90, "SHIELD", "#55e8ff"); burst(WIDTH / 2, HEIGHT - 45, "#55e8ff", 20); return; }
    coreHealth = Math.max(0, coreHealth - amount);
    combo = 1;
    screenPulse = .35;
    floatText(WIDTH / 2, HEIGHT - 90, `-${amount}% CORE`, "#ff526b");
    if (coreHealth <= 0) finish("CORE LOST");
  }
  function hitPlayer() {
    if (player.invulnerable > 0) return;
    if (shieldCharges > 0) { shieldCharges -= 1; player.invulnerable = .6; floatText(player.x, player.y - 24, "SHIELD", "#55e8ff"); return; }
    player.invulnerable = 1.2;
    combo = 1;
    score = Math.max(0, score - 100);
    floatText(player.x, player.y - 24, "CANNON HIT", "#ff526b");
    burst(player.x, player.y, "#ff526b", 20);
  }
  function spawnPowerup(x, y) {
    if (powerups.length >= 3 || Math.random() > .1) return;
    const types = ["rapid", "pierce", "lightning", "shield", "bomb", "overdrive", "rocket", "double", "triple"];
    powerups.push({ x, y, type: types[Math.floor(random(0, types.length))], speed: 70, pulse: 0 });
  }
  function activatePowerup(item) {
    powerups = powerups.filter((power) => power !== item);
    if (item.type === "bomb") {
      const nearby = enemies.filter((enemy) => enemy.type !== "boss" && Math.abs(enemy.x - player.x) < 190 && enemy.y > 180);
      nearby.forEach((enemy) => destroyEnemy(enemy, false));
      floatText(player.x, player.y - 55, `BOMB ${nearby.length}`, "#f7d35b");
    } else if (item.type === "shield") { shieldCharges = Math.min(3, shieldCharges + 1); }
    else if (["rocket", "double", "triple"].includes(item.type)) { weaponMode = item.type; weaponUntil = elapsed + (item.type === "rocket" ? 8 : 10); }
    else { activePower = item.type; powerUntil = elapsed + (item.type === "overdrive" ? 8 : 6); }
    $("packet-status").textContent = item.type === "rocket" ? "ROCKETS active. Direct hits clear nearby packets." : item.type === "double" ? "DOUBLE MISSILE active." : item.type === "triple" ? "TRIPLE MISSILE active." : `${item.type.toUpperCase()} active.`;
    burst(item.x, item.y, item.type === "overdrive" ? "#f7d35b" : "#55e8ff", 24);
    updateHud();
  }
  function destroyEnemy(enemy, award = true) {
    const index = enemies.indexOf(enemy);
    if (index < 0) return;
    enemies.splice(index, 1);
    const info = typeInfo[enemy.type];
    if (award) {
      const proximity = clamp((enemy.y - 90) / 340, 0, 1);
      const riskMultiplier = 1 + proximity * 2;
      const powerMultiplier = activePower === "overdrive" && powerUntil > elapsed ? 2 : 1;
      const gained = Math.round(info.value * combo * riskMultiplier * powerMultiplier);
      score += gained;
      combo = Math.min(12, combo + 1);
      bestCombo = Math.max(bestCombo, combo);
      destroyed += 1;
      floatText(enemy.x, enemy.y, `+${format(gained)}  x${combo}`, info.color);
      if (enemy.type === "splitter") {
        for (let i = 0; i < 2; i += 1) enemies.push(createEnemy("fragment", enemy.x + (i ? 13 : -13), enemy.y + 14, { vx: i ? 1 : -1 }));
      }
      if (enemy.type === "boss") { score += 5000 * wave; floatText(enemy.x, enemy.y - 25, "BOSS DOWN", "#f7d35b"); }
      spawnPowerup(enemy.x, enemy.y);
    }
    burst(enemy.x, enemy.y, info.color, enemy.type === "boss" ? 50 : 16);
  }
  function damageEnemy(enemy, amount = 1) {
    if (enemy.type === "shielded" && enemy.shieldUntil > elapsed) return false;
    if (enemy.type === "shielded") enemy.shieldUntil = elapsed + 1.1;
    enemy.hp -= amount;
    burst(enemy.x, enemy.y, typeInfo[enemy.type].color, 5);
    if (enemy.hp <= 0) destroyEnemy(enemy);
    return true;
  }
  function collide(a, b) { return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2; }
  function updateFormation(dt) {
    const normal = enemies.filter((enemy) => !enemy.boss);
    const edge = normal.some((enemy) => enemy.x + enemy.width / 2 > WIDTH - 32 || enemy.x - enemy.width / 2 < 32);
    if (edge && wallCooldown <= 0) {
      formationDirection *= -1;
      normal.forEach((enemy) => { enemy.y += 16; });
      wallCooldown = .35;
    }
    normal.forEach((enemy) => {
      const speed = formationSpeed * (enemy.type === "fast" ? 1.65 : enemy.type === "fragment" ? 1.2 : 1);
      if (enemy.type === "fragment") { enemy.x += enemy.vx * speed * dt; enemy.y += (18 + wave) * dt; }
      else enemy.x += formationDirection * speed * dt;
      enemy.phase += dt;
      if (enemy.y + enemy.height / 2 >= HEIGHT - 100) { damageCore(enemy.type === "tank" ? 14 : 8); enemy.y = HEIGHT - 130; }
    });
    enemies.filter((enemy) => enemy.boss).forEach((boss) => {
      boss.x = WIDTH / 2 + Math.sin(elapsed * (.65 + wave * .02)) * (WIDTH / 2 - 120);
      boss.y = 60 + Math.sin(elapsed * 1.3) * 16;
    });
    if (!enemies.length) { wave += 1; spawnWave(); }
  }
  function enemyFire() {
    const shooters = enemies.filter((enemy) => enemy.type === "shooter" || enemy.type === "boss");
    if (!shooters.length) return;
    const enemy = shooters[Math.floor(random(0, shooters.length))];
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.height / 2, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 260, width: 5, height: 13, boss: enemy.type === "boss" });
    if (enemy.type === "boss") {
      enemyBullets.push({ x: enemy.x, y: enemy.y, vx: -120, vy: 240, width: 5, height: 13, boss: true });
      enemyBullets.push({ x: enemy.x, y: enemy.y, vx: 120, vy: 240, width: 5, height: 13, boss: true });
    }
  }
  function update(dt) {
    elapsed += dt;
    shootCooldown = Math.max(0, shootCooldown - dt);
    wallCooldown = Math.max(0, wallCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    waveMessage = Math.max(0, waveMessage - dt);
    screenPulse = Math.max(0, screenPulse - dt);
    if (waveMessage <= 0 && !paused) $("packet-message").hidden = true;
    let direction = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || touchKeys.has("left")) direction -= 1;
    if (keys.has("ArrowRight") || keys.has("d") || touchKeys.has("right")) direction += 1;
    movePlayer(direction, dt);
    updateFormation(dt);
    enemyShotCooldown -= dt;
    if (enemyShotCooldown <= 0) { enemyShotCooldown = Math.max(.42, 1.25 - wave * .025); enemyFire(); }
    bullets = bullets.filter((bullet) => {
      bullet.y -= bullet.speed * dt;
      if (bullet.y < -20) { combo = 1; return false; }
      if (damageBunker(bullet.x, bullet.y)) return false;
      for (const enemy of [...enemies]) {
        if (!bullet.hit.has(enemy) && collide({ x: bullet.x, y: bullet.y, width: 5, height: 16 }, enemy)) {
          bullet.hit.add(enemy);
          const didDamage = damageEnemy(enemy);
          if (bullet.rocket) {
            enemies.filter((other) => other !== enemy && other.type !== "boss" && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 74).forEach((other) => damageEnemy(other));
            burst(enemy.x, enemy.y, "#f7d35b", 26);
            return false;
          }
          if (didDamage && activePower === "lightning" && powerUntil > elapsed) {
            const chain = enemies.find((other) => other !== enemy && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 130);
            if (chain) damageEnemy(chain);
          }
          if (!bullet.pierce) return false;
        }
      }
      return true;
    });
    enemyBullets = enemyBullets.filter((bullet) => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (damageBunker(bullet.x, bullet.y)) return false;
      if (collide({ x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height }, player)) { hitPlayer(); return false; }
      return bullet.y < HEIGHT + 30 && bullet.x > -30 && bullet.x < WIDTH + 30;
    });
    powerups = powerups.filter((item) => {
      item.y += item.speed * dt;
      item.pulse += dt * 5;
      if (Math.hypot(item.x - player.x, item.y - player.y) < 28) { activatePowerup(item); return false; }
      return item.y < HEIGHT - 90;
    });
    particles = particles.filter((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .96; particle.vy *= .96; particle.life -= dt; return particle.life > 0; });
    floaters = floaters.filter((item) => { item.y -= 24 * dt; item.life -= dt; return item.life > 0; });
    updateHud();
  }
  function drawGrid() {
    ctx.fillStyle = "#080b10";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "rgba(32,45,56,.7)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
    for (let y = 0; y <= HEIGHT; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
    const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT - 30, 10, WIDTH / 2, HEIGHT - 30, 230);
    gradient.addColorStop(0, "rgba(85,232,255,.18)"); gradient.addColorStop(1, "rgba(85,232,255,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, HEIGHT - 220, WIDTH, 220);
    ctx.strokeStyle = "rgba(255,82,107,.35)"; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.moveTo(0, HEIGHT - 104); ctx.lineTo(WIDTH, HEIGHT - 104); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ff526b"; ctx.font = "10px monospace"; ctx.fillText("CORE LINE", 16, HEIGHT - 112);
  }
  function drawEnemy(enemy) {
    const info = typeInfo[enemy.type];
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.shadowBlur = enemy.type === "boss" ? 28 : 14; ctx.shadowColor = info.color; ctx.strokeStyle = info.color; ctx.fillStyle = "rgba(11,16,22,.9)"; ctx.lineWidth = 2;
    if (enemy.type === "boss") { ctx.beginPath(); ctx.moveTo(-44, -16); ctx.lineTo(-25, -25); ctx.lineTo(25, -25); ctx.lineTo(44, -16); ctx.lineTo(44, 16); ctx.lineTo(25, 25); ctx.lineTo(-25, 25); ctx.lineTo(-44, 16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = info.color; ctx.font = "bold 12px monospace"; ctx.textAlign = "center"; ctx.fillText("BOSS", 0, 5); ctx.fillStyle = "#ff526b"; ctx.fillRect(-44, -34, 88 * (enemy.hp / enemy.maxHp), 4); }
    else { ctx.beginPath(); ctx.moveTo(0, -info.height / 2); ctx.lineTo(info.width / 2, 0); ctx.lineTo(0, info.height / 2); ctx.lineTo(-info.width / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = info.color; ctx.fillRect(-3, -3, 6, 6); if (enemy.hp < enemy.maxHp) { ctx.fillStyle = "#ff526b"; ctx.fillRect(-info.width / 2, info.height / 2 + 5, info.width * (enemy.hp / enemy.maxHp), 3); } if (enemy.type === "shielded" && enemy.shieldUntil > elapsed) { ctx.strokeStyle = "#55e8ff"; ctx.beginPath(); ctx.arc(0, 0, info.width / 1.4, 0, Math.PI * 2); ctx.stroke(); } }
    ctx.restore();
  }
  function draw() {
    drawGrid();
    enemies.forEach(drawEnemy);
    powerups.forEach((item) => { const info = { rapid:"#c6ff3d", pierce:"#55e8ff", lightning:"#f7d35b", shield:"#55e8ff", bomb:"#ff526b", overdrive:"#b55cff", rocket:"#f7d35b", double:"#55e8ff", triple:"#c6ff3d" }[item.type]; const label = { rocket:"ROC", double:"2X", triple:"3X" }[item.type] || item.type.slice(0, 3).toUpperCase(); ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.pulse); ctx.shadowBlur = 20; ctx.shadowColor = info; ctx.strokeStyle = info; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = info; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.fillText(label, 0, 3); ctx.restore(); });
    drawBunkers();
    bullets.forEach((bullet) => { ctx.fillStyle = bullet.rocket ? "#f7d35b" : "#c6ff3d"; ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle; ctx.fillRect(bullet.x - (bullet.rocket ? 4 : 2), bullet.y - (bullet.rocket ? 14 : 10), bullet.rocket ? 8 : 4, bullet.rocket ? 24 : 18); ctx.shadowBlur = 0; });
    enemyBullets.forEach((bullet) => { ctx.fillStyle = bullet.boss ? "#ff526b" : "#b55cff"; ctx.shadowBlur = 14; ctx.shadowColor = ctx.fillStyle; ctx.fillRect(bullet.x - 2, bullet.y - 7, 4, 14); ctx.shadowBlur = 0; });
    ctx.save(); ctx.translate(player.x, player.y); ctx.globalAlpha = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0 ? .35 : 1; ctx.shadowBlur = 26; ctx.shadowColor = "#55e8ff"; ctx.fillStyle = "#55e8ff"; ctx.strokeStyle = "#c6ff3d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(18, 16); ctx.lineTo(7, 12); ctx.lineTo(0, 20); ctx.lineTo(-7, 12); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#080b10"; ctx.fillRect(-4, 3, 8, 4); if (shieldCharges) { ctx.strokeStyle = "#55e8ff"; ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = "#55e8ff"; ctx.font = "11px monospace"; ctx.textAlign = "center"; ctx.fillText("NETWORK CORE", WIDTH / 2, HEIGHT - 26); ctx.fillStyle = "rgba(85,232,255,.15)"; ctx.fillRect(WIDTH / 2 - 70, HEIGHT - 18, 140, 3); ctx.fillStyle = "#55e8ff"; ctx.fillRect(WIDTH / 2 - 70, HEIGHT - 18, 140 * coreHealth / 100, 3);
    particles.forEach((particle) => { ctx.globalAlpha = clamp(particle.life * 2, 0, 1); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1;
    floaters.forEach((item) => { ctx.globalAlpha = clamp(item.life, 0, 1); ctx.fillStyle = item.color; ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.fillText(item.text, item.x, item.y); }); ctx.globalAlpha = 1;
    if (screenPulse > 0) { ctx.fillStyle = `rgba(255,82,107,${screenPulse * .22})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
  }
  function finish(reason) {
    if (!running) return;
    running = false; paused = false;
    const total = Math.round(score);
    const best = localBest();
    const newBest = total > best;
    if (newBest) localStorage.setItem(bestKey, String(total));
    localStorage.setItem(lastPlayedKey, new Date().toISOString());
    lastRun = { score: total, wave, bestCombo, destroyed, coreHealth: Math.max(0, Math.round(coreHealth)), runSeconds: Math.round(elapsed), xpEarned: Math.min(250, Math.max(25, Math.round(total / 250))), submitted: false };
    $("packet-pause").hidden = true; $("packet-restart").hidden = true; $("packet-start").hidden = false; $("packet-start").textContent = "Start run  →";
    $("packet-result").hidden = false; $("result-score").textContent = format(total); $("result-record").textContent = newBest ? "NEW PERSONAL BEST." : "Run complete. The core held as long as it could."; $("result-mark").textContent = reason; $("result-wave").textContent = wave; $("result-combo").textContent = `x${bestCombo}`; $("result-destroyed").textContent = destroyed; $("result-core").textContent = `${Math.max(0, Math.round(coreHealth))}%`; $("result-rank").textContent = user ? "Posting..." : "Sign in";
    $("packet-status").textContent = newBest ? `New personal best: ${format(total)}.` : `Run ended at wave ${wave}. Best on this device: ${format(Math.max(best, total))}.`;
    centerText(reason, "The core is offline. Check your result and run it again.", 999);
    submitScore();
  }
  async function loadLeaderboard() {
    const body = $("packet-leaderboard-body");
    if (!client) { body.innerHTML = '<tr><td colspan="6">Global scores need the XP backend connection.</td></tr>'; return; }
    const result = await client.from("packet_siege_leaderboard").select("id,display_name,best_score,best_wave,best_combo,best_destroyed").order("best_score", { ascending: false }).limit(25);
    if (result.error) { body.innerHTML = '<tr><td colspan="6">Run the Packet Siege migration to enable scores.</td></tr>'; return; }
    body.innerHTML = result.data?.length ? result.data.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.display_name || "GankByte Player")}</td><td>${format(row.best_score)}</td><td>${row.best_wave}</td><td>x${row.best_combo}</td><td>${row.best_destroyed}</td></tr>`).join("") : '<tr><td colspan="6">No scores yet. Be the first to defend the core.</td></tr>';
    if (lastRun && user) { const rank = (result.data || []).findIndex((row) => row.id === user.id); $("result-rank").textContent = rank >= 0 ? `#${rank + 1}` : "Posted"; }
  }
  async function submitScore() {
    if (!client || !user || !lastRun || lastRun.submitted) return;
    const result = await client.from("packet_siege_scores").insert({ user_id: user.id, score: lastRun.score, wave: lastRun.wave, best_combo: lastRun.bestCombo, packets_destroyed: lastRun.destroyed, core_health: lastRun.coreHealth, run_seconds: lastRun.runSeconds, xp_earned: lastRun.xpEarned, status: "approved" });
    if (result.error) { $("packet-auth-status").textContent = "Score could not be submitted. Run the Packet Siege migration and try again."; return; }
    lastRun.submitted = true; $("packet-auth-status").textContent = "Signed in. Score posted and XP recorded."; await loadLeaderboard();
  }
  async function loadSession(session) {
    user = session?.user || null;
    if (!user) { $("packet-auth-status").textContent = "Sign in with Discord to submit scores."; $("packet-login").hidden = false; $("packet-logout").hidden = true; return; }
    const name = user.user_metadata?.global_name || user.user_metadata?.full_name || "Discord player";
    $("packet-auth-status").textContent = `Signed in as ${name}. Scores post automatically.`; $("packet-login").hidden = true; $("packet-logout").hidden = false; await submitScore();
  }
  async function initOnline() {
    if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) { $("packet-login").disabled = true; return; }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    client.auth.onAuthStateChange((event, session) => window.setTimeout(() => loadSession(session), 0));
    const result = await client.auth.getSession(); await loadSession(result.data.session); await loadLeaderboard();
  }
  function canvasPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left) * WIDTH / rect.width, 0, WIDTH), y: (event.clientY - rect.top) * HEIGHT / rect.height }; }
  canvas.addEventListener("pointerdown", (event) => { if (!running) return; event.preventDefault(); canvas.focus(); if (event.pointerType === "touch") { player.x = canvasPoint(event).x; canvas.setPointerCapture?.(event.pointerId); } fire(); });
  canvas.addEventListener("pointermove", (event) => { if (event.pointerType === "touch" && event.buttons && running) { event.preventDefault(); player.x = canvasPoint(event).x; } });
  document.querySelectorAll("[data-packet-move]").forEach((button) => { const direction = button.dataset.packetMove; const down = (event) => { event.preventDefault(); touchKeys.add(direction); button.classList.add("is-active"); }; const up = (event) => { event.preventDefault(); touchKeys.delete(direction); button.classList.remove("is-active"); }; ["pointerdown"].forEach((type) => button.addEventListener(type, down)); ["pointerup", "pointerleave", "pointercancel"].forEach((type) => button.addEventListener(type, up)); });
  document.querySelector("[data-packet-shoot]").addEventListener("pointerdown", (event) => { event.preventDefault(); fire(); });
  window.addEventListener("keydown", (event) => { if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault(); if (event.key.toLowerCase() === "r") { reset(); start(); return; } if (event.key === "Escape" || event.key.toLowerCase() === "p") { togglePause(); return; } keys.add(event.key); if (event.code === "Space") fire(); });
  window.addEventListener("keyup", (event) => keys.delete(event.key));
  $("packet-start").addEventListener("click", start); $("packet-pause").addEventListener("click", togglePause); $("packet-restart").addEventListener("click", () => { reset(); start(); }); $("packet-run-again").addEventListener("click", () => { reset(); start(); });
  $("packet-help-button").addEventListener("click", () => $("packet-help").showModal()); $("packet-help-close").addEventListener("click", () => $("packet-help").close());
  $("packet-login").addEventListener("click", async () => { if (client) await client.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: window.location.origin + window.location.pathname } }); }); $("packet-logout").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  function frame(timestamp) { const dt = Math.min((timestamp - lastFrame) / 1000 || 0, .05); lastFrame = timestamp; if (running && !paused) update(dt); draw(); requestAnimationFrame(frame); }
  reset(); $("packet-status").textContent = localBest() ? `Best score on this device: ${format(localBest())}.` : "No best score yet. Defend the core."; initOnline().catch(() => { $("packet-auth-status").textContent = "Online scores are unavailable, but local play is ready."; }); requestAnimationFrame(frame);
})();
