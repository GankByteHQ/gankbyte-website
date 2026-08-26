(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { format:'json', lastOutput:'', lastValue:null };
  const names = { json:'JSON', yaml:'YAML', toml:'TOML' };
  const examples = {
    json: '{\n  "name": "gankbyte-resource",\n  "version": "1.0.0",\n  "enabled": true,\n  "features": ["profiles", "leaderboards"],\n  "database": {\n    "adapter": "supabase",\n    "ssl": true\n  }\n}\n',
    yaml: 'name: gankbyte-resource\nversion: 1.0.0\nenabled: true\nfeatures:\n  - profiles\n  - leaderboards\ndatabase:\n  adapter: supabase\n  ssl: true\n',
    toml: 'name = "gankbyte-resource"\nversion = "1.0.0"\nenabled = true\nfeatures = ["profiles", "leaderboards"]\n\n[database]\nadapter = "supabase"\nssl = true\n'
  };
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const issue = (message, line, column) => ({ message, line:line || 0, column:column || 0 });
  const linesOf = (text) => String(text || '').split(/\r?\n/);
  const lineColumn = (text, position) => { const before = text.slice(0, Math.max(0, position)); const lines = linesOf(before); return { line:lines.length, column:lines[lines.length - 1].length + 1 }; };
  const updateMeta = (id, text) => { const value = String(text || ''); const count = value ? linesOf(value).length - (value.endsWith('\n') ? 1 : 0) : 0; $(id).textContent = count + ' line' + (count === 1 ? '' : 's') + ' · ' + value.length + ' characters'; };

  function stripComment(line) {
    let quote = ''; let escaped = false; let depth = 0;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (escaped) { escaped = false; continue; }
      if (quote === '"' && char === '\\') { escaped = true; continue; }
      if ((char === '"' || char === "'") && (!quote || quote === char)) { quote = quote ? '' : char; continue; }
      if (!quote && '[{('.includes(char)) depth += 1;
      if (!quote && ']})'.includes(char)) depth -= 1;
      if (!quote && depth === 0 && char === '#') return line.slice(0, index).trimEnd();
    }
    return line.trimEnd();
  }
  function splitTop(text) {
    const result = []; let start = 0; let quote = ''; let depth = 0; let escaped = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (escaped) { escaped = false; continue; }
      if (quote === '"' && char === '\\') { escaped = true; continue; }
      if ((char === '"' || char === "'") && (!quote || quote === char)) { quote = quote ? '' : char; continue; }
      if (!quote && '[{('.includes(char)) depth += 1;
      if (!quote && ']})'.includes(char)) depth -= 1;
      if (!quote && depth === 0 && char === ',') { result.push(text.slice(start, index).trim()); start = index + 1; }
    }
    result.push(text.slice(start).trim());
    return result.filter(Boolean);
  }
  function topIndex(text, wanted) {
    let quote = ''; let depth = 0; let escaped = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (escaped) { escaped = false; continue; }
      if (quote === '"' && char === '\\') { escaped = true; continue; }
      if ((char === '"' || char === "'") && (!quote || quote === char)) { quote = quote ? '' : char; continue; }
      if (!quote && '[{('.includes(char)) depth += 1;
      if (!quote && ']})'.includes(char)) depth -= 1;
      if (!quote && depth === 0 && char === wanted) return index;
    }
    return -1;
  }
  function unquote(value) {
    const text = value.trim();
    if (text.length > 1 && text[0] === '"' && text[text.length - 1] === '"') { try { return JSON.parse(text); } catch (_) { return text.slice(1, -1); } }
    if (text.length > 1 && text[0] === "'" && text[text.length - 1] === "'") return text.slice(1, -1).replace(/''/g, "'");
    return text;
  }
  function scalar(value, line, errors) {
    const text = value.trim();
    if (!text) return null;
    if (text === 'null' || text === '~') return null;
    if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return Number(text);
    if (text[0] === '[' && text.endsWith(']')) return text.length === 2 ? [] : splitTop(text.slice(1, -1)).map((part) => scalar(part, line, errors));
    if (text[0] === '{' && text.endsWith('}')) {
      const object = {};
      splitTop(text.slice(1, -1)).forEach((part) => { const colon = topIndex(part, ':'); if (colon < 1) errors.push(issue('Inline object item needs a key and colon.', line, 1)); else object[unquote(part.slice(0, colon))] = scalar(part.slice(colon + 1), line, errors); });
      return object;
    }
    return unquote(text);
  }
  function nextMeaningful(lines, index) {
    for (let next = index + 1; next < lines.length; next += 1) { const clean = stripComment(lines[next]); if (clean.trim() && !/^(---|\.\.\.)\s*$/.test(clean.trim())) return { raw:lines[next], clean:clean }; }
    return null;
  }
  function parseYaml(text) {
    const root = {}; const errors = []; const stack = [{ indent:-1, value:root }]; const lines = linesOf(text);
    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index]; const clean = stripComment(raw); const content = clean.trim();
      if (!content || /^(---|\.\.\.)\s*$/.test(content)) continue;
      if (/\t/.test(raw)) { errors.push(issue('Tabs are not valid indentation in YAML.', index + 1, raw.indexOf('\t') + 1)); continue; }
      const indent = clean.match(/^ */)[0].length;
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const parent = stack[stack.length - 1].value;
      if (content.startsWith('-')) {
        if (!Array.isArray(parent)) { errors.push(issue('List item has no list parent. Check indentation.', index + 1, indent + 1)); continue; }
        const item = content.slice(1).trim(); if (!item) { const child = {}; parent.push(child); stack.push({ indent:indent, value:child }); continue; }
        const colon = topIndex(item, ':');
        if (colon > 0 && /^([^:]+):(?:\s|$)/.test(item)) { const child = {}; child[unquote(item.slice(0, colon))] = scalar(item.slice(colon + 1), index + 1, errors); parent.push(child); stack.push({ indent:indent, value:child }); } else parent.push(scalar(item, index + 1, errors));
        continue;
      }
      const colon = topIndex(content, ':');
      if (colon < 1 || !/^([^:]+):(?:\s|$)/.test(content)) { errors.push(issue('Expected a YAML key followed by a colon.', index + 1, indent + 1)); continue; }
      if (Array.isArray(parent)) { errors.push(issue('Mapping entries inside a list must begin on the list item line.', index + 1, indent + 1)); continue; }
      const key = unquote(content.slice(0, colon)); const valueText = content.slice(colon + 1).trim();
      if (Object.prototype.hasOwnProperty.call(parent, key)) errors.push(issue('Duplicate key "' + key + '".', index + 1, indent + 1));
      if (valueText === '|' || valueText === '>') { errors.push(issue('Block scalar syntax is not supported by the browser formatter yet.', index + 1, colon + 2)); parent[key] = ''; continue; }
      if (valueText) { parent[key] = scalar(valueText, index + 1, errors); continue; }
      const next = nextMeaningful(lines, index); const isList = next && next.raw.match(/^ */)[0].length > indent && next.clean.trim().startsWith('-'); const child = isList ? [] : {};
      parent[key] = child; stack.push({ indent:indent, value:child });
    }
    return { value:root, errors:errors };
  }
  function keyParts(key) { return key.trim().split('.').map((part) => part.trim()).filter(Boolean); }
  function assign(root, parts, value, line, errors) { let target = root; parts.slice(0, -1).forEach((part) => { if (!target[part] || typeof target[part] !== 'object' || Array.isArray(target[part])) target[part] = {}; target = target[part]; }); const key = parts[parts.length - 1]; if (Object.prototype.hasOwnProperty.call(target, key)) errors.push(issue('Duplicate key "' + parts.join('.') + '".', line, 1)); target[key] = value; }
  function parseToml(text) {
    const root = {}; const errors = []; let current = root; const lines = linesOf(text);
    for (let index = 0; index < lines.length; index += 1) {
      const clean = stripComment(lines[index]).trim(); const line = index + 1; if (!clean) continue;
      if (/^\[\[.*\]\]$/.test(clean)) { const parts = keyParts(clean.slice(2, -2)); let parent = root; parts.slice(0, -1).forEach((part) => { if (!parent[part] || typeof parent[part] !== 'object') parent[part] = {}; parent = parent[part]; }); const key = parts[parts.length - 1]; if (!Array.isArray(parent[key])) parent[key] = []; const item = {}; parent[key].push(item); current = item; continue; }
      if (/^\[.*\]$/.test(clean)) { current = root; keyParts(clean.slice(1, -1)).forEach((part) => { if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) current[part] = {}; current = current[part]; }); continue; }
      const equals = topIndex(clean, '='); if (equals < 1) { errors.push(issue('Expected a TOML key = value entry or a [section].', line, 1)); continue; }
      const key = clean.slice(0, equals).trim(); if (!/^[A-Za-z0-9_.-]+$/.test(key)) errors.push(issue('TOML keys may contain letters, numbers, underscores, dashes, and dots.', line, 1));
      assign(current, keyParts(key), scalar(clean.slice(equals + 1), line, errors), line, errors);
    }
    return { value:root, errors:errors };
  }
  function parse(format, text) {
    if (!String(text || '').trim()) return { value:null, errors:[issue('The input is empty. Paste a configuration file first.', 1, 1)] };
    if (format === 'json') { try { return { value:JSON.parse(text), errors:[] }; } catch (error) { const position = Number((error.message.match(/position (\d+)/i) || [0, 0])[1]); const point = lineColumn(text, position); return { value:null, errors:[issue(error.message.replace(/ in JSON at position \d+/i, ''), point.line, point.column)] }; } }
    return format === 'yaml' ? parseYaml(text) : parseToml(text);
  }
  const yamlScalar = (value) => { if (value === null) return 'null'; if (typeof value === 'boolean' || typeof value === 'number') return String(value); return typeof value === 'string' && /^[A-Za-z0-9_./:@+-]+$/.test(value) && !/^(true|false|null|~)$/i.test(value) ? value : JSON.stringify(value); };
  const yamlKey = (key) => /^[A-Za-z_][\w.-]*$/.test(key) ? key : JSON.stringify(key);
  function toYaml(value, indent) { const pad = ' '.repeat(indent || 0); if (Array.isArray(value)) return value.length ? value.map((item) => item && typeof item === 'object' && !Array.isArray(item) ? pad + '-\n' + toYaml(item, (indent || 0) + 2) : pad + '- ' + toYaml(item, (indent || 0) + 2).trimStart()).join('\n') : pad + '[]'; if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => item && typeof item === 'object' && !Array.isArray(item) ? pad + yamlKey(key) + ':\n' + toYaml(item, (indent || 0) + 2) : pad + yamlKey(key) + ': ' + toYaml(item, (indent || 0) + 2).trimStart()).join('\n'); return pad + yamlScalar(value); }
  const tomlScalar = (value) => value === null ? '""' : typeof value === 'string' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(tomlScalar).join(', ') + ']' : String(value);
  function toToml(value) { const lines = []; const write = (object, prefix) => { Object.entries(object || {}).filter(([, item]) => !item || typeof item !== 'object' || Array.isArray(item)).forEach(([key, item]) => lines.push(key + ' = ' + tomlScalar(item))); Object.entries(object || {}).filter(([, item]) => item && typeof item === 'object' && !Array.isArray(item)).forEach(([key, item]) => { if (lines.length) lines.push(''); const section = prefix ? prefix + '.' + key : key; lines.push('[' + section + ']'); write(item, section); }); }; write(value, ''); return lines.join('\n') + (lines.length ? '\n' : ''); }
  const outputFor = (format, value, minify) => format === 'json' ? JSON.stringify(value, null, minify ? 0 : 2) : format === 'yaml' ? toYaml(value) + '\n' : toToml(value);
  function renderErrors(errors) { $('result-list').innerHTML = errors.length ? errors.map((item) => '<div class="result-row error"><span class="result-icon">!</span><div><strong>' + escapeHtml(item.message) + '</strong><p>' + (item.line ? 'Line ' + item.line + ', column ' + item.column + '.' : 'Review the input structure.') + '</p>' + (item.line ? '<div class="result-location">' + names[state.format] + ':' + item.line + ':' + item.column + '</div>' : '') + '</div></div>').join('') : '<p class="empty-result">No issues found. The structure is ready to use.</p>'; }
  function setStatus(valid, errors, detail) { $('input-status').textContent = valid ? 'Valid' : 'Needs attention'; $('input-status').className = 'editor-status ' + (valid ? 'valid' : 'invalid'); $('result-badge').textContent = valid ? 'VALID' : 'CHECK'; $('result-badge').className = 'result-badge ' + (valid ? 'valid' : 'invalid'); $('result-title').textContent = valid ? names[state.format] + ' is valid.' : errors.length + ' issue' + (errors.length === 1 ? '' : 's') + ' found.'; $('result-detail').textContent = detail || (valid ? 'The structure parsed successfully and the output can be copied or downloaded.' : 'Fix the highlighted line, then validate again.'); }
  function run(minify) { const result = parse(state.format, $('config-input').value); if (result.errors.length) { state.lastOutput = ''; state.lastValue = null; $('config-output').value = ''; updateMeta('output-meta', ''); renderErrors(result.errors); setStatus(false, result.errors); return false; } state.lastValue = result.value; state.lastOutput = outputFor(state.format, result.value, Boolean(minify)); $('config-output').value = state.lastOutput; updateMeta('output-meta', state.lastOutput); renderErrors([]); setStatus(true, [], minify ? 'The input was parsed and compacted locally.' : 'The input was parsed and formatted locally.'); return true; }
  function diff() { const before = linesOf($('config-input').value); const after = linesOf($('compare-input').value); const rows = []; const max = Math.max(before.length, after.length); for (let index = 0; index < max; index += 1) { if (before[index] === after[index]) continue; if (before[index] !== undefined) rows.push('<div class="diff-line removed">- ' + escapeHtml(before[index]) + '</div>'); if (after[index] !== undefined) rows.push('<div class="diff-line added">+ ' + escapeHtml(after[index]) + '</div>'); } $('compare-result').innerHTML = rows.length ? '<p>' + rows.length + ' changed line' + (rows.length === 1 ? '' : 's') + ' shown.</p><div class="diff-list">' + rows.join('') + '</div>' : '<p>No line changes found.</p>'; }
  function download(name, content) { const url = URL.createObjectURL(new Blob([content], { type:'text/plain' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
  function convert() { const result = parse(state.format, $('config-input').value); if (result.errors.length) { renderErrors(result.errors); setStatus(false, result.errors); return; } const target = $('convert-to').value; $('config-input').value = outputFor(target, result.value, false); state.format = target; document.querySelectorAll('[data-format]').forEach((button) => { const active = button.dataset.format === target; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); }); updateMeta('input-meta', $('config-input').value); run(false); setStatus(true, [], 'Converted to ' + names[target] + '. Check format-specific features before shipping.'); }
  function resetMessage() { $('result-title').textContent = 'Paste ' + names[state.format] + ' to begin.'; $('result-badge').textContent = 'READY'; $('result-badge').className = 'result-badge'; $('result-list').innerHTML = '<p class="empty-result">Use the selected format above, then choose Format or Validate now.</p>'; }

  document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => { state.format = button.dataset.format; document.querySelectorAll('[data-format]').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); }); $('config-input').value = ''; $('config-output').value = ''; updateMeta('input-meta', ''); updateMeta('output-meta', ''); resetMessage(); }));
  $('config-input').addEventListener('input', () => { updateMeta('input-meta', $('config-input').value); $('input-status').textContent = 'Editing'; $('input-status').className = 'editor-status'; });
  $('format-input').addEventListener('click', () => run(false)); $('validate-input').addEventListener('click', () => run(false)); $('load-example').addEventListener('click', () => { $('config-input').value = examples[state.format]; updateMeta('input-meta', $('config-input').value); run(false); }); $('clear-input').addEventListener('click', () => { $('config-input').value = ''; $('config-output').value = ''; updateMeta('input-meta', ''); updateMeta('output-meta', ''); state.lastOutput = ''; state.lastValue = null; resetMessage(); });
  $('minify-input').addEventListener('click', () => run(true));
  $('copy-output').addEventListener('click', async () => { if (!$('config-output').value) return; try { await navigator.clipboard.writeText($('config-output').value); $('copy-output').innerHTML = 'Copied <span>&nearr;</span>'; setTimeout(() => { $('copy-output').innerHTML = 'Copy <span>&nearr;</span>'; }, 1400); } catch (_) { $('output-status').textContent = 'Copy blocked'; } });
  $('download-output').addEventListener('click', () => { if ($('config-output').value) download('gankbyte-config.' + state.format, $('config-output').value); });
  $('toggle-compare').addEventListener('click', () => { $('compare-panel').hidden = !$('compare-panel').hidden; $('toggle-compare').textContent = $('compare-panel').hidden ? 'Open comparison' : 'Close comparison'; }); $('run-compare').addEventListener('click', diff); $('clear-compare').addEventListener('click', () => { $('compare-input').value = ''; $('compare-result').innerHTML = ''; }); $('convert-input').addEventListener('click', convert);
  document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(false); } });
})();
