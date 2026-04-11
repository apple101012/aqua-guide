import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function RegionCard({ region }) {
  const { id, tag, status, statusLabel, flag, name, utility, qualityIndex, oneLiner } = region;

  return (
    <article className={`region-card region-card-${status}`}>
      <div className="region-card-band"></div>
      <div className="region-card-top">
        <p className="eyebrow">{tag}</p>
        <StatusBadge status={status} statusLabel={statusLabel} />
      </div>
      <h3>
        {flag} {name}
      </h3>
      <p className="region-card-meta">{utility}</p>
      <div className="region-card-metric">
        <span>Quality index</span>
        <strong>{qualityIndex}/100</strong>
      </div>
      <p className="region-card-copy">{oneLiner}</p>
      <div className="region-card-actions">
        <Link className="primary-button" to={`/countries?id=${id}`}>
          Open guidance
        </Link>
      </div>
    </article>
  );
}
