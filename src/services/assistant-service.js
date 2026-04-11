import { findRegionByQuery } from "../../data/regions.js";
import { buildTrackedPayload, hydrateTrackedPayload, resolveDynamicPayloadFromCoordinates, resolveDynamicPayloadFromQuery } from "./location-service.js";

const hostedChatApiBaseUrl = "https://aqua-guide-chat.onrender.com";

function trimValue(value, maxLength = 320) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeLanguage(language) {
  return trimValue(language || "en", 12).toLowerCase();
}

function getFirstAction(location) {
  return Array.isArray(location?.actions) && location.actions[0]?.title
    ? location.actions[0].title
    : "Treat the safest water first";
}

function getWaterContextLine(location) {
  const place = location?.name || "this place";
  const drinking = trimValue(location?.liveData?.drinkingWater || "", 40);
  const sanitation = trimValue(location?.liveData?.sanitation || "", 40);
  const weather = trimValue(location?.liveData?.weather || "", 120);

  const parts = [];
  if (drinking) parts.push(`Basic drinking water access is ${drinking}.`);
  if (sanitation) parts.push(`Basic sanitation access is ${sanitation}.`);
  if (weather) parts.push(`Local weather context is ${weather}.`);
  return parts.length ? `${place}: ${parts.join(" ")}` : "";
}

function buildLocalizedAssistantFallback({ question, language, location }) {
  const place = location?.name || "this place";
  const firstAction = getFirstAction(location);
  const quickSummary = trimValue(location?.quickSummary || location?.summaryText || "", 280);
  const contextLine = getWaterContextLine(location);
  const lowerQuestion = String(question || "").toLowerCase();
  const wantsStorage = /store|storage|container|keep|guardar|almacen|stock|depo|حفظ|تخزين/.test(lowerQuestion);
  const wantsTranslation = /translate|translation|spanish|french|swahili|arabic|bengali|portuguese|haitian|idioma|traduc|traduire|tarjama|ترجم/.test(lowerQuestion);

  const templates = {
    en: `**Summary:**\n1. **Start with this action:** ${firstAction}.\n2. Keep the cleanest treated water separate for drinking, medicine, and children.\n3. Share one short household plan so everyone handles water the same way.\n\n${contextLine || quickSummary}`,
    es: `**Resumen:**\n1. **Empieza con esta accion:** ${firstAction}.\n2. Guarda el agua tratada mas limpia para beber, medicina y ninos.\n3. Comparte un plan corto en casa para que todos manejen el agua igual.\n\n${contextLine || quickSummary}`,
    fr: `**Resume :**\n1. **Commencez par cette action :** ${firstAction}.\n2. Gardez l'eau traitee la plus propre pour boire, les medicaments et les enfants.\n3. Partagez un plan simple pour que tout le foyer applique les memes regles.\n\n${contextLine || quickSummary}`,
    sw: `**Muhtasari:**\n1. **Anza na hatua hii:** ${firstAction}.\n2. Tenga maji yaliyotibiwa na yaliyo safi zaidi kwa kunywa, dawa, na watoto.\n3. Shiriki mpango mfupi wa kaya ili kila mtu afuate hatua zilezile.\n\n${contextLine || quickSummary}`,
    ar: `**ملخص:**\n1. **ابدأ بهذه الخطوة:** ${firstAction}.\n2. احتفظ بأنظف مياه معالجة للشرب والدواء والأطفال.\n3. شارك خطة منزلية قصيرة حتى يتبع الجميع القواعد نفسها.\n\n${contextLine || quickSummary}`,
    bn: `**সারসংক্ষেপ:**\n1. **এই ধাপ দিয়ে শুরু করুন:** ${firstAction}।\n2. সবচেয়ে পরিষ্কার পরিশোধিত পানি পান, ওষুধ ও শিশুদের জন্য আলাদা রাখুন।\n3. একটি ছোট পরিবারের পরিকল্পনা ভাগ করুন যাতে সবাই একই নিয়ম মানে।\n\n${contextLine || quickSummary}`,
    pt: `**Resumo:**\n1. **Comece com esta acao:** ${firstAction}.\n2. Guarde a agua tratada mais limpa para beber, remedios e criancas.\n3. Compartilhe um plano curto da casa para que todos sigam as mesmas regras.\n\n${contextLine || quickSummary}`,
    ht: `**Rezime:**\n1. **Komanse ak etap sa a:** ${firstAction}.\n2. Kenbe dlo trete ki pi pwop la pou bwè, medikaman, ak timoun.\n3. Pataje yon ti plan lakay pou tout moun suiv menm règ yo.\n\n${contextLine || quickSummary}`
  };

  if (wantsStorage) {
    const storageResponses = {
      en: `**Storage plan for ${place}:**\n1. Use the cleanest covered container you have.\n2. Keep drinking water separate from washing or cleanup water.\n3. Pour or ladle it out instead of dipping hands or cups inside.`,
      es: `**Plan de almacenamiento para ${place}:**\n1. Usa el recipiente cubierto mas limpio que tengas.\n2. Separa el agua para beber del agua de limpieza o lavado.\n3. Sirvela con vertido o cucharon, no metiendo manos o vasos dentro.`,
      fr: `**Plan de stockage pour ${place} :**\n1. Utilisez le recipient couvert le plus propre possible.\n2. Separez l'eau de boisson de l'eau de lavage ou de nettoyage.\n3. Versez ou utilisez une louche au lieu de plonger les mains ou les tasses dedans.`
    };
    return storageResponses[language] || storageResponses.en;
  }

  if (wantsTranslation) {
    const translationResponses = {
      en: `**Translation-ready summary for ${place}:**\n1. Find the cleanest water.\n2. Treat it first.\n3. Reserve treated water for drinking, medicine, and children.\n4. Keep it separate from cleanup water.`,
      es: `**Resumen facil de traducir para ${place}:**\n1. Busca el agua mas limpia.\n2. Tratalo primero.\n3. Reserva el agua tratada para beber, medicina y ninos.\n4. Mantenla separada del agua de limpieza.`,
      fr: `**Resume facile a traduire pour ${place} :**\n1. Trouvez l'eau la plus propre.\n2. Traitez-la d'abord.\n3. Gardez cette eau traitee pour boire, les medicaments et les enfants.\n4. Separez-la de l'eau de nettoyage.`
    };
    return translationResponses[language] || translationResponses.en;
  }

  return templates[language] || templates.en;
}

