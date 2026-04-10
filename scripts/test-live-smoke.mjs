import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { chromium } from "playwright";

const root = process.cwd();
const port = 4319;
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

async function waitForNonLoadingMetric(page) {
  await page.waitForFunction(
    () => {
      const cards = Array.from(document.querySelectorAll("#heroMetricGrid strong"));
      return cards.length >= 3;
    },
    { timeout: 20000 }
  );
}

const server = spawn("node", ["server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), OPENAI_API_KEY: "" },
  stdio: "ignore"
});

try {
  await waitForServer(`${baseUrl}/healthz`);

  const health = await fetch(`${baseUrl}/healthz`).then((response) => response.json());
  assert.equal(health.ok, true);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    geolocation: { latitude: -1.286389, longitude: 36.817223 },
    permissions: ["geolocation"]
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  assert.match((await page.textContent("h1")) || "", /Know your water/i);

  await page.goto(`${baseUrl}/region/?id=turkana-kenya`, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  assert.match((await page.textContent("h1")) || "", /Turkana/i);
  await waitForNonLoadingMetric(page);

  await page.goto(`${baseUrl}/assistant/?region=turkana-kenya`, { waitUntil: "networkidle" });
  await page.click("[data-language='es']");
  assert.match((await page.textContent("#assistantLanguageFootnote")) || "", /Spanish/i);
  await page.fill("#assistantInput", "What should a family do first?");
  await page.click("#assistantSendButton");
  await page.waitForFunction(() => {
    const messages = Array.from(document.querySelectorAll(".message.assistant .message-bubble"));
    const text = messages.at(-1)?.textContent ?? "";
    return messages.length >= 2 && !text.includes("Working through the safest possible answer for this location...");
  });
  const reply = await page.locator(".message.assistant .message-bubble").last().textContent();
  assert.match(reply || "", /Para|agua|water|family|first/i);

  await browser.close();
  console.log("Live smoke tests passed");
} finally {
  server.kill();
}
