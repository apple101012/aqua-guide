import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { chromium } from "playwright";

const root = process.cwd();
const port = 4318;
const baseUrl = `http://127.0.0.1:${port}`;

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

function worldBankSeries(id, value, year = "2023") {
  return [
    {
      page: 1,
      pages: 1,
      per_page: 1,
      total: 1,
      sourceid: "2",
      lastupdated: "2026-04-10",
    },
    [
      {
        indicator: {
          id,
          value: id,
        },
        country: {
          id: "KEN",
          value: "Kenya",
        },
        countryiso3code: "KEN",
        date: year,
        value,
      },
    ],
  ];
}

const server = spawn("cmd", ["/c", `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`], {
  cwd: root,
  env: { ...process.env, OPENAI_API_KEY: "" },
  stdio: "ignore",
});

try {
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    geolocation: { latitude: -1.286389, longitude: 36.817223 },
    permissions: ["geolocation", "clipboard-read", "clipboard-write"],
  });
  const assistantRequests = [];

  await context.route("https://geocoding-api.open-meteo.com/**", async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get("name") || "").toLowerCase();
    const resultMap = {
      "nairobi, kenya": {
        results: [
          {
            name: "Nairobi",
            latitude: -1.28333,
            longitude: 36.81667,
            country: "Kenya",
            country_code: "KE",
            admin1: "Nairobi County",
          },
        ],
      },
      "lusaka, zambia": {
        results: [
          {
            name: "Lusaka",
            latitude: -15.41667,
            longitude: 28.28333,
            country: "Zambia",
            country_code: "ZM",
            admin1: "Lusaka Province",
          },
        ],
      },
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(resultMap[query] || { results: [] }),
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
          wind_speed_10m: 14,
        },
      }),
    });
  });

  await context.route("https://restcountries.com/**", async (route) => {
    const url = route.request().url();
    const countryCode = url.split("/alpha/")[1]?.split("?")[0]?.toUpperCase();
    const payloads = {
      KE: {
        name: { common: "Kenya" },
        cca2: "KE",
        cca3: "KEN",
        flag: "🇰🇪",
        languages: { eng: "English", swa: "Swahili" },
        population: 53771300,
        region: "Africa",
        subregion: "Eastern Africa",
      },
      ZM: {
        name: { common: "Zambia" },
        cca2: "ZM",
        cca3: "ZMB",
        flag: "🇿🇲",
        languages: { eng: "English" },
        population: 20569737,
        region: "Africa",
        subregion: "Eastern Africa",
      },
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payloads[countryCode] || payloads.KE),
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
      body: JSON.stringify(payload),
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
        countryCode: "KE",
      }),
    });
  });

  await context.route(`${baseUrl}/api/chat`, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    assistantRequests.push(body);

    const language = String(body.language || "en").toLowerCase();
    const question = String(body.question || "");
    let text =
      "For Nairobi, start with the cleanest water, treat it first, and reserve that treated water for drinking and medicine.";

    if (language === "es") {
      text =
        "Para Nairobi, usa primero el agua mas limpia, tratala antes de beber y guardala para medicina y ninos.";
    }

    if (question.includes("format-test")) {
      text = "**Summary:**\n1. **Find the cleanest water** available.\n2. **Treat** it first.\n3. Reserve treated water for drinking and medicine.";
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text,
        meta: "test-assistant",
      }),
    });
  });

  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("h1")?.textContent?.includes("Know your water."));
  assert.match((await page.textContent("h1")) || "", /Know your water/i);

  const homeSearch = page.locator(".search-section .search-bar input");
  await homeSearch.fill("Nairobi, Kenya");
  await page.waitForSelector(".search-suggestions .search-suggestion");
  await page.locator(".search-suggestions .search-suggestion").first().click();
  await page.waitForURL(/\/countries\?(lat|q)=/);
  await page.waitForFunction(() => document.querySelector("h1")?.textContent?.includes("Nairobi, Nairobi County, Kenya"));
  assert.match((await page.textContent("h1")) || "", /Nairobi, Nairobi County, Kenya/i);
  assert.match((await page.textContent(".hero-status-card")) || "", /67%/i);

  await page.getByRole("button", { name: /Save place/i }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((node) => node.textContent?.includes("Saved")));

  await page.getByRole("button", { name: /Copy summary/i }).click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clipboardText, /Nairobi, Nairobi County, Kenya/);
  assert.match(clipboardText, /Basic drinking water access: 67%/i);

  await page.locator(".action-card").first().click();
  await page.waitForSelector(".modal-title");
  assert.match((await page.textContent(".modal-title")) || "", /Treat|Reserve|Protect/i);
  await page.getByRole("button", { name: /Close modal/i }).click();

  await page.locator(".hero-assistant-chips .helper-chip").first().click();
  await page.waitForURL(/\/assistant/);
  await page.waitForFunction(() => document.querySelector(".assistant-context")?.textContent?.includes("Nairobi"));
  await page.getByRole("button", { name: /Spanish/i }).click();
  await page.waitForFunction(() => document.querySelector(".assistant-footnote")?.textContent?.includes("Spanish"));
  await page.getByRole("button", { name: /Use this example/i }).click();
  await page.waitForFunction(() => {
    const bubbles = Array.from(document.querySelectorAll(".message.assistant .message-bubble"));
    const text = bubbles.at(-1)?.textContent ?? "";
    return bubbles.length >= 2 && !text.includes("Working through the safest possible answer");
  });
  const assistantReply = await page.locator(".message.assistant .message-bubble").last().textContent();
  assert.match(assistantReply ?? "", /Para|agua|Nairobi/i);

  await page.locator(".assistant-input").fill("format-test");
  await page.locator(".icon-button").click();
  await page.waitForFunction(() => {
    const bubbles = Array.from(document.querySelectorAll(".message.assistant .message-bubble"));
    const last = bubbles.at(-1);
    return last && !last.textContent?.includes("Working through the safest possible answer");
  });
  const markdownHtml = await page.locator(".message.assistant .message-bubble").last().innerHTML();
  assert.equal(markdownHtml.includes("**"), false);
  assert.equal(markdownHtml.includes("<strong>Summary:</strong>"), true);
  assert.equal(markdownHtml.includes("<ol>"), true);

  await page.goto(`${baseUrl}/map/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".atlas-card[data-iso3='KEN']");
  await page.click(".atlas-card[data-iso3='KEN']");
  await page.waitForFunction(() => document.querySelector("#mapDrawer")?.textContent?.includes("Kenya"));
  assert.match((await page.textContent("#mapDrawer")) || "", /Kenya/i);

  const mapSearch = page.locator(".map-toolbar .search-bar input");
  await mapSearch.fill("Nairobi, Kenya");
  await page.waitForSelector(".map-search-suggestions .search-suggestion");
  await page.locator(".map-search-suggestions .search-suggestion").first().click();
  await page.waitForFunction(() => document.querySelector("#mapDrawer")?.textContent?.includes("Nairobi"));
  assert.match((await page.textContent("#mapDrawer")) || "", /Nairobi/i);

  await browser.close();
  assert.equal(assistantRequests.length > 0, true);
  console.log("Functional tests passed");
} finally {
  server.kill();
}
