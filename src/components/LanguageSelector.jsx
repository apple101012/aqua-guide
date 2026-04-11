import { languageCatalog } from "../lib/language-catalog";

export default function LanguageSelector({ activeLanguage, onChange }) {
  return (
    <div className="language-row" role="group" aria-label="Select language">
      {Object.entries(languageCatalog).map(([code, config]) => (
        <button
          key={code}
          className={`language-pill${activeLanguage === code ? " is-active" : ""}`}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={activeLanguage === code}
        >
          {config.label}
        </button>
      ))}
    </div>
  );
}
