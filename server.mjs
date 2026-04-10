import http from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { getRegionById } from "./data/regions.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const envFile = join(root, ".env");
const envConfig = existsSync(envFile) ? parseDotEnv(readFileSync(envFile, "utf8")) : {};
const openAiApiKey = process.env.OPENAI_API_KEY || envConfig.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || envConfig.OPENAI_MODEL || "gpt-4.1";

const types = {
  ".css": "text/css; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const rateLimits = new Map();
const staticRoots = new Set(["assistant", "client", "data", "map", "region", "resources", "vendor"]);
const staticFiles = new Set(["index.html", "styles.css"]);

function parseDotEnv(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
    result[key] = value;
  }
  return result;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getClientKey(req) {
  const remoteAddress = req.socket.remoteAddress || "unknown";
  const userAgent = String(req.headers["user-agent"] || "unknown").slice(0, 160);
  return `${remoteAddress}:${userAgent}`;
}

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.worldbank.org https://restcountries.com https://api-bdc.net",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'"
    ].join("; ")
  );
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 250_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function checkRateLimit(key, bucketName, maxRequests, windowMs) {
  const now = Date.now();
  const bucketKey = `${bucketName}:${key}`;
  const bucket = (rateLimits.get(bucketKey) || []).filter((timestamp) => now - timestamp < windowMs);
  if (bucket.length >= maxRequests) return false;
  bucket.push(now);
  rateLimits.set(bucketKey, bucket);
  return true;
}

function cleanAssistantValue(value, maxLength = 260) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeConversation(conversation) {
  if (!Array.isArray(conversation)) return [];
  return conversation
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: cleanAssistantValue(message.content, 400)
    }))
    .filter((message) => message.content);
}

function sanitizeAssistantContext(context) {
  if (!context || typeof context !== "object") return null;
  const name = cleanAssistantValue(context.name, 120);
  if (!name) return null;
  const actions = Array.isArray(context.actions)
    ? context.actions
        .slice(0, 6)
        .map((action) => ({
          title: cleanAssistantValue(action?.title, 120),
          description: cleanAssistantValue(action?.description, 180)
        }))
        .filter((action) => action.title)
    : [];

  return {
    name,
    statusLabel: cleanAssistantValue(context.statusLabel, 48) || "Live guidance",
    utility: cleanAssistantValue(context.utility, 160) || "General water guidance",
    summaryText: cleanAssistantValue(context.summaryText, 700),
    quickSummary: cleanAssistantValue(context.quickSummary, 320),
    actions
  };
}

function resolveAssistantLocation(body) {
  const regionId = cleanAssistantValue(body.regionId, 160);
  if (regionId) {
    const region = getRegionById(regionId);
    if (region) return region;
  }

  return sanitizeAssistantContext(body.locationContext);
}

function buildFallbackResponse({ location, language }) {
  const regionName = location?.name || "the current place";
  const firstAction = Array.isArray(location?.actions)
    ? location.actions[0]?.title || "Treat the safest available water first"
    : "Treat the safest available water first";
  const templates = {
    en: `For ${regionName}, start with this first step: ${firstAction}. Then keep drinking water separate from lower-priority uses, protect the cleanest water for babies, elders, medicine, or rehydration, and follow the latest trusted local advice.`,
    es: `Para ${regionName}, empieza con este primer paso: ${firstAction}. Luego separa el agua para beber de los usos menos prioritarios, reserva el agua mas segura para bebes, personas mayores, medicina o rehidratacion, y sigue la orientacion local confiable mas reciente.`,
    fr: `Pour ${regionName}, commencez par cette première étape : ${firstAction}. Ensuite, gardez l'eau de boisson séparée des usages moins prioritaires, réservez l'eau la plus sûre aux bébés, aux personnes âgées, aux médicaments et à la réhydratation, puis suivez les conseils de confiance les plus récents.`,
    pt: `Para ${regionName}, comece com este primeiro passo: ${firstAction}. Depois mantenha a agua para beber separada dos usos menos prioritarios, reserve a agua mais segura para bebes, idosos, remedios e reidratacao, e siga a orientacao local confiavel mais recente.`,
    sw: `Kwa ${regionName}, anza na hatua hii ya kwanza: ${firstAction}. Kisha tenga maji ya kunywa na matumizi ya kiwango cha chini, linda maji safi zaidi kwa watoto wachanga, wazee, dawa, na kurejesha maji mwilini, halafu fuata ushauri wa mamlaka au wahudumu wanaoaminika.`,
    ar: `بالنسبة إلى ${regionName}، ابدأ بهذه الخطوة الأولى: ${firstAction}. بعد ذلك افصل مياه الشرب عن الاستخدامات الأقل أولوية، وخصص أنظف كمية من الماء للأطفال والمرضى وكبار السن وللأدوية والإماهة، ثم اتبع أحدث الإرشادات المحلية الموثوقة.`,
    bn: `${regionName} এর জন্য প্রথম ধাপ হিসেবে এটি শুরু করুন: ${firstAction}। তারপর পানির জন্য নির্ধারিত নিরাপদ পানি অন্য কম গুরুত্বপূর্ণ কাজে ব্যবহার হওয়া থেকে আলাদা রাখুন, শিশু, বয়স্ক, ওষুধ ও রিহাইড্রেশনের জন্য সবচেয়ে নিরাপদ পানি সংরক্ষণ করুন, এবং বিশ্বস্ত স্থানীয় নির্দেশনা অনুসরণ করুন।`,
    ht: `Pou ${regionName}, kòmanse ak premye etap sa a: ${firstAction}. Apre sa separe dlo pou bwè ak lòt itilizasyon ki pa pi enpòtan yo, kenbe dlo ki pi pwòp la pou tibebe, granmoun aje, medikaman ak reyidratasyon, epi swiv dènye konsèy lokal ou fè konfyans yo.`
  };
  return templates[language] || templates.en;
}

