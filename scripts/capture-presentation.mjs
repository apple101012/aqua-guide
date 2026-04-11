import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const root = process.cwd();
const vaultRoot =
  process.env.OBSIDIAN_VAULT ?? path.join(os.homedir(), "Documents", "Github", "my-notes");
const outputDir = path.join(vaultRoot, "Hackathon", "Aqua Guide", "artifacts", "presentation demo");
const port = 4328;
const baseUrl = `http://127.0.0.1:${port}`;

function worldBankSeries(id, value, year = "2023") {
  return [
    {
      page: 1,
      pages: 1,
      per_page: 1,
      total: 1,
      sourceid: "2",
      lastupdated: "2026-04-10"
    },
    [
      {
        indicator: {
          id,
          value: id
        },
        country: {
          id: "KEN",
          value: "Kenya"
        },
        countryiso3code: "KEN",
        date: year,
        value
      }
    ]
  ];
}

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not start within ${timeoutMs}ms`));
          return;
        }
        setTimeout(tick, 250);
      });
    };
    tick();
  });
}

const server = spawn("cmd", ["/c", `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`], {
  cwd: root,
  env: { ...process.env, OPENAI_API_KEY: "" },
  stdio: "ignore"
});

try {
  await mkdir(outputDir, { recursive: true });
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    geolocation: { latitude: -1.286389, longitude: 36.817223 },
    permissions: ["geolocation", "clipboard-read", "clipboard-write"]
  });

  await context.route("https://geocoding-api.open-meteo.com/**", async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get("name") || "").toLowerCase();
    const resultMap = {
      "turkana county, kenya": {
        results: [
          {
            name: "Turkana County",
            latitude: 2.7656,
            longitude: 35.5977,
            country: "Kenya",
            country_code: "KE",
            admin1: "Turkana"
          }
        ]
      },
      "nairobi, kenya": {
        results: [
          {
            name: "Nairobi",
            latitude: -1.28333,
            longitude: 36.81667,
            country: "Kenya",
            country_code: "KE",
            admin1: "Nairobi County"
          }
        ]
      }
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(resultMap[query] || { results: [] })
    });
  });

  await context.route("https://api.open-meteo.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current: {
          temperature_2m: 28,
          precipitation: 1.7,
          weather_code: 61,
          wind_speed_10m: 14
        }
      })
    });
  });

  await context.route("https://restcountries.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: { common: "Kenya" },
        cca2: "KE",
        cca3: "KEN",
        flag: "🇰🇪",
        languages: { eng: "English", swa: "Swahili" },
        population: 53771300,
        region: "Africa",
        subregion: "Eastern Africa"
      })
    });
  });

  await context.route("https://api.worldbank.org/**", async (route) => {
    const url = route.request().url();
    let payload = worldBankSeries("SH.H2O.BASW.ZS", 67.4);
    if (url.includes("SH.STA.BASS.ZS")) payload = worldBankSeries("SH.STA.BASS.ZS", 42.8);
    if (url.includes("SP.POP.TOTL")) payload = worldBankSeries("SP.POP.TOTL", 53771300);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload)
    });
  });

  await context.route("https://api-bdc.net/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        city: "Nairobi",
        principalSubdivision: "Nairobi County",
        countryName: "Kenya",
        countryCode: "KE"
      })
    });
  });

  await context.route(`${baseUrl}/api/chat`, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    const language = String(body.language || "en").toLowerCase();
    const text =
      language === "fr"
        ? "**Resume :**\n1. Trouvez l'eau la plus propre.\n2. Traitez-la d'abord.\n3. Gardez cette eau pour boire et pour les medicaments."
        : "**Summary:**\n1. Find the cleanest water.\n2. Treat it first.\n3. Reserve treated water for drinking and medicine.";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text,
        meta: "presentation-assistant"
      })
    });
  });

  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "01-home-overview.png"), fullPage: false });

  await page.goto(`${baseUrl}/countries/?id=turkana-kenya`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("h1")?.textContent?.includes("Turkana County, Kenya"));
  await page.screenshot({ path: path.join(outputDir, "02-region-turkana.png"), fullPage: false });

  await page.locator(".action-card").first().click();
  await page.waitForSelector(".modal-title");
  await page.screenshot({ path: path.join(outputDir, "03-region-action-modal.png"), fullPage: false });
  await page.getByRole("button", { name: /Close modal/i }).click();

  await page.goto(`${baseUrl}/assistant/?region=turkana-kenya`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Spanish/i }).click();
  await page.locator(".assistant-input").fill("What is the first step in an advisory?");
  await page.locator(".icon-button").click();
  await page.waitForFunction(() => {
    const messages = Array.from(document.querySelectorAll(".message.assistant .message-bubble"));
    const text = messages.at(-1)?.textContent ?? "";
    return messages.length >= 2 && !text.includes("Working through the safest possible answer for this location...");
  });
  await page.screenshot({ path: path.join(outputDir, "04-assistant-spanish.png"), fullPage: false });

  await page.goto(`${baseUrl}/map/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".atlas-card[data-iso3='KEN']");
  await page.screenshot({ path: path.join(outputDir, "05-map-overview.png"), fullPage: false });
  await page.evaluate(() => {
    document.querySelector(".atlas-card[data-iso3='KEN']")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
  });
  await page.waitForFunction(() => document.querySelector("#mapDrawer")?.textContent?.includes("Kenya"));
  await page.screenshot({ path: path.join(outputDir, "06-map-kenya-drawer.png"), fullPage: false });

  await browser.close();
} finally {
  server.kill();
}
