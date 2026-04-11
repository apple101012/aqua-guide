import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMostCriticalRegion, sortRegionsByPriority, regions } from "../../data/regions";
import RegionCard from "../components/RegionCard";
import PlaceSearch from "../components/PlaceSearch";
import StatusBadge from "../components/StatusBadge";
import { Icon } from "../components/Icons";

export default function HomePage() {
  const navigate = useNavigate();
  const critical = getMostCriticalRegion();
  const sorted = sortRegionsByPriority(regions);

  useEffect(() => {
    document.title = "Aqua Guide";
  }, []);

  const handleSearchSelect = (candidate) => {
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
  };

  const handleSearchSubmit = (query) => {
    if (!query.trim()) return;
    navigate(`/countries?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <section className="hero hero-home">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">Water safety guidance for everyone</p>
            <h1>Know your water.<br /><span>Stay safe anywhere.</span></h1>
            <p>
              Aqua Guide turns complex water conditions into one clear safety
              plan -- whether you live in a water-stressed region or you're
              traveling through one.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" to={`/countries?id=${critical.id}`}>
                Start with {critical.country}
              </Link>
              <Link className="secondary-button" to="/assistant">
                Open assistant
              </Link>
            </div>
          </div>
          <aside className="hero-status-card">
            <div className="hero-status-top">
              <p className="eyebrow">Most critical region</p>
              <StatusBadge status={critical.status} statusLabel={critical.statusLabel} />
            </div>
            <h2>{critical.flag} {critical.name}</h2>
            <p>{critical.oneLiner}</p>
            <div className="hero-metric-grid">
              <div>
                <span>Quality index</span>
                <strong>{critical.qualityIndex}</strong>
              </div>
              <div>
                <span>Updated</span>
                <strong>{critical.metrics.updated}</strong>
              </div>
            </div>
            <Link className="inline-link light" to={`/countries?id=${critical.id}`}>
              View details
            </Link>
          </aside>
        </div>
      </section>

      <div className="page-shell">
        <section className="search-section">
          <div className="section-head compact">
            <div>
              <h2>Search for any place</h2>
            </div>
            <p className="section-meta">
              Type a city, country, or region to see water safety guidance.
            </p>
          </div>
          <PlaceSearch
            onSelect={handleSearchSelect}
            onSubmit={handleSearchSubmit}
            placeholder="Search a city, country, or featured region"
            buttonText="Open guidance"
          />
        </section>

        <section className="region-grid-section">
          <div className="section-head">
            <div>
              <p className="section-label">Explore water conditions worldwide</p>
              <h2>Four in-depth country profiles, plus search for any location</h2>
            </div>
            <Link className="inline-link" to="/map">
              Open global map
            </Link>
          </div>
          <div className="region-grid">
            {sorted.map((region) => (
              <RegionCard key={region.id} region={region} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
