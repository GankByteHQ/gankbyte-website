(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const elements = {
    start: $("codebreaker-start"),
    level: $("codebreaker-level"),
    score: $("codebreaker-score"),
    lives: $("codebreaker-lives"),
    trace: $("codebreaker-trace"),
    time: $("codebreaker-time"),
    powerups: $("codebreaker-powerups"),
    system: $("codebreaker-system"),
    title: $("codebreaker-title"),
    progress: $("codebreaker-progress"),
    code: $("codebreaker-code"),
    clue: $("codebreaker-clue"),
    options: $("codebreaker-options"),
    input: $("codebreaker-input"),
    submit: $("codebreaker-submit"),
    feedback: $("codebreaker-feedback"),
    traceBar: $("codebreaker-trace-bar"),
    terminal: $("codebreaker-terminal"),
    resultCard: $("codebreaker-result-card"),
    resultBadge: $("codebreaker-result-badge"),
    resultScore: $("codebreaker-result-score"),
    resultDetail: $("codebreaker-result-detail"),
    resultNote: $("codebreaker-result-note"),
    powerGrid: $("codebreaker-powergrid"),
    achievements: $("codebreaker-achievements"),
    leaderboardBody: $("codebreaker-leaderboard-body")
  };

  const BEST_SCORE_KEY = "gankbyte-codebreaker-best";
  const BEST_LEVEL_KEY = "gankbyte-codebreaker-best-level";
  const RUNS_KEY = "gankbyte-codebreaker-runs";
  const LAST_PLAYED_KEY = "gankbyte-codebreaker-last-played";
  const ACHIEVEMENTS_KEY = "gankbyte-codebreaker-achievements";
  const MAX_LIVES = 5;

  const levelMeta = [
    { title: "SCHOOL COMPUTER", subtitle: "Basic code, passwords and simple logic." },
    { title: "SCHOOL COMPUTER", subtitle: "Basic code, passwords and simple logic." },
    { title: "SCHOOL COMPUTER", subtitle: "Basic code, passwords and simple logic." },
    { title: "GAMING SERVER", subtitle: "Simple JavaScript, patterns and basic decoding." },
    { title: "GAMING SERVER", subtitle: "Simple JavaScript, patterns and basic decoding." },
    { title: "GAMING SERVER", subtitle: "Simple JavaScript, patterns and basic decoding." },
    { title: "WEB SERVER", subtitle: "HTML, CSS, JavaScript and debugging challenges." },
    { title: "WEB SERVER", subtitle: "HTML, CSS, JavaScript and debugging challenges." },
    { title: "WEB SERVER", subtitle: "HTML, CSS, JavaScript and debugging challenges." },
    { title: "FIREWALL BOSS", subtitle: "Multi-stage security challenge.", boss: true },
    { title: "CORPORATE NETWORK", subtitle: "More complex code, logic and security puzzles." },
    { title: "CORPORATE NETWORK", subtitle: "More complex code, logic and security puzzles." },
    { title: "CORPORATE NETWORK", subtitle: "More complex code, logic and security puzzles." },
    { title: "CORPORATE NETWORK", subtitle: "More complex code, logic and security puzzles." },
    { title: "CLOUD SERVER", subtitle: "Multiple challenges and shorter timers." },
    { title: "CLOUD SERVER", subtitle: "Multiple challenges and shorter timers." },
    { title: "E-COMMERCE SYSTEM", subtitle: "Database logic, passwords and data challenges." },
    { title: "E-COMMERCE SYSTEM", subtitle: "Database logic, passwords and data challenges." },
    { title: "BANK SYSTEM", subtitle: "Advanced logic, encryption-style puzzles and higher TRACE." },
    { title: "ROOT ACCESS BOSS", subtitle: "Major multi-stage final security system.", boss: true },
    { title: "SATELLITE NETWORK", subtitle: "Fast challenges, sequences and data decoding." },
    { title: "SATELLITE NETWORK", subtitle: "Fast challenges, sequences and data decoding." },
    { title: "OVERCLOCKED CORE", subtitle: "Extremely short timers." },
    { title: "MIRROR SYSTEM", subtitle: "Instructions can change during challenges." },
    { title: "FRACTURED CODE", subtitle: "Multiple correct-looking answers." },
    { title: "SECURITY OVERLOAD", subtitle: "Constantly increasing TRACE." },
    { title: "SENTIENT SYSTEM", subtitle: "The system adapts to the player's performance." },
    { title: "WATCHER", subtitle: "The system actively creates harder challenges." },
    { title: "NULL NETWORK", subtitle: "Very limited UI and hidden information." },
    { title: "GANKBYTE MAINFRAME", subtitle: "Ultimate boss system.", boss: true }
  ];

  const words = [
    "BYTE", "TRACE", "CACHE", "TOKEN", "VECTOR", "STACK", "QUEUE", "MODULE",
    "SCRIPT", "PORTAL", "ACCESS", "FIREWALL", "ROUTER", "BINARY", "CIPHER",
    "PATCH", "KERNEL", "SIGNAL", "BUFFER", "MATRIX", "DIGEST", "GATE", "PROXY",
    "ROOT", "SCANNER", "MIRROR", "NETWORK", "ALPHA", "DELTA", "ORBIT"
  ];

  const phrases = [
    "OPEN PORT",
    "ROOT ACCESS",
    "CLEAR TRACE",
    "SYSTEM BREACH",
    "MAINFRAME KEY",
    "VERIFY HASH",
    "NULL CHECK",
    "ACCESS GRANTED",
    "DECODE SIGNAL"
  ];

  const symbolSets = [
    ["â—†", "â–²", "â—"],
    ["â—¼", "â—»", "â—†", "â—‡"],
    ["â– ", "â–²", "â—", "â—†"]
  ];

  const powerupDefs = [
    { id: "scan", label: "Scan", unlockLevel: 1, description: "Reveal the current clue again and bleed off trace.", apply: (ctx) => { ctx.state.trace = Math.max(0, ctx.state.trace - 12); ctx.revealHint(true); } },
    { id: "overclock", label: "Overclock", unlockLevel: 3, description: "Add 8 seconds to the current timer.", apply: (ctx) => { ctx.state.timeLeft += 8; ctx.setFeedback("Overclock applied. Extra time added."); } },
    { id: "trace-dump", label: "Trace Dump", unlockLevel: 5, description: "Reduce trace by 35.", apply: (ctx) => { ctx.state.trace = Math.max(0, ctx.state.trace - 35); ctx.setFeedback("Trace dumped. The heat dropped."); } },
    { id: "firewall-patch", label: "Firewall Patch", unlockLevel: 8, description: "Restore one life.", apply: (ctx) => { ctx.state.lives = Math.min(MAX_LIVES, ctx.state.lives + 1); ctx.setFeedback("Firewall patched. One life restored."); } },
    { id: "decrypt", label: "Decrypt", unlockLevel: 12, description: "Reveal part of the answer or remove a wrong option.", apply: (ctx) => { ctx.revealHint(true); ctx.shaveWrongOptions(); } },
    { id: "override", label: "Override", unlockLevel: 16, description: "Skip the current gate at a small score cost.", apply: (ctx) => { ctx.setFeedback("Override engaged. The current gate was skipped."); ctx.skipChallenge(); } },
    { id: "cloak", label: "Signal Cloak", unlockLevel: 20, description: "Halve trace gain for the next three levels.", apply: (ctx) => { ctx.state.cloakLevels = 3; ctx.setFeedback("Signal Cloak engaged. Trace gain reduced for three levels."); } }
  ];

  const achievementDefs = [
    { id: "first-breach", title: "First breach", description: "Clear level 1.", condition: (s) => s.maxLevelCleared >= 1 },
    { id: "clean-run", title: "Clean run", description: "Clear a level with zero wrong answers.", condition: (s) => s.cleanLevelCleared },
    { id: "trace-zero", title: "Trace zero", description: "Finish a level with no trace buildup.", condition: (s) => s.traceOnClear === 0 },
    { id: "firewall", title: "Firewall buster", description: "Clear the first boss firewall.", condition: (s) => s.maxLevelCleared >= 10 },
    { id: "root-access", title: "Root access", description: "Clear the second boss.", condition: (s) => s.maxLevelCleared >= 20 },
    { id: "mainframe", title: "Mainframe", description: "Clear the final boss.", condition: (s) => s.maxLevelCleared >= 30 },
    { id: "cipher-run", title: "Cipher runner", description: "Solve 10 cipher-style clues.", condition: (s) => s.counts.cipher >= 10 },
    { id: "binary-run", title: "Binary runner", description: "Solve 10 binary or hex clues.", condition: (s) => s.counts.binary >= 10 },
    { id: "power-user", title: "Power user", description: "Spend 5 powerups.", condition: (s) => s.powerupsUsed >= 5 },
    { id: "speed-breach", title: "Speed breach", description: "Clear a level with 10 seconds or more left.", condition: (s) => s.fastClears >= 1 }
  ];

  const state = {
    running: false,
    level: 1,
    score: 0,
    lives: MAX_LIVES,
    trace: 0,
    timeLeft: 0,
    runSeed: 0,
    challenge: null,
    boss: null,
    lastFrame: 0,
    memoryTimer: null,
    powerupsUsed: 0,
    wrongAnswers: 0,
    maxLevelCleared: 0,
    cleanLevelCleared: false,
    traceOnClear: 0,
    fastClears: 0,
    currentLevelMistakes: 0,
    counts: {
      password: 0,
      sequence: 0,
      binary: 0,
      cipher: 0,
      pattern: 0,
      logic: 0,
      syntax: 0,
      database: 0,
      memory: 0,
      hex: 0
    },
    cloakLevels: 0,
    powerups: powerupDefs.map((item) => ({ ...item, unlocked: false, charges: 0 })),
    unlockedAchievementIds: new Set(readJson(ACHIEVEMENTS_KEY, []))
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function rngFactory(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ t >>> 15, t | 1);
      x ^= x + Math.imul(x ^ x >>> 7, x | 61);
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }

  function seedFor(level, stage) {
    return (state.runSeed ^ ((level + 1) * 2654435761) ^ ((stage + 11) * 1013904223)) >>> 0;
  }

  function pick(list, rng) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function shuffle(list, rng) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function toBinary(text) {
    return text.split("").map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
  }

  function toHex(text) {
    return text.split("").map((ch) => ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")).join(" ");
  }

  function caesar(text, shift) {
    return text.split("").map((ch) => {
      const lower = ch.toLowerCase();
      if (lower < "a" || lower > "z") return ch;
      const code = lower.charCodeAt(0) - 97;
      return String.fromCharCode(65 + ((code + shift + 26) % 26));
    }).join("");
  }

  function formatTime(value) {
    const seconds = Math.max(0, value);
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }

  function levelMetaAt(level) {
    return levelMeta[level - 1] || levelMeta[levelMeta.length - 1];
  }

  function challengeDifficulty(level) {
    return Math.max(0, Math.floor((level - 1) / 3));
  }

  function timeLimitFor(level, boss) {
    const base = boss ? 18 : 22;
    return Math.max(7, base - Math.floor(level / 2) - challengeDifficulty(level));
  }

  function challengePoints(level, boss) {
    return (boss ? 220 : 120) + level * 18;
  }

  function buildTextChallenge({ level, title, code, answer, clue, hint, note, stage = null, boss = false, type = "text", answers = null }) {
    const canonicalAnswers = (answers || [answer]).map(normalize);
    return {
      level,
      title,
      code,
      clue,
      hint,
      note: note || "",
      boss,
      stage,
      type,
      answers: canonicalAnswers,
      timeLimit: timeLimitFor(level, boss),
      points: challengePoints(level, boss)
    };
  }

  function buildChoiceChallenge({ level, title, code, options, answerIndex, clue, hint, note, stage = null, boss = false }) {
    const rng = rngFactory(seedFor(level, stage || 0) ^ 0x9E3779B9);
    const shuffled = options.map((value, index) => ({ value, index }));
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const mappedAnswerIndex = shuffled.findIndex((item) => item.index === answerIndex);
    return {
      level,
      title,
      code,
      clue,
      hint,
      note: note || "",
      boss,
      stage,
      type: "choice",
      options: shuffled.map((item) => item.value),
      answerIndex: mappedAnswerIndex,
      timeLimit: timeLimitFor(level, boss),
      points: challengePoints(level, boss)
    };
  }

  function reverseChallenge(level, rng, boss, stage) {
    const word = pick(words, rng);
    const answer = word.split("").reverse().join("");
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Password reversal",
      code: word,
      answer,
      clue: "Read the key backward.",
      hint: `The password is ${word.length} characters long.`,
      note: "Warm-up logic. No punctuation, just a simple reversal.",
      stage,
      boss
    });
  }

  function binaryChallenge(level, rng, boss, stage) {
    const word = pick(words, rng);
    const encoded = toBinary(word);
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Binary decode",
      code: encoded,
      answer: word,
      clue: "Turn the binary blocks back into a word.",
      hint: "Each group is one ASCII character.",
      note: "Ignore the spaces between bytes.",
      stage,
      boss
    });
  }

  function hexChallenge(level, rng, boss, stage) {
    const word = pick(phrases, rng);
    const encoded = toHex(word);
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Hex decode",
      code: encoded,
      answer: word,
      clue: "Decode the hex bytes into a phrase.",
      hint: "Convert each pair into ASCII.",
      note: "Spaces are part of the payload.",
      stage,
      boss
    });
  }

  function cipherChallenge(level, rng, boss, stage) {
    const phrase = pick(phrases, rng);
    const shift = 1 + Math.floor(rng() * (boss ? 7 : 5));
    const encoded = caesar(phrase, shift);
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Caesar cipher",
      code: encoded,
      answer: phrase,
      clue: `Decrypt with a shift of ${shift}.`,
      hint: "Shift the letters backward by the same amount.",
      note: "Case does not matter. Punctuation stays where it is.",
      stage,
      boss
    });
  }

  function patternChallenge(level, rng, boss, stage) {
    const set = pick(symbolSets, rng);
    const step = Math.max(2, 2 + challengeDifficulty(level));
    const pattern = [];
    for (let i = 0; i < 4; i += 1) pattern.push(set[i % set.length]);
    const answer = set[step % set.length];
    pattern.push("?");
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Pattern break",
      code: pattern.join(" "),
      answer,
      clue: "Continue the repeating symbol pattern.",
      hint: `The sequence cycles every ${set.length} symbols.`,
      note: "The next symbol follows the same cycle.",
      stage,
      boss
    });
  }

  function sequenceChallenge(level, rng, boss, stage) {
    const start = 2 + Math.floor(rng() * 7);
    const step = 2 + Math.floor(rng() * (boss ? 7 : 5));
    const sequence = [start];
    let current = start;
    for (let i = 0; i < 4; i += 1) {
      current += step + i;
      sequence.push(current);
    }
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Sequence scan",
      code: `${sequence.slice(0, 4).join(", ")}, ?`,
      answer: String(sequence[4]),
      clue: "Find the next number in the growing series.",
      hint: `The step increases by one each time.`,
      note: "The numbers are climbing, not looping.",
      stage,
      boss
    });
  }

  function logicChallenge(level, rng, boss, stage) {
    const a = 3 + Math.floor(rng() * 8);
    const b = 2 + Math.floor(rng() * 4);
    const answer = String(a * b);
    const options = shuffle([answer, String(a * b + 2), String(a * b - b), String(a + b)], rng);
    return buildChoiceChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Logic check",
      code: `TRACE rises by ${a} every ${b} seconds.`,
      options,
      answerIndex: options.indexOf(answer),
      clue: "How much trace rises in total after the full window?",
      hint: "Multiply the rise by the number of steps.",
      note: "Read the full sentence. The answer is a number.",
      stage,
      boss
    });
  }

  function syntaxChallenge(level, rng, boss, stage) {
    const snippets = [
      { prompt: "Which line is valid JavaScript?", correct: "const trace = 10;", wrong: ["const trace = 10", "let trace == 10;", "const trace => 10;"] },
      { prompt: "Which line correctly checks the threshold?", correct: "if (trace >= 100) { loseLife(); }", wrong: ["if trace >= 100 { loseLife(); }", "if (trace = 100) { loseLife(); }", "if (trace > 100) loseLife();"] },
      { prompt: "Which line is valid HTML?", correct: "<button type=\"button\">Hack</button>", wrong: ["<button type=\"button\">Hack", "<button type=\"button\" />Hack</button>", "<button type=\"button\">Hack<button>"] },
      { prompt: "Which CSS rule is valid?", correct: ".panel { border: 1px solid var(--line); }", wrong: [".panel = border: 1px solid var(--line);", ".panel { border = 1px solid var(--line); }", ".panel [ border: 1px solid var(--line); ]"] }
    ];
    const item = pick(snippets, rng);
    const options = shuffle([item.correct].concat(item.wrong), rng);
    return buildChoiceChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Syntax patch",
      code: item.prompt,
      options,
      answerIndex: options.indexOf(item.correct),
      clue: "Pick the line that would actually run.",
      hint: "One option follows the language rules exactly.",
      note: "The others are close, but broken.",
      stage,
      boss
    });
  }

  function databaseChallenge(level, rng, boss, stage) {
    const live = 2 + Math.floor(rng() * 4);
    const draft = 1 + Math.floor(rng() * 3);
    const archived = 1 + Math.floor(rng() * 2);
    const total = live + draft + archived;
    const answer = String(live);
    const options = shuffle([answer, String(live + 1), String(Math.max(0, live - 1)), String(total)], rng);
    return buildChoiceChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Database count",
      code: `live=${live} | draft=${draft} | archived=${archived}`,
      options,
      answerIndex: options.indexOf(answer),
      clue: "How many rows are live?",
      hint: "Ignore draft and archived rows.",
      note: "This is a simple count query in disguise.",
      stage,
      boss
    });
  }

  function memoryChallenge(level, rng, boss, stage) {
    const partOne = pick(words, rng).slice(0, 2 + Math.min(2, challengeDifficulty(level)));
    const partTwo = String(10 + Math.floor(rng() * 89));
    const partThree = pick(["Q", "X", "R", "M", "T", "Z"], rng) + String(1 + Math.floor(rng() * 9));
    const code = `${partOne}-${partTwo}-${partThree}`;
    return buildTextChallenge({
      level,
      title: boss ? `Firewall gate ${stage + 1}/3` : "Memory pulse",
      code,
      answer: code,
      clue: "Memorise the code before the window closes.",
      hint: "The code will fade after a moment.",
      note: "The answer includes the hyphens.",
      stage,
      boss
    });
  }

  function makeBossGroup(level, rng) {
    const stageMix = level <= 10
      ? [binaryChallenge, syntaxChallenge, cipherChallenge]
      : level <= 20
        ? [logicChallenge, databaseChallenge, memoryChallenge]
        : [cipherChallenge, binaryChallenge, syntaxChallenge];
    const stages = stageMix.map((factory, stageIndex) => factory(level, rngFactory(seedFor(level, stageIndex) ^ 0x51), true, stageIndex));
    return {
      boss: true,
      level,
      index: 0,
      stages,
      title: levelMetaAt(level).title,
      subtitle: levelMetaAt(level).subtitle
    };
  }

  function buildChallenge(level, stageIndex) {
    const meta = levelMetaAt(level);
    const rng = rngFactory(seedFor(level, stageIndex || 0));
    if (meta.boss) return makeBossGroup(level, rng);
    const pool = level <= 3
      ? [reverseChallenge, sequenceChallenge, patternChallenge]
      : level <= 6
        ? [binaryChallenge, cipherChallenge, syntaxChallenge]
        : level <= 9
          ? [databaseChallenge, logicChallenge, memoryChallenge, hexChallenge]
          : level <= 19
            ? [binaryChallenge, cipherChallenge, patternChallenge, syntaxChallenge, databaseChallenge, memoryChallenge, hexChallenge, logicChallenge]
            : [binaryChallenge, cipherChallenge, patternChallenge, syntaxChallenge, databaseChallenge, memoryChallenge, hexChallenge, logicChallenge, sequenceChallenge];
    const factory = pick(pool, rng);
    return factory(level, rng, false, stageIndex || 0);
  }

  function activeChallenge() {
    if (state.boss) return state.boss.stages[state.boss.index];
    return state.challenge;
  }

  function totalPowerups() {
    return state.powerups.reduce((sum, powerup) => sum + powerup.charges, 0);
  }

  function setFeedback(message, error) {
    elements.feedback.innerHTML = error ? `<strong>${message}</strong>` : message;
  }

  function updateHud() {
    elements.level.textContent = `${String(state.level).padStart(2, "0")} / 30`;
    elements.score.textContent = state.score.toLocaleString();
    elements.lives.textContent = String(state.lives);
    elements.trace.textContent = `${Math.round(state.trace)}`;
    elements.time.textContent = formatTime(state.timeLeft);
    elements.powerups.textContent = String(totalPowerups());
    elements.traceBar.style.width = `${Math.max(0, Math.min(100, state.trace))}%`;
    elements.terminal.classList.toggle("is-boss", Boolean(state.boss));
    elements.terminal.classList.toggle("is-warn", state.trace >= 75);
  }

    function renderPowerups() {
    elements.powerGrid.innerHTML = "";
    state.powerups.forEach((powerup) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "codebreaker-power-button";
      button.dataset.powerup = powerup.id;
      button.disabled = !state.running || !powerup.charges;
      button.innerHTML = `<strong>${powerup.label} <span>x${powerup.charges}</span></strong><small>${powerup.description}</small>`;
      button.addEventListener("click", () => usePowerup(powerup.id));
      elements.powerGrid.appendChild(button);
    });
  }

  function renderAchievements() {
    elements.achievements.innerHTML = "";
    achievementDefs.forEach((achievement) => {
      const unlocked = state.unlockedAchievementIds.has(achievement.id);
      const card = document.createElement("div");
      card.className = `codebreaker-achievement${unlocked ? " is-unlocked" : ""}`;
      card.innerHTML = `<strong>${achievement.title}</strong><span>${unlocked ? "Unlocked on this device." : achievement.description}</span>`;
      elements.achievements.appendChild(card);
    });
  }

  function renderLeaderboard() {
    const runs = readJson(RUNS_KEY, []);
    const sorted = runs.slice().sort((a, b) => {
      if (b.completed !== a.completed) return Number(b.completed) - Number(a.completed);
      if (b.level !== a.level) return b.level - a.level;
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date) - new Date(a.date);
    });
    elements.leaderboardBody.innerHTML = sorted.length
      ? sorted.slice(0, 10).map((run, index) => {
          const result = run.completed ? "Mainframe breached" : run.result;
          const date = new Date(run.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
          return `<tr><td>${index + 1}</td><td>${escapeHtml(result)}</td><td>${String(run.level).padStart(2, "0")}</td><td>${run.score.toLocaleString()}</td><td>${date}</td></tr>`;
        }).join("")
      : '<tr><td colspan="5">No runs yet. Start the campaign to create the first entry.</td></tr>';
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
  }

  function markAchievement(id) {
    if (state.unlockedAchievementIds.has(id)) return;
    state.unlockedAchievementIds.add(id);
    writeJson(ACHIEVEMENTS_KEY, Array.from(state.unlockedAchievementIds));
    renderAchievements();
  }

  function checkAchievements() {
    const snapshot = {
      maxLevelCleared: state.maxLevelCleared,
      cleanLevelCleared: state.cleanLevelCleared,
      traceOnClear: state.traceOnClear,
      powerupsUsed: state.powerupsUsed,
      fastClears: state.fastClears,
      counts: state.counts
    };
    achievementDefs.forEach((achievement) => {
      if (achievement.condition(snapshot)) markAchievement(achievement.id);
    });
  }

  function grantPowerupCharge(level) {
    const unlocked = state.powerups.filter((powerup) => powerup.unlocked);
    if (!unlocked.length) return;
    const rng = rngFactory(seedFor(level, 97));
    const target = pick(unlocked, rng);
    target.charges += 1;
    renderPowerups();
  }

  function unlockPowerups(level) {
    let changed = false;
    state.powerups.forEach((powerup) => {
      if (level >= powerup.unlockLevel && !powerup.unlocked) {
        powerup.unlocked = true;
        powerup.charges += 1;
        changed = true;
      }
    });
    if (changed) renderPowerups();
  }

  function clearMemoryTimer() {
    if (state.memoryTimer) {
      clearTimeout(state.memoryTimer);
      state.memoryTimer = null;
    }
  }

  function showChallenge() {
    const challenge = activeChallenge();
    if (!challenge) return;
    const meta = levelMetaAt(state.level);
    elements.system.textContent = meta.title;
    elements.title.textContent = challenge.title;
    elements.progress.textContent = challenge.boss
      ? `Level ${String(state.level).padStart(2, "0")} / 30 // Stage ${challenge.stage + 1}/3`
      : `Level ${String(state.level).padStart(2, "0")} / 30`;
    elements.code.textContent = challenge.code;
    elements.clue.textContent = challenge.clue;
    elements.options.hidden = challenge.type !== "choice";
    elements.options.innerHTML = "";
    elements.input.parentElement.hidden = challenge.type === "choice";
    elements.input.value = "";
    elements.input.disabled = challenge.type === "choice";
    elements.submit.disabled = !state.running;
    elements.resultCard.hidden = true;
    if (challenge.type === "choice") {
      challenge.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "codebreaker-option";
        button.textContent = option;
        button.addEventListener("click", () => submitAnswer(String(index)));
        elements.options.appendChild(button);
      });
    }
    if (challenge.type === "memory") {
      challenge.visible = true;
      clearMemoryTimer();
      state.memoryTimer = setTimeout(() => {
        if (!state.running) return;
        const current = activeChallenge();
        if (!current || current !== challenge) return;
        challenge.visible = false;
        elements.code.textContent = "Memory window closed.";
        elements.clue.textContent = "Type the code from memory. The answer still includes the hyphens.";
      }, 2000);
    }
    updateHud();
    renderPowerups();
    setFeedback(challenge.note || "Solve the gate before the timer reaches zero.");
    if (!state.running) return;
    elements.input.focus();
  }

  function startLevel(level) {
    unlockPowerups(level);
    if (level > 30) {
      finishRun(true);
      return;
    }
    state.boss = null;
    state.challenge = null;
    state.trace = Math.max(0, state.trace - 8);
    state.currentLevelMistakes = 0;
    state.cleanLevelCleared = false;
    state.traceOnClear = 0;
    if (levelMetaAt(level).boss) {
      state.boss = buildChallenge(level, 0);
      state.timeLeft = state.boss.stages[0].timeLimit;
    } else {
      state.challenge = buildChallenge(level, 0);
      state.timeLeft = state.challenge.timeLimit;
    }
    clearMemoryTimer();
    showChallenge();
  }

  function startCampaign() {
    state.running = true;
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    state.trace = 0;
    state.timeLeft = 0;
    state.runSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    state.challenge = null;
    state.boss = null;
    state.powerups.forEach((powerup) => {
      powerup.unlocked = false;
      powerup.charges = 0;
    });
    state.powerups[0].unlocked = true;
    state.powerups[0].charges = 1;
    state.powerupsUsed = 0;
    state.wrongAnswers = 0;
    state.maxLevelCleared = 0;
    state.cleanLevelCleared = false;
    state.traceOnClear = 0;
    state.fastClears = 0;
    state.currentLevelMistakes = 0;
    state.counts = {
      password: 0,
      sequence: 0,
      binary: 0,
      cipher: 0,
      pattern: 0,
      logic: 0,
      syntax: 0,
      database: 0,
      memory: 0,
      hex: 0
    };
    elements.resultCard.hidden = true;
    elements.terminal.classList.remove("is-warn");
    elements.start.textContent = "Restart campaign";
    setFeedback("Campaign started. Break the current system before trace or time runs you out.");
    startLevel(1);
    renderPowerups();
    renderAchievements();
  }

    function skipChallenge() {
    if (!state.running) return;
    state.score = Math.max(0, state.score - 60);
    setFeedback("Override used. The gate was skipped, but the score took a hit.");
    completeCurrentChallenge(true);
  }

  function revealHint(fromPowerup) {
    const challenge = activeChallenge();
    if (!challenge) return;
    if (challenge.hint) {
      elements.clue.textContent = challenge.hint;
    }
    if (fromPowerup) {
      setFeedback("Hint revealed. Keep going.", false);
    }
  }

  function shaveWrongOptions() {
    const challenge = activeChallenge();
    if (!challenge || challenge.type !== "choice") return;
    const buttons = Array.from(elements.options.querySelectorAll(".codebreaker-option"));
    const wrongButtons = buttons.filter((button) => Number(button.dataset.answerIndex) !== challenge.answerIndex);
    wrongButtons.slice(0, Math.max(1, wrongButtons.length - 2)).forEach((button) => {
      button.disabled = true;
      button.style.opacity = ".35";
    });
  }

    function usePowerup(id) {
    if (!state.running) return;
    const powerup = state.powerups.find((item) => item.id === id);
    if (!powerup || !powerup.unlocked || !powerup.charges) return;
    powerup.charges -= 1;
    state.powerupsUsed += 1;
    powerup.apply({
      state,
      revealHint,
      shaveWrongOptions,
      skipChallenge,
      setFeedback
    });
    if (id === "scan" || id === "decrypt") {
      revealHint(true);
    }
    renderPowerups();
    updateHud();
  }

  function completeCurrentChallenge(skipped) {
    const challenge = activeChallenge();
    if (!challenge) return;
    const gain = Math.max(35, Math.round(challenge.points + state.timeLeft * 22 - state.trace * 2));
    state.score += skipped ? Math.max(20, Math.floor(gain * 0.45)) : gain;
    state.trace = Math.max(0, state.trace - 18);
    state.traceOnClear = Math.round(state.trace);
    state.cleanLevelCleared = state.currentLevelMistakes === 0;
    state.maxLevelCleared = Math.max(state.maxLevelCleared, state.level);
    if (state.timeLeft >= 10) state.fastClears += 1;
    if (challenge.type in state.counts) state.counts[challenge.type] += 1;
    if (state.level % 5 === 0 || state.level === 30) grantPowerupCharge(state.level);
    checkAchievements();

    if (state.boss) {
      state.boss.index += 1;
      if (state.boss.index >= state.boss.stages.length) {
        state.level += 1;
        state.boss = null;
        state.challenge = null;
        setFeedback(`BOSS cleared. ${levelMetaAt(state.level - 1).title} breached.`);
        unlockPowerups(state.level);
        updateHud();
        renderPowerups();
        if (state.level > 30) {
          finishRun(true);
          return;
        }
        startLevel(state.level);
        return;
      }
      state.timeLeft = state.boss.stages[state.boss.index].timeLimit;
      showChallenge();
      setFeedback(`Stage ${state.boss.index + 1}/3 cleared. Keep pushing through the firewall.`);
      updateHud();
      return;
    }

    state.level += 1;
    updateHud();
    if (state.level > 30) {
      finishRun(true);
      return;
    }
    setFeedback(`ACCESS GRANTED. ${levelMetaAt(state.level - 1).title} cleared.`);
    startLevel(state.level);
  }

  function loseLife(reason) {
    state.lives -= 1;
    state.trace = 35;
    state.currentLevelMistakes = Math.max(state.currentLevelMistakes, 1);
    setFeedback(reason, true);
    if (state.lives <= 0) {
      finishRun(false, reason);
      return;
    }
    const challenge = activeChallenge();
    if (challenge) {
      state.timeLeft = challenge.timeLimit;
      showChallenge();
    }
  }

  function submitAnswer(rawValue) {
    if (!state.running) return;
    const challenge = activeChallenge();
    if (!challenge) return;
    const value = rawValue ?? elements.input.value;
    if (challenge.type === "choice") return;
    const normalized = normalize(value);
    if (!normalized) {
      setFeedback("Type an answer before submitting.", true);
      return;
    }
    if (challenge.answers.includes(normalized)) {
      completeCurrentChallenge(false);
      return;
    }
    state.wrongAnswers += 1;
    state.currentLevelMistakes += 1;
    state.trace = Math.min(100, state.trace + 22);
    state.score = Math.max(0, state.score - 20);
    setFeedback("ACCESS DENIED. Wrong answer. Trace increased.", true);
    if (state.trace >= 100) {
      loseLife("TRACE overload burned a life.");
      return;
    }
    updateHud();
  }

  function finishRun(won, reason) {
    clearMemoryTimer();
    state.running = false;
    const finalLevel = Math.min(30, state.level > 30 ? 30 : state.level);
    const finalScore = Math.max(0, Math.round(state.score + (won ? 1500 : 0)));
    const resultLabel = won ? "Mainframe breached" : reason || "Campaign failed";
    const best = readJson(BEST_SCORE_KEY, { level: 0, score: 0 });
    if (finalLevel > best.level || (finalLevel === best.level && finalScore > best.score)) {
      writeJson(BEST_SCORE_KEY, { level: finalLevel, score: finalScore, completed: won, date: new Date().toISOString() });
    }
    const bestLevel = Number(localStorage.getItem(BEST_LEVEL_KEY) || 0);
    if (finalLevel > bestLevel) localStorage.setItem(BEST_LEVEL_KEY, String(finalLevel));
    localStorage.setItem(LAST_PLAYED_KEY, new Date().toISOString());
    const runs = readJson(RUNS_KEY, []);
    runs.unshift({
      level: finalLevel,
      score: finalScore,
      completed: won,
      result: resultLabel,
      date: new Date().toISOString()
    });
    writeJson(RUNS_KEY, runs.slice(0, 20));
    elements.resultCard.hidden = false;
    elements.resultBadge.textContent = won ? "MAINFRAME BREACHED" : "CAMPAIGN FAILED";
    elements.resultScore.textContent = finalScore.toLocaleString();
    elements.resultDetail.textContent = won ? `Level 30 cleared // ${state.powerupsUsed} powerups used` : `Reached level ${String(finalLevel).padStart(2, "0")} // ${state.lives} lives left`;
    elements.resultNote.textContent = won
      ? "You broke the full campaign. Run it again for a cleaner route or a higher score."
      : "The campaign is still on this device. Restart and push further next time.";
    elements.system.textContent = won ? "MAINFRAME OPEN" : "CAMPAIGN HALTED";
    elements.title.textContent = won ? "Access complete." : "Signal lost.";
    elements.code.textContent = won ? "ROOT ACCESS" : "RUN FAILED";
    elements.clue.textContent = won ? "The final system is down. The run is saved locally." : "The current system locked you out before the campaign ended.";
    elements.options.hidden = true;
    elements.input.parentElement.hidden = true;
    elements.submit.disabled = true;
    elements.start.textContent = "Run again";
    renderLeaderboard();
    updateHud();
    renderPowerups();
    checkAchievements();
    setFeedback(resultLabel === "Mainframe breached" ? "Campaign complete." : `${resultLabel}. Try again.`);
  }

  function loop(now) {
    const delta = Math.min(0.05, (now - state.lastFrame) / 1000 || 0);
    state.lastFrame = now;
    if (state.running) {
      state.timeLeft -= delta;
      const traceGain = (1.1 + state.level * 0.12) * (state.cloakLevels > 0 ? 0.5 : 1);
      state.trace = Math.min(100, state.trace + delta * traceGain * 10);
      if (state.cloakLevels > 0) {
        state.cloakLevels = Math.max(0, state.cloakLevels - delta);
      }
      if (state.timeLeft <= 0) {
        loseLife("The timer expired.");
      }
      if (state.trace >= 100) {
        loseLife("TRACE overload burned a life.");
      }
      updateHud();
    }
    requestAnimationFrame(loop);
  }

  function bindEvents() {
    elements.start.addEventListener("click", startCampaign);
    elements.submit.addEventListener("click", () => submitAnswer());
    elements.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitAnswer();
      }
    });
    elements.options.addEventListener("click", (event) => {
      const button = event.target.closest(".codebreaker-option");
      if (!button) return;
      if (!state.running) return;
      const challenge = activeChallenge();
      if (!challenge || challenge.type !== "choice") return;
      const answerIndex = Number(button.dataset.answerIndex);
      if (Number.isNaN(answerIndex)) return;
      if (answerIndex === challenge.answerIndex) {
        button.classList.add("is-correct");
        completeCurrentChallenge(false);
      } else {
        button.classList.add("is-wrong");
        state.wrongAnswers += 1;
        state.currentLevelMistakes += 1;
        state.trace = Math.min(100, state.trace + 22);
        state.score = Math.max(0, state.score - 20);
        setFeedback("ACCESS DENIED. Wrong answer. Trace increased.", true);
        if (state.trace >= 100) {
          loseLife("TRACE overload burned a life.");
        } else {
          updateHud();
        }
      }
    });
  }

  function init() {
    if (!elements.start) return;
    bindEvents();
    renderAchievements();
    renderPowerups();
    renderLeaderboard();
    state.level = 1;
    state.score = 0;
    state.lives = MAX_LIVES;
    state.trace = 0;
    state.timeLeft = 0;
    updateHud();
    setFeedback("Press start to begin the campaign.");
    requestAnimationFrame(loop);
  }

  init();
}());
