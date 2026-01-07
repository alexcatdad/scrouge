import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGuestMode } from "../lib/guestMode";

export function ChatInterface() {
  const { isGuest } = useGuestMode();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.chat.getMessages, isGuest ? "skip" : { limit: 50 });
  const aiSettings = useQuery(api.aiSettings.get, isGuest ? "skip" : {});
  const sendMessage = useMutation(api.chat.sendMessage);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    setIsLoading(true);

    try {
      await sendMessage({ content: userMessage });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const suggestions = [
    "Add Netflix for $15.99 per month",
    "What's my total monthly spending?",
    "Show me subscriptions expiring this week",
  ];

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Assistant</h3>
            <p className="text-sm text-secondary">
              Manage subscriptions through conversation
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isGuest ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">AI Chat Requires an Account</h4>
            <p className="text-secondary text-sm max-w-sm mb-6">
              The AI assistant requires an account to store your conversations and API settings securely. Sign up to unlock this feature!
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-[rgba(113,113,122,0.15)]">
                <svg className="w-5 h-5 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-secondary">Bring your own AI API key</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-[rgba(113,113,122,0.15)]">
                <svg className="w-5 h-5 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-secondary">Manage subscriptions via chat</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-[rgba(113,113,122,0.15)]">
                <svg className="w-5 h-5 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-secondary">Conversation history saved</span>
              </div>
            </div>
            <p className="text-secondary/60 text-xs mt-6">
              Your guest data will be migrated when you create an account
            </p>
          </div>
        ) : !aiSettings ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Configure AI Provider</h4>
            <p className="text-secondary text-sm max-w-xs mb-4">
              Set up your AI provider in Settings to enable the chat assistant.
            </p>
            <span className="badge badge-muted">Settings &rarr; AI Provider</span>
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-accent-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Start a conversation</h4>
            <p className="text-secondary text-sm max-w-sm mb-6">
              I can help you add subscriptions, analyze spending, and manage your payments.
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
        ) : (
          messages?.slice().reverse().map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-[#09090b]/50' : 'text-secondary/60'}`}>
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-message-assistant">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-secondary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
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
            placeholder={isGuest ? "Sign up to use AI chat" : aiSettings ? "Ask me about your subscriptions..." : "Configure AI settings first"}
            className="input-field flex-1"
            disabled={isLoading || !aiSettings || isGuest}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading || !aiSettings || isGuest}
            className="btn-primary px-5"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
