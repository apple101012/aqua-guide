import { featuredSearches, getMostCriticalRegion, getRegionById, regions } from "../data/regions.js";

export const iconSvg = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.29 7L12 12l8.71-5"/><path d="M12 22V12"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98"/><path d="M15.41 6.51L8.59 10.49"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>',
  baby: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><path d="M7 21v-3a5 5 0 0 1 10 0v3"/><path d="M9 4l1-2h4l1 2"/></svg>'
};

const favoriteStorageKey = "aqua-guide-favorites";
const quickReadStorageKey = "aqua-guide-quick-read";
const assistantLanguageStorageKey = "aqua-guide-assistant-language";
const lastLocationStorageKey = "aqua-guide-last-location";
const activeLocationStorageKey = "aqua-guide-active-location";

function getStatusGlyph(status) {
  if (status === "advisory") return "!";
  if (status === "caution") return "•";
  if (status === "safe") return "✓";
  return "?";
}

export const languageCatalog = {
  en: {
    label: "English",
    placeholder: "Ask about safe water, treatment, storage, or translation...",
    intro: "I can explain {place}, answer treatment questions, or translate the plan for another audience.",
    sampleQuestion: "What should a family in {place} do first?",
    sampleAnswer:
      "**First step:** Find the cleanest available water, treat it, and reserve that treated water for drinking, medicine, and children first.",
    suggestionTemplates: [
      "What should a family in {place} do first?",
      "How should safe water be stored at home?",
      "What water should be reserved for medicine and babies?",
      "Summarize this for a volunteer team."
    ]
  },
  es: {
    label: "Spanish",
    placeholder: "Pregunta sobre agua segura, tratamiento, almacenamiento o traduccion...",
    intro: "Puedo explicar la orientacion para {place}, responder preguntas de tratamiento o traducir el plan.",
    sampleQuestion: "Cual es el primer paso para una familia en {place}?",
    sampleAnswer:
      "**Primer paso:** Busca el agua mas limpia disponible, tratalo primero y reserva esa agua tratada para beber, medicina y ninos.",
    suggestionTemplates: [
      "Cual es el primer paso para una familia en {place}?",
      "Como se debe guardar el agua segura en casa?",
      "Que agua debe reservarse para medicina y bebes?",
      "Resume esto para voluntarios."
    ]
  },
  fr: {
    label: "French",
    placeholder: "Posez une question sur la securite de l'eau, le traitement ou la traduction...",
    intro: "Je peux expliquer les conseils pour {place}, repondre aux questions de traitement ou traduire le plan.",
    sampleQuestion: "Quelle est la premiere etape pour une famille a {place} ?",
    sampleAnswer:
      "**Premiere etape :** trouvez l'eau la plus propre disponible, traitez-la d'abord, puis reservez cette eau traitee a la boisson, aux medicaments et aux enfants.",
    suggestionTemplates: [
      "Quelle est la premiere etape pour une famille a {place} ?",
      "Comment conserver l'eau potable a la maison ?",
      "Quelle eau faut-il reserver aux medicaments et aux bebes ?",
      "Resume ceci pour une equipe terrain."
    ]
  },
  sw: {
    label: "Swahili",
    placeholder: "Uliza kuhusu maji salama, matibabu, uhifadhi, au tafsiri...",
    intro: "Naweza kueleza mwongozo wa {place}, kujibu maswali ya kutibu maji, au kutafsiri mpango.",
    sampleQuestion: "Familia ya {place} inapaswa kuanza na hatua gani ya kwanza?",
    sampleAnswer:
      "**Hatua ya kwanza:** Chagua maji yaliyo safi zaidi, yatibu kwanza, halafu yahifadhi kwa kunywa, dawa, na watoto.",
    suggestionTemplates: [
      "Familia ya {place} inapaswa kuanza na hatua gani ya kwanza?",
      "Maji salama yanapaswa kuhifadhiwaje nyumbani?",
      "Ni maji gani yahifadhiwe kwa dawa na watoto?",
      "Fupisha hii kwa timu ya wajitolea."
    ]
  },
  ar: {
    label: "Arabic",
    placeholder: "اسأل عن سلامة المياه أو المعالجة أو التخزين أو الترجمة...",
    intro: "يمكنني شرح إرشادات {place} والرد على أسئلة المعالجة أو ترجمة الخطة.",
    sampleQuestion: "ما الخطوة الأولى التي يجب أن تبدأ بها الأسرة في {place}؟",
    sampleAnswer:
      "**الخطوة الأولى:** ابحث عن أنظف مياه متاحة، عالجها أولاً، ثم خصص هذه المياه المعالجة للشرب والدواء والأطفال.",
    suggestionTemplates: [
      "ما الخطوة الأولى التي يجب أن تبدأ بها الأسرة في {place}؟",
      "كيف يجب تخزين مياه الشرب في المنزل؟",
      "أي مياه يجب حفظها للدواء والأطفال؟",
      "لخص هذا لفريق المتطوعين."
    ]
  },
  bn: {
    label: "Bengali",
    placeholder: "নিরাপদ পানি, চিকিৎসা, সংরক্ষণ, বা অনুবাদ সম্পর্কে জিজ্ঞেস করুন...",
    intro: "আমি {place} সম্পর্কে নির্দেশনা ব্যাখ্যা করতে, পানি পরিশোধন নিয়ে উত্তর দিতে, বা পরিকল্পনা অনুবাদ করতে পারি।",
    sampleQuestion: "{place} এর একটি পরিবারের প্রথমে কী করা উচিত?",
    sampleAnswer:
      "**প্রথম ধাপ:** সবচেয়ে পরিষ্কার পানিটা আগে খুঁজুন, সেটা পরিশোধন করুন, তারপর সেই পানি পান, ওষুধ আর শিশুদের জন্য সংরক্ষণ করুন।",
    suggestionTemplates: [
      "{place} এর একটি পরিবারের প্রথমে কী করা উচিত?",
      "বাড়িতে নিরাপদ পানি কীভাবে সংরক্ষণ করতে হবে?",
      "ওষুধ ও শিশুদের জন্য কোন পানি আলাদা রাখতে হবে?",
      "এটা স্বেচ্ছাসেবক দলের জন্য সংক্ষেপে বলো।"
    ]
  },
  pt: {
    label: "Portuguese",
    placeholder: "Pergunte sobre agua segura, tratamento, armazenamento ou traducao...",
    intro: "Posso explicar a orientacao para {place}, responder perguntas sobre tratamento ou traduzir o plano.",
    sampleQuestion: "Qual e o primeiro passo para uma familia em {place}?",
    sampleAnswer:
      "**Primeiro passo:** Encontre a agua mais limpa disponivel, trate primeiro e reserve essa agua tratada para beber, remedios e criancas.",
    suggestionTemplates: [
      "Qual e o primeiro passo para uma familia em {place}?",
      "Como a agua segura deve ser armazenada em casa?",
      "Que agua deve ser reservada para remedios e bebes?",
      "Resuma isto para voluntarios."
    ]
  },
  ht: {
    label: "Haitian Creole",
    placeholder: "Poze kestyon sou dlo pwop, tretman, depo, oswa tradiksyon...",
    intro: "Mwen ka eksplike gid pou {place}, reponn kestyon sou tretman dlo, oswa tradui plan an.",
    sampleQuestion: "Ki premye etap yon fanmi nan {place} ta dwe pran?",
    sampleAnswer:
      "**Premye etap:** Chwazi dlo ki pi pwop la, trete l an premye, epi kenbe dlo trete sa a pou bwason, medikaman, ak timoun.",
    suggestionTemplates: [
      "Ki premye etap yon fanmi nan {place} ta dwe pran?",
      "Kijan dlo pwop la dwe estoke lakay?",
      "Ki dlo ki dwe rete pou medikaman ak tibebe?",
      "Rezime sa pou yon ekip volontè."
    ]
  }
};

