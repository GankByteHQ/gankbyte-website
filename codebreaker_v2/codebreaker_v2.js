(function () {
  const STORAGE_KEY = "gankbyte-codebreaker-v2";
  const root = document.querySelector(".codebreaker-page");
  if (!root) return;

  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const actionButtons = [...document.querySelectorAll("[data-action]")];
  const campaignMap = document.getElementById("campaign-map");
  const campaignNote = document.getElementById("campaign-note");
  const runIntro = document.getElementById("run-intro");
  const runShell = document.getElementById("run-shell");
  const powerupBar = document.getElementById("powerup-bar");
  const gameStatus = document.getElementById("game-status");
  const achievementList = document.getElementById("achievement-list");
  const runBoard = document.getElementById("run-board");
  const statRank = document.getElementById("stat-rank");
  const statXp = document.getElementById("stat-xp");
  const statScore = document.getElementById("stat-score");
  const statCombo = document.getElementById("stat-combo");
  const statTrace = document.getElementById("stat-trace");
  const statLives = document.getElementById("stat-lives");
  const statPower = document.getElementById("stat-power");
  const statRun = document.getElementById("stat-run");
  const profileName = document.getElementById("profile-name");
  const profileHandle = document.getElementById("profile-handle");
  const profileRank = document.getElementById("profile-rank");
  const profileLevel = document.getElementById("profile-level");
  const profileWins = document.getElementById("profile-wins");
  const profileLosses = document.getElementById("profile-losses");
  const dailyTitle = document.getElementById("daily-title");
  const dailyCopy = document.getElementById("daily-copy");

  const RANKS = [
    { name: "Script Kiddie", xp: 0 },
    { name: "Byte Sprinter", xp: 180 },
    { name: "Terminal Tinkerer", xp: 420 },
    { name: "Loop Runner", xp: 760 },
    { name: "Patch Hunter", xp: 1200 },
    { name: "Signal Breaker", xp: 1800 },
    { name: "Ghost Debugger", xp: 2600 },
    { name: "Root Access", xp: 3600 }
  ];

  const ACHIEVEMENTS = [
    { id: "first-clear", name: "First clear", hint: "Finish any campaign node." },
    { id: "combo-5", name: "Combo x5", hint: "Build a clean five-hit streak." },
    { id: "combo-10", name: "Combo x10", hint: "Keep the run alive through ten wins." },
    { id: "daily-clear", name: "Daily discipline", hint: "Finish the daily run." },
    { id: "flawless", name: "No trace", hint: "Finish a run without taking a hit." }
  ];

  const LEVEL_TYPES = ["binary_hex", "bug_hunt", "logic", "code_repair", "password", "code_order", "memory", "reaction"];
  const CODE_ORDER_LINES = [
    [
      ["const total = score + bonus;", "const bonus = combo * 12;", "if (combo > 3) score += 4;", "return total;"],
      "Construct the scoring loop."
    ],
    [
      ["const gate = lanes[currentLane];", "if (!gate) return false;", "score += gate.value;", "return true;"],
      "Build the lane check."
    ],
    [
      ["const answer = input.value.trim();", "if (answer === correct) win();", "loseLife();", "return answer;"],
      "Order the resolve flow."
    ]
  ];

  const BUG_HUNT_LINES = [
    [
      ["const lane = gates[currentLane];", "if (lane = null) return;", "score += lane.value;", "return lane;"],
      2,
      "Which line breaks the lane check?"
    ],
    [
      ["const keepAlive = trace < 100;", "if (keepAlive) lives += 1;", "else bust();", "return keepAlive;"],
      2,
      "Which line should be the bug fix?"
    ],
    [
      ["const next = queue.shift();", "if (!next) return;", "render(next);", "queue.push(next);"],
      4,
      "Which line is wrong for the queue?"
    ]
  ];

  const REPAIR_LINES = [
    {
      broken: "if (trace > 50) freeze();",
      choices: ["if (trace >= 50) freeze();", "if (trace < 50) freeze();", "if trace > 50 freeze();", "freeze(trace > 50);"],
      answer: 0,
      prompt: "Choose the line that repairs the trace guard."
    },
    {
      broken: "const score = combo 10;",
      choices: ["const score = combo * 10;", "const score = combo + 10;", "const score = combo / 10;", "const score = combo - 10;"],
      answer: 0,
      prompt: "Choose the corrected score line."
    },
    {
      broken: "return lanes[currentLane];",
      choices: ["return lanes[currentLane].safe;", "return lanes[currentLane] safe;", "return lane[currentLane];", "return lanes[currentLane] && safe;"],
      answer: 0,
      prompt: "Choose the corrected return statement."
    }
  ];

  const LOGIC_QUESTIONS = [
    { q: "What is decimal 10 in binary?", a: 1, c: ["101", "1010", "1110", "1101"] },
    { q: "Which gate outputs true only when both inputs are true?", a: 0, c: ["AND", "OR", "XOR", "NOT"] },
    { q: "What is 7 + 5?", a: 2, c: ["10", "11", "12", "13"] },
    { q: "Which port is the default for HTTPS?", a: 3, c: ["21", "53", "80", "443"] },
    { q: "What comes next: 2, 4, 8, 16, ?", a: 1, c: ["18", "32", "24", "20"] }
  ];

  const PASSWORDS = [
    { answer: "freeze", clue: "The power-up that pauses the timer." },
    { answer: "shield", clue: "The power-up that blocks one hit." },
    { answer: "overdrive", clue: "The boost that doubles collection score." },
    { answer: "gankbyte", clue: "The brand on the masthead." },
    { answer: "trace", clue: "The meter that fills when the run goes wrong." }
  ];

  const SYMBOLS = ["▲", "●", "■", "◆", "✦", "⬢", "✚", "✖"];
  const DAILY_LABEL = "Daily Hack";
  const MAX_CAMPAIGN = 30;

  const defaultState = () => ({
    alias: "SYSTEM",
    xp: 0,
    scoreBest: 0,
    totals: { wins: 0, fails: 0, campaign: 0, quick: 0, endless: 0, daily: 0 },
    campaign: { unlocked: 1, cleared: [], stars: {} },
    daily: { date: "", streak: 0, completed: false, best: 0 },
    achievements: [],
    powerups: { skip: 2, freeze: 2, reveal: 2, shield: 1, wipe: 1 },
    history: [],
    profile: { displayName: "SYSTEM", handle: "@system" }
  });

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        campaign: { ...defaultState().campaign, ...(parsed.campaign || {}) },
        daily: { ...defaultState().daily, ...(parsed.daily || {}) },
        totals: { ...defaultState().totals, ...(parsed.totals || {}) },
        powerups: { ...defaultState().powerups, ...(parsed.powerups || {}) },
        profile: { ...defaultState().profile, ...(parsed.profile || {}) }
      };
    } catch {
      return defaultState();
    }
  };

  const state = loadState();
  let session = null;
  let lastTick = performance.now();
  let reactionTimeout = null;
  let memoryTimeout = null;

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalize(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function seedFromString(value) {
    let hash = 1779033703 ^ value.length;
    for (let i = 0; i < value.length; i++) {
      hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
      hash = hash << 13 | hash >>> 19;
    }
    return () => {
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function rankForXp(xp) {
    let current = RANKS[0];
    let next = RANKS[1] || RANKS[0];
    for (const rank of RANKS) {
      if (xp >= rank.xp) current = rank;
    }
    for (const rank of RANKS) {
      if (rank.xp > xp) { next = rank; break; }
    }
    return {
      current,
      next,
      pct: next.xp === current.xp ? 1 : Math.max(0, Math.min(1, (xp - current.xp) / (next.xp - current.xp)))
    };
  }

  function campaignLevelInfo(index) {
    const namePool = [
      "Boot Sector", "Patch Bay", "Loop Hole", "Ghost Lane", "Checksum", "Latch Key",
      "Sandbox", "Kernel Drift", "Signal Loss", "Null Route"
    ];
    const type = LEVEL_TYPES[(index - 1) % LEVEL_TYPES.length];
    const difficulty = Math.min(6, 1 + Math.floor((index - 1) / 5));
    const boss = index % 10 === 0;
    return {
      index,
      type,
      difficulty,
      name: `${namePool[(index - 1) % namePool.length]} ${String(index).padStart(2, "0")}`,
      boss,
      timeLimit: boss ? 14 : Math.max(10, 22 - difficulty * 2)
    };
  }

  function campaignNodes() {
    return Array.from({ length: MAX_CAMPAIGN }, (_, i) => campaignLevelInfo(i + 1));
  }

  function addHistory(entry) {
    state.history.unshift(entry);
    state.history = state.history.slice(0, 30);
  }

  function updateAchievements() {
    const unlocked = new Set(state.achievements);
    if (state.totals.wins > 0) unlocked.add("first-clear");
    if (state.history.some((row) => row.combo >= 5)) unlocked.add("combo-5");
    if (state.history.some((row) => row.combo >= 10)) unlocked.add("combo-10");
    if (state.daily.streak > 0) unlocked.add("daily-clear");
    if (state.history.some((row) => row.trace === 0 && row.result === "clear")) unlocked.add("flawless");
    state.achievements = [...unlocked];
  }

  function unlockPowerup(type, amount = 1) {
    state.powerups[type] = Math.max(0, (state.powerups[type] || 0) + amount);
  }

  function spendPowerup(type) {
    if ((state.powerups[type] || 0) <= 0) return false;
    state.powerups[type] -= 1;
    persist();
    renderAll();
    return true;
  }

  function createChallenge(mode, index) {
    const seedValue = `${mode}:${index}:${state.xp}:${state.campaign.unlocked}:${dateKey()}`;
    const rng = seedFromString(seedValue);
    const difficulty = mode === "campaign"
      ? campaignLevelInfo(index).difficulty
      : mode === "quick"
        ? 2 + Math.min(3, Math.floor(index / 2))
        : mode === "daily"
          ? 2 + Math.floor(index / 2)
          : 1 + Math.min(5, Math.floor(index / 3));
    const type = mode === "campaign"
      ? campaignLevelInfo(index).type
      : pick(rng, LEVEL_TYPES);
    const timeLimit = mode === "reaction" ? 8 : Math.max(8, 22 - difficulty * 2);

    if (type === "binary_hex") return createBinaryChallenge(rng, difficulty, timeLimit);
    if (type === "bug_hunt") return createBugChallenge(rng, difficulty, timeLimit);
    if (type === "code_repair") return createRepairChallenge(rng, difficulty, timeLimit);
    if (type === "code_order") return createOrderChallenge(rng, difficulty, timeLimit);
    if (type === "password") return createPasswordChallenge(rng, difficulty, timeLimit);
    if (type === "logic") return createLogicChallenge(rng, difficulty, timeLimit);
    if (type === "memory") return createMemoryChallenge(rng, difficulty, timeLimit);
    return createReactionChallenge(rng, difficulty, timeLimit);
  }

  function createBinaryChallenge(rng, difficulty, timeLimit) {
    const value = randInt(rng, 7 + difficulty * 4, 30 + difficulty * 18);
    const useHex = difficulty >= 3 && rng() > 0.45;
    const encoded = useHex ? value.toString(16).toUpperCase() : value.toString(2);
    const prompt = useHex ? `Decode 0x${encoded} into decimal.` : `Decode 0b${encoded} into decimal.`;
    const choices = [...new Set([
      value,
      value + randInt(rng, 2, 5),
      value - randInt(rng, 1, 4),
      value + randInt(rng, 6, 9)
    ])].filter((item) => item > 0).slice(0, 4);
    while (choices.length < 4) choices.push(value + choices.length + 1);
    return {
      type: "binary_hex",
      label: "Binary / Hex",
      prompt,
      timeLimit,
      points: 30 + difficulty * 10,
      answer: String(value),
      choices: shuffle(rng, choices.map(String))
    };
  }

  function createBugChallenge(rng, difficulty, timeLimit) {
    const [lines, answer, prompt] = pick(rng, BUG_HUNT_LINES);
    return {
      type: "bug_hunt",
      label: "Bug hunt",
      prompt,
      timeLimit,
      points: 35 + difficulty * 10,
      answer: String(answer),
      lines
    };
  }

  function createRepairChallenge(rng, difficulty, timeLimit) {
    const item = pick(rng, REPAIR_LINES);
    return {
      type: "code_repair",
      label: "Code repair",
      prompt: item.prompt,
      timeLimit,
      points: 35 + difficulty * 10,
      answer: item.choices[item.answer],
      broken: item.broken,
      choices: item.choices
    };
  }

  function createOrderChallenge(rng, difficulty, timeLimit) {
    const [lines, prompt] = pick(rng, CODE_ORDER_LINES);
    const indexed = lines.map((text, index) => ({ key: String.fromCharCode(65 + index), text }));
    const shuffled = shuffle(rng, indexed);
    return {
      type: "code_order",
      label: "Code order",
      prompt: `${prompt} Type the correct line order using the labels shown.`,
      timeLimit,
      points: 40 + difficulty * 10,
      answer: indexed.map((item) => item.key).join(" "),
      items: shuffled
    };
  }

  function createPasswordChallenge(rng, difficulty, timeLimit) {
    const item = pick(rng, PASSWORDS);
    const hint = difficulty >= 4
      ? `Hint: ${item.answer.slice(0, 2)}${"•".repeat(Math.max(0, item.answer.length - 4))}${item.answer.slice(-2)}`
      : `Hint: ${item.clue}`;
    return {
      type: "password",
      label: "Password",
      prompt: item.clue,
      hint,
      timeLimit,
      points: 30 + difficulty * 10,
      answer: item.answer
    };
  }

  function createLogicChallenge(rng, difficulty, timeLimit) {
    const item = pick(rng, LOGIC_QUESTIONS);
    return {
      type: "logic",
      label: "Logic",
      prompt: item.q,
      timeLimit,
      points: 30 + difficulty * 10,
      answer: item.c[item.a],
      choices: shuffle(rng, [...item.c])
    };
  }

  function createMemoryChallenge(rng, difficulty, timeLimit) {
    const length = Math.min(8, 4 + Math.floor(difficulty / 2));
    const sequence = Array.from({ length }, () => pick(rng, SYMBOLS)).join(" ");
    return {
      type: "memory",
      label: "Memory",
      prompt: "Watch the sequence, then type it back exactly as shown.",
      timeLimit,
      points: 35 + difficulty * 10,
      answer: sequence,
      reveal: sequence,
      revealFor: 1800
    };
  }

  function createReactionChallenge(rng, difficulty, timeLimit) {
    const armDelay = randInt(rng, 1200, 2600);
    return {
      type: "reaction",
      label: "Reaction",
      prompt: "Wait until the button goes green, then click it immediately.",
      timeLimit,
      points: 40 + difficulty * 8,
      answer: "reaction",
      armDelay,
      threshold: Math.max(240, 520 - difficulty * 35)
    };
  }

  function shuffle(rng, items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function dateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function modeLabel(mode) {
    return {
      campaign: "Campaign",
      quick: "Quick Hack",
      daily: DAILY_LABEL,
      endless: "Endless"
    }[mode] || "Menu";
  }

  function startRun(mode, levelIndex = null) {
    clearTimers();
    const forcedIndex = levelIndex || (mode === "campaign" ? state.campaign.unlocked : 1);
    session = {
      mode,
      levelIndex: forcedIndex,
      step: 0,
      score: 0,
      combo: 0,
      trace: 0,
      lives: 5,
      timeLeft: 0,
      startedAt: Date.now(),
      result: null,
      challenge: null,
      awaitingReaction: false,
      reactionStartedAt: 0,
      finished: false,
      dailySeed: mode === "daily" ? dateKey() : ""
    };
    state.profile.displayName = state.profile.displayName || "SYSTEM";
    state.profile.handle = state.profile.handle || "@system";
    nextChallenge();
    renderAll();
    setStatus(`${modeLabel(mode)} started. Solve the prompt and keep the trace low.`);
  }

  function clearTimers() {
    if (reactionTimeout) {
      clearTimeout(reactionTimeout);
      reactionTimeout = null;
    }
    if (memoryTimeout) {
      clearTimeout(memoryTimeout);
      memoryTimeout = null;
    }
  }

  function finishRun(result) {
    if (!session || session.finished) return;
    session.finished = true;
    clearTimers();
    const duration = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    const record = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode: session.mode,
      score: session.score,
      combo: session.combo,
      trace: session.trace,
      level: session.levelIndex,
      result,
      createdAt: new Date().toISOString(),
      duration
    };
    addHistory(record);
    state.scoreBest = Math.max(state.scoreBest, session.score);
    state.totals.wins += result === "clear" ? 1 : 0;
    state.totals.fails += result === "busted" ? 1 : 0;
    state.totals[session.mode] = (state.totals[session.mode] || 0) + 1;
    if (result === "clear" && session.mode === "campaign") {
      state.campaign.unlocked = Math.max(state.campaign.unlocked, Math.min(MAX_CAMPAIGN, session.levelIndex + 1));
      state.campaign.cleared = [...new Set([...state.campaign.cleared, session.levelIndex])];
      state.campaign.stars[String(session.levelIndex)] = Math.max(1, state.campaign.stars[String(session.levelIndex)] || 1);
      unlockPowerup("skip", session.combo >= 4 ? 1 : 0);
    }
    if (result === "clear" && session.mode === "daily") {
      const today = dateKey();
      if (state.daily.date !== today) {
        state.daily.streak += 1;
        state.daily.date = today;
      }
      state.daily.completed = true;
      state.daily.best = Math.max(state.daily.best, session.score);
    }
    if (result !== "clear" && session.mode === "daily") {
      state.daily.completed = false;
    }
    state.xp += Math.max(0, Math.round(session.score / 2 + (result === "clear" ? 25 : 8)));
    updateAchievements();
    persist();
    renderAll();
    setStatus(result === "clear"
      ? `Run complete. ${session.score} score banked into the local board.`
      : `Run ended. The signal cut out at ${session.score} score.`);
  }

  function nextChallenge() {
    if (!session || session.finished) return;
    clearTimers();
    const mode = session.mode;
    const runGoal = mode === "campaign" ? MAX_CAMPAIGN : mode === "quick" ? 8 : mode === "daily" ? 5 : Infinity;
    if (mode !== "endless" && session.step >= runGoal) {
      finishRun("clear");
      return;
    }
    session.step += 1;
    if (mode === "campaign") session.levelIndex = Math.min(MAX_CAMPAIGN, session.levelIndex);
    const challenge = createChallenge(mode, mode === "campaign" ? session.levelIndex : session.step);
    session.challenge = challenge;
    session.timeLeft = challenge.timeLimit;
    session.awaitingReaction = false;
    session.reactionStartedAt = 0;
    if (challenge.type === "memory") {
      challenge.revealed = true;
      memoryTimeout = setTimeout(() => {
        if (session && session.challenge && session.challenge.id === challenge.id) {
          session.challenge.revealed = false;
          renderAll();
        }
      }, challenge.revealFor || 1800);
    }
    if (challenge.type === "reaction") {
      reactionTimeout = setTimeout(() => {
        if (!session || !session.challenge || session.challenge.id !== challenge.id || session.finished) return;
        session.awaitingReaction = true;
        session.reactionStartedAt = performance.now();
        renderAll();
      }, challenge.armDelay);
    }
    renderAll();
  }

  function setStatus(text, error = false) {
    gameStatus.textContent = text;
    gameStatus.style.color = error ? "#ff7d7d" : "#98a0af";
  }

  function awardPoints(challenge, success = true) {
    if (!session) return;
    if (success) {
      session.combo += 1;
      const comboMultiplier = 1 + Math.min(0.75, session.combo * 0.06);
      const gain = Math.round((challenge.points || 20) * comboMultiplier);
      session.score += gain;
      session.timeLeft = Math.min(session.challenge.timeLimit + 2, session.timeLeft + (challenge.type === "reaction" ? 0 : 1));
      if (session.combo === 3) unlockPowerup("reveal", 1);
      if (session.combo === 5) unlockPowerup("shield", 1);
      if (session.combo === 8) unlockPowerup("freeze", 1);
      if (session.combo === 10) unlockPowerup("skip", 1);
    } else {
      session.combo = 0;
      session.trace = Math.min(100, session.trace + 14 + (challenge.timeLimit < 12 ? 6 : 0));
      session.lives -= 1;
    }
    state.scoreBest = Math.max(state.scoreBest, session.score);
  }

  function finishChallenge(correct, detail = "") {
    if (!session || !session.challenge || session.finished) return;
    const challenge = session.challenge;
    if (correct) {
      awardPoints(challenge, true);
      if (session.mode === "campaign") {
        state.campaign.cleared = [...new Set([...state.campaign.cleared, session.levelIndex])];
        if (session.levelIndex >= state.campaign.unlocked) state.campaign.unlocked = Math.min(MAX_CAMPAIGN, session.levelIndex + 1);
        state.campaign.stars[String(session.levelIndex)] = Math.max(1, state.campaign.stars[String(session.levelIndex)] || 1);
      }
      persist();
      renderAll();
      setStatus(detail || "Correct. The signal stays clean.");
      const hold = challenge.type === "reaction" ? 500 : 850;
      if (session.mode === "campaign") {
        if (session.levelIndex >= MAX_CAMPAIGN) {
          setTimeout(() => finishRun("clear"), hold);
          return;
        }
        setTimeout(() => {
          if (!session || session.finished) return;
          session.levelIndex += 1;
          nextChallenge();
        }, hold);
      } else if (session.mode === "quick" && session.step >= 8) {
        setTimeout(() => finishRun("clear"), hold);
      } else if (session.mode === "daily" && session.step >= 5) {
        setTimeout(() => finishRun("clear"), hold);
      } else {
        setTimeout(nextChallenge, hold);
      }
      return;
    }
    if (session.shield) {
      session.shield = false;
      persist();
      renderAll();
      setStatus("Shield absorbed the mistake. Keep moving.");
      setTimeout(nextChallenge, 650);
      return;
    }
    awardPoints(challenge, false);
    persist();
    renderAll();
    if (session.lives <= 0 || session.trace >= 100) {
      setStatus("The trace hit the ceiling.", true);
      finishRun("busted");
      return;
    }
    setStatus(detail || "Wrong answer. Trace climbs and the signal burns hotter.", true);
    setTimeout(nextChallenge, 650);
  }

  function submitCurrentAnswer(inputValue) {
    if (!session || !session.challenge || session.finished) return;
    const challenge = session.challenge;
    if (challenge.type === "reaction") {
      setStatus("Use the reaction button instead of typing.", true);
      return;
    }
    if (challenge.type === "memory") {
      const answer = normalize(inputValue).replace(/\s+/g, " ");
      const expected = normalize(challenge.answer).replace(/\s+/g, " ");
      finishChallenge(answer === expected, answer === expected ? "Sequence matched." : `Expected ${challenge.answer}.`);
      return;
    }
    if (challenge.type === "code_order") {
      const answer = normalize(inputValue).replace(/\s+/g, " ");
      const expected = normalize(challenge.answer).replace(/\s+/g, " ");
      finishChallenge(answer === expected, answer === expected ? "Order locked." : `Expected ${challenge.answer}.`);
      return;
    }
    if (challenge.type === "password") {
      const answer = normalize(inputValue);
      finishChallenge(answer === normalize(challenge.answer), answer === normalize(challenge.answer) ? "Password accepted." : "Password rejected.");
      return;
    }
    if (challenge.choices) {
      const expected = normalize(challenge.answer);
      finishChallenge(normalize(inputValue) === expected, normalize(inputValue) === expected ? "Correct choice." : "Choice rejected.");
      return;
    }
    finishChallenge(normalize(inputValue) === normalize(challenge.answer), "Answer checked.");
  }

  function usePowerup(type) {
    if (!session || session.finished) return;
    if (!spendPowerup(type)) {
      setStatus("No charges left for that powerup.", true);
      return;
    }
    const challenge = session.challenge;
    if (type === "reveal") {
      challenge.revealed = true;
      setStatus("Reveal active. The answer is visible.");
    } else if (type === "skip") {
      setStatus("Skip used. Moving to the next node.");
      finishChallenge(true, "Skipped cleanly.");
      return;
    } else if (type === "shield") {
      session.shield = true;
      setStatus("Shield armed. One mistake will not cost a life.");
    } else if (type === "freeze") {
      session.timeLeft = Math.min(challenge.timeLimit + 10, session.timeLeft + 8);
      setStatus("Timer frozen. You gained extra seconds.");
    } else if (type === "wipe") {
      session.trace = Math.max(0, session.trace - 35);
      setStatus("Trace wiped down.");
    }
    persist();
    renderAll();
  }

  function handleReactionClick() {
    if (!session || !session.challenge || session.challenge.type !== "reaction" || session.finished) return;
    if (!session.awaitingReaction) {
      finishChallenge(false, "Too early.");
      return;
    }
    const reactionMs = Math.round(performance.now() - session.reactionStartedAt);
    if (reactionMs > session.challenge.threshold) {
      finishChallenge(false, `Too slow (${reactionMs}ms).`);
      return;
    }
    finishChallenge(true, `Reaction ${reactionMs}ms.`);
  }

  function tick() {
    if (!session || session.finished) return;
    const now = performance.now();
    const elapsed = (now - lastTick) / 1000;
    lastTick = now;
    if (session.challenge) {
      session.timeLeft = Math.max(0, session.timeLeft - elapsed);
      if (session.timeLeft <= 0) {
        setStatus("The timer hit zero.", true);
        finishChallenge(false, "Signal lost.");
        return;
      }
    }
    renderStats();
  }

  function renderStats() {
    const rank = rankForXp(state.xp);
    statRank.textContent = rank.current.name;
    statXp.textContent = state.xp.toLocaleString();
    statScore.textContent = session ? session.score.toLocaleString() : state.scoreBest.toLocaleString();
    statCombo.textContent = session ? session.combo.toString() : "0";
    statTrace.textContent = `${session ? session.trace : 0}%`;
    statLives.textContent = String(session ? session.lives : 5);
    statPower.textContent = Object.values(state.powerups).reduce((sum, value) => sum + value, 0).toString();
    statRun.textContent = session ? `${modeLabel(session.mode)} ${session.step}` : "Menu";

    profileName.textContent = state.profile.displayName || "SYSTEM";
    profileHandle.textContent = state.profile.handle || "@system";
    profileRank.textContent = rank.current.name;
    profileLevel.textContent = `Level ${String(Math.min(99, Math.max(1, Math.floor(state.xp / 180) + 1))).padStart(2, "0")}`;
    profileWins.textContent = String(state.totals.wins);
    profileLosses.textContent = String(state.totals.fails);
    dailyTitle.textContent = state.daily.streak > 0 ? `Streak ${state.daily.streak}` : "Ready for today";
    dailyCopy.textContent = state.daily.completed ? "You cleared today’s seeded puzzle. Come back tomorrow to keep the streak alive." : "A seeded puzzle resets every day. Finish it to keep your streak alive.";
  }

  function renderCampaignMap() {
    const nodes = campaignNodes().map((node) => {
      const complete = state.campaign.cleared.includes(node.index);
      const active = !complete && node.index === state.campaign.unlocked;
      const locked = node.index > state.campaign.unlocked;
      return `
        <button type="button" class="campaign-node ${complete ? "is-clear" : ""} ${active ? "is-active" : ""} ${locked ? "is-locked" : ""} ${node.boss ? "is-boss" : ""}" data-level="${node.index}" ${locked ? "disabled" : ""}>
          <strong>${String(node.index).padStart(2, "0")}</strong>
          <small>${node.boss ? "Boss" : node.type.replace("_", " ")}</small>
        </button>
      `;
    }).join("");
    campaignMap.innerHTML = nodes;
    campaignNote.textContent = state.campaign.unlocked > MAX_CAMPAIGN
      ? "Campaign complete. Replay nodes to chase a cleaner score."
      : `Node ${String(state.campaign.unlocked).padStart(2, "0")} is unlocked next.`;
  }

  function renderPowerups() {
    const buttons = [
      ["reveal", "Reveal"],
      ["freeze", "Freeze"],
      ["shield", "Shield"],
      ["skip", "Skip"],
      ["wipe", "Trace Wipe"]
    ];
    powerupBar.innerHTML = buttons.map(([type, label]) => `
      <button class="powerup-action" type="button" data-powerup="${type}" ${ (state.powerups[type] || 0) <= 0 ? "disabled" : ""}>
        ${label} <span>×${state.powerups[type] || 0}</span>
      </button>
    `).join("");
  }

  function renderProfilePanel() {
    const unlocked = ACHIEVEMENTS.filter((item) => state.achievements.includes(item.id));
    achievementList.innerHTML = ACHIEVEMENTS.map((item) => `
      <li class="${state.achievements.includes(item.id) ? "" : "is-muted"}">
        <strong>${item.name}</strong>
        <div>${item.hint}</div>
      </li>
    `).join("");
    if (!unlocked.length) {
      achievementList.insertAdjacentHTML("afterbegin", `<li class="is-muted">No achievements yet. Clear the first campaign node to start the list.</li>`);
    }
  }

  function renderLeaderboard() {
    const rows = [...state.history]
      .sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    if (!rows.length) {
      runBoard.innerHTML = `<tr><td colspan="5">No runs yet. Start the campaign to seed the board.</td></tr>`;
      return;
    }
    runBoard.innerHTML = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${modeLabel(row.mode)}</td>
        <td>${row.score.toLocaleString()}</td>
        <td>${row.result}${row.mode === "campaign" ? ` // L${row.level}` : ""}</td>
        <td>${formatDate(row.createdAt)}</td>
      </tr>
    `).join("");
  }

  function renderButtons() {
    modeButtons.forEach((button) => {
      const isMode = button.dataset.mode === (session ? session.mode : "campaign");
      button.classList.toggle("is-active", isMode);
    });
  }

  function renderChallenge() {
    if (!session || session.finished || !session.challenge) {
      runShell.innerHTML = `
        <div class="run-shell-empty">
          <span class="status-badge">Ready</span>
          <h3>Start a run to load the first puzzle.</h3>
          <p>Campaign, quick hack, daily run, and endless mode all share the same browser save and progression.</p>
        </div>
        <div class="crt-overlay" aria-hidden="true"></div>
      `;
      runIntro.textContent = "Choose a mode or tap a campaign node to begin.";
      return;
    }

    const challenge = session.challenge;
    let extra = "";
    let inputBlock = "";
    let actionBlock = "";
    const revealNote = challenge.revealed
      ? `<div class="challenge-pill-row"><span class="challenge-pill"><strong>Reveal</strong><span>${escapeHtml(challenge.answer)}</span></span></div>`
      : "";

    if (challenge.type === "binary_hex" || challenge.type === "logic" || challenge.type === "code_repair") {
      const options = challenge.choices.map((choice, index) => `
        <button type="button" class="challenge-choice" data-answer="${escapeHtml(choice)}">${escapeHtml(choice)}</button>
      `).join("");
      extra = `<div class="challenge-pill-row"><span class="challenge-pill"><strong>${challenge.label}</strong><span>${challenge.timeLimit}s</span></span><span class="challenge-pill"><strong>${session.combo}x</strong><span>combo</span></span><span class="challenge-pill"><strong>${session.trace}%</strong><span>trace</span></span></div>`;
      inputBlock = `<div class="challenge-screen">${options}</div>`;
    } else if (challenge.type === "bug_hunt") {
      extra = `<div class="challenge-output"><div class="challenge-lines">${challenge.lines.map((line, index) => `<code><strong>${index + 1}</strong> ${escapeHtml(line)}</code>`).join("")}</div></div>`;
      inputBlock = `
        <form class="challenge-form" data-challenge-form>
          <label for="answer-input">Type the bugged line number</label>
          <input id="answer-input" name="answer" inputmode="numeric" autocomplete="off" placeholder="e.g. 2" />
          <button class="button button-primary" type="submit">Check line <span>&rarr;</span></button>
        </form>
      `;
    } else if (challenge.type === "code_order") {
      extra = `<div class="challenge-output"><div class="challenge-lines">${challenge.items.map((item) => `<code><strong>${item.key}</strong> ${escapeHtml(item.text)}</code>`).join("")}</div></div>`;
      inputBlock = `
        <form class="challenge-form" data-challenge-form>
          <label for="answer-input">Enter the line order using the labels shown</label>
          <input id="answer-input" name="answer" autocomplete="off" placeholder="A B C D" />
          <button class="button button-primary" type="submit">Check order <span>&rarr;</span></button>
        </form>
      `;
    } else if (challenge.type === "password") {
      extra = `<div class="challenge-pill-row"><span class="challenge-pill"><strong>Hint</strong><span>${escapeHtml(challenge.hint)}</span></span><span class="challenge-pill"><strong>${session.timeLeft.toFixed(0)}s</strong><span>time left</span></span></div>`;
      inputBlock = `
        <form class="challenge-form" data-challenge-form>
          <label for="answer-input">Enter the password</label>
          <input id="answer-input" name="answer" autocomplete="off" placeholder="Type the password" />
          <button class="button button-primary" type="submit">Unlock <span>&rarr;</span></button>
        </form>
      `;
    } else if (challenge.type === "memory") {
      const visible = challenge.revealed ? challenge.reveal : "•• •• ••";
      extra = `<div class="challenge-output"><div class="challenge-sequence"><div class="sequence-row">${visible.split(" ").map((symbol) => `<span class="sequence-pill"><strong>${symbol}</strong></span>`).join("")}</div></div></div>`;
      inputBlock = `
        <form class="challenge-form" data-challenge-form>
          <label for="answer-input">Repeat the sequence exactly</label>
          <input id="answer-input" name="answer" autocomplete="off" placeholder="▲ ● ■ ◆" />
          <button class="button button-primary" type="submit">Repeat it <span>&rarr;</span></button>
        </form>
      `;
    } else if (challenge.type === "reaction") {
      extra = `
        <div class="challenge-output">
          <div class="challenge-pill-row">
            <span class="challenge-pill"><strong>${Math.max(0, Math.ceil(session.timeLeft))}s</strong><span>signal</span></span>
            <span class="challenge-pill"><strong>${challenge.threshold}ms</strong><span>threshold</span></span>
          </div>
          <button class="button button-primary reaction-button ${session.awaitingReaction ? "is-live" : ""}" type="button" data-action="reaction-button">${session.awaitingReaction ? "REACT" : "WAIT"}</button>
        </div>
      `;
      inputBlock = "";
    }

    const powerupSummary = Object.entries(state.powerups)
      .map(([key, value]) => `<span class="powerup-pill"><strong>${value}</strong><span>${key}</span></span>`)
      .join("");

    actionBlock = `
      <div class="challenge-flash" id="challenge-flash"></div>
      <div class="challenge-pill-row">${powerupSummary}</div>
    `;

    runShell.innerHTML = `
      <div class="challenge-panel">
        <div class="challenge-kicker">${modeLabel(session.mode)} // ${String(session.mode === "campaign" ? session.levelIndex : session.step).padStart(2, "0")}</div>
        <h3>${challenge.label}</h3>
        <p class="challenge-prompt">${escapeHtml(challenge.prompt)}</p>
        ${extra}
        ${revealNote}
        ${inputBlock}
        ${actionBlock}
        <div class="result-banner">
          <strong>${session.score.toLocaleString()} score</strong>
          <p>${session.mode === "campaign" ? `Node ${session.levelIndex} / ${MAX_CAMPAIGN}` : `${modeLabel(session.mode)} step ${session.step}`}</p>
        </div>
      </div>
      <div class="crt-overlay" aria-hidden="true"></div>
    `;
    runIntro.textContent = `${modeLabel(session.mode)} active. Keep the trace low and the combo moving.`;
    const flash = document.getElementById("challenge-flash");
    if (flash) flash.textContent = session.finished ? "Run finished." : "Answer the prompt to move on.";
  }

  function renderAll() {
    renderStats();
    renderButtons();
    renderCampaignMap();
    renderPowerups();
    renderProfilePanel();
    renderLeaderboard();
    renderChallenge();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function applyModeButton(mode) {
    modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === mode));
  }

  document.addEventListener("click", (event) => {
    const modeBtn = event.target.closest("[data-mode]");
    if (modeBtn) {
      applyModeButton(modeBtn.dataset.mode);
      startRun(modeBtn.dataset.mode);
      return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === "start-campaign") startRun("campaign");
      if (action === "start-quick") startRun("quick");
      if (action === "start-daily") startRun("daily");
      if (action === "show-profile") document.getElementById("profile")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (action === "show-leaderboard") document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (action === "submit-answer") {
        const input = document.getElementById("answer-input");
        if (input) submitCurrentAnswer(input.value);
      }
      if (action === "retry-run") {
        if (session) startRun(session.mode, session.mode === "campaign" ? session.levelIndex : null);
      }
      if (action === "end-run") {
        if (session) finishRun(session.score > 0 ? "clear" : "busted");
      }
      if (action === "reaction-button") handleReactionClick();
      return;
    }

    const levelBtn = event.target.closest("[data-level]");
    if (levelBtn) {
      startRun("campaign", Number(levelBtn.dataset.level));
      return;
    }

    const choiceBtn = event.target.closest("[data-answer]");
    if (choiceBtn && session && session.challenge && !session.finished) {
      submitCurrentAnswer(choiceBtn.dataset.answer || choiceBtn.textContent || "");
      return;
    }

    const powerupBtn = event.target.closest("[data-powerup]");
    if (powerupBtn) {
      usePowerup(powerupBtn.dataset.powerup);
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-challenge-form]");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("#answer-input");
    submitCurrentAnswer(input ? input.value : "");
  });

  document.addEventListener("keydown", (event) => {
    if (!session || session.finished) return;
    if (event.key === "Enter" && document.activeElement?.id === "answer-input") {
      event.preventDefault();
      const input = document.getElementById("answer-input");
      if (input) submitCurrentAnswer(input.value);
    }
    if (event.key === "Escape") {
      setStatus("Run paused in place.");
    }
    if (session.challenge?.type === "reaction" && event.key === " ") {
      event.preventDefault();
      handleReactionClick();
    }
  });

  setInterval(tick, 250);
  lastTick = performance.now();
  renderAll();
  persist();
})();
