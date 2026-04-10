import { getRegionDetails, resolveRegionCoordinates, resolveRegionQuery, sendAssistantMessage } from "./api.js";
import {
  bindLanguageButtons,
  escapeAttribute,
  escapeHtml,
  getActiveLocationContext,
  getAssistantLanguage,
  getLanguageExperience,
  getLastLocationReference,
  iconSvg,
  languageCatalog,
  renderLanguageButtons,
  renderShell,
  renderStatusBadge,
  setActiveLocationContext,
  setAssistantLanguage,
  setDocumentTitle,
  setLastLocationReference
} from "./common.js";

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatAssistantInline(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderAssistantRichText(content) {
  const normalized = String(content ?? "").replace(/\r/g, "").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listType = "";
  let listItems = [];

  function flushParagraph() {
    if (!paragraphLines.length) return;
    blocks.push(`<p>${paragraphLines.join("<br />")}</p>`);
    paragraphLines = [];
  }

  function flushList() {
    if (!listItems.length || !listType) return;
    blocks.push(`<${listType}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${listType}>`);
    listItems = [];
    listType = "";
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(formatAssistantInline(escapeHtml(orderedMatch[1])));
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(formatAssistantInline(escapeHtml(bulletMatch[1])));
      continue;
    }

    flushList();
    paragraphLines.push(formatAssistantInline(escapeHtml(trimmed)));
  }

  flushParagraph();
  flushList();
  return blocks.join("");
}

function renderMessage(message) {
  const meta = message.role === "assistant" ? `<div class="message-meta">${escapeHtml(message.meta || "Aqua Guide")}</div>` : "";
  const bubble =
    message.role === "assistant"
      ? `<div class="message-bubble assistant-rich-text">${renderAssistantRichText(message.content)}</div>`
      : `<div class="message-bubble">${escapeHtml(message.content)}</div>`;
  return `
    <div class="message ${message.role}">
      ${bubble}
      ${meta}
    </div>
  `;
}

function renderSuggestionChips(questions) {
  return questions
    .map((question) => `<button class="helper-chip" type="button" data-question="${escapeAttribute(question)}">${escapeHtml(question)}</button>`)
    .join("");
}

function renderLanguagePreview(language, region) {
  const experience = getLanguageExperience(language, region);
  return `
    <div class="assistant-preview-copy">
      <p class="eyebrow">Language preview</p>
      <h3>${escapeHtml(experience.label)} sample</h3>
      <p>Switching language updates the sample prompt and future replies without losing the current place context.</p>
    </div>
    <div class="assistant-preview-example">
      <div class="assistant-preview-question">
        <span>Sample prompt</span>
        <strong>${escapeHtml(experience.sampleQuestion)}</strong>
      </div>
      <div class="message assistant preview-only">
        <div class="message-bubble assistant-rich-text">${renderAssistantRichText(experience.sampleAnswer)}</div>
        <div class="message-meta">Aqua Guide</div>
      </div>
      <button class="secondary-button" type="button" data-language-example="${escapeAttribute(language)}">Use this example</button>
    </div>
  `;
}

