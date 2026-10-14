import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("ChatGPTParser extracts messages from signed-out/anonymous session DOM fixture", async () => {
  const fixturePath = path.join(
    __dirname,
    "fixtures/chatgpt-anonymous-octane.html",
  );
  if (!fs.existsSync(fixturePath)) {
    return;
  }

  const rawHtml = fs.readFileSync(fixturePath, "utf-8");
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(rawHtml);
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  const { ChatGPTParser } = await import("../ai/chatgpt.js");
  const parser = new ChatGPTParser();

  // Signed out session has no access token, so it uses DOM parsing
  const messages = parser.extractMountedMessages();
  assert.equal(messages.length, 4, "Should extract all 4 conversation turns");

  assert.equal(messages[0].role, "User");
  assert.match(messages[0].content, /https:\/\/ace\.covai\.org\//);
  assert.doesNotMatch(messages[0].content, /You said:/);

  assert.equal(messages[1].role, "ChatGPT");
  assert.match(messages[1].content, /Covai/);
  assert.doesNotMatch(messages[1].content, /ChatGPT said:/);

  assert.equal(messages[2].role, "User");
  assert.equal(messages[2].content, "both");
  assert.doesNotMatch(messages[2].content, /You said:/);

  assert.equal(messages[3].role, "ChatGPT");
  assert.doesNotMatch(messages[3].content, /ChatGPT said:/);
});

test("ChatGPTParser ignores Octane conversation recovery placeholder elements", async () => {
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(`
    <ol data-conversation-transcript="">
      <li data-message-role="user"><div data-user-message-bubble="">Hello</div></li>
      <li data-message-role="assistant" data-conversation-recovery="">
        <h4>ChatGPT said:</h4>
        <div data-conversation-recovery-status="failed">
          <span>Unable to connect</span>
        </div>
      </li>
      <li data-message-role="assistant">
        <div data-assistant-markdown-root="">
          <p>Real response</p>
        </div>
      </li>
    </ol>
  `);
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  const { ChatGPTParser } = await import("../ai/chatgpt.js");
  const parser = new ChatGPTParser();

  const messages = parser.extractMountedMessages();
  assert.equal(
    messages.length,
    2,
    "Should only extract the 2 real messages, ignoring recovery placeholder",
  );
  assert.equal(messages[0].role, "User");
  assert.equal(messages[0].content, "Hello");
  assert.equal(messages[1].role, "ChatGPT");
  assert.equal(messages[1].content, "Real response");
});
