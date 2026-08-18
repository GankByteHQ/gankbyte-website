const canvas = document.querySelector("#arena-canvas");
const ctx = canvas.getContext("2d");
const board = document.querySelector("#arena-board");
const startButton = document.querySelector("#start-button");
const message = document.querySelector("#arena-message");
const status = document.querySelector("#game-status");
const scoreValue = document.querySelector("#score");
const comboValue = document.querySelector("#combo");
const timeValue = document.querySelector("#time");
const waveValue = document.querySelector("#wave");
const livesValue = document.querySelector("#lives");
const boostsValue = document.querySelector("#boosts");
const xpValue = document.querySelector("#xp");
const powerValue = document.querySelector("#power-status");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const touch = new Set();
let pointerTarget = null;
let running = false;
let lastFrame = 0;
let elapsed = 0;
let score = 0;
let combo = 0;
let xp = 0;
let timeLeft = 60;
let runDuration = 60;
let wave = 1;
let lives = 3;
let boosts = 3;
let shield = false;
let overdriveUntil = 0;
let bonus = null;
let nextBonusAt = 0;
let dashQueued = false;
let player;
let pickups = [];
let hazards = [];
let particles = [];

function random(min, max) { return Math.random() * (max - min) + min; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function updateHud() {
  scoreValue.textContent = score;
  comboValue.textContent = combo;
  timeValue.textContent = Math.ceil(timeLeft);
  waveValue.textContent = wave;
  livesValue.textContent = lives;
  boostsValue.textContent = boosts;
  xpValue.textContent = xp;
  if (shield) powerValue.innerHTML = "<strong>POWER:</strong> SHIELD READY";
  else if (overdriveUntil > elapsed) powerValue.innerHTML = `<strong>POWER:</strong> OVERDRIVE ${Math.ceil(overdriveUntil - elapsed)}s`;
  else powerValue.innerHTML = "<strong>POWER:</strong> NONE";
}

function openPosition() {
  return { x: random(50, WIDTH - 50), y: random(55, HEIGHT - 50) };
}

function spawnPickup() {
  const position = openPosition();
  pickups.push({ ...position, anchorX: position.x, anchorY: position.y, pulse: random(0, Math.PI * 2), drift: random(1.2, 2.2), radius: random(15, 20) });
}

function spawnHazard() {
  const edge = Math.floor(random(0, 4));
  const position = edge === 0 ? { x: random(0, WIDTH), y: -25 } : edge === 1 ? { x: WIDTH + 25, y: random(0, HEIGHT) } : edge === 2 ? { x: random(0, WIDTH), y: HEIGHT + 25 } : { x: -25, y: random(0, HEIGHT) };
  hazards.push({ ...position, radius: random(13, 19), speed: random(42, 65) + wave * 9, phase: random(0, 10) });
}

function spawnBonus() {
  const position = openPosition();
  const types = ["shield", "overdrive", "time"];
  bonus = { ...position, anchorX: position.x, anchorY: position.y, pulse: random(0, Math.PI * 2), drift: random(1, 1.5), type: types[Math.floor(random(0, types.length))], expiresAt: elapsed + 11 };
}

function burst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(35, 150);
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.35, .75), maxLife: .75, color, size: random(2, 5) });
  }
}

function resetGame() {
  elapsed = 0;
  score = 0;
  combo = 0;
  xp = 0;
  timeLeft = 60;
  runDuration = 60;
  wave = 1;
  lives = 3;
  boosts = 3;
  shield = false;
  overdriveUntil = 0;
  bonus = null;
  nextBonusAt = random(8, 13);
  dashQueued = false;
  pointerTarget = null;
  player = { x: WIDTH / 2, y: HEIGHT / 2, radius: 15, invulnerable: 0, angle: -Math.PI / 2, speed: 260 };
  pickups = [];
  hazards = [];
  particles = [];
  for (let i = 0; i < 7; i += 1) spawnPickup();
  for (let i = 0; i < 3; i += 1) spawnHazard();
  updateHud();
}

function moveVector() {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || touch.has("left")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || touch.has("right")) x += 1;
  if (keys.has("ArrowUp") || keys.has("w") || touch.has("up")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || touch.has("down")) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, moving: x !== 0 || y !== 0 };
}

function dash() {
  if (!running || boosts <= 0) {
    if (running) status.textContent = "No boosts left. Survive without it.";
    return;
  }
  const direction = moveVector();
  const x = direction.moving ? direction.x : Math.cos(player.angle);
  const y = direction.moving ? direction.y : Math.sin(player.angle);
  player.x = clamp(player.x + x * 105, player.radius, WIDTH - player.radius);
  player.y = clamp(player.y + y * 105, player.radius, HEIGHT - player.radius);
  player.invulnerable = .55;
  boosts -= 1;
  burst(player.x, player.y, "#c6ff3d", 18);
  status.textContent = "Dash engaged.";
}