export async function getRegionDetails(id) {
  return hydrateTrackedPayload(buildTrackedPayload(id));
}

export async function resolveRegionQuery(query) {
  const trackedRegion = findRegionByQuery(query);
  if (trackedRegion) {
    return hydrateTrackedPayload(
      buildTrackedPayload(trackedRegion, {
        match: "exact-region",
        resolvedPlace: { name: trackedRegion.name }
      })
    );
  }
  return resolveDynamicPayloadFromQuery(query);
}

export async function resolveRegionCoordinates(params) {
  return resolveDynamicPayloadFromCoordinates(params);
}

export function toAssistantLocationContext(region, liveData) {
  if (!region?.name) return null;

  return {
    id: trimValue(region.id, 120),
    tracked: Boolean(region.tracked),
    name: trimValue(region.name, 120),
    country: trimValue(region.country, 80),
    flag: trimValue(region.flag, 8),
    status: trimValue(region.status, 24),
    statusLabel: trimValue(region.statusLabel, 48),
    utility: trimValue(region.utility, 160),
    recordLabel: trimValue(region.recordLabel, 140),
    tag: trimValue(region.tag, 80),
    oneLiner: trimValue(region.oneLiner, 220),
    heroDescription: trimValue(region.heroDescription, 260),
    summaryTitle: trimValue(region.summaryTitle, 120),
    summaryText: trimValue(region.summaryText, 700),
    quickSummary: trimValue(region.quickSummary, 360),
    qualityIndex: Number(region.qualityIndex || 0),
    metrics: {
      updated: trimValue(region?.metrics?.updated || "Live public data", 80)
    },
    aiSuggestions: Array.isArray(region.aiSuggestions)
      ? region.aiSuggestions.map((item) => trimValue(item, 120)).filter(Boolean).slice(0, 6)
      : [],
    actions: Array.isArray(region.actions)
      ? region.actions
          .slice(0, 6)
          .map((action) => ({
            title: trimValue(action?.title, 120),
            description: trimValue(action?.description, 220)
          }))
          .filter((action) => action.title)
      : [],
    liveData: {
      drinkingWater: trimValue(region?.liveData?.drinkingWater || "", 40),
      sanitation: trimValue(region?.liveData?.sanitation || "", 40),
      population: trimValue(region?.liveData?.population || "", 40),
      weather: trimValue(region?.liveData?.weather || "", 120),
      updated: trimValue(region?.metrics?.updated || "Live public data", 80)
    }
  };
}

export function getReferenceHref(reference, basePath = "./") {
  if (!reference) return `${basePath}assistant/`;
  if (reference.type === "id") return `${basePath}assistant/?region=${encodeURIComponent(reference.value)}`;
  if (reference.type === "query") return `${basePath}assistant/?q=${encodeURIComponent(reference.value)}`;
  return `${basePath}assistant/`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.detail || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function getChatApiBaseUrl() {
  if (typeof window !== "undefined" && typeof window.AQUA_GUIDE_CHAT_API_BASE_URL === "string") {
    return window.AQUA_GUIDE_CHAT_API_BASE_URL.replace(/\/$/, "");
  }
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (host === "localhost" || host === "127.0.0.1") return "";
  return hostedChatApiBaseUrl;
}

export function sendAssistantMessage(payload) {
  const fallback = () => ({
    text: buildLocalizedAssistantFallback({
      question: payload?.question || "",
      language: normalizeLanguage(payload?.language || "en"),
      location: payload?.locationContext || null
    }),
    meta: "Aqua Guide local guidance"
  });

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);
  const apiBase = getChatApiBaseUrl();

  return fetchJson(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: controller.signal,
    body: JSON.stringify(payload)
  })
    .then((response) => {
      window.clearTimeout(timeoutId);
      return trimValue(response?.text || "", 4000) ? response : fallback();
    })
    .catch(() => {
      window.clearTimeout(timeoutId);
      return fallback();
    });
}