function buildAssistantLayout(region, language) {
  const experience = getLanguageExperience(language, region);
  return `
    <div class="page-shell">
      <section class="assistant-page">
        <div class="assistant-main">
          <div class="section-head compact">
            <div>
              <p class="section-label">Ask Aqua</p>
              <h1>AI water assistant</h1>
            </div>
            <p class="section-meta">Responses stay grounded in the selected place, with language-specific examples so the next question is obvious.</p>
          </div>
          <div class="language-row" id="assistantLanguageRow">${renderLanguageButtons(language)}</div>
          <p class="assistant-context" id="assistantContext">
            ${region ? `Currently viewing guidance for ${escapeHtml(region.name)}.` : "No place selected. Ask a general safe-water question."}
          </p>
          <div class="assistant-language-preview-card" id="assistantLanguagePreview">${renderLanguagePreview(language, region)}</div>
          <div class="helper-row" id="assistantSuggestionRow">${renderSuggestionChips(experience.suggestions)}</div>
          <div class="assistant-chat-card">
            <div id="conversation" class="conversation"></div>
            <div class="input-bar-sticky">
              <div class="assistant-input-row">
                <input id="assistantInput" class="assistant-input" type="text" placeholder="${escapeHtml(experience.placeholder)}" />
                <button id="assistantSendButton" class="primary-button icon-button" type="button" aria-label="Send question">${iconSvg.spark}</button>
              </div>
              <p id="assistantLanguageFootnote" class="assistant-footnote">Selected language: ${escapeHtml(experience.label)}</p>
            </div>
          </div>
        </div>
        <aside class="assistant-side">
          ${
            region
              ? `
                <div class="side-status-card">
                  <p class="eyebrow">Current place</p>
                  <h2>${escapeHtml(region.flag || "🌍")} ${escapeHtml(region.name)}</h2>
                  ${region.status ? renderStatusBadge(region) : ""}
                  <div class="side-status-grid">
                    <div><span>Quality index</span><strong>${escapeHtml(region.qualityIndex || "Live")}</strong></div>
                    <div><span>Updated</span><strong>${escapeHtml(region?.metrics?.updated || "Current context")}</strong></div>
                  </div>
                </div>
              `
              : ""
          }
          <div class="side-card">
            <p class="eyebrow">Guardrails</p>
            <h3>Readable enough to share under pressure</h3>
            <p>The assistant keeps answers short, practical, and safe to repeat in a household, volunteer, or judge conversation.</p>
          </div>
        </aside>
      </section>
    </div>
  `;
}

function toAssistantContext(region) {
  if (!region?.name) return null;
  return {
    name: region.name,
    statusLabel: region.statusLabel || "Live guidance",
    utility: region.utility || "General water guidance",
    summaryText: region.summaryText || region.heroDescription || "",
    quickSummary: region.quickSummary || region.oneLiner || "",
    actions: Array.isArray(region.actions)
      ? region.actions.map((action) => ({
          title: action.title,
          description: action.description || ""
        }))
      : []
  };
}

function buildIntroMessage(region, language) {
  return getLanguageExperience(language, region).intro;
}

async function getRegionContextFromParams() {
  const lat = getParam("lat");
  const lng = getParam("lng");
  if (lat && lng) {
    try {
      const payload = await resolveRegionCoordinates({
        lat,
        lng,
        name: getParam("name"),
        country: getParam("country"),
        iso2: getParam("iso2"),
        admin1: getParam("admin1")
      });
      return payload?.region || null;
    } catch {
      // Fall through to other context sources.
    }
  }

  const explicitQuery = getParam("q");
  if (explicitQuery) {
    try {
      const payload = await resolveRegionQuery(explicitQuery);
      setLastLocationReference(payload.reference || { type: "query", value: explicitQuery });
      return payload?.region || null;
    } catch {
      // Fall through to other context sources.
    }
  }

  const explicitRegionId = getParam("region");
  if (explicitRegionId) {
    try {
      const payload = await getRegionDetails(explicitRegionId);
      setLastLocationReference(payload.reference || { type: "id", value: explicitRegionId });
      if (payload?.region) {
        return {
          ...payload.region,
          tracked: true
        };
      }
    } catch {
      // Fall through to other context sources.
    }
  }

  const activeContext = getActiveLocationContext();
  if (activeContext?.name) {
    return activeContext;
  }

  const lastReference = getLastLocationReference();
  if (lastReference.type === "id") {
    try {
      const payload = await getRegionDetails(lastReference.value);
      if (payload?.region) {
        return {
          ...payload.region,
          tracked: true
        };
      }
    } catch {
      return null;
    }
  }

  if (lastReference.type === "query") {
    try {
      const payload = await resolveRegionQuery(lastReference.value);
      return payload?.region || null;
    } catch {
      return null;
    }
  }

  return null;
}

