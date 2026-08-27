(() => {
  const $ = (id) => document.getElementById(id);
  const input = $("release-files"), list = $("release-file-list"), status = $("release-status"), download = $("download-release");
  let prepared = null;
  const selectedPath = (file) => file.webkitRelativePath || file.name;
  const hidden = (path) => path.split(/[\\/]/).some((part) => part.startsWith(".") && part !== ".well-known");
  const generated = (path) => /(^|[\\/])(node_modules|\.git|dist|build|coverage|\.cache|\.next|target|bin|obj)([\\/]|$)|\.(log|tmp|cache)$/i.test(path);
  const secretPath = (path) => /(^|[\\/])(?:\.env(?:\..*)?|id_rsa|credentials?\.(?:json|ya?ml)|secrets?\.(?:json|ya?ml)|.*\.(?:pem|key|p12|pfx))$/i.test(path);
  const secretText = (text) => /(?:AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:password|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"']{12,})/i.test(text);
  const formatSize = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[char]));
  function checklist(name, version, files) {
    return `# ${name} ${version} release checklist\n\nGenerated locally by GankByte Project Release Packager.\n\n- [ ] Read the README and installation steps\n- [ ] Remove test credentials and private configuration\n- [ ] Confirm the licence and third-party notices\n- [ ] Review dependencies and lockfiles\n- [ ] Test the release in a clean environment\n- [ ] Confirm the version and changelog\n\nIncluded files: ${files}\n`;
  }
  async function inspect(file) {
    if (file.size > 2_000_000) return "";
    try { return await file.text(); } catch { return ""; }
  }
  async function prepare() {
    if (!input.files.length) { status.textContent = "Choose project files first."; status.classList.add("is-error"); return; }
    status.classList.remove("is-error"); status.textContent = "Reviewing files locally..."; download.disabled = true;
    const result = [], includeHidden = $("include-hidden").checked, skipGenerated = $("exclude-generated").checked, skipSecrets = $("exclude-secrets").checked;
    for (const file of [...input.files]) {
      const path = selectedPath(file).replaceAll("\\", "/");
      let reason = "Included";
      if (!includeHidden && hidden(path)) reason = "Hidden file";
      else if (skipGenerated && generated(path)) reason = "Generated folder/cache";
      else if (skipSecrets && secretPath(path)) reason = "Secret-looking filename";
      const text = reason === "Included" && skipSecrets ? await inspect(file) : "";
      if (reason === "Included" && skipSecrets && secretText(text)) reason = "Secret-looking content";
      result.push({ file, path, reason, bytes: reason === "Included" ? new Uint8Array(await file.arrayBuffer()) : null });
    }
    const included = result.filter((item) => item.reason === "Included");
    if ($( "include-checklist").checked) included.push({ path: "GANKBYTE_RELEASE_CHECKLIST.md", bytes: new TextEncoder().encode(checklist($( "release-name").value.trim() || "project", $( "release-version").value.trim() || "0.1.0", included.length)), reason: "Included" });
    const skipped = result.length - included.filter((item) => item.file).length;
    const warnings = result.filter((item) => item.reason.includes("Secret")).length;
    prepared = { name: $("release-name").value.trim() || "project", version: $("release-version").value.trim() || "0.1.0", files: included };
    $("release-included").textContent = included.length; $("release-skipped").textContent = skipped; $("release-warnings").textContent = warnings; $("release-size").textContent = formatSize(included.reduce((sum, item) => sum + item.bytes.length, 0));
    list.innerHTML = result.map((item) => `<tr><td><code>${esc(item.path)}</code></td><td class="${item.reason === "Included" ? "good" : item.reason.includes("Secret") ? "error" : "warn"}">${item.reason === "Included" ? "Include" : "Skip"}</td><td>${esc(item.reason)}</td></tr>`).join("");
    $("release-report").textContent = [`GankByte release review`, `Name: ${prepared.name}`, `Version: ${prepared.version}`, `Included: ${included.length}`, `Skipped: ${skipped}`, `Warnings: ${warnings}`, "", ...result.map((item) => `${item.reason === "Included" ? "INCLUDE" : "SKIP"}: ${item.path} — ${item.reason}`)].join("\n");
    download.disabled = !included.length; status.textContent = `Prepared ${included.length} file${included.length === 1 ? "" : "s"}; review the list before downloading.`;
  }
  function u16(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
  function u32(n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
  function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
  function zip(files) { const encoder = new TextEncoder(), chunks = [], central = []; let offset = 0; for (const item of files) { const name = encoder.encode(item.path), data = item.bytes, crc = crc32(data), local = new Uint8Array(30 + name.length + data.length), view = new DataView(local.buffer); view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0, true); view.setUint16(8, 0, true); view.setUint16(10, 0, true); view.setUint16(12, 0, true); view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); local.set(name, 30); local.set(data, 30 + name.length); chunks.push(local); const entry = new Uint8Array(46 + name.length); const entryView = new DataView(entry.buffer); entryView.setUint32(0, 0x02014b50, true); entryView.setUint16(4, 20, true); entryView.setUint16(6, 20, true); entryView.setUint16(8, 0, true); entryView.setUint16(10, 0, true); entryView.setUint16(12, 0, true); entryView.setUint16(14, 0, true); entryView.setUint32(16, crc, true); entryView.setUint32(20, data.length, true); entryView.setUint32(24, data.length, true); entryView.setUint16(28, name.length, true); entryView.setUint16(30, 0, true); entryView.setUint16(32, 0, true); entryView.setUint16(34, 0, true); entryView.setUint16(36, 0, true); entryView.setUint32(38, 0, true); entryView.setUint32(42, offset, true); entry.set(name, 46); central.push(entry); offset += local.length; } const centralBytes = central.reduce((all, item) => { const merged = new Uint8Array(all.length + item.length); merged.set(all); merged.set(item, all.length); return merged; }, new Uint8Array()); const end = new Uint8Array(22); const endView = new DataView(end.buffer); endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true); endView.setUint32(12, centralBytes.length, true); endView.setUint32(16, offset, true); const all = [...chunks, centralBytes, end]; return all; }
  function downloadZip() { if (!prepared) return; const blob = new Blob(zip(prepared.files), { type: "application/zip" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `${prepared.name.replace(/[^a-z0-9_-]+/gi, "-")}-v${prepared.version}.zip`; link.click(); URL.revokeObjectURL(url); status.textContent = "Release ZIP downloaded locally."; }
  function clear() { input.value = ""; prepared = null; download.disabled = true; list.innerHTML = "<tr><td colspan=\"3\">Your release file list will appear here.</td></tr>"; $("release-report").textContent = "Prepare a release to create a review report."; $("release-included").textContent = $("release-skipped").textContent = $("release-size").textContent = $("release-warnings").textContent = "-"; status.textContent = "Project cleared."; }
  $("prepare-release").addEventListener("click", prepare); download.addEventListener("click", downloadZip); $("clear-release").addEventListener("click", clear); input.addEventListener("change", () => { status.textContent = `${input.files.length} file${input.files.length === 1 ? "" : "s"} selected.`; });
})();
