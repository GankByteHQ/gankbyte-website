(() => {
  "use strict";

  const form = document.querySelector("#resource-form");
  const status = document.querySelector("#form-status");
  const fileList = document.querySelector("#file-list");
  const fileContent = document.querySelector("#file-content");
  const selectedFile = document.querySelector("#selected-file");
  const fileLanguage = document.querySelector("#file-language");
  const qualityStrip = document.querySelector("#quality-strip");
  const template = document.querySelector("#resource-template");
  const options = document.querySelector("#file-options");
  const copyButton = document.querySelector("#copy-button");
  const downloadButton = document.querySelector("#download-button");
  const resetButton = document.querySelector("#reset-button");
  const storageKey = "gankbyte-resource-bench-settings";
  let files = {};
  let activeFile = "";

  const value = (id) => document.querySelector(`#${id}`).value.trim();
  const checked = (id) => document.querySelector(`#${id}`).checked;
  const quote = (text) => String(text).replace(/'/g, "\\'");
  const safeName = (text) => text.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");

  function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle("error", error);
  }

  function getSettings() {
    return {
      name: value("resource-name"),
      author: value("resource-author"),
      description: value("resource-description"),
      template: template.value,
      client: checked("include-client"),
      server: checked("include-server"),
      shared: checked("include-shared")
    };
  }

  function saveSettings(settings) {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* local storage is optional */ }
  }

  function restoreSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved) return;
      document.querySelector("#resource-name").value = saved.name || "gankbyte_demo";
      document.querySelector("#resource-author").value = saved.author || "GankByte Community";
      document.querySelector("#resource-description").value = saved.description || "A small, testable resource starter.";
      template.value = saved.template || "fivem";
      document.querySelector("#include-client").checked = saved.client !== false;
      document.querySelector("#include-server").checked = saved.server !== false;
      document.querySelector("#include-shared").checked = saved.shared !== false;
    } catch { /* use defaults */ }
  }

  function validate(settings) {
    const errors = [];
    if (!/^[a-z][a-z0-9_]{2,31}$/.test(settings.name)) errors.push("Use 3–32 lowercase letters, numbers, or underscores, starting with a letter.");
    if (!settings.author) errors.push("Add an author or team name.");
    if (settings.description.length < 8) errors.push("Describe the resource in at least eight characters.");
    if (settings.template === "fivem" && !settings.client && !settings.server && !settings.shared) errors.push("Select at least one file for the FiveM resource.");
    return errors;
  }

  function fivemFiles(settings) {
    const result = {
      "fxmanifest.lua": `fx_version 'cerulean'\ngame 'gta5'\n\nauthor '${quote(settings.author)}'\ndescription '${quote(settings.description)}'\nversion '0.1.0'\n\n`
    };
    const scripts = [];
    if (settings.shared) { scripts.push("shared_scripts {\n    'shared/config.lua'\n}"); result["shared/config.lua"] = `Config = {}\nConfig.Debug = false\nConfig.ResourceName = '${quote(settings.name)}'\n`; }
    if (settings.client) { scripts.push("client_scripts {\n    'client/main.lua'\n}"); result["client/main.lua"] = `CreateThread(function()\n    while true do\n        Wait(1000)\n        if Config and Config.Debug then\n            print('[${quote(settings.name)}] client tick')\n        end\n    end\nend)\n`; }
    if (settings.server) { scripts.push("server_scripts {\n    'server/main.lua'\n}"); result["server/main.lua"] = `AddEventHandler('onResourceStart', function(resourceName)\n    if resourceName ~= GetCurrentResourceName() then return end\n    print('[${quote(settings.name)}] started')\nend)\n`; }
    result["fxmanifest.lua"] += scripts.join("\n\n") + "\n";
    result["README.md"] = `# ${settings.name}\n\n${settings.description}\n\n## Install\n\n1. Place this folder in your server's resources directory.\n2. Add ensure ${settings.name} to server.cfg.\n3. Read the generated scripts before using them in production.\n\n## Ownership\n\nReplace this section with your project's licence, credits, and third-party notices before publishing.\n`;
    result["LICENSE.placeholder"] = "Choose and add a licence before publishing this resource. Resource Bench does not choose ownership terms for you.\n";
    return result;
  }

  function luaModuleFiles(settings) {
    return {
      "${settings.name}.lua": `local ${settings.name} = {}\n\nfunction ${settings.name}.hello()\n    return '${quote(settings.description)}'\nend\n\nreturn ${settings.name}\n`,
      "README.md": `# ${settings.name}\n\n${settings.description}\n\n## Usage\n\nlocal module = require('${settings.name}')\n\nRead the source and add tests before relying on this module in production.\n`,
      "LICENSE.placeholder": "Choose and add a licence before publishing this module.\n"
    };
  }

  function testHarnessFiles(settings) {
    return {
      ["tests/test_" + settings.name + ".lua"]: `local passed = 0\nlocal failed = 0\n\nlocal function check(label, condition)\n    if condition then\n        passed = passed + 1\n        print('PASS: ' .. label)\n    else\n        failed = failed + 1\n        print('FAIL: ' .. label)\n    end\nend\n\ncheck('starter is ready', true)\nprint(('Results: %d passed, %d failed'):format(passed, failed))\nos.exit(failed == 0 and 0 or 1)\n`,
      "README.md": `# ${settings.name}\n\n${settings.description}\n\nRun the test file with a Lua 5.1+ runtime:\n\nlua tests/test_${settings.name}.lua\n`,
      "LICENSE.placeholder": "Choose and add a licence before publishing this test harness.\n"
    };
  }

  function buildFiles(settings) {
    if (settings.template === "lua-module") return luaModuleFiles(settings);
    if (settings.template === "test-harness") return testHarnessFiles(settings);
    return fivemFiles(settings);
  }

  function languageFor(name) {
    if (name.endsWith(".lua")) return "LUA";
    if (name.endsWith(".md")) return "MARKDOWN";
    return "TEXT";
  }

  function renderFiles() {
    const names = Object.keys(files);
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
    if (!activeFile || !files[activeFile]) activeFile = names[0] || "";
    fileContent.textContent = files[activeFile] || "Generate a bundle to see the files here.";
    selectedFile.textContent = activeFile || "No file selected";
    fileLanguage.textContent = languageFor(activeFile);
    fileList.querySelectorAll(".file-button").forEach((button) => button.setAttribute("aria-selected", String(button.textContent === activeFile)));
  }

  function renderQuality(settings) {
    const checks = [
      ["Generated locally", true],
      ["No external dependencies", true],
      ["Name is safe", /^[a-z][a-z0-9_]{2,31}$/.test(settings.name)],
      ["Licence reminder included", Boolean(files["LICENSE.placeholder"])]
    ];
    qualityStrip.replaceChildren(...checks.map(([label, good]) => { const item = document.createElement("span"); item.className = "quality-check" + (good ? " good" : ""); item.textContent = (good ? "✓ " : "! ") + label; return item; }));
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
    setStatus(`${Object.keys(files).length} files generated locally.`);
  }

  async function copyCurrent() {
    if (!files[activeFile]) { setStatus("Generate a bundle before copying a file.", true); return; }
    try { await navigator.clipboard.writeText(files[activeFile]); setStatus(`${activeFile} copied to the clipboard.`); }
    catch { setStatus("Clipboard access was unavailable. Select the code and copy it manually.", true); }
  }

  function downloadBundle() {
    if (!Object.keys(files).length) { setStatus("Generate a bundle before downloading it.", true); return; }
    const bundle = Object.entries(files).map(([name, content]) => `===== ${name} =====\n\n${content}`).join("\n\n");
    const blob = new Blob([bundle], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${value("resource-name") || "resource"}-resource-bench.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Bundle downloaded as a readable text archive.");
  }

  function reset() {
    form.reset();
    document.querySelector("#resource-name").value = "gankbyte_demo";
    document.querySelector("#resource-author").value = "GankByte Community";
    document.querySelector("#resource-description").value = "A small, testable resource starter.";
    template.value = "fivem";
    files = {};
    activeFile = "";
    renderFiles();
    qualityStrip.replaceChildren();
    setStatus("Builder reset.");
  }

  function syncTemplate() { options.hidden = template.value !== "fivem"; }
  restoreSettings();
  syncTemplate();
  form.addEventListener("submit", generate);
  template.addEventListener("change", syncTemplate);
  copyButton.addEventListener("click", copyCurrent);
  downloadButton.addEventListener("click", downloadBundle);
  resetButton.addEventListener("click", reset);
  generate();
})();