function update(dt) {
  elapsed += dt;
  timeLeft = Math.max(0, runDuration - elapsed);
  wave = Math.min(4, 1 + Math.floor(elapsed / 15));
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (dashQueued) { dash(); dashQueued = false; }

  if (!bonus && elapsed >= nextBonusAt) spawnBonus();
  if (bonus) {
    bonus.pulse += dt * 4;
    bonus.anchorX += Math.cos(bonus.pulse * .29) * dt * 5;
    bonus.anchorY += Math.sin(bonus.pulse * .23) * dt * 5;
    bonus.x = clamp(bonus.anchorX + Math.cos(bonus.pulse * bonus.drift) * 26, 28, WIDTH - 28);
    bonus.y = clamp(bonus.anchorY + Math.sin(bonus.pulse * bonus.drift) * 26, 28, HEIGHT - 28);
    if (distance(player, bonus) < player.radius + 20) collectBonus();
    else if (elapsed >= bonus.expiresAt) {
      bonus = null;
      nextBonusAt = elapsed + random(8, 14);
    }
  }

  const direction = moveVector();
  if (direction.moving) {
    player.x = clamp(player.x + direction.x * player.speed * dt, player.radius, WIDTH - player.radius);
    player.y = clamp(player.y + direction.y * player.speed * dt, player.radius, HEIGHT - player.radius);
    player.angle = Math.atan2(direction.y, direction.x);
    pointerTarget = null;
  } else if (pointerTarget) {
    const dx = pointerTarget.x - player.x;
    const dy = pointerTarget.y - player.y;
    const distanceToTarget = Math.hypot(dx, dy);
    if (distanceToTarget < 8) {
      pointerTarget = null;
    } else {
      player.x = clamp(player.x + (dx / distanceToTarget) * player.speed * dt, player.radius, WIDTH - player.radius);
      player.y = clamp(player.y + (dy / distanceToTarget) * player.speed * dt, player.radius, HEIGHT - player.radius);
      player.angle = Math.atan2(dy, dx);
    }
  }

  const targetHazards = 2 + wave * 2;
  if (hazards.length < targetHazards && Math.random() < dt * 1.4) spawnHazard();
  hazards.forEach((hazard) => {
    const angle = Math.atan2(player.y - hazard.y, player.x - hazard.x);
    hazard.x += Math.cos(angle) * hazard.speed * dt;
    hazard.y += Math.sin(angle) * hazard.speed * dt;
    hazard.phase += dt * 5;
    if (distance(player, hazard) < player.radius + hazard.radius) {
      if (player.invulnerable <= 0) {
        if (shield) {
          shield = false;
          player.invulnerable = 1.1;
          burst(player.x, player.y, "#55e8ff", 28);
          status.textContent = "Shield absorbed the hit.";
        } else {
          lives -= 1;
          combo = 0;
          score = Math.max(0, score - 25);
          player.invulnerable = 1.2;
          burst(player.x, player.y, "#ff855c", 24);
          status.textContent = lives ? "Glitch impact. Keep moving." : "Signal lost.";
          if (!lives) finishGame();
        }
        hazard.x += Math.cos(angle) * -75;
        hazard.y += Math.sin(angle) * -75;
        updateHud();
      }
    }
  });

  let collected = 0;
  pickups = pickups.filter((pickup) => {
    pickup.pulse += dt * 4;
    pickup.anchorX += Math.cos(pickup.pulse * .37) * dt * 4;
    pickup.anchorY += Math.sin(pickup.pulse * .31) * dt * 4;
    pickup.x = clamp(pickup.anchorX + Math.cos(pickup.pulse * pickup.drift) * 22, 28, WIDTH - 28);
    pickup.y = clamp(pickup.anchorY + Math.sin(pickup.pulse * pickup.drift) * 22, 28, HEIGHT - 28);
    if (distance(player, pickup) < player.radius + 13) {
      combo += 1;
      const value = (50 + Math.min(combo * 10, 100)) * (overdriveUntil > elapsed ? 2 : 1);
      score += value;
      xp += 10;
      burst(pickup.x, pickup.y, "#c6ff3d", 16);
      if (combo % 5 === 0 && hazards.length < 10) {
        spawnHazard();
        status.textContent = `Combo x${combo}: another glitch entered.`;
      } else {
        status.textContent = combo > 4 ? `Combo x${combo}.` : "Signal secured.";
      }
      collected += 1;
      updateHud();
      return false;
    }
    return true;
  });
  for (let i = 0; i < collected; i += 1) spawnPickup();

  particles = particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= .96;
    particle.vy *= .96;
    particle.life -= dt;
    return particle.life > 0;
  });
  updateHud();
  if (timeLeft <= 0) finishGame();
}