function fillLanguageTemplate(template, values) {
  return String(template || "").replaceAll(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export function getLanguageExperience(language, region) {
  const config = languageCatalog[language] || languageCatalog.en;
  const place = region?.name || "this place";
  return {
    label: config.label,
    placeholder: config.placeholder,
    intro: fillLanguageTemplate(config.intro, { place }),
    sampleQuestion: fillLanguageTemplate(config.sampleQuestion, { place }),
    sampleAnswer: fillLanguageTemplate(config.sampleAnswer, { place }),
    suggestions: (config.suggestionTemplates || languageCatalog.en.suggestionTemplates).map((template) =>
      fillLanguageTemplate(template, { place })
    )
  };
}

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

export function getFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(favoriteStorageKey) ?? "[]");
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
          flag: String(entry.flag || "🌍"),
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
  localStorage.setItem(favoriteStorageKey, JSON.stringify(nextFavorites));
  return nextFavorites.some((favorite) => favorite.id === nextFavorite.id);
}

export function getFavoriteRegions() {
  return getFavorites();
}

export function getQuickRead() {
  return localStorage.getItem(quickReadStorageKey) === "true";
}

export function setQuickRead(nextValue) {
  localStorage.setItem(quickReadStorageKey, String(Boolean(nextValue)));
  document.body.classList.toggle("quick-read", Boolean(nextValue));
}

