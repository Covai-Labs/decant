import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";
import {
  DeepSeekParser,
  extractDeepSeekMessageContent,
} from "../ai/deepseek.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_ID = "7fed8292-d7a0-49f0-b7e9-c2c0da396b59";
const PAGE_URL = `https://chat.deepseek.com/a/chat/s/${SESSION_ID}`;

function setupDom(fixtureFile, url) {
  const html = fs.readFileSync(
    path.join(__dirname, "fixtures", fixtureFile),
    "utf-8",
  );
  const dom = parseHTML(html);
  globalThis.document = dom.document;
  globalThis.window = dom.window;
  globalThis.window.location = { href: url };
}

test("DeepSeekParser isAvailable matches chat.deepseek.com URLs", () => {
  const parser = new DeepSeekParser();
  assert.equal(parser.isAvailable(PAGE_URL), true);
  assert.equal(parser.isAvailable("https://claude.ai/chat/123"), false);
});

test("extractDeepSeekMessageContent reads REQUEST/RESPONSE fragments", () => {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures", "deepseek-api-response.json"),
      "utf-8",
    ),
  );
  const messages = data.data.biz_data.chat_messages;
  assert.equal(messages.length, 16);
  const user = messages.find((m) => m.role === "USER");
  const assistant = messages.find((m) => m.role === "ASSISTANT");
  const userText = extractDeepSeekMessageContent(user);
  assert.ok(userText.includes("species that went extinct"));
  // THINK/TOOL_* fragments must not leak into the answer.
  const answerText = extractDeepSeekMessageContent(assistant);
  assert.ok(answerText.includes("extinction"));
  assert.ok(!answerText.includes("Found 16 web pages"));
  // Legacy top-level shape still works.
  assert.equal(
    extractDeepSeekMessageContent({ role: "USER", content: "  hi  " }),
    "hi",
  );
  assert.equal(extractDeepSeekMessageContent(null), "");
});

test("DeepSeekParser DOM extracts 16 turns, thinking blocks standardized", async () => {
  setupDom("deepseek-chat.html", PAGE_URL);
  globalThis.localStorage = { getItem: () => null };
  const result = await new DeepSeekParser().parse({ parserMode: "prefer_dom" });
  // DOM snapshot holds the same 8-turn conversation as the API fixture.
  assert.equal(result.metadata.Method, "DOM");
  assert.equal(result.messages.length, 16);
  result.messages.forEach((m, i) => {
    assert.equal(m.role, i % 2 === 0 ? "User" : "DeepSeek");
  });
  assert.ok(result.messages[0].content.includes("species that went extinct"));
  assert.equal(result.messages[0].thinking, undefined);
  assert.ok(!result.messages[0].content.includes("<think>"));
  assert.equal(result.messages[13].role, "DeepSeek");
  assert.ok(result.messages[13].thinking);
  assert.ok(result.messages[13].content.includes("<think>"));
  assert.ok(result.messages[13].content.includes("</think>"));
});

test("DeepSeekParser API path follows current_message_id branch (mocked)", async () => {
  setupDom("deepseek-chat.html", PAGE_URL);
  const data = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures", "deepseek-api-response.json"),
      "utf-8",
    ),
  );
  globalThis.localStorage = { getItem: () => JSON.stringify({ value: "tok" }) };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.ok(
      url.includes(`/chat/history_messages?chat_session_id=${SESSION_ID}`),
    );
    return { ok: true, json: async () => data };
  };
  try {
    const result = await new DeepSeekParser().parse();
    assert.equal(result.metadata.Method, "API");
    assert.equal(result.messages.length, 16);
    assert.equal(result.messages[0].role, "User");
    assert.ok(result.messages[0].content.includes("species that went extinct"));
    assert.equal(result.messages[0].thinking, undefined);
    assert.equal(result.messages[1].role, "DeepSeek");
    assert.ok(result.messages[13].thinking);
    assert.ok(result.messages[13].content.includes("<think>"));
    assert.ok(result.messages[13].content.includes("</think>"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
