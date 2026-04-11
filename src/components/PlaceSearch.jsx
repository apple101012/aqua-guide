import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "./Icons";
import { searchPlaceCandidates } from "../services/location-service";

export default function PlaceSearch({
  onSelect,
  onSubmit,
  placeholder = "Search for a country or city\u2026",
  buttonText = "Open guidance",
  compact = false,
  darkTheme = false,
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const search = useCallback(async (term) => {
    if (!term.trim()) {
      setCandidates([]);
      return;
    }
    setLoading(true);
    try {
      const results = await searchPlaceCandidates(term);
      setCandidates(results);
      setActiveIndex(-1);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < candidates.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : candidates.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickCandidate(candidates[activeIndex]);
    } else if (e.key === "Escape") {
      setCandidates([]);
      setActiveIndex(-1);
    }
  };

  const pickCandidate = (candidate) => {
    setQuery(candidate.name || candidate.label || "");
    setCandidates([]);
    setActiveIndex(-1);
    if (onSelect) onSelect(candidate);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && candidates[activeIndex]) {
      pickCandidate(candidates[activeIndex]);
      return;
    }
    setCandidates([]);
    if (onSubmit) onSubmit(query);
  };

  return (
    <div className="search-stack">
      <form
        className={`search-bar${compact ? " compact-search" : ""}`}
        onSubmit={handleSubmit}
      >
        <div className="search-icon">
          <Icon name="search" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={candidates.length > 0}
        />
        <button className="primary-button" type="submit">
          {buttonText}
        </button>
      </form>
      <div
        className={`search-suggestions${darkTheme ? " map-search-suggestions" : ""}`}
        hidden={!candidates.length}
        role="listbox"
      >
        {candidates.map((c, i) => (
          <button
            key={c.id ?? i}
            className={`search-suggestion${i === activeIndex ? " is-active" : ""}`}
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pickCandidate(c)}
          >
            {c.flag && <span>{c.flag}</span>}
            <span>{c.name || c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