export function getAssistantLanguage() {
  const stored = localStorage.getItem(assistantLanguageStorageKey);
  return languageCatalog[stored] ? stored : "en";
}

export function setAssistantLanguage(language) {
  if (languageCatalog[language]) {
    localStorage.setItem(assistantLanguageStorageKey, language);
  }
}

export function getLastLocationReference() {
  try {
    const parsed = JSON.parse(localStorage.getItem(lastLocationStorageKey) ?? "null");
    if (parsed?.type === "id" && typeof parsed.value === "string") return parsed;
    if (parsed?.type === "query" && typeof parsed.value === "string") return parsed;
  } catch {
    // Ignore parse failures.
  }
  return { type: "id", value: getMostCriticalRegion().id };
}

export function setLastLocationReference(reference) {
  if (!reference?.type || !reference?.value) return;
  localStorage.setItem(
    lastLocationStorageKey,
    JSON.stringify({
      type: reference.type,
      value: reference.value
    })
  );
}

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
    const parsed = JSON.parse(localStorage.getItem(activeLocationStorageKey) ?? "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveLocationContext(region) {
  const compact = compactAssistantContext(region);
  if (!compact) return;
  localStorage.setItem(activeLocationStorageKey, JSON.stringify(compact));
}

export function clearActiveLocationContext() {
  localStorage.removeItem(activeLocationStorageKey);
}

export function setDocumentTitle(label) {
  document.title = label ? `${label} - Aqua Guide` : "Aqua Guide";
}

function renderNavLinks(basePath, active) {
  const navLinks = [
    { id: "home", href: `${basePath}`, label: "Home" },
    { id: "regions", href: `${basePath}region/`, label: "Countries" },
    { id: "map", href: `${basePath}map/`, label: "Map" },
    { id: "assistant", href: `${basePath}assistant/`, label: "Assistant" }
  ];

  return navLinks
    .map((item) => `<li><a href="${item.href}" class="${item.id === active ? "is-active" : ""}">${item.label}</a></li>`)
    .join("");
}

export function renderShell({ basePath = "./", activeNav = "home" }) {
  const header = document.getElementById("siteHeader");
  const footer = document.getElementById("siteFooter");
  header.innerHTML = `
    <div class="topbar">
      <nav class="nav">
        <a class="logo" href="${basePath}">
          <div class="logo-icon">${iconSvg.droplet}</div>
          <div>
            <span class="logo-text">Aqua Guide</span>
            <p class="logo-subtext">Water guidance for households and field teams</p>
          </div>
        </a>
        <div class="nav-right">
          <ul class="nav-links">${renderNavLinks(basePath, activeNav)}</ul>
        </div>
      </nav>
    </div>
  `;
  footer.innerHTML = `
    <div class="footer-inner">
      <p>Aqua Guide provides plain-language water guidance using public global data and should be used alongside official local advisories.</p>
      <div class="footer-links">
        <a href="${basePath}region/">Countries</a>
        <a href="${basePath}map/">Map</a>
        <a href="${basePath}assistant/">Assistant</a>
      </div>
    </div>
  `;
  document.body.classList.toggle("quick-read", false);
}

