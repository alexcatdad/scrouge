import { describe, expect, test } from "bun:test";

/**
 * useChatStorage hook business logic tests
 *
 * Tests the message handling and storage logic used in the chat storage hook
 * without requiring React rendering or IndexedDB.
 */

// Types
type ChatMessageRole = "user" | "assistant" | "system";

interface ChatMessage {
  id?: number;
  content: string;
  role: ChatMessageRole;
  timestamp: number;
}

// Message creation helper
function createMessage(content: string, role: ChatMessageRole): Omit<ChatMessage, "id"> {
  return {
    content,
    role,
    timestamp: Date.now(),
  };
}

// Message sorting (ascending by timestamp)
function sortMessagesByTimestamp(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

// Message filtering by role
function filterByRole(messages: ChatMessage[], role: ChatMessageRole): ChatMessage[] {
  return messages.filter((msg) => msg.role === role);
}

// Get last message by role
function getLastMessageByRole(
  messages: ChatMessage[],
  role: ChatMessageRole,
): ChatMessage | undefined {
  const sorted = sortMessagesByTimestamp(messages);
  return sorted.filter((msg) => msg.role === role).pop();
}

// Message validation
function isValidMessage(msg: Partial<ChatMessage>): boolean {
  if (!msg.content || typeof msg.content !== "string") return false;
  if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) return false;
  if (!msg.timestamp || typeof msg.timestamp !== "number") return false;
  return true;
}

