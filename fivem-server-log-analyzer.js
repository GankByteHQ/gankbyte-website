(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = { text: "", findings: [], repeats: [], filter: "all", summary: null };
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const setStatus = (message, error = false) => { $("log-status").textContent = message; $("log-status").classList.toggle("error", error); };
  const resourceFrom = (line) => (line.match(/\[(?:script:)?([^\]]+)\]/i)?.[1] || line.match(/@([^/\s]+)\//)?.[1] || "Unknown resource");
  const fileFrom = (line) => line.match(/@([^\s:]+(?::\d+)?)/)?.[1] || "";
  const normalise = (line) => line.replace(/^\s*\[[^\]]+\]\s*/, "").replace(/\d{1,2}:\d{2}:\d{2}/g, "TIME").replace(/\d+/g, "#").trim().slice(0, 220);
  const add = (type, title, detail, line, hint) => state.findings.push({ type, title, detail, resource: resourceFrom(line), file: fileFrom(line), example: line.trim().slice(0, 420), hint });
  const rules = [
    { test: /SCRIPT ERROR|script error|stack traceback|attempt to index (?:a )?nil|bad argument|no such export|error loading script|error parsing script/i, type: "error", title: "Script failure", hint: "Open the resource and file shown, then fix the first Lua or JavaScript error before chasing later messages." },
    { test: /couldn.?t find resource|can't find resource|resource .* not found|failed to start resource|failed to load resource|does not exist/i, type: "error", title: "Resource could not be found or started", hint: "Check the resource folder name, ensure it exists, and confirm its start order in server.cfg." },
    { test: /no such export|could not find dependency|missing dependency|dependency .* missing|ensure .* before/i, type: "error", title: "Dependency or export is missing", hint: "Install and start the required dependency first, then confirm the export name matches the installed version." },
    { test: /oxmysql|mysql|database|sql|connection refused|access denied|unknown column|duplicate entry/i, type: "error", title: "Database or connection problem", hint: "Check the database service, credentials, table/column names, and whether the resource is using the correct database adapter." },
    { test: /permission denied|not allowed|access denied|unauthori[sz]ed|invalid token|authentication failed/i, type: "error", title: "Permission or authentication problem", hint: "Check ACE permissions, identifiers, keys, and server-side access rules. Never place secrets in client files." },
    { test: /access violation|segmentation fault|fatal exception|unhandled exception|exception code|0xc000|crash report|crashed|crash dump|game crashed|citizenfx.*crash|rage multiplayer/i, type: "error", title: "Crash or fatal exception detected", hint: "This is a crash-level message. Check the resource, native call, client/server build, and the lines immediately before this message for the first failure." },
    { test: /warning|deprecated|could not load|failed to parse|invalid .*manifest|missing fx_version|missing game/i, type: "warning", title: "Configuration warning", hint: "Review the resource configuration or manifest. It may still start, but the warning can become a failure after an update." },
    { test: /started resource|stopped resource|^Started|^Stopping/i, type: "info", title: "Resource lifecycle event", hint: "Use this to confirm the resource started or to locate the point where the server stopped it." },
    { test: /server.*started|listening on|authenticated|connected|ready/i, type: "info", title: "Server status message", hint: "This is a normal status message and is included to help establish the server timeline." }
  ];
  function analyse() {
    state.text = $("log-input").value;
    if (!state.text.trim()) { setStatus("Paste a log or load a text file before analyzing.", true); return; }
    state.findings = [];
    const lines = state.text.split(/\r?\n/).filter((line) => line.trim());
    const counts = new Map();
    lines.forEach((line) => {
      const rule = rules.find((item) => item.test.test(line));
      if (!rule) return;
      const key = `${rule.type}:${rule.title}:${normalise(line)}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!state.findings.some((finding) => finding.type === rule.type && finding.title === rule.title && finding.example === line.trim().slice(0, 420))) add(rule.type, rule.title, `${rule.hint}`, line, rule.hint);
    });
    const resourceNames = new Set(lines.flatMap((line) => { const match = line.match(/\[(?:script:)?([^\]]+)\]/i); return match ? [match[1]] : []; }));
    state.findings = state.findings.slice(0, 80);
    state.repeats = [...counts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([message, count]) => ({ message: message.split(":").slice(2).join(":"), count }));
    state.summary = { lines: lines.length, errors: state.findings.filter((item) => item.type === "error").length, warnings: state.findings.filter((item) => item.type === "warning").length, info: state.findings.filter((item) => item.type === "info").length, resources: resourceNames.size };
    render();
    setStatus(`Analysis complete. ${lines.length.toLocaleString()} log line${lines.length === 1 ? "" : "s"} checked locally.`);
  }
  function render() {
    const summary = state.summary;
    $("log-summary").hidden = false;
    $("log-summary").innerHTML = [["Lines", summary.lines], ["Errors", summary.errors], ["Warnings", summary.warnings], ["Info", summary.info], ["Resources", summary.resources]].map(([label, value]) => `<div class="log-stat"><span>${label}</span><strong>${value.toLocaleString()}</strong></div>`).join("");
    $("log-results").hidden = false;
    const visible = state.findings.filter((finding) => state.filter === "all" || finding.type === state.filter);
    $("log-findings").innerHTML = visible.length ? visible.map((finding) => `<article class="log-finding ${finding.type}"><span class="finding-icon">${finding.type === "error" ? "!" : finding.type === "warning" ? "?" : "i"}</span><div><h3>${escape(finding.title)}</h3><p>${escape(finding.hint)}</p><div class="finding-meta">${escape(finding.resource)}${finding.file ? ` // ${escape(finding.file)}` : ""}</div><div class="finding-example">${escape(finding.example)}</div></div></article>`).join("") : '<p class="file-empty">No findings in this filter.</p>';
    $("log-repeats").innerHTML = state.repeats.length ? state.repeats.map((item) => `<div class="log-repeat"><strong>${escape(item.message)}</strong><span>${item.count}x</span></div>`).join("") : '<p class="file-empty">No repeated messages detected.</p>';
  }
  function report() { return { generatedAt: new Date().toISOString(), summary: state.summary, findings: state.findings, repeatedMessages: state.repeats }; }
  $("load-log").addEventListener("click", () => $("log-file").click());
  $("log-file").addEventListener("change", async (event) => { const file = event.target.files?.[0]; if (!file) return; $("log-input").value = await file.text(); setStatus(`${file.name} loaded locally. Click Analyze text to inspect it.`); });
  $("analyze-log").addEventListener("click", analyse);
  $("clear-log").addEventListener("click", () => { $("log-input").value = ""; $("log-summary").hidden = true; $("log-results").hidden = true; state.findings = []; state.repeats = []; state.summary = null; setStatus("Log cleared. Nothing was uploaded."); });
  document.querySelectorAll(".log-filter").forEach((button) => button.addEventListener("click", () => { state.filter = button.dataset.filter; document.querySelectorAll(".log-filter").forEach((item) => item.classList.toggle("active", item === button)); if (state.summary) render(); }));
  $("copy-report").addEventListener("click", async () => { if (!state.summary) return; const text = [`GankByte FiveM Server Log Analysis`, `Lines: ${state.summary.lines}`, `Errors: ${state.summary.errors}`, `Warnings: ${state.summary.warnings}`, `Resources: ${state.summary.resources}`, "", ...state.findings.map((item) => `- ${item.type.toUpperCase()}: ${item.title} // ${item.resource} // ${item.hint}`) ].join("\n"); await navigator.clipboard.writeText(text); setStatus("Analysis summary copied to the clipboard."); });
  $("download-report").addEventListener("click", () => { if (!state.summary) return; const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify(report(), null, 2)], { type: "application/json" })); link.download = "gankbyte-fivem-log-report.json"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); });
})();
