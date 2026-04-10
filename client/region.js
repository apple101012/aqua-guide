import { findRegionByQuery, getMostCriticalRegion } from "../data/regions.js";
import { detectUserLocationReference, buildTrackedPayload, hydrateTrackedPayload, resolveDynamicPayloadFromCoordinates, resolveDynamicPayloadFromQuery } from "./location-service.js";
import {
  bindActionModal,
  escapeHtml,
  iconSvg,
  isFavorite,
  renderActions,
  renderHighlights,
  renderModalShell,
  renderNotFoundState,
  renderRegionBreadcrumb,
  renderShell,
  renderSources,
  renderStatusBadge,
  setActiveLocationContext,
  setDocumentTitle,
  setLastLocationReference,
  showToast,
  toggleFavorite
} from "./common.js";
import { attachPlaceSearch } from "./place-search.js";

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function renderMetricCard(label, value, footnote) {
  return `
    <article class="live-metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${footnote}</p>
    </article>
  `;
}

function buildHeroMetricItems(payload) {
  const { region, liveData } = payload;
  if (!liveData) {
    return [
      { label: "Basic water access", value: "Loading...", footnote: "Pulling latest public data" },
      { label: "Sanitation", value: "Loading...", footnote: "Pulling latest public data" },
      { label: "Weather", value: "Loading...", footnote: "Pulling latest public data" },
      { label: "Updated", value: escapeHtml(region?.metrics?.updated || "Live public data"), footnote: "Current page context" }
    ];
  }

  return [
    {
      label: "Basic water access",
      value: liveData.drinkingWater?.display || "Unavailable",
      footnote: liveData.drinkingWater ? `${liveData.drinkingWater.year} · World Bank` : "Country-level source unavailable"
    },
    {
      label: "Sanitation",
      value: liveData.sanitation?.display || "Unavailable",
      footnote: liveData.sanitation ? `${liveData.sanitation.year} · World Bank` : "Country-level source unavailable"
    },
    {
      label: "Weather",
      value: liveData.weather ? `${liveData.weather.temperatureC}°C · ${liveData.weather.label}` : "Unavailable",
      footnote: liveData.weather ? `Wind ${liveData.weather.windKmh} km/h · Precip ${liveData.weather.precipitationMm} mm` : "Local weather unavailable"
    },
    {
      label: "Updated",
      value: "Live now",
      footnote: payload.region.tracked ? "Curated guidance + live context" : "Search result built from public data"
    }
  ];
}

function buildLiveContext(payload) {
  const { liveData } = payload;
  return `
    <section id="liveContextMount" class="live-context-section">
      <div class="section-head">
        <div>
          <p class="section-label">Live context</p>
          <h2>Country indicators and weather around this place</h2>
        </div>
        <p class="section-meta">Aqua Guide uses local weather and country-level public indicators to make the guidance faster to understand.</p>
      </div>
      <div class="live-metric-grid">
        ${renderMetricCard(
          "Basic drinking water access",
          liveData?.drinkingWater ? liveData.drinkingWater.display : "Loading...",
          liveData?.drinkingWater ? `${liveData.drinkingWater.year} · World Bank` : "Waiting on latest source"
        )}
        ${renderMetricCard(
          "Basic sanitation access",
          liveData?.sanitation ? liveData.sanitation.display : "Loading...",
          liveData?.sanitation ? `${liveData.sanitation.year} · World Bank` : "Waiting on latest source"
        )}
        ${renderMetricCard(
          "Population",
          liveData?.population ? liveData.population.display : "Loading...",
          liveData?.population ? `${liveData.population.year} · Country context` : "Waiting on latest source"
        )}
        ${renderMetricCard(
          "Current weather",
          liveData?.weather ? `${liveData.weather.temperatureC}°C · ${liveData.weather.label}` : "Loading...",
          liveData?.weather ? `Wind ${liveData.weather.windKmh} km/h · Precip ${liveData.weather.precipitationMm} mm` : "Waiting on latest source"
        )}
      </div>
    </section>
  `;
}

function buildResolverCopy(payload) {
  if (payload.match === "exact-region") {
    return "Showing the featured region that best matches your search.";
  }
  if (payload.match === "dynamic-place" && payload.resolvedPlace) {
    return `Showing live guidance for ${payload.resolvedPlace.name}, built from public country indicators and local weather.`;
  }
  if (payload.match === "detected-location" && payload.resolvedPlace) {
    return `Showing live guidance for your detected location near ${payload.resolvedPlace.name}.`;
  }
  return "";
}

function buildAssistantHref(region, question) {
  const url = new URL("/assistant/", window.location.origin);
  if (region.tracked) {
    url.searchParams.set("region", region.id);
  } else {
    url.searchParams.set("q", region.name);
  }
  url.searchParams.set("question", question);
  return `${url.pathname}${url.search}`;
}

