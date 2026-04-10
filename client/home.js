import { getMostCriticalRegion, sortRegionsByPriority, regions } from "../data/regions.js";
import {
  bindFavoriteButtons,
  bindSearchForm,
  renderAssistantTeaser,
  renderFavoriteStrip,
  renderHomeHero,
  renderHomeSearch,
  renderHowItWorks,
  renderRegionCard,
  renderShell,
  setDocumentTitle
} from "./common.js";

function renderMapPromo() {
  return `
    <section class="map-promo">
      <div class="map-promo-copy">
        <p class="section-label">Global view</p>
        <h2>See water-access pressure across the world in one click</h2>
        <p>Open the interactive country map to compare risk, inspect country-level access indicators, and jump directly into guidance for any country you select.</p>
      </div>
      <div class="map-promo-card">
        <div class="map-promo-stat">
          <span>Coverage</span>
          <strong>Every country</strong>
        </div>
        <div class="map-promo-stat">
          <span>View</span>
          <strong>Interactive world map</strong>
        </div>
        <a class="primary-button" href="./map/">Open map</a>
      </div>
    </section>
  `;
}

function init() {
  renderShell({ basePath: "./", activeNav: "home" });
  setDocumentTitle("");

  const main = document.getElementById("main");
  const critical = getMostCriticalRegion();
  const regionCards = sortRegionsByPriority(regions).map((region) => renderRegionCard(region, "./")).join("");

  main.innerHTML = `
    ${renderHomeHero(critical, "./")}
    <div class="page-shell">
      ${renderHomeSearch("./")}
      ${renderFavoriteStrip("./")}
      <section class="region-grid-section">
        <div class="section-head">
          <div>
            <p class="section-label">Featured profiles</p>
            <h2>Curated launch profiles plus global search coverage</h2>
          </div>
          <p class="section-meta">Featured profiles are presentation-ready, while search can open guidance for cities and communities worldwide using public APIs.</p>
        </div>
        <div class="region-grid">${regionCards}</div>
      </section>
      ${renderMapPromo()}
      ${renderHowItWorks()}
      ${renderAssistantTeaser("./")}
    </div>
  `;

  bindSearchForm({
    formSelector: "#regionSearchForm",
    inputSelector: "#regionSearchInput",
    targetBasePath: "./"
  });
  bindFavoriteButtons(main);
}

init();
