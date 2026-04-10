import {
  getCountryWaterRecord,
  getCountryWaterRecordByNumericCode
} from "../data/country-water-index.js";
import { regions } from "../data/regions.js";
import { attachPlaceSearch, buildRegionHrefFromCandidate } from "./place-search.js";
import { resolveDynamicPayloadFromCoordinates, searchPlaceCandidates } from "./location-service.js";
import { escapeHtml, getAssistantLanguage, renderShell, renderStatusBadge, setDocumentTitle, showToast } from "./common.js";

const riskPalette = {
  advisory: "#ef4444",
  caution: "#f59e0b",
  safe: "#22c55e",
  unavailable: "#cbd5e1"
};

const riskBorderPalette = {
  advisory: "#b91c1c",
  caution: "#b45309",
  safe: "#15803d",
  unavailable: "#94a3b8"
};

const featuredRegions = regions.slice(0, 4);
const featuredCountryIso3Set = new Set(featuredRegions.map((region) => region.countryIso3));
const featuredCountryMeta = new Map(
  featuredRegions.map((region) => [
    region.countryIso3,
    {
      regionId: region.id,
      regionName: region.name,
      quickSummary: region.quickSummary
    }
  ])
);

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

function buildAssistantHrefForPlace(region) {
  const url = new URL("../assistant/", window.location.href);
  url.searchParams.set("lat", String(region.coordinates.lat));
  url.searchParams.set("lng", String(region.coordinates.lng));
  url.searchParams.set("name", region.name.split(",")[0] || region.name);
  url.searchParams.set("country", region.country || "");
  url.searchParams.set("iso2", region.countryIso2 || "");
  url.searchParams.set("admin1", region.name.split(",").slice(1, 2).join("").trim());
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
  const featuredMeta = featuredCountryMeta.get(record.iso3);
  return `
    <button class="hotspot-chip hotspot-chip-${record.status}" type="button" data-hotspot-iso3="${record.iso3}">
      <span>${escapeHtml(record.flag || "🌍")} ${escapeHtml(record.country)}</span>
      <strong>${escapeHtml(featuredMeta?.regionName || record.country)}</strong>
    </button>
  `;
}

function renderCountryDrawer(record) {
  const featuredMeta = featuredCountryMeta.get(record.iso3);
  const guidanceHref = featuredMeta?.regionId
    ? `../region/?id=${encodeURIComponent(featuredMeta.regionId)}`
    : buildGuidanceHref(record);
  return `
    <div class="map-drawer-head">
      <div>
        <p class="eyebrow">Selected country</p>
        <h2>${escapeHtml(record.flag || "🌍")} ${escapeHtml(record.country)}</h2>
      </div>
      ${renderStatusBadge(record)}
    </div>
    <p class="map-drawer-copy">${escapeHtml(featuredMeta?.quickSummary || getCountrySummary(record))}</p>
    <div class="map-stat-grid">
      <div><span>Quality index</span><strong>${escapeHtml(record.qualityIndexLabel)}</strong></div>
      <div><span>Risk score</span><strong>${escapeHtml(record.riskLabel)}</strong></div>
      <div><span>Water access</span><strong>${escapeHtml(record.drinkingWaterDisplay || "N/A")}</strong></div>
      <div><span>Sanitation</span><strong>${escapeHtml(record.sanitationDisplay || "N/A")}</strong></div>
    </div>
    <div class="map-drawer-actions">
      <a id="mapOpenGuidance" class="primary-button" href="${guidanceHref}">${featuredMeta ? "Open flagship guidance" : "Open guidance"}</a>
      <a id="mapAskAssistant" class="secondary-button" href="${buildAssistantHref(record)}">Ask assistant</a>
    </div>
  `;
}