function collectBonus() {
  const collected = bonus;
  bonus = null;
  nextBonusAt = elapsed + random(10, 16);
  score += 100;
  xp += 25;
  if (collected.type === "shield") {
    shield = true;
    status.textContent = "Shield ready: blocks one hit.";
    burst(collected.x, collected.y, "#55e8ff", 28);
  } else if (collected.type === "overdrive") {
    overdriveUntil = Math.max(overdriveUntil, elapsed) + 6;
    status.textContent = "Overdrive active: collection score doubled.";
    burst(collected.x, collected.y, "#ff855c", 28);
  } else {
    runDuration += 8;
    status.textContent = "Time shard collected: +8 seconds.";
    burst(collected.x, collected.y, "#9a7bff", 28);
  }
  updateHud();
}

function drawGrid() {
  ctx.fillStyle = "#0d1015";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(244,242,234,.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
  for (let y = 0; y <= HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, 390);
  glow.addColorStop(0, "rgba(154,123,255,.12)");
  glow.addColorStop(1, "rgba(154,123,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawPickup(pickup) {
  const pulse = 1 + Math.sin(pickup.pulse) * .12;
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.rotate(pickup.pulse * .45);
  ctx.strokeStyle = "rgba(198,255,61,.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 22 + Math.sin(pickup.pulse * 1.5) * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(Math.PI / 4);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#c6ff3d";
  ctx.fillStyle = "#c6ff3d";
  ctx.fillRect(-pickup.radius * pulse, -pickup.radius * pulse, pickup.radius * 2 * pulse, pickup.radius * 2 * pulse);
  ctx.restore();
  ctx.fillStyle = "#0a0b0f";
  ctx.font = "bold 9px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GB", pickup.x, pickup.y + 3);
}

function drawHazard(hazard) {
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.rotate(hazard.phase);
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#9a7bff";
  ctx.strokeStyle = "#9a7bff";
  ctx.fillStyle = "rgba(154,123,255,.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -hazard.radius);
  ctx.lineTo(hazard.radius, 0);
  ctx.lineTo(0, hazard.radius);
  ctx.lineTo(-hazard.radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBonus() {
  if (!bonus) return;
  const styles = { shield: { color: "#55e8ff", label: "S" }, overdrive: { color: "#ff855c", label: "2X" }, time: { color: "#9a7bff", label: "+8" } };
  const style = styles[bonus.type];
  ctx.save();
  ctx.translate(bonus.x, bonus.y);
  ctx.rotate(-bonus.pulse * .35);
  ctx.shadowBlur = 28;
  ctx.shadowColor = style.color;
  ctx.strokeStyle = style.color;
  ctx.fillStyle = `${style.color}33`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(19, -9);
  ctx.lineTo(19, 9);
  ctx.lineTo(0, 22);
  ctx.lineTo(-19, 9);
  ctx.lineTo(-19, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = style.color;
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(style.label, bonus.x, bonus.y + 3);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.globalAlpha = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0 ? .42 : 1;
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#c6ff3d";
  ctx.fillStyle = "#c6ff3d";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 17);
  ctx.lineTo(0, 11);
  ctx.lineTo(-16, 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#0a0b0f";
  ctx.beginPath();
  ctx.arc(0, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  drawGrid();
  pickups.forEach(drawPickup);
  drawBonus();
  hazards.forEach(drawHazard);
  drawParticles();
  if (player) drawPlayer();
  ctx.fillStyle = "rgba(198,255,61,.7)";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`BOOSTS ${boosts}/3`, 18, HEIGHT - 18);
}

function finishGame() {
  if (!running) return;
  running = false;
  const best = Number(localStorage.getItem("gankbyte-byte-rush-best") || 0);
  const newBest = score > best;
  if (newBest) localStorage.setItem("gankbyte-byte-rush-best", String(score));
  message.hidden = false;
  message.innerHTML = `<strong>${lives ? "RUN COMPLETE" : "SIGNAL LOST"}</strong><span>${score} points // ${xp} XP // wave ${wave}</span>`;
  startButton.innerHTML = "Run it again  <span>&rarr;</span>";
  status.textContent = newBest ? `New best score: ${score}.` : `Best score on this device: ${Math.max(best, score)}.`;
}

function startGame() {
  resetGame();
  running = true;
  message.hidden = true;
  startButton.innerHTML = "Restart run  <span>&rarr;</span>";
  status.textContent = "Collect bytes. Dodge glitches.";
  canvas.focus();
}

function frame(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000 || 0, .05);
  lastFrame = timestamp;
  if (running) update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (event.key === " ") { dashQueued = true; return; }
  keys.add(event.key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key));
function setPointerTarget(event) {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  pointerTarget = { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height };
}
canvas.addEventListener("pointerdown", (event) => { setPointerTarget(event); canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener("pointermove", (event) => { if (event.buttons) setPointerTarget(event); });
canvas.addEventListener("pointerup", () => { pointerTarget = null; });
startButton.addEventListener("click", startGame);
document.querySelectorAll("[data-dir]").forEach((button) => {
  const direction = button.dataset.dir;
  const press = (event) => { event.preventDefault(); if (direction === "dash") dashQueued = true; else touch.add(direction); };
  const release = (event) => { event.preventDefault(); touch.delete(direction); };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
});

resetGame();
requestAnimationFrame(frame);
