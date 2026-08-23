(function () {
  const storageKeys = {
    bestScore: "gankbyte-codebreaker-best",
    lastPlayed: "gankbyte-codebreaker-last-played",
    runLog: "gankbyte-codebreaker-runs",
    settings: "gankbyte-codebreaker-settings",
    achievements: "gankbyte-codebreaker-achievements",
  };

  const levelNames = [
    "School Computer",
    "Gaming Server",
    "Web Server",
    "Mobile Network",
    "Corporate Network",
    "Cloud Server",
    "E-Commerce System",
    "Bank System",
    "Satellite Network",
    "Firewall Boss",
    "Central System",
    "City Grid",
    "Military Network",
    "Research Lab",
    "AI Security",
    "Neural Network",
    "Global Network",
    "Dark Network",
    "Zero-Day System",
    "Root Access Boss",
    "Quantum Server",
    "Overclocked Core",
    "Mirror System",
    "Fractured Code",
    "Security Overload",
    "Sentient System",
    "Watcher",
    "Null Network",
    "Black Core",
    "GankByte Mainframe",
  ];

  const challengeTypes = ["code", "editor", "binary", "bughunt", "logic", "memory", "reaction"];
  const powerupDefs = {
    overclock: { label: "Overclock", desc: "+5 seconds", uses: 1 },
    assist: { label: "AI Assist", desc: "Remove 2 wrong answers", uses: 1 },
    firewall: { label: "Firewall", desc: "Block next mistake", uses: 1 },
    ghost: { label: "Ghost", desc: "Freeze TRACE for 5 seconds", uses: 1 },
  };

  const state = {
    screen: "menu",
    menuFocus: "campaign",
    mode: "campaign",
    leaderboardTab: "global",
    leaderboardPage: 0,
    selectedLevel: 0,
    campaignProgress: 0,
    currentChallengeIndex: 0,
    levelChallenges: [],
    currentChallenge: null,
    challengeTimer: 0,
    timerHandle: null,
    traceFreezeUntil: 0,
    challengeStart: 0,
    lives: 5,
    maxLives: 5,
    trace: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    levelScore: 0,
    levelXp: 0,
    levelTrace: 0,
    levelTitle: "",
    objectives: [],
    statusMessage: "Break the code before the system finds you.",
    inputValue: "",
    memoryVisible: false,
    memoryReveal: "",
    reactionPhase: 0,
    reactionHistory: [],
    reactionOptions: [],
    powerups: createPowerupState(),
    runStart: Date.now(),
    traceWarningsShown: { 50: false, 75: false, 90: false },
    quickMode: false,
    endless: false,
    speedrun: false,
    dailySeed: currentDaySeed(),
    settings: loadJSON(storageKeys.settings, { sound: true, compactHud: false, reducedGlow: false }),
    achievements: new Set(loadJSON(storageKeys.achievements, [])),
    runLog: loadJSON(storageKeys.runLog, []),
  };

  const app = document.getElementById("codebreaker-app");
  const connectionState = document.getElementById("kb-connection-state");

  boot();

  function boot() {
    registerBaseAchievements();
    render();
    if (connectionState) connectionState.textContent = "LOCAL SESSION";
  }

  function createPowerupState() {
    return Object.fromEntries(Object.entries(powerupDefs).map(([key, value]) => [key, { ...value }]));
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // no-op
    }
  }

  function currentDaySeed() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }

  function pct(value) {
    return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  }

  function formatTime(seconds) {
    return `${Math.max(0, seconds).toFixed(1)}s`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededRand(seed, offset = 0) {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  }

  function registerBaseAchievements() {
    const preset = [
      ["first_breach", "First Breach"],
      ["boss_breaker", "Boss Breaker"],
      ["combo_10", "Combo x10"],
      ["trace_survivor", "Trace Survivor"],
      ["campaign_clear", "Campaign Clear"],
    ];
    for (const [id, label] of preset) {
      if (!state.achievements.has(id) && id === "first_breach" && Number(localStorage.getItem(storageKeys.bestScore) || 0) > 0) {
        state.achievements.add(id);
      }
      if (state.achievements.has(id)) continue;
    }
    saveJSON(storageKeys.achievements, [...state.achievements]);
  }

  function setScreen(screen) {
    state.screen = screen;
    render();
  }

  function resetRun(mode, level = 0) {
    clearInterval(state.timerHandle);
    state.mode = mode;
    state.selectedLevel = level;
    state.quickMode = mode === "quick";
    state.endless = mode === "endless";
    state.speedrun = mode === "speedrun";
    state.campaignProgress = mode === "campaign" ? level : 0;
    state.currentChallengeIndex = 0;
    state.levelChallenges = [];
    state.currentChallenge = null;
    state.challengeTimer = 0;
    state.traceFreezeUntil = 0;
    state.lives = 5;
    state.maxLives = 5;
    state.trace = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.levelScore = 0;
    state.levelXp = 0;
    state.levelTrace = 0;
    state.inputValue = "";
    state.memoryVisible = false;
    state.reactionPhase = 0;
    state.reactionHistory = [];
    state.statusMessage = "Break the code before the system finds you.";
    state.traceWarningsShown = { 50: false, 75: false, 90: false };
    state.powerups = createPowerupState();
    state.runStart = Date.now();
  }

  function levelData(index) {
    const title = levelNames[index] || `System ${String(index + 1).padStart(2, "0")}`;
    const system = index === 0 ? "School Computer" : title;
    const security = index >= 28 ? "EXTREME" : index >= 19 ? "HIGH" : index >= 9 ? "ELEVATED" : "STANDARD";
    const isBoss = [9, 19, 29].includes(index);
    const objectives = isBoss
      ? ["Survive all boss phases", "Keep trace below 100%", "Preserve your lives"]
      : challengeTypes.slice(0, 3).map((t, i) => `Solve ${title.toLowerCase()} challenge ${i + 1}`);
    return { index, number: index + 1, title, system, security, isBoss, objectives };
  }

  function buildCampaignChallenges(index) {
    const seed = hashString(`${index}-${state.dailySeed}`);
    const picks = [];
    if ([9, 19, 29].includes(index)) {
      picks.push(makeChallenge("code", seed + 1, 1, true));
      picks.push(makeChallenge("logic", seed + 2, 2, true));
      picks.push(makeChallenge("reaction", seed + 3, 3, true));
      return picks;
    }
    const count = 4 + Math.floor(index / 8);
    for (let i = 0; i < count; i++) {
      const type = challengeTypes[(seed + i) % challengeTypes.length];
      picks.push(makeChallenge(type, seed + i + 1, index + 1, false));
    }
    return picks;
  }

  function startCampaign(levelIndex) {
    resetRun("campaign", levelIndex);
    state.selectedLevel = levelIndex;
    state.levelTitle = levelData(levelIndex).title;
    state.objectives = levelData(levelIndex).objectives;
    state.levelChallenges = buildCampaignChallenges(levelIndex);
    state.currentChallengeIndex = 0;
    state.screen = "levelIntro";
    render();
  }

  function startMode(mode) {
    if (mode === "campaign") return startCampaign(state.campaignProgress || 0);
    resetRun(mode, 0);
    state.mode = mode;
    state.levelTitle = modeLabel(mode);
    state.objectives = mode === "daily"
      ? ["Complete today's fixed seed", "Keep 5 lives if possible", "Record a leaderboard score"]
      : mode === "speedrun"
        ? ["Move fast", "Chain the combo", "Beat the trace"]
        : mode === "endless"
          ? ["Keep going until you fail", "Build the highest score", "Use powerups carefully"]
          : ["Clear the quickest random hack"];
    const challengeCount = mode === "quick" ? 5 : mode === "daily" ? 10 : mode === "speedrun" ? 12 : 999;
    state.levelChallenges = Array.from({ length: challengeCount }, (_, i) => {
      const seed = hashString(`${mode}-${state.dailySeed}-${i}`);
      const type = challengeTypes[seed % challengeTypes.length];
      return makeChallenge(type, seed + i, i + 1, false, mode);
    });
    state.screen = "levelIntro";
    render();
  }

  function modeLabel(mode) {
    return {
      campaign: "Campaign",
      daily: "Daily Hack",
      quick: "Quick Hack",
      endless: "Endless",
      speedrun: "Speedrun",
    }[mode] || "Codebreaker";
  }

  function startLevel() {
    state.screen = "play";
    state.currentChallengeIndex = 0;
    state.levelScore = 0;
    state.levelXp = 0;
    state.levelTrace = 0;
    loadChallenge(state.levelChallenges[0]);
    tickTimer();
    state.timerHandle = setInterval(tickTimer, 100);
    render();
  }

  function tickTimer() {
    if (state.screen !== "play" || !state.currentChallenge) return;
    const elapsed = (Date.now() - state.challengeStart) / 1000;
    const remaining = Math.max(0, state.currentChallenge.timeLimit - elapsed);
    state.challengeTimer = remaining;
    if (remaining <= 0) {
      clearInterval(state.timerHandle);
      loseLife("TRACE caught up while you hesitated.");
      if (state.screen === "play") {
        state.statusMessage = "Time expired.";
        advanceAfterFailure();
      }
    }
    render();
  }

  function loadChallenge(challenge) {
    state.currentChallenge = challenge;
    state.challengeStart = Date.now();
    state.challengeTimer = challenge.timeLimit;
    state.inputValue = "";
    state.memoryVisible = challenge.type === "memory";
    state.reactionPhase = 0;
    state.reactionHistory = [];
    state.statusMessage = challenge.subtitle;
    render();
    if (challenge.type === "memory") {
      setTimeout(() => {
        if (state.currentChallenge === challenge && state.screen === "play") {
          state.memoryVisible = false;
          render();
        }
      }, 1600);
    }
  }

  function makeChallenge(type, seed, levelIndex, boss = false, mode = "campaign") {
    const rng = (n) => Math.floor(seededRand(seed, n) * 1000);
    if (type === "code") {
      const operators = ["=", "===", "!=", "<=", ">=", "<", ">"];
      const correctIndex = rng(1) % operators.length;
      return {
        type,
        title: boss ? "BOSS: Restore access logic" : "Repair access script",
        subtitle: "Select the operator that keeps the program valid.",
        prompt: `function unlock(password) {\n  if (password ___ "GANK") {\n    accessGranted();\n  }\n}`,
        answer: operators[correctIndex],
        options: operators,
        timeLimit: boss ? 10 : 8.5 - Math.min(2, levelIndex * 0.03),
        points: boss ? 800 : 500 + levelIndex * 18,
        xp: boss ? 60 : 25,
      };
    }
    if (type === "editor") {
      const answers = ["return true;", 'grantAccess();', 'access = 1;', 'console.log("OK");'];
      const correct = answers[rng(2) % answers.length];
      const snippet = [
        "function access(key) {",
        '  if (key === "GANKBYTE") {',
        "    _____________",
        "  }",
        "}",
      ].join("\n");
      return {
        type,
        title: boss ? "BOSS: Patch the source" : "Repair source code",
        subtitle: "Complete the missing line exactly.",
        prompt: snippet,
        answer: correct,
        timeLimit: boss ? 12 : 10 - Math.min(3, levelIndex * 0.03),
        points: boss ? 900 : 650 + levelIndex * 20,
        xp: boss ? 70 : 30,
      };
    }
    if (type === "binary") {
      const words = ["GANK", "BYTE", "CODE", "ROOT", "SYNC", "LOCK"];
      const word = words[rng(3) % words.length];
      const bin = word
        .split("")
        .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
        .join(" ");
      const options = shuffle([word, "BETA", "TRACE", "NODE"], seed);
      return {
        type,
        title: boss ? "BOSS: Decode the intercept" : "Data intercept",
        subtitle: "Decode the binary message.",
        prompt: bin,
        answer: word,
        options,
        timeLimit: boss ? 9 : 7,
        points: boss ? 850 : 550 + levelIndex * 16,
        xp: boss ? 65 : 28,
      };
    }
    if (type === "bughunt") {
      const wrongLine = 1 + (rng(4) % 4);
      const lines = [
        "01 function login(user) {",
        '02   if (user === "admin") {',
        "03      grantAccess();",
        "04   }",
        '05   console.log("ACCESS");',
        "06 }",
      ];
      return {
        type,
        title: boss ? "BOSS: Hunt the fault" : "Debugging required",
        subtitle: "Choose the line that breaks the logic.",
        prompt: lines.join("\n"),
        answer: String([2, 3, 5, 6][wrongLine - 1] || 5),
        options: ["02", "03", "05", "06"],
        timeLimit: boss ? 10 : 8,
        points: boss ? 900 : 600 + levelIndex * 18,
        xp: boss ? 70 : 30,
      };
    }
    if (type === "logic") {
      const a = 4 + (rng(5) % 4);
      const b = 6 + (rng(6) % 5);
      const c = a + b;
      const d = c + 2;
      const answer = String(d);
      return {
        type,
        title: boss ? "BOSS: System logic" : "Security lock",
        subtitle: "Solve the logic step.",
        prompt: `A = ${a}\nB = ${b}\nC = A + B\nD = C + 2\n\nWhat is D?`,
        answer,
        options: shuffle([String(d), String(d + 2), String(d - 2), String(d + 4)], seed),
        timeLimit: boss ? 9 : 7.5,
        points: boss ? 800 : 575 + levelIndex * 18,
        xp: boss ? 65 : 28,
      };
    }
    if (type === "memory") {
      const words = ["G7-X2-BYTE", "Q4-LOCK", "R9-TRACE", "N1-GANK", "M8-ROOT"];
      const answer = words[rng(7) % words.length];
      return {
        type,
        title: boss ? "BOSS: Memorise the key" : "Memorise key",
        subtitle: "Memorise the key, then type it back.",
        prompt: answer,
        answer,
        timeLimit: boss ? 12 : 9,
        points: boss ? 850 : 550 + levelIndex * 18,
        xp: boss ? 60 : 30,
      };
    }
    const colors = ["RED", "BLUE", "GREEN", "PURPLE"];
    const first = colors[rng(8) % colors.length];
    const second = colors[(rng(9) + 1) % colors.length];
    const third = colors[(rng(10) + 2) % colors.length];
    return {
      type: "reaction",
      title: boss ? "BOSS: Security response" : "Security response",
      subtitle: "React to changing instructions.",
      prompt: [first, second, third],
      answer: first,
      sequence: boss
        ? [
            { rule: "click", target: first, text: `CLICK ${first}` },
            { rule: "avoid", target: second, text: `DON'T CLICK ${second}` },
            { rule: "none", target: third, text: "CLICK NOTHING" },
          ]
        : [
            { rule: "click", target: first, text: `CLICK ${first}` },
            { rule: "avoid", target: second, text: `DON'T CLICK ${second}` },
            { rule: "click", target: third, text: `CLICK ${third}` },
          ],
      options: colors,
      timeLimit: boss ? 6 : 5.5,
      points: boss ? 750 : 500 + levelIndex * 15,
      xp: boss ? 55 : 25,
    };
  }

  function shuffle(items, seed) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(seededRand(seed, i) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function currentChallengeType() {
    return state.currentChallenge?.type || "code";
  }

  function answerChallenge(value) {
    const challenge = state.currentChallenge;
    if (!challenge || state.screen !== "play") return;
    if (challenge.type === "reaction") {
      handleReaction(value);
      return;
    }
    const attempt = String(value).trim();
    if (!attempt) return;
    const normalized = attempt.toLowerCase().replace(/\s+/g, " ");
    const expected = String(challenge.answer).trim().toLowerCase().replace(/\s+/g, " ");
    if (normalized === expected) {
      completeChallenge();
    } else {
      wrongAnswer();
    }
  }

  function handleReaction(value) {
    const challenge = state.currentChallenge;
    const step = challenge.sequence[state.reactionPhase];
    const picked = String(value).toUpperCase();
    let correct = false;
    if (step.rule === "none") {
      correct = picked === "NONE" || picked === "WAIT";
    } else if (step.rule === "click") {
      correct = picked === step.target;
    } else if (step.rule === "avoid") {
      correct = picked !== step.target;
    }
    if (!correct) {
      wrongAnswer();
      return;
    }
    state.reactionHistory.push(picked);
    state.reactionPhase += 1;
    if (state.reactionPhase >= challenge.sequence.length) {
      completeChallenge();
    } else {
      state.statusMessage = challenge.sequence[state.reactionPhase].text;
      render();
    }
  }

  function completeChallenge() {
    const challenge = state.currentChallenge;
    const elapsed = (Date.now() - state.challengeStart) / 1000;
    const bonus = Math.max(0, Math.round((challenge.timeLimit - elapsed) * 35));
    const earned = challenge.points + bonus + state.combo * 10;
    state.score += earned;
    state.levelScore += earned;
    state.levelXp += challenge.xp;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.statusMessage = "Access granted.";
    if (state.combo >= 10) unlockAchievement("combo_10", "Combo x10");
    state.currentChallengeIndex += 1;
    if (state.currentChallengeIndex >= state.levelChallenges.length) {
      finishLevel(true);
    } else {
      loadChallenge(state.levelChallenges[state.currentChallengeIndex]);
    }
    render();
  }

  function wrongAnswer() {
    const block = state.powerups.firewall.uses > 0;
    const frozen = Date.now() < state.traceFreezeUntil;
    const traceGain = frozen ? 0 : block ? 4 : 12;
    if (block) {
      state.powerups.firewall.uses -= 1;
      state.statusMessage = frozen ? "Trace frozen. Firewall held the line." : "Firewall blocked that mistake.";
    } else {
      state.statusMessage = frozen ? "Trace frozen." : "Syntax error. TRACE increased.";
    }
    if (!frozen) {
      state.trace += traceGain;
      state.levelTrace += traceGain;
    }
    if (!block) {
      state.combo = 0;
      loseLife(frozen ? "Mistake hit a frozen trace." : "Mistake exposed the system.", frozen ? 0 : 8);
    }
    if (state.trace >= 100 || state.lives <= 0) {
      finishLevel(false);
      return;
    }
    render();
  }

  function loseLife(reason, tracePenalty = 8) {
    state.lives = Math.max(0, state.lives - 1);
    if (tracePenalty > 0) {
      state.trace = Math.min(100, state.trace + tracePenalty);
      state.levelTrace += tracePenalty;
    }
    state.statusMessage = reason || "Life lost.";
    if (state.lives <= 0) {
      finishLevel(false);
    }
  }

  function advanceAfterFailure() {
    if (state.lives <= 0 || state.trace >= 100) {
      finishLevel(false);
    } else {
      render();
    }
  }

  function finishLevel(won) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
    if (won) {
      state.levelXp += 40;
      state.score += 250;
      state.statusMessage = "System breached.";
      if ([9, 19, 29].includes(state.selectedLevel)) unlockAchievement("boss_breaker", "Boss Breaker");
      if (state.selectedLevel === 29) unlockAchievement("campaign_clear", "Campaign Clear");
      if (state.trace < 50) unlockAchievement("trace_survivor", "Trace Survivor");
      updateBestScore();
      logRun(true);
      if (state.mode === "campaign") {
        state.campaignProgress = Math.max(state.campaignProgress, state.selectedLevel + 1);
      }
      state.screen = "complete";
    } else {
      state.statusMessage = "System locked.";
      updateBestScore();
      logRun(false);
      state.screen = "gameover";
    }
    render();
  }

  function updateBestScore() {
    const best = Number(localStorage.getItem(storageKeys.bestScore) || 0);
    if (state.score > best) {
      localStorage.setItem(storageKeys.bestScore, String(state.score));
      unlockAchievement("first_breach", "First Breach");
    }
    localStorage.setItem(storageKeys.lastPlayed, String(Date.now()));
  }

  function logRun(won) {
    const entry = {
      ts: Date.now(),
      mode: state.mode,
      level: state.selectedLevel + 1,
      score: state.score,
      combo: state.bestCombo,
      trace: Math.round(state.trace),
      lives: state.lives,
      won,
    };
    const runs = loadJSON(storageKeys.runLog, []);
    runs.unshift(entry);
    saveJSON(storageKeys.runLog, runs.slice(0, 100));
    state.runLog = runs.slice(0, 100);
  }

  function unlockAchievement(id, label) {
    if (state.achievements.has(id)) return;
    state.achievements.add(id);
    saveJSON(storageKeys.achievements, [...state.achievements]);
    state.statusMessage = `${label} unlocked.`;
  }

  function usePowerup(key) {
    const powerup = state.powerups[key];
    if (!powerup || powerup.uses <= 0 || !state.currentChallenge) return;
    powerup.uses -= 1;
    if (key === "overclock") {
      state.currentChallenge.timeLimit += 5;
      state.statusMessage = "+5 seconds applied.";
    } else if (key === "assist") {
      const challenge = state.currentChallenge;
      if (challenge.options && challenge.options.length > 2) {
        const correct = challenge.answer;
        const wrong = challenge.options.find((opt) => opt !== correct);
        challenge.options = [correct, wrong].filter(Boolean).slice(0, 2);
      }
      state.statusMessage = "Two wrong answers removed.";
    } else if (key === "firewall") {
      state.statusMessage = "Firewall armed.";
    } else if (key === "ghost") {
      state.traceFreezeUntil = Date.now() + 5000;
      state.statusMessage = "Trace frozen for 5 seconds.";
    }
    render();
  }

  function render() {
    if (!app) return;
    if (state.screen === "play" && state.traceFreezeUntil && Date.now() < state.traceFreezeUntil) {
      // keep trace from increasing by timers here; challenge logic already handles it
    }
    app.innerHTML = screens()[state.screen] ? screens()[state.screen]() : screens().menu();
    bindEvents();
    updateHud();
  }

  function screens() {
    return {
      menu: renderMenu,
      campaign: renderCampaign,
      levelIntro: renderLevelIntro,
      play: renderPlay,
      complete: renderComplete,
      gameover: renderGameOver,
      leaderboard: renderLeaderboard,
      profile: renderProfile,
      settings: renderSettings,
      achievements: renderAchievements,
      daily: () => renderInfoScreen("Daily Hack", "Fixed seed for everyone.", "daily"),
      quick: () => renderInfoScreen("Quick Hack", "Random rush of five challenges.", "quick"),
      endless: () => renderInfoScreen("Endless", "Keep going until you fail.", "endless"),
      speedrun: () => renderInfoScreen("Speedrun", "Faster timers, higher stakes.", "speedrun"),
    };
  }

  function renderMenu() {
    const best = Number(localStorage.getItem(storageKeys.bestScore) || 0);
    const runs = loadJSON(storageKeys.runLog, []);
    const activeLabel = modeLabel(state.menuFocus);
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">MAIN MENU</p>
            <h2>Choose your breach.</h2>
            <p class="cb-note">Campaign is the default. Daily Hack is fixed seed. Quick Hack, Endless, and Speedrun are alternate modes on the same game.</p>
          </div>
          <div class="cb-message">
            <strong>Current mode</strong>
            <p>${activeLabel}</p>
          </div>
        </div>
        <div class="cb-menu-layout">
          <div class="cb-menu-list">
            ${menuButton("campaign", "Campaign", "Break 30 systems in order.")}
            ${menuButton("daily", "Daily Hack", "Same challenge for everyone today.")}
            ${menuButton("quick", "Quick Hack", "Five random systems, fast clear.")}
            ${menuButton("endless", "Endless", "Keep playing until you fail.")}
            ${menuButton("speedrun", "Speedrun", "Tight timers, high score pressure.")}
          </div>
          <div class="cb-card">
            <p class="cb-kicker">PROFILE SNAPSHOT</p>
            <h3>Root user</h3>
            <div class="cb-stats">
              <div class="cb-stat"><span>Best score</span><strong>${best.toLocaleString()}</strong></div>
              <div class="cb-stat"><span>Runs logged</span><strong>${runs.length}</strong></div>
              <div class="cb-stat"><span>Achievements</span><strong>${state.achievements.size}</strong></div>
            </div>
            <div class="cb-actions" style="margin-top:16px">
              <button class="cb-button primary" data-action="goto" data-screen="leaderboard">Leaderboards</button>
              <button class="cb-button" data-action="goto" data-screen="profile">Profile</button>
              <button class="cb-button" data-action="goto" data-screen="achievements">Achievements</button>
            </div>
          </div>
        </div>
        <div class="cb-grid-2">
          <div class="cb-card">
            <p class="cb-kicker">FEATURES</p>
            <ul class="cb-list">
              <li>30 level campaign with boss systems at 10, 20, and 30.</li>
              <li>Code, editor, binary, bug hunt, logic, memory, and reaction challenges.</li>
              <li>Five lives, trace pressure, combo scoring, and powerups.</li>
              <li>Local leaderboard, profile stats, and saved achievements.</li>
            </ul>
          </div>
          <div class="cb-card">
            <p class="cb-kicker">GAME FLOW</p>
            <div class="cb-progress">
              <div class="cb-message"><strong>CONNECT</strong><p>Choose a mode.</p></div>
              <div class="cb-message"><strong>START HACK</strong><p>Read the target and objective.</p></div>
              <div class="cb-message"><strong>SOLVE</strong><p>Type, click, decode, or react.</p></div>
              <div class="cb-message"><strong>BREACH</strong><p>Reach level complete before trace hits 100%.</p></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function menuButton(key, title, desc) {
    return `<button class="cb-button block" data-action="menu" data-mode="${key}"><span>${title}</span><span>${desc}</span></button>`;
  }

  function renderCampaign() {
    const progress = Math.max(0, state.campaignProgress);
    const nodes = levelNames.map((name, i) => {
      const status = i < progress ? "completed" : i === progress ? "active" : i > progress ? "locked" : "completed";
      const boss = [9, 19, 29].includes(i);
      return `
        <button class="cb-node ${status} ${boss ? "boss" : ""}" data-action="level" data-level="${i}" ${i > progress ? "disabled" : ""}>
          <strong>${String(i + 1).padStart(2, "0")}</strong>
          <span>${name}</span>
          <span>${boss ? "Boss" : status === "completed" ? "Completed" : status === "active" ? "Active" : "Locked"}</span>
        </button>
      `;
    }).join("");
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">CAMPAIGN MAP</p>
            <h2>GankByte Network.</h2>
            <p class="cb-note">Each node is a system. Bosses appear at systems 10, 20, and 30.</p>
          </div>
          <div class="cb-actions">
            <button class="cb-button" data-action="goto" data-screen="menu">Main menu</button>
            <button class="cb-button primary" data-action="goto" data-screen="levelIntro" data-start-campaign="true">Enter system</button>
          </div>
        </div>
        <div class="cb-map">
          <div class="cb-map-grid">${nodes}</div>
        </div>
      </section>
    `;
  }

  function renderLevelIntro() {
    const level = levelData(state.selectedLevel);
    const isBoss = level.isBoss;
    const colorClass = isBoss ? "boss" : "active";
    const threat = isBoss ? "EXTREME" : level.security;
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">CONNECTION ESTABLISHED</p>
            <h2>${level.title}</h2>
            <p class="cb-note">Target: ${level.system} // Security: ${threat} // Level ${level.number.toString().padStart(2, "0")}</p>
          </div>
          <div class="cb-status ${colorClass}">${isBoss ? "Boss" : "Active"}</div>
        </div>
        <div class="cb-level-panel">
          <div class="cb-card">
            <p class="cb-kicker">OBJECTIVES</p>
            <div class="cb-objectives">
              ${state.objectives.map((item) => `<div class="cb-objective"><strong>${item}</strong><span>Keep trace under control and preserve your lives.</span></div>`).join("")}
            </div>
          </div>
          <div class="cb-card">
            <p class="cb-kicker">RUN RULES</p>
            <div class="cb-progress">
              <div class="cb-message"><strong>LIVES</strong><p>${state.lives} available</p></div>
              <div class="cb-message"><strong>TRACE LIMIT</strong><p>100%</p></div>
              <div class="cb-message"><strong>POWERUPS</strong><p>Overclock, AI Assist, Firewall, Ghost</p></div>
              <div class="cb-message"><strong>MODE</strong><p>${modeLabel(state.mode)}</p></div>
            </div>
          </div>
        </div>
        <div class="cb-actions">
          <button class="cb-button" data-action="goto" data-screen="campaign">Back to map</button>
          <button class="cb-button primary" data-action="start-level">Start hack</button>
        </div>
      </section>
    `;
  }

  function renderPlay() {
    const challenge = state.currentChallenge || state.levelChallenges[state.currentChallengeIndex];
    const level = levelData(state.selectedLevel);
    const traceClass = state.trace >= 75 ? "trace-warning" : "";
    const prompt = renderPrompt(challenge);
    const answerArea = renderAnswerArea(challenge);
    return `
      <section class="cb-screen ${traceClass}">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">CODEBREAKER // LEVEL ${String(level.number).padStart(2, "0")}</p>
            <h2>${challenge.title}</h2>
            <p class="cb-note">${state.statusMessage}</p>
          </div>
          <div class="cb-status ${state.trace >= 75 ? "boss" : "active"}">${modeLabel(state.mode)}</div>
        </div>
        <div class="cb-hud">
          <div class="cb-stat"><span>Score</span><strong>${state.score.toLocaleString()}</strong></div>
          <div class="cb-stat"><span>Combo</span><strong>x${state.combo}</strong></div>
          <div class="cb-stat"><span>Time</span><strong>${formatTime(state.challengeTimer)}</strong></div>
          <div class="cb-stat trace"><span>Trace</span><strong>${pct(state.trace)}</strong></div>
          <div class="cb-stat danger"><span>Lives</span><strong>${"♥".repeat(state.lives) || "0"}</strong></div>
        </div>
        ${warning ? `<div class="cb-boss-banner"><p class="cb-kicker">TRACE WARNING</p><h3>${warning.title}</h3><p>${warning.copy}</p></div>` : ""}
        <div class="cb-play-shell">
          <div class="cb-terminal">
            <div class="cb-prompt">
              <strong>${challenge.subtitle}</strong>
              <p>${level.system} // ${level.security} security // ${level.isBoss ? "Boss phase" : "Operation live"}</p>
            </div>
            <pre>${prompt}</pre>
            <div class="cb-answer-area">${answerArea}</div>
            <div class="cb-helpbar">Use the powerups below if you need a margin. Wrong answers raise trace and can cost lives.</div>
          </div>
          <div class="cb-sidepanel">
            <div class="cb-message">
              <strong>System terminal</strong>
              <p>${level.objectives?.[0] || "Maintain access and survive the trace."}</p>
            </div>
            <div class="cb-rail">
              <label>TRACE</label>
              <div class="cb-bar"><span style="width:${pct(state.trace)}"></span></div>
            </div>
            <div>
              <p class="cb-kicker">POWERUPS</p>
              <div class="cb-powerups">${Object.entries(state.powerups).map(([key, item]) => powerupMarkup(key, item)).join("")}</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderPrompt(challenge) {
    if (!challenge) return "";
    if (challenge.type === "reaction") {
      const step = challenge.sequence[state.reactionPhase] || challenge.sequence[challenge.sequence.length - 1];
      return `SECURITY RESPONSE\n\n${step.text}\n\nChoose quickly before the trace rises.`;
    }
    if (challenge.type === "memory") {
      return state.memoryVisible ? `MEMORISE THE KEY\n\n${challenge.prompt}` : `MEMORY LOCK\n\nKEY HIDDEN`;
    }
    return challenge.prompt;
  }

  function renderAnswerArea(challenge) {
    if (!challenge) return "";
    if (challenge.type === "memory") {
      return `
        <div class="cb-input-row">
          <input class="cb-input" id="cb-answer" value="${escapeAttr(state.inputValue)}" placeholder="Type the key" autocomplete="off" />
          <button class="cb-button primary" data-action="submit-input">Submit</button>
        </div>
      `;
    }
    if (challenge.type === "editor") {
      return `
        <div class="cb-input-row">
          <input class="cb-input" id="cb-answer" value="${escapeAttr(state.inputValue)}" placeholder="Complete the missing line exactly" autocomplete="off" />
          <button class="cb-button primary" data-action="submit-input">Run code</button>
        </div>
      `;
    }
    if (challenge.type === "reaction") {
      const opts = ["RED", "BLUE", "GREEN", "PURPLE", "NONE"];
      return `<div class="cb-choices">${opts.map((opt) => `<button class="cb-choice" data-action="reaction" data-value="${opt}">${opt}</button>`).join("")}</div>`;
    }
    if (challenge.options && challenge.options.length) {
      return `<div class="cb-choices">${challenge.options.map((opt) => `<button class="cb-choice" data-action="answer" data-value="${escapeAttr(opt)}">${opt}</button>`).join("")}</div>`;
    }
    return `
      <div class="cb-input-row">
        <input class="cb-input" id="cb-answer" value="${escapeAttr(state.inputValue)}" placeholder="Type answer" autocomplete="off" />
        <button class="cb-button primary" data-action="submit-input">Submit</button>
      </div>
    `;
  }

  function powerupMarkup(key, item) {
    return `
      <div class="cb-powerup">
        <div>
          <strong>${item.label}</strong>
          <span>${item.desc}</span>
        </div>
        <button class="cb-button" data-action="powerup" data-key="${key}" ${item.uses <= 0 ? "disabled" : ""}>${item.uses}</button>
      </div>
    `;
  }

  function renderComplete() {
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">LEVEL COMPLETE</p>
            <h2>System breached.</h2>
            <p class="cb-note">You cleared ${modeLabel(state.mode)} level ${state.selectedLevel + 1}.</p>
          </div>
          <div class="cb-status active">Approved</div>
        </div>
        <div class="cb-final">
          <div class="cb-stat"><span>Score</span><strong>${state.score.toLocaleString()}</strong></div>
          <div class="cb-stat"><span>XP</span><strong>+${state.levelXp}</strong></div>
          <div class="cb-stat"><span>Best combo</span><strong>x${state.bestCombo}</strong></div>
          <div class="cb-stat"><span>Trace</span><strong>${pct(state.trace)}</strong></div>
        </div>
        <div class="cb-actions">
          <button class="cb-button primary" data-action="next-level">${state.mode === "campaign" && state.selectedLevel < 29 ? "Next system" : "Play again"}</button>
          <button class="cb-button" data-action="goto" data-screen="leaderboard">Leaderboards</button>
          <button class="cb-button" data-action="goto" data-screen="menu">Main menu</button>
        </div>
      </section>
    `;
  }

  function renderGameOver() {
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">GAME OVER</p>
            <h2>System locked.</h2>
            <p class="cb-note">Trace hit 100% or all lives were lost.</p>
          </div>
          <div class="cb-status boss">Locked</div>
        </div>
        <div class="cb-final">
          <div class="cb-stat"><span>Score</span><strong>${state.score.toLocaleString()}</strong></div>
          <div class="cb-stat"><span>Level</span><strong>${String(state.selectedLevel + 1).padStart(2, "0")}</strong></div>
          <div class="cb-stat"><span>Best combo</span><strong>x${state.bestCombo}</strong></div>
          <div class="cb-stat"><span>Trace</span><strong>${pct(state.trace)}</strong></div>
        </div>
        <div class="cb-actions">
          <button class="cb-button primary" data-action="restart">Try again</button>
          <button class="cb-button" data-action="goto" data-screen="leaderboard">Submit score</button>
          <button class="cb-button" data-action="goto" data-screen="menu">Main menu</button>
        </div>
      </section>
    `;
  }

  function leaderboardRows(tab, page = 0) {
    const runs = loadJSON(storageKeys.runLog, []).slice();
    runs.sort((a, b) => b.score - a.score || b.combo - a.combo || a.trace - b.trace);
    const now = Date.now();
    const filtered = runs.filter((run) => {
      if (tab === "daily") return now - run.ts < 86400000;
      if (tab === "weekly") return now - run.ts < 604800000;
      return true;
    });
    const top = filtered.slice(page * 10, page * 10 + 10);
    while (top.length < 10) {
      top.push({
        ts: Date.now() - top.length * 86400000,
        mode: tab === "daily" ? "daily" : tab === "weekly" ? "speedrun" : "campaign",
        level: top.length + 1,
        score: Math.max(0, 16000 - top.length * 780),
        combo: 18 - top.length,
        trace: 20 + top.length * 2,
        lives: 5,
      });
    }
    return top;
  }

  function leaderboardCount(tab) {
    const runs = loadJSON(storageKeys.runLog, []).slice();
    const now = Date.now();
    const filtered = runs.filter((run) => {
      if (tab === "daily") return now - run.ts < 86400000;
      if (tab === "weekly") return now - run.ts < 604800000;
      return true;
    });
    return filtered.length || 10;
  }

  function renderLeaderboard() {
    const rows = leaderboardRows(state.leaderboardTab, state.leaderboardPage);
    const total = leaderboardCount(state.leaderboardTab);
    const from = Math.min(total, state.leaderboardPage * 10 + 1);
    const to = Math.min(total, state.leaderboardPage * 10 + rows.length);
    return `
      <section class="cb-screen cb-board">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">LEADERBOARD</p>
            <h2>All modes. One board.</h2>
            <p class="cb-note">Runs are stored locally on this site. When a backend is connected, these tabs can point at live global, daily, and weekly feeds.</p>
          </div>
          <div class="cb-actions">
            <button class="cb-button" data-action="goto" data-screen="menu">Main menu</button>
            <button class="cb-button primary" data-action="goto" data-screen="campaign">Play campaign</button>
          </div>
        </div>
        <div class="cb-board-tabs">
          ${["global", "daily", "weekly"].map((tab) => `<button class="cb-tab ${state.leaderboardTab === tab ? "active" : ""}" data-action="leaderboard-tab" data-tab="${tab}">${tab.toUpperCase()}</button>`).join("")}
        </div>
        <div class="cb-board-table">
          <table>
            <thead><tr><th>#</th><th>Player</th><th>Mode</th><th>Level</th><th>Score</th><th>Combo</th><th>Date</th></tr></thead>
            <tbody>
              ${rows.map((row, i) => `
                <tr class="${i === 0 ? "current" : ""}">
                  <td>${String(i + 1).padStart(2, "0")}</td>
                  <td>${i === 0 && state.score > 0 ? "YOU" : "GANKER"}</td>
                  <td>${modeLabel(row.mode || state.mode)}</td>
                  <td>${String(row.level).padStart(2, "0")}</td>
                  <td>${Number(row.score).toLocaleString()}</td>
                  <td>x${row.combo}</td>
                  <td>${fmtDate(row.ts)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="cb-page-controls">
          <p class="cb-small">Showing ${from}-${to} of ${total} entries.</p>
          <div class="cb-pagination">
            <button class="cb-page-button" data-action="leaderboard-page" data-dir="-1">Previous</button>
            <button class="cb-page-button" data-action="leaderboard-page" data-dir="1">Next</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderProfile() {
    const best = Number(localStorage.getItem(storageKeys.bestScore) || 0);
    const runs = loadJSON(storageKeys.runLog, []);
    const systems = Math.min(30, state.campaignProgress || (best > 0 ? 1 : 0));
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">PROFILE</p>
            <h2>Root user.</h2>
            <p class="cb-note">Session stats are saved locally until a live account is connected.</p>
          </div>
          <div class="cb-status active">Online</div>
        </div>
        <div class="cb-grid-2">
          <div class="cb-card">
            <p class="cb-kicker">STATS</p>
            <div class="cb-stats">
              <div class="cb-stat"><span>Level</span><strong>20</strong></div>
              <div class="cb-stat"><span>Best score</span><strong>${best.toLocaleString()}</strong></div>
              <div class="cb-stat"><span>Systems</span><strong>${systems}/30</strong></div>
            </div>
            <div class="cb-stats" style="margin-top:12px">
              <div class="cb-stat"><span>Runs</span><strong>${runs.length}</strong></div>
              <div class="cb-stat"><span>Achievements</span><strong>${state.achievements.size}</strong></div>
              <div class="cb-stat"><span>Best combo</span><strong>x${state.bestCombo || 0}</strong></div>
            </div>
          </div>
          <div class="cb-card">
            <p class="cb-kicker">PERSISTENCE</p>
            <p class="cb-small">Best score, last played timestamp, run history, and achievements are stored in localStorage for this browser session.</p>
            <div class="cb-actions" style="margin-top:16px">
              <button class="cb-button" data-action="goto" data-screen="leaderboard">Leaderboards</button>
              <button class="cb-button" data-action="goto" data-screen="achievements">Achievements</button>
              <button class="cb-button primary" data-action="goto" data-screen="campaign">Campaign map</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderSettings() {
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">SETTINGS</p>
            <h2>Game options.</h2>
            <p class="cb-note">These are local page settings. They can be extended later to a live account profile.</p>
          </div>
        </div>
        <div class="cb-grid-2">
          ${settingCard("sound", "Sound", "Toggle audio cues and UI feedback.")}
          ${settingCard("compactHud", "Compact HUD", "Use a tighter HUD layout on smaller screens.")}
          ${settingCard("reducedGlow", "Reduced glow", "Tone down the neon effects for readability.")}
        </div>
      </section>
    `;
  }

  function settingCard(key, title, desc) {
    const value = !!state.settings[key];
    return `
      <div class="cb-card">
        <p class="cb-kicker">${title}</p>
        <h3>${value ? "Enabled" : "Disabled"}</h3>
        <p>${desc}</p>
        <div class="cb-actions">
          <button class="cb-button primary" data-action="toggle-setting" data-key="${key}">${value ? "Turn off" : "Turn on"}</button>
        </div>
      </div>
    `;
  }

  function renderAchievements() {
    const items = [
      ["first_breach", "First Breach", "Complete your first successful run."],
      ["boss_breaker", "Boss Breaker", "Defeat one of the firewall bosses."],
      ["combo_10", "Combo x10", "Hold a 10-hit chain."],
      ["trace_survivor", "Trace Survivor", "Finish with trace below 50%."],
      ["campaign_clear", "Campaign Clear", "Reach system 30."],
    ];
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">ACHIEVEMENTS</p>
            <h2>Progress markers.</h2>
            <p class="cb-note">Simple unlocks are stored locally and can be wired to a live profile later.</p>
          </div>
        </div>
        <div class="cb-grid-2">
          ${items.map(([id, title, desc]) => {
            const earned = state.achievements.has(id);
            return `
              <div class="cb-card">
                <span class="cb-status ${earned ? "active" : "locked"}">${earned ? "Earned" : "Locked"}</span>
                <h3>${title}</h3>
                <p>${desc}</p>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderInfoScreen(title, desc, mode) {
    return `
      <section class="cb-screen">
        <div class="cb-screen-head">
          <div>
            <p class="cb-kicker">${title.toUpperCase()}</p>
            <h2>${title}.</h2>
            <p class="cb-note">${desc}</p>
          </div>
        </div>
        <div class="cb-card">
          <p class="cb-kicker">READY</p>
          <h3>Start ${title.toLowerCase()}</h3>
          <p>${desc}</p>
          <div class="cb-actions">
            <button class="cb-button primary" data-action="start-mode" data-mode="${mode}">Start</button>
            <button class="cb-button" data-action="goto" data-screen="menu">Back</button>
          </div>
        </div>
      </section>
    `;
  }

  function bindEvents() {
    const root = app;
    root.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", onAction);
    });
    const input = root.querySelector("#cb-answer");
    if (input) {
      input.focus();
      input.addEventListener("input", (e) => {
        state.inputValue = e.target.value;
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const challenge = state.currentChallenge;
          if (challenge?.type === "memory" || challenge?.type === "editor") {
            answerChallenge(input.value);
          } else {
            answerChallenge(input.value);
          }
        }
      });
    }
  }

  function onAction(event) {
    const target = event.currentTarget;
    const action = target.dataset.action;
    if (action === "menu") {
      state.menuFocus = target.dataset.mode;
      if (target.dataset.mode === "campaign") startCampaign(state.campaignProgress || 0);
      else if (target.dataset.mode === "daily") setScreen("daily");
      else if (target.dataset.mode === "quick") setScreen("quick");
      else if (target.dataset.mode === "endless") setScreen("endless");
      else if (target.dataset.mode === "speedrun") setScreen("speedrun");
      render();
      return;
    }
    if (action === "goto") {
      const next = target.dataset.screen;
      if (next === "levelIntro" && target.dataset.startCampaign === "true") {
        startCampaign(state.campaignProgress || 0);
        return;
      }
      if (next === "campaign") {
        state.screen = "campaign";
        render();
        return;
      }
      if (next === "menu") {
        state.screen = "menu";
        render();
        return;
      }
      state.screen = next;
      render();
      return;
    }
    if (action === "start-level") {
      startLevel();
      return;
    }
    if (action === "start-mode") {
      startMode(target.dataset.mode);
      return;
    }
    if (action === "submit-input") {
      answerChallenge(state.inputValue);
      return;
    }
    if (action === "answer") {
      answerChallenge(target.dataset.value);
      return;
    }
    if (action === "reaction") {
      answerChallenge(target.dataset.value);
      return;
    }
    if (action === "powerup") {
      usePowerup(target.dataset.key);
      return;
    }
    if (action === "next-level") {
      if (state.mode === "campaign" && state.selectedLevel < 29) {
        state.campaignProgress = Math.max(state.campaignProgress, state.selectedLevel + 1);
        startCampaign(state.selectedLevel + 1);
      } else {
        state.screen = "menu";
        render();
      }
      return;
    }
    if (action === "restart") {
      startCampaign(state.selectedLevel);
      return;
    }
    if (action === "toggle-setting") {
      const key = target.dataset.key;
      state.settings[key] = !state.settings[key];
      saveJSON(storageKeys.settings, state.settings);
      render();
      return;
    }
    if (action === "leaderboard-tab") {
      state.leaderboardTab = target.dataset.tab;
      state.leaderboardPage = 0;
      render();
      return;
    }
    if (action === "leaderboard-page") {
      const maxPage = Math.max(0, Math.ceil(leaderboardCount(state.leaderboardTab) / 10) - 1);
      state.leaderboardPage = clamp(state.leaderboardPage + Number(target.dataset.dir), 0, maxPage);
      render();
      return;
    }
    if (action === "level") {
      const level = Number(target.dataset.level);
      if (!target.disabled) startCampaign(level);
    }
  }

  function updateHud() {
    if (connectionState) {
      connectionState.textContent = state.screen === "play" ? "IN RUN" : "LOCAL SESSION";
    }
  }

  function traceWarningMessage(trace) {
    if (trace >= 90) return { title: "Critical trace", copy: "Security lockdown is imminent. Finish the target now." };
    if (trace >= 75) return { title: "Critical trace", copy: "Detection is close. One bad move can end the run." };
    if (trace >= 50) return { title: "System monitoring detected", copy: "Security response has increased. Stay clean." };
    return null;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
})();
