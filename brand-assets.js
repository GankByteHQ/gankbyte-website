(() => {
  "use strict";
  const main = document.querySelector("main");
  if (!main) return;
  const section = document.createElement("section");
  section.className = "section shell brand-banner-section";
  section.innerHTML = '<div class="section-heading"><div><p class="eyebrow">SOCIAL ARTWORK</p><h2>One signal.<br /><em>Every feed.</em></h2></div><p class="section-intro">Original artwork for the site preview, X, Discord, YouTube, and future community posts. Keep the logo overlay clear on the left.</p></div><div class="brand-banner-card"><img src="gankbyte-social-banner-v2.png" alt="Original GankByte social banner with a lime signal crystal, purple glitch arena, and gamer silhouette" /><p class="section-copy">Use the wide banner as a background and keep the official GankByte logo and tagline as separate readable text. The same composition is available as the site preview image.</p><div class="project-actions"><a class="text-link" href="gankbyte-social-banner-v2.png">Open social banner <span>&nearr;</span></a><a class="text-link" href="gankbyte-og.png">Open preview image <span>&nearr;</span></a></div></div>';
  main.append(section);
})();
