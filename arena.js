const board = document.querySelector("#arena-board");
const startButton = document.querySelector("#start-button");
const message = document.querySelector("#arena-message");
const status = document.querySelector("#game-status");
const scoreValue = document.querySelector("#score");
const comboValue = document.querySelector("#combo");
const timeValue = document.querySelector("#time");
const xpValue = document.querySelector("#xp");

let score = 0;
let combo = 0;
let xp = 0;
let time = 30;
let running = false;
let timer;

function updateHud() {
  scoreValue.textContent = score;
  comboValue.textContent = combo;
  timeValue.textContent = time;
  xpValue.textContent = xp;
}

function removeByte() {
  const byte = board.querySelector(".byte");
  if (byte) byte.remove();
}

function spawnByte() {
  removeByte();
  const byte = document.createElement("button");
  const glitch = Math.random() < 0.2;
  byte.className = `byte ${glitch ? "glitch" : "good"}`;
  byte.type = "button";
  byte.textContent = glitch ? "!" : "GB";
  byte.setAttribute("aria-label", glitch ? "Glitch: avoid" : "Good byte: click");
  byte.style.left = `${8 + Math.random() * 78}%`;
  byte.style.top = `${10 + Math.random() * 72}%`;
  byte.addEventListener("click", () => {
    if (!running) return;
    if (glitch) {
      score = Math.max(0, score - 15);
      combo = 0;
      status.textContent = "Glitch hit. Combo reset.";
    } else {
      combo += 1;
      score += 10 + Math.min(combo * 2, 20);
      xp += 5;
      status.textContent = combo > 4 ? "Combo climbing." : "Good byte.";
    }
    updateHud();
    spawnByte();
  });
  board.appendChild(byte);
}

function finishRun() {
  running = false;
  clearInterval(timer);
  removeByte();
  message.hidden = false;
  message.innerHTML = `<strong>RUN COMPLETE</strong><span>${score} points // ${xp} XP earned</span>`;
  startButton.innerHTML = "Run it again  <span>&rarr;</span>";
  const best = Number(localStorage.getItem("gankbyte-byte-rush-best") || 0);
  if (score > best) {
    localStorage.setItem("gankbyte-byte-rush-best", String(score));
    status.textContent = `New best score: ${score}.`;
  } else {
    status.textContent = `Best score on this device: ${Math.max(best, score)}.`;
  }
}

function startRun() {
  score = 0;
  combo = 0;
  xp = 0;
  time = 30;
  running = true;
  message.hidden = true;
  startButton.innerHTML = "Restart run  <span>&rarr;</span>";
  status.textContent = "Catch the bytes.";
  updateHud();
  spawnByte();
  clearInterval(timer);
  timer = setInterval(() => {
    time -= 1;
    updateHud();
    if (time <= 0) finishRun();
  }, 1000);
}

startButton.addEventListener("click", startRun);
updateHud();