function buildAssistantPrompt({ question, language, location, conversation }) {
  const recentHistory = Array.isArray(conversation)
    ? conversation
        .slice(-6)
        .map((message) => `${message.role.toUpperCase()}: ${String(message.content ?? "")}`)
        .join("\n")
    : "";

  const actionTitles = Array.isArray(location?.actions)
    ? location.actions.map((action) => action.title || action).filter(Boolean).join(", ")
    : "Unknown";

  return `
You are Aqua Guide, a multilingual water-guidance assistant for households, volunteers, and field teams.

Rules:
- Use plain language.
- Keep responses practical and concise.
- Do not provide medical diagnosis or legal advice.
- Do not claim to be an official emergency alert feed.
- If the question implies an urgent medical or safety emergency, tell the user to contact local health authorities, trusted responders, or emergency services.
- Respond in the requested language.
- Formatting contract: you may use short paragraphs, numbered lists, bullet lists, and **bold** for emphasis.
- Do not use headings, tables, raw HTML, code fences, or markdown links.

Place context:
- Name: ${location?.name ?? "No active place"}
- Status: ${location?.statusLabel ?? "Unknown"}
- Utility label: ${location?.utility ?? "Unknown"}
- Summary: ${location?.summaryText ?? "Unknown"}
- Quick summary: ${location?.quickSummary ?? "Unknown"}
- Recommended actions: ${actionTitles}

Recent conversation:
${recentHistory || "No recent conversation."}

User question:
${question}
  `.trim();
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  if (Array.isArray(payload?.output)) {
    const parts = [];
    for (const block of payload.output) {
      if (!Array.isArray(block?.content)) continue;
      for (const item of block.content) {
        if (typeof item?.text === "string" && item.text.trim()) {
          parts.push(item.text.trim());
        }
      }
    }
    if (parts.length) return parts.join("\n\n");
  }
  return "";
}

async function handleChat(req, res) {
  const clientKey = getClientKey(req);
  if (!checkRateLimit(clientKey, "chat", 24, 1000 * 60 * 10)) {
    sendJson(res, 429, { error: "Too many assistant requests. Please wait a moment and try again." });
    return;
  }

  let language = "en";
  let location = null;

  try {
    const body = await readJsonBody(req);
    const question = cleanAssistantValue(body.question, 1500);
    language = cleanAssistantValue(body.language || "en", 12).toLowerCase();
    location = resolveAssistantLocation(body);
    const conversation = normalizeConversation(body.conversation);

    if (!question) {
      sendJson(res, 400, { error: "Question is required." });
      return;
    }

    if (!openAiApiKey) {
      sendJson(res, 200, {
        text: buildFallbackResponse({ language, location }),
        meta: "Aqua Guide fallback guidance"
      });
      return;
    }

    const prompt = buildAssistantPrompt({
      question,
      language,
      location,
      conversation
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: openAiModel,
        input: prompt
      })
    });

    if (!response.ok) {
      sendJson(res, 200, {
        text: buildFallbackResponse({ language, location }),
        meta: "Aqua Guide fallback guidance"
      });
      return;
    }

    const payload = await response.json();
    const text = extractResponseText(payload);
    sendJson(res, 200, {
      text: text || buildFallbackResponse({ language, location }),
      meta: openAiModel
    });
  } catch (error) {
    sendJson(res, 200, {
      text: buildFallbackResponse({ language, location }),
      meta: error instanceof Error ? error.message : "Aqua Guide fallback guidance"
    });
  }
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/healthz") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    await handleChat(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = safePath.replace(/^[/\\]+/, "");
  const pathParts = relativePath.split(/[/\\]+/).filter(Boolean);
  const topLevel = pathParts[0] || "";
  const basename = pathParts[pathParts.length - 1] || "";

  if (
    !relativePath ||
    pathParts.some((part) => part.startsWith(".")) ||
    (!staticFiles.has(relativePath) && !staticRoots.has(topLevel))
  ) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  if (basename.startsWith(".")) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  let filePath = join(root, safePath);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", types[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Aqua Guide server running at http://localhost:${port}`);
});
