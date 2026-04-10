import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(root, "data");

const COUNTRY_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,flag,latlng,region,subregion,population,capital";
const GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const indicatorIds = {
  drinkingWater: "SH.H2O.BASW.ZS",
  sanitation: "SH.STA.BASS.ZS",
  population: "SP.POP.TOTL"
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : "";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return response.json();
}

function pickLatestValues(series) {
  const latestByIso3 = new Map();
  const rows = Array.isArray(series?.[1]) ? series[1] : [];

  for (const row of rows) {
    const iso3 = String(row?.countryiso3code || "").trim().toUpperCase();
    if (!iso3 || iso3.length !== 3 || !Number.isFinite(Number(row?.value))) continue;
    if (!latestByIso3.has(iso3)) {
      latestByIso3.set(iso3, {
        value: Number(row.value),
        year: Number(row.date)
      });
    }
  }

  return latestByIso3;
}

async function fetchWorldBankIndicator(indicatorId) {
  const payload = await fetchJson(`https://api.worldbank.org/v2/country/all/indicator/${indicatorId}?format=json&per_page=20000`);
  return pickLatestValues(payload);
}

function deriveRiskProfile(drinkingWaterValue, sanitationValue) {
  let baseline = 62;
  if (Number.isFinite(drinkingWaterValue) && Number.isFinite(sanitationValue)) {
    baseline = drinkingWaterValue * 0.62 + sanitationValue * 0.38;
  } else if (Number.isFinite(drinkingWaterValue)) {
    baseline = drinkingWaterValue;
  } else if (Number.isFinite(sanitationValue)) {
    baseline = sanitationValue;
  }

  const qualityIndex = clamp(Math.round(baseline), 28, 96);
  const status = qualityIndex < 55 ? "advisory" : qualityIndex < 75 ? "caution" : "safe";
  const statusLabel = status === "advisory" ? "Advisory" : status === "caution" ? "Caution" : "Safer";
  const riskScore = 100 - qualityIndex;
  const riskLabel = Number.isFinite(riskScore) ? `${riskScore}/100` : "N/A";
  return { qualityIndex, status, statusLabel, riskScore, riskLabel };
}

function buildSummary(country, drinkingWaterValue, sanitationValue, statusLabel) {
  if (!Number.isFinite(drinkingWaterValue) && !Number.isFinite(sanitationValue)) {
    return `Country-level access metrics for ${country} were limited in the latest public pull. Aqua Guide can still open guidance and assistant support for this country.`;
  }

  return `${country} is currently tagged ${statusLabel.toLowerCase()} based on the latest country-level drinking water and sanitation access data available in Aqua Guide.`;
}

function simplifyGeojson(geojson, byIso3) {
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  return {
    type: "FeatureCollection",
    features: features
      .map((feature) => {
        const iso3 = String(feature?.properties?.["ISO3166-1-Alpha-3"] || "").trim().toUpperCase();
        if (!iso3 || !feature.geometry) return null;
        const record = byIso3.get(iso3);
        return {
          type: "Feature",
          properties: {
            iso3,
            iso2: String(feature?.properties?.["ISO3166-1-Alpha-2"] || record?.iso2 || "").trim().toUpperCase(),
            name: feature?.properties?.name || record?.country || iso3
          },
          geometry: feature.geometry
        };
      })
      .filter(Boolean)
  };
}

async function build() {
  const [countries, worldGeojson, drinkingWaterMap, sanitationMap, populationMap] = await Promise.all([
    fetchJson(COUNTRY_URL),
    fetchJson(GEOJSON_URL),
    fetchWorldBankIndicator(indicatorIds.drinkingWater),
    fetchWorldBankIndicator(indicatorIds.sanitation),
    fetchWorldBankIndicator(indicatorIds.population)
  ]);

  const allCountries = Array.isArray(countries) ? countries : [];
  const records = allCountries
    .filter((country) => String(country?.cca3 || "").trim().length === 3)
    .map((country) => {
      const iso3 = String(country.cca3).toUpperCase();
      const iso2 = String(country.cca2 || "").toUpperCase();
      const drinkingWater = drinkingWaterMap.get(iso3) || null;
      const sanitation = sanitationMap.get(iso3) || null;
      const population = populationMap.get(iso3) || null;
      const lat = Number(country?.latlng?.[0]);
      const lng = Number(country?.latlng?.[1]);
      const risk = deriveRiskProfile(drinkingWater?.value, sanitation?.value);

      return {
        iso2,
        iso3,
        country: country?.name?.common || iso3,
        flag: country?.flag || "🌍",
        capital: Array.isArray(country?.capital) ? country.capital[0] || "" : "",
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        region: country?.region || "",
        subregion: country?.subregion || "",
        drinkingWaterValue: Number.isFinite(drinkingWater?.value) ? Number(drinkingWater.value.toFixed(1)) : null,
        drinkingWaterYear: drinkingWater?.year || null,
        drinkingWaterDisplay: Number.isFinite(drinkingWater?.value) ? formatPercent(drinkingWater.value) : "",
        sanitationValue: Number.isFinite(sanitation?.value) ? Number(sanitation.value.toFixed(1)) : null,
        sanitationYear: sanitation?.year || null,
        sanitationDisplay: Number.isFinite(sanitation?.value) ? formatPercent(sanitation.value) : "",
        populationValue: Number.isFinite(population?.value) ? population.value : Number(country?.population || 0) || null,
        populationYear: population?.year || null,
        populationDisplay: Number.isFinite(population?.value)
          ? formatCompactNumber(population.value)
          : Number(country?.population || 0)
            ? formatCompactNumber(country.population)
            : "",
        qualityIndex: risk.qualityIndex,
        qualityIndexLabel: `${risk.qualityIndex}/100`,
        riskScore: risk.riskScore,
        riskLabel: risk.riskLabel,
        status: risk.status,
        statusLabel: risk.statusLabel,
        summary: buildSummary(country?.name?.common || iso3, drinkingWater?.value, sanitation?.value, risk.statusLabel)
      };
    })
    .sort((left, right) => left.country.localeCompare(right.country));

  const byIso3 = new Map(records.map((record) => [record.iso3, record]));
  const simplifiedGeojson = simplifyGeojson(worldGeojson, byIso3);

  await mkdir(dataDir, { recursive: true });
  await writeFile(
    resolve(dataDir, "country-water-index.js"),
    `export const countryWaterIndex = ${JSON.stringify(records, null, 2)};\n\n` +
      `const countryWaterIndexMap = new Map(countryWaterIndex.map((country) => [country.iso3, country]));\n\n` +
      `export function getCountryWaterRecord(iso3) {\n` +
      `  return countryWaterIndexMap.get(String(iso3 || "").toUpperCase()) || null;\n` +
      `}\n\n` +
      `export function getCountryHotspots(limit = 10) {\n` +
      `  return [...countryWaterIndex]\n` +
      `    .filter((country) => Number.isFinite(country.riskScore))\n` +
      `    .sort((left, right) => right.riskScore - left.riskScore)\n` +
      `    .slice(0, limit);\n` +
      `}\n`,
    "utf8"
  );
  await writeFile(resolve(dataDir, "world-countries.geo.json"), JSON.stringify(simplifiedGeojson), "utf8");

  console.log(`Wrote ${records.length} countries and ${simplifiedGeojson.features.length} map features.`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
