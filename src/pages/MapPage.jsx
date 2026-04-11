import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const riskPalette = {
  advisory: "#c44d4d",
  caution: "#c8912e",
  safe: "#3a9a6a",
  unavailable: "#1a2b3b",
};

const riskBorderPalette = {
  advisory: "#ffd9d8",
  caution: "#ffe1a8",
  safe: "#c8ffe0",
  unavailable: "#31485c",
};

const featuredRegions = regions.slice(0, 4);
const featuredCountryIso3Set = new Set(featuredRegions.map((r) => r.countryIso3));
const featuredCountryMeta = new Map(
  featuredRegions.map((r) => [
    r.countryIso3,
    { regionId: r.id, regionName: r.name, quickSummary: r.quickSummary },
  ])
);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function styleForRecord(record, isSelected = false) {
  const status = record?.status || "unavailable";
  const isFeatured = Boolean(record?.iso3 && featuredCountryIso3Set.has(record.iso3));
  const showStroke = isSelected || isFeatured;
  return {
    stroke: showStroke,
    color: isSelected ? "#f8fafc" : isFeatured ? riskBorderPalette[status] : "#1a2b3b",
    weight: isSelected ? 2.5 : isFeatured ? 1.1 : 0,
    fillColor: isFeatured ? riskPalette[status] : "#1a2b3b",
    fillOpacity: isSelected ? 0.94 : isFeatured ? 0.86 : 0.95,
  };
}

function normalizeRingAntimeridian(ring) {
  if (!Array.isArray(ring) || ring.length < 2) return ring;

  const normalized = [Array.isArray(ring[0]) ? [...ring[0]] : ring[0]];

  for (let i = 1; i < ring.length; i += 1) {
    const point = Array.isArray(ring[i]) ? [...ring[i]] : ring[i];
    const prev = normalized[i - 1];
    if (!Array.isArray(point) || !Array.isArray(prev)) {
      normalized.push(point);
      continue;
    }

    while (point[0] - prev[0] > 180) point[0] -= 360;
    while (point[0] - prev[0] < -180) point[0] += 360;
    normalized.push(point);
  }

  const lngValues = normalized
    .map((point) => (Array.isArray(point) ? point[0] : null))
    .filter((value) => Number.isFinite(value));

  if (!lngValues.length) return normalized;

  const minLng = Math.min(...lngValues);
  const maxLng = Math.max(...lngValues);

  if (maxLng > 180 && minLng >= 0) {
    return normalized.map((point) => (Array.isArray(point) ? [point[0] - 360, point[1]] : point));
  }

  if (minLng < -180 && maxLng <= 0) {
    return normalized.map((point) => (Array.isArray(point) ? [point[0] + 360, point[1]] : point));
  }

  return normalized;
}

function normalizeGeometryAntimeridian(geometry) {
  if (!geometry?.type || !Array.isArray(geometry.coordinates)) return geometry;

  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(normalizeRingAntimeridian),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) => polygon.map(normalizeRingAntimeridian)),
    };
  }

  return geometry;
}

