import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import { guestDb, type ChatMessageRole, type LocalChatMessage } from "./guestDb";

export interface ChatMessage {
  id: number;
  content: string;
  role: ChatMessageRole;
  timestamp: number;
}

/**
 * Hook for managing chat messages stored locally in Dexie.
 * Chat is client-side only - no server persistence needed for natural language CRUD.
 */
export function useChatStorage() {
  // Get messages ordered by timestamp (oldest first for display)
  const messages = useLiveQuery(
    () => guestDb.chatMessages.orderBy("timestamp").toArray(),
    []
  );

  const addMessage = useCallback(
    async (content: string, role: ChatMessageRole): Promise<number> => {
      const message: LocalChatMessage = {
        content,
        role,
        timestamp: Date.now(),
      };
      return await guestDb.chatMessages.add(message);
    },
    []
  );

  const clearMessages = useCallback(async (): Promise<void> => {
    await guestDb.clearChatMessages();
  }, []);

  return {
    messages: messages as ChatMessage[] | undefined,
    addMessage,
    clearMessages,
  };
}

