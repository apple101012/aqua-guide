import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { findRegionByQuery, getMostCriticalRegion } from "../../data/regions";
import {
  buildTrackedPayload,
  hydrateTrackedPayload,
  resolveDynamicPayloadFromCoordinates,
  resolveDynamicPayloadFromQuery,
  detectUserLocationReference,
} from "../services/location-service";
import {
  isFavorite,
  toggleFavorite,
  setActiveLocationContext,
  setLastLocationReference,
} from "../lib/common";
import StatusBadge from "../components/StatusBadge";
import { Icon } from "../components/Icons";
import ActionModal from "../components/ActionModal";
import PlaceSearch from "../components/PlaceSearch";
import { useToast } from "../components/Toast";

/* ------------------------------------------------------------------ */
/*  Helper: build assistant link                                       */
/* ------------------------------------------------------------------ */

function buildAssistantPath(region, question) {
  const params = new URLSearchParams();
  if (region.tracked) {
    params.set("region", region.id);
  } else {
    params.set("q", region.name);
  }
  params.set("question", question);
  return `/assistant?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Helper: hero metric items                                          */
/* ------------------------------------------------------------------ */

function buildHeroMetricItems(payload) {
  const { region, liveData } = payload;
  if (!liveData) {
    return [
      { label: "Basic water access", value: "Loading...", footnote: "Pulling latest public data" },
      { label: "Sanitation", value: "Loading...", footnote: "Pulling latest public data" },
      { label: "Weather", value: "Loading...", footnote: "Pulling latest public data" },
      { label: "Updated", value: region?.metrics?.updated || "Live public data", footnote: "Current page context" },
    ];
  }
  return [
    {
      label: "Basic water access",
      value: liveData.drinkingWater?.display || "Unavailable",
      footnote: liveData.drinkingWater ? `${liveData.drinkingWater.year} · World Bank` : "Country-level source unavailable",
    },
    {
      label: "Sanitation",
      value: liveData.sanitation?.display || "Unavailable",
      footnote: liveData.sanitation ? `${liveData.sanitation.year} · World Bank` : "Country-level source unavailable",
    },
    {
      label: "Weather",
      value: liveData.weather ? `${liveData.weather.temperatureC}°C · ${liveData.weather.label}` : "Unavailable",
      footnote: liveData.weather ? `Wind ${liveData.weather.windKmh} km/h · Precip ${liveData.weather.precipitationMm} mm` : "Local weather unavailable",
    },
    {
      label: "Updated",
      value: "Live now",
      footnote: payload.region.tracked ? "Curated guidance + live context" : "Search result built from public data",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Helper: copy summary text                                          */
/* ------------------------------------------------------------------ */

function buildCopySummary(payload) {
  const { region, liveData } = payload;
  return [
    `${region.name} · ${region.statusLabel}`,
    region.quickSummary,
    liveData?.drinkingWater ? `Basic drinking water access: ${liveData.drinkingWater.display} (${liveData.drinkingWater.year}, World Bank)` : null,
    liveData?.sanitation ? `Basic sanitation access: ${liveData.sanitation.display} (${liveData.sanitation.year}, World Bank)` : null,
    liveData?.weather ? `Current weather: ${liveData.weather.temperatureC}°C, ${liveData.weather.label}, wind ${liveData.weather.windKmh} km/h` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/*  Helper: favorites entry                                            */
/* ------------------------------------------------------------------ */

function buildFavoriteEntry(payload) {
  const href = `/countries?id=${encodeURIComponent(payload.region.id)}`;
  return {
    id: payload.region.id,
    name: payload.region.name,
    flag: payload.region.flag || "\u{1F30D}",
    status: payload.region.status,
    statusLabel: payload.region.statusLabel,
    href,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: persist context                                            */
/* ------------------------------------------------------------------ */

function syncPayloadPersistence(payload, searchParams) {
  setActiveLocationContext(payload.region);
  if (payload.region.tracked) {
    setLastLocationReference({ type: "id", value: payload.region.id });
    return;
  }
  const query = searchParams.get("q");
  setLastLocationReference({ type: "query", value: query || payload.region.name });
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CountryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [saved, setSaved] = useState(false);

  /* ---- resolve the payload on mount / param change ---- */

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setError(null);

      const id = searchParams.get("id");
      const query = searchParams.get("q");
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");

      try {
        let result = null;
        let shouldHydrate = false;

        if (id) {
          result = buildTrackedPayload(id);
          shouldHydrate = true;
        } else if (query) {
          const trackedRegion = findRegionByQuery(query);
          if (trackedRegion) {
            result = buildTrackedPayload(trackedRegion, {
              match: "exact-region",
              resolvedPlace: { name: trackedRegion.name },
            });
            shouldHydrate = true;
          } else {
            result = await resolveDynamicPayloadFromQuery(query);
          }
        } else if (lat && lng) {
          result = await resolveDynamicPayloadFromCoordinates({
            lat,
            lng,
            name: searchParams.get("name"),
            admin1: searchParams.get("admin1"),
            country: searchParams.get("country"),
            iso2: searchParams.get("iso2"),
          });
        } else {
          result = buildTrackedPayload(getMostCriticalRegion().id);
          shouldHydrate = true;
        }

        if (cancelled) return;

        if (!result?.region) {
          setError("not-found");
          setLoading(false);
          return;
        }

        syncPayloadPersistence(result, searchParams);
        document.title = `${result.region.name} - Aqua Guide`;
        setSaved(isFavorite(result.region.id));
        setPayload(result);
        setLoading(false);

        if (shouldHydrate) {
          try {
            const hydrated = await hydrateTrackedPayload(result);
            if (!cancelled) {
              syncPayloadPersistence(hydrated, searchParams);
              setPayload(hydrated);
            }
          } catch {
            if (!cancelled) showToast("Live context is temporarily unavailable");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [searchParams, showToast]);

  /* ---- event handlers ---- */

  const handleSave = useCallback(() => {
    if (!payload) return;
    const nowSaved = toggleFavorite(buildFavoriteEntry(payload));
    setSaved(nowSaved);
    showToast(nowSaved ? "Place saved" : "Place removed");
  }, [payload, showToast]);

  const handleCopy = useCallback(async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(buildCopySummary(payload));
      showToast("Summary copied");
    } catch {
      showToast("Unable to copy summary right now");
    }
  }, [payload, showToast]);

  const handleSearchSelect = useCallback(
    (candidate) => {
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
      navigate(`/countries?${params.toString()}`);
    },
    [navigate]
  );

  const handleSearchSubmit = useCallback(
    (query) => {
      if (!query.trim()) return;
      navigate(`/countries?q=${encodeURIComponent(query.trim())}`);
    },
    [navigate]
  );

  /* ---- loading state ---- */

  if (loading) {
    return (
      <div className="page-shell">
        <section className="loading-state">
          <p className="section-label">Loading</p>
          <h1>Preparing the latest water safety guidance.</h1>
        </section>
      </div>
    );
  }

  /* ---- error / not-found state ---- */

  if (error) {
    if (error === "not-found") {
      return (
        <div className="page-shell">
          <section className="empty-state">
            <p className="section-label">Not found</p>
            <h1>We could not find this place.</h1>
            <p>Try searching for a city, country, or featured region.</p>
            <Link className="primary-button" to="/">Back to home</Link>
          </section>
        </div>
      );
    }
    return (
      <div className="page-shell">
        <section className="empty-state">
          <p className="section-label">Unavailable</p>
          <h1>We could not load this place.</h1>
          <p>{error}</p>
        </section>
      </div>
    );
  }

  if (!payload?.region) return null;

  const { region } = payload;
  const heroMetrics = buildHeroMetricItems(payload);

  return (
    <div className="page-shell">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span>{region.name}</span>
      </nav>

      {/* Hero */}
      <section className="hero hero-region">
        <div className="hero-grid region-hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">{region.tag}</p>
            <h1>{region.name}</h1>
            <p>{region.heroDescription}</p>
            <div className="hero-copy-cluster">
              <span className="meta-pill">{region.utility}</span>
              <span className="meta-pill">{region.recordLabel}</span>
            </div>
          </div>
          <aside className={`hero-status-card solid hero-status-card-${region.status}`}>
            <div className="hero-status-top">
              <p className="eyebrow">Place status</p>
              <StatusBadge status={region.status} statusLabel={region.statusLabel} />
            </div>
            <h2>Quality index <span>{region.qualityIndex}</span>/100</h2>
            <div className="hero-detail-grid">
              {heroMetrics.map((item, i) => (
                <div key={i}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="hero-card-actions">
              <button className="secondary-button" type="button" onClick={handleSave}>
                {saved ? "Saved" : "Save place"}
              </button>
              <button className="ghost-button" type="button" onClick={handleCopy}>
                Copy summary
              </button>
            </div>
            <div className="hero-assistant-chips">
              {(region.aiSuggestions || []).slice(0, 3).map((question) => (
                <Link
                  key={question}
                  className="helper-chip"
                  to={buildAssistantPath(region, question)}
                >
                  {question}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* Water safety overview (highlights) */}
      {region.highlights && region.highlights.length > 0 && (
        <section className="summary-card">
          <div className="section-head compact">
            <div>
              <p className="section-label">Water safety overview</p>
              <h2>{region.summaryTitle || "What you need to know"}</h2>
            </div>
          </div>
          <p className="summary-copy">{region.summaryText}</p>
          <div className="summary-highlights">
            {region.highlights.map((h, i) => (
              <article key={i} className={`summary-highlight tone-${h.tone}`}>
                <div className="summary-highlight-icon">
                  <Icon name={h.icon} />
                </div>
                <div>
                  <h3>{h.title}</h3>
                  <p>{h.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Action cards */}
      {region.actions && region.actions.length > 0 && (
        <section className="action-section">
          <div className="section-head">
            <div>
              <p className="section-label">Water safety essentials</p>
              <h2>{region.actionsTitle || "Water safety essentials"}</h2>
            </div>
            {region.actionsSubtitle && (
              <p className="section-meta">{region.actionsSubtitle}</p>
            )}
          </div>
          <div className="action-grid">
            {region.actions.map((action) => (
              <button
                key={action.id}
                className={`action-card tone-${action.tone}`}
                type="button"
                onClick={() => setModalAction(action)}
              >
                <div className="action-icon">
                  <Icon name={action.icon} />
                </div>
                <div>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sources */}
      {region.sources && region.sources.length > 0 && (
        <section className="sources-section">
          <div className="section-head">
            <div>
              <p className="section-label">Data sources</p>
              <h2>Where this guidance comes from</h2>
            </div>
          </div>
          <div className="sources-row">
            {region.sources.map((source, i) => (
              <div key={i} className="source-pill">
                <span className="source-icon"><Icon name={source.icon} /></span>
                <span>{source.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI assistant teaser */}
      <section className="assistant-inline assistant-inline-compact">
        <div className="section-head">
          <div>
            <p className="section-label">Need more information?</p>
            <h2>Open Aqua Assistant for this location</h2>
          </div>
        </div>
        <div className="helper-row">
          {(region.aiSuggestions || []).slice(0, 4).map((question) => (
            <Link
              key={question}
              className="helper-chip"
              to={buildAssistantPath(region, question)}
            >
              {question}
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom search */}
      <section className="search-section search-section-inline search-section-footer">
        <div className="section-head compact">
          <div>
            <h2>Search another place</h2>
          </div>
          <p className="section-meta">
            Global search still works if you need another city or country.
          </p>
        </div>
        <PlaceSearch
          onSelect={handleSearchSelect}
          onSubmit={handleSearchSubmit}
          placeholder="Search another city, country, or featured region"
          buttonText="Open guidance"
        />
      </section>

      {/* Action modal */}
      <ActionModal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        action={modalAction}
        regionName={region.name}
      />
    </div>
  );
}
