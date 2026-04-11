import { getMostCriticalRegion, getRegionById } from "../../data/regions.js";

// --- Pure utility functions (no React, no DOM) ---

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

export function getStatusGlyph(status) {
  if (status === "advisory") return "!";
  if (status === "caution") return "\u2022";
  if (status === "safe") return "\u2713";
  return "?";
}

// --- localStorage keys ---

const FAVORITES_KEY = "aqua-guide-favorites";
const QUICK_READ_KEY = "aqua-guide-quick-read";
const LAST_LOCATION_KEY = "aqua-guide-last-location";
const ACTIVE_LOCATION_KEY = "aqua-guide-active-location";
const ASSISTANT_LANGUAGE_KEY = "aqua-guide-assistant-language";

// --- Favorites ---

export function getFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (typeof entry === "string") {
          const region = getRegionById(entry);
          if (!region) return null;
          return {
            id: region.id,
            name: region.name,
            flag: region.flag,
            status: region.status,
            statusLabel: region.statusLabel,
            href: `./region/?id=${encodeURIComponent(region.id)}`
          };
        }
        if (!entry || typeof entry !== "object") return null;
        return {
          id: String(entry.id || ""),
          name: String(entry.name || ""),
          flag: String(entry.flag || "\uD83C\uDF0D"),
          status: String(entry.status || "caution"),
          statusLabel: String(entry.statusLabel || "Caution"),
          href: String(entry.href || "")
        };
      })
      .filter((entry) => entry?.id && entry?.name && entry?.href);
  } catch {
    return [];
  }
}

export function isFavorite(location) {
  const id = typeof location === "string" ? location : location?.id;
  return getFavorites().some((favorite) => favorite.id === id);
}

export function toggleFavorite(location) {
  const nextFavorite =
    typeof location === "string"
      ? (() => {
          const region = getRegionById(location);
          if (!region) return null;
          return {
            id: region.id,
            name: region.name,
            flag: region.flag,
            status: region.status,
            statusLabel: region.statusLabel,
            href: `./region/?id=${encodeURIComponent(region.id)}`
          };
        })()
      : location;
  if (!nextFavorite?.id) return false;
  const favorites = getFavorites();
  const nextFavorites = favorites.some((favorite) => favorite.id === nextFavorite.id)
    ? favorites.filter((favorite) => favorite.id !== nextFavorite.id)
    : [...favorites, nextFavorite];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
  return nextFavorites.some((favorite) => favorite.id === nextFavorite.id);
}

// --- Quick-read mode ---

export function getQuickRead() {
  return localStorage.getItem(QUICK_READ_KEY) === "true";
}

export function setQuickRead(val) {
  localStorage.setItem(QUICK_READ_KEY, String(Boolean(val)));
}

// --- Assistant language ---

export function getAssistantLanguage() {
  const stored = localStorage.getItem(ASSISTANT_LANGUAGE_KEY);
  // Light validation: accept any non-empty lowercase string that was previously stored.
  // The hook layer validates against the language catalog.
  return typeof stored === "string" && stored ? stored : "en";
}

export function setAssistantLanguage(lang) {
  localStorage.setItem(ASSISTANT_LANGUAGE_KEY, lang);
}

// --- Last location reference ---

export function getLastLocationReference() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_LOCATION_KEY) ?? "null");
    if (parsed?.type === "id" && typeof parsed.value === "string") return parsed;
    if (parsed?.type === "query" && typeof parsed.value === "string") return parsed;
  } catch {
    // Ignore parse failures.
  }
  return { type: "id", value: getMostCriticalRegion().id };
}

export function setLastLocationReference(ref) {
  if (!ref?.type || !ref?.value) return;
  localStorage.setItem(
    LAST_LOCATION_KEY,
    JSON.stringify({
      type: ref.type,
      value: ref.value
    })
  );
}

// --- Active location context ---

function trimAssistantValue(value, maxLength = 260) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function compactAssistantContext(region) {
  if (!region?.name) return null;
  const actions = Array.isArray(region.actions)
    ? region.actions
        .slice(0, 6)
        .map((action) => ({
          title: trimAssistantValue(action?.title, 120),
          description: trimAssistantValue(action?.description, 200)
        }))
        .filter((action) => action.title)
    : [];

  return {
    id: trimAssistantValue(region.id, 160),
    tracked: Boolean(region.tracked),
    name: trimAssistantValue(region.name, 120),
    country: trimAssistantValue(region.country, 80),
    flag: trimAssistantValue(region.flag, 8),
    status: trimAssistantValue(region.status, 24),
    statusLabel: trimAssistantValue(region.statusLabel, 48),
    utility: trimAssistantValue(region.utility, 160),
    recordLabel: trimAssistantValue(region.recordLabel, 120),
    tag: trimAssistantValue(region.tag, 80),
    oneLiner: trimAssistantValue(region.oneLiner, 240),
    heroDescription: trimAssistantValue(region.heroDescription, 260),
    summaryTitle: trimAssistantValue(region.summaryTitle, 120),
    summaryText: trimAssistantValue(region.summaryText, 600),
    quickSummary: trimAssistantValue(region.quickSummary, 320),
    qualityIndex: Number(region.qualityIndex || 0),
    metrics: {
      updated: trimAssistantValue(region?.metrics?.updated, 80)
    },
    aiSuggestions: Array.isArray(region.aiSuggestions)
      ? region.aiSuggestions.map((item) => trimAssistantValue(item, 120)).filter(Boolean).slice(0, 6)
      : [],
    actions
  };
}

export function getActiveLocationContext() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_LOCATION_KEY) ?? "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveLocationContext(region) {
  const compact = compactAssistantContext(region);
  if (!compact) return;
  localStorage.setItem(ACTIVE_LOCATION_KEY, JSON.stringify(compact));
}

export function clearActiveLocationContext() {
  localStorage.removeItem(ACTIVE_LOCATION_KEY);
}