function normalizeFeatureCollectionAntimeridian(featureCollection) {
  if (!featureCollection?.features) return featureCollection;

  return {
    ...featureCollection,
    features: featureCollection.features.map((feature) => ({
      ...feature,
      geometry: normalizeGeometryAntimeridian(feature.geometry),
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Drawer content components                                          */
/* ------------------------------------------------------------------ */

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
          <h2>{record.flag || "\u{1F30D}"} {record.country}</h2>
        </div>
        <StatusBadge status={record.status} statusLabel={record.statusLabel} />
      </div>
      <p className="map-drawer-copy">
        {meta?.quickSummary || getCountrySummary(record)}
      </p>
      <div className="map-stat-grid">
        <div><span>Quality index</span><strong>{record.qualityIndexLabel}</strong></div>
        <div><span>Risk score</span><strong>{record.riskLabel}</strong></div>
        <div><span>Water access</span><strong>{record.drinkingWaterDisplay || "N/A"}</strong></div>
        <div><span>Sanitation</span><strong>{record.sanitationDisplay || "N/A"}</strong></div>
      </div>
      <div className="map-drawer-actions">
        <Link className="primary-button" to={guidanceHref}>
          {meta ? "Open featured guidance" : "Open guidance"}
        </Link>
        <Link className="secondary-button" to={buildAssistantHref(record)}>
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
          <h2>{region.flag || "\u{1F30D}"} {region.name}</h2>
        </div>
        <StatusBadge status={region.status} statusLabel={region.statusLabel} />
      </div>
      <p className="map-drawer-copy">{region.quickSummary || region.oneLiner}</p>
      <div className="map-place-note">{fallbackLabel}</div>
      <div className="map-stat-grid">
        <div><span>Quality index</span><strong>{region.qualityIndex}/100</strong></div>
        <div><span>Water access</span><strong>{liveData?.drinkingWater?.display || "Unavailable"}</strong></div>
        <div><span>Sanitation</span><strong>{liveData?.sanitation?.display || "Unavailable"}</strong></div>
        <div><span>Weather</span><strong>{liveData?.weather ? `${liveData.weather.temperatureC}°C` : "Unavailable"}</strong></div>
        <div><span>Conditions</span><strong>{liveData?.weather?.label || region.country || "Unavailable"}</strong></div>
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
          <span className="status-dot" aria-hidden="true">&hellip;</span>
          <span>Loading details</span>
        </div>
      </div>
      <p className="map-drawer-copy">
        Dropping into this place now. Aqua Guide is pulling local weather and broader water-access indicators for the closest supported region.
      </p>
      <div className="map-stat-grid map-stat-grid-pending">
        <div><span>Quality index</span><strong>Loading...</strong></div>
        <div><span>Water access</span><strong>Loading...</strong></div>
        <div><span>Sanitation</span><strong>Loading...</strong></div>
        <div><span>Weather</span><strong>Loading...</strong></div>
        <div><span>Conditions</span><strong>{candidate.country || "Loading..."}</strong></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function MapPage() {
  const { showToast } = useToast();

  // Drawer state
  const [drawer, setDrawer] = useState({ type: "empty", data: null, status: "unavailable" });

  // Map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const countryLayersRef = useRef(new Map());
  const selectedIso3Ref = useRef("");
  const placeMarkerRef = useRef(null);
  const geoLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Set document title
  useEffect(() => {
    document.title = "Map - Aqua Guide";
  }, []);

  /* ---- Initialize Leaflet map ---- */

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      attributionControl: false,
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
      tap: false,
      minZoom: 0,
      maxZoom: 8,
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  /* ---- select country by iso3 (imperative, used by callbacks) ---- */

  const selectCountryByIso3 = useCallback(
    (iso3, options = {}) => {
      const record = getCountryWaterRecord(iso3);
      if (!record) return;

      const map = mapInstanceRef.current;
      const countryLayers = countryLayersRef.current;

      selectedIso3Ref.current = iso3;

      if (!options.keepPlaceMarker && placeMarkerRef.current) {
        placeMarkerRef.current.remove();
        placeMarkerRef.current = null;
      }

      setDrawer({ type: "country", data: record, status: record.status });

      countryLayers.forEach((layer, layerIso3) => {
        layer.setStyle(styleForRecord(getCountryWaterRecord(layerIso3), layerIso3 === iso3));
      });

      if (!options.skipFocus && map) {
        const layer = countryLayers.get(iso3);
        if (layer) {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            const currentBounds = map.getBounds();
            if (!currentBounds.isValid() || !currentBounds.pad(-0.18).contains(bounds)) {
              map.flyToBounds(bounds, { padding: [28, 28], maxZoom: 4, duration: 0.7 });
            }
          }
        }
      }
    },
    []
  );

  /* ---- handle place candidate from search ---- */

  const handleCandidate = useCallback(
    async (candidate) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      showToast(`Loading guidance for ${candidate.label || candidate.name}...`);

      // Remove old place marker
      if (placeMarkerRef.current) {
        placeMarkerRef.current.remove();
        placeMarkerRef.current = null;
      }

      // Add circle marker
      placeMarkerRef.current = L.circleMarker([candidate.lat, candidate.lng], {
        radius: 8,
        color: "#f8fafc",
        weight: 2,
        fillColor: "#6b9e8a",
        fillOpacity: 0.92,
      })
        .addTo(map)
        .bindTooltip(candidate.label || candidate.name, { direction: "top", offset: [0, -10] });

      setDrawer({ type: "loading", data: candidate, status: "unavailable" });
      map.flyTo([candidate.lat, candidate.lng], Math.max(map.getZoom(), 6), { duration: 0.55 });

      try {
        const payload = await resolveDynamicPayloadFromCoordinates({
          lat: candidate.lat,
          lng: candidate.lng,
          name: candidate.name,
          admin1: candidate.admin1,
          country: candidate.country,
          iso2: candidate.countryCode,
        });

        if (payload.region.countryIso3) {
          selectCountryByIso3(payload.region.countryIso3, { keepPlaceMarker: true, skipFocus: true });
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
    [selectCountryByIso3, showToast]
  );

  /* ---- Fetch TopoJSON and build geoJSON layer ---- */

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let cancelled = false;

    async function loadCountries() {
      try {
        const response = await fetch("/data/world-countries.topo.json");
        const topology = await response.json();
        if (cancelled) return;

        const worldFeatureCollection = normalizeFeatureCollectionAntimeridian(
          topojson.feature(topology, topology.objects.countries)
        );

        const geoLayer = L.geoJSON(worldFeatureCollection, {
          filter(feature) {
            const numericCode = String(feature?.id || "").padStart(3, "0");
            return numericCode !== "010"; // Exclude Antarctica
          },
          style(feature) {
            const record = getCountryWaterRecordByNumericCode(
              String(feature?.id || "").padStart(3, "0")
            );
            return styleForRecord(record, record?.iso3 === selectedIso3Ref.current);
          },
          onEachFeature(feature, layer) {
            const numericCode = String(feature?.id || "").padStart(3, "0");
            const record = getCountryWaterRecordByNumericCode(numericCode) || {
              iso3: "",
              country: feature?.properties?.name || "Unknown country",
              status: "unavailable",
              statusLabel: "Data limited",
              riskLabel: "N/A",
            };

            if (record.iso3) {
              countryLayersRef.current.set(record.iso3, layer);
            }

            layer.bindTooltip(`${record.country} - ${record.riskLabel}`, {
              sticky: true,
              direction: "auto",
            });

            layer.on("click", () => {
              if (record.iso3) {
                selectCountryByIso3(record.iso3);
              }
            });

            layer.on("mouseover", () => {
              if (record.iso3 && record.iso3 !== selectedIso3Ref.current) {
                layer.setStyle({ weight: 1.9, fillOpacity: 0.96 });
              }
            });

            layer.on("mouseout", () => {
              layer.setStyle(
                styleForRecord(record, record.iso3 === selectedIso3Ref.current)
              );
            });
          },
        }).addTo(map);

        geoLayerRef.current = geoLayer;

        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [16, 16] });
          map.setMaxBounds(bounds.pad(0.15));
        }

        // Decorate interactive layers for accessibility
        map.whenReady(() => {
          window.requestAnimationFrame(() => {
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
          });
        });

        if (!cancelled) setMapReady(true);
      } catch (err) {
        if (!cancelled) {
          setMapError(err instanceof Error ? err.message : "Could not load the interactive map right now.");
        }
      }
    }

    loadCountries();
    return () => { cancelled = true; };
  }, [selectCountryByIso3]);

  /* ---- Search handlers ---- */

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

  /* ---- Hotspot buttons data ---- */

  const hotspots = featuredRegions
    .map((r) => getCountryWaterRecord(r.countryIso3))
    .filter(Boolean);

  /* ---- Drawer class ---- */

  const drawerClass = `map-drawer map-drawer-${drawer.status || "unavailable"}`;

  return (
    <div className="page-shell">
      <section className="map-page">
        <div className="section-head">
          <div>
            <p className="section-label">Global overview</p>
            <h1>Global water safety map</h1>
          </div>
          <p className="section-meta">Explore water conditions by country</p>
        </div>

        <div className="map-layout">
          <div className="map-panel">
            {/* Search + legend toolbar */}
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
                <span><i className="legend-swatch legend-advisory"></i>High pressure</span>
                <span><i className="legend-swatch legend-caution"></i>Watch closely</span>
                <span><i className="legend-swatch legend-safe"></i>Stronger access</span>
                <span><i className="legend-swatch legend-unavailable"></i>Data limited</span>
              </div>
            </div>

            {/* Map canvas */}
            <div className={`map-canvas-shell${!mapReady ? " is-loading" : ""}`}>
              <div ref={mapContainerRef} className="world-map"></div>
              {!mapReady && !mapError && (
                <div className="map-loading">Loading countries...</div>
              )}
              {mapError && (
                <div className="map-loading">{mapError}</div>
              )}
            </div>

            {/* Hotspot strip */}
            <div className="hotspot-strip">
              <div className="section-head compact">
                <div>
                  <p className="section-label">Featured profiles</p>
                  <h2>In-depth country profiles</h2>
                </div>
              </div>
              <div className="hotspot-row">
                {hotspots.map((record) => {
                  const meta = featuredCountryMeta.get(record.iso3);
                  return (
                    <button
                      key={record.iso3}
                      className={`hotspot-chip hotspot-chip-${record.status}`}
                      type="button"
                      onClick={() => selectCountryByIso3(record.iso3)}
                    >
                      <span>{record.flag || "\u{1F30D}"} {record.country}</span>
                      <strong>{meta?.regionName || record.country}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer */}
          <aside className={drawerClass}>
            {drawer.type === "empty" && (
              <>
                <p className="eyebrow">How to use this map</p>
                <h2>Select a country or search for a city to see water safety details</h2>
                <p>
                  The map highlights featured country profiles, but search can still jump
                  to any city and pull local weather plus country-level access signals.
                </p>
              </>
            )}
            {drawer.type === "country" && drawer.data && (
              <CountryDrawer record={drawer.data} />
            )}
            {drawer.type === "loading" && drawer.data && (
              <PlaceDrawerPending candidate={drawer.data} />
            )}
            {drawer.type === "place" && drawer.data && (
              <PlaceDrawer
                payload={drawer.data.payload}
                candidate={drawer.data.candidate}
              />
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
