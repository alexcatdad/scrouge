import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGuestMode } from "../lib/guestMode";
import { useChatStorage } from "../lib/useChatStorage";
import {
  checkWebGPUSupport,
  initWebLLM,
  chatWithTools,
  type WebLLMModelId,
  type ChatMessage as WebLLMChatMessage,
} from "../lib/webllm";
import {
  subscriptionTools,
  buildSystemPrompt,
  parseToolCallArgs,
  validateToolCall,
} from "../lib/webllmTools";
import type { InitProgressReport } from "@mlc-ai/web-llm";
import { useSubscriptions, usePaymentMethods } from "../lib/useSubscriptionData";

type WebLLMState = {
  isSupported: boolean | null;
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  progressText: string;
  error: string | null;
};

export function ChatInterface() {
  const { isGuest } = useGuestMode();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localResponse, setLocalResponse] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local chat storage (Dexie)
  const { messages, addMessage, clearMessages } = useChatStorage();

  // WebLLM state
  const [webllmState, setWebllmState] = useState<WebLLMState>({
    isSupported: null,
    isLoading: false,
    isReady: false,
    progress: 0,
    progressText: "",
    error: null,
  });

  // AI settings (only for authenticated users)
  const aiSettings = useQuery(api.aiSettings.get, isGuest ? "skip" : {});

  // Context for AI (subscriptions and payment methods) - works for both guest and authenticated
  const subscriptions = useSubscriptions();
  const paymentMethods = usePaymentMethods();

  // Remote inference action (authenticated users only)
  const generateRemoteResponse = useAction(api.chat.generateResponse);

  // Tool execution for WebLLM (authenticated users only)
  const executeLocalToolCall = useMutation(api.chat.executeLocalToolCall);

  // Determine if using WebLLM
  const isWebLLMProvider = isGuest || aiSettings?.provider === "webllm";

  // Check WebGPU support on mount
  useEffect(() => {
    checkWebGPUSupport().then((supported) => {
      setWebllmState((prev) => ({ ...prev, isSupported: supported }));
    });
  }, []);

  // Initialize WebLLM when provider is webllm
  useEffect(() => {
    if (!isWebLLMProvider || !webllmState.isSupported || webllmState.isReady || webllmState.isLoading) {
      return;
    }

    const initModel = async () => {
      setWebllmState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 0,
        progressText: "Initializing...",
      }));

      try {
        const modelId = (aiSettings?.modelId as WebLLMModelId) || "Hermes-3-Llama-3.1-8B-q4f16_1-MLC";

        await initWebLLM(modelId, (report: InitProgressReport) => {
          setWebllmState((prev) => ({
            ...prev,
            progress: report.progress,
            progressText: report.text,
          }));
        });

        setWebllmState((prev) => ({
          ...prev,
          isLoading: false,
          isReady: true,
          progress: 1,
          progressText: "Ready",
        }));
      } catch (error: any) {
        console.error("Failed to initialize WebLLM:", error);
        setWebllmState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || "Failed to initialize local AI",
        }));
      }
    };

    initModel();
  }, [isWebLLMProvider, webllmState.isSupported, webllmState.isReady, webllmState.isLoading, aiSettings?.modelId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, localResponse]);

  // Handle local WebLLM inference
  const handleLocalInference = useCallback(
    async (userMessage: string) => {
      if (!subscriptions || !paymentMethods) {
        throw new Error("Context not loaded");
      }

      // Store user message locally
      await addMessage(userMessage, "user");

      // Build system prompt with context
      const systemPrompt = buildSystemPrompt(
        subscriptions.map((s) => ({
          _id: s._id as any,
          name: s.name,
          cost: s.cost,
          currency: s.currency,
          billingCycle: s.billingCycle,
          isActive: s.isActive,
          category: s.category,
        })),
        paymentMethods.map((pm) => ({
          _id: pm._id as any,
          name: pm.name,
          lastFourDigits: pm.lastFourDigits,
          isDefault: pm.isDefault,
        }))
      );

      // Build messages for the model
      const chatMessages: WebLLMChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];

      // Run inference with tools
      const result = await chatWithTools(chatMessages, subscriptionTools);

      // Handle tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolResults: Array<{ success: boolean; message: string }> = [];

        for (const toolCall of result.toolCalls) {
          const validation = validateToolCall(toolCall);
          if (!validation.valid) {
            toolResults.push({ success: false, message: validation.error || "Invalid tool call" });
            continue;
          }

          const args = parseToolCallArgs(toolCall);

          // For guest mode, we can't execute tool calls on the server
          // TODO: Implement guest-mode tool execution via Dexie
          if (isGuest) {
            toolResults.push({
              success: false,
              message: "Tool execution requires an account. Please sign up to add/modify subscriptions via chat.",
            });
            continue;
          }

          const toolResult = await executeLocalToolCall({
            toolName: toolCall.function.name,
            toolArgs: args as any,
          });
          toolResults.push(toolResult);
        }

        // Generate a response summarizing the tool results
        const successResults = toolResults.filter((r) => r.success);
        const failedResults = toolResults.filter((r) => !r.success);

        let responseContent = "";
        if (successResults.length > 0) {
          responseContent = successResults.map((r) => r.message).join("\n");
        }
        if (failedResults.length > 0) {
          if (responseContent) responseContent += "\n\n";
          responseContent += "Some actions failed:\n" + failedResults.map((r) => r.message).join("\n");
        }

        // Store assistant response locally
        await addMessage(responseContent, "assistant");
        return responseContent;
      }

      // No tool calls - just a regular response
      const responseContent =
        result.content || "I'm not sure how to help with that. Try asking me to add, update, or cancel a subscription.";
      await addMessage(responseContent, "assistant");
      return responseContent;
    },
    [subscriptions, paymentMethods, addMessage, isGuest, executeLocalToolCall]
  );

  // Handle remote inference (authenticated users with non-WebLLM provider)
  const handleRemoteInference = useCallback(
    async (userMessage: string) => {
      // Store user message locally
      await addMessage(userMessage, "user");

      // Call remote AI action
      const response = await generateRemoteResponse({ userMessage });

      // Store assistant response locally
      await addMessage(response, "assistant");
      return response;
    },
    [addMessage, generateRemoteResponse]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    setIsLoading(true);
    setLocalResponse(null);

    try {
      if (isWebLLMProvider && webllmState.isReady) {
        // Local inference
        await handleLocalInference(userMessage);
      } else if (isWebLLMProvider && !webllmState.isReady) {
        // WebLLM not ready
        if (webllmState.error) {
          // Show error
          await addMessage(userMessage, "user");
          await addMessage(
            `Local AI failed to load: ${webllmState.error}. Please try refreshing the page or switch to a remote AI provider in settings.`,
            "assistant"
          );
        } else {
          // Still loading
          setLocalResponse("Please wait for the AI model to finish loading...");
        }
      } else {
        // Remote inference (authenticated users with API key)
        await handleRemoteInference(userMessage);
      }
    } catch (error: any) {
      console.error("Failed to process message:", error);
      await addMessage(`Error: ${error.message}. Please try again.`, "assistant");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const suggestions = [
    "Add Netflix for $15.99 per month",
    "What's my total monthly spending?",
    "Show me subscriptions expiring this week",
  ];

  // Check if chat is available
  const isChatAvailable = isGuest ? webllmState.isSupported !== false : aiSettings !== undefined;
  const isInputDisabled =
    isLoading || (isWebLLMProvider && webllmState.isLoading) || (isGuest && webllmState.isSupported === false);

  // Render WebLLM loading state
  const renderWebLLMStatus = () => {
    if (!isWebLLMProvider) return null;

    if (webllmState.isSupported === false) {
      return (
        <div className="mx-6 mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-amber-500 font-medium text-sm">WebGPU Not Supported</p>
              <p className="text-secondary text-xs mt-1">
                Your browser doesn't support WebGPU. Please use Chrome 113+ or Edge 113+
                {!isGuest && ", or switch to a remote AI provider in settings"}.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (webllmState.isLoading) {
      return (
        <div className="mx-6 mb-4 p-4 rounded-xl bg-accent-teal/10 border border-accent-teal/20">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-5 h-5 text-accent-teal animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-accent-teal font-medium text-sm">Loading Local AI Model</p>
              <p className="text-secondary text-xs mt-0.5">{webllmState.progressText}</p>
            </div>
            <span className="text-accent-teal text-sm font-mono">{Math.round(webllmState.progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-teal rounded-full transition-all duration-300"
              style={{ width: `${webllmState.progress * 100}%` }}
            />
          </div>
        </div>
      );
    }

    if (webllmState.error) {
      return (
        <div className="mx-6 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-red-500 font-medium text-sm">Local AI Error</p>
              <p className="text-secondary text-xs mt-1">{webllmState.error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (webllmState.isReady) {
      return (
        <div className="mx-6 mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500 text-sm font-medium">Local AI Ready</span>
            <span className="text-secondary text-xs ml-auto">Running on your device</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render empty state for guests without WebGPU support
  const renderGuestNoWebGPU = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">Browser Not Supported</h4>
      <p className="text-secondary text-sm max-w-sm mb-6">
        AI chat requires WebGPU which isn't supported in your browser. Please use Chrome 113+ or Edge 113+ for local AI,
        or sign up to use cloud-based AI providers.
      </p>
    </div>
  );

  // Render empty state when AI settings need configuration
  const renderConfigureAI = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">Configure AI Provider</h4>
      <p className="text-secondary text-sm max-w-xs mb-4">
        Set up your AI provider in Settings to enable the chat assistant.
      </p>
      <span className="badge badge-muted">Settings &rarr; AI Provider</span>
    </div>
  );

  // Render empty state with suggestions
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">Start a conversation</h4>
      <p className="text-secondary text-sm max-w-sm mb-6">
        I can help you add subscriptions, analyze spending, and manage your payments.
        {isGuest && " Sign up to save subscriptions via chat!"}
      </p>
      <div className="space-y-2 w-full max-w-sm">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => setMessage(suggestion)}
            className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-[rgba(113,113,122,0.15)] text-secondary text-sm hover:bg-white/[0.06] hover:text-white hover:border-[rgba(113,113,122,0.25)] transition-all"
          >
            "{suggestion}"
          </button>
        ))}
      </div>
    </div>
  );

  // Render messages
  const renderMessages = () => (
    <>
      {messages?.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={msg.role === "user" ? "chat-message-user" : "chat-message-assistant"}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            <p className={`text-xs mt-2 ${msg.role === "user" ? "text-[#09090b]/50" : "text-secondary/60"}`}>
              {formatTimestamp(msg.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">AI Assistant</h3>
            <p className="text-sm text-secondary">
              {isWebLLMProvider ? "Local AI • Private & Offline" : "Manage subscriptions through conversation"}
            </p>
          </div>
          {messages && messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-secondary hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
              title="Clear chat history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* WebLLM Status */}
      {renderWebLLMStatus()}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isGuest && webllmState.isSupported === false ? (
          renderGuestNoWebGPU()
        ) : !isGuest && !aiSettings ? (
          renderConfigureAI()
        ) : messages?.length === 0 ? (
          renderEmptyState()
        ) : (
          renderMessages()
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-message-assistant">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        {localResponse && (
          <div className="flex justify-start">
            <div className="chat-message-assistant">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{localResponse}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[rgba(113,113,122,0.15)]">
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isGuest && webllmState.isSupported === false
                ? "WebGPU not supported"
                : !isGuest && !aiSettings
                  ? "Configure AI settings first"
                  : isWebLLMProvider && webllmState.isLoading
                    ? "Loading AI model..."
                    : "Ask me about your subscriptions..."
            }
            className="input-field flex-1"
            disabled={isInputDisabled || (!isGuest && !aiSettings)}
          />
          <button
            type="submit"
            disabled={
              !message.trim() ||
              isLoading ||
              (!isGuest && !aiSettings) ||
              (isWebLLMProvider && !webllmState.isReady && !webllmState.error)
            }
            className="btn-primary px-5"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
