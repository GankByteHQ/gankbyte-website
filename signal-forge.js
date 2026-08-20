(() => {
  "use strict";

  const modules = {
    core: [
      { label: "Signal Salvager", copy: "Collect a moving objective before it burns out." },
      { label: "One-Button Cult", copy: "One input controls movement, risk, and regret." },
      { label: "Orbit Thief", copy: "Steal momentum from things that should be chasing you." },
      { label: "Lantern Runner", copy: "Your light is also your hitbox." },
      { label: "Courier of Bad News", copy: "Carry a live glitch to somewhere it absolutely should not be." },
      { label: "Room-Sized Boss", copy: "The whole arena is one creature with a temper." }
    ],
    threat: [
      { label: "The Arena Learns", copy: "Every route you repeat becomes dangerous." },
      { label: "The Floor Remembers", copy: "Your old mistakes remain active on the map." },
      { label: "The Safe Zone Lies", copy: "The obvious escape is bait with good lighting." },
      { label: "Your Shadow Scores", copy: "A second version of you is quietly winning." },
      { label: "Glitches Arrive Early", copy: "The warning appears after the danger." },
      { label: "Walls Have Opinions", copy: "The boundary moves when you get comfortable." }
    ],
    twist: [
      { label: "Combo Debt", copy: "Every point today makes tomorrow harder." },
      { label: "Trade Score for Control", copy: "Spend your score to make one perfect move." },
      { label: "Mute the UI", copy: "The game stops explaining itself after the first mistake." },
      { label: "Friendly Fire from Tomorrow", copy: "Your future route returns as a live hazard." },
      { label: "The Final Second Is a Boss", copy: "Survival ends with one last impossible choice." },
      { label: "Rules Decay", copy: "Every clean action removes one rule and adds another." }
    ]
  };
  const $ = (id) => document.getElementById(id);
  const state = { seed: 0, selected: { core: 0, threat: 0, twist: 0 }, result: null };
  const names = ["Bad Signal", "Tiny Catastrophe", "Neon Liability", "Unpaid Boss Fight", "The Last Good Idea", "Glitch With Benefits", "Room For Error", "Protocol: Oops"];
  const verbs = ["salvage", "outrun", "escort", "stack", "trade", "survive", "haunt", "smuggle"];

  function hashState() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const seed = Number(hash.get("signal"));
    return {
      seed: Number.isFinite(seed) && seed >= 0 ? seed % 1000000 : Math.floor(Math.random() * 1000000),
      selected: {
        core: Number(hash.get("core")) || 0,
        threat: Number(hash.get("threat")) || 0,
        twist: Number(hash.get("twist")) || 0
      }
    };
  }
  function rng(seed) { let value = seed >>> 0; return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function choose(list, random) { return list[Math.floor(random() * list.length)]; }
  function cleanSeed(value) { return String(value).padStart(6, "0"); }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function escapeLua(value) { return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
  function makeResult() {
    const random = rng(state.seed);
    const core = modules.core[state.selected.core % modules.core.length];
    const threat = modules.threat[state.selected.threat % modules.threat.length];
    const twist = modules.twist[state.selected.twist % modules.twist.length];
    const title = `${choose(names, random)}: ${core.label}`;
    const verb = choose(verbs, random);
    const chaos = Math.round(36 + random() * 58);
    const promise = Math.round(42 + random() * 54);
    const result = {
      title,
      core,
      threat,
      twist,
      hook: `A ${verb} game where ${core.copy.toLowerCase()} The catch: ${twist.copy.toLowerCase()}`,
      pitch: `Build a short run around ${core.label.toLowerCase()}. Make the player understand the first rule in ten seconds, then let ${threat.label.toLowerCase()} ruin their confidence.` ,
      rule: `${core.label} is the verb. ${threat.label} is the pressure. ${twist.label} changes what winning means.`,
      fail: `The run ends when the player repeats a safe habit three times. The game should make failure feel like information, not a reset.`,
      build: `One arena, one input loop, one readable threat, and one surprising rule. Ship the smallest version before adding content.`,
      chaos,
      promise,
      lua: `local forge = {\n  title = "${escapeLua(title)}",\n  core = "${escapeLua(core.label)}",\n  threat = "${escapeLua(threat.label)}",\n  twist = "${escapeLua(twist.label)}"\n}\n\nfunction forge.tick(player, arena)\n  -- TODO: make the bad idea playable.\n  if arena:rule_is_broken(player) then\n    player:learn("${escapeLua(twist.label)}")\n  end\nend`
    };
    state.result = result;
    return result;
  }
  function render() {
    const result = makeResult();
    setText("forge-seed", `SEED // ${cleanSeed(state.seed)}`);
    setText("core-label", result.core.label); setText("core-copy", result.core.copy);
    setText("threat-label", result.threat.label); setText("threat-copy", result.threat.copy);
    setText("twist-label", result.twist.label); setText("twist-copy", result.twist.copy);
    setText("forge-title", result.title); setText("forge-hook", result.hook);
    setText("forge-pitch", result.pitch); setText("forge-rule", result.rule); setText("forge-fail", result.fail); setText("forge-build", result.build);
    setText("chaos-value", String(result.chaos).padStart(2, "0")); setText("promise-value", String(result.promise).padStart(2, "0"));
    $("chaos-bar").style.width = `${result.chaos}%`;
    $("forge-code").textContent = result.lua;
    setText("forge-rating", result.chaos > 78 ? "SIGNAL UNSTABLE" : result.promise > 80 ? "SIGNAL PROMISING" : "SIGNAL STABLE");
    setText("forge-status", "A new mutation is ready."); $("forge-status").className = "forge-status";
  }
  function roll(module) { state.selected[module] = (state.selected[module] + 1 + Math.floor(Math.random() * (modules[module].length - 1))) % modules[module].length; state.seed = Math.floor(Math.random() * 1000000); render(); }
  function surprise() { state.seed = Math.floor(Math.random() * 1000000); state.selected.core = Math.floor(Math.random() * modules.core.length); state.selected.threat = Math.floor(Math.random() * modules.threat.length); state.selected.twist = Math.floor(Math.random() * modules.twist.length); render(); }
  function blueprint() { const r = state.result; return JSON.stringify({ project: "Signal Forge", seed: state.seed, title: r.title, core: r.core.label, threat: r.threat.label, twist: r.twist.label, pitch: r.pitch, rule: r.rule }, null, 2); }
  async function copy(value, message) { try { await navigator.clipboard.writeText(value); setText("forge-status", message); $("forge-status").className = "forge-status is-success"; } catch { setText("forge-status", "Copy is unavailable here. Select the output manually."); $("forge-status").className = "forge-status is-error"; } }
  $("forge-button").addEventListener("click", () => { state.seed = Math.floor(Math.random() * 1000000); render(); });
  $("surprise-button").addEventListener("click", surprise);
  document.querySelectorAll("[data-roll]").forEach((button) => button.addEventListener("click", () => roll(button.dataset.roll)));
  $("copy-lua").addEventListener("click", () => copy(state.result.lua, "Lua starter copied."));
  $("copy-blueprint").addEventListener("click", () => copy(blueprint(), "Blueprint copied."));
  $("share-forge").addEventListener("click", () => { const hash = `#signal=${state.seed}&core=${state.selected.core}&threat=${state.selected.threat}&twist=${state.selected.twist}`; const url = `${window.location.origin}${window.location.pathname}${hash}`; window.history.replaceState({}, "", hash); copy(url, "Seed link copied."); });
  const initial = hashState(); state.seed = initial.seed; state.selected = initial.selected; render();
})();
