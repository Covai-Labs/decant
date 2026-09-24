import { ChatParser } from "./base.js";
import { convertToMarkdown } from "../utils/html-to-markdown.js";

async function getOrganizationId() {
  try {
    const response = await fetch("https://claude.ai/api/organizations", {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    const orgs = await response.json();
    if (Array.isArray(orgs) && orgs.length > 0) {
      const chatOrg = orgs.find(
        (org) => org.capabilities && org.capabilities.includes("chat"),
      );
      return chatOrg ? chatOrg.uuid : orgs[0].uuid;
    }
  } catch (e) {
    console.error("[AI Exporter] Failed to detect org ID:", e);
  }
  return null;
}

function getConversationId() {
  try {
    if (typeof window === "undefined" || !window.location) return null;
    return window.location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchConversation(orgId, conversationId) {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`;
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Claude conversation: ${response.status}`);
  }
  return response.json();
}

function getCurrentBranch(data) {
  if (!data.chat_messages || !data.current_leaf_message_uuid) {
    return [];
  }
  const messageMap = new Map();
  data.chat_messages.forEach((msg) => {
    if (msg && msg.uuid) {
      messageMap.set(msg.uuid, msg);
    }
  });

  const branch = [];
  let currentUuid = data.current_leaf_message_uuid;
  while (currentUuid && messageMap.has(currentUuid)) {
    const message = messageMap.get(currentUuid);
    branch.unshift(message);
    currentUuid = message.parent_message_uuid;
    if (!messageMap.has(currentUuid)) {
      break;
    }
  }
  return branch;
}

const EXT_TO_LANG = {
  py: "python",
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  md: "markdown",
  html: "html",
  css: "css",
  json: "json",
  sh: "bash",
  bash: "bash",
  yml: "yaml",
  yaml: "yaml",
  sql: "sql",
  java: "java",
  rb: "ruby",
  go: "go",
  rs: "rust",
  c: "c",
  cpp: "cpp",
  txt: "text",
};

const MIME_TO_LANG = {
  "application/vnd.ant.react": "jsx",
  "text/html": "html",
  "image/svg+xml": "svg",
  "application/vnd.ant.mermaid": "mermaid",
  "text/markdown": "markdown",
  "application/vnd.ant.code": "text",
};

function extractArtifactsFromText(text) {
  const artifactRegex = /<antArtifact[^>]*>([\s\S]*?)<\/antArtifact>/g;
  const artifacts = [];
  let match;
  while ((match = artifactRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const content = match[1];

    const titleMatch = fullTag.match(/title="([^"]*)"/);
    const languageMatch = fullTag.match(/language="([^"]*)"/);

    artifacts.push({
      title: titleMatch ? titleMatch[1] : "Artifact",
      language: languageMatch ? languageMatch[1] : "text",
      content: content.trim(),
    });
  }
  return artifacts;
}

function collectArtifacts(messages) {
  const artifacts = new Map();
  for (const m of messages) {
    if (!Array.isArray(m?.content)) continue;
    for (const block of m.content) {
      if (block.type !== "tool_use" || block.name !== "artifacts") continue;
      const input = block.input || {};
      const id = input.id || "__artifact__";
      let a = artifacts.get(id);
      if (!a) {
        a = { content: "" };
        artifacts.set(id, a);
      }

      if (input.command === "update") {
        if (
          typeof input.old_str === "string" &&
          typeof input.new_str === "string"
        ) {
          if (a.content.includes(input.old_str)) {
            a.content = a.content.replace(input.old_str, () => input.new_str);
          } else {
            console.warn(
              `[AI Exporter] Artifact "${a.title || id}": update could not be applied (source text not found).`,
            );
          }
        }
      } else if (typeof input.content === "string") {
        a.content = input.content;
      }

      if (input.title) a.title = input.title;
      if (input.type) a.type = input.type;
      if (input.language) a.language = input.language;
      a.lastBlock = block;
      if (input.version_uuid) a.lastVersionUuid = input.version_uuid;
    }
  }
  return artifacts;
}

function extractArtifacts(message, foldedArtifacts = new Map()) {
  const artifacts = [];
  if (message.content && Array.isArray(message.content)) {
    for (const content of message.content) {
      if (content.type === "tool_use") {
        const input = content.input || {};
        if (content.name === "artifacts") {
          const id = input.id || "__artifact__";
          const folded = foldedArtifacts.get(id);

          // Only emit at the final edit block for this artifact
          if (folded && folded.lastBlock && folded.lastBlock !== content) {
            continue;
          }
          if (
            folded &&
            folded.lastVersionUuid &&
            input.version_uuid &&
            input.version_uuid !== folded.lastVersionUuid
          ) {
            continue;
          }

          const title = input.title || (folded && folded.title) || "Artifact";
          const lang =
            input.language ||
            (folded && folded.language) ||
            MIME_TO_LANG[input.type || (folded && folded.type)] ||
            "text";
          const code =
            (folded && folded.content) || input.content || input.new_str || "";
          if (code) {
            artifacts.push({
              title,
              language: lang,
              content: code.trim(),
            });
          }
        } else if (content.name === "create_file") {
          let code = "";
          let filename = "file";
          let lang = "";

          if (typeof input.file_text === "string" && input.file_text) {
            code = input.file_text.trim();
            filename = String(input.path || "file")
              .split("/")
              .pop();
            const ext = filename.includes(".")
              ? filename.split(".").pop().toLowerCase()
              : "";
            lang = EXT_TO_LANG[ext] || ext || "text";
          } else if (content.display_content) {
            const displayContent = content.display_content;
            if (displayContent.type === "code_block" && displayContent.code) {
              filename = displayContent.filename || "artifact";
              code = displayContent.code.trim();
              lang = displayContent.language || "text";
            } else if (
              displayContent.type === "json_block" &&
              displayContent.json_block
            ) {
              try {
                const data = JSON.parse(displayContent.json_block);
                if (data.filename) {
                  filename = data.filename;
                  code = (data.code || "").trim();
                  lang = data.language || "text";
                }
              } catch (e) {
                console.warn(
                  "[AI Exporter] Failed to parse tool use artifact json:",
                  e,
                );
              }
            }
          }

          if (code) {
            const title = filename
              .split("/")
              .pop()
              .replace(/\.[^.]+$/, "");
            artifacts.push({
              title: title || "Artifact",
              language: lang,
              content: code,
            });
          }
        }
      }

      if (content.text) {
        artifacts.push(...extractArtifactsFromText(content.text));
      }
    }
  }
  if (message.text) {
    artifacts.push(...extractArtifactsFromText(message.text));
  }
  return artifacts;
}

function unrollInteractiveElements(root, doc) {
  if (!root || !doc) return;

  // Group slide titles by their common card container
  const titleEls = Array.from(root.querySelectorAll(".text-title"));
  if (titleEls.length > 0) {
    const containerMap = new Map();
    for (const titleEl of titleEls) {
      let container = titleEl.parentElement;
      while (container && container !== root) {
        if (
          container.classList.contains("@container") ||
          container.classList.contains("bg-surface-2") ||
          container.querySelector(
            '[aria-label*="Go to step"], [aria-current="step"]',
          )
        ) {
          break;
        }
        container = container.parentElement;
      }
      if (container && container !== root) {
        if (!containerMap.has(container)) {
          containerMap.set(container, []);
        }
        containerMap.get(container).push(titleEl);
      }
    }

    for (const [container, titles] of containerMap.entries()) {
      const slides = [];
      titles.forEach((titleEl, idx) => {
        const title = titleEl.textContent.trim();
        const bodyEl =
          titleEl.nextElementSibling ||
          titleEl.parentElement.querySelector(".text-body");
        const body = bodyEl ? bodyEl.textContent.trim() : "";
        if (title) slides.push({ index: idx + 1, title, body });
      });

      if (slides.length > 0) {
        const replacement = doc.createElement("div");
        replacement.className = "unrolled-interactive-steps";
        slides.forEach((slide) => {
          const h3 = doc.createElement("h3");
          h3.textContent = `${slide.index}. ${slide.title}`;
          replacement.appendChild(h3);
          if (slide.body) {
            const p = doc.createElement("p");
            p.textContent = slide.body;
            replacement.appendChild(p);
          }
        });
        container.replaceWith(replacement);
      }
    }
  }

  // Remove any remaining buttons
  root.querySelectorAll("button").forEach((btn) => btn.remove());
}

export class ClaudeParser extends ChatParser {
  name = "Claude";
  constructor() {
    super();
    this.lastFetch = null;
  }

  isAvailable(url) {
    return url.includes("claude.ai");
  }

  async parse(options = {}) {
    const title = document.title || "Claude Chat";
    const messages = [];

    const conversationId = getConversationId();
    const parserMode = options.parserMode || "auto";

    if (conversationId && parserMode !== "prefer_dom") {
      const orgId = await getOrganizationId();
      if (orgId) {
        try {
          const now = Date.now();
          let data;

          if (
            this.lastFetch &&
            this.lastFetch.conversationId === conversationId &&
            now - this.lastFetch.timestamp < 20000
          ) {
            data = this.lastFetch.data;
          } else {
            data = await fetchConversation(orgId, conversationId);
            this.lastFetch = {
              conversationId,
              timestamp: now,
              data,
            };
          }

          const branch = getCurrentBranch(data);
          const foldedArtifacts = collectArtifacts(branch);

          const toolResultMap = new Map();
          for (const msg of branch) {
            if (Array.isArray(msg?.content)) {
              for (const block of msg.content) {
                if (block.type === "tool_result") {
                  const toolUseId = block.tool_use_id || block.id;
                  let answers = block.toolUseResult?.answers || {};
                  if (
                    (!answers || Object.keys(answers).length === 0) &&
                    typeof block.content === "string"
                  ) {
                    try {
                      const parsed = JSON.parse(block.content);
                      answers = parsed.answers || parsed;
                    } catch {
                      answers = { result: block.content };
                    }
                  }
                  toolResultMap.set(toolUseId, answers);
                }
              }
            }
          }

          const convTitle = data.name || title;

          for (const message of branch) {
            const role = message.sender === "human" ? "User" : "Claude";

            let contentStr = "";
            let thinkingStr = "";

            // Construct content
            if (message.content && Array.isArray(message.content)) {
              for (const block of message.content) {
                if (block.type === "thinking") {
                  let thoughtText = "";
                  if (
                    typeof block.thinking === "string" &&
                    block.thinking.trim()
                  ) {
                    thoughtText = block.thinking.trim();
                  } else if (Array.isArray(block.summaries)) {
                    thoughtText = block.summaries
                      .map((s) =>
                        typeof s === "string" ? s : s?.summary || "",
                      )
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .join("\n");
                  }
                  if (thoughtText) {
                    thinkingStr += (thinkingStr ? "\n\n" : "") + thoughtText;
                  }
                } else if (block.type === "text" && block.text) {
                  const cleanText = block.text
                    .replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, "")
                    .trim();
                  if (cleanText) {
                    contentStr += `${cleanText}\n\n`;
                  }
                } else if (block.type === "tool_use") {
                  const input = block.input || {};
                  if (
                    block.name === "visualize:show_widget" &&
                    input.widget_code
                  ) {
                    const widgetTitle = input.title || "Interactive Widget";
                    contentStr += `> **Interactive Widget: ${widgetTitle}**\n\n\`\`\`jsx\n${input.widget_code.trim()}\n\`\`\`\n\n`;
                  } else if (block.name === "repl" && input.code) {
                    contentStr += `**Analyzed data**\n\n\`\`\`javascript\n${input.code.trim()}\n\`\`\`\n\n`;
                  } else if (
                    block.name === "AskUserQuestion" &&
                    Array.isArray(input.questions) &&
                    input.questions.length > 0
                  ) {
                    const qCount = input.questions.length;
                    const countLabel =
                      qCount === 1
                        ? "Asked 1 question"
                        : `Asked ${qCount} questions`;
                    let qStr = `> **${countLabel}:**\n`;
                    const answers = toolResultMap.get(block.id) || {};
                    for (const q of input.questions) {
                      const qText = q.question || q.text || "";
                      const ans = answers[qText];
                      let ansStr = "";
                      if (typeof ans === "string") {
                        ansStr = ans;
                      } else if (Array.isArray(ans)) {
                        ansStr = ans.join(", ");
                      } else if (ans && typeof ans === "object") {
                        ansStr = JSON.stringify(ans);
                      } else if (ans != null) {
                        ansStr = String(ans);
                      }
                      qStr += ansStr
                        ? `> - **${qText}** — ${ansStr}\n`
                        : `> - ${qText}\n`;
                    }
                    contentStr += `${qStr}\n`;
                  }
                }
              }
            } else if (message.text) {
              const cleanText = message.text
                .replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, "")
                .trim();
              if (cleanText) {
                contentStr += `${cleanText}\n\n`;
              }
            }

            // Append attachments (for user messages)
            if (message.attachments && message.attachments.length > 0) {
              for (const attachment of message.attachments) {
                if (attachment.file_name) {
                  let header = `### Attachment: ${attachment.file_name}`;
                  const meta = [];
                  if (attachment.file_size) {
                    meta.push(`${(attachment.file_size / 1024).toFixed(1)} KB`);
                  }
                  if (attachment.file_type) {
                    meta.push(attachment.file_type);
                  }
                  if (meta.length > 0) {
                    header += ` _(${meta.join(", ")})_`;
                  }
                  contentStr += `\n\n${header}\n`;
                  if (attachment.extracted_content) {
                    contentStr += `\`\`\`\`\n${attachment.extracted_content}\n\`\`\`\`\n\n`;
                  }
                } else if (attachment.extracted_content) {
                  contentStr += `\n\n### Pasted\n\`\`\`\`\n${attachment.extracted_content}\n\`\`\`\`\n\n`;
                }
              }
            }

            // Append files (images/documents)
            if (message.files && Array.isArray(message.files)) {
              for (const file of message.files) {
                const name = file.file_name || "file";
                if (
                  file.file_kind === "image" &&
                  (file.preview_url || file.preview_asset?.url)
                ) {
                  const url = file.preview_url || file.preview_asset.url;
                  contentStr += `\n\n**Attachment: ${name}**\n\n![${name}](${url})\n\n`;
                } else if (
                  file.file_kind === "document" &&
                  file.document_asset?.url
                ) {
                  const url = file.document_asset.url;
                  const pages = file.document_asset.page_count;
                  const pageInfo = pages
                    ? ` · ${pages} page${pages === 1 ? "" : "s"}`
                    : "";
                  contentStr += `\n\n**Attachment: [${name}](${url})** _(document${pageInfo})_\n\n`;
                }
              }
            }

            if (thinkingStr) {
              contentStr = `<think>\n${thinkingStr}\n</think>\n\n` + contentStr;
            }

            contentStr = contentStr.trim();
            if (contentStr) {
              const msgObj = { role, content: contentStr };
              if (thinkingStr) {
                msgObj.thinking = thinkingStr;
              }
              messages.push(msgObj);
            }

            // Extract and push artifacts
            const artifacts = extractArtifacts(message, foldedArtifacts);
            for (const artifact of artifacts) {
              let artContent = "";
              const artTitle = artifact.title || "Artifact";
              const artText = artifact.content || "";
              const artLang = artifact.language || "text";

              if (artLang === "markdown" || artLang === "text") {
                const quotedContent = artText
                  .split("\n")
                  .map((line) => `> ${line}`)
                  .join("\n");
                artContent = `\n\n> **Artifact: ${artTitle}**\n\n${quotedContent}\n\n`;
              } else {
                artContent = `\n\n> **Artifact: ${artTitle}**\n\`\`\`${artLang}\n${artText}\n\`\`\`\n\n`;
              }

              messages.push({
                role: "Claude Artifact",
                content: artContent.trim(),
              });
            }
          }

          const currentUrl =
            typeof window !== "undefined" && window.location
              ? window.location.href || ""
              : "";
          const metadata = {
            Source: "Claude",
            Date: new Date().toLocaleString(),
            Link: currentUrl,
            Model: data.model || "Claude",
            Method: "API",
          };

          return { title: convTitle, messages, url: currentUrl, metadata };
        } catch (e) {
          console.error(
            "[AI Exporter] Claude API parse failed, falling back to DOM:",
            e,
          );
        }
      }
    }

    // Inject the React reader script if not already injected (DOM Fallback)
    if (!document.getElementById("ai-export-claude-reader")) {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("content/claude_react_reader.js");
      script.id = "ai-export-claude-reader";
      script.onload = function () {
        this.remove(); // Clean up script tag
      };
      (document.head || document.documentElement).appendChild(script);
      // Give it a moment to initialize
      await new Promise((r) => setTimeout(r, 100));
    }

    // Helper to get artifact info
    const getArtifactInfo = (index) => {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === "RspAtftInfo" && event.data.idx === index) {
            window.removeEventListener("message", handler);
            resolve(event.data.atftInfo);
          }
        };
        window.addEventListener("message", handler);
        window.postMessage(
          { type: "ReqAtftInfo", idx: index },
          window.location.origin,
        );

        // Timeout fallback
        setTimeout(() => {
          window.removeEventListener("message", handler);
          resolve(null);
        }, 1000); // 1s timeout
      });
    };

    const strictSelectors = [
      '[data-testid="user-message"]',
      ".font-claude-message",
      ".font-claude-response",
      ".artifact-block-cell",
    ].join(", ");

    const fallbackSelectors = ["div.font-serif"].join(", ");

    const strictCandidates = Array.from(
      document.querySelectorAll(strictSelectors),
    );
    const fallbackCandidates = Array.from(
      document.querySelectorAll(fallbackSelectors),
    );

    const validFallbacks = fallbackCandidates.filter((fallback) => {
      const overlapsWithError = strictCandidates.some(
        (strict) => strict.contains(fallback) || fallback.contains(strict),
      );
      return !overlapsWithError;
    });

    const combinedSet = new Set([...strictCandidates, ...validFallbacks]);
    const allElements = Array.from(
      document.querySelectorAll(`${strictSelectors}, ${fallbackSelectors}`),
    ).filter((el) => combinedSet.has(el));

    const artifactElements = document.querySelectorAll(".artifact-block-cell");
    const artifactMap = new Map();
    artifactElements.forEach((el, index) => artifactMap.set(el, index));

    for (const el of allElements) {
      let role = "Unknown";
      let content = "";

      if (el.matches('[data-testid="user-message"]')) {
        role = "User";
        const clone = el.cloneNode(true);
        unrollInteractiveElements(clone, el.ownerDocument || document);
        content = convertToMarkdown(clone);
      } else if (
        el.matches(".font-claude-message") ||
        el.matches(".font-claude-response") ||
        el.matches("div.font-serif")
      ) {
        role = "Claude";
        const clone = el.cloneNode(true);
        unrollInteractiveElements(clone, el.ownerDocument || document);
        content = convertToMarkdown(clone);
      } else if (el.matches(".artifact-block-cell")) {
        role = "Claude Artifact";

        const index = artifactMap.get(el);
        if (index !== undefined) {
          const info = await getArtifactInfo(index);
          if (info) {
            const artTitle = info.title || "Artifact";
            const artContent = info.content || "";
            const artLang = info.language || "text";
            if (artLang === "markdown" || artLang === "text") {
              const quotedContent = artContent
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
              content = `\n\n> **Artifact: ${artTitle}**\n\n${quotedContent}\n\n`;
            } else {
              content = `\n\n> **Artifact: ${artTitle}**\n\`\`\`${artLang}\n${artContent}\n\`\`\`\n\n`;
            }
          } else {
            const header =
              el.querySelector(".flex.items-center.gap-2") ||
              el.querySelector(".font-bold");
            const fallbackTitle = header
              ? header.innerText.split("\n")[0]
              : "Unknown Artifact";
            content = `\n> [Artifact: ${fallbackTitle} - content extraction failed]\n`;
          }
        }
      }

      if (content) {
        messages.push({ role, content });
      }
    }

    const currentUrl =
      typeof window !== "undefined" && window.location
        ? window.location.href || ""
        : "";
    const metadata = {
      Source: "Claude",
      Date: new Date().toLocaleString(),
      Link: currentUrl,
      Model: "Claude",
      Method: "DOM",
    };

    return { title, messages, url: currentUrl, metadata };
  }
}
