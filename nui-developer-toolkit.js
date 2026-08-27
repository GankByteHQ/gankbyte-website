(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { files: [], findings: [], links: [], filter: 'all', search: '', previewHtml: '' };
  const TEXT_EXT = new Set(['html','htm','css','scss','js','jsx','ts','tsx','lua','luau','json','json5','yaml','yml','toml','ini','cfg','txt','md','xml','meta','sql','log','map']);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cleanPath = (value) => String(value || '').replaceAll('\\','/').replace(/^['"]|['"]$/g,'').replace(/^\.\//,'').split(/[?#]/)[0];
  const normalise = (value) => cleanPath(value).replace(/^\//,'').toLowerCase();
  const baseName = (value) => normalise(value).split('/').pop();
  const extension = (value) => { const name = baseName(value); return name.includes('.') ? name.split('.').pop() : ''; };
  const isText = (path) => TEXT_EXT.has(extension(path));
  const fileByPath = (path) => { const wanted = normalise(path); return state.files.find((file) => normalise(file.path) === wanted) || state.files.find((file) => normalise(file.path).endsWith('/' + wanted)); };
  const hasPath = (path) => Boolean(fileByPath(path));
  const lineAt = (text, index) => String(text || '').slice(0, index).split(/\r?\n/).length;
  const sourceLine = (file, needle) => { const index = (file.text || '').indexOf(needle); return index < 0 ? 0 : lineAt(file.text, index); };

  function addFinding(kind, title, detail, fix, file = '', line = 0) {
    state.findings.push({ kind, title, detail, fix, file, line, id: `${kind}:${title}:${file}:${line}` });
  }

  function resolveReference(source, target) {
    const value = cleanPath(target);
    if (!value || /^(https?:|data:|mailto:|#|nui:\/\/|https?:\/\/)/i.test(value)) return null;
    if (value.startsWith('/')) return value.slice(1);
    const parts = cleanPath(source).split('/'); parts.pop();
    for (const part of value.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop(); else parts.push(part);
    }
    return parts.join('/');
  }

  function quotedValues(text, pattern) {
    const values = []; let match;
    while ((match = pattern.exec(text || ''))) values.push({ value: match[1], index: match.index });
    return values;
  }

  function manifestInfo() {
    const manifest = state.files.find((file) => ['fxmanifest.lua','__resource.lua'].includes(baseName(file.path)) && file.text);
    if (!manifest) return { file: null, uiPage: '', declared: [], scripts: [], callbacks: [] };
    const text = manifest.text;
    const uiMatch = text.match(/\bui_page\s+['"]([^'"]+)['"]/i);
    const declared = [];
    const block = text.match(/\bfiles\s*{([\s\S]*?)}/i)?.[1] || '';
    quotedValues(block, /['"]([^'"]+)['"]/g).forEach((item) => declared.push({ path: item.value, line: lineAt(text, text.indexOf(item.value)) }));
    const scripts = [];
    for (const directive of ['client_script','client_scripts','server_script','server_scripts','shared_script','shared_scripts']) {
      const matches = text.matchAll(new RegExp(`\\b${directive}\\s+['"]([^'"]+)['"]`, 'gi'));
      for (const match of matches) scripts.push({ path: match[1], line: lineAt(text, match.index) });
    }
    const callbacks = quotedValues(text, /RegisterNUICallback\s*\(\s*['"]([^'"]+)['"]/gi).map((item) => item.value);
    return { file: manifest, uiPage: uiMatch?.[1] || '', declared, scripts, callbacks };
  }

  function analyseManifest(info) {
    if (!info.file) {
      addFinding('error','FiveM manifest is missing','No fxmanifest.lua or __resource.lua was found in the selected resource.','Add fxmanifest.lua and declare the NUI page, files, and scripts before testing the resource.');
      return;
    }
    addFinding('good','FiveM manifest found',`${baseName(info.file.path)} is available for the resource map.`,'Keep the manifest as the single source of truth for NUI files.',info.file.path,1);
    if (!info.uiPage) addFinding('error','ui_page is missing','The manifest does not tell FiveM which HTML document should open as the NUI.','Add a line such as ui_page \'html/index.html\' and ensure that file exists.',info.file.path,1);
    else if (!hasPath(info.uiPage)) addFinding('error','ui_page file is missing',`The manifest points to ${info.uiPage}, but that file was not loaded.`,'Correct the ui_page path or load the complete resource folder.',info.file.path,sourceLine(info.file,info.uiPage));
    else addFinding('good','ui_page resolves',`FiveM can find ${info.uiPage}.`,'Keep the path casing identical on Linux servers.',info.file.path,sourceLine(info.file,info.uiPage));
    info.declared.forEach((entry) => { if (!hasPath(entry.path)) addFinding('error','Manifest file is missing',`files {} declares ${entry.path}, but it is not in the loaded resource.`,'Add the file to the resource or remove the stale manifest entry.',info.file.path,entry.line); });
    if (info.declared.length) addFinding('good','Manifest files checked',`${info.declared.length} file declaration${info.declared.length === 1 ? '' : 's'} checked against the loaded resource.`,'Declare every browser asset the NUI needs.',info.file.path);
    info.scripts.forEach((entry) => { if (!entry.path.includes('*') && !hasPath(entry.path)) addFinding('error','Manifest script is missing',`The manifest references ${entry.path}, but it was not loaded.`,'Correct the path or choose the full resource folder.',info.file.path,entry.line); });
  }

  function analyseBrowserFiles(info) {
    const html = state.files.filter((file) => ['html','htm'].includes(extension(file.path)) && file.text);
    const css = state.files.filter((file) => ['css','scss'].includes(extension(file.path)) && file.text);
    const scripts = state.files.filter((file) => ['js','jsx','ts','tsx'].includes(extension(file.path)) && file.text);
    if (!html.length) addFinding('warning','No HTML file was loaded','The NUI page cannot be checked because no HTML document was selected.','Load the complete resource folder or a ZIP containing the NUI page.');
    if (!css.length) addFinding('info','No stylesheet was found','No CSS or SCSS file was selected.','This is fine for a deliberately unstyled interface; otherwise check the resource upload.');
    if (!scripts.length) addFinding('info','No browser script was found','No JavaScript or TypeScript file was selected.','This is fine for a static NUI; otherwise check that the browser code was included.');
    const refs = [];
    const collect = (file, regex, label) => quotedValues(file.text, regex).forEach((item) => {
      const target = resolveReference(file.path, item.value); if (!target) return;
      refs.push({ source:file.path, target, line:lineAt(file.text,item.index), label, found:hasPath(target) });
      if (!hasPath(target)) addFinding('error',`Missing ${label}`,`${file.path} references ${item.value}, but the target was not found.`,'Check the relative path, filename casing, and that the asset is included in the resource.',file.path,lineAt(file.text,item.index));
    });
    html.forEach((file) => {
      if (!/<meta\s+[^>]*name=["']viewport["']/i.test(file.text)) addFinding('warning','Viewport meta tag is missing',`${file.path} has no responsive viewport declaration.`,'Add <meta name="viewport" content="width=device-width, initial-scale=1"> so the NUI behaves correctly at different resolutions.',file.path,1);
      collect(file, /<(?:script|img|source|iframe|audio|video)\b[^>]*\b(?:src|poster)=["']([^"']+)["']/gi, 'browser asset');
      collect(file, /<link\b[^>]*\bhref=["']([^"']+)["']/gi, 'stylesheet');
    });
    css.forEach((file) => collect(file, /url\(\s*["']?([^"')]+)["']?\s*\)/gi, 'CSS asset'));
    state.links.push(...refs);
    if (refs.length) addFinding('good','Browser asset paths checked',`${refs.length} local HTML/CSS reference${refs.length === 1 ? '' : 's'} were traced.`,'Keep local paths relative to the file that uses them.');
    const manifestPage = info.uiPage ? fileByPath(info.uiPage) : html.find((file) => baseName(file.path) === 'index.html');
    state.previewHtml = manifestPage?.text || html[0]?.text || '';
  }

  function analyseCallbacks(info) {
    const scripts = state.files.filter((file) => ['js','jsx','ts','tsx'].includes(extension(file.path)) && file.text);
    const lua = state.files.filter((file) => ['lua','luau'].includes(extension(file.path)) && file.text);
    const requested = [];
    scripts.forEach((file) => {
      const text = file.text;
      const patterns = [
        /GetParentResourceName\(\)[^\n]{0,180}?[/'"]([A-Za-z0-9_:-]+)[/'"]/g,
        /fetch\s*\(\s*[`'"](?:https?:\/\/)?\$\{GetParentResourceName\(\)\}[/:]([A-Za-z0-9_:-]+)/g,
        /\$\.post\s*\(\s*[`'"](?:https?:\/\/)?\$\{GetParentResourceName\(\)\}[/:]([A-Za-z0-9_:-]+)/g
      ];
      patterns.forEach((pattern) => quotedValues(text, pattern).forEach((item) => requested.push({ name:item.value, file:file.path, line:lineAt(text,item.index) })));
    });
    const uniqueRequested = [...new Map(requested.map((item) => [item.name,item])).values()];
    const callbacks = info.callbacks;
    const duplicateCallbacks = callbacks.filter((name,index) => callbacks.indexOf(name) !== index);
    duplicateCallbacks.forEach((name) => addFinding('warning','Duplicate NUI callback',`RegisterNUICallback is declared more than once for ${name}.`,'Keep one handler or deliberately route both calls through a shared function.',info.file?.path || ''));
    uniqueRequested.forEach((item) => {
      if (!callbacks.includes(item.name)) addFinding('error','NUI callback has no Lua handler',`Browser code requests ${item.name}, but no RegisterNUICallback('${item.name}', ...) was found.`,'Add the matching Lua callback or correct the browser callback name.',item.file,item.line);
      else addFinding('good','NUI callback is connected',`${item.name} is requested by the browser and registered in Lua.`,'Keep the name, payload shape, and callback response consistent.',item.file,item.line);
    });
    callbacks.filter((name) => !uniqueRequested.some((item) => item.name === name)).forEach((name) => addFinding('info','Lua callback is not referenced in browser code',`Lua registers ${name}, but no matching browser request was found in the loaded JavaScript.`,'Check whether it is called from another file or remove the unused handler.',info.file?.path || ''));
    if (uniqueRequested.length && !lua.length) addFinding('warning','Lua callback source is missing','Browser callbacks were found, but no Lua files were loaded to verify their handlers.','Load the complete resource folder before relying on the callback result.');
    if (!uniqueRequested.length && callbacks.length) addFinding('info','Lua callbacks found',`${callbacks.length} Lua callback${callbacks.length === 1 ? '' : 's'} loaded, but no browser request was detected.`,'This may be intentional if another resource calls the NUI or the request is generated dynamically.');
  }

  function analyseMessages() {
    const lua = state.files.filter((file) => ['lua','luau'].includes(extension(file.path)) && file.text);
    const scripts = state.files.filter((file) => ['js','jsx','ts','tsx'].includes(extension(file.path)) && file.text);
    const sent = []; const received = [];
    lua.forEach((file) => quotedValues(file.text, /\baction\s*=\s*['"]([^'"]+)['"]/gi).forEach((item) => sent.push({name:item.value,file:file.path,line:lineAt(file.text,item.index)})));
    scripts.forEach((file) => quotedValues(file.text, /(?:event\.data(?:\?\.)?\.action|data\.action)\s*(?:===|==|:==)\s*['"]([^'"]+)['"]/gi).forEach((item) => received.push({name:item.value,file:file.path,line:lineAt(file.text,item.index)})));
    const sentNames = [...new Set(sent.map((item) => item.name))]; const receivedNames = [...new Set(received.map((item) => item.name))];
    sentNames.filter((name) => !receivedNames.includes(name)).forEach((name) => addFinding('warning','Message action has no browser listener',`Lua sends the ${name} action, but no matching event.data.action listener was found.`,'Add a window message listener or correct the action name.',sent.find((item) => item.name === name)?.file, sent.find((item) => item.name === name)?.line));
    receivedNames.filter((name) => !sentNames.includes(name)).forEach((name) => addFinding('info','Browser listens for an unseen action',`The browser handles ${name}, but no matching SendNUIMessage action was found in the loaded Lua.`,'Check whether the action is sent by another resource or is generated dynamically.',received.find((item) => item.name === name)?.file, received.find((item) => item.name === name)?.line));
    if (sentNames.length && receivedNames.length && sentNames.some((name) => receivedNames.includes(name))) addFinding('good','Message actions overlap',`${sentNames.filter((name) => receivedNames.includes(name)).length} message action${sentNames.filter((name) => receivedNames.includes(name)).length === 1 ? '' : 's'} has both a sender and listener.`,'Keep action names stable as the UI grows.');
  }

  function analyseSafety() {
    state.files.forEach((file) => {
      if (/^(?:\.env|.*\.pem|.*\.key|id_rsa)$/i.test(baseName(file.path))) addFinding('warning','Potential secret file selected',`${file.path} looks like a credentials or private-key file.`,'Do not publish it or include it in a resource ZIP. The file content is not shown in this report.',file.path);
      if (file.text && /(discord\.com\/api\/webhooks|sk-[A-Za-z0-9_-]{12,}|password\s*[:=]|token\s*[:=])/i.test(file.text)) addFinding('warning','Possible secret in text file',`${file.path} contains a pattern that may be a password, token, or webhook.`,'Move secrets to server-side configuration and rotate any credential that was exposed.',file.path);
      if (file.size > 10 * 1024 * 1024) addFinding('info','Large file selected',`${file.path} is larger than 10 MB.`,'Keep large assets intentional because they increase resource download and NUI load time.',file.path);
    });
  }

  function analyse() {
    state.findings = []; state.links = [];
    const paste = $('nui-paste').value.trim();
    if (paste && !state.files.some((file) => baseName(file.path) === 'pasted-input.txt')) state.files.push({ path:'pasted-input.txt', text:paste, size:paste.length, type:'text' });
    const info = manifestInfo();
    analyseManifest(info); analyseBrowserFiles(info); analyseCallbacks(info); analyseMessages(); analyseSafety();
    if (!state.findings.length) addFinding('info','Nothing was analysed','Load a resource folder, ZIP, or paste source before analysing.','Choose the complete resource so paths can be checked.');
    render();
  }

  function setStatus(message, error = false) { $('nui-status').textContent = message; $('nui-status').classList.toggle('error', error); }
  function readFile(file) { return isText(file.name) ? file.text() : Promise.resolve(''); }
  async function loadBrowserFiles(fileList) {
    const files = [...fileList]; if (!files.length) return;
    state.files = [];
    for (const file of files) state.files.push({ path:cleanPath(file.webkitRelativePath || file.name), text:await readFile(file), size:file.size, type:isText(file.name) ? 'text' : 'binary' });
    $('nui-paste').value = '';
    setStatus(`${state.files.length} file${state.files.length === 1 ? '' : 's'} loaded locally. Ready to analyse.`);
    analyse();
  }
  async function loadZip(file) {
    if (!window.JSZip) { setStatus('ZIP support is unavailable. Choose the resource folder instead.', true); return; }
    const zip = await window.JSZip.loadAsync(file); state.files = [];
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      const path = cleanPath(entry.name); const text = isText(path) ? await entry.async('string') : '';
      state.files.push({ path, text, size:entry._data?.uncompressedSize || text.length, type:isText(path) ? 'text' : 'binary' });
    }
    $('nui-paste').value = ''; setStatus(`${state.files.length} file${state.files.length === 1 ? '' : 's'} loaded from ZIP locally. Ready to analyse.`); analyse();
  }

  function renderSummary() {
    const errors = state.findings.filter((item) => item.kind === 'error').length;
    const warnings = state.findings.filter((item) => item.kind === 'warning').length;
    const good = state.findings.filter((item) => item.kind === 'good').length;
    const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 7));
    $('nui-summary').innerHTML = [['Health score',`${score}%`],['Errors',errors],['Warnings',warnings],['Files',state.files.length]].map(([label,value]) => `<div class="nui-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const info = manifestInfo(); $('nui-type-badge').textContent = info.file ? 'FiveM NUI resource' : 'NUI files / snippet'; $('nui-report-title').textContent = `${score}% ready to inspect`;
    setStatus(`${good} positive check${good === 1 ? '' : 's'}, ${errors} error${errors === 1 ? '' : 's'}, and ${warnings} warning${warnings === 1 ? '' : 's'} found.`, errors > 0);
  }

  function renderFindings() {
    const items = state.findings.filter((item) => (state.filter === 'all' || item.kind === state.filter) && `${item.title} ${item.detail} ${item.fix} ${item.file}`.toLowerCase().includes(state.search));
    $('nui-findings').innerHTML = items.length ? items.map((item) => `<article class="nui-finding ${item.kind}"><span class="nui-finding-icon">${item.kind === 'good' ? '&#10003;' : item.kind === 'error' ? '!' : 'i'}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p>${item.fix ? `<div class="nui-finding-fix">Fix: ${escapeHtml(item.fix)}</div>` : ''}${item.file ? `<div class="nui-meta"><span>${escapeHtml(item.file)}</span>${item.line ? `<span>line ${item.line}</span>` : ''}</div>` : ''}</div></article>`).join('') : '<p class="nui-empty">No findings match this filter.</p>';
  }

  function renderInventory() {
    const counts = {}; state.files.forEach((file) => { const key = file.type === 'binary' ? 'Binary assets' : extension(file.path).toUpperCase() || 'Other'; counts[key] = (counts[key] || 0) + 1; });
    $('nui-inventory').innerHTML = Object.keys(counts).sort().map((key) => `<div class="nui-inventory-row"><span>${escapeHtml(key)}</span><strong>${counts[key]}</strong></div>`).join('') || '<p class="nui-empty">No files loaded.</p>';
  }

  function renderMap() {
    const links = state.links; $('nui-map-count').textContent = `${links.length} link${links.length === 1 ? '' : 's'}`;
    $('nui-map').innerHTML = links.length ? links.map((link) => `<div class="nui-map-row ${link.found ? '' : 'missing'}"><span class="nui-map-path">${escapeHtml(link.source)}</span><span class="nui-map-arrow">&rarr;</span><span class="nui-map-path" title="${escapeHtml(link.target)}">${escapeHtml(link.target)}</span></div>`).join('') : '<p class="nui-empty">No local browser asset references were found.</p>';
  }

  function render() {
    $('nui-summary').hidden = false; $('nui-toolbar').hidden = false; $('nui-report-grid').hidden = false; $('nui-map-card').hidden = false;
    renderSummary(); renderFindings(); renderInventory(); renderMap();
  }

  function makePreview() {
    if (!state.previewHtml) { setStatus('No HTML page is available to preview.', true); return; }
    const css = state.files.filter((file) => ['css','scss'].includes(extension(file.path))).map((file) => `<style>${file.text}</style>`).join('\n');
    const html = state.previewHtml.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*stylesheet[^>]*>/gi,'');
    $('nui-preview').srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body>${html}</body></html>`;
    $('nui-preview-card').hidden = false; $('nui-preview-card').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function reportText() {
    const info = manifestInfo(); const lines = ['GankByte NUI Developer Toolkit report','======================================',`Resource: ${info.file ? info.file.path : 'No FiveM manifest detected'}`,`Files: ${state.files.length}`, ''];
    state.findings.forEach((item) => lines.push(`[${item.kind.toUpperCase()}] ${item.title}${item.file ? ` (${item.file}${item.line ? `:${item.line}` : ''})` : ''}\n${item.detail}\nFix: ${item.fix}\n`));
    lines.push('Files stay local. This is static analysis and cannot run FiveM or prove runtime compatibility.'); return lines.join('\n');
  }
  function download(name, content, type = 'text/plain') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }

  $('choose-nui-folder').addEventListener('click', () => $('nui-folder').click());
  $('choose-nui-zip').addEventListener('click', () => $('nui-zip').click());
  $('nui-folder').addEventListener('change', (event) => loadBrowserFiles(event.target.files));
  $('nui-zip').addEventListener('change', (event) => event.target.files[0] && loadZip(event.target.files[0]));
  $('analyze-nui').addEventListener('click', analyse);
  $('clear-nui').addEventListener('click', () => { state.files = []; state.findings = []; state.links = []; state.previewHtml = ''; $('nui-folder').value = ''; $('nui-zip').value = ''; $('nui-paste').value = ''; $('nui-summary').hidden = true; $('nui-toolbar').hidden = true; $('nui-report-grid').hidden = true; $('nui-map-card').hidden = true; $('nui-preview-card').hidden = true; setStatus('No resource loaded yet. Nothing leaves this browser.'); });
  document.querySelectorAll('.nui-filter').forEach((button) => button.addEventListener('click', () => { state.filter = button.dataset.filter; document.querySelectorAll('.nui-filter').forEach((item) => item.classList.toggle('active', item === button)); renderFindings(); }));
  $('nui-search').addEventListener('input', (event) => { state.search = event.target.value.trim().toLowerCase(); renderFindings(); });
  $('copy-nui-report').addEventListener('click', async () => { await navigator.clipboard.writeText(reportText()); $('copy-nui-report').textContent = 'Copied'; setTimeout(() => $('copy-nui-report').textContent = 'Copy report', 1400); });
  $('download-nui-report').addEventListener('click', () => download('gankbyte-nui-report.txt', reportText()));
  $('open-nui-preview').addEventListener('click', makePreview);
  $('close-nui-preview').addEventListener('click', () => { $('nui-preview-card').hidden = true; });
})();