function renderPlaceDrawer(payload, candidate) {
  const { region, liveData } = payload;
  const placeLabel = candidate?.label || region.name;
  const fallbackLabel =
    candidate?.matchedQuery && candidate.matchedQuery.toLowerCase() !== placeLabel.toLowerCase()
      ? `Using a broader match from ${candidate.matchedQuery}.`
      : "Using local weather with country-level water access data for this place.";

  return `
    <div class="map-drawer-head">
      <div>
        <p class="eyebrow">Selected place</p>
        <h2>${escapeHtml(region.flag || "🌍")} ${escapeHtml(region.name)}</h2>
      </div>
      ${renderStatusBadge(region)}
    </div>
    <p class="map-drawer-copy">${escapeHtml(region.quickSummary || region.oneLiner)}</p>
    <div class="map-place-note">${escapeHtml(fallbackLabel)}</div>
    <div class="map-stat-grid">
      <div><span>Quality index</span><strong>${escapeHtml(`${region.qualityIndex}/100`)}</strong></div>
      <div><span>Water access</span><strong>${escapeHtml(liveData?.drinkingWater?.display || "Unavailable")}</strong></div>
      <div><span>Sanitation</span><strong>${escapeHtml(liveData?.sanitation?.display || "Unavailable")}</strong></div>
      <div><span>Weather</span><strong>${escapeHtml(liveData?.weather ? `${liveData.weather.temperatureC}°C` : "Unavailable")}</strong></div>
      <div><span>Conditions</span><strong>${escapeHtml(liveData?.weather?.label || region.country || "Unavailable")}</strong></div>
    </div>
    <div class="map-drawer-actions">
      <a class="primary-button" href="${buildRegionHrefFromCandidate(candidate, "../")}">Open city guidance</a>
      <a class="secondary-button" href="${buildAssistantHrefForPlace(region)}">Ask assistant</a>
    </div>
  `;
}

function renderPlaceDrawerPending(candidate) {
  return `
    <div class="map-drawer-head">
      <div>
        <p class="eyebrow">Selected place</p>
        <h2>${escapeHtml(candidate.label)}</h2>
      </div>
      <div class="status-badge status-badge-unavailable" role="status" aria-label="Loading place details">
        <span class="status-dot" aria-hidden="true">…</span>
        <span>Loading details</span>
      </div>
    </div>
    <p class="map-drawer-copy">Dropping into this place now. Aqua Guide is pulling local weather and broader water-access indicators for the closest supported region.</p>
    <div class="map-stat-grid map-stat-grid-pending">
      <div><span>Quality index</span><strong>Loading...</strong></div>
      <div><span>Water access</span><strong>Loading...</strong></div>
      <div><span>Sanitation</span><strong>Loading...</strong></div>
      <div><span>Weather</span><strong>Loading...</strong></div>
      <div><span>Conditions</span><strong>${escapeHtml(candidate.country || "Loading...")}</strong></div>
    </div>
  `;
}

function buildMapLayout() {
  const hotspots = featuredRegions
    .map((region) => getCountryWaterRecord(region.countryIso3))
    .filter(Boolean);
  return `
    <div class="page-shell">
      <section class="map-page">
        <div class="section-head">
          <div>
            <p class="section-label">Global overview</p>
            <h1>Flagship country map</h1>
          </div>
          <p class="section-meta">Click a featured country or search any city.</p>
        </div>
        <div class="map-layout">
          <div class="map-panel">
            <div class="map-toolbar">
              <div class="search-stack">
                <form id="mapSearchForm" class="search-bar compact-search">
                  <div class="search-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </div>
                  <input id="mapSearchInput" type="text" placeholder="Search a city, district, state, or country" autocomplete="off" />
                  <button class="primary-button" type="submit">Find place</button>
                </form>
                <div id="mapSearchSuggestions" class="search-suggestions map-search-suggestions" hidden></div>
              </div>
              <div class="map-legend" aria-label="Risk legend">
                <span><i class="legend-swatch legend-advisory"></i>High pressure</span>
                <span><i class="legend-swatch legend-caution"></i>Watch closely</span>
                <span><i class="legend-swatch legend-safe"></i>Stronger access</span>
                <span><i class="legend-swatch legend-unavailable"></i>Data limited</span>
              </div>
            </div>
            <div id="mapCanvasShell" class="map-canvas-shell is-loading">
              <div id="worldMap" class="world-map"></div>
              <div id="mapLoading" class="map-loading">Loading countries...</div>
            </div>
            <div class="hotspot-strip">
              <div class="section-head compact">
                <div>
                  <p class="section-label">Flagship stories</p>
                  <h2>The four countries to present</h2>
                </div>
              </div>
              <div class="hotspot-row">${hotspots.map(renderHotspotButton).join("")}</div>
            </div>
          </div>
          <aside id="mapDrawer" class="map-drawer">
            <p class="eyebrow">How to use this map</p>
            <h2>Start with Bangladesh, Kenya, Mozambique, or Haiti</h2>
            <p>The map is curated for the four presentation countries, but search can still jump to any city and pull local weather plus country-level access signals.</p>
          </aside>
        </div>
      </section>
    </div>
  `;
}

