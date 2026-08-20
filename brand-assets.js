(() => {
  "use strict";
  const main = document.querySelector("main");
  if (!main) return;
  const section = document.createElement("section");
  section.className = "section shell brand-banner-section";
  section.innerHTML = '<div class="section-heading"><div><p class="eyebrow">SOCIAL ARTWORK</p><h2>One signal.<br /><em>Every feed.</em></h2></div><p class="section-intro">A wide original banner for X, Discord, YouTube, and future community posts. Keep the logo overlay clear on the left.</p></div><div class="brand-banner-card"><img src="gankbyte-social-banner.png" alt="Original GankByte social banner with a lime signal crystal, purple glitch arena, and gamer silhouette" /><p class="section-copy">Use this artwork as a background; keep the official GankByte logo and tagline as separate readable text.</p></div>';
  main.append(section);
})();
