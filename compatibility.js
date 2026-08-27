(() => {
  const rows = [...document.querySelectorAll("[data-entry]")];
  const buttons = [...document.querySelectorAll("[data-filter]")];
  const search = document.querySelector("#compat-search");
  const empty = document.querySelector("#compat-empty");
  let active = "all";

  function update() {
    const query = (search?.value || "").trim().toLowerCase();
    let visible = 0;
    rows.forEach((row) => {
      const tags = row.dataset.tags || "";
      const matchesFilter = active === "all" || tags.includes(active);
      const matchesSearch = !query || row.textContent.toLowerCase().includes(query);
      const show = matchesFilter && matchesSearch;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    active = button.dataset.filter || "all";
    buttons.forEach((item) => item.classList.toggle("active", item === button));
    update();
  }));
  search?.addEventListener("input", update);
  update();
})();
