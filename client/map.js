import { getCountryHotspots, getCountryWaterRecord } from "../data/country-water-index.js";
import { bindSearchForm, escapeHtml, getAssistantLanguage, renderShell, renderStatusBadge, setDocumentTitle } from "./common.js";

const riskPalette = {
  advisory: "#f97316",
  caution: "#f5b014",
  safe: "#0ea5e9",
  unavailable: "#cbd5e1"
};

const riskBorderPalette = {
  advisory: "#c2410c",
  caution: "#b45309",
  safe: "#0369a1",
  unavailable: "#94a3b8"
};

function buildGuidanceHref(record) {
  const url = new URL("../region/", window.location.href);
  if (Number.isFinite(record.lat) && Number.isFinite(record.lng)) {
    url.searchParams.set("lat", String(record.lat));
    url.searchParams.set("lng", String(record.lng));
    url.searchParams.set("name", record.country);
    url.searchParams.set("country", record.country);
    url.searchParams.set("iso2", record.iso2);
    return url.toString();
  }
  url.searchParams.set("q", record.country);
  return url.toString();
}

function buildAssistantHref(record) {
  const url = new URL("../assistant/", window.location.href);
  if (Number.isFinite(record.lat) && Number.isFinite(record.lng)) {
    url.searchParams.set("lat", String(record.lat));
    url.searchParams.set("lng", String(record.lng));
    url.searchParams.set("name", record.country);
    url.searchParams.set("country", record.country);
    url.searchParams.set("iso2", record.iso2);
  } else {
    url.searchParams.set("q", record.country);
  }
  url.searchParams.set("lang", getAssistantLanguage());
  return url.toString();
}

function getCountrySummary(record) {
  if (!Number.isFinite(record.drinkingWaterValue) && !Number.isFinite(record.sanitationValue)) {
    return `${record.country} is available for click-through guidance, but the latest country-level access indicators were unavailable during dataset generation.`;
  }

  return `${record.country} reports ${record.drinkingWaterDisplay || "N/A"} basic drinking water access and ${record.sanitationDisplay || "N/A"} basic sanitation access. Aqua Guide uses that baseline to prioritize the places that need fast household guidance most.`;
}

function renderHotspotButton(record) {
  return `
    <button class="hotspot-chip hotspot-chip-${record.status}" type="button" data-hotspot-iso3="${record.iso3}">
      <span>${escapeHtml(record.flag || "🌍")} ${escapeHtml(record.country)}</span>
      <strong>${escapeHtml(record.riskLabel)}</strong>
    </button>
  `;
}

function renderDrawer(record) {
  return `
    <div class="map-drawer-head">
      <div>
        <p class="eyebrow">Selected country</p>
        <h2>${escapeHtml(record.flag || "🌍")} ${escapeHtml(record.country)}</h2>
      </div>
      ${renderStatusBadge(record)}
    </div>
    <p class="map-drawer-copy">${escapeHtml(getCountrySummary(record))}</p>
    <div class="map-stat-grid">
      <div><span>Quality index</span><strong>${escapeHtml(record.qualityIndexLabel)}</strong></div>
      <div><span>Risk score</span><strong>${escapeHtml(record.riskLabel)}</strong></div>
      <div><span>Water access</span><strong>${escapeHtml(record.drinkingWaterDisplay || "N/A")}</strong></div>
      <div><span>Sanitation</span><strong>${escapeHtml(record.sanitationDisplay || "N/A")}</strong></div>
      <div><span>Population</span><strong>${escapeHtml(record.populationDisplay || "N/A")}</strong></div>
      <div><span>Region</span><strong>${escapeHtml(record.subregion || record.region || "Global")}</strong></div>
    </div>
    <div class="map-drawer-actions">
      <a id="mapOpenGuidance" class="primary-button" href="${buildGuidanceHref(record)}">Open guidance</a>
      <a id="mapAskAssistant" class="secondary-button" href="${buildAssistantHref(record)}">Ask assistant</a>
    </div>
    <div class="map-drawer-search">
      <button class="ghost-button" type="button" data-country-search="${escapeHtml(record.capital ? `${record.capital}, ${record.country}` : record.country)}">
        Search ${escapeHtml(record.capital ? `${record.capital}, ${record.country}` : record.country)}
      </button>
    </div>
  `;
}

function buildMapLayout() {
  const hotspots = getCountryHotspots(10);
  return `
    <div class="page-shell">
      <section class="map-page">
        <div class="section-head">
          <div>
            <p class="section-label">Global map</p>
            <h1>Country water risk map</h1>
          </div>
          <p class="section-meta">Click any country to inspect water-access pressure, compare the worst hotspots, and jump into guidance without waiting on a server-side map API.</p>
        </div>
        <div class="map-layout">
          <div class="map-panel">
            <div class="map-toolbar">
              <form id="mapSearchForm" class="search-bar compact-search">
                <div class="search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </div>
                <input id="mapSearchInput" type="text" placeholder="Search a city, district, or country" autocomplete="off" />
                <button class="primary-button" type="submit">Open guidance</button>
              </form>
              <div class="map-legend" aria-label="Risk legend">
                <span><i style="background:${riskPalette.advisory}"></i>Highest pressure</span>
                <span><i style="background:${riskPalette.caution}"></i>Watch closely</span>
                <span><i style="background:${riskPalette.safe}"></i>Stronger access</span>
                <span><i style="background:${riskPalette.unavailable}"></i>Data limited</span>
              </div>
            </div>
            <div class="map-canvas-shell">
              <div id="worldMap" class="world-map"></div>
              <div id="mapLoading" class="map-loading">Loading world map...</div>
            </div>
            <div class="hotspot-strip">
              <div class="section-head compact">
                <div>
                  <p class="section-label">Highest pressure</p>
                  <h2>Start with the countries judges will understand instantly</h2>
                </div>
              </div>
              <div class="hotspot-row">${hotspots.map(renderHotspotButton).join("")}</div>
            </div>
          </div>
          <aside id="mapDrawer" class="map-drawer">
            <p class="eyebrow">How to use this map</p>
            <h2>Select a country</h2>
            <p>Click a country to open its score, the latest country-level access indicators, and direct links into Aqua Guide guidance and the multilingual assistant.</p>
          </aside>
        </div>
      </section>
    </div>
  `;
}

