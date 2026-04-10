import { getMostCriticalRegion, sortRegionsByPriority, regions } from "../data/regions.js";
import {
  renderHomeHero,
  renderHomeSearch,
  renderRegionCard,
  renderShell,
  setDocumentTitle
} from "./common.js";
import { attachPlaceSearch } from "./place-search.js";

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
      <section class="region-grid-section">
        <div class="section-head">
          <div>
            <p class="section-label">Flagship country stories</p>
            <h2>Four presentation-ready flows, plus global search when you need it</h2>
          </div>
          <a class="inline-link" href="./map/">Open global map</a>
        </div>
        <div class="region-grid">${regionCards}</div>
      </section>
    </div>
  `;

  attachPlaceSearch({
    formSelector: "#regionSearchForm",
    inputSelector: "#regionSearchInput",
    suggestionsSelector: "#regionSearchSuggestions",
    basePath: "./"
  });
}

init();
