import { ChatParser } from "./base.js";
import { convertToMarkdown } from "../utils/html-to-markdown.js";

function getUserToken() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem("userToken");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.value || parsed || null;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

export function extractDeepSeekMessageContent(msgNode) {
  if (!msgNode) return "";
  // Current API shape: content lives in fragments[] ({type, content}).
  // REQUEST = user prompt, RESPONSE = final assistant answer.
  // THINK / TOOL_* fragments are intermediate reasoning/tool output.
  if (Array.isArray(msgNode.fragments) && msgNode.fragments.length > 0) {
    const isUser = msgNode.role === "USER" || msgNode.role === "user";
    const wanted = isUser ? "REQUEST" : "RESPONSE";
    const picked = msgNode.fragments.filter((f) => f && f.type === wanted);
    const fallback = picked.length > 0 ? picked : msgNode.fragments;
    const text = fallback
      .map((f) => (typeof f.content === "string" ? f.content : ""))
      .join("\n\n")
      .trim();
    if (text) return text;
  }
  // Legacy shape: top-level content/text fields.
  const legacy = msgNode.content || msgNode.text || "";
  return typeof legacy === "string" ? legacy.trim() : "";
}

function getConversationId() {
  try {
    if (typeof window === "undefined" || !window.location) return null;
    const path = window.location.pathname || window.location.href || "";
    return (
      path.match(/\/chat\/s\/([a-f0-9-]+)/)?.[1] ??
      path.match(/\/a\/chat\/s\/([a-f0-9-]+)/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

async function fetchDeepSeekConversation(sessionId, token) {
  const url = `https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${sessionId}&cache_version=0`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API request failed: ${response.status}`);
  }

  const json = await response.json();
  const bizData = json?.data?.biz_data;
  const chatMessages = bizData?.chat_messages || [];
  const currentMsgId = bizData?.chat_session?.current_message_id;

  if (!chatMessages.length || currentMsgId == null) {
    return [];
  }

  const messageMap = new Map();
  chatMessages.forEach((msg) => {
    if (msg && msg.message_id != null) {
      messageMap.set(msg.message_id, msg);
    }
  });

  const branch = [];
  let currentId = currentMsgId;
  while (currentId != null && messageMap.has(currentId)) {
    const msgNode = messageMap.get(currentId);
    branch.push(msgNode);
    currentId = msgNode.parent_id ?? null;
  }

  branch.reverse();

  return branch
    .map((msgNode) => {
      const isUser = msgNode.role === "USER" || msgNode.role === "user";
      const role = isUser ? "User" : "DeepSeek";
      const content = extractDeepSeekMessageContent(msgNode);
      let thinking = "";
      if (!isUser && Array.isArray(msgNode.fragments)) {
        const thinkFragments = msgNode.fragments.filter(
          (f) => f && f.type === "THINK" && typeof f.content === "string",
        );
        thinking = thinkFragments
          .map((f) => f.content.trim())
          .filter(Boolean)
          .join("\n\n");
      }
      let fullContent = "";
      if (thinking) {
        fullContent += `<think>\n${thinking}\n</think>\n\n`;
      }
      if (content.trim()) {
        fullContent += content.trim();
      }
      fullContent = fullContent.trim();
      const msg = { role, content: fullContent };
      if (thinking) {
        msg.thinking = thinking;
      }
      return msg;
    })
    .filter((msg) => msg.content.length > 0);
}

export class DeepSeekParser extends ChatParser {
  name = "DeepSeek";
  isAvailable(url) {
    return url.includes("chat.deepseek.com");
  }

  async parse() {
    const title = document.title || "DeepSeek Chat";

    const currentUrl =
      typeof window !== "undefined" && window.location
        ? window.location.href || ""
        : "";
    const metadata = {
      Source: "DeepSeek",
      Date: new Date().toLocaleString(),
      Link: currentUrl,
    };

    // Primary: API Extraction
    try {
      const token = getUserToken();
      const sessionId = getConversationId();
      if (token && sessionId) {
        const apiMessages = await fetchDeepSeekConversation(sessionId, token);
        if (apiMessages && apiMessages.length > 0) {
          return {
            title,
            messages: apiMessages,
            url: currentUrl,
            metadata: { ...metadata, Method: "API" },
          };
        }
      }
    } catch (e) {
      console.warn(
        "[AI Exporter] DeepSeek API fetch failed, falling back to DOM:",
        e,
      );
    }

    // Secondary: DOM Fallback
    const messages = [];

    // Selectors from research
    const userSelector = ".fbb737a4";
    const assistantSelector = ".ds-markdown";

    // We'll traverse the DOM to find these in order. Nested matches
    // (e.g. a .ds-markdown code fragment inside an assistant turn) are
    // skipped so each turn is exported exactly once.
    const allElements = Array.from(
      document.querySelectorAll(`${userSelector}, ${assistantSelector}`),
    );
    const outerElements = allElements.filter((el) => {
      // Skip collapsible thinking-chain blocks: they live inside
      // ds-think-content containers and would otherwise duplicate turns.
      let ancestor = el.parentElement;
      while (ancestor) {
        const cls =
          typeof ancestor.className === "string" ? ancestor.className : "";
        if (/think/i.test(cls)) return false;
        ancestor = ancestor.parentElement;
      }
      let parent = el.parentElement;
      while (parent) {
        if (
          parent.matches &&
          (parent.matches(userSelector) || parent.matches(assistantSelector))
        ) {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    });

    outerElements.forEach((el) => {
      let role = "Unknown";
      let thinking = "";
      if (el.matches(userSelector)) {
        role = "User";
      } else if (el.matches(assistantSelector)) {
        role = "DeepSeek";
        const messageContainer =
          (el.closest && el.closest(".ds-message")) || el.parentElement;
        if (messageContainer) {
          const thinkContainers =
            messageContainer.querySelectorAll(".ds-think-content");
          if (thinkContainers.length > 0) {
            thinking = Array.from(thinkContainers)
              .map((tc) => convertToMarkdown(tc).trim())
              .filter(Boolean)
              .join("\n\n");
          }
        }
      }

      const text = convertToMarkdown(el);
      let fullContent = "";
      if (thinking) {
        fullContent += `<think>\n${thinking}\n</think>\n\n`;
      }
      if (text.trim()) {
        fullContent += text.trim();
      }
      fullContent = fullContent.trim();
      if (fullContent) {
        const msg = { role, content: fullContent };
        if (thinking) {
          msg.thinking = thinking;
        }
        messages.push(msg);
      }
    });

    // Fallback if the specific classes fail (e.g. class name rotation)
    if (messages.length === 0) {
      const messageRows = document.querySelectorAll(
        ".ds-message-row, .message-row",
      );
      messageRows.forEach((row) => {
        const isUser = row.classList.contains("ds-user-message");
        const role = isUser ? "User" : "DeepSeek";
        const rowClone = row.cloneNode(true);
        let thinking = "";
        if (!isUser) {
          const thinkContainers =
            rowClone.querySelectorAll(".ds-think-content");
          if (thinkContainers.length > 0) {
            thinking = Array.from(thinkContainers)
              .map((tc) => {
                const md = convertToMarkdown(tc).trim();
                tc.remove();
                return md;
              })
              .filter(Boolean)
              .join("\n\n");
          }
        }
        const text = convertToMarkdown(rowClone);
        let fullContent = "";
        if (thinking) {
          fullContent += `<think>\n${thinking}\n</think>\n\n`;
        }
        if (text.trim()) {
          fullContent += text.trim();
        }
        fullContent = fullContent.trim();
        if (fullContent) {
          const msg = { role, content: fullContent };
          if (thinking) {
            msg.thinking = thinking;
          }
          messages.push(msg);
        }
      });
    }

    return {
      title,
      messages,
      url: currentUrl,
      metadata: { ...metadata, Method: "DOM" },
    };
  }
}
