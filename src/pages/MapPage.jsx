import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { geoMercator, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import {
  getCountryWaterRecord,
  getCountryWaterRecordByNumericCode,
} from "../../data/country-water-index";
import { regions } from "../../data/regions";
import { resolveDynamicPayloadFromCoordinates } from "../services/location-service";
import { getAssistantLanguage } from "../lib/common";
import PlaceSearch from "../components/PlaceSearch";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/Toast";

const CARD_WIDTH = 360;
const CARD_HEIGHT = 220;
const CARD_PADDING = 20;

const riskPalette = {
  advisory: "#bf5252",
  caution: "#cb9836",
  safe: "#3ea978",
  unavailable: "#5d7387",
};

const riskBorderPalette = {
  advisory: "#ffd6d5",
  caution: "#ffe2ad",
  safe: "#d5ffea",
  unavailable: "#89a1b4",
};

const featuredRegions = regions.slice(0, 4);
const featuredCountryIso3Set = new Set(featuredRegions.map((region) => region.countryIso3));
const featuredCountryMeta = new Map(
  featuredRegions.map((region) => [
    region.countryIso3,
    {
      regionId: region.id,
      regionName: region.name,
      quickSummary: region.quickSummary,
      utility: region.utility,
    },
  ])
);

function buildGuidanceHref(record) {
  const params = new URLSearchParams();
  if (Number.isFinite(record.lat) && Number.isFinite(record.lng)) {
    params.set("lat", String(record.lat));
    params.set("lng", String(record.lng));
    params.set("name", record.country);
    params.set("country", record.country);
    params.set("iso2", record.iso2);
  } else {
    params.set("q", record.country);
  }
  return `/countries?${params.toString()}`;
}

function buildAssistantHref(record) {
  const params = new URLSearchParams();
  if (Number.isFinite(record.lat) && Number.isFinite(record.lng)) {
    params.set("lat", String(record.lat));
    params.set("lng", String(record.lng));
    params.set("name", record.country);
    params.set("country", record.country);
    params.set("iso2", record.iso2);
  } else {
    params.set("q", record.country);
  }
  params.set("lang", getAssistantLanguage());
  return `/assistant?${params.toString()}`;
}

function buildAssistantHrefForPlace(region) {
  const params = new URLSearchParams();
  params.set("lat", String(region.coordinates.lat));
  params.set("lng", String(region.coordinates.lng));
  params.set("name", region.name.split(",")[0] || region.name);
  params.set("country", region.country || "");
  params.set("iso2", region.countryIso2 || "");
  params.set("admin1", region.name.split(",").slice(1, 2).join("").trim());
  params.set("lang", getAssistantLanguage());
  return `/assistant?${params.toString()}`;
}

function buildRegionHrefFromCandidate(candidate) {
  const params = new URLSearchParams();
  if (candidate.lat != null && candidate.lng != null) {
    params.set("lat", String(candidate.lat));
    params.set("lng", String(candidate.lng));
    if (candidate.name) params.set("name", candidate.name);
    if (candidate.admin1) params.set("admin1", candidate.admin1);
    if (candidate.country) params.set("country", candidate.country);
    if (candidate.countryCode) params.set("iso2", candidate.countryCode);
  } else {
    params.set("q", candidate.name || candidate.label || "");
  }
  return `/countries?${params.toString()}`;
}

function getCountrySummary(record) {
  if (!Number.isFinite(record.drinkingWaterValue) && !Number.isFinite(record.sanitationValue)) {
    return `${record.country} is available for click-through guidance, but the latest country-level access indicators were unavailable during dataset generation.`;
  }
  return `${record.country} reports ${record.drinkingWaterDisplay || "N/A"} basic drinking water access and ${record.sanitationDisplay || "N/A"} basic sanitation access.`;
}

function CountryDrawer({ record }) {
  const meta = featuredCountryMeta.get(record.iso3);
  const guidanceHref = meta?.regionId
    ? `/countries?id=${encodeURIComponent(meta.regionId)}`
    : buildGuidanceHref(record);

  return (
    <>
      <div className="map-drawer-head">
        <div>
          <p className="eyebrow">Selected country</p>
          <h2>
            {record.flag || "\u{1F30D}"} {record.country}
          </h2>
        </div>
        <StatusBadge status={record.status} statusLabel={record.statusLabel} />
      </div>
      <p className="map-drawer-copy">{meta?.quickSummary || getCountrySummary(record)}</p>
      <div className="map-stat-grid">
        <div>
          <span>Quality index</span>
          <strong>{record.qualityIndexLabel}</strong>
        </div>
        <div>
          <span>Risk score</span>
          <strong>{record.riskLabel}</strong>
        </div>
        <div>
          <span>Water access</span>
          <strong>{record.drinkingWaterDisplay || "N/A"}</strong>
        </div>
        <div>
          <span>Sanitation</span>
          <strong>{record.sanitationDisplay || "N/A"}</strong>
        </div>
      </div>
      <div className="map-drawer-actions">
        <Link id="mapOpenGuidance" className="primary-button" to={guidanceHref}>
          {meta ? "Open featured guidance" : "Open guidance"}
        </Link>
        <Link id="mapAskAssistant" className="secondary-button" to={buildAssistantHref(record)}>
          Ask assistant
        </Link>
      </div>
    </>
  );
}

function PlaceDrawer({ payload, candidate }) {
  const { region, liveData } = payload;
  const fallbackLabel =
    candidate?.matchedQuery && candidate.matchedQuery.toLowerCase() !== (candidate.label || "").toLowerCase()
      ? `Using a broader match from ${candidate.matchedQuery}.`
      : "Using local weather with country-level water access data for this place.";

  return (
    <>
      <div className="map-drawer-head">
        <div>
          <p className="eyebrow">Selected place</p>
          <h2>
            {region.flag || "\u{1F30D}"} {region.name}
          </h2>
        </div>
        <StatusBadge status={region.status} statusLabel={region.statusLabel} />
      </div>
      <p className="map-drawer-copy">{region.quickSummary || region.oneLiner}</p>
      <div className="map-place-note">{fallbackLabel}</div>
      <div className="map-stat-grid">
        <div>
          <span>Quality index</span>
          <strong>{region.qualityIndex}/100</strong>
        </div>
        <div>
          <span>Water access</span>
          <strong>{liveData?.drinkingWater?.display || "Unavailable"}</strong>
        </div>
        <div>
          <span>Sanitation</span>
          <strong>{liveData?.sanitation?.display || "Unavailable"}</strong>
        </div>
        <div>
          <span>Weather</span>
          <strong>{liveData?.weather ? `${liveData.weather.temperatureC}°C` : "Unavailable"}</strong>
        </div>
        <div>
          <span>Conditions</span>
          <strong>{liveData?.weather?.label || region.country || "Unavailable"}</strong>
        </div>
      </div>
      <div className="map-drawer-actions">
        <Link className="primary-button" to={buildRegionHrefFromCandidate(candidate)}>
          Open city guidance
        </Link>
        <Link className="secondary-button" to={buildAssistantHrefForPlace(region)}>
          Ask assistant
        </Link>
      </div>
    </>
  );
}

function PlaceDrawerPending({ candidate }) {
  return (
    <>
      <div className="map-drawer-head">
        <div>
          <p className="eyebrow">Selected place</p>
          <h2>{candidate.label}</h2>
        </div>
        <div className="status-badge status-badge-unavailable" role="status" aria-label="Loading place details">
          <span className="status-dot" aria-hidden="true">
            &hellip;
          </span>
          <span>Loading details</span>
        </div>
      </div>
      <p className="map-drawer-copy">
        Pulling local weather and broader water-access indicators for this place now.
      </p>
      <div className="map-stat-grid map-stat-grid-pending">
        <div>
          <span>Quality index</span>
          <strong>Loading...</strong>
        </div>
        <div>
          <span>Water access</span>
          <strong>Loading...</strong>
        </div>
        <div>
          <span>Sanitation</span>
          <strong>Loading...</strong>
        </div>
        <div>
          <span>Weather</span>
          <strong>Loading...</strong>
        </div>
        <div>
          <span>Conditions</span>
          <strong>{candidate.country || "Loading..."}</strong>
        </div>
      </div>
    </>
  );
}

function mapShapeStyle(record, isSelected) {
  const status = record?.status || "unavailable";
  return {
    fill: riskPalette[status],
    stroke: isSelected ? "#f8fafc" : riskBorderPalette[status],
    strokeWidth: isSelected ? 3.2 : 1.6,
    opacity: isSelected ? 1 : 0.94,
  };
}

function buildSpotlightModel(feature, record) {
  const projection = geoMercator().fitExtent(
    [
      [CARD_PADDING, CARD_PADDING],
      [CARD_WIDTH - CARD_PADDING, CARD_HEIGHT - CARD_PADDING],
    ],
    feature
  );
  const path = geoPath(projection);
  const d = path(feature);
  const centroid = path.centroid(feature);

  if (!d || Number.isNaN(centroid[0]) || Number.isNaN(centroid[1])) {
    return null;
  }

  return { record, d, centroid };
}

export default function MapPage() {
  const { showToast } = useToast();
  const [drawer, setDrawer] = useState({ type: "empty", data: null, status: "unavailable" });
  const [selectedIso3, setSelectedIso3] = useState("KEN");
  const [mapFeatures, setMapFeatures] = useState([]);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    document.title = "Map - Aqua Guide";
  }, []);

  const selectCountryByIso3 = useCallback((iso3) => {
    const record = getCountryWaterRecord(iso3);
    if (!record) return;
    setSelectedIso3(iso3);
    setDrawer({ type: "country", data: record, status: record.status });
  }, []);

  const handleCandidate = useCallback(
    async (candidate) => {
      showToast(`Loading guidance for ${candidate.label || candidate.name}...`);
      setDrawer({ type: "loading", data: candidate, status: "unavailable" });

      try {
        const payload = await resolveDynamicPayloadFromCoordinates({
          lat: candidate.lat,
          lng: candidate.lng,
          name: candidate.name,
          admin1: candidate.admin1,
          country: candidate.country,
          iso2: candidate.countryCode,
        });

        if (payload.region.countryIso3 && featuredCountryIso3Set.has(payload.region.countryIso3)) {
          setSelectedIso3(payload.region.countryIso3);
        }

        setDrawer({
          type: "place",
          data: { payload, candidate },
          status: payload.region.status,
        });
      } catch {
        showToast("Could not load place details");
      }
    },
    [showToast]
  );

  const handleSearchSubmit = useCallback(
    async (query) => {
      if (!query.trim()) return;
      try {
        const { searchPlaceCandidates } = await import("../services/location-service");
        const candidates = await searchPlaceCandidates(query, 6);
        if (!candidates.length) {
          showToast("No exact city match yet. Try a larger region or country.");
          return;
        }
        await handleCandidate(candidates[0]);
      } catch {
        showToast("Search failed. Please try again.");
      }
    },
    [handleCandidate, showToast]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFeaturedMap() {
      try {
        setMapReady(false);
        const response = await fetch("/data/world-countries.topo.json");
        const topology = await response.json();
        if (cancelled) return;

        const featureCollection = topojson.feature(topology, topology.objects.countries);
        const featured = featureCollection.features.filter((feature) => {
          const record = getCountryWaterRecordByNumericCode(String(feature?.id || "").padStart(3, "0"));
          return Boolean(record?.iso3 && featuredCountryIso3Set.has(record.iso3));
        });

        setMapFeatures(featured);
        setMapReady(true);
        setMapError("");
      } catch (error) {
        if (cancelled) return;
        setMapError(error instanceof Error ? error.message : "Could not load the featured map.");
      }
    }

    loadFeaturedMap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (drawer.type === "empty") {
      selectCountryByIso3("KEN");
    }
  }, [drawer.type, selectCountryByIso3]);

  const spotlightCards = useMemo(() => {
    const featureByIso3 = new Map(
      mapFeatures
        .map((feature) => {
          const record = getCountryWaterRecordByNumericCode(String(feature?.id || "").padStart(3, "0"));
          return record ? [record.iso3, feature] : null;
        })
        .filter(Boolean)
    );

    return featuredRegions
      .map((region) => {
        const record = getCountryWaterRecord(region.countryIso3);
        const feature = featureByIso3.get(region.countryIso3);
        if (!record || !feature) return null;
        const shape = buildSpotlightModel(feature, record);
        if (!shape) return null;
        return {
          ...shape,
          meta: featuredCountryMeta.get(record.iso3),
        };
      })
      .filter(Boolean);
  }, [mapFeatures]);

  const drawerClass = `map-drawer map-drawer-${drawer.status || "unavailable"}`;

  return (
    <div className="page-shell">
      <section className="map-page">
        <div className="section-head">
          <div>
            <p className="section-label">Featured overview</p>
            <h1>Featured country map</h1>
          </div>
          <p className="section-meta">Keep the story tight: four countries up front, any city still searchable.</p>
        </div>

        <div className="map-layout">
          <div className="map-panel">
            <div className="map-toolbar">
              <PlaceSearch
                onSelect={handleCandidate}
                onSubmit={handleSearchSubmit}
                placeholder="Search a city, district, state, or country"
                buttonText="Find place"
                compact
                darkTheme
              />
              <div className="map-legend" aria-label="Risk legend">
                <span>
                  <i className="legend-swatch legend-advisory"></i>High pressure
                </span>
                <span>
                  <i className="legend-swatch legend-caution"></i>Watch closely
                </span>
                <span>
                  <i className="legend-swatch legend-safe"></i>Stronger access
                </span>
                <span>
                  <i className="legend-swatch legend-unavailable"></i>Data limited
                </span>
              </div>
            </div>

            <div className={`map-canvas-shell atlas-shell${!mapReady ? " is-loading" : ""}`}>
              {!mapReady && !mapError && <div className="map-loading">Loading featured countries...</div>}
              {mapError && <div className="map-loading">{mapError}</div>}
              {mapReady && !mapError && (
                <div className="country-atlas-grid">
                  {spotlightCards.map(({ record, d, centroid, meta }) => {
                    const isSelected = record.iso3 === selectedIso3;
                    const style = mapShapeStyle(record, isSelected);
                    return (
                      <button
                        key={record.iso3}
                        type="button"
                        className={`atlas-card atlas-card-${record.status}${isSelected ? " is-selected" : ""}`}
                        data-iso3={record.iso3}
                        onClick={() => selectCountryByIso3(record.iso3)}
                      >
                        <div className="atlas-card-top">
                          <div>
                            <span className="atlas-card-kicker">{meta?.regionName?.split(",")[0] || record.country}</span>
                            <h2>
                              {record.flag || "\u{1F30D}"} {record.country}
                            </h2>
                          </div>
                          <StatusBadge status={record.status} statusLabel={record.statusLabel} />
                        </div>
                        <div className="atlas-card-map">
                          <svg
                            className="atlas-card-svg"
                            viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
                            role="img"
                            aria-label={`Clickable ${record.country} map card`}
                          >
                            <rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} className="map-ocean" rx="24" />
                            <path d={d} className="map-country" style={style} />
                            <g className="map-country-label" transform={`translate(${centroid[0]}, ${centroid[1]})`}>
                              <circle r="6" className="map-country-label-dot" />
                            </g>
                          </svg>
                        </div>
                        <div className="atlas-card-metrics">
                          <div>
                            <span>Water access</span>
                            <strong>{record.drinkingWaterDisplay || "N/A"}</strong>
                          </div>
                          <div>
                            <span>Sanitation</span>
                            <strong>{record.sanitationDisplay || "N/A"}</strong>
                          </div>
                          <div>
                            <span>Quality index</span>
                            <strong>{record.qualityIndexLabel}</strong>
                          </div>
                        </div>
                        <p className="atlas-card-copy">{meta?.utility || meta?.quickSummary || getCountrySummary(record)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside id="mapDrawer" className={drawerClass}>
            {drawer.type === "empty" && (
              <>
                <p className="eyebrow">How to use this map</p>
                <h2>Click a featured country or search for a city</h2>
                <p>
                  This view stays intentionally focused on the countries you present. If you need another place, search
                  for any city and Aqua Guide will open the broader regional context.
                </p>
              </>
            )}
            {drawer.type === "country" && drawer.data && <CountryDrawer record={drawer.data} />}
            {drawer.type === "loading" && drawer.data && <PlaceDrawerPending candidate={drawer.data} />}
            {drawer.type === "place" && drawer.data && (
              <PlaceDrawer payload={drawer.data.payload} candidate={drawer.data.candidate} />
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