function styleForRecord(record, isSelected = false) {
  const status = record?.status || "unavailable";
  const isFeatured = Boolean(record?.iso3 && featuredCountryIso3Set.has(record.iso3));
  return {
    color: isSelected ? "#fff7ed" : isFeatured ? riskBorderPalette[status] : "#cbd5e1",
    weight: isSelected ? 2.2 : isFeatured ? 1 : 0.8,
    fillColor: isFeatured ? riskPalette[status] : "#e5e7eb",
    fillOpacity: isSelected ? 0.9 : isFeatured ? 0.74 : 0.38
  };
}

function setDrawerTheme(drawer, status) {
  drawer.className = `map-drawer map-drawer-${status || "unavailable"}`;
}

async function init() {
  renderShell({ basePath: "../", activeNav: "map" });
  setDocumentTitle("Map");

  const main = document.getElementById("main");
  main.innerHTML = buildMapLayout();

  const drawer = document.getElementById("mapDrawer");
  const loading = document.getElementById("mapLoading");
  const mapCanvasShell = document.getElementById("mapCanvasShell");
  const searchInput = document.getElementById("mapSearchInput");
  const selectedState = { iso3: "", placeMarker: null };

  const map = L.map("worldMap", {
    attributionControl: false,
    zoomControl: true,
    scrollWheelZoom: true,
    dragging: true,
    tap: false,
    minZoom: 0,
    maxZoom: 8
  });

  const countryLayers = new Map();

  function clearPlaceMarker() {
    if (selectedState.placeMarker) {
      selectedState.placeMarker.remove();
      selectedState.placeMarker = null;
    }
  }

  function focusLayer(layer, maxZoom = 4) {
    const bounds = layer.getBounds();
    if (!bounds.isValid()) return;
    const currentBounds = map.getBounds();
    if (!currentBounds.isValid() || !currentBounds.pad(-0.18).contains(bounds)) {
      map.flyToBounds(bounds, { padding: [28, 28], maxZoom, duration: 0.7 });
    }
  }

  function selectCountryByIso3(iso3, options = {}) {
    const record = getCountryWaterRecord(iso3);
    if (!record) return;

    selectedState.iso3 = iso3;
    if (!options.keepPlaceMarker) {
      clearPlaceMarker();
    }

    setDrawerTheme(drawer, record.status);
    drawer.innerHTML = renderCountryDrawer(record);

    countryLayers.forEach((layer, layerIso3) => {
      layer.setStyle(styleForRecord(getCountryWaterRecord(layerIso3), layerIso3 === iso3));
    });

    if (!options.skipFocus) {
      const layer = countryLayers.get(iso3);
      if (layer) {
        focusLayer(layer, 4);
      }
    }
  }

  async function handleCandidate(candidate) {
    showToast(`Loading guidance for ${candidate.label}...`);
    clearPlaceMarker();
    selectedState.placeMarker = L.circleMarker([candidate.lat, candidate.lng], {
      radius: 8,
      color: "#0f172a",
      weight: 2,
      fillColor: "#ffffff",
      fillOpacity: 0.92
    })
      .addTo(map)
      .bindTooltip(candidate.label, { direction: "top", offset: [0, -10] });

    setDrawerTheme(drawer, "unavailable");
    drawer.innerHTML = renderPlaceDrawerPending(candidate);
    map.flyTo([candidate.lat, candidate.lng], Math.max(map.getZoom(), 6), { duration: 0.55 });

    const payload = await resolveDynamicPayloadFromCoordinates({
      lat: candidate.lat,
      lng: candidate.lng,
      name: candidate.name,
      admin1: candidate.admin1,
      country: candidate.country,
      iso2: candidate.countryCode
    });

    if (payload.region.countryIso3) {
      selectCountryByIso3(payload.region.countryIso3, { keepPlaceMarker: true, skipFocus: true });
    }

    setDrawerTheme(drawer, payload.region.status);
    drawer.innerHTML = renderPlaceDrawer(payload, candidate);
  }

  async function handleSearchQuery(query) {
    const candidates = await searchPlaceCandidates(query, 6);
    if (!candidates.length) {
      showToast("No exact city match yet. Try a larger region or country.");
      return;
    }
    await handleCandidate(candidates[0]);
  }

  loading.hidden = false;
  loading.textContent = "Loading countries...";
  const topology = await fetch("../data/world-countries.topo.json").then((response) => response.json());
  const worldFeatureCollection = window.topojson.feature(topology, topology.objects.countries);

  const geoLayer = L.geoJSON(worldFeatureCollection, {
    filter(feature) {
      const numericCode = String(feature?.id || "").padStart(3, "0");
      return numericCode !== "010";
    },
    style(feature) {
      const record = getCountryWaterRecordByNumericCode(String(feature?.id || "").padStart(3, "0"));
      return styleForRecord(record, record?.iso3 === selectedState.iso3);
    },
    onEachFeature(feature, layer) {
      const numericCode = String(feature?.id || "").padStart(3, "0");
      const record =
        getCountryWaterRecordByNumericCode(numericCode) || {
          iso3: "",
          country: feature?.properties?.name || "Unknown country",
          status: "unavailable",
          statusLabel: "Data limited",
          riskLabel: "N/A"
        };

      if (record.iso3) {
        countryLayers.set(record.iso3, layer);
      }

      layer.bindTooltip(`${record.country} - ${record.riskLabel}`, { sticky: true, direction: "auto" });
      layer.on("click", () => {
        if (record.iso3) {
          selectCountryByIso3(record.iso3);
        }
      });
      layer.on("mouseover", () => {
        if (record.iso3 && record.iso3 !== selectedState.iso3) {
          layer.setStyle({ weight: 1.8, fillOpacity: 0.84 });
        }
      });
      layer.on("mouseout", () => {
        layer.setStyle(styleForRecord(record, record.iso3 === selectedState.iso3));
      });
    }
  }).addTo(map);

  function decorateInteractiveLayers() {
    geoLayer.eachLayer((layer) => {
      const numericCode = String(layer.feature?.id || "").padStart(3, "0");
      const record = getCountryWaterRecordByNumericCode(numericCode);
      const element = layer.getElement?.();
      if (!element || !record?.iso3) return;
      element.dataset.iso3 = record.iso3;
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", `Open ${record.country} details`);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCountryByIso3(record.iso3);
        }
      });
    });
  }

  const bounds = geoLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [16, 16] });
    map.setMaxBounds(bounds.pad(0.15));
  }

  map.whenReady(() => {
    window.requestAnimationFrame(decorateInteractiveLayers);
  });

  mapCanvasShell.classList.remove("is-loading");
  loading.hidden = true;

  attachPlaceSearch({
    formSelector: "#mapSearchForm",
    inputSelector: "#mapSearchInput",
    suggestionsSelector: "#mapSearchSuggestions",
    onCandidate: handleCandidate,
    onRawSubmit: handleSearchQuery
  });

  document.querySelectorAll("[data-hotspot-iso3]").forEach((button) => {
    button.addEventListener("click", () => selectCountryByIso3(button.getAttribute("data-hotspot-iso3")));
  });

}

init().catch((error) => {
  console.error(error);
  document.getElementById("mapCanvasShell")?.classList.remove("is-loading");
  document.getElementById("mapLoading")?.replaceChildren("Could not load the interactive map right now.");
  const drawer = document.getElementById("mapDrawer");
  if (drawer) {
    drawer.className = "map-drawer map-drawer-unavailable";
    drawer.innerHTML = `
      <p class="eyebrow">Map unavailable</p>
      <h2>We could not load the global layer</h2>
      <p>${escapeHtml(error instanceof Error ? error.message : "Please try again in a moment.")}</p>
    `;
  }
});
