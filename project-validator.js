(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { files: [], findings: [], references: [], config: {}, configError: '', baseline: null, type: 'auto', detected: 'unknown', filter: 'all', ignored: new Set() };
  const TEXT_EXT = new Set(['lua','luau','py','pyw','js','jsx','ts','tsx','java','kt','sql','json','json5','yaml','yml','toml','ini','cfg','properties','xml','html','htm','css','scss','md','txt','meta','cfg','mcmeta','gradle','kts','bat','ps1','sh']);
  const BINARY_EXT = new Set(['png','jpg','jpeg','gif','webp','ico','zip','jar','dll','so','dylib','rpf','ybn','ydr','ydd','ytd','ymf','awc','rel','class','exe']);
  const TYPE_LABELS = { unknown:'Unknown project', fivem:'FiveM resource', lua:'Lua project', python:'Python project', javascript:'JavaScript / TypeScript', java:'Java project', sql:'SQL project', nui:'NUI project', minecraft:'Minecraft project', runelite:'RuneLite plugin' };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const ext = (path) => (path.split('.').pop() || '').toLowerCase();
  const pathOf = (file) => (file.webkitRelativePath || file.name).replaceAll('\\','/').replace(/^\.\//,'');
  const cleanPath = (path) => String(path || '').replaceAll('\\','/').replace(/^['"]|['"]$/g,'').replace(/^\.\//,'').split(/[?#]/)[0];
  const basename = (path) => cleanPath(path).split('/').pop().toLowerCase();
  const activeFiles = () => state.files.filter((file) => !file.ignored);
  const fileByPath = (path) => {
    const wanted = cleanPath(path).toLowerCase();
    return activeFiles().find((file) => file.path.toLowerCase() === wanted) || activeFiles().find((file) => file.path.toLowerCase().endsWith('/' + wanted));
  };
  const hasFile = (path) => Boolean(fileByPath(path));
  const hasReference = (path) => {
    const wanted = cleanPath(path);
    if (!wanted || wanted.startsWith('@')) return true;
    if (!wanted.includes('*')) return hasFile(wanted);
    const pattern = new RegExp(`^${wanted.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
    return activeFiles().some((file) => pattern.test(file.path) || pattern.test(file.path.split('/').slice(1).join('/')));
  };
  const textOf = (path) => fileByPath(path)?.text || '';
  const lineAt = (text, index) => text.slice(0, Math.max(0,index)).split(/\r?\n/).length;
  const location = (path, line) => path ? `${path}${line ? `:${line}` : ''}` : '';
  const setStatus = (message, error = false) => { $('validator-status').textContent = message; $('validator-status').classList.toggle('error', error); };
  const findingId = (severity, title, path = '', line = 0) => `${severity}|${title}|${path}|${line}`.toLowerCase().replace(/\s+/g, ' ');
  const defaultConfidence = (severity) => ({ good: 100, error: 95, warning: 86, info: 92 }[severity] || 80);
  const add = (severity, title, detail, fix = '', path = '', line = 0, group = 'General', confidence = defaultConfidence(severity)) => {
    const id = findingId(severity, title, path, line);
    state.findings.push({ id, severity, title, detail, fix, path, line, group, confidence });
  };
  const allTextFiles = () => activeFiles().filter((file) => file.text);
  const filesWithExt = (...extensions) => activeFiles().filter((file) => extensions.includes(ext(file.path)));
  const firstPath = (regex) => activeFiles().find((file) => regex.test(file.path))?.path || '';
  const globToRegex = (glob) => new RegExp(`^${String(glob).split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
  const configMatch = (path, patterns = []) => patterns.some((pattern) => globToRegex(pattern).test(path) || globToRegex(`*/${pattern}`).test(path));

  function detectType() {
    if (state.type !== 'auto') return state.type;
    const paths = activeFiles().map((file) => file.path.toLowerCase());
    const joined = paths.join('\n');
    if (paths.some((path) => /(^|\/)fxmanifest\.lua$|(^|\/)__resource\.lua$/.test(path))) return 'fivem';
    if (paths.some((path) => path.endsWith('runelite-plugin.properties') || path.includes('/runelite/'))) return 'runelite';
    if (paths.some((path) => path.endsWith('server.properties') || path.endsWith('plugin.yml') || path.endsWith('fabric.mod.json') || path.includes('/datapack/'))) return 'minecraft';
    if (paths.some((path) => /(^|\/)(html|nui)\//.test(path)) && paths.some((path) => /\.(html?|css|js)$/.test(path))) return 'nui';
    if (paths.some((path) => /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/.test(path)) || paths.some((path) => path.includes('/src/main/java/'))) return 'java';
    if (paths.some((path) => /(^|\/)(pyproject\.toml|setup\.py|requirements\.txt|poetry\.lock)$/.test(path)) || paths.some((path) => path.endsWith('.py'))) return 'python';
    if (paths.some((path) => /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json)$/.test(path)) || paths.some((path) => /\.(js|jsx|ts|tsx)$/.test(path))) return 'javascript';
    if (paths.some((path) => path.endsWith('.sql'))) return 'sql';
    if (paths.some((path) => path.endsWith('.lua') || path.endsWith('.luau'))) return 'lua';
    return joined ? 'unknown' : 'unknown';
  }

  function checkGeneral() {
    if (!state.files.length) { add('error','No files were loaded','Choose a project folder or select project files before scanning.','Load the project files so the validator can inspect structure and references.','','','General'); return; }
    if (state.configError) add('warning','Validator config is invalid','The project contains .gankbyte-validator.json, but it could not be parsed.','Fix the JSON or remove the file to use automatic settings.',state.configError,0,'Configuration');
    const duplicatePaths = [...new Set(activeFiles().map((file) => file.path.toLowerCase()))].length !== activeFiles().length;
    if (duplicatePaths) add('error','Duplicate paths were supplied','The selected files contain the same relative path more than once.','Select the project folder once, or remove duplicate files before publishing.','','','Safety');
    const secrets = activeFiles().filter((file) => /(^|\/)(\.env(?:\..*)?|id_rsa|id_dsa|credentials\.json|secrets?\.(json|ya?ml)|.*\.(pem|key|p12|pfx))$/i.test(file.path));
    if (secrets.length) add('warning','Possible secret files found',secrets.slice(0,6).map((file) => file.path).join(', '),'Remove secrets from the project, add them to .gitignore, and rotate any credential that has already been published.',secrets[0].path,0,'Safety');
    else add('good','No obvious secret files found','No common private-key, certificate, or environment-secret filenames were detected.','Still review configuration files before publishing.','','','Safety');
    const suspicious = activeFiles().filter((file) => file.path.startsWith('/') || file.path.includes('../') || /(^|\/)[A-Za-z]:[\\/]/.test(file.path));
    if (suspicious.length) add('warning','Suspicious paths found',suspicious.slice(0,5).map((file) => file.path).join(', '),'Use relative paths inside the project. Absolute and parent-directory paths can break deployment or escape the intended resource.','',0,'Safety');
    const oversized = activeFiles().filter((file) => file.size > 10 * 1024 * 1024);
    if (oversized.length) add('info','Large files need a deliberate decision',`${oversized.length} file${oversized.length === 1 ? '' : 's'} exceed 10 MB.`,'Keep large binaries out of Git when possible and document required assets or use release storage.',oversized[0].path,0,'Safety');
    const readme = state.files.find((file) => /^README(?:\.md|\.txt)?$/i.test(basename(file.path)));
    const licence = state.files.find((file) => /^(LICENSE|LICENCE)(\..*)?$/i.test(basename(file.path)));
    if (!readme) add('info','README is missing','People will not know how to install, configure, or use this project.','Add a README with requirements, setup, configuration, commands, examples, and troubleshooting.','','','Documentation');
    if (!licence) add('info','Licence file is missing','The project does not state how other people may use or modify it.','Add a licence before publishing source or distributing a resource.','','','Documentation');
  }

  function quotedReferences(text, pattern) {
    const refs = [];
    for (const match of text.matchAll(pattern)) refs.push({ value: cleanPath(match[1]), line: lineAt(text, match.index || 0) });
    return refs;
  }
  function checkFiveM() {
    const manifest = state.files.find((file) => /(^|\/)fxmanifest\.lua$/i.test(file.path) || /(^|\/)__resource\.lua$/i.test(file.path));
    if (!manifest) { add('error','FiveM manifest is missing','No fxmanifest.lua or legacy __resource.lua was found at the resource root.','Add fxmanifest.lua and declare the runtime, scripts, UI, and data files before starting the resource.','','','FiveM'); return; }
    const text = manifest.text || '';
    if (!/fx_version\s*['"]/i.test(text) && /fxmanifest/i.test(manifest.path)) add('error','fx_version is missing','FiveM cannot reliably determine the resource runtime version.','Add a supported declaration such as fx_version \'cerulean\'.',manifest.path,0,'FiveM');
    if (!/game\s*['"](?:gta5|rdr3)['"]/i.test(text)) add('warning','Game declaration is missing','The manifest does not declare gta5 or rdr3.','For GTA V resources, add game \'gta5\' so the target is explicit.',manifest.path,0,'FiveM');
    const refs = quotedReferences(text, /['"]([^'"]+)['"]/g).filter((ref) => /\.(lua|js|ts|css|html?|json|meta|ytyp|ymap|ybn|ydr|ydd|ytd|ymf|png|jpg|jpeg|webp)$/i.test(ref.value) && !/^https?:/i.test(ref.value));
    const missing = refs.filter((ref) => !hasReference(ref.value));
    if (missing.length) missing.slice(0,10).forEach((ref) => add('error','Manifest reference is missing',`FiveM is told to load “${ref.value}”, but that file is not in the selected project.`,'Check spelling and case, or add the missing file to the resource.',manifest.path,ref.line,'FiveM'));
    else add('good','Manifest references resolve',`${refs.length} local file reference${refs.length === 1 ? '' : 's'} were found in the selected project.`,'','','','FiveM');
    const dependencyBlock = text.match(/dependencies\s*\{([\s\S]*?)\}/i);
    if (dependencyBlock) { const deps = [...dependencyBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]); if (deps.length) add('info','External dependencies are declared',deps.join(', '),'Confirm each dependency is installed and starts before this resource. The browser cannot inspect your server’s resource order.',manifest.path,0,'FiveM'); }
    if (/ui_page\s*['"]/i.test(text)) add('good','NUI entry point is declared','The manifest declares a UI page. Run the NUI checks as well if this resource contains HTML, CSS, or JavaScript.',manifest.path,0,'FiveM');
    if (filesWithExt('lua','js','ts').length === 0) add('warning','No client or server scripts found','This may be a data-only resource, or its scripts are missing.','Confirm that client_script, server_script, or shared_script entries point to files that exist.',manifest.path,0,'FiveM');
    const exports = [...text.matchAll(/(?:export|server_export|client_export)\s*['"]([^'"]+)['"]/gi)].map((match) => match[1]);
    if (exports.length) add('info','Exports are declared',exports.join(', '),'Keep exported functions stable and enforce permissions inside server-side exports.',manifest.path,0,'FiveM');
  }

  function checkLua() {
    const luaFiles = filesWithExt('lua','luau');
    if (!luaFiles.length) { add('error','No Lua files found','This project was checked as Lua, but no .lua or .luau files were selected.','Choose the project folder or change the project type.', '',0,'Lua'); return; }
    let imports = 0;
    luaFiles.forEach((file) => {
      const text = file.text || '';
      for (const ref of quotedReferences(text, /\b(?:require|dofile|loadfile)\s*\(\s*['"]([^'"]+)['"]/g)) {
        imports += 1;
        const candidates = [ref.value, `${ref.value}.lua`, `${ref.value.replaceAll('.','/')}.lua`, `${ref.value.replaceAll('.','/')}/init.lua`];
        if (!candidates.some(hasFile)) add('warning','Lua dependency may be missing',`The file imports “${ref.value}”, but no matching local Lua file was found.`,'Check the module path, package name, or external dependency before running the resource.',file.path,ref.line,'Lua');
      }
      if (/\bos\.execute\s*\(/.test(text)) add('warning','Shell execution is present','This file can execute operating-system commands.','Review the input carefully and avoid passing user-controlled values into os.execute.',file.path,0,'Safety');
      const todo = text.match(/\b(TODO|FIXME)\b/i); if (todo) add('info','Unfinished marker found','This file contains a TODO or FIXME marker.','Resolve it or document why it is safe to leave before release.',file.path,lineAt(text,todo.index || 0),'Lua');
    });
    add('good','Lua source files inspected',`${luaFiles.length} Lua file${luaFiles.length === 1 ? '' : 's'} and ${imports} local import${imports === 1 ? '' : 's'} checked.`,'','','','Lua');
  }

  function checkPackage() {
    const packageFile = fileByPath('package.json');
    if (!packageFile) { add('warning','package.json is missing','JavaScript or TypeScript files were found without a package manifest.','Add package.json with scripts, runtime dependencies, and the project entry point.','','','JavaScript'); return; }
    let packageData;
    try { packageData = JSON.parse(packageFile.text); add('good','package.json is valid','The package manifest parses as JSON.','',packageFile.path,0,'JavaScript'); } catch (error) { const message = String(error.message || error).replace(/^Unexpected token /,'Unexpected token '); add('error','package.json is invalid',message,'Fix the JSON syntax before running npm, pnpm, or yarn.',packageFile.path,0,'JavaScript'); return; }
    if (!packageData.scripts || Object.keys(packageData.scripts).length === 0) add('warning','No package scripts are declared','There is no documented install, build, test, or start command.','Add scripts so another developer can run the project without guessing.',packageFile.path,0,'JavaScript');
    const lock = ['package-lock.json','pnpm-lock.yaml','yarn.lock'].find(hasFile); if (!lock) add('info','Dependency lockfile is missing','Installs may resolve different versions on different machines.','Commit the lockfile that matches your package manager when reproducible installs matter.',packageFile.path,0,'JavaScript');
    const sourceFiles = filesWithExt('js','jsx','ts','tsx'); let refs = 0;
    sourceFiles.forEach((file) => {
      for (const ref of quotedReferences(file.text || '', /(?:import[^'"`]*from|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)) {
        if (!ref.value.startsWith('.')) continue; refs += 1;
        const candidates = [ref.value, `${ref.value}.js`,`${ref.value}.jsx`,`${ref.value}.ts`,`${ref.value}.tsx`,`${ref.value}/index.js`,`${ref.value}/index.ts`];
        if (!candidates.some((candidate) => hasFile(candidate))) add('warning','Local import may be broken',`“${ref.value}” does not resolve to a selected source file.`,'Check the relative path and filename casing.',file.path,ref.line,'JavaScript');
      }
    });
    add('info','JavaScript references inspected',`${sourceFiles.length} source file${sourceFiles.length === 1 ? '' : 's'} and ${refs} relative import${refs === 1 ? '' : 's'} checked.`,'','','','JavaScript');
  }

  function checkPython() {
    const py = filesWithExt('py'); if (!py.length) { add('error','No Python files found','This project was checked as Python, but no .py files were selected.','Choose the project folder or change the project type.','','','Python'); return; }
    const manifest = ['pyproject.toml','setup.py','requirements.txt','Pipfile'].find(hasFile);
    if (manifest) add('good','Python dependency file found',manifest,'Keep dependencies pinned or constrained and document the supported Python version.',manifest,0,'Python');
    else add('warning','Python dependency file is missing','Imports may work on one machine and fail on another.','Add pyproject.toml or requirements.txt and document the supported Python version.','','','Python');
    py.forEach((file) => { const match = (file.text || '').match(/if\s+__name__\s*==\s*["']__main__["']/); if (file.path.endsWith('/main.py') && !match) add('info','main.py has no direct entry guard','Running imports can execute the file immediately.','Use an if __name__ == "__main__" guard if this file is both imported and run directly.',file.path,0,'Python'); });
    add('good','Python source files inspected',`${py.length} Python file${py.length === 1 ? '' : 's'} loaded for static checks.`,'The browser cannot replace Python’s compiler; run the project’s own test or type-check command as well.','','','Python');
  }

  function checkJava() {
    const java = filesWithExt('java'); const build = ['pom.xml','build.gradle','build.gradle.kts'].find(hasFile);
    if (!build) add('warning','Java build file is missing','Java source was found without Maven or Gradle metadata.','Add pom.xml or build.gradle so dependencies and build commands are reproducible.','','','Java'); else add('good','Java build file found',build,'Confirm the declared Java version matches the runtime used by contributors.',build,0,'Java');
    if (!java.length) add('error','No Java source files found','This project was checked as Java, but no .java files were selected.','Choose the project folder or change the project type.','','','Java');
    java.forEach((file) => { const classMatch = (file.text || '').match(/\b(?:public\s+)?(?:final\s+)?class\s+([A-Za-z_$][\w$]*)/); if (classMatch && classMatch[1] !== file.path.split('/').pop().replace(/\.java$/i,'')) add('warning','Java filename and class name differ',`The class “${classMatch[1]}” is in ${basename(file.path)}.`,'Rename the file or class so Java tooling can resolve it cleanly.',file.path,0,'Java'); });
    add('good','Java source files inspected',`${java.length} Java file${java.length === 1 ? '' : 's'} loaded for structure checks.`,'','','','Java');
  }

  function checkSQL() {
    const sql = filesWithExt('sql'); if (!sql.length) { add('error','No SQL files found','This project was checked as SQL, but no .sql files were selected.','Choose the project folder or change the project type.','','','SQL'); return; }
    sql.forEach((file) => { const text = file.text || ''; const opens = (text.match(/[\(\[\{]/g)||[]).length; const closes = (text.match(/[\)\]\}]/g)||[]).length; if (opens !== closes) add('error','Delimiter count does not match',`The file contains ${opens} opening and ${closes} closing delimiters.`,'Check the query around the first unmatched bracket.',file.path,0,'SQL'); if (/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i.test(text)) add('warning','Destructive SQL detected','This file contains DROP statements.','Confirm the migration is intentional and back up production data before running it.',file.path,0,'SQL'); if (/SELECT\s+\*/i.test(text)) add('info','SELECT * is used','Selecting every column can make queries fragile as schemas change.','List the columns needed by the application when practical.',file.path,0,'SQL'); });
    add('good','SQL files inspected',`${sql.length} SQL file${sql.length === 1 ? '' : 's'} checked for common structural and migration risks.`,'','','','SQL');
  }

  function checkNUI() {
    const html = filesWithExt('html','htm'); const css = filesWithExt('css','scss'); const scripts = filesWithExt('js','ts');
    if (!html.length) add('error','NUI entry HTML is missing','No HTML document was selected for the NUI interface.','Add the page named by ui_page in fxmanifest.lua.', '',0,'NUI');
    html.forEach((file) => { for (const ref of quotedReferences(file.text || '', /(?:src|href)\s*=\s*['"]([^'"#]+)['"]/gi)) { if (/^(https?:|data:|mailto:|#)/i.test(ref.value)) continue; if (!hasFile(ref.value)) add('warning','NUI asset may be missing',`The page references “${ref.value}”, but it was not found in the project.`,'Check the relative path and filename casing.',file.path,ref.line,'NUI'); } });
    if (!css.length) add('info','No CSS files found','The interface may use inline styles or a framework.','Add a stylesheet if the UI is becoming difficult to maintain.','','','NUI');
    if (!scripts.length) add('warning','No NUI script found','The interface has no JavaScript or TypeScript file selected.','Confirm the UI can receive messages and send callbacks to the game.', '',0,'NUI');
    add('good','NUI assets inspected',`${html.length} HTML, ${css.length} style, and ${scripts.length} script file${scripts.length === 1 ? '' : 's'} checked.`,'','','','NUI');
  }

  function checkMinecraft() {
    const properties = fileByPath('server.properties'); const plugin = fileByPath('plugin.yml'); const fabric = fileByPath('fabric.mod.json'); const mcmeta = state.files.find((file) => basename(file.path) === 'pack.mcmeta');
    if (properties) { add('good','server.properties found','The server configuration file is present.','Keep secrets and operational overrides outside public repositories.',properties.path,0,'Minecraft'); if (/^server-port\s*=\s*25565\s*$/mi.test(properties.text || '')) add('info','Default server port is configured','The project uses the default Minecraft port 25565.','Change it only if your hosting/network layout requires another port.',properties.path,0,'Minecraft'); }
    if (plugin) { const text = plugin.text || ''; if (!/^name\s*:/mi.test(text)) add('error','plugin.yml name is missing','Bukkit/Paper plugins need a name in plugin.yml.','Add name, version, and main before loading the plugin.',plugin.path,0,'Minecraft'); if (!/^main\s*:/mi.test(text)) add('error','plugin.yml main class is missing','The server cannot know which Java class to load.','Add the fully qualified main class and ensure the class exists.',plugin.path,0,'Minecraft'); else add('good','plugin.yml has a main entry','The plugin manifest declares a main class.','Confirm the package and class name match the Java source.',plugin.path,0,'Minecraft'); }
    if (fabric) add('good','Fabric mod metadata found','fabric.mod.json is present.','Confirm the declared entrypoints and dependency versions match the target loader.',fabric.path,0,'Minecraft');
    if (mcmeta) add('good','Datapack metadata found','pack.mcmeta is present.','Confirm the pack format matches the Minecraft version you target.',mcmeta.path,0,'Minecraft');
    if (!properties && !plugin && !fabric && !mcmeta) add('warning','Minecraft entry metadata is missing','No server.properties, plugin.yml, fabric.mod.json, or pack.mcmeta was found.','Choose the correct project type or include the relevant server/plugin/mod files.','','','Minecraft');
  }

  function checkRuneLite() {
    const properties = fileByPath('runelite-plugin.properties'); const java = filesWithExt('java'); const build = ['pom.xml','build.gradle','build.gradle.kts'].find(hasFile);
    if (!properties) add('error','RuneLite plugin metadata is missing','runelite-plugin.properties was not found.','Add the plugin metadata with displayName, author, description, and plugin class information.','','','RuneLite'); else { const text = properties.text || ''; ['displayName','author','description'].forEach((key) => { if (!new RegExp(`^${key}\\s*=`, 'mi').test(text)) add('warning',`RuneLite metadata is missing ${key}`,`The plugin properties do not declare ${key}.`,'Add the field so the plugin can be identified and reviewed.',properties.path,0,'RuneLite'); }); }
    if (!build) add('warning','RuneLite build file is missing','No Maven or Gradle build file was found.','Add the project build configuration so contributors can compile it consistently.','','','RuneLite');
    const pluginClass = java.find((file) => /@Plugin\b/.test(file.text || '')); if (!pluginClass) add('warning','No RuneLite @Plugin class found','No Java file contains the RuneLite plugin annotation.','Confirm the plugin class is included and annotated with @Plugin.', '',0,'RuneLite'); else add('good','RuneLite plugin class found',pluginClass.path,'Confirm its config, subscriptions, and injected services are wired correctly.',pluginClass.path,0,'RuneLite');
  }

  function loadConfig() {
    const configFile = state.files.find((file) => basename(file.path) === '.gankbyte-validator.json');
    state.config = {}; state.configError = '';
    if (!configFile || !configFile.text) return;
    try {
      state.config = JSON.parse(configFile.text) || {};
      if (typeof state.config !== 'object' || Array.isArray(state.config)) state.config = {};
    } catch (_) { state.configError = configFile.path; }
  }

  function applyConfig() {
    const ignoredPaths = Array.isArray(state.config.ignore) ? state.config.ignore : [];
    state.files.forEach((file) => { file.ignored = file.path !== '.gankbyte-validator.json' && configMatch(file.path, ignoredPaths); });
    if (state.config.type && $('project-type').value === 'auto' && TYPE_LABELS[state.config.type]) {
      state.type = state.config.type;
      $('project-type').value = state.config.type;
    }
  }

  function applyConfiguredFindingIgnores() {
    const configured = Array.isArray(state.config.ignoreFindings) ? state.config.ignoreFindings : [];
    configured.forEach((entry) => {
      const needle = String(entry).toLowerCase();
      state.findings.forEach((finding) => {
        if (finding.id === needle || finding.title.toLowerCase().includes(needle) || `${finding.path}:${finding.line}`.toLowerCase() === needle) state.ignored.add(finding.id);
      });
    });
  }

  function collectReferences() {
    const references = [];
    const addReference = (source, target, line) => {
      const clean = cleanPath(target);
      if (!clean || clean.startsWith('@') || /^(https?:|data:|mailto:|#)/i.test(clean)) return;
      const found = hasReference(clean);
      if (!references.some((item) => item.source === source && item.target === clean && item.line === line)) references.push({ source, target: clean, line, found });
    };
    activeFiles().forEach((file) => {
      const text = file.text || '';
      const extension = ext(file.path);
      if (['lua','luau'].includes(extension)) quotedReferences(text, /\b(?:require|dofile|loadfile)\s*\(\s*['"]([^'"]+)['"]/g).forEach((ref) => addReference(file.path, ref.value, ref.line));
      if (['js','jsx','ts','tsx'].includes(extension)) quotedReferences(text, /(?:import[^'"`]*from|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g).forEach((ref) => { if (ref.value.startsWith('.')) addReference(file.path, ref.value, ref.line); });
      if (['html','htm'].includes(extension)) quotedReferences(text, /(?:src|href)\s*=\s*['"]([^'"#]+)['"]/gi).forEach((ref) => addReference(file.path, ref.value, ref.line));
    });
    const manifest = activeFiles().find((file) => /(^|\/)fxmanifest\.lua$|(^|\/)__resource\.lua$/i.test(file.path));
    if (manifest) quotedReferences(manifest.text || '', /['"]([^'"]+)['"]/g).filter((ref) => /\.(lua|js|ts|css|html?|json|meta|ytyp|ymap|ybn|ydr|ydd|ytd|ymf|png|jpg|jpeg|webp)$/i.test(ref.value) && !/^https?:/i.test(ref.value)).forEach((ref) => addReference(manifest.path, ref.value, ref.line));
    state.references = references;
  }

  function evidenceFor(finding) {
    if (!finding.path || !finding.line) return '';
    const file = activeFiles().find((item) => item.path === finding.path);
    if (!file || !file.text) return '';
    const lines = file.text.split(/\r?\n/);
    const start = Math.max(1, finding.line - 2);
    const end = Math.min(lines.length, finding.line + 2);
    return lines.slice(start - 1, end).map((text, index) => {
      const number = start + index;
      const target = number === finding.line ? ' target' : '';
      return `<span class="evidence-line${target}"><span class="evidence-line-number">${number}</span>${escapeHtml(text || ' ')}</span>`;
    }).join('');
  }

  function isIgnored(finding) { return state.ignored.has(finding.id); }
  function toggleIgnore(id) { if (state.ignored.has(id)) state.ignored.delete(id); else state.ignored.add(id); render(); }

  function snapshot() {
    return { type: state.detected, findings: state.findings.map((finding) => ({ id:finding.id, severity:finding.severity, title:finding.title, path:finding.path, line:finding.line })) };
  }

  function renderComparison() {
    if (!state.baseline) { $('comparison-card').hidden = true; return; }
    const before = new Map(state.baseline.findings.map((finding) => [finding.id, finding]));
    const after = new Map(state.findings.map((finding) => [finding.id, finding]));
    const fixed = [...before.values()].filter((finding) => !after.has(finding.id));
    const added = [...after.values()].filter((finding) => !before.has(finding.id));
    const changed = [...after.values()].filter((finding) => before.has(finding.id) && before.get(finding.id).severity !== finding.severity);
    const rows = [...fixed.map((finding) => `<div class="fixed">Fixed: ${escapeHtml(finding.title)}${finding.path ? ` — ${escapeHtml(location(finding.path,finding.line))}` : ''}</div>`), ...added.map((finding) => `<div class="added">New: ${escapeHtml(finding.title)}${finding.path ? ` — ${escapeHtml(location(finding.path,finding.line))}` : ''}</div>`), ...changed.map((finding) => `<div>Changed: ${escapeHtml(finding.title)} (${escapeHtml(before.get(finding.id).severity)} → ${escapeHtml(finding.severity)})</div>`)].join('');
    $('comparison-card').hidden = false;
    $('comparison-output').innerHTML = `<p>${fixed.length} fixed, ${added.length} new, ${changed.length} changed since the saved baseline.</p>${rows ? `<div class="comparison-list">${rows}</div>` : '<p>No finding changes detected.</p>'}`;
  }

  function scan() {
    state.findings = []; state.detected = detectType();
    checkGeneral();
    const checks = { fivem:checkFiveM, lua:checkLua, python:checkPython, javascript:checkPackage, java:checkJava, sql:checkSQL, nui:checkNUI, minecraft:checkMinecraft, runelite:checkRuneLite };
    if (checks[state.detected]) checks[state.detected]();
    else add('info','Project type needs a closer look','The files do not match a known project profile, so only general safety and documentation checks ran.','Choose a project type manually to apply targeted rules.','','','General');
    collectReferences();
    applyConfiguredFindingIgnores();
    render();
  }

  function findingVisible(finding) {
    const query = $('finding-search').value.trim().toLowerCase();
    const text = `${finding.title} ${finding.detail} ${finding.fix} ${finding.path} ${finding.group}`.toLowerCase();
    const filterMatch = state.filter === 'all' ? !isIgnored(finding) : state.filter === 'ignored' ? isIgnored(finding) : finding.severity === state.filter && !isIgnored(finding);
    return filterMatch && (!query || text.includes(query));
  }
  function render() {
    const errors = state.findings.filter((finding) => finding.severity === 'error' && !isIgnored(finding)).length;
    const warnings = state.findings.filter((finding) => finding.severity === 'warning' && !isIgnored(finding)).length;
    const types = [...new Set(state.files.map((file) => ext(file.path) || 'other'))].length;
    const ignored = state.findings.filter(isIgnored).length;
    $('summary').hidden = false; $('summary').innerHTML = [['Files',state.files.filter((file) => !file.ignored).length],['File types',types],['Errors',errors],['Warnings',warnings],['Ignored',ignored]].map(([label,value]) => `<div class="summary-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
    $('validator-toolbar').hidden = false; $('report-area').hidden = false; $('file-card').hidden = false; $('report-title').textContent = state.files[0]?.path.split('/')[0] || 'Project report'; $('detected-type').textContent = TYPE_LABELS[state.detected] || TYPE_LABELS.unknown;
    const visible = state.findings.filter(findingVisible);
    $('checks').innerHTML = visible.length ? visible.map((finding) => {
      const symbol = finding.severity === 'good' ? '&#10003;' : finding.severity === 'error' ? '!' : finding.severity === 'warning' ? '?' : 'i';
      const evidence = evidenceFor(finding);
      const ignoreLabel = isIgnored(finding) ? 'Restore finding' : 'Ignore finding';
      return `<article class="check ${finding.severity}"><span class="check-icon">${symbol}</span><div><h3>${escapeHtml(finding.title)}</h3><p>${escapeHtml(finding.detail)}</p><div class="finding-meta"><span>${escapeHtml(finding.group)}</span><span class="finding-confidence">Confidence ${finding.confidence}%</span>${finding.path ? `<span>${escapeHtml(location(finding.path,finding.line))}</span>` : ''}</div>${finding.fix ? `<div class="finding-fix"><strong>Next step:</strong> ${escapeHtml(finding.fix)}</div>` : ''}${evidence ? `<details><summary class="finding-action">Show source evidence</summary><pre class="finding-evidence">${evidence}</pre></details>` : '<div class="finding-meta"><span>No source line available — project-level check.</span></div>'}<div class="finding-actions"><button class="finding-action" type="button" data-ignore-id="${escapeHtml(finding.id)}">${ignoreLabel}</button></div></div></article>`;
    }).join('') : '<p class="file-empty">No findings match this filter.</p>';
    $('checks').querySelectorAll('[data-ignore-id]').forEach((button) => button.addEventListener('click', () => toggleIgnore(button.dataset.ignoreId)));
    const counts = {}; state.files.forEach((file) => { const key = ext(file.path) || 'other'; counts[key] = (counts[key] || 0) + 1; }); $('inventory').innerHTML = Object.entries(counts).sort().map(([key,value]) => `<div class="inventory-row"><span>.${escapeHtml(key)}</span><strong>${value}</strong></div>`).join('') || '<p class="file-empty">No files found.</p>'; renderFiles(); renderDependencies(); renderComparison();
  }
  function renderFiles() { const query = $('file-filter').value.trim().toLowerCase(); $('file-map').innerHTML = state.files.filter((file) => !query || file.path.toLowerCase().includes(query)).map((file) => { const e = ext(file.path); const classes = [/fxmanifest|__resource|package\.json|pom\.xml|build\.gradle|plugin\.yml|server\.properties|runelite-plugin/.test(file.path) ? 'manifest' : '', /(^|\/)(\.env|id_rsa|.*\.(pem|key|p12|pfx))$/i.test(file.path) ? 'secret' : '', BINARY_EXT.has(e) ? 'binary' : '', file.ignored ? 'ignored' : ''].filter(Boolean).join(' '); return `<div class="file-entry ${classes}" title="${escapeHtml(file.path)}">${escapeHtml(file.path)} <small>${file.ignored ? 'ignored' : BINARY_EXT.has(e) ? 'binary' : 'text'}</small></div>`; }).join('') || '<p class="file-empty">No matching files.</p>'; }

  function renderDependencies() {
    $('dependency-card').hidden = false;
    $('dependency-count').textContent = `${state.references.length} link${state.references.length === 1 ? '' : 's'}`;
    $('dependency-map').innerHTML = state.references.length ? state.references.map((reference) => `<div class="dependency-row ${reference.found ? '' : 'missing'}"><span class="dependency-path" title="${escapeHtml(reference.source)}">${escapeHtml(reference.source)}${reference.line ? `:${reference.line}` : ''}</span><span class="dependency-arrow">${reference.found ? '&rarr;' : '&times;'}</span><span class="dependency-path" title="${escapeHtml(reference.target)}">${escapeHtml(reference.target)}${reference.found ? '' : ' (missing)'}</span></div>`).join('') : '<p class="file-empty">No local references were detected in the selected files.</p>';
  }

  function reportText() { return [`GANKBYTE PROJECT VALIDATOR`,`Project: ${state.files[0]?.path.split('/')[0] || 'Unknown'}`,`Type: ${TYPE_LABELS[state.detected] || TYPE_LABELS.unknown}`,`Generated: ${new Date().toISOString()}`,'',...state.findings.map((finding, index) => `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title} (confidence ${finding.confidence}%)${isIgnored(finding) ? ' [IGNORED]' : ''}\n   ${finding.detail}${finding.path ? `\n   Location: ${location(finding.path,finding.line)}` : ''}${finding.fix ? `\n   Next step: ${finding.fix}` : ''}`)].join('\n'); }
  function reportMarkdown() { return [`# GankByte Project Validator`,``,`- Project: ${state.files[0]?.path.split('/')[0] || 'Unknown'}`,`- Type: ${TYPE_LABELS[state.detected] || TYPE_LABELS.unknown}`,`- Generated: ${new Date().toISOString()}`,'',`## Findings`,'',...state.findings.map((finding) => `- **${finding.severity.toUpperCase()}** ${finding.title} _(confidence ${finding.confidence}%)_${isIgnored(finding) ? ' **ignored**' : ''}  \n  ${finding.detail}${finding.path ? `  \n  Location: \`${location(finding.path,finding.line)}\`` : ''}${finding.fix ? `  \n  Next step: ${finding.fix}` : ''}`), '', '## Dependency map', '', ...state.references.map((reference) => `- \`${reference.source}:${reference.line}\` ${reference.found ? '→' : '✕'} \`${reference.target}\``)].join('\n'); }
  function reportHtml() { const body = state.findings.map((finding) => `<article><h3>${escapeHtml(finding.title)}</h3><p><strong>${escapeHtml(finding.severity.toUpperCase())}</strong> · confidence ${finding.confidence}%${isIgnored(finding) ? ' · ignored' : ''}</p><p>${escapeHtml(finding.detail)}</p>${finding.path ? `<p>Location: <code>${escapeHtml(location(finding.path,finding.line))}</code></p>` : ''}${finding.fix ? `<p><strong>Next step:</strong> ${escapeHtml(finding.fix)}</p>` : ''}</article>`).join(''); return `<!doctype html><html><head><meta charset="utf-8"><title>GankByte Project Report</title><style>body{background:#0a0b0f;color:#e9ebef;font:15px system-ui;max-width:900px;margin:40px auto;padding:0 20px}h1{color:#b7ff3c}article{border:1px solid #2a2d34;margin:10px 0;padding:14px}p{color:#a4a8b0;line-height:1.5}code{color:#b7ff3c}</style></head><body><h1>GankByte Project Validator</h1><p>${escapeHtml(TYPE_LABELS[state.detected] || TYPE_LABELS.unknown)} · ${escapeHtml(state.files[0]?.path.split('/')[0] || 'Unknown')}</p>${body}</body></html>`; }
  function downloadFile(name, content, type = 'text/plain') { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
  function starterFiles() {
    const project = state.files[0]?.path.split('/')[0] || 'GankByte project';
    const label = TYPE_LABELS[state.detected] || 'developer project';
    const readme = `# ${project}\n\n${label} built with GankByte.\n\n## Requirements\n\nDocument the runtime, dependencies, and supported versions here.\n\n## Setup\n\n1. Install the required dependencies.\n2. Copy and configure any example configuration files.\n3. Start the project using the command documented below.\n\n## Usage\n\nDocument commands, exports, events, endpoints, or controls.\n\n## License\n\nAdd the project license before distribution.\n`;
    const ignores = { fivem:'*.log\n.env\nnode_modules/\n', lua:'*.log\n.env\n', python:'__pycache__/\n*.pyc\n.env\n.venv/\n', javascript:'node_modules/\ndist/\n.env\n', java:'target/\n.gradle/\n*.class\n', sql:'.env\n*.dump\n', nui:'node_modules/\ndist/\n', minecraft:'logs/\ncrash-reports/\n*.jar\n', runelite:'build/\n.gradle/\n' }[state.detected] || '.env\n*.log\n';
    downloadFile('README.gankbyte-template.md', readme);
    downloadFile('.gitignore.gankbyte-template', ignores);
    if (state.detected === 'fivem' && !hasFile('fxmanifest.lua')) downloadFile('fxmanifest.gankbyte-template.lua', `fx_version 'cerulean'\ngame 'gta5'\n\nauthor 'Your name'\ndescription 'Describe the resource'\nversion '1.0.0'\n\nclient_scripts { 'client/*.lua' }\nserver_scripts { 'server/*.lua' }\nshared_scripts { 'shared/*.lua' }\n`);
    setStatus('Starter templates downloaded. They are suggestions only and never modify your source files.');
  }
  function configExample() { downloadFile('.gankbyte-validator.example.json', JSON.stringify({ type:state.detected === 'unknown' ? 'auto' : state.detected, ignore:['vendor/**','tests/fixtures/**'], ignoreFindings:[] }, null, 2) + '\n', 'application/json'); }
  async function load(fileList) { state.files = []; state.ignored.clear(); const list = [...fileList].sort((a,b) => pathOf(a).localeCompare(pathOf(b))); for (const file of list) { const path = pathOf(file); const extension = ext(path); let text = ''; if (file.size <= 4 * 1024 * 1024 && (TEXT_EXT.has(extension) || !BINARY_EXT.has(extension))) { try { text = await file.text(); } catch (_) { text = ''; } } state.files.push({ path, text, size:file.size, ignored:false }); } loadConfig(); applyConfig(); state.type = $('project-type').value; setStatus(`${activeFiles().length} of ${state.files.length} files loaded. Applying relevant checks locally...`); scan(); setStatus(`Scan complete. ${state.findings.filter((finding) => finding.severity === 'error' && !isIgnored(finding)).length} error${state.findings.filter((finding) => finding.severity === 'error' && !isIgnored(finding)).length === 1 ? '' : 's'}, ${state.findings.filter((finding) => finding.severity === 'warning' && !isIgnored(finding)).length} warning${state.findings.filter((finding) => finding.severity === 'warning' && !isIgnored(finding)).length === 1 ? '' : 's'}. Nothing was uploaded.`); }

  $('choose-project').addEventListener('click', () => $('project-folder').click()); $('choose-files').addEventListener('click', () => $('project-files').click()); $('project-folder').addEventListener('change', (event) => load(event.target.files)); $('project-files').addEventListener('change', (event) => load(event.target.files)); $('project-type').addEventListener('change', () => { if (state.files.length) { state.type = $('project-type').value; scan(); } }); $('finding-search').addEventListener('input', render); $('file-filter').addEventListener('input', renderFiles);
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { state.filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button)); render(); }));
  $('copy-report').addEventListener('click', async () => { try { await navigator.clipboard.writeText(reportText()); $('copy-report').textContent = 'Copied'; setTimeout(() => { $('copy-report').textContent = 'Copy report'; }, 1400); } catch (_) { setStatus('Copy was blocked by the browser. Use Download JSON instead.', true); } });
  $('download-report').addEventListener('click', () => { const report = { tool:'GankByte Universal Project Validator', project:state.files[0]?.path.split('/')[0] || null, type:state.detected, generatedAt:new Date().toISOString(), config:state.config, files:state.files.map((file) => ({ path:file.path, size:file.size, ignored:Boolean(file.ignored) })), findings:state.findings.map((finding) => ({ ...finding, ignored:isIgnored(finding) })), references:state.references }; downloadFile('gankbyte-project-report.json', JSON.stringify(report,null,2), 'application/json'); });
  $('download-markdown').addEventListener('click', () => downloadFile('gankbyte-project-report.md', reportMarkdown(), 'text/markdown'));
  $('download-html').addEventListener('click', () => downloadFile('gankbyte-project-report.html', reportHtml(), 'text/html'));
  $('save-baseline').addEventListener('click', () => { state.baseline = snapshot(); $('compare-baseline').hidden = false; renderComparison(); setStatus('Baseline saved. Make changes, scan again, then compare to see what moved.'); });
  $('compare-baseline').addEventListener('click', () => { renderComparison(); $('comparison-card').scrollIntoView({ behavior:'smooth', block:'start' }); });
  $('clear-baseline').addEventListener('click', () => { state.baseline = null; $('compare-baseline').hidden = true; $('comparison-card').hidden = true; setStatus('Saved baseline cleared.'); });
  $('download-starters').addEventListener('click', starterFiles);
  $('download-config').addEventListener('click', configExample);
})();
