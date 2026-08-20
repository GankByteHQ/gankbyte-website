(() => {
  "use strict";
  const actions = {
    "Byte Rush": ["https://github.com/GankByteHQ/byte-rush/issues/new/choose", "Report a bug", "https://github.com/GankByteHQ/byte-rush/blob/main/LICENSE", "View licence"],
    "Glitch Dash": ["https://github.com/GankByteHQ/gankbyte-website/issues/new/choose", "Report a bug", "https://github.com/GankByteHQ/gankbyte-website/blob/main/PROJECT_RULES.md", "Project rules"],
    "GankByte Lua Kit": ["https://github.com/GankByteHQ/gankbyte-lua-kit/issues/new/choose", "Report a bug", "https://github.com/GankByteHQ/gankbyte-lua-kit/blob/main/LICENSE", "View licence"]
  };
  document.querySelectorAll("main .content-card").forEach((card) => {
    const title = card.querySelector("h3")?.textContent.trim();
    const links = actions[title];
    if (!links || card.querySelector(".project-actions")) return;
    const wrap = document.createElement("div");
    wrap.className = "project-actions";
    const report = document.createElement("a");
    report.className = "text-link";
    report.href = links[0];
    report.target = "_blank";
    report.rel = "noreferrer";
    report.textContent = `${links[1]} `;
    const reportArrow = document.createElement("span");
    reportArrow.textContent = "↗";
    report.append(reportArrow);
    const license = document.createElement("a");
    license.className = "text-link";
    license.href = links[2];
    license.target = "_blank";
    license.rel = "noreferrer";
    license.textContent = `${links[3]} `;
    const licenseArrow = document.createElement("span");
    licenseArrow.textContent = "↗";
    license.append(licenseArrow);
    wrap.append(report, license);
    card.append(wrap);
  });
})();