// Truncate message content for display
function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength - 3)}...`;
}

// Extract tool calls from assistant message (simplified)
function extractToolCalls(content: string): string[] {
  const toolCallRegex = /\[TOOL_CALL:(\w+)\]/g;
  const matches = content.match(toolCallRegex);
  if (!matches) return [];
  return matches.map((match) => match.replace("[TOOL_CALL:", "").replace("]", ""));
}

describe("Message Creation", () => {
  describe("createMessage", () => {
    test("creates user message with correct role", () => {
      const msg = createMessage("Hello", "user");

      expect(msg.content).toBe("Hello");
      expect(msg.role).toBe("user");
      expect(typeof msg.timestamp).toBe("number");
    });

    test("creates assistant message with correct role", () => {
      const msg = createMessage("Hi there!", "assistant");

      expect(msg.role).toBe("assistant");
    });

    test("creates system message with correct role", () => {
      const msg = createMessage("System prompt", "system");

      expect(msg.role).toBe("system");
    });

    test("sets timestamp to current time", () => {
      const before = Date.now();
      const msg = createMessage("Test", "user");
      const after = Date.now();

      expect(msg.timestamp).toBeGreaterThanOrEqual(before);
      expect(msg.timestamp).toBeLessThanOrEqual(after);
    });

    test("handles empty content", () => {
      const msg = createMessage("", "user");

      expect(msg.content).toBe("");
    });

    test("handles long content", () => {
      const longContent = "a".repeat(10000);
      const msg = createMessage(longContent, "user");

      expect(msg.content.length).toBe(10000);
    });

    test("handles special characters in content", () => {
      const specialContent = "Hello! @#$%^&*() 你好 🎉";
      const msg = createMessage(specialContent, "user");

      expect(msg.content).toBe(specialContent);
    });
  });
});

describe("Message Sorting", () => {
  describe("sortMessagesByTimestamp", () => {
    test("sorts messages in ascending order", () => {
      const messages: ChatMessage[] = [
        { id: 1, content: "Third", role: "user", timestamp: 3000 },
        { id: 2, content: "First", role: "user", timestamp: 1000 },
        { id: 3, content: "Second", role: "assistant", timestamp: 2000 },
      ];

      const sorted = sortMessagesByTimestamp(messages);

      expect(sorted[0].content).toBe("First");
      expect(sorted[1].content).toBe("Second");
      expect(sorted[2].content).toBe("Third");
    });

    test("does not mutate original array", () => {
      const messages: ChatMessage[] = [
        { id: 1, content: "B", role: "user", timestamp: 2000 },
        { id: 2, content: "A", role: "user", timestamp: 1000 },
      ];

      const sorted = sortMessagesByTimestamp(messages);

      expect(messages[0].content).toBe("B");
      expect(sorted[0].content).toBe("A");
    });

    test("handles empty array", () => {
      const sorted = sortMessagesByTimestamp([]);

      expect(sorted.length).toBe(0);
    });

    test("handles single message", () => {
      const messages: ChatMessage[] = [{ id: 1, content: "Only", role: "user", timestamp: 1000 }];

      const sorted = sortMessagesByTimestamp(messages);

      expect(sorted.length).toBe(1);
      expect(sorted[0].content).toBe("Only");
    });

    test("handles messages with same timestamp", () => {
      const messages: ChatMessage[] = [
        { id: 1, content: "A", role: "user", timestamp: 1000 },
        { id: 2, content: "B", role: "assistant", timestamp: 1000 },
      ];

      const sorted = sortMessagesByTimestamp(messages);

      expect(sorted.length).toBe(2);
    });
  });
});

describe("Message Filtering", () => {
  const messages: ChatMessage[] = [
    { id: 1, content: "User 1", role: "user", timestamp: 1000 },
    { id: 2, content: "Assistant 1", role: "assistant", timestamp: 2000 },
    { id: 3, content: "User 2", role: "user", timestamp: 3000 },
    { id: 4, content: "System", role: "system", timestamp: 500 },
  ];

  describe("filterByRole", () => {
    test("filters user messages", () => {
      const result = filterByRole(messages, "user");

      expect(result.length).toBe(2);
      expect(result.every((msg) => msg.role === "user")).toBe(true);
    });

    test("filters assistant messages", () => {
      const result = filterByRole(messages, "assistant");

      expect(result.length).toBe(1);
      expect(result[0].content).toBe("Assistant 1");
    });

    test("filters system messages", () => {
      const result = filterByRole(messages, "system");

      expect(result.length).toBe(1);
      expect(result[0].content).toBe("System");
    });

    test("returns empty array when no matches", () => {
      const userOnly: ChatMessage[] = [{ id: 1, content: "User", role: "user", timestamp: 1000 }];

      const result = filterByRole(userOnly, "assistant");

      expect(result.length).toBe(0);
    });
  });

  describe("getLastMessageByRole", () => {
    test("gets last user message", () => {
      const result = getLastMessageByRole(messages, "user");

      expect(result?.content).toBe("User 2");
    });

    test("gets last assistant message", () => {
      const result = getLastMessageByRole(messages, "assistant");

      expect(result?.content).toBe("Assistant 1");
    });

    test("returns undefined when no messages of role", () => {
      const userOnly: ChatMessage[] = [{ id: 1, content: "User", role: "user", timestamp: 1000 }];

      const result = getLastMessageByRole(userOnly, "assistant");

      expect(result).toBeUndefined();
    });

    test("returns undefined for empty array", () => {
      const result = getLastMessageByRole([], "user");

      expect(result).toBeUndefined();
    });
  });
});

describe("Message Validation", () => {
  describe("isValidMessage", () => {
    test("validates complete message", () => {
      const msg: ChatMessage = {
        id: 1,
        content: "Hello",
        role: "user",
        timestamp: Date.now(),
      };

      expect(isValidMessage(msg)).toBe(true);
    });

    test("validates message without id", () => {
      const msg = {
        content: "Hello",
        role: "user" as ChatMessageRole,
        timestamp: Date.now(),
      };

      expect(isValidMessage(msg)).toBe(true);
    });

    test("rejects message without content", () => {
      const msg = {
        role: "user" as ChatMessageRole,
        timestamp: Date.now(),
      };

      expect(isValidMessage(msg)).toBe(false);
    });

    test("rejects message with empty content", () => {
      const msg = {
        content: "",
        role: "user" as ChatMessageRole,
        timestamp: Date.now(),
      };

      expect(isValidMessage(msg)).toBe(false);
    });

    test("rejects message without role", () => {
      const msg = {
        content: "Hello",
        timestamp: Date.now(),
      };

      expect(isValidMessage(msg)).toBe(false);
    });

    test("rejects message with invalid role", () => {
      const msg = {
        content: "Hello",
        role: "invalid" as ChatMessageRole,
        timestamp: Date.now(),
      };

      expect(isValidMessage(msg)).toBe(false);
    });

    test("rejects message without timestamp", () => {
      const msg = {
        content: "Hello",
        role: "user" as ChatMessageRole,
      };

      expect(isValidMessage(msg)).toBe(false);
    });

    test("rejects message with non-number timestamp", () => {
      const msg = {
        content: "Hello",
        role: "user" as ChatMessageRole,
        timestamp: "not a number" as unknown as number,
      };

      expect(isValidMessage(msg)).toBe(false);
    });
  });
});

describe("Content Processing", () => {
  describe("truncateContent", () => {
    test("returns short content unchanged", () => {
      const short = "Hello world";

      expect(truncateContent(short, 100)).toBe(short);
    });

    test("truncates long content with ellipsis", () => {
      const long = "a".repeat(150);

      const truncated = truncateContent(long, 100);

      expect(truncated.length).toBe(100);
      expect(truncated.endsWith("...")).toBe(true);
    });

    test("handles content exactly at limit", () => {
      const exact = "a".repeat(100);

      expect(truncateContent(exact, 100)).toBe(exact);
    });

    test("uses default max length of 100", () => {
      const long = "a".repeat(150);

      const truncated = truncateContent(long);

      expect(truncated.length).toBe(100);
    });

    test("handles empty content", () => {
      expect(truncateContent("", 100)).toBe("");
    });

    test("handles very small max length", () => {
      const content = "Hello World";

      const truncated = truncateContent(content, 8);

      expect(truncated).toBe("Hello...");
    });
  });

  describe("extractToolCalls", () => {
    test("extracts single tool call", () => {
      const content = "I'll add that subscription [TOOL_CALL:addSubscription]";

      const tools = extractToolCalls(content);

      expect(tools.length).toBe(1);
      expect(tools[0]).toBe("addSubscription");
    });

    test("extracts multiple tool calls", () => {
      const content = "[TOOL_CALL:addSubscription] and [TOOL_CALL:updateSubscription]";

      const tools = extractToolCalls(content);

      expect(tools.length).toBe(2);
      expect(tools).toContain("addSubscription");
      expect(tools).toContain("updateSubscription");
    });

    test("returns empty array when no tool calls", () => {
      const content = "Just a regular message";

      const tools = extractToolCalls(content);

      expect(tools.length).toBe(0);
    });

    test("handles empty content", () => {
      const tools = extractToolCalls("");

      expect(tools.length).toBe(0);
    });
  });
});

describe("Chat History Management", () => {
  // Simulate chat history operations
  interface ChatHistory {
    messages: ChatMessage[];
    add: (content: string, role: ChatMessageRole) => ChatMessage;
    clear: () => void;
    getAll: () => ChatMessage[];
  }

  function createChatHistory(): ChatHistory {
    let messages: ChatMessage[] = [];
    let nextId = 1;

    return {
      messages,
      add(content: string, role: ChatMessageRole) {
        const msg: ChatMessage = {
          id: nextId++,
          content,
          role,
          timestamp: Date.now(),
        };
        messages.push(msg);
        return msg;
      },
      clear() {
        messages = [];
        nextId = 1;
      },
      getAll() {
        return [...messages];
      },
    };
  }

  test("adds messages with incrementing IDs", () => {
    const history = createChatHistory();

    const msg1 = history.add("First", "user");
    const msg2 = history.add("Second", "assistant");

    expect(msg1.id).toBe(1);
    expect(msg2.id).toBe(2);
  });

  test("clears all messages", () => {
    const history = createChatHistory();

    history.add("First", "user");
    history.add("Second", "assistant");
    history.clear();

    expect(history.getAll().length).toBe(0);
  });

  test("resets ID counter after clear", () => {
    const history = createChatHistory();

    history.add("First", "user");
    history.clear();
    const newMsg = history.add("New first", "user");

    expect(newMsg.id).toBe(1);
  });

  test("getAll returns copy of messages", () => {
    const history = createChatHistory();

    history.add("Test", "user");
    const messages = history.getAll();
    messages.push({ id: 999, content: "Fake", role: "user", timestamp: 0 });

    expect(history.getAll().length).toBe(1);
  });
});