function buildRegionPage(payload) {
  const { region } = payload;
  const resolverCopy = buildResolverCopy(payload);
  const heroMetrics = buildHeroMetricItems(payload);
  const saved = isFavorite(region.id);

  return `
    <div class="page-shell">
      ${renderRegionBreadcrumb(region)}
      <section class="hero hero-region">
        <div class="hero-grid region-hero-grid">
          <div class="hero-copy">
            <p class="hero-kicker">${escapeHtml(region.tag)}</p>
            <h1>${escapeHtml(region.name)}</h1>
            <p>${escapeHtml(region.heroDescription)}</p>
            <div class="hero-copy-cluster">
              <span class="meta-pill">${escapeHtml(region.utility)}</span>
              <span class="meta-pill">${escapeHtml(region.recordLabel)}</span>
            </div>
          </div>
          <aside class="hero-status-card solid hero-status-card-${escapeHtml(region.status)}">
            <div class="hero-status-top">
              <p class="eyebrow">Place status</p>
              ${renderStatusBadge(region)}
            </div>
            <h2>Quality index <span id="heroQualityIndex">${escapeHtml(region.qualityIndex)}</span>/100</h2>
            <div id="heroMetricGrid" class="hero-detail-grid">
              ${heroMetrics
                .map(
                  (item) => `
                    <div>
                      <span>${escapeHtml(item.label)}</span>
                      <strong>${escapeHtml(item.value)}</strong>
                    </div>
                  `
                )
                .join("")}
            </div>
            <div class="hero-card-actions">
              <button id="saveRegionButton" class="secondary-button" type="button">${saved ? "Saved" : "Save place"}</button>
              <button id="copySummaryButton" class="ghost-button" type="button">Copy summary</button>
            </div>
            <div class="hero-assistant-chips">
              ${region.aiSuggestions
                .slice(0, 3)
                .map(
                  (question) => `
                    <a class="helper-chip" href="${buildAssistantHref(region, question)}">${escapeHtml(question)}</a>
                  `
                )
                .join("")}
            </div>
          </aside>
        </div>
      </section>

      ${renderHighlights(region)}
      ${renderActions(region)}
      ${renderSources(region)}
      <section class="assistant-inline assistant-inline-compact">
        <div class="section-head">
          <div>
            <p class="section-label">Need a follow-up?</p>
            <h2>Open Aqua Assistant with this place already loaded</h2>
          </div>
        </div>
        <div class="helper-row">
          ${region.aiSuggestions
            .slice(0, 4)
            .map(
              (question) => `
                <a class="helper-chip" href="${buildAssistantHref(region, question)}">${escapeHtml(question)}</a>
              `
            )
            .join("")}
        </div>
      </section>
      <section class="search-section search-section-inline search-section-footer">
        <div class="section-head compact">
          <div><h2>Search another place</h2></div>
          <p class="section-meta">${escapeHtml(resolverCopy || "Global search still works if you need another city or country.")}</p>
        </div>
        <div class="search-stack">
          <form id="regionSearchForm" class="search-bar">
            <div class="search-icon">${iconSvg.search}</div>
            <input id="regionSearchInput" type="text" placeholder="Search another city, country, or featured region" autocomplete="off" />
            <button class="primary-button" type="submit">Open guidance</button>
          </form>
          <div id="regionSearchSuggestions" class="search-suggestions" hidden></div>
        </div>
        <div id="toast" class="toast" role="status" aria-live="polite"></div>
      </section>
      ${renderModalShell()}
    </div>
  `;
}