export function showToast(message) {
  const node = document.getElementById("toast");
  if (!node) return;
  node.textContent = message;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    node.textContent = "";
  }, 2400);
}

export function renderStatusBadge(region) {
  return `
    <div class="status-badge status-badge-${region.status}" role="status" aria-label="Water status: ${escapeAttribute(region.statusLabel)}">
      <span class="status-dot" aria-hidden="true">${getStatusGlyph(region.status)}</span>
      <span>${escapeHtml(region.statusLabel)}</span>
    </div>
  `;
}

export function renderRegionCard(region, basePath = "./") {
  return `
    <article class="region-card region-card-${region.status}">
      <div class="region-card-band"></div>
      <div class="region-card-top">
        <p class="eyebrow">${escapeHtml(region.tag)}</p>
        ${renderStatusBadge(region)}
      </div>
      <h3>${escapeHtml(region.flag)} ${escapeHtml(region.name)}</h3>
      <p class="region-card-meta">${escapeHtml(region.utility)}</p>
      <div class="region-card-metric">
        <span>Quality index</span>
        <strong>${escapeHtml(region.qualityIndex)}/100</strong>
      </div>
      <p class="region-card-copy">${escapeHtml(region.oneLiner)}</p>
      <div class="region-card-actions">
        <a class="primary-button" href="${basePath}region/?id=${encodeURIComponent(region.id)}">Open guidance</a>
      </div>
    </article>
  `;
}

export function bindFavoriteButtons(scope = document) {
  scope.querySelectorAll("[data-favorite-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const regionId = button.getAttribute("data-favorite-toggle");
      const saved = toggleFavorite(regionId);
      button.textContent = saved ? "Saved" : "Save";
    });
  });
}

