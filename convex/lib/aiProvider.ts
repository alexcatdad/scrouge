import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";

export type AIProvider = "openai" | "xai" | "mistral" | "ollama" | "webllm";

export interface ProviderOptions {
  apiKey?: string;
  baseURL?: string;
  modelId?: string;
}

/**
 * Get the appropriate AI model based on provider and configuration
 */
export function getModel(provider: AIProvider, options: ProviderOptions = {}): LanguageModel {
  const { apiKey, baseURL, modelId } = options;

  switch (provider) {
    case "openai": {
      const client = createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        baseURL,
      });
      return client(modelId ?? "gpt-4o-mini");
    }

    case "xai": {
      const client = createXai({
        apiKey: apiKey || process.env.XAI_API_KEY,
        baseURL,
      });
      return client(modelId ?? "grok-2-latest");
    }

    case "mistral": {
      const client = createMistral({
        apiKey: apiKey || process.env.MISTRAL_API_KEY,
        baseURL,
      });
      return client(modelId ?? "mistral-large-latest");
    }

    case "ollama": {
      const ollamaBaseUrl = baseURL ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api";
      const ollamaClient = createOllama({
        baseURL: ollamaBaseUrl,
      });
      return ollamaClient(modelId ?? "llama3.2");
    }

    case "webllm":
      // WebLLM runs client-side, not on the server
      // This case should never be reached - local inference is handled in the browser
      throw new Error("WebLLM provider runs client-side. Server-side inference not supported.");

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
