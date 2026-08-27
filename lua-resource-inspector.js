(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { files: [], findings: [], map: [], filter: "all", search: "" };
  const textExt = /\.(lua|luau|txt|md|cfg|ini|json|ya?ml|xml|meta|log|sql|js|ts|html|css)$/i;
  const luaExt = /\.(lua|luau)$/i;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cleanPath = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "");
  const base = (path) => cleanPath(path).split("/").pop() || path;
  const ext = (path) => (path.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const textFile = (path) => textExt.test(path);
  const file = (path) => state.files.find((item) => cleanPath(item.path).toLowerCase() === cleanPath(path).toLowerCase());
  const has = (path) => Boolean(file(path));
  const lineAt = (text, index) => text.slice(0, Math.max(0, index)).split(/\r?\n/).length;
  const status = (message, error = false) => { $("lua-status").textContent = message; $("lua-status").classList.toggle("error", error); };

  function add(kind, title, detail, fix = "", path = "", line = "") {
    state.findings.push({ kind, title, detail, fix, path, line });
  }

  function parseManifest() {
    const manifest = state.files.find((item) => /(^|\/)fxmanifest\.lua$|(^|\/)__resource\.lua$/i.test(item.path));
    const result = { manifest, declared: [], scripts: [], exports: [], callbacks: [] };
    if (!manifest) return result;
    const source = manifest.text || "";
    const addQuoted = (pattern, target) => {
      for (const match of source.matchAll(pattern)) {
        for (const quoted of match[0].matchAll(/["']([^"']+)["']/g)) target.push(cleanPath(quoted[1]));
      }
    };
    addQuoted(/(?:client_script|client_scripts|server_script|server_scripts|shared_script|shared_scripts|files|ui_page)\s*[=(]?[^\n]*/gi, result.declared);
    addQuoted(/(?:client_script|client_scripts|server_script|server_scripts|shared_script|shared_scripts)\s*[=(]?[^\n]*/gi, result.scripts);
    addQuoted(/(?:export|server_export)\s*[=(]?[^\n]*/gi, result.exports);
    const unique = (items) => [...new Set(items)];
    result.declared = unique(result.declared);
    result.scripts = unique(result.scripts);
    result.exports = unique(result.exports);
    return result;
  }

  function stripStringsAndComments(source) {
    return source.replace(/--\[\[[\s\S]*?\]\]/g, " ").replace(/--[^\n]*/g, " ").replace(/(['"])(?:\\.|(?!\1)[^\\])*\1/g, " ");
  }

  function inspectLuaSyntax(item) {
    const source = item.text || "";
    const clean = stripStringsAndComments(source);
    const pairs = [["{", "}"], ["(", ")"], ["[", "]"]];
    for (const [open, close] of pairs) {
      const opens = (clean.match(new RegExp(`\\${open}`, "g")) || []).length;
      const closes = (clean.match(new RegExp(`\\${close}`, "g")) || []).length;
      if (opens !== closes) add("error", `Unbalanced ${open}${close} delimiters`, `${base(item.path)} has ${opens} opening and ${closes} closing ${open}${close} delimiters.`, "Check the nearest block, table, function call, or callback for a missing bracket.", item.path);
    }
    if (/\bwhile\s+(?:true|1)\s+do\b/i.test(clean) && !/\bWait\s*\(/i.test(clean)) add("error", "Loop may freeze the resource", "An always-running loop was found without a Wait call.", "Add a sensible Wait(ms) inside the loop so it yields to the FiveM runtime.", item.path);
    if (/\b(?:load|loadstring|loadfile)\s*\(/i.test(clean)) add("warning", "Dynamic code execution", "This file evaluates code at runtime, which can hide failures and create a security risk.", "Avoid dynamic loading where possible and validate any external input before using it.", item.path);
    if (/(?:token|password|passwd|secret|webhook|private[_ -]?key)\s*[:=]\s*["'][^"']{8,}["']/i.test(source)) add("error", "Possible secret in source", "A token, password, webhook, or private key-shaped value appears to be hard-coded.", "Move secrets into environment/server configuration and rotate any credential that was committed.", item.path);
    if (/(?:^|\/)client(?:\/|\.)/i.test(item.path) && /PerformHttpRequest\s*\(/i.test(source)) add("warning", "HTTP request in client code", "PerformHttpRequest is normally server-side; client-side requests expose endpoints and can be abused.", "Move the request to a server script and return only the data the client needs.", item.path);
    if (/(?:^|\/)client(?:\/|\.)/i.test(item.path) && /\bsource\b/.test(clean)) add("warning", "Server-only source variable", "The source player ID is being referenced from a client-side file.", "Use source in a server handler, then pass validated data to the client.", item.path);
    const requires = [...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)];
    for (const match of requires) {
      const target = cleanPath(match[1]).replace(/\.lua$/i, "") + ".lua";
      if (!has(target) && !has(`src/${target}`)) add("warning", "Require target not found", `require("${match[1]}") does not match a file found in this resource.`, "Check the module path and ensure the file is included in the resource.", item.path, lineAt(source, match.index));
    }
  }

  function inspectEvents(item) {
    const source = item.text || "";
    const registrations = [...source.matchAll(/(?:RegisterNetEvent|AddEventHandler)\s*\(\s*["']([^"']+)["']/g)];
    const triggers = [...source.matchAll(/(?:TriggerEvent|TriggerServerEvent|TriggerClientEvent)\s*\(\s*["']([^"']+)["']/g)];
    registrations.forEach((match) => state.map.push({ kind: "event", from: `${item.path}:${lineAt(source, match.index)}`, to: match[1], missing: false }));
    triggers.forEach((match) => state.map.push({ kind: "trigger", from: `${item.path}:${lineAt(source, match.index)}`, to: match[1], missing: !registrations.some((entry) => entry[1] === match[1]) }));
    const counts = {};
    registrations.forEach((match) => { counts[match[1]] = (counts[match[1]] || 0) + 1; });
    Object.entries(counts).filter(([, count]) => count > 1).forEach(([name, count]) => add("warning", "Duplicate event registration", `${name} is registered ${count} times in this resource.`, "Keep one authoritative handler or confirm that each registration is intentional.", item.path));
    triggers.filter((match) => !registrations.some((entry) => entry[1] === match[1])).slice(0, 4).forEach((match) => add("info", "Event is not registered locally", `${match[1]} is triggered here but no local handler was found. It may belong to another resource.`, "Confirm the target resource registers this event and validate any client-provided values.", item.path, lineAt(source, match.index)));
  }

  function inspectExports(item) {
    const source = item.text || "";
    for (const match of source.matchAll(/\bexports\s*\(\s*["']([^"']+)["']/g)) state.map.push({ kind: "export", from: `${item.path}:${lineAt(source, match.index)}`, to: match[1], missing: false });
    for (const match of source.matchAll(/\bexports\.([A-Za-z0-9_-]+)\s*:/g)) state.map.push({ kind: "export call", from: `${item.path}:${lineAt(source, match.index)}`, to: match[1], missing: false });
  }

  function inspectNui(item) {
    const source = item.text || "";
    const requested = [...source.matchAll(/GetParentResourceName\(\)[^\n]{0,180}?["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
    if (!requested.length) return;
    const callbacks = state.files.filter((entry) => luaExt.test(entry.path)).flatMap((entry) => [...(entry.text || "").matchAll(/RegisterNUICallback\s*\(\s*["']([^"']+)["']/g)].map((match) => match[1]));
    requested.forEach((name) => { if (!callbacks.includes(name)) add("error", "NUI callback has no Lua handler", `${name} is requested by ${base(item.path)} but no RegisterNUICallback handler was found.`, "Add the callback to the client Lua file or correct the browser action name.", item.path); });
  }

  function analyze() {
    state.findings = []; state.map = [];
    if (!state.files.length) { status("Load a resource folder, ZIP, or paste a file before inspecting.", true); return; }
    const manifest = parseManifest();
    if (!manifest.manifest) add("error", "Resource manifest not found", "No fxmanifest.lua or __resource.lua was found.", "Add a manifest at the resource root so FiveM knows what to load.");
    else add("good", "Manifest found", `${base(manifest.manifest.path)} is present and can be inspected.`, "Keep the manifest at the resource root and declare every file the resource needs.", manifest.manifest.path);
    manifest.declared.filter((path) => !path.includes("*") && !has(path) && !has(path.replace(/^@[^/]+\//, ""))).forEach((path) => add("error", "Manifest file not found", `${path} is declared but was not found in the loaded resource.`, "Correct the path, include the file, or remove the stale declaration.", manifest.manifest?.path));
    state.files.filter((item) => luaExt.test(item.path)).forEach(inspectLuaSyntax);
    state.files.filter((item) => luaExt.test(item.path)).forEach(inspectEvents);
    state.files.filter((item) => luaExt.test(item.path)).forEach(inspectExports);
    state.files.filter((item) => /\.(html?|js|ts|css)$/i.test(item.path)).forEach(inspectNui);
    const luaCount = state.files.filter((item) => luaExt.test(item.path)).length;
    const score = Math.max(0, Math.min(100, 100 - state.findings.filter((item) => item.kind === "error").length * 18 - state.findings.filter((item) => item.kind === "warning").length * 7));
    render(score, luaCount, manifest);
    status(`Inspection complete. ${state.findings.filter((item) => item.kind === "error").length} errors, ${state.findings.filter((item) => item.kind === "warning").length} warnings, ${state.files.length} files reviewed.`);
  }

  function render(score, luaCount, manifest) {
    $("lua-summary").hidden = false; $("lua-toolbar").hidden = false; $("lua-report-grid").hidden = false; $("lua-map-card").hidden = false;
    $("lua-summary").innerHTML = [["Health score", `${score}%`], ["Errors", state.findings.filter((item) => item.kind === "error").length], ["Warnings", state.findings.filter((item) => item.kind === "warning").length], ["Lua files", luaCount]].map(([label, value]) => `<div class="lua-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
    $("lua-type-badge").textContent = manifest.manifest ? "FiveM resource" : "Lua project";
    $("lua-report-title").textContent = score >= 85 ? "Looks stable." : score >= 60 ? "Needs attention." : "Find the break.";
    renderFindings(); renderInventory(); renderMap();
  }

  function visibleFinding(item) { return (state.filter === "all" || item.kind === state.filter || (state.filter === "info" && item.kind === "good")) && `${item.title} ${item.detail} ${item.path}`.toLowerCase().includes(state.search.toLowerCase()); }
  function renderFindings() {
    const items = state.findings.filter(visibleFinding);
    $("lua-findings").innerHTML = items.length ? items.map((item) => `<article class="lua-finding ${esc(item.kind)}"><span class="lua-finding-icon">${item.kind === "good" ? "✓" : item.kind === "error" ? "!" : item.kind === "warning" ? "!" : "i"}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p>${item.fix ? `<div class="lua-finding-fix">${esc(item.fix)}</div>` : ""}<div class="lua-meta">${item.path ? `<span>${esc(item.path)}${item.line ? `:${item.line}` : ""}</span>` : ""}</div></div></article>`).join("") : `<p class="lua-empty">No findings match this filter.</p>`;
  }
  function renderInventory() {
    const counts = {}; state.files.forEach((item) => { const key = ext(item.path) || "other"; counts[key] = (counts[key] || 0) + 1; });
    $("lua-inventory").innerHTML = Object.entries(counts).sort().map(([key, value]) => `<div class="lua-inventory-row"><span>.${esc(key)}</span><strong>${value}</strong></div>`).join("") || `<p class="lua-empty">No files loaded.</p>`;
  }
  function renderMap() {
    $("lua-map-count").textContent = `${state.map.length} items`;
    $("lua-map").innerHTML = state.map.length ? state.map.map((item) => `<div class="lua-map-row ${item.missing ? "missing" : ""}"><span class="lua-map-path" title="${esc(item.from)}">${esc(item.from)}</span><span class="lua-map-arrow">&rarr;</span><span class="lua-map-path" title="${esc(item.to)}">${esc(item.to)}</span></div>`).join("") : `<p class="lua-empty">No event or export relationships were found yet.</p>`;
  }

  async function readFiles(list) {
    const files = [];
    for (const source of [...list]) {
      const path = cleanPath(source.webkitRelativePath || source.name);
      files.push({ path, text: textFile(path) ? await source.text() : "", binary: !textFile(path) });
    }
    state.files = files; status(`${files.length} file${files.length === 1 ? "" : "s"} loaded locally. Ready to inspect.`); analyze();
  }
  async function readZip(source) {
    if (!window.JSZip) { status("ZIP support could not load. Use a folder or paste the resource instead.", true); return; }
    const zip = await window.JSZip.loadAsync(source); const files = [];
    for (const entry of Object.values(zip.files)) if (!entry.dir) { const path = cleanPath(entry.name); files.push({ path, text: textFile(path) ? await entry.async("string") : "", binary: !textFile(path) }); }
    state.files = files; status(`${files.length} ZIP entries loaded locally. Ready to inspect.`); analyze();
  }
  function report() {
    const lines = ["GankByte Lua Resource Inspector report", `Generated: ${new Date().toISOString()}`, "", `Files reviewed: ${state.files.length}`, "", ...state.findings.map((item) => `[${item.kind.toUpperCase()}] ${item.title}\n${item.detail}${item.fix ? `\nFix: ${item.fix}` : ""}${item.path ? `\nFile: ${item.path}${item.line ? `:${item.line}` : ""}` : ""}`)];
    return lines.join("\n\n");
  }
  function download(name, content) { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "text/plain" })); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }

  $("choose-lua-folder").addEventListener("click", () => $("lua-folder").click());
  $("choose-lua-zip").addEventListener("click", () => $("lua-zip").click());
  $("lua-folder").addEventListener("change", (event) => readFiles(event.target.files));
  $("lua-zip").addEventListener("change", async (event) => { if (event.target.files[0]) await readZip(event.target.files[0]); });
  $("analyze-lua").addEventListener("click", () => { const paste = $("lua-paste").value.trim(); if (paste) state.files = [{ path: "pasted-input.lua", text: paste, binary: false }]; analyze(); });
  $("clear-lua").addEventListener("click", () => { state.files = []; state.findings = []; state.map = []; $("lua-folder").value = ""; $("lua-zip").value = ""; $("lua-paste").value = ""; $("lua-summary").hidden = true; $("lua-toolbar").hidden = true; $("lua-report-grid").hidden = true; $("lua-map-card").hidden = true; status("No resource loaded yet. Nothing leaves this browser."); });
  document.querySelectorAll(".lua-filter").forEach((button) => button.addEventListener("click", () => { state.filter = button.dataset.filter; document.querySelectorAll(".lua-filter").forEach((item) => item.classList.toggle("active", item === button)); renderFindings(); }));
  $("lua-search").addEventListener("input", (event) => { state.search = event.target.value; renderFindings(); });
  $("copy-lua-report").addEventListener("click", async () => { await navigator.clipboard.writeText(report()); $("copy-lua-report").textContent = "Copied"; setTimeout(() => $("copy-lua-report").textContent = "Copy report", 1200); });
  $("download-lua-report").addEventListener("click", () => download("gankbyte-lua-report.txt", report()));
})();
