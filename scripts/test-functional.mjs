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

async function expectText(page, selector, expected) {
  await page.waitForFunction(
    ({ selector, expected }) => {
      const node = document.querySelector(selector);
      return node && node.textContent && node.textContent.includes(expected);
    },
    { selector, expected }
  );
}

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

const server = spawn("node", ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), OPENAI_API_KEY: "" },
  stdio: "ignore"
});

try {
  await waitForServer(`${baseUrl}/healthz`);

  const dotEnvResponse = await fetch(`${baseUrl}/.env`);
  assert.equal(dotEnvResponse.status, 404);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    geolocation: { latitude: -1.286389, longitude: 36.817223 },
    permissions: ["geolocation", "clipboard-read", "clipboard-write"]
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
            admin1: "Nairobi County"
          }
        ]
      },
      "lusaka, zambia": {
        results: [
          {
            name: "Lusaka",
            latitude: -15.41667,
            longitude: 28.28333,
            country: "Zambia",
            country_code: "ZM",
            admin1: "Lusaka Province"
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
        subregion: "Eastern Africa"
      },
      ZM: {
        name: { common: "Zambia" },
        cca2: "ZM",
        cca3: "ZMB",
        flag: "🇿🇲",
        languages: { eng: "English" },
        population: 20569737,
        region: "Africa",
        subregion: "Eastern Africa"
      }
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payloads[countryCode] || payloads.KE)
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
    assistantRequests.push(body);
    assert.equal(
      JSON.stringify(body.conversation || []).includes("Working through the safest possible answer for this location..."),
      false
    );

    const language = String(body.language || "en").toLowerCase();
    const question = String(body.question || "");
    let text =
      "For Nairobi, start with the cleanest water, treat it first, and reserve that treated water for drinking and medicine.";

    if (language === "es") {
      text =
        "Para Nairobi, usa primero el agua mas limpia, tratalo antes de beber y guardalo en un recipiente cubierto para medicina y ninos.";
    }

    if (question.includes("format-test")) {
      text = "**Summary:**\n1. **Find the cleanest water** available.\n2. **Treat** it first.\n3. Reserve treated water for drinking and medicine.";
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text,
        meta: "test-assistant"
      })
    });
  });

  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expectText(page, "h1", "Know your water.");
  const homeContent = (await page.content()).toLowerCase();
  assert.equal(homeContent.includes("demo mode"), false);
  assert.equal(homeContent.includes("prototype note"), false);
  await expectText(page, ".helper-chip", "Nairobi, Kenya");

  await page.fill("#regionSearchInput", "Nairobi, Kenya");
  await expectText(page, "#regionSearchSuggestions", "Nairobi, Nairobi County, Kenya");
  await page.click("#regionSearchSuggestions .search-suggestion");
  await page.waitForURL(/\/region\/\?(q=|lat=)/);
  await expectText(page, "h1", "Nairobi, Nairobi County, Kenya");
  await expectText(page, ".hero-status-card h2", "Quality index");
  await expectText(page, "#heroMetricGrid", "67%");

  await page.click("#saveRegionButton");
  await expectText(page, "#saveRegionButton", "Saved");

  await page.click("#copySummaryButton");
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clipboardText, /Nairobi, Nairobi County, Kenya/);
  assert.match(clipboardText, /Basic drinking water access: 67%/i);

  await page.click("[data-action-id='treat']");
  await expectText(page, "#modalTitle", "Treat the safest water first");
  await page.click("#closeModalButton");
  assert.equal(await page.locator("#actionModal").evaluate((node) => node.hidden), true);

  await page.click(".helper-chip[href*='assistant']");
  await page.waitForURL(/\/assistant\//);
  await expectText(page, ".assistant-context", "Nairobi, Nairobi County, Kenya");
  await page.waitForFunction(() => {
    const bubbles = Array.from(document.querySelectorAll(".message.assistant .message-bubble"));
    const text = bubbles.at(-1)?.textContent ?? "";
    return bubbles.length >= 2 && !text.includes("Working through the safest possible answer for this location...");
  });

  await page.click("[data-language='es']");
  await expectText(page, "#assistantLanguageFootnote", "Spanish");
  await expectText(page, "#assistantLanguagePreview", "Cual es el primer paso");
  const assistantCountBeforeFollowUp = await page.locator(".message.assistant").count();
  await page.click("[data-question]");
  await page.waitForFunction((beforeCount) => {
    const assistants = Array.from(document.querySelectorAll(".message.assistant"));
    const text = assistants.at(-1)?.querySelector(".message-bubble")?.textContent ?? "";
    return assistants.length > beforeCount && !text.includes("Working through the safest possible answer for this location...");
  }, assistantCountBeforeFollowUp);
  const assistantReply = await page.locator(".message.assistant:last-child .message-bubble").textContent();
  assert.match(assistantReply ?? "", /Para|agua|Nairobi|segura/i);
  const beforeExampleAssistantCount = await page.locator(".message.assistant").count();
  await page.click("[data-language-example='es']");
  await page.waitForFunction((beforeCount) => {
    const assistants = Array.from(document.querySelectorAll(".message.assistant"));
    const text = assistants.at(-1)?.querySelector(".message-bubble")?.textContent ?? "";
    return assistants.length > beforeCount && !text.includes("Working through the safest possible answer for this location...");
  }, beforeExampleAssistantCount);
  assert.match(String(assistantRequests.at(-1)?.question || ""), /Cual es el primer paso/i);

  const beforeMarkdownAssistantCount = await page.locator(".message.assistant").count();
  await page.fill("#assistantInput", "format-test");
  await page.click("#assistantSendButton");
  await page.waitForFunction((beforeCount) => {
    const assistants = Array.from(document.querySelectorAll(".message.assistant"));
    const text = assistants.at(-1)?.querySelector(".message-bubble")?.textContent ?? "";
    return assistants.length > beforeCount && !text.includes("Working through the safest possible answer for this location...");
  }, beforeMarkdownAssistantCount);
  const markdownHtml = await page.locator(".message.assistant:last-child .message-bubble").innerHTML();
  assert.equal(markdownHtml.includes("**"), false);
  assert.equal(markdownHtml.includes("<strong>Summary:</strong>"), true);
  assert.equal(markdownHtml.includes("<ol>"), true);

  await page.fill("#assistantInput", "<img src=x onerror=window.__xssFlag=1>");
  await page.click("#assistantSendButton");
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll(".message.user")).some((node) =>
      node.textContent?.includes("<img src=x onerror=window.__xssFlag=1>")
    );
  });
  const xssState = await page.evaluate(() => ({
    flag: window.__xssFlag ?? 0,
    injectedImages: document.querySelectorAll(".message.user img").length
  }));
  assert.equal(xssState.flag, 0);
  assert.equal(xssState.injectedImages, 0);

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.fill("#regionSearchInput", "Lusaka, Zambia");
  await expectText(page, "#regionSearchSuggestions", "Lusaka, Lusaka Province, Zambia");
  await page.click("#regionSearchSuggestions .search-suggestion");
  await page.waitForURL(/\/region\/\?(q=|lat=)/);
  await expectText(page, "h1", "Lusaka, Lusaka Province, Zambia");
  await expectText(page, "#heroMetricGrid", "67%");

  await page.goto(`${baseUrl}/region/?id=turkana-kenya`, { waitUntil: "networkidle" });
  await expectText(page, "h1", "Turkana County, Kenya");
  await expectText(page, "#heroMetricGrid", "67%");
  await page.fill("#regionSearchInput", "Nairobi, Kenya");
  await expectText(page, "#regionSearchSuggestions", "Nairobi, Nairobi County, Kenya");
  await page.click("#regionSearchSuggestions .search-suggestion");
  await page.waitForURL(/\/region\/\?(q=|lat=)/);
  await expectText(page, "h1", "Nairobi, Nairobi County, Kenya");

  await page.goto(`${baseUrl}/resources/`, { waitUntil: "networkidle" });
  await page.click("[data-group='field']");
  await expectText(page, "#resource-group-field", "Use one household-ready summary");

  await page.goto(`${baseUrl}/map/`, { waitUntil: "networkidle" });
  await expectText(page, "h1", "Flagship country map");
  await page.waitForFunction(() => document.getElementById("mapLoading")?.hidden === true);
  await page.fill("#mapSearchInput", "Nairobi, Kenya");
  await expectText(page, "#mapSearchSuggestions", "Nairobi, Nairobi County, Kenya");
  await page.waitForSelector(".leaflet-interactive[data-iso3='KEN']");
  await page.evaluate(() => {
    document.querySelector(".leaflet-interactive[data-iso3='KEN']")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
  });
  await expectText(page, "#mapDrawer", "Kenya");
  await page.click("#mapOpenGuidance");
  await page.waitForURL(/\/region\/\?id=turkana-kenya/);
  await expectText(page, "h1", "Turkana County, Kenya");

  await page.goto(`${baseUrl}/map/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".leaflet-interactive[data-iso3='KEN']");
  await page.evaluate(() => {
    document.querySelector(".leaflet-interactive[data-iso3='KEN']")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
  });
  await page.click("#mapAskAssistant");
  await page.waitForURL(/\/assistant\/\?lat=/);
  await expectText(page, ".assistant-context", "Kenya");

  await browser.close();
  console.log("Functional tests passed");
} finally {
  server.kill();
}