export function renderFavoriteStrip(basePath = "./") {
  const favorites = getFavoriteRegions();
  if (!favorites.length) return "";
  return `
    <section class="favorite-strip">
      <div class="section-head"><div><p class="section-label">Saved regions</p><h2>Quick access for the places you care about most</h2></div></div>
      <div class="saved-grid">
        ${favorites
          .map(
            (region) => `
              <a class="saved-chip" href="${region.href.startsWith("./") ? region.href.replace("./", basePath) : region.href}">
                <span>${escapeHtml(region.flag)} ${escapeHtml(region.name)}</span>
                ${renderStatusBadge(region)}
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderHighlights(region) {
  const copy = getQuickRead() ? region.quickSummary : region.summaryText;
  return `
    <section class="summary-card">
      <div class="section-head compact"><div><p class="section-label">Water summary</p><h2>${escapeHtml(region.summaryTitle)}</h2></div></div>
      <p class="summary-copy">${escapeHtml(copy)}</p>
      <div class="summary-highlights">
        ${region.highlights
          .map(
            (highlight) => `
              <article class="summary-highlight tone-${escapeAttribute(highlight.tone)}">
                <div class="summary-highlight-icon">${iconSvg[highlight.icon] ?? iconSvg.spark}</div>
                <div><h3>${escapeHtml(highlight.title)}</h3><p>${escapeHtml(highlight.detail)}</p></div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderActions(region) {
  return `
    <section class="action-section">
      <div class="section-head"><div><p class="section-label">Household actions</p><h2>${escapeHtml(region.actionsTitle)}</h2></div><p class="section-meta">${escapeHtml(region.actionsSubtitle)}</p></div>
      <div class="action-grid">
        ${region.actions
          .map(
            (action) => `
              <button class="action-card tone-${escapeAttribute(action.tone)}" data-action-id="${escapeAttribute(action.id)}" type="button">
                <div class="action-icon">${iconSvg[action.icon] ?? iconSvg.spark}</div>
                <div><h3>${escapeHtml(action.title)}</h3><p>${escapeHtml(action.description)}</p></div>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderSources(region) {
  return `
    <section class="sources-section">
      <div class="section-head compact"><div><p class="section-label">Data sources</p><h2>Signals behind the guidance</h2></div></div>
      <div class="sources-row">
        ${region.sources
          .map(
            (source) => `
              <div class="source-pill">
                <span class="source-icon">${iconSvg[source.icon] ?? iconSvg.file}</span>
                <span>${escapeHtml(source.label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderModalShell() {
  return `
    <div id="actionModal" class="modal" hidden>
      <div class="modal-backdrop" data-close-modal="true"></div>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button id="closeModalButton" class="modal-close" type="button" aria-label="Close action details">×</button>
        <p id="modalEyebrow" class="modal-eyebrow"></p>
        <h2 id="modalTitle" class="modal-title"></h2>
        <p id="modalDescription" class="modal-description"></p>
        <ol id="modalSteps" class="modal-steps"></ol>
      </div>
    </div>
  `;
}

export function bindActionModal(region) {
  const modal = document.getElementById("actionModal");
  const title = document.getElementById("modalTitle");
  const eyebrow = document.getElementById("modalEyebrow");
  const description = document.getElementById("modalDescription");
  const steps = document.getElementById("modalSteps");
  const close = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };
  document.querySelectorAll("[data-action-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = region.actions.find((item) => item.id === button.getAttribute("data-action-id"));
      if (!action) return;
      eyebrow.textContent = region.name;
      title.textContent = action.title;
      description.textContent = action.detail;
      steps.innerHTML = action.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
      modal.hidden = false;
      document.body.classList.add("modal-open");
    });
  });
  document.getElementById("closeModalButton")?.addEventListener("click", close);
  modal.querySelectorAll("[data-close-modal]").forEach((node) => node.addEventListener("click", close));
}

export function renderLanguageButtons(activeLanguage) {
  return Object.entries(languageCatalog)
    .map(
      ([language, config]) => `
        <button class="language-pill ${language === activeLanguage ? "is-active" : ""}" type="button" data-language="${language}">
          ${escapeHtml(config.label)}
        </button>
      `
    )
    .join("");
}

export function bindLanguageButtons(onChange) {
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => onChange(button.getAttribute("data-language")));
  });
}

export function renderHomeHero(region, basePath = "./") {
  return `
    <section class="hero hero-home">
      <div class="hero-glow"></div>
      <div class="hero-glow-2"></div>
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="hero-kicker">Water guidance for households and responders</p>
          <h1>Know your water.<br /><span>Protect your home.</span></h1>
          <p>Aqua Guide turns complex water conditions into one clear household plan. The demo focuses on Bangladesh, Kenya, Mozambique, and Haiti while still supporting global search.</p>
          <div class="hero-actions">
            <a class="primary-button" href="${basePath}region/?id=${encodeURIComponent(region.id)}">Start with ${escapeHtml(region.country)}</a>
            <a class="secondary-button" href="${basePath}assistant/">Open assistant</a>
          </div>
        </div>
        <aside class="hero-status-card">
          <div class="hero-status-top"><p class="eyebrow">Featured today</p>${renderStatusBadge(region)}</div>
          <h2>${escapeHtml(region.flag)} ${escapeHtml(region.name)}</h2>
          <p>${escapeHtml(region.oneLiner)}</p>
          <div class="hero-metric-grid">
            <div><span>Quality index</span><strong>${escapeHtml(region.qualityIndex)}</strong></div>
            <div><span>Updated</span><strong>${escapeHtml(region.metrics.updated)}</strong></div>
          </div>
          <a class="inline-link light" href="${basePath}region/?id=${encodeURIComponent(region.id)}">View details</a>
        </aside>
      </div>
    </section>
  `;
}