async function init() {
  renderShell({ basePath: "../", activeNav: "assistant" });
  setDocumentTitle("Assistant");

  const requestedLanguage = getParam("lang");
  if (requestedLanguage && languageCatalog[requestedLanguage]) {
    setAssistantLanguage(requestedLanguage);
  }

  const region = await getRegionContextFromParams();
  if (region?.name) {
    setActiveLocationContext(region);
  }

  const languageState = { value: getAssistantLanguage() };
  const requestState = { sending: false };
  const main = document.getElementById("main");
  main.innerHTML = buildAssistantLayout(region, languageState.value);

  const conversationNode = document.getElementById("conversation");
  const input = document.getElementById("assistantInput");
  const sendButton = document.getElementById("assistantSendButton");
  const conversation = [
    {
      role: "assistant",
      content: buildIntroMessage(region, languageState.value),
      meta: "Aqua Guide"
    }
  ];

  function renderConversation() {
    conversationNode.innerHTML = conversation.map(renderMessage).join("");
    conversationNode.scrollTop = conversationNode.scrollHeight;
  }

  function bindInteractiveControls() {
    bindLanguageButtons(syncLanguage);
    document.querySelectorAll("[data-question]").forEach((button) => {
      button.addEventListener("click", () => {
        const question = button.getAttribute("data-question") || "";
        input.value = question;
        ask(question);
      });
      button.disabled = requestState.sending;
    });
    document.querySelectorAll("[data-language-example]").forEach((button) => {
      button.addEventListener("click", () => {
        const sampleQuestion = getLanguageExperience(languageState.value, region).sampleQuestion;
        input.value = sampleQuestion;
        ask(sampleQuestion);
      });
      button.disabled = requestState.sending;
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.disabled = requestState.sending;
    });
  }

  function setSending(nextSending) {
    requestState.sending = nextSending;
    input.disabled = nextSending;
    sendButton.disabled = nextSending;
    document.querySelectorAll("[data-question], [data-language], [data-language-example]").forEach((button) => {
      button.disabled = nextSending;
    });
  }

  function syncLanguage(nextLanguage) {
    if (!languageCatalog[nextLanguage]) return;
    languageState.value = nextLanguage;
    setAssistantLanguage(nextLanguage);
    const experience = getLanguageExperience(nextLanguage, region);
    document.getElementById("assistantLanguageRow").innerHTML = renderLanguageButtons(nextLanguage);
    document.getElementById("assistantLanguagePreview").innerHTML = renderLanguagePreview(nextLanguage, region);
    document.getElementById("assistantSuggestionRow").innerHTML = renderSuggestionChips(experience.suggestions);
    document.getElementById("assistantLanguageFootnote").textContent = `Selected language: ${experience.label}`;
    input.placeholder = experience.placeholder;

    if (conversation.length === 1 && conversation[0].role === "assistant") {
      conversation[0].content = buildIntroMessage(region, nextLanguage);
      renderConversation();
    }

    bindInteractiveControls();
  }

  async function ask(question) {
    const safeQuestion = String(question ?? "").trim();
    if (!safeQuestion || requestState.sending) return;

    conversation.push({ role: "user", content: safeQuestion });
    conversation.push({
      role: "assistant",
      content: "Working through the safest possible answer for this location...",
      meta: "Aqua Guide",
      pending: true
    });
    renderConversation();
    input.value = "";
    setSending(true);

    try {
      const response = await sendAssistantMessage({
        question: safeQuestion,
        language: languageState.value,
        regionId: region?.tracked ? region.id : "",
        locationContext: toAssistantContext(region),
        conversation: conversation.filter((message) => !message.pending)
      });
      conversation.pop();
      conversation.push({ role: "assistant", content: response.text, meta: response.meta || "Aqua Guide" });
      renderConversation();
    } catch (error) {
      conversation.pop();
      conversation.push({
        role: "assistant",
        content: "I could not reach the live assistant right now, but you can still use the region guidance and household actions on the region page.",
        meta: error instanceof Error ? error.message : "Aqua Guide"
      });
      renderConversation();
    } finally {
      setSending(false);
      input.focus();
    }
  }

  renderConversation();
  bindInteractiveControls();
  sendButton?.addEventListener("click", () => ask(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") ask(input.value);
  });

  const prefillQuestion = getParam("question");
  if (prefillQuestion) {
    input.value = prefillQuestion;
  }
}

init();
