(() => {
  "use strict";

  const projects = {
    "Byte Rush": {
      tryLabel: "Play it",
      tryUrl: "arena.html?v=19",
      source: "https://github.com/GankByteHQ/byte-rush",
      bug: "https://github.com/GankByteHQ/byte-rush/issues/new/choose",
      feature: "https://github.com/GankByteHQ/byte-rush/issues/new/choose",
      contribute: "https://github.com/GankByteHQ/byte-rush/blob/main/CONTRIBUTING.md",
      licence: "https://github.com/GankByteHQ/byte-rush/blob/main/LICENSE"
    },
    "Byte Rush source": {
      tryLabel: "Play it",
      tryUrl: "arena.html?v=19",
      source: "https://github.com/GankByteHQ/byte-rush",
      bug: "https://github.com/GankByteHQ/byte-rush/issues/new/choose",
      feature: "https://github.com/GankByteHQ/byte-rush/issues/new/choose",
      contribute: "https://github.com/GankByteHQ/byte-rush/blob/main/CONTRIBUTING.md",
      licence: "https://github.com/GankByteHQ/byte-rush/blob/main/LICENSE"
    },
    "Glitch Dash": {
      tryLabel: "Play it",
      tryUrl: "glitch-dash.html?v=8",
      source: "https://github.com/GankByteHQ/gankbyte-website",
      bug: "https://github.com/GankByteHQ/gankbyte-website/issues/new/choose",
      feature: "https://github.com/GankByteHQ/gankbyte-website/issues/new/choose",
      contribute: "https://github.com/GankByteHQ/gankbyte-website/blob/main/CONTRIBUTING.md",
      licence: "https://github.com/GankByteHQ/gankbyte-website/blob/main/LICENSE"
    },
    "GankByte Lua Kit": {
      tryLabel: "Explore it",
      tryUrl: "https://github.com/GankByteHQ/gankbyte-lua-kit",
      source: "https://github.com/GankByteHQ/gankbyte-lua-kit",
      bug: "https://github.com/GankByteHQ/gankbyte-lua-kit/issues/new/choose",
      feature: "https://github.com/GankByteHQ/gankbyte-lua-kit/issues/new/choose",
      contribute: "https://github.com/GankByteHQ/gankbyte-lua-kit/blob/main/CONTRIBUTING.md",
      licence: "https://github.com/GankByteHQ/gankbyte-lua-kit/blob/main/LICENSE"
    },
    "Resource Bench": {
      tryLabel: "Try it",
      tryUrl: "resource-bench.html",
      source: "https://github.com/GankByteHQ/gankbyte-resource-bench",
      bug: "https://github.com/GankByteHQ/gankbyte-resource-bench/issues/new/choose",
      feature: "https://github.com/GankByteHQ/gankbyte-resource-bench/issues/new/choose",
      contribute: "https://github.com/GankByteHQ/gankbyte-resource-bench/blob/main/CONTRIBUTING.md",
      licence: "https://github.com/GankByteHQ/gankbyte-resource-bench/blob/main/LICENSE"
    }
  };

  const labels = [
    ["tryUrl", "tryLabel"],
    ["source", "View source"],
    ["bug", "Report a bug"],
    ["feature", "Request a feature"],
    ["contribute", "Contribute"],
    ["licence", "View licence"]
  ];

  function link(href, label) {
    const anchor = document.createElement("a");
    anchor.className = "text-link";
    anchor.href = href;
    if (/^https?:/i.test(href)) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
    }
    anchor.textContent = `${label} `;
    const arrow = document.createElement("span");
    arrow.textContent = "->";
    anchor.append(arrow);
    return anchor;
  }

  document.querySelectorAll("main .content-card").forEach((card) => {
    const title = card.querySelector("h3")?.textContent.trim();
    const project = projects[title];
    if (!project || card.querySelector(".project-actions")) return;

    card.querySelectorAll(":scope > a").forEach((anchor) => anchor.remove());
    const actions = document.createElement("div");
    actions.className = "project-actions";
    labels.forEach(([key, label]) => {
      const text = key === "tryUrl" ? project.tryLabel : label;
      actions.append(link(project[key], text));
    });
    card.append(actions);
  });
})();