export function renderHomeSearch(basePath = "./") {
  const exampleChips = featuredSearches.slice(0, 4);
  return `
    <section class="search-section">
      <div class="section-head compact"><div><h2>Search any city, district, or community</h2></div><p class="section-meta">Start with a flagship country or jump straight to your own place.</p></div>
      <div class="search-stack">
        <form id="regionSearchForm" class="search-bar">
          <div class="search-icon">${iconSvg.search}</div>
          <input id="regionSearchInput" type="text" placeholder="Search Nairobi, Dhaka, Beira, Port-au-Prince, or your community" autocomplete="off" />
          <button class="primary-button" type="submit">Open guidance</button>
        </form>
        <div id="regionSearchSuggestions" class="search-suggestions" hidden></div>
      </div>
      <div class="search-helpers">
        ${exampleChips
          .map((place) => `<a class="helper-chip" href="${basePath}region/?q=${encodeURIComponent(place.query)}">${escapeHtml(place.label)}</a>`)
          .join("")}
      </div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    </section>
  `;
}

export function bindSearchForm({ formSelector, inputSelector, targetBasePath }) {
  const form = document.querySelector(formSelector);
  const input = document.querySelector(inputSelector);
  if (!form || !input) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }
    const url = new URL(`${targetBasePath}region/`, window.location.href);
    url.searchParams.set("q", query);
    window.location.href = url.toString();
  });
}

export function renderAssistantTeaser(basePath = "./") {
  const critical = getMostCriticalRegion();
  const languageLinks = Object.entries(languageCatalog)
    .slice(0, 6)
    .map(
      ([language, config]) =>
        `<a class="language-pill ${language === getAssistantLanguage() ? "is-active" : ""}" href="${basePath}assistant/?region=${encodeURIComponent(critical.id)}&lang=${encodeURIComponent(language)}">${escapeHtml(config.label)}</a>`
    )
    .join("");

  return `
    <section class="assistant-teaser">
      <div class="assistant-teaser-copy">
        <p class="section-label">Ask Aqua</p>
        <h2>Multilingual guidance when the situation changes quickly</h2>
        <p>Ask for treatment steps, storage guidance, translation support, or a plain-language explanation for the place currently on screen.</p>
        <div class="language-row">${languageLinks}</div>
        <a class="primary-button" href="${basePath}assistant/?region=${encodeURIComponent(critical.id)}">Open assistant</a>
      </div>
      <div class="assistant-preview">
        <div class="message assistant">
          <div class="message-bubble">Start by treating the cleanest water first, reserve it for direct consumption, and keep it separate from cleanup water.</div>
          <div class="message-meta">Aqua Guide</div>
        </div>
      </div>
    </section>
  `;
}

export function renderHowItWorks() {
  return `
    <section class="how-it-works">
      <article><div class="how-icon">${iconSvg.globe}</div><h3>We monitor</h3><p>Any searched place can combine public water indicators, weather context, and household guidance in seconds.</p></article>
      <article><div class="how-icon">${iconSvg.file}</div><h3>We simplify</h3><p>Complex water access and quality signals are turned into one clear summary and four immediate actions.</p></article>
      <article><div class="how-icon">${iconSvg.check}</div><h3>You act</h3><p>Families, field staff, and presenters can share the same plan in seconds.</p></article>
    </section>
  `;
}

export function renderRegionBreadcrumb(region) {
  return `<div class="breadcrumb"><a href="../">Home</a><span>/</span><span>${escapeHtml(region.name)}</span></div>`;
}

export function renderNotFoundState(basePath = "./") {
  return `
    <section class="empty-state">
      <p class="section-label">Region not found</p>
      <h1>We could not match that place yet.</h1>
      <p>Try another city, district, or community name, or start with a featured profile.</p>
      <a class="primary-button" href="${basePath}region/?id=${encodeURIComponent(getMostCriticalRegion().id)}">Open a region</a>
    </section>
  `;
}
