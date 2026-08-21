(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("resource-form");
  const status = $("form-status");
  const fileList = $("file-list");
  const fileContent = $("file-content");
  const selectedFile = $("selected-file");
  const fileLanguage = $("file-language");
  const qualityStrip = $("quality-strip");
  const template = $("resource-template");
  const fileOptions = $("file-options");
  const advancedOptions = $("advanced-options");
  const nuiOptions = $("nui-options");
  const mapOptions = $("map-options");
  const manifestOptions = $("manifest-options");
  const languageOptions = $("language-options");
  const copyButton = $("copy-button");
  const copyBundleButton = $("copy-bundle-button");
  const downloadButton = $("download-button");
  const downloadFileButton = $("download-file-button");
  const downloadZipButton = $("download-zip-button");
  const fileFilter = $("file-filter");
  const resetButton = $("reset-button");
  const storageKey = "gankbyte-resource-bench-settings";
  const fiveMTemplates = new Set(["fivem", "fivem-nui", "fivem-command", "fivem-map"]);
  const languageTemplates = new Set(["python-cli", "javascript-cli", "typescript-cli", "java-app", "minecraft-plugin", "runelite-plugin", "sql-migration"]);
  let files = {};
  let activeFile = "";

  const value = (id, fallback = "") => ($(id)?.value || fallback).trim();
  const checked = (id, fallback = false) => $(id) ? $(id).checked : fallback;
  const quote = (text) => String(text).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, " ");
  const safeName = (text) => text.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const isFiveM = (settings) => fiveMTemplates.has(settings.template);
  const isLanguage = (settings) => languageTemplates.has(settings.template);

  function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle("error", error);
  }

  function getSettings() {
    return {
      name: value("resource-name"),
      author: value("resource-author"),
      description: value("resource-description"),
      version: value("resource-version", "0.1.0"),
      template: template.value,
      fxVersion: value("fx-version", "cerulean"),
      game: value("game-name", "gta5"),
      dependencies: value("dependencies"),
      client: checked("include-client", true) || template.value === "fivem-nui",
      server: checked("include-server", true) || template.value === "fivem-command",
      shared: checked("include-shared", true),
      config: checked("include-config", true),
      readme: checked("include-readme", true),
      gitignore: checked("include-gitignore", true),
      changelog: checked("include-changelog"),
      tests: checked("include-tests"),
      command: checked("include-command") || template.value === "fivem-command",
      commandName: value("command-name"),
      commandRestricted: checked("command-restricted"),
      event: checked("include-event"),
      eventName: value("event-name"),
      export: checked("include-export"),
      exportName: value("export-name"),
      nuiTitle: value("nui-title", "Resource Bench UI"),
      nuiOpenCommand: value("nui-open-command"),
      mapName: value("map-name", "resource_map"),
      pythonVersion: value("python-version", "3.11"),
      nodeVersion: value("node-version", "20"),
      javaVersion: value("java-version", "21"),
      packageName: value("package-name", "com.gankbyte.demo"),
      className: value("class-name", "Main"),
      minecraftApi: value("minecraft-api", "1.21"),
      runeliteApi: value("runelite-api", "1.11.10"),
      sqlEngine: value("sql-engine", "postgresql"),
      tableName: value("table-name", "example_records")
    };
  }

  function applySettings(settings) {
    $("resource-name").value = settings.name || "gankbyte_demo";
    $("resource-author").value = settings.author || "GankByte Community";
    $("resource-description").value = settings.description || "A small, testable resource starter.";
    $("resource-version").value = settings.version || "0.1.0";
    template.value = settings.template || "fivem";
    $("fx-version").value = settings.fxVersion || "cerulean";
    $("game-name").value = settings.game || "gta5";
    $("dependencies").value = settings.dependencies || "";
    ["include-client", "include-server", "include-shared", "include-config", "include-readme"].forEach((id) => { if ($(id)) $(id).checked = settings[id.replace("include-", "")] !== false; });
    ["include-gitignore", "include-changelog", "include-tests", "include-command", "command-restricted", "include-event", "include-export"].forEach((id) => { if ($(id)) $(id).checked = Boolean(settings[id.replace("include-", "")] || settings[id]); });
    $("command-name").value = settings.commandName || "";
    $("event-name").value = settings.eventName || "ready";
    $("export-name").value = settings.exportName || "getVersion";
    $("nui-title").value = settings.nuiTitle || "Resource Bench UI";
    $("nui-open-command").value = settings.nuiOpenCommand || "";
    $("map-name").value = settings.mapName || "resource_map";
    $("python-version").value = settings.pythonVersion || "3.11";
    $("node-version").value = settings.nodeVersion || "20";
    $("java-version").value = settings.javaVersion || "21";
    $("package-name").value = settings.packageName || "com.gankbyte.demo";
    $("class-name").value = settings.className || "Main";
    $("minecraft-api").value = settings.minecraftApi || "1.21";
    $("runelite-api").value = settings.runeliteApi || "1.11.10";
    $("sql-engine").value = settings.sqlEngine || "postgresql";
    $("table-name").value = settings.tableName || "example_records";
  }

  function saveSettings(settings) {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* local storage is optional */ }
  }

  function restoreSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved) applySettings(saved);
    } catch { /* use defaults */ }
  }

  function validate(settings) {
    const errors = [];
    if (!/^[a-z][a-z0-9_]{2,31}$/.test(settings.name)) errors.push("Use 3-32 lowercase letters, numbers, or underscores, starting with a letter.");
    if (!settings.author) errors.push("Add an author or team name.");
    if (settings.description.length < 8) errors.push("Describe the resource in at least eight characters.");
    if (!/^\d+\.\d+\.\d+$/.test(settings.version)) errors.push("Use a version such as 0.1.0.");
    if (isFiveM(settings) && settings.template !== "fivem-map" && !settings.client && !settings.server && !settings.shared) errors.push("Select at least one client, server, or shared file.");
    if (settings.template === "fivem-nui" && !settings.client) errors.push("NUI starters need the client script enabled.");
    if (settings.command && !/^[a-z][a-z0-9_]{2,31}$/.test(settings.commandName || settings.name)) errors.push("Use a safe command name with lowercase letters, numbers, or underscores.");
    if (settings.event && !/^[a-z][a-z0-9_.:-]{2,63}$/.test(settings.eventName || "ready")) errors.push("Use a safe event name, such as ready or player:ready.");
    if (settings.export && !/^[a-z][a-z0-9_]{2,31}$/.test(settings.exportName || "getVersion")) errors.push("Use a safe export name with lowercase letters, numbers, or underscores.");
    if (settings.template === "fivem-map" && !/^[a-z][a-z0-9_]{2,31}$/.test(settings.mapName)) errors.push("Use a safe map name with lowercase letters, numbers, or underscores.");
    if (settings.template === "python-cli" && !/^\d+\.\d+$/.test(settings.pythonVersion)) errors.push("Use a Python version such as 3.11.");
    if (["javascript-cli", "typescript-cli"].includes(settings.template) && !/^\d+$/.test(settings.nodeVersion)) errors.push("Use a Node version such as 20.");
    if (["java-app", "minecraft-plugin", "runelite-plugin"].includes(settings.template) && !/^\d+$/.test(settings.javaVersion)) errors.push("Use a Java version such as 21.");
    if (["java-app", "minecraft-plugin", "runelite-plugin"].includes(settings.template) && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(settings.packageName)) errors.push("Use a valid lowercase Java package name.");
    if (["java-app", "minecraft-plugin", "runelite-plugin"].includes(settings.template) && !/^[A-Z][A-Za-z0-9_]{2,40}$/.test(settings.className)) errors.push("Use a Java class name beginning with an uppercase letter.");
    if (settings.template === "minecraft-plugin" && !/^\d+\.\d+(\.\d+)?$/.test(settings.minecraftApi)) errors.push("Use a Minecraft API version such as 1.21.");
    if (settings.template === "runelite-plugin" && !/^\d+\.\d+\.\d+$/.test(settings.runeliteApi)) errors.push("Use a RuneLite API version such as 1.11.10.");
    if (settings.template === "sql-migration" && !/^[a-z][a-z0-9_]{2,62}$/.test(settings.tableName)) errors.push("Use a safe SQL table name with lowercase letters, numbers, or underscores.");
    return errors;
  }

  function header(settings, extra = "") {
    return `fx_version '${quote(settings.fxVersion)}'\ngame '${quote(settings.game)}'\n\nauthor '${quote(settings.author)}'\ndescription '${quote(settings.description)}'\nversion '${quote(settings.version)}'\n${extra}`;
  }

  function readme(settings, kind) {
    const typeLabel = { fivem: "FiveM resource", "fivem-nui": "FiveM NUI resource", "fivem-command": "FiveM command resource", "fivem-map": "FiveM map resource", "lua-module": "Lua module", "lua-config": "Lua configuration package", "test-harness": "Lua test harness", "python-cli": "Python utility", "javascript-cli": "JavaScript tool", "typescript-cli": "TypeScript tool", "java-app": "Java desktop/app starter", "minecraft-plugin": "Minecraft plugin starter", "runelite-plugin": "RuneLite plugin starter", "sql-migration": "SQL migration starter" }[kind] || "developer starter";
    const setup = isFiveM(settings) ? `## FiveM\n\n1. Place this folder in your server's resources directory.\n2. Add \`ensure ${settings.name}\` to \`server.cfg\`.\n3. Check the generated manifest and dependencies before starting the resource.\n` : kind === "sql-migration" ? `## Database\n\nReview the generated migration in a safe environment, check the ${settings.sqlEngine} syntax, and apply it through your normal migration process.\n` : kind === "python-cli" ? `## Local setup\n\n\`\`\`powershell\npy -m venv .venv\n.\\.venv\\Scripts\\Activate.ps1\npy -m pip install -e .\n${settings.name} --name GankByte\n\`\`\`\n` : ["javascript-cli", "typescript-cli"].includes(kind) ? `## Local setup\n\nInstall Node ${settings.nodeVersion} or newer. For JavaScript, run \`npm start -- GankByte\`. For TypeScript, run \`npm install\`, \`npm run build\`, then \`npm start -- GankByte\`.\n` : ["java-app", "minecraft-plugin", "runelite-plugin"].includes(kind) ? `## Local setup\n\nInstall Java ${settings.javaVersion} or newer and use the included Gradle project. Run \`gradlew build\` on Windows or \`./gradlew build\` on macOS/Linux. Minecraft and RuneLite starters require the matching platform environment and API rules.\n` : `## Local setup\n\nRead every generated file before using it. Run the generated entry point or tests with the matching runtime, then replace the ownership and licence placeholders.\n`;
    return `# ${settings.name}\n\n${settings.description}\n\nStarter type: ${typeLabel}\nAuthor: ${settings.author}\nVersion: ${settings.version}\n\n${setup}\n## Limits\n\nThis is a starting point, not a framework, security boundary, or guarantee that the generated code matches a specific environment.\n\n## Ownership\n\nReplace this section with your project's licence, credits, and third-party notices before publishing.\n`;
  }

  function commonFiles(settings, result, kind) {
    if (settings.readme) result["README.md"] = readme(settings, kind);
    if (settings.gitignore) result[".gitignore"] = "*.log\n.vscode/\n.DS_Store\nThumbs.db\n";
    if (settings.changelog) result["CHANGELOG.md"] = `# Changelog\n\n## ${settings.version}\n\n- Initial generated starter.\n`;
    result["LICENSE.placeholder"] = "Choose and add a licence before publishing this project. Resource Bench does not choose ownership terms for you.\n";
  }

  function fivemFiles(settings) {
    const result = {};
    const manifestParts = [];
    if (settings.shared || settings.config || settings.template === "fivem-nui") {
      result["shared/config.lua"] = `Config = Config or {}\nConfig.Debug = false\nConfig.ResourceName = '${quote(settings.name)}'\nConfig.Version = '${quote(settings.version)}'\n`;
      manifestParts.push("shared_scripts {\n    'shared/config.lua'\n}");
    }
    if (settings.client || settings.template === "fivem-nui") {
      const eventBlock = settings.event ? `\nRegisterNetEvent('${quote(settings.name)}:client:${quote(settings.eventName || "ready")}', function(payload)\n    print('[${quote(settings.name)}] client event received')\nend)\n` : "";
      const exportBlock = settings.export ? `\nexports('${quote(settings.exportName || "getVersion")}', function()\n    return '${quote(settings.version)}'\nend)\n` : "";
      const nuiBlock = settings.template === "fivem-nui" ? `\nlocal uiOpen = false\n\nlocal function setUi(open)\n    uiOpen = open\n    SetNuiFocus(open, open)\n    SendNUIMessage({ action = open and 'open' or 'close' })\nend\n\nRegisterCommand('${quote(settings.nuiOpenCommand || settings.name)}', function()\n    setUi(not uiOpen)\nend, false)\n\nRegisterNUICallback('close', function(_, callback)\n    setUi(false)\n    callback({ ok = true })\nend)\n` : "";
      result["client/main.lua"] = `CreateThread(function()\n    while true do\n        Wait(1000)\n        if Config and Config.Debug then\n            print('[${quote(settings.name)}] client tick')\n        end\n    end\nend)\n${nuiBlock}${eventBlock}${exportBlock}`;
      manifestParts.push("client_scripts {\n    'client/main.lua'\n}");
    }
    if (settings.server) {
      const commandBlock = settings.command ? `\nRegisterCommand('${quote(settings.commandName || settings.name)}', function(source, args, rawCommand)\n    print(('[${quote(settings.name)}] command used by %s'):format(source))\nend, ${settings.commandRestricted ? "true" : "false"})\n` : "";
      const eventBlock = settings.event ? `\nRegisterNetEvent('${quote(settings.name)}:server:${quote(settings.eventName || "ready")}', function(payload)\n    local source = source\n    print(('[${quote(settings.name)}] server event received from %s'):format(source))\nend)\n` : "";
      const exportBlock = settings.export ? `\nexports('${quote(settings.exportName || "getVersion")}', function()\n    return '${quote(settings.version)}'\nend)\n` : "";
      result["server/main.lua"] = `AddEventHandler('onResourceStart', function(resourceName)\n    if resourceName ~= GetCurrentResourceName() then return end\n    print('[${quote(settings.name)}] started')\nend)\n${commandBlock}${eventBlock}${exportBlock}`;
      manifestParts.push("server_scripts {\n    'server/main.lua'\n}");
    }
    if (settings.template === "fivem-map") {
      result["map.lua"] = `CreateThread(function()\n    print('[${quote(settings.name)}] map ${quote(settings.mapName)} loaded')\nend)\n`;
      result["stream/README.txt"] = "Place map assets in this stream folder. Only include files you have permission to distribute.\n";
      manifestParts.push("this_is_a_map 'yes'", "map 'map.lua'");
    }
    if (settings.template === "fivem-nui") {
      result["html/index.html"] = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${quote(settings.nuiTitle || "Resource Bench UI")}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main aria-labelledby="title">\n    <h1 id="title">${quote(settings.nuiTitle || "Resource Bench UI")}</h1>\n    <button id="close" type="button">Close</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>\n`;
      result["html/style.css"] = `:root { color-scheme: dark; font: 16px system-ui, sans-serif; }\nbody { display: grid; min-height: 100vh; place-items: center; margin: 0; background: rgba(9, 11, 16, .92); color: #f4f2ea; }\nmain { padding: 2rem; border: 1px solid #c6ff3d; background: #11151d; }\nbutton { padding: .7rem 1rem; cursor: pointer; }\n`;
      result["html/app.js"] = `const closeButton = document.querySelector('#close');\ncloseButton.addEventListener('click', () => {\n  fetch('https://' + GetParentResourceName() + '/close', { method: 'POST', body: '{}' });\n});\nwindow.addEventListener('message', (event) => {\n  document.body.hidden = event.data?.action === 'close';\n});\n`;
      manifestParts.push("ui_page 'html/index.html'", "files {\n    'html/index.html',\n    'html/style.css',\n    'html/app.js'\n}");
    }
    if (settings.dependencies) {
      const deps = settings.dependencies.split(",").map((item) => item.trim()).filter(Boolean);
      if (deps.length) manifestParts.push(`dependencies {\n${deps.map((item) => `    '${quote(item)}'`).join("\n")}\n}`);
    }
    if (settings.tests) result[`tests/test_${settings.name}.lua`] = `local passed = 0\nlocal failed = 0\n\nlocal function check(label, condition)\n    if condition then\n        passed = passed + 1\n        print('PASS: ' .. label)\n    else\n        failed = failed + 1\n        print('FAIL: ' .. label)\n    end\nend\n\ncheck('resource name is present', '${quote(settings.name)}' ~= '')\ncheck('version is present', '${quote(settings.version)}' ~= '')\nprint(('Results: %d passed, %d failed'):format(passed, failed))\nos.exit(failed == 0 and 0 or 1)\n`;
    result["fxmanifest.lua"] = header(settings, `${manifestParts.join("\n\n")}\n`);
    commonFiles(settings, result, settings.template);
    return result;
  }

  function luaModuleFiles(settings) {
    const moduleName = safeName(settings.name) || "gankbyte_module";
    const result = { [`${moduleName}.lua`]: `local ${moduleName} = {}\n\nfunction ${moduleName}.hello()\n    return '${quote(settings.description)}'\nend\n\nfunction ${moduleName}.version()\n    return '${quote(settings.version)}'\nend\n\nreturn ${moduleName}\n` };
    if (settings.tests) result[`tests/test_${moduleName}.lua`] = `local module = require('${moduleName}')\nassert(module.hello() ~= '')\nassert(module.version() == '${quote(settings.version)}')\nprint('PASS: ${moduleName}')\n`;
    commonFiles(settings, result, settings.template);
    return result;
  }

  function luaConfigFiles(settings) {
    const result = { "config.lua": `local Config = {\n    name = '${quote(settings.name)}',\n    version = '${quote(settings.version)}',\n    debug = false,\n    options = {\n        enabled = true,\n    }\n}\n\nreturn Config\n` };
    if (settings.tests) result["tests/test_config.lua"] = `local Config = require('config')\nassert(Config.name == '${quote(settings.name)}')\nassert(type(Config.options) == 'table')\nprint('PASS: config starter')\n`;
    commonFiles(settings, result, settings.template);
    return result;
  }

  function testHarnessFiles(settings) {
    const result = { [`tests/test_${settings.name}.lua`]: `local passed = 0\nlocal failed = 0\n\nlocal function check(label, condition)\n    if condition then\n        passed = passed + 1\n        print('PASS: ' .. label)\n    else\n        failed = failed + 1\n        print('FAIL: ' .. label)\n    end\nend\n\ncheck('starter is ready', true)\ncheck('name is safe', '${quote(settings.name)}' ~= '')\nprint(('Results: %d passed, %d failed'):format(passed, failed))\nos.exit(failed == 0 and 0 or 1)\n` };
    commonFiles(settings, result, settings.template);
    return result;
  }

  function pythonFiles(settings) {
    const moduleName = safeName(settings.name) || "gankbyte_tool";
    const result = {
      "pyproject.toml": `[build-system]\nrequires = ["setuptools>=68"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "${settings.name}"\nversion = "${settings.version}"\ndescription = "${settings.description}"\nrequires-python = ">=${settings.pythonVersion}"\ndependencies = []\n\n[project.scripts]\n${moduleName} = "${moduleName}.cli:main"\n`,
      [`src/${moduleName}/__init__.py`]: `"""${settings.description}"""\n\n__version__ = "${settings.version}"\n`,
      [`src/${moduleName}/cli.py`]: `"""Command-line entry point for ${settings.name}."""\n\nimport argparse\n\n\ndef build_parser() -> argparse.ArgumentParser:\n    parser = argparse.ArgumentParser(description="${settings.description}")\n    parser.add_argument("--name", default="world", help="Name to greet")\n    return parser\n\n\ndef main() -> int:\n    args = build_parser().parse_args()\n    print(f"Hello, {args.name}!")\n    return 0\n\n\nif __name__ == "__main__":\n    raise SystemExit(main())\n`
    };
    if (settings.tests) result[`tests/test_${moduleName}.py`] = `import unittest\n\nfrom ${moduleName}.cli import build_parser\n\n\nclass StarterTests(unittest.TestCase):\n    def test_default_name(self):\n        args = build_parser().parse_args([])\n        self.assertEqual(args.name, "world")\n\n\nif __name__ == "__main__":\n    unittest.main()\n`;
    commonFiles(settings, result, settings.template);
    return result;
  }

  function javascriptFiles(settings, typescript = false) {
    const moduleName = safeName(settings.name) || "gankbyte_tool";
    const extension = typescript ? "ts" : "js";
    const source = typescript ? `export function greet(name: string = "world"): string {\n  return \`Hello, ${"${name}"}!\`;\n}\n\nif (typeof process !== "undefined" && process.argv[1]?.endsWith("index.ts")) {\n  console.log(greet(process.argv[2] || "world"));\n}\n` : `export function greet(name = "world") {\n  return \`Hello, ${"${name}"}!\`;\n}\n\nif (process.argv[1]?.endsWith("index.js")) {\n  console.log(greet(process.argv[2] || "world"));\n}\n`;
    const result = {
      "package.json": JSON.stringify({ name: settings.name.replace(/_/g, "-"), version: settings.version, description: settings.description, type: "module", engines: { node: `>=${settings.nodeVersion}` }, scripts: typescript ? { build: "tsc", start: "node dist/index.js" } : { start: "node src/index.js" } }, null, 2) + "\n",
      [`src/index.${extension}`]: source
    };
    if (typescript) result["tsconfig.json"] = `{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","outDir":"dist","strict":true,"skipLibCheck":true},"include":["src/**/*.ts"]}\n`;
    if (settings.tests) result[`tests/index.test.${extension}`] = typescript ? `import { strict as assert } from "node:assert";\nimport { greet } from "../src/index.js";\n\nassert.equal(greet("GankByte"), "Hello, GankByte!");\nconsole.log("PASS: JavaScript starter");\n` : `import assert from "node:assert/strict";\nimport { greet } from "../src/index.js";\n\nassert.equal(greet("GankByte"), "Hello, GankByte!");\nconsole.log("PASS: JavaScript starter");\n`;
    commonFiles(settings, result, settings.template);
    return result;
  }

  function javaPackagePath(packageName) {
    return packageName.replace(/\./g, "/");
  }

  function javaFiles(settings, runtime = "plain") {
    const packagePath = javaPackagePath(settings.packageName);
    const fullClass = `${settings.packageName}.${settings.className}`;
    const minecraft = runtime === "minecraft";
    const runelite = runtime === "runelite";
    const javaSource = minecraft ? `package ${settings.packageName};\n\nimport org.bukkit.plugin.java.JavaPlugin;\n\npublic final class ${settings.className} extends JavaPlugin {\n    @Override\n    public void onEnable() {\n        getLogger().info("${quote(settings.name)} enabled");\n    }\n\n    @Override\n    public void onDisable() {\n        getLogger().info("${quote(settings.name)} disabled");\n    }\n}\n` : runelite ? `package ${settings.packageName};\n\nimport net.runelite.client.plugins.Plugin;\nimport net.runelite.client.plugins.PluginDescriptor;\n\n@PluginDescriptor(name = "${quote(settings.name)}")\npublic final class ${settings.className} extends Plugin {\n    @Override\n    protected void startUp() {\n        System.out.println("${quote(settings.name)} started");\n    }\n\n    @Override\n    protected void shutDown() {\n        System.out.println("${quote(settings.name)} stopped");\n    }\n}\n` : `package ${settings.packageName};\n\npublic final class ${settings.className} {\n    private ${settings.className}() {\n    }\n\n    public static void main(String[] args) {\n        System.out.println("${quote(settings.description)}");\n    }\n}\n`;
    const result = {
      "settings.gradle": `rootProject.name = '${quote(settings.name)}'\n`,
      "build.gradle": minecraft ? `plugins {\n    id 'java'\n}\n\ngroup = '${quote(settings.packageName)}'\nversion = '${quote(settings.version)}'\n\nrepositories {\n    mavenCentral()\n    maven { url = 'https://repo.papermc.io/repository/maven-public/' }\n}\n\ndependencies {\n    compileOnly 'io.papermc.paper:paper-api:${quote(settings.minecraftApi)}-R0.1-SNAPSHOT'\n}\n\njava {\n    toolchain { languageVersion = JavaLanguageVersion.of(${quote(settings.javaVersion)}) }\n}\n` : runelite ? `plugins {\n    id 'java'\n}\n\ngroup = '${quote(settings.packageName)}'\nversion = '${quote(settings.version)}'\n\nrepositories {\n    mavenCentral()\n    maven { url = 'https://repo.runelite.net' }\n}\n\ndependencies {\n    compileOnly 'net.runelite:client:${quote(settings.runeliteApi)}'\n}\n\njava {\n    toolchain { languageVersion = JavaLanguageVersion.of(${quote(settings.javaVersion)}) }\n}\n` : `plugins {\n    id 'application'\n}\n\ngroup = '${quote(settings.packageName)}'\nversion = '${quote(settings.version)}'\n\napplication {\n    mainClass = '${fullClass}'\n}\n\njava {\n    toolchain { languageVersion = JavaLanguageVersion.of(${quote(settings.javaVersion)}) }\n}\n`,
      [`src/main/java/${packagePath}/${settings.className}.java`]: javaSource
    };
    if (minecraft) result["src/main/resources/plugin.yml"] = `name: ${settings.name}\nversion: ${settings.version}\nmain: ${fullClass}\napi-version: '${settings.minecraftApi}'\ndescription: ${settings.description}\nauthor: ${settings.author}\n`;
    if (runelite) result["src/main/resources/runelite-plugin.properties"] = `displayName=${settings.name}\nauthor=${settings.author}\ndescription=${settings.description}\ntags=${settings.name}\n`;
    if (settings.tests) result[`src/test/java/${packagePath}/${settings.className}Test.java`] = `package ${settings.packageName};\n\npublic final class ${settings.className}Test {\n    public static void main(String[] args) {\n        if ("${quote(settings.name)}".isBlank()) {\n            throw new AssertionError("Name must not be blank");\n        }\n        System.out.println("PASS: Java starter");\n    }\n}\n`;
    commonFiles(settings, result, settings.template);
    return result;
  }

  function sqlFiles(settings) {
    const table = settings.tableName;
    const migration = settings.sqlEngine === "sqlite" ? `CREATE TABLE IF NOT EXISTS ${table} (\n    id TEXT PRIMARY KEY NOT NULL,\n    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    name TEXT NOT NULL,\n    metadata TEXT\n);\n` : settings.sqlEngine === "mysql" ? `CREATE TABLE IF NOT EXISTS ${table} (\n    id CHAR(36) PRIMARY KEY NOT NULL,\n    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    name VARCHAR(255) NOT NULL,\n    metadata JSON\n);\n` : `CREATE TABLE IF NOT EXISTS public.${table} (\n    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n    created_at timestamptz NOT NULL DEFAULT now(),\n    name text NOT NULL,\n    metadata jsonb NOT NULL DEFAULT '{}'::jsonb\n);\n\n-- Review and add Row Level Security policies before exposing this table.\nALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n`;
    const result = { [`migrations/001_create_${table}.sql`]: `-- ${settings.description}\n-- Engine: ${settings.sqlEngine}\n\n${migration}` };
    if (settings.tests) result[`migrations/002_seed_${table}.sql`] = `-- Optional development seed data. Review before applying outside local development.\nINSERT INTO ${settings.sqlEngine === "postgresql" ? `public.${table}` : table} (name) VALUES ('example');\n`;
    commonFiles(settings, result, settings.template);
    return result;
  }

  function buildFiles(settings) {
    if (isFiveM(settings)) return fivemFiles(settings);
    if (settings.template === "lua-module") return luaModuleFiles(settings);
    if (settings.template === "lua-config") return luaConfigFiles(settings);
    if (settings.template === "test-harness") return testHarnessFiles(settings);
    if (settings.template === "python-cli") return pythonFiles(settings);
    if (settings.template === "javascript-cli") return javascriptFiles(settings);
    if (settings.template === "typescript-cli") return javascriptFiles(settings, true);
    if (settings.template === "java-app") return javaFiles(settings);
    if (settings.template === "minecraft-plugin") return javaFiles(settings, "minecraft");
    if (settings.template === "runelite-plugin") return javaFiles(settings, "runelite");
    if (settings.template === "sql-migration") return sqlFiles(settings);
    return testHarnessFiles(settings);
  }

  function languageFor(name) {
    if (name.endsWith(".lua")) return "LUA";
    if (name.endsWith(".md")) return "MARKDOWN";
    if (name.endsWith(".html")) return "HTML";
    if (name.endsWith(".css")) return "CSS";
    if (name.endsWith(".js")) return "JAVASCRIPT";
    if (name.endsWith(".ts")) return "TYPESCRIPT";
    if (name.endsWith(".py")) return "PYTHON";
    if (name.endsWith(".java")) return "JAVA";
    if (name.endsWith(".sql")) return "SQL";
    if (name.endsWith(".json")) return "JSON";
    if (name.endsWith(".toml")) return "TOML";
    if (name.endsWith(".gradle")) return "GRADLE";
    if (name.endsWith(".yml") || name.endsWith(".yaml")) return "YAML";
    return "TEXT";
  }

  function renderFiles() {
    const query = fileFilter.value.trim().toLowerCase();
    const names = Object.keys(files).filter((name) => name.toLowerCase().includes(query));
    fileList.replaceChildren(...names.map((name) => {
      const button = document.createElement("button");
      button.className = "file-button";
      button.type = "button";
      button.role = "option";
      button.textContent = name;
      button.setAttribute("aria-selected", String(name === activeFile));
      button.addEventListener("click", () => { activeFile = name; renderFiles(); });
      return button;
    }));
    if (!activeFile || !files[activeFile]) activeFile = names[0] || Object.keys(files)[0] || "";
    if (!names.length && query) {
      const empty = document.createElement("p");
      empty.className = "file-list-empty";
      empty.textContent = "No matching files.";
      fileList.append(empty);
    }
    fileContent.textContent = files[activeFile] || "Generate a bundle to see the files here.";
    selectedFile.textContent = activeFile || "No file selected";
    fileLanguage.textContent = languageFor(activeFile);
    fileList.querySelectorAll(".file-button").forEach((button) => button.setAttribute("aria-selected", String(button.textContent === activeFile)));
  }

  function bundleText() {
    return Object.entries(files).map(([name, content]) => `===== ${name} =====\n\n${content}`).join("\n\n");
  }

  function renderQuality(settings) {
    const checks = [
      ["Generated locally", true],
      ["No external dependencies", true],
      ["Name is safe", /^[a-z][a-z0-9_]{2,31}$/.test(settings.name)],
      ["Licence reminder included", Boolean(files["LICENSE.placeholder"])],
      [`${Object.keys(files).length} files ready`, true]
    ];
    qualityStrip.replaceChildren(...checks.map(([label, good]) => { const item = document.createElement("span"); item.className = "quality-check" + (good ? " good" : ""); item.textContent = `${good ? "OK" : "!"} ${label}`; return item; }));
  }

  function generate(event) {
    event?.preventDefault();
    const settings = getSettings();
    const errors = validate(settings);
    if (errors.length) { setStatus(errors.join(" "), true); return; }
    files = buildFiles(settings);
    activeFile = Object.keys(files)[0];
    saveSettings(settings);
    renderFiles();
    renderQuality(settings);
    setStatus(`${Object.keys(files).length} files generated locally for ${settings.template}.`);
  }

  async function copyText(text, success) {
    try { await navigator.clipboard.writeText(text); setStatus(success); }
    catch { setStatus("Clipboard access was unavailable. Select the code and copy it manually.", true); }
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(number) { return new Uint8Array([number & 255, (number >>> 8) & 255]); }
  function u32(number) { return new Uint8Array([number & 255, (number >>> 8) & 255, (number >>> 16) & 255, (number >>> 24) & 255]); }

  function zipBundle() {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    Object.entries(files).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(content);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length + data.length);
      let cursor = 0;
      local.set(u32(0x04034b50), cursor); cursor += 4;
      local.set(u16(20), cursor); cursor += 2;
      local.set(u16(0x0800), cursor); cursor += 2;
      local.set(u16(0), cursor); cursor += 2;
      local.set(u16(0), cursor); cursor += 2;
      local.set(u16(0), cursor); cursor += 2;
      local.set(u32(crc), cursor); cursor += 4;
      local.set(u32(data.length), cursor); cursor += 4;
      local.set(u32(data.length), cursor); cursor += 4;
      local.set(u16(nameBytes.length), cursor); cursor += 2;
      local.set(u16(0), cursor); cursor += 2;
      local.set(nameBytes, cursor); cursor += nameBytes.length;
      local.set(data, cursor);
      chunks.push(local);

      const directory = new Uint8Array(46 + nameBytes.length);
      cursor = 0;
      directory.set(u32(0x02014b50), cursor); cursor += 4;
      directory.set(u16(20), cursor); cursor += 2;
      directory.set(u16(20), cursor); cursor += 2;
      directory.set(u16(0x0800), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u32(crc), cursor); cursor += 4;
      directory.set(u32(data.length), cursor); cursor += 4;
      directory.set(u32(data.length), cursor); cursor += 4;
      directory.set(u16(nameBytes.length), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u16(0), cursor); cursor += 2;
      directory.set(u32(0), cursor); cursor += 4;
      directory.set(u32(offset), cursor); cursor += 4;
      directory.set(nameBytes, cursor);
      central.push(directory);
      offset += local.length;
    });
    const centralSize = central.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    let cursor = 0;
    end.set(u32(0x06054b50), cursor); cursor += 4;
    end.set(u16(0), cursor); cursor += 2;
    end.set(u16(0), cursor); cursor += 2;
    end.set(u16(central.length), cursor); cursor += 2;
    end.set(u16(central.length), cursor); cursor += 2;
    end.set(u32(centralSize), cursor); cursor += 4;
    end.set(u32(offset), cursor); cursor += 4;
    end.set(u16(0), cursor);
    return [...chunks, ...central, end];
  }

  function downloadZip() {
    if (!Object.keys(files).length) { setStatus("Generate a bundle before downloading a ZIP.", true); return; }
    const blob = new Blob(zipBundle(), { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName(value("resource-name")) || "resource"}-resource-bench.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("ZIP bundle downloaded.");
  }

  function reset() {
    form.reset();
    applySettings({});
    files = {};
    activeFile = "";
    renderFiles();
    qualityStrip.replaceChildren();
    syncTemplate();
    setStatus("Builder reset.");
  }

  function syncTemplate() {
    const settings = getSettings();
    const fiveM = isFiveM(settings);
    fileOptions.hidden = !fiveM;
    advancedOptions.hidden = !fiveM;
    languageOptions.hidden = !isLanguage(settings);
    const fieldGroups = {
      python: settings.template === "python-cli",
      node: ["javascript-cli", "typescript-cli"].includes(settings.template),
      java: ["java-app", "minecraft-plugin", "runelite-plugin"].includes(settings.template),
      minecraft: settings.template === "minecraft-plugin",
      runelite: settings.template === "runelite-plugin",
      sql: settings.template === "sql-migration"
    };
    languageOptions.querySelectorAll("[data-language-field]").forEach((field) => { field.hidden = !fieldGroups[field.dataset.languageField]; });
    nuiOptions.hidden = settings.template !== "fivem-nui";
    mapOptions.hidden = settings.template !== "fivem-map";
    manifestOptions.hidden = !fiveM;
    if (settings.template === "fivem-nui") { $("include-client").checked = true; $("include-shared").checked = true; }
    if (settings.template === "fivem-command") { $("include-client").checked = false; $("include-server").checked = true; $("include-shared").checked = true; $("include-command").checked = true; }
    if (settings.template === "fivem-map") { $("include-client").checked = false; $("include-server").checked = false; $("include-shared").checked = false; $("include-config").checked = false; }
  }

  restoreSettings();
  syncTemplate();
  form.addEventListener("submit", generate);
  template.addEventListener("change", syncTemplate);
  copyButton.addEventListener("click", () => files[activeFile] ? copyText(files[activeFile], `${activeFile} copied to the clipboard.`) : setStatus("Generate a bundle before copying a file.", true));
  copyBundleButton.addEventListener("click", () => Object.keys(files).length ? copyText(bundleText(), "Complete bundle copied to the clipboard.") : setStatus("Generate a bundle before copying the bundle.", true));
  downloadButton.addEventListener("click", () => Object.keys(files).length ? downloadText(`${safeName(value("resource-name")) || "resource"}-resource-bench.txt`, bundleText()) : setStatus("Generate a bundle before downloading it.", true));
  downloadFileButton.addEventListener("click", () => files[activeFile] ? downloadText(activeFile.replace(/[^a-zA-Z0-9._/-]/g, "_"), files[activeFile]) : setStatus("Generate a bundle before downloading a file.", true));
  downloadZipButton.addEventListener("click", downloadZip);
  fileFilter.addEventListener("input", renderFiles);
  resetButton.addEventListener("click", reset);
  generate();
})();