function styleForRecord(record, isSelected = false) {
  const status = record?.status || "unavailable";
  return {
    color: isSelected ? "#f8fafc" : riskBorderPalette[status],
    weight: isSelected ? 2.4 : 1,
    fillColor: riskPalette[status],
    fillOpacity: isSelected ? 0.88 : 0.72
  };
}

async function init() {
  renderShell({ basePath: "../", activeNav: "map" });
  setDocumentTitle("Map");

  const main = document.getElementById("main");
  main.innerHTML = buildMapLayout();

  bindSearchForm({
    formSelector: "#mapSearchForm",
    inputSelector: "#mapSearchInput",
    targetBasePath: "../"
  });

  const drawer = document.getElementById("mapDrawer");
  const loading = document.getElementById("mapLoading");
  const searchInput = document.getElementById("mapSearchInput");
  const hotspotRecords = getCountryHotspots(10);
  const selectedState = { iso3: hotspotRecords[0]?.iso3 || "" };

  const geojson = await fetch("../data/world-countries.geo.json").then((response) => response.json());
  const map = L.map("worldMap", {
    attributionControl: false,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: true,
    tap: false
  });

  const countryLayers = new Map();

  function selectCountry(iso3) {
    const record = getCountryWaterRecord(iso3);
    if (!record) return;

    selectedState.iso3 = iso3;
    drawer.innerHTML = renderDrawer(record);

    document.querySelectorAll("[data-country-search]").forEach((button) => {
      button.addEventListener("click", () => {
        const query = button.getAttribute("data-country-search") || record.country;
        searchInput.value = query;
        searchInput.focus();
      });
    });

    countryLayers.forEach((layer, layerIso3) => {
      layer.setStyle(styleForRecord(getCountryWaterRecord(layerIso3), layerIso3 === iso3));
    });

    const layer = countryLayers.get(iso3);
    if (layer) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 4 });
      }
    }
  }

  const geoLayer = L.geoJSON(geojson, {
    style(feature) {
      const record = getCountryWaterRecord(feature?.properties?.iso3);
      return styleForRecord(record, record?.iso3 === selectedState.iso3);
    },
    onEachFeature(feature, layer) {
      const iso3 = feature?.properties?.iso3;
      const record = getCountryWaterRecord(iso3) || {
        iso3,
        country: feature?.properties?.name || "Unknown country",
        status: "unavailable",
        statusLabel: "Data limited",
        riskLabel: "N/A"
      };

      countryLayers.set(iso3, layer);
      layer.bindTooltip(`${record.country} - ${record.riskLabel}`, { sticky: true, direction: "auto" });
      layer.on("click", () => selectCountry(iso3));
      layer.on("mouseover", () => {
        if (iso3 !== selectedState.iso3) {
          layer.setStyle({ weight: 1.8, fillOpacity: 0.84 });
        }
      });
      layer.on("mouseout", () => {
        layer.setStyle(styleForRecord(record, iso3 === selectedState.iso3));
      });
    }
  }).addTo(map);

  function decorateInteractiveLayers() {
    geoLayer.eachLayer((layer) => {
      const iso3 = layer.feature?.properties?.iso3 || "";
      const element = layer.getElement?.();
      if (!element) return;
      element.dataset.iso3 = iso3;
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `Open ${layer.feature?.properties?.name || "country"} details`);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCountry(iso3);
        }
      });
    });
  }

  const bounds = geoLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
    map.setMaxBounds(bounds.pad(0.04));
  }

  map.whenReady(() => {
    window.requestAnimationFrame(decorateInteractiveLayers);
  });
  loading.hidden = true;

  document.querySelectorAll("[data-hotspot-iso3]").forEach((button) => {
    button.addEventListener("click", () => selectCountry(button.getAttribute("data-hotspot-iso3")));
  });

  if (hotspotRecords[0]?.iso3) {
    selectCountry(hotspotRecords[0].iso3);
  }
}

init().catch((error) => {
  console.error(error);
  document.getElementById("mapLoading")?.replaceChildren("Could not load the interactive map right now.");
  const drawer = document.getElementById("mapDrawer");
  if (drawer) {
    drawer.innerHTML = `
      <p class="eyebrow">Map unavailable</p>
      <h2>We could not load the global layer</h2>
      <p>${escapeHtml(error instanceof Error ? error.message : "Please try again in a moment.")}</p>
    `;
  }
});
