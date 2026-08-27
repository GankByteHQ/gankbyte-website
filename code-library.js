(() => {
  const grid = document.getElementById("snippet-grid");
  if (!grid) return;

  const extraSnippets = [
    {
      language: "fivem javascript",
      tag: "FiveM // JavaScript",
      title: "Resource start guard",
      code: "on('onClientResourceStart', (resourceName) => {\n    if (resourceName !== GetCurrentResourceName()) return;\n    console.log(`[gankbyte] ${resourceName} started`);\n});",
      note: "Keep client startup predictable and ignore events intended for another resource."
    },
    {
      language: "typescript web",
      tag: "Web // TypeScript",
      title: "Typed JSON request",
      code: "type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };\n\nasync function getJson<T>(url: string): Promise<ApiResult<T>> {\n    const response = await fetch(url);\n    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };\n    return { ok: true, data: (await response.json()) as T };\n}",
      note: "Keep response states explicit so callers handle errors instead of trusting an unknown payload."
    }
  ];

  extraSnippets.forEach((snippet) => {
    const card = document.createElement("article");
    card.className = "snippet-card";
    card.dataset.snippetCard = "true";
    card.dataset.language = snippet.language;
    card.innerHTML = `<div class="snippet-head"><div><span class="snippet-tag">${snippet.tag}</span><h3>${snippet.title}</h3></div><button class="snippet-copy" type="button" data-copy-snippet>Copy</button></div><pre><code></code></pre><p>${snippet.note}</p>`;
    card.querySelector("code").textContent = snippet.code;
    grid.append(card);
  });

  const filters = document.querySelector(".library-filters");
  if (filters && !filters.querySelector('[data-filter="typescript"]')) {
    const button = document.createElement("button");
    button.className = "library-filter";
    button.type = "button";
    button.dataset.filter = "typescript";
    button.textContent = "TypeScript";
    filters.append(button);
  }

  const cards = [...document.querySelectorAll("[data-snippet-card]")];
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const search = document.getElementById("snippet-search");
  const empty = document.getElementById("snippet-empty");
  let active = "all";

  function apply() {
    const query = (search?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const languages = (card.dataset.language || "").split(" ");
      const matchesFilter = active === "all" || languages.includes(active);
      const matchesSearch = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !(matchesFilter && matchesSearch);
      if (!card.hidden) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
  }

  filterButtons.forEach((button) => button.addEventListener("click", () => {
    active = button.dataset.filter || "all";
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    apply();
  }));
  search?.addEventListener("input", apply);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    }
  }

  cards.forEach((card) => card.querySelector("[data-copy-snippet]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const original = button.textContent;
    const ok = await copy(card.querySelector("code").textContent);
    button.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => { button.textContent = original; }, 1400);
  }));
  apply();
})();
