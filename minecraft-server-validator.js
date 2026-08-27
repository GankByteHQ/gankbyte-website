(() => {
  const $ = (id) => document.getElementById(id);
  const state = { files: new Map(), report: null };
  const TEXT_EXTENSIONS = /\.(properties|txt|log|json|json5|yaml|yml|toml|cfg|conf|ini|xml|mcmeta|md|lua|js)$/i;
  const MAX_TEXT_BYTES = 2 * 1024 * 1024;
  const MAX_TOTAL_TEXT_BYTES = 12 * 1024 * 1024;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const pathOf = (file) => (file.webkitRelativePath || file.name || "file").replaceAll("\\", "/");
  const basename = (path) => path.split("/").pop().toLowerCase();
  const hasPath = (needle) => [...state.files.keys()].some((path) => path.includes(needle));
  const entriesMatching = (test) => [...state.files.values()].filter((entry) => test(entry.path.toLowerCase(), entry));

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function isTextPath(path) {
    return TEXT_EXTENSIONS.test(path) || /(^|\/)(latest\.log|debug\.log|server\.properties|eula\.txt)$/i.test(path);
  }

  async function textFor(entry) {
    if (entry.content !== undefined) return entry.content;
    if (!isTextPath(entry.path) || entry.size > MAX_TEXT_BYTES || !entry.file?.text) {
      entry.content = "";
      return entry.content;
    }
    entry.content = (await entry.file.text()).slice(0, MAX_TEXT_BYTES);
    return entry.content;
  }

  function renderFiles() {
    const list = $("file-list");
    if (!state.files.size) {
      list.innerHTML = '<p class="minecraft-empty">Your selected files will appear here.</p>';
      return;
    }
    const entries = [...state.files.values()].sort((a, b) => a.path.localeCompare(b.path));
    const visible = entries.slice(0, 180);
    list.innerHTML = visible.map((entry) => `<div class="minecraft-file"><span title="${escapeHtml(entry.path)}">${escapeHtml(entry.path)}</span><span>${formatBytes(entry.size)}</span></div>`).join("")
      + (entries.length > visible.length ? `<p class="minecraft-hint">Showing ${visible.length} of ${entries.length} files.</p>` : "");
  }

  function setUploadStatus(message, error = false) {
    $("upload-status").textContent = message;
    $("upload-status").classList.toggle("is-error", error);
  }

  async function loadFolder(files) {
    state.files.clear();
    [...files].forEach((file) => state.files.set(pathOf(file).toLowerCase(), { path: pathOf(file), size: file.size, file }));
    renderFiles();
    setUploadStatus(`${state.files.size} file${state.files.size === 1 ? "" : "s"} selected.`);
  }

  async function loadZip(file) {
    if (!window.JSZip) throw new Error("ZIP support is still loading. Try again in a moment.");
    state.files.clear();
    const archive = await window.JSZip.loadAsync(file);
    archive.forEach((path, zipEntry) => {
      if (!zipEntry.dir) state.files.set(path.toLowerCase(), { path, size: zipEntry._data?.uncompressedSize || 0, zipEntry });
    });
    for (const entry of state.files.values()) {
      if (isTextPath(entry.path) && entry.size <= MAX_TEXT_BYTES) entry.content = await entry.zipEntry.async("string");
    }
    renderFiles();
    setUploadStatus(`${state.files.size} file${state.files.size === 1 ? "" : "s"} read from ${file.name}.`);
  }

  function add(findings, severity, title, detail, fix, source = "") {
    findings.push({ severity, title, detail, fix, source });
  }

  function detectPlatform() {
    const paths = [...state.files.keys()].join(" ");
    const selected = $("platform-select").value;
    if (selected !== "auto") return selected;
    if (/fabric-server-launch\.jar|fabric\.mod\.json|\/mods\/fabric-api/.test(paths)) return "fabric";
    if (/neoforge|forge-server|mods\.toml/.test(paths)) return "forge";
    if (/paper\.jar|\/plugins\//.test(paths)) return "paper";
    if (/spigot\.jar|bukkit\.yml|spigot\.yml/.test(paths)) return "spigot";
    if (/server\.jar|minecraft_server/.test(paths)) return "vanilla";
    return "unknown";
  }

  function detectedVersion(contents) {
    const source = [...state.files.values()].map((entry) => entry.path).join(" ") + "\n" + contents.join("\n");
    const matches = [...source.matchAll(/(?:minecraft|mc|server)[^\n]{0,30}?(1\.\d+(?:\.\d+)?)/ig)].map((match) => match[1]);
    return matches[0] || "Not detected";
  }

  function parseProperties(text) {
    const values = {};
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index > 0) values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    });
    return values;
  }

  function numericProperty(values, key) {
    const value = Number(values[key]);
    return Number.isFinite(value) ? value : null;
  }

  function scanProperties(findings, propertiesEntry) {
    if (!propertiesEntry) {
      add(findings, "warning", "server.properties was not found", "The validator cannot confirm ports, authentication, difficulty, view distance, or other server settings.", "Upload the server root or include server.properties in the selected ZIP.");
      return {};
    }
    const values = parseProperties(propertiesEntry.content || "");
    if (!Object.keys(values).length) add(findings, "error", "server.properties is empty", "The file exists but contains no usable settings.", "Restore a valid server.properties file or let the server generate a fresh one.", propertiesEntry.path);
    if (values["online-mode"] === "false") add(findings, "warning", "Online authentication is disabled", "Players are not authenticated by Mojang/Microsoft before joining. This is commonly unsafe on public servers.", "Use online-mode=true unless you deliberately understand the security trade-off of an offline server.", `${propertiesEntry.path}: online-mode`);
    if (values["eula"] === "false") add(findings, "error", "The EULA is not accepted", "The server will normally stop before loading the world.", "Open eula.txt and set eula=true after reviewing Mojang's EULA.", `${propertiesEntry.path}: eula`);
    const port = numericProperty(values, "server-port");
    if (port !== null && (port < 1 || port > 65535)) add(findings, "error", "Server port is invalid", `server-port is ${port}, which is outside the valid range 1-65535.`, "Choose a valid unused port and forward the same port if players connect from outside your network.", `${propertiesEntry.path}: server-port`);
    const maxPlayers = numericProperty(values, "max-players");
    if (maxPlayers !== null && maxPlayers < 1) add(findings, "warning", "No player slots are configured", "max-players is below 1, so normal players cannot join.", "Set max-players to the number of players you intend to support.", `${propertiesEntry.path}: max-players`);
    ["view-distance", "simulation-distance"].forEach((key) => {
      const value = numericProperty(values, key);
      if (value !== null && (value < 2 || value > 32)) add(findings, "warning", `${key} is outside the usual range`, `${key} is ${value}. Very high values can increase memory and CPU load; very low values make the world feel clipped.`, "Start with a moderate value and increase it only when the server has headroom.", `${propertiesEntry.path}: ${key}`);
    });
    if (values["server-ip"]) add(findings, "warning", "server-ip is explicitly pinned", `The server is bound to ${values["server-ip"]}, which can fail if that address is not assigned to the host.`, "Usually leave server-ip blank so the server listens on the available interfaces.", `${propertiesEntry.path}: server-ip`);
    if (values["online-mode"] !== "false" && values["eula"] !== "false") add(findings, "good", "Core server settings look usable", "The selected server.properties has authentication enabled and does not explicitly block startup.", "Keep a backup of known-good settings before changing performance options.", propertiesEntry.path);
    return values;
  }

  function scanEula(findings, eulaEntry) {
    if (!eulaEntry) {
      add(findings, "warning", "eula.txt was not found", "The server may stop on first launch until the EULA file is created and accepted.", "Start the server once, review the EULA, then set eula=true if you agree.");
      return;
    }
    if (/^\s*eula\s*=\s*true\s*$/im.test(eulaEntry.content || "")) add(findings, "good", "EULA acceptance is present", "eula.txt contains eula=true.", "No change needed.", eulaEntry.path);
    else add(findings, "error", "EULA acceptance is missing", "eula.txt does not contain eula=true, so startup may stop immediately.", "Review the EULA, then set eula=true if you agree.", eulaEntry.path);
  }

  function scanStructure(findings, platform) {
    const launchers = entriesMatching((path) => /(^|\/)(server|paper|spigot|fabric-server-launch|forge|neoforge)[^/]*\.jar$/i.test(path));
    const jars = entriesMatching((path) => path.endsWith(".jar"));
    if (!launchers.length && !jars.length) add(findings, "error", "No server JAR was found", "The selected files do not include an obvious server launcher.", "Upload the server root or include the launcher JAR in the ZIP.");
    else if (launchers.length) add(findings, "good", "A server launcher was found", `${launchers.length} likely launcher file${launchers.length === 1 ? "" : "s"} detected for ${platform === "unknown" ? "an unknown platform" : platform}.`, "Make sure your startup command points to the intended launcher.", launchers[0].path);
    if (platform === "unknown") add(findings, "info", "Platform needs confirmation", "The file names do not uniquely identify Vanilla, Paper, Spigot, Fabric, or Forge/NeoForge.", "Choose the platform above for more relevant checks.");
    const pluginJars = entriesMatching((path) => /(^|\/)plugins\/[^/]+\.jar$/i.test(path));
    const modJars = entriesMatching((path) => /(^|\/)mods\/[^/]+\.jar$/i.test(path));
    if (pluginJars.length) add(findings, "info", `${pluginJars.length} plugin JAR${pluginJars.length === 1 ? "" : "s"} found`, "Plugin JAR names were found, but this browser tool cannot prove each plugin's dependency graph without loading its metadata.", "Check the plugin's documented Minecraft and platform version before adding it to a live server.", "plugins/");
    if (modJars.length) add(findings, "info", `${modJars.length} mod JAR${modJars.length === 1 ? "" : "s"} found`, "Mod JAR names were found, but the validator does not execute or upload them.", "Check the mod loader version and each mod's required dependencies.", "mods/");
    const datapacks = entriesMatching((path) => /(^|\/)(world[^/]*\/datapacks\/|datapacks\/)/i.test(path));
    if (datapacks.length) add(findings, "info", "Datapack files were found", `${datapacks.length} datapack-related file${datapacks.length === 1 ? "" : "s"} detected.`, "Confirm the datapack targets the same Minecraft version as the world.", "datapacks/");
  }

  function scanDuplicates(findings) {
    ["plugins/", "mods/"].forEach((folder) => {
      const names = new Map();
      entriesMatching((path) => path.includes(folder) && path.endsWith(".jar")).forEach((entry) => {
        const key = basename(entry.path).replace(/[-_ .]?(\d[\w.-]*)?\.jar$/i, "").replace(/[-_.]/g, "").toLowerCase();
        if (!key) return;
        if (!names.has(key)) names.set(key, []);
        names.get(key).push(entry.path);
      });
      names.forEach((paths, key) => {
        if (paths.length > 1) add(findings, "warning", `Possible duplicate ${folder.replace("/", "")} files`, `${paths.length} files appear to share the same base name (${key}). Multiple versions can cause loading conflicts.`, "Keep one compatible version and move older copies outside the live resource folder.", paths.join(", "));
      });
    });
  }

  function scanSecrets(findings, textEntries) {
    const secretPattern = /(?:token|password|passwd|secret|api[_-]?key|access[_-]?key)\s*[=:]\s*[^\s#]{8,}/i;
    const matches = textEntries.filter((entry) => secretPattern.test(entry.content || ""));
    if (matches.length) add(findings, "warning", "Possible secret in a selected text file", `${matches.length} selected file${matches.length === 1 ? "" : "s"} contain a key-like setting. Values are not displayed or included in the report.`, "Rotate exposed credentials, keep secrets out of public repositories, and use environment variables or a server secret manager.", matches.map((entry) => entry.path).join(", "));
  }

  function scanLogs(findings, logEntries, pastedLog) {
    const combined = [...logEntries.map((entry) => entry.content || ""), pastedLog].filter(Boolean).join("\n");
    if (!combined) {
      add(findings, "info", "No startup or crash log was supplied", "Configuration and structure checks can still run, but runtime errors need the latest.log or crash report.", "Paste the newest console output or select a log file for more precise diagnostics.");
      return;
    }
    const checks = [
      [/UnsupportedClassVersionError|class file version \d+\.?\d*.*recognizes? up to/i, "Java and server/mod versions do not agree", "The runtime is older than code required by the server or one of its plugins/mods.", "Use the Java version required by the Minecraft/server version, then update or downgrade the incompatible component."],
      [/NoClassDefFoundError|ClassNotFoundException/i, "A class or dependency could not be found", "A plugin, mod, or server component is referring to code that is missing or incompatible.", "Read the first missing class name, then install the required dependency or use matching versions."],
      [/Mixin apply failed|Mod resolution failed|requires .* version|dependency.*(missing|not found)/i, "A mod dependency or compatibility check failed", "The loader rejected at least one mod because a dependency or version requirement was not satisfied.", "Use the exact Minecraft and loader version required by the first failing mod, then add or update its dependency."],
      [/Address already in use|Failed to bind|Could not bind/i, "The server port is already in use", "Another process is using the configured network port.", "Stop the other server/process or choose an unused server-port and update firewall/forwarding rules."],
      [/OutOfMemoryError|Could not reserve enough space|Java heap space/i, "Java ran out of memory", "The server or a component requested more memory than the JVM could provide.", "Review the -Xms/-Xmx values, leave memory for the operating system, and reduce view distance or heavy mods if needed."],
      [/Failed to load plugin|InvalidPluginException|Could not load plugin/i, "A plugin failed to load", "The log contains a plugin loading failure.", "Start with the first plugin named in the error, check its platform/version requirements, and remove duplicate or incompatible copies."],
      [/UnknownHostException|Connection refused|Connection timed out/i, "An external connection failed", "A plugin or server component could not reach a named service.", "Check the hostname, firewall, DNS, credentials, and whether that service is online. Do not paste credentials into public issues."],
      [/Can't keep up!|Running behind/i, "The server is falling behind", "The server is reporting tick delay, which can feel like lag for players.", "Check CPU, memory, entity counts, chunk generation, view distance, and the timings/profiling tools for the real hotspot."]
    ];
    const matched = new Set();
    checks.forEach(([pattern, title, detail, fix]) => {
      if (pattern.test(combined)) { add(findings, pattern.source.includes("keep up") ? "warning" : "error", title, detail, fix, "startup/crash log"); matched.add(title); }
    });
    if (!matched.size) add(findings, "info", "No known signature matched the supplied log", "The validator did not find one of its recognised startup, dependency, port, memory, or performance signatures.", "Read the first ERROR/Exception and include the complete section around it when asking for help.", "startup/crash log");
    if (logEntries.some((entry) => /crash-reports\//i.test(entry.path))) add(findings, "info", "Crash-report files were found", "Crash reports are available in the selected files. The first exception is usually the most useful starting point.", "Open the newest report and work from the first caused-by section, not only the final line.", "crash-reports/");
  }

  async function analyze() {
    const button = $("analyze-button");
    button.disabled = true;
    $("analysis-status").textContent = "Reading selected text files locally...";
    try {
      let totalTextBytes = 0;
      const textEntries = [];
      for (const entry of state.files.values()) {
        if (!isTextPath(entry.path) || totalTextBytes >= MAX_TOTAL_TEXT_BYTES) continue;
        const content = await textFor(entry);
        totalTextBytes += Math.min(entry.size || content.length, MAX_TEXT_BYTES);
        if (content) textEntries.push(entry);
      }
      const propertiesEntry = entriesMatching((path) => basename(path) === "server.properties")[0];
      const eulaEntry = entriesMatching((path) => basename(path) === "eula.txt")[0];
      const logEntries = entriesMatching((path) => /(^|\/)(latest|debug|server|console)[^/]*\.log$/i.test(path) || /crash-reports\/.*\.txt$/i.test(path));
      const findings = [];
      const platform = detectPlatform();
      const properties = scanProperties(findings, propertiesEntry);
      scanEula(findings, eulaEntry);
      scanStructure(findings, platform);
      scanDuplicates(findings);
      scanLogs(findings, logEntries, $("log-input").value.trim());
      scanSecrets(findings, textEntries);
      const version = detectedVersion([propertiesEntry?.content || "", ...logEntries.map((entry) => entry.content || "")]);
      const errors = findings.filter((finding) => finding.severity === "error").length;
      const warnings = findings.filter((finding) => finding.severity === "warning").length;
      const score = Math.max(0, Math.min(100, 100 - (errors * 28) - (warnings * 9)));
      state.report = { findings, platform, version, errors, warnings, score, fileCount: state.files.size };
      renderReport();
      $("analysis-status").textContent = `Analysis complete. ${textEntries.length} text file${textEntries.length === 1 ? "" : "s"} checked locally.`;
    } catch (error) {
      $("analysis-status").textContent = error.message || "The files could not be analyzed.";
      $("analysis-status").classList.add("is-error");
    } finally {
      button.disabled = false;
    }
  }

  function findingMarkup(finding) {
    return `<article class="minecraft-finding is-${escapeHtml(finding.severity)}"><div class="minecraft-finding-head"><h3>${escapeHtml(finding.title)}</h3><span class="minecraft-severity ${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</span></div><p>${escapeHtml(finding.detail)}</p><p><strong>Fix:</strong> ${escapeHtml(finding.fix)}</p>${finding.source ? `<p><code>${escapeHtml(finding.source)}</code></p>` : ""}</article>`;
  }

  function renderReport() {
    const report = state.report;
    const total = report.findings.length;
    $("score-value").textContent = `${report.score}%`;
    $("score-box").querySelector("span").textContent = report.errors ? "ACTION" : report.warnings ? "REVIEW" : "CLEAN";
    $("finding-count").textContent = `${total} finding${total === 1 ? "" : "s"}`;
    $("summary").innerHTML = `<div class="minecraft-summary-grid"><div class="minecraft-summary-stat"><span>Platform</span><strong>${escapeHtml(report.platform === "unknown" ? "Unknown" : report.platform)}</strong></div><div class="minecraft-summary-stat"><span>Version</span><strong>${escapeHtml(report.version)}</strong></div><div class="minecraft-summary-stat"><span>Files read</span><strong>${report.fileCount}</strong></div><div class="minecraft-summary-stat"><span>Errors</span><strong class="${report.errors ? "is-bad" : "is-good"}">${report.errors}</strong></div><div class="minecraft-summary-stat"><span>Warnings</span><strong class="${report.warnings ? "is-bad" : "is-good"}">${report.warnings}</strong></div><div class="minecraft-summary-stat"><span>Privacy</span><strong class="is-good">Local</strong></div></div><p class="minecraft-empty">This score is a triage signal, not a guarantee that an unknown plugin, mod, world, or host will work. Start with the first error, then re-run the validator after changing one thing.</p>`;
    $("findings").innerHTML = report.findings.map(findingMarkup).join("") || '<p class="minecraft-empty">No findings were produced.</p>';
    $("report-actions").hidden = false;
  }

  function reportText() {
    if (!state.report) return "";
    const report = state.report;
    const lines = [
      "GankByte Minecraft Server Validator Report",
      `Platform: ${report.platform}`,
      `Version: ${report.version}`,
      `Files read: ${report.fileCount}`,
      `Score: ${report.score}%`,
      `Errors: ${report.errors}`,
      `Warnings: ${report.warnings}`,
      "",
      ...report.findings.map((finding, index) => `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}\n   ${finding.detail}\n   Fix: ${finding.fix}${finding.source ? `\n   Source: ${finding.source}` : ""}`)
    ];
    return lines.join("\n");
  }

  async function copyReport() {
    const text = reportText();
    try { await navigator.clipboard.writeText(text); } catch {
      const input = document.createElement("textarea"); input.value = text; document.body.append(input); input.select(); document.execCommand("copy"); input.remove();
    }
    $("copy-report").textContent = "Copied";
    setTimeout(() => { $("copy-report").textContent = "Copy report"; }, 1400);
  }

  function downloadReport() {
    const blob = new Blob([reportText()], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "gankbyte-minecraft-server-report.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function clearAll() {
    state.files.clear(); state.report = null;
    $("folder-input").value = ""; $("zip-input").value = ""; $("log-input").value = "";
    renderFiles(); setUploadStatus("No files selected."); $("analysis-status").textContent = "Select files or paste a log, then analyze."; $("analysis-status").classList.remove("is-error");
    $("score-value").textContent = "—"; $("score-box").querySelector("span").textContent = "READY"; $("finding-count").textContent = "0 findings";
    $("summary").innerHTML = '<p class="minecraft-empty">Your report will appear here after analysis. The validator checks actual selected files and pasted logs; it does not invent server results.</p>';
    $("findings").innerHTML = '<p class="minecraft-empty">No findings yet.</p>'; $("report-actions").hidden = true;
  }

  $("folder-button").addEventListener("click", () => $("folder-input").click());
  $("zip-button").addEventListener("click", () => $("zip-input").click());
  $("folder-input").addEventListener("change", (event) => loadFolder(event.target.files));
  $("zip-input").addEventListener("change", async (event) => {
    if (!event.target.files[0]) return;
    try { await loadZip(event.target.files[0]); } catch (error) { setUploadStatus(error.message, true); }
  });
  $("analyze-button").addEventListener("click", analyze);
  $("clear-button").addEventListener("click", clearAll);
  $("copy-report").addEventListener("click", copyReport);
  $("download-report").addEventListener("click", downloadReport);
})();