function buildCopySummary(payload) {
  const { region, liveData } = payload;
  return [
    `${region.name} · ${region.statusLabel}`,
    region.quickSummary,
    liveData?.drinkingWater ? `Basic drinking water access: ${liveData.drinkingWater.display} (${liveData.drinkingWater.year}, World Bank)` : null,
    liveData?.sanitation ? `Basic sanitation access: ${liveData.sanitation.display} (${liveData.sanitation.year}, World Bank)` : null,
    liveData?.weather ? `Current weather: ${liveData.weather.temperatureC}°C, ${liveData.weather.label}, wind ${liveData.weather.windKmh} km/h` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFavoriteEntry(payload) {
  const href = `/region/${window.location.search || `?id=${encodeURIComponent(payload.region.id)}`}`;
  return {
    id: payload.region.id,
    name: payload.region.name,
    flag: payload.region.flag || "🌍",
    status: payload.region.status,
    statusLabel: payload.region.statusLabel,
    href
  };
}

function syncPayloadPersistence(payload) {
  setActiveLocationContext(payload.region);
  if (payload.region.tracked) {
    setLastLocationReference({ type: "id", value: payload.region.id });
    return;
  }

  const query = getParam("q");
  setLastLocationReference({
    type: "query",
    value: query || payload.region.name
  });
}

function refreshLiveUi(payload) {
  const heroMetricGrid = document.getElementById("heroMetricGrid");
  if (heroMetricGrid) {
    heroMetricGrid.innerHTML = buildHeroMetricItems(payload)
      .map(
        (item) => `
          <div>
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>
        `
      )
      .join("");
  }

  const liveContext = document.getElementById("liveContextMount");
  if (liveContext) {
    liveContext.outerHTML = buildLiveContext(payload);
  }
}

async function loadInitialPayload() {
  const id = getParam("id");
  const query = getParam("q");
  const lat = getParam("lat");
  const lng = getParam("lng");

  if (id) {
    return {
      payload: buildTrackedPayload(id),
      hydrate: true
    };
  }

  if (query) {
    const trackedRegion = findRegionByQuery(query);
    if (trackedRegion) {
      return {
        payload: buildTrackedPayload(trackedRegion, {
          match: "exact-region",
          resolvedPlace: { name: trackedRegion.name }
        }),
        hydrate: true
      };
    }

    return {
      payload: await resolveDynamicPayloadFromQuery(query),
      hydrate: false
    };
  }

  if (lat && lng) {
    return {
      payload: await resolveDynamicPayloadFromCoordinates({
        lat,
        lng,
        name: getParam("name"),
        admin1: getParam("admin1"),
        country: getParam("country"),
        iso2: getParam("iso2")
      }),
      hydrate: false
    };
  }

  return {
    payload: buildTrackedPayload(getMostCriticalRegion().id),
    hydrate: true
  };
}

async function init() {
  renderShell({ basePath: "../", activeNav: "regions" });
  setDocumentTitle("Region");

  const main = document.getElementById("main");
  main.innerHTML = `
    <div class="page-shell">
      <section class="loading-state">
        <p class="section-label">Loading</p>
        <h1>Preparing the latest region guidance.</h1>
      </section>
    </div>
  `;

  try {
    const { payload, hydrate } = await loadInitialPayload();
    if (!payload?.region) {
      main.innerHTML = `<div class="page-shell">${renderNotFoundState("../")}</div>`;
      return;
    }

    let currentPayload = payload;
    syncPayloadPersistence(currentPayload);
    setDocumentTitle(currentPayload.region.name);
    main.innerHTML = buildRegionPage(currentPayload);

  attachPlaceSearch({
    formSelector: "#regionSearchForm",
    inputSelector: "#regionSearchInput",
    suggestionsSelector: "#regionSearchSuggestions",
    basePath: "../"
  });
    bindActionModal(currentPayload.region);

    document.getElementById("saveRegionButton")?.addEventListener("click", () => {
      const saved = toggleFavorite(buildFavoriteEntry(currentPayload));
      document.getElementById("saveRegionButton").textContent = saved ? "Saved" : "Save place";
      showToast(saved ? "Place saved" : "Place removed");
    });

    document.getElementById("copySummaryButton")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(buildCopySummary(currentPayload));
        showToast("Summary copied");
      } catch {
        showToast("Unable to copy summary right now");
      }
    });

    document.getElementById("useLocationButton")?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        showToast("Geolocation is not supported in this browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const detected = await detectUserLocationReference(position.coords);
            const url = new URL("/region/", window.location.origin);
            url.searchParams.set("lat", String(detected.lat));
            url.searchParams.set("lng", String(detected.lng));
            if (detected.name) url.searchParams.set("name", detected.name);
            if (detected.admin1) url.searchParams.set("admin1", detected.admin1);
            if (detected.country) url.searchParams.set("country", detected.country);
            if (detected.iso2) url.searchParams.set("iso2", detected.iso2);
            window.location.href = url.toString();
          } catch (error) {
            showToast(error instanceof Error ? error.message : "Unable to match your location");
          }
        },
        () => showToast("Unable to read your location right now"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    if (hydrate) {
      hydrateTrackedPayload(currentPayload)
        .then((nextPayload) => {
          currentPayload = nextPayload;
          syncPayloadPersistence(currentPayload);
          refreshLiveUi(currentPayload);
        })
        .catch(() => {
          showToast("Live context is temporarily unavailable");
        });
    }
  } catch (error) {
    main.innerHTML = `
      <div class="page-shell">
        <section class="empty-state">
          <p class="section-label">Unavailable</p>
          <h1>We could not load this place.</h1>
          <p>${escapeHtml(error instanceof Error ? error.message : "Unknown error")}</p>
        </section>
      </div>
    `;
  }
}

init();
