import { findRegionByQuery, getMostCriticalRegion, getRegionById } from "../../data/regions.js";
import { formatCompactNumber, formatPercent } from "../lib/common.js";

const weatherCodeLabels = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Strong rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm"
};

const sessionCachePrefix = "aqua-guide-public-cache:v2:";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueParts(parts) {
  const seen = new Set();
  return parts.filter((part) => {
    const normalized = String(part ?? "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function readSessionCache(key) {
  try {
    const payload = JSON.parse(sessionStorage.getItem(`${sessionCachePrefix}${key}`) ?? "null");
    if (!payload?.expiresAt || payload.expiresAt < Date.now()) {
      sessionStorage.removeItem(`${sessionCachePrefix}${key}`);
      return null;
    }
    return payload.value;
  } catch {
    return null;
  }
}

function writeSessionCache(key, value, ttlMs) {
  try {
    sessionStorage.setItem(
      `${sessionCachePrefix}${key}`,
      JSON.stringify({
        value,
        expiresAt: Date.now() + ttlMs
      })
    );
  } catch {
    // Ignore session cache write failures.
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function fetchCachedJson(cacheKey, url, ttlMs) {
  const cached = readSessionCache(cacheKey);
  if (cached) return cached;
  const payload = await fetchJson(url);
  writeSessionCache(cacheKey, payload, ttlMs);
  return payload;
}

function latestWorldBankPoint(payload) {
  const series = Array.isArray(payload?.[1]) ? payload[1] : [];
  return series.find((point) => typeof point?.value === "number") || null;
}

async function fetchWorldBankIndicator(countryIso3, indicatorId) {
  if (!countryIso3) return null;
  const payload = await fetchCachedJson(
    `wb:${countryIso3}:${indicatorId}`,
    `https://api.worldbank.org/v2/country/${countryIso3}/indicator/${indicatorId}?format=json&per_page=20`,
    1000 * 60 * 60 * 6
  );
  const point = latestWorldBankPoint(payload);
  if (!point) return null;
  return {
    label: point.indicator?.value || indicatorId,
    value: point.value,
    year: Number(point.date)
  };
}

async function fetchWeather(coords) {
  const payload = await fetchCachedJson(
    `weather:${coords.lat.toFixed(3)}:${coords.lng.toFixed(3)}`,
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(coords.lat)}&longitude=${encodeURIComponent(coords.lng)}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`,
    1000 * 60 * 15
  );
  const current = payload?.current;
  if (!current) return null;
  return {
    temperatureC: Math.round(Number(current.temperature_2m || 0)),
    precipitationMm: Number(current.precipitation || 0).toFixed(1),
    precipitationMmNumber: Number(current.precipitation || 0),
    windKmh: Math.round(Number(current.wind_speed_10m || 0)),
    label: weatherCodeLabels[current.weather_code] || "Weather update"
  };
}

async function fetchCountryMeta(iso2, fallbackCountry) {
  const upper = String(iso2 || "").trim().toUpperCase();
  if (!upper) {
    return {
      name: fallbackCountry || "Unknown country",
      cca2: "",
      cca3: "",
      flag: "\uD83C\uDF0D",
      languages: [],
      population: null,
      region: "",
      subregion: ""
    };
  }

  const payload = await fetchCachedJson(
    `country:${upper}`,
    `https://restcountries.com/v3.1/alpha/${encodeURIComponent(upper)}?fields=name,cca2,cca3,flag,languages,population,region,subregion`,
    1000 * 60 * 60 * 24
  );
  const country = Array.isArray(payload) ? payload[0] : payload;
  return {
    name: country?.name?.common || fallbackCountry || upper,
    cca2: country?.cca2 || upper,
    cca3: country?.cca3 || "",
    flag: country?.flag || "\uD83C\uDF0D",
    languages: Object.values(country?.languages || {}),
    population: Number(country?.population || 0) || null,
    region: country?.region || "",
    subregion: country?.subregion || ""
  };
}

function buildDisplayName(place) {
  return uniqueParts([place.name, place.admin1, place.country]).join(", ");
}

function buildResolvedPlace(place) {
  return {
    name: buildDisplayName(place)
  };
}

function buildPlaceLabel(place) {
  return buildDisplayName(place);
}

function normalizeGeocodeResult(result) {
  if (!result?.name || !Number.isFinite(Number(result.latitude)) || !Number.isFinite(Number(result.longitude))) {
    return null;
  }
  return {
    name: result.name,
    admin1: result.admin1 || "",
    country: result.country || "",
    countryCode: String(result.country_code || "").toUpperCase(),
    lat: Number(result.latitude),
    lng: Number(result.longitude)
  };
}

function buildFallbackQueries(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];

  const commaParts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const fallbacks = [];
  if (commaParts.length >= 2) {
    fallbacks.push(commaParts.slice(-2).join(", "));
    fallbacks.push(commaParts.at(-1));
  }

  return uniqueParts(fallbacks).filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
}

async function geocodePlaces(query, count = 5) {
  const payload = await fetchCachedJson(
    `geocode:${String(query).trim().toLowerCase()}:${count}`,
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${encodeURIComponent(count)}&language=en&format=json`,
    1000 * 60 * 60 * 6
  );
  return Array.isArray(payload?.results) ? payload.results.map(normalizeGeocodeResult).filter(Boolean) : [];
}

export async function searchPlaceCandidates(query, count = 6) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];

  const attempts = [trimmed, ...buildFallbackQueries(trimmed)];
  const seen = new Set();

  for (const attempt of attempts) {
    const results = await geocodePlaces(attempt, count);
    if (!results.length) continue;

    return results
      .map((place) => ({
        ...place,
        label: buildPlaceLabel(place),
        matchedQuery: attempt
      }))
      .filter((place) => {
        const key = `${place.lat}:${place.lng}:${place.countryCode}:${place.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, count);
  }

  return [];
}

async function geocodePlace(query) {
  const results = await searchPlaceCandidates(query, 5);
  return results[0] || null;
}

async function reverseGeocodeLocation(lat, lng) {
  const payload = await fetchCachedJson(
    `reverse:${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}`,
    `https://api-bdc.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`,
    1000 * 60 * 60 * 2
  );
  const name =
    payload?.city ||
    payload?.locality ||
    payload?.principalSubdivision ||
    payload?.countryName ||
    "Detected location";

  return {
    name,
    admin1: payload?.principalSubdivision || "",
    country: payload?.countryName || "",
    countryCode: String(payload?.countryCode || "").toUpperCase(),
    lat: Number(lat),
    lng: Number(lng)
  };
}

function buildDynamicActions({ name, stormPressure }) {
  const storageDescription = stormPressure
    ? "Keep drinking water separate from floodwater, cleanup water, and open containers."
    : "Use a clean covered container and keep drinking water separate from washing water.";
  const storageDetail = stormPressure
    ? "Heavy rain, flooding, and runoff can quickly contaminate water that looked acceptable earlier."
    : "A large share of household contamination risk happens after collection, especially when safe water gets mixed with general-use water.";
  const storageSteps = stormPressure
    ? [
        "Keep drinking water in the cleanest covered container available.",
        "Use separate containers for cleanup, laundry, or flood response water.",
        "Do not let floodwater, mud, or runoff contact the protected drinking-water supply."
      ]
    : [
        "Use a clean container with a lid or cover whenever possible.",
        "Keep drinking water separate from washing, cleaning, or sanitation water.",
        "Pour or ladle water out instead of dipping hands into the container."
      ];

  return [
    {
      id: "treat",
      title: "Treat the safest water first",
      description: "Reserve the cleanest available water for drinking, cooking, formula, medicine, and oral rehydration.",
      detail: `Aqua Guide should make the first decision obvious. In ${name}, start with the cleanest source you can identify, then treat and reserve it for the highest-priority uses first.`,
      steps: [
        "Choose the cleanest source available before mixing supplies together.",
        "Boil, chlorinate, filter, or otherwise treat water using trusted local guidance before drinking.",
        "Use that treated supply first for drinking, cooking, formula, and medicine."
      ],
      tone: "red",
      icon: "alert"
    },
    {
      id: "store",
      title: stormPressure ? "Separate drinking water from flood or cleanup water" : "Store safe water carefully",
      description: storageDescription,
      detail: storageDetail,
      steps: storageSteps,
      tone: "blue",
      icon: "box"
    },
    {
      id: "protect",
      title: "Protect high-risk household members",
      description: "Reserve the safest water for babies, elders, sick family members, and anyone already dehydrated.",
      detail: "The product becomes more useful when it helps households prioritize people as well as tasks.",
      steps: [
        "Use the safest treated water first for infants, elders, and sick household members.",
        "Do not use uncertain water for medicine, oral rehydration, or baby formula.",
        "Keep one container or portion clearly reserved for the most vulnerable people in the home."
      ],
      tone: "amber",
      icon: "baby"
    },
    {
      id: "share",
      title: "Share one clear household plan",
      description: "Copy the summary so everyone handling water follows the same rules.",
      detail: "Aqua Guide should help the household coordinate, not just read a status card.",
      steps: [
        "Copy the summary into the group chat or write it down visibly at home.",
        "Clarify which water is protected for drinking and medicine.",
        "Replace the summary when a trusted local update changes the situation."
      ],
      tone: "green",
      icon: "share"
    }
  ];
}

function deriveRiskProfile({ weather, drinkingWater, sanitation }) {
  const waterValue = Number(drinkingWater?.value);
  const sanitationValue = Number(sanitation?.value);
  const weatherPenalty =
    (weather?.precipitationMmNumber >= 12 ? 9 : weather?.precipitationMmNumber >= 5 ? 5 : 0) +
    (weather?.windKmh >= 45 ? 5 : weather?.windKmh >= 28 ? 2 : 0);

  let baseline = 62;
  if (Number.isFinite(waterValue) && Number.isFinite(sanitationValue)) {
    baseline = waterValue * 0.62 + sanitationValue * 0.38;
  } else if (Number.isFinite(waterValue)) {
    baseline = waterValue;
  } else if (Number.isFinite(sanitationValue)) {
    baseline = sanitationValue;
  }

  const qualityIndex = clamp(Math.round(baseline - weatherPenalty), 28, 96);
  const status = qualityIndex < 55 ? "advisory" : qualityIndex < 75 ? "caution" : "safe";
  const statusLabel = status === "advisory" ? "Advisory" : status === "caution" ? "Caution" : "Safer";
  const stormPressure =
    Boolean(weather?.precipitationMmNumber >= 5) ||
    Boolean(weather?.windKmh >= 28) ||
    /rain|storm|drizzle/i.test(String(weather?.label || ""));
  const accessPressure = Number.isFinite(waterValue) ? waterValue < 70 : false;
  const storagePressure = Number.isFinite(sanitationValue) ? sanitationValue < 65 : false;

  if (stormPressure) {
    return {
      qualityIndex,
      status,
      statusLabel,
      stormPressure,
      tag: "Storm conditions",
      recordLabel: "Weather-driven contamination pressure",
      oneLiner: "Recent weather can raise contamination risk quickly, so households need simple treatment and separation rules."
    };
  }

  if (accessPressure) {
    return {
      qualityIndex,
      status,
      statusLabel,
      stormPressure,
      tag: "Access pressure",
      recordLabel: "Limited access to at least basic water service",
      oneLiner: "When water access is limited, families need triage guidance as much as they need contamination guidance."
    };
  }

  if (storagePressure) {
    return {
      qualityIndex,
      status,
      statusLabel,
      stormPressure,
      tag: "Storage discipline",
      recordLabel: "Household handling and sanitation pressure",
      oneLiner: "Storage and separation rules matter when supply is available but household handling can still create risk."
    };
  }

  return {
    qualityIndex,
    status,
    statusLabel,
    stormPressure,
    tag: "Local snapshot",
    recordLabel: "Country indicators with local weather context",
    oneLiner: "Country-level access data and local weather help households start with practical safe-water decisions."
  };
}

function buildDynamicRegion(place, countryMeta, liveData) {
  const risk = deriveRiskProfile(liveData);
  const displayName = buildDisplayName(place);
  const waterLine = liveData.drinkingWater
    ? `${liveData.drinkingWater.display} of people in ${countryMeta.name} are reported to have at least basic drinking water access (${liveData.drinkingWater.year}).`
    : `Country-level drinking water access data for ${countryMeta.name} was unavailable during this lookup.`;
  const sanitationLine = liveData.sanitation
    ? `${liveData.sanitation.display} are reported to have at least basic sanitation access (${liveData.sanitation.year}).`
    : "Sanitation data was unavailable during this lookup.";
  const weatherLine = liveData.weather
    ? `Current weather near ${displayName} is ${liveData.weather.temperatureC}\u00B0C with ${liveData.weather.label.toLowerCase()}, wind near ${liveData.weather.windKmh} km/h, and ${liveData.weather.precipitationMm} mm of precipitation.`
    : `Local weather was unavailable during this lookup, so Aqua Guide is leaning more heavily on household best practices.`;

  const quickSummary = risk.stormPressure
    ? "Treat the cleanest water first, keep drinking water separate from flood or cleanup water, and share one clear plan with the household."
    : risk.status === "advisory"
      ? "Reserve the safest treated water for drinking, cooking, medicine, and infant care first."
      : "Protect the cleanest water in a covered container, prioritize direct consumption, and keep one shared household plan.";

  return {
    id: `live-${slugify(displayName)}`,
    tracked: false,
    name: displayName,
    country: countryMeta.name,
    countryIso2: countryMeta.cca2,
    countryIso3: countryMeta.cca3,
    flag: countryMeta.flag || "\uD83C\uDF0D",
    utility: `General household guidance for ${displayName}`,
    recordLabel: risk.recordLabel,
    coordinates: { lat: place.lat, lng: place.lng },
    status: risk.status,
    statusLabel: risk.statusLabel,
    qualityIndex: risk.qualityIndex,
    metrics: {
      updated: "Live public data"
    },
    tag: risk.tag,
    oneLiner: risk.oneLiner,
    heroTitle: `Water guidance for ${displayName}.`,
    heroDescription: `Aqua Guide combines local weather with country-level public water-access indicators to help households in ${displayName} move quickly with clearer safe-water decisions.`,
    summaryTitle: `What households in ${displayName} should know`,
    summaryText: `${waterLine} ${sanitationLine} ${weatherLine} Aqua Guide uses those signals to recommend practical household actions instead of technical jargon.`,
    quickSummary,
    highlights: [
      {
        tone: risk.status === "advisory" ? "advisory" : risk.status === "caution" ? "caution" : "info",
        title: risk.recordLabel,
        detail: risk.oneLiner,
        icon: "alert"
      },
      {
        tone: "info",
        title: "Country-level water access context",
        detail: liveData.drinkingWater
          ? `${countryMeta.name} basic water access is ${liveData.drinkingWater.display}.`
          : "Country-level water access data is temporarily unavailable.",
        icon: "globe"
      },
      {
        tone: "teal",
        title: "Plain-language household actions",
        detail: "Aqua Guide turns public signals into treatment, storage, and sharing guidance families can use quickly.",
        icon: "shield"
      }
    ],
    sources: [
      { label: "Open-Meteo geocoding and weather", icon: "globe" },
      { label: "World Bank country indicators", icon: "file" },
      { label: "REST Countries metadata", icon: "monitor" }
    ],
    actionsTitle: "Priority household actions",
    actionsSubtitle: "Keep the response simple enough to repeat under pressure and easy enough to share.",
    actions: buildDynamicActions({ name: displayName, stormPressure: risk.stormPressure }),
    aiSuggestions: [
      `What should a family in ${place.name} do first?`,
      "How should safe water be stored?",
      "Explain this in Spanish.",
      "What water should be reserved for babies and medicine?"
    ]
  };
}

async function buildLiveDataForPlace(place, region) {
  const countryMeta = await fetchCountryMeta(place.countryCode || region?.countryIso2, place.country || region?.country);
  const countryIso3 = countryMeta.cca3 || region?.countryIso3 || "";
  const [drinkingWaterResult, sanitationResult, populationResult, weatherResult] = await Promise.allSettled([
    fetchWorldBankIndicator(countryIso3, "SH.H2O.BASW.ZS"),
    fetchWorldBankIndicator(countryIso3, "SH.STA.BASS.ZS"),
    fetchWorldBankIndicator(countryIso3, "SP.POP.TOTL"),
    fetchWeather(place)
  ]);

  const drinkingWater = drinkingWaterResult.status === "fulfilled" ? drinkingWaterResult.value : null;
  const sanitation = sanitationResult.status === "fulfilled" ? sanitationResult.value : null;
  const populationIndicator = populationResult.status === "fulfilled" ? populationResult.value : null;
  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;

  const population =
    populationIndicator || countryMeta.population
      ? {
          value: populationIndicator?.value || countryMeta.population,
          year: populationIndicator?.year || "Latest known",
          display: formatCompactNumber(populationIndicator?.value || countryMeta.population)
        }
      : null;

  return {
    drinkingWater: drinkingWater
      ? { ...drinkingWater, display: formatPercent(drinkingWater.value) }
      : null,
    sanitation: sanitation
      ? { ...sanitation, display: formatPercent(sanitation.value) }
      : null,
    population,
    weather,
    countryMeta
  };
}

export function buildTrackedPayload(reference, extras = {}) {
  const region =
    typeof reference === "string"
      ? getRegionById(reference) || getMostCriticalRegion()
      : reference || getMostCriticalRegion();

  return {
    match: extras.match || "tracked-region",
    resolvedPlace: extras.resolvedPlace || null,
    region: {
      ...region,
      tracked: true
    },
    liveData: null
  };
}

export async function hydrateTrackedPayload(payload) {
  const place = {
    name: payload.region.name,
    admin1: "",
    country: payload.region.country,
    countryCode: payload.region.countryIso2,
    lat: payload.region.coordinates.lat,
    lng: payload.region.coordinates.lng
  };

  return {
    ...payload,
    liveData: await buildLiveDataForPlace(place, payload.region)
  };
}

export async function resolveDynamicPayloadFromQuery(query) {
  const trackedRegion = findRegionByQuery(query);
  if (trackedRegion) {
    return buildTrackedPayload(trackedRegion, {
      match: "exact-region",
      resolvedPlace: { name: trackedRegion.name }
    });
  }

  const place = await geocodePlace(query);
  if (!place) {
    throw new Error("We could not match that place yet.");
  }

  const liveData = await buildLiveDataForPlace(place, null);
  return {
    match: "dynamic-place",
    resolvedPlace: buildResolvedPlace(place),
    region: buildDynamicRegion(place, liveData.countryMeta, liveData),
    liveData
  };
}

export async function resolveDynamicPayloadFromCoordinates({ lat, lng, name, country, iso2, admin1 }) {
  const numericLat = Number(lat);
  const numericLng = Number(lng);
  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) {
    throw new Error("Latitude and longitude are required.");
  }

  const place =
    name || country || iso2
      ? {
          name: name || "Detected location",
          admin1: admin1 || "",
          country: country || "",
          countryCode: String(iso2 || "").toUpperCase(),
          lat: numericLat,
          lng: numericLng
        }
      : await reverseGeocodeLocation(numericLat, numericLng);

  const liveData = await buildLiveDataForPlace(place, null);
  return {
    match: "detected-location",
    resolvedPlace: buildResolvedPlace(place),
    region: buildDynamicRegion(place, liveData.countryMeta, liveData),
    liveData
  };
}

export async function detectUserLocationReference(coords) {
  const place = await reverseGeocodeLocation(coords.latitude, coords.longitude);
  return {
    lat: place.lat,
    lng: place.lng,
    name: place.name,
    admin1: place.admin1,
    country: place.country,
    iso2: place.countryCode
  };
}
