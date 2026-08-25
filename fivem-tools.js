(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const XML = '<?xml version="1.0" encoding="UTF-8"?>';
  const fields = [
    { group: "Weight & Aerodynamics", intro: "The basics — they influence everything else.", items: [
      ["fMass", "Weight", 1600, 200, 10000, 10, "Heavy feels planted but slows acceleration and changes of direction.", "Nimble", "Planted"],
      ["fInitialDragCoeff", "Air resistance", 8.5, .5, 60, .1, "Higher drag holds the car back at speed; lower drag lets it keep pulling.", "Slippery", "Draggy"],
      ["fDownforceModifier", "Downforce", 1, 0, 15, .1, "Aero grip that presses the car down as speed rises.", "Floaty", "Glued down"]
    ]},
    { group: "Engine & Drivetrain", intro: "Power and how it reaches the road.", items: [
      ["fInitialDriveForce", "Engine power", .3, .05, 1.5, .01, "The main acceleration factor. Too high creates wheelspin.", "Gentle", "Brutal"],
      ["nInitialDriveGears", "Gears", 6, 1, 12, 1, "More gears give smoother acceleration and more top-end.", "Few", "Many"],
      ["fInitialDriveMaxFlatVel", "Top speed", 160, 60, 400, 1, "Approximate maximum speed when paired with enough power.", "Slow", "Fast"],
      ["fDriveInertia", "Throttle response", 1, .05, 2, .05, "How quickly the engine responds to throttle input.", "Lazy", "Snappy"],
      ["fDriveBiasFront", "Drivetrain bias", 0, 0, 1, .05, "0 is rear-wheel drive, .5 is all-wheel drive, 1 is front-wheel drive.", "RWD", "FWD"]
    ]},
    { group: "Braking", intro: "How the car slows and where it bites.", items: [
      ["fBrakeForce", "Braking power", 1, .1, 3, .05, "Stopping strength. Very high values can lock the wheels.", "Weak", "Strong"],
      ["fBrakeBiasFront", "Brake balance", .5, 0, 1, .05, "Front/rear braking split. More front bias is usually more stable.", "Rear", "Front"],
      ["fHandBrakeForce", "Handbrake strength", 1, 0, 5, .05, "How hard the handbrake locks the rear wheels.", "Soft", "Grabby"]
    ]},
    { group: "Grip & Traction", intro: "How much the tyres hold — the heart of cornering and drift feel.", items: [
      ["fTractionCurveMax", "Peak grip", 2.2, .5, 4.5, .05, "Maximum cornering grip. Higher is stickier.", "Loose", "Sticky"],
      ["fTractionCurveMin", "Grip when sliding", 2, .5, 4.5, .05, "Grip after the tyres break away. Lower makes slides easier.", "Lets go", "Holds on"],
      ["fTractionBiasFront", "Grip balance", .5, .02, .98, .01, "Front/rear grip split changes understeer and oversteer.", "Rear grip", "Front grip"],
      ["fLowSpeedTractionLossMult", "Launch wheelspin", 1, 0, 3, .05, "Higher values create more wheelspin from a standstill.", "Hooks up", "Spins up"]
    ]},
    { group: "Suspension & Stance", intro: "Ride height and stiffness — composure and looks.", items: [
      ["fSuspensionForce", "Suspension stiffness", 2, .5, 10, .05, "Higher is flatter and sharper but harsher over bumps.", "Soft", "Stiff"],
      ["fSuspensionRaise", "Ride height", 0, -.3, .5, .01, "Negative lowers the vehicle; positive raises it for rough ground.", "Slammed", "Lifted"],
      ["fAntiRollBarForce", "Anti-roll force", .5, 0, 5, .05, "Resists body lean and sharpens turn-in.", "Rolls", "Flat"]
    ]},
    { group: "Steering & Durability", intro: "Turn-in and how tough the vehicle is.", items: [
      ["fSteeringLock", "Steering angle", 35, 10, 60, 1, "Maximum steering angle. Higher helps tight turns and drifting.", "Tight", "Wide"],
      ["fCollisionDamageMult", "Crash damage", 1, 0, 5, .05, "How much vehicle health is lost in impacts.", "Tanky", "Fragile"],
      ["fEngineDamageMult", "Engine fragility", 1.5, 0, 5, .05, "How easily the engine is damaged.", "Tough", "Delicate"]
    ]}
  ];
  const state = Object.fromEntries(fields.flatMap(g => g.items.map(f => [f[0], f[2]])));
  const flags = [
    ["Drivetrain & steering", "Four-wheel steering", "All four wheels steer for tighter turning.", "strHandlingFlags", 7],
    ["Drivetrain & steering", "CVT gearbox", "Smooth, stepless gear behaviour.", "strHandlingFlags", 12],
    ["Drivetrain & steering", "No reverse", "Prevents the vehicle from reversing.", "strHandlingFlags", 9],
    ["Drivetrain & steering", "Open-wheel behaviour", "Formula-style downforce and grip behaviour.", "strAdvancedFlags", 28],
    ["Durability & tyres", "Bulletproof tyres", "Tyres cannot be shot out or burst.", "strModelFlags", 25],
    ["Durability & tyres", "Indestructible body", "Bodywork does not visually deform.", "strModelFlags", 26],
    ["Durability & tyres", "Armoured body", "Reinforced against bullets and impacts.", "strHandlingFlags", 27],
    ["Durability & tyres", "ABS brakes", "Helps resist wheel lock-up.", "strModelFlags", 4],
    ["Terrain & special", "Off-road grip", "Adds extra traction on dirt and rough ground.", "strHandlingFlags", 20],
    ["Terrain & special", "Rally tyres", "Applies rally-style grip behaviour.", "strHandlingFlags", 23],
    ["Terrain & special", "Auto self-right", "Helps flip the vehicle upright after rolling.", "strHandlingFlags", 29]
  ];
  const activeFlags = new Set();
  const presets = { Stock: {}, Sports: { fMass: 1400, fInitialDriveForce: .34, fInitialDriveMaxFlatVel: 200, fBrakeForce: 1.3, fTractionCurveMax: 2.6 }, Race: { fMass: 1300, fInitialDriveForce: .45, fInitialDriveMaxFlatVel: 270, fBrakeForce: 1.8, fTractionCurveMax: 3.1, fDownforceModifier: 6 }, Drift: { fInitialDriveForce: .38, fTractionCurveMax: 2.4, fTractionCurveMin: 1.2, fHandBrakeForce: 3.2, fSteeringLock: 48 }, Offroad: { fMass: 2100, fSuspensionRaise: .14, fDriveBiasFront: .5, fTractionCurveMax: 2, fTractionCurveMin: 1.9 } };
  const outputTypes = { handling: [["meta", "handling.meta"] , ["lua", "Lua override"]], flags: [["meta", "handling.meta"], ["lua", "Lua override"]], carcols: [["carcols", "carcols.meta"]] };
  let editorTab = "handling", outputTab = "meta";
  const esc = (s) => s.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const model = () => ($( "#modelName").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") || "vehicle");
  const hex = (field) => { let value = 0; flags.forEach(f => { if (f[3] === field && activeFlags.has(f[1])) value |= (1 << f[4]); }); return (value >>> 0).toString(16).toUpperCase(); };
  function renderFields() { const wrap = $("#handlingFields"); wrap.innerHTML = ""; fields.forEach(group => { const box = document.createElement("section"); box.className = "handling-group"; box.innerHTML = `<h3>${group.group}</h3><p>${group.intro}</p>`; group.items.forEach(f => { const row = document.createElement("div"); row.className = "handling-row"; row.innerHTML = `<div class="handling-label"><label for="range-${f[0]}">${f[1]} <code>${f[0]}</code></label><input class="handling-value" id="value-${f[0]}" type="number" value="${f[2]}" step="${f[5]}" min="${f[3]}" max="${f[4]}" /></div><input class="handling-range" id="range-${f[0]}" type="range" value="${f[2]}" step="${f[5]}" min="${f[3]}" max="${f[4]}" aria-label="${f[1]} slider" /><div class="range-labels"><span>${f[7]}</span><span>${f[8]}</span></div><p class="handling-desc">${f[6]}</p>`; box.append(row); }); wrap.append(box); }); }
  function sync(key, value) { state[key] = Number(value); $("#range-" + key).value = value; $("#value-" + key).value = value; refresh(); }
  function renderPresets() { const wrap = $("#presets"); Object.entries(presets).forEach(([name, values]) => { const b = document.createElement("button"); b.type = "button"; b.className = "preset-button"; b.textContent = name; b.onclick = () => { fields.flatMap(g => g.items).forEach(f => state[f[0]] = f[2]); Object.assign(state, values); Object.keys(state).forEach(k => { if ($( "#range-" + k)) sync(k, state[k]); }); refresh(); }; wrap.append(b); }); }
  function renderFlags() { const wrap = $("#flagGroups"); const groups = [...new Set(flags.map(f => f[0]))]; groups.forEach(group => { const box = document.createElement("section"); box.className = "flag-group"; box.innerHTML = `<h3>${group}</h3><div class="flag-list"></div>`; flags.filter(f => f[0] === group).forEach(f => { const b = document.createElement("button"); b.type = "button"; b.className = "flag-toggle"; b.innerHTML = `<input type="checkbox" tabindex="-1" /><span><strong>${f[1]}</strong><small>${f[2]}</small></span>`; b.onclick = () => { activeFlags.has(f[1]) ? activeFlags.delete(f[1]) : activeFlags.add(f[1]); b.classList.toggle("on", activeFlags.has(f[1])); b.querySelector("input").checked = activeFlags.has(f[1]); refresh(); }; box.querySelector(".flag-list").append(b); }); wrap.append(box); }); }
  function buildMeta() { const lines = [XML, "<!-- Generated by GankByte FiveM Tools -->", "<CHandlingDataMgr>", "  <HandlingData>", "    <Item type=\"CHandlingData\">", `      <handlingName>${model().toUpperCase()}</handlingName>`]; fields.flatMap(g => g.items).forEach(f => lines.push(`      <${f[0]} value=\"${Number(state[f[0]]).toFixed(f[0].startsWith("n") ? 0 : 6)}\" />`)); lines.push(`      <strModelFlags>${hex("strModelFlags")}</strModelFlags>`, `      <strHandlingFlags>${hex("strHandlingFlags")}</strHandlingFlags>`, `      <strAdvancedFlags>${hex("strAdvancedFlags")}</strAdvancedFlags>`, "    </Item>", "  </HandlingData>", "</CHandlingDataMgr>"); return lines.join("\n"); }
  function buildLua() { const lines = ["-- Generated by GankByte FiveM Tools", `-- Runtime handling override for ${model()}`, "local function applyHandling(vehicle)"]; fields.flatMap(g => g.items).forEach(f => lines.push(`    SetVehicleHandlingFloat(vehicle, 'CHandlingData', '${f[0]}', ${Number(state[f[0]]).toFixed(4)})`)); lines.push("end", "", "-- Call applyHandling(vehicle) when the vehicle is created."); return lines.join("\n"); }
  function buildCarcols() { const kit = $("#kitName").value.trim() || model() + "_modkit", id = Math.max(0, Number($("#kitId").value) || 0); return [XML, "<!-- Generated by GankByte FiveM Tools -->", "<CVehicleModelInfoVarGlobal>", "  <Kits>", "    <Item>", `      <kitName>${kit}</kitName>`, `      <id value=\"${id}\" />`, "      <kitType>MKT_STANDARD</kitType>", "      <visibleMods />", "      <linkMods />", "      <statMods />", "      <slotNames />", "    </Item>", "  </Kits>", "</CVehicleModelInfoVarGlobal>"].join("\n"); }
  function currentOutput() { return editorTab === "carcols" ? buildCarcols() : outputTab === "lua" ? buildLua() : buildMeta(); }
  function renderOutputTabs() { const wrap = $("#outputTabs"); wrap.innerHTML = ""; (outputTypes[editorTab] || []).forEach(([key, label]) => { const b = document.createElement("button"); b.className = "output-tab" + (key === outputTab ? " active" : ""); b.type = "button"; b.textContent = label; b.onclick = () => { outputTab = key; renderOutputTabs(); refresh(); }; wrap.append(b); }); }
  function profile() { const values = { Acceleration: ((state.fInitialDriveForce * (1600 / state.fMass) - .12) / .5) * 100, "Top speed": ((state.fInitialDriveMaxFlatVel - 90) / 250) * 100, Grip: ((state.fTractionCurveMax - 1.4) / 2.2) * 100, Braking: ((state.fBrakeForce - .4) / 2) * 100, Agility: ((state.fSteeringLock / 60) * 60 + (state.fAntiRollBarForce / 5) * 40), Drift: (((state.fTractionCurveMax - state.fTractionCurveMin) * 35) + state.fHandBrakeForce * 10) }; return values; }
  function refresh() { const bars = $("#profileBars"), values = profile(); bars.innerHTML = Object.entries(values).map(([name, value]) => { const v = Math.max(0, Math.min(100, Math.round(value))); return `<div class="profile-bar-row"><div class="profile-bar-label"><span>${name}</span><span>${v}</span></div><div class="profile-bar"><span style="width:${v}%;background:${v > 66 ? "#c6ff3d" : v > 33 ? "#e8b84c" : "#ff855c"}"></span></div></div>`; }).join(""); $("#profileSummary").textContent = state.fDriveBiasFront < .2 ? "Rear-wheel drive" : state.fDriveBiasFront > .8 ? "Front-wheel drive" : "All-wheel drive"; $("#warnings").innerHTML = state.fInitialDriveForce > .6 ? '<p class="warning">High engine power may create heavy wheelspin. Test the vehicle before publishing it.</p>' : ""; $("#output").textContent = currentOutput(); }
  $$(".fivem-tab").forEach(b => b.onclick = () => { editorTab = b.dataset.vtab; outputTab = "meta"; $$(".fivem-tab").forEach(x => { x.classList.toggle("active", x === b); x.setAttribute("aria-selected", String(x === b)); }); $("#panel-handling").classList.toggle("fivem-hidden", editorTab !== "handling"); $("#panel-flags").classList.toggle("fivem-hidden", editorTab !== "flags"); $("#panel-carcols").classList.toggle("fivem-hidden", editorTab !== "carcols"); renderOutputTabs(); refresh(); });
  document.addEventListener("input", e => { const id = e.target.id || ""; if (id.startsWith("range-")) sync(id.slice(6), e.target.value); if (id.startsWith("value-")) sync(id.slice(6), e.target.value); if (["modelName", "kitName", "kitId"].includes(id)) refresh(); });
  $("#copyBtn").onclick = () => navigator.clipboard.writeText($("#output").textContent).then(() => { $("#copyBtn").textContent = "Copied"; setTimeout(() => $("#copyBtn").textContent = "Copy", 1200); });
  $("#downloadBtn").onclick = () => { const ext = editorTab === "carcols" ? "carcols.meta" : outputTab === "lua" ? "vehicle-handling.lua" : "handling.meta"; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([$("#output").textContent], { type: "text/plain" })); a.download = ext; a.click(); URL.revokeObjectURL(a.href); };
  renderFields(); renderPresets(); renderFlags(); renderOutputTabs(); refresh();
})();
