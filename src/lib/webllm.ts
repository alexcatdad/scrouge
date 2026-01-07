import {
  CreateMLCEngine,
  MLCEngine,
  InitProgressReport,
  ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";

// Available models optimized for tool calling
export const WEBLLM_MODELS = [
  {
    id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
    name: "Hermes 3 Llama 3.1 8B (Recommended)",
    size: "4.3 GB",
    description: "Best for tool calling and function execution",
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 3B Instruct",
    size: "1.9 GB",
    description: "Smaller model, faster download",
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    name: "Llama 3.1 8B Instruct",
    size: "4.3 GB",
    description: "General purpose, good quality",
  },
] as const;

export type WebLLMModelId = (typeof WEBLLM_MODELS)[number]["id"];

export const DEFAULT_MODEL: WebLLMModelId = "Hermes-3-Llama-3.1-8B-q4f16_1-MLC";

export interface WebLLMStatus {
  isSupported: boolean;
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  progressText: string;
  error: string | null;
  currentModel: WebLLMModelId | null;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// Singleton engine instance
let engineInstance: MLCEngine | null = null;
let currentModelId: WebLLMModelId | null = null;

/**
 * Check if WebGPU is supported in the current browser
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!("gpu" in navigator)) return false;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Get the current WebLLM engine instance
 */
export function getEngine(): MLCEngine | null {
  return engineInstance;
}

/**
 * Check if a model is currently loaded
 */
export function isModelLoaded(): boolean {
  return engineInstance !== null && currentModelId !== null;
}

/**
 * Get the currently loaded model ID
 */
export function getCurrentModel(): WebLLMModelId | null {
  return currentModelId;
}

/**
 * Initialize the WebLLM engine with a specific model
 */
export async function initWebLLM(
  modelId: WebLLMModelId = DEFAULT_MODEL,
  onProgress?: (report: InitProgressReport) => void
): Promise<MLCEngine> {
  // If same model is already loaded, return existing engine
  if (engineInstance && currentModelId === modelId) {
    return engineInstance;
  }

  // If different model, unload first
  if (engineInstance && currentModelId !== modelId) {
    await unloadModel();
  }

  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
  });

  engineInstance = engine;
  currentModelId = modelId;

  return engine;
}

/**
 * Unload the current model and free resources
 */
export async function unloadModel(): Promise<void> {
  if (engineInstance) {
    await engineInstance.unload();
    engineInstance = null;
    currentModelId = null;
  }
}

/**
 * Run chat completion with tool calling support
 */
export async function chatWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{
  content: string | null;
  toolCalls: ToolCall[] | null;
}> {
  if (!engineInstance) {
    throw new Error("WebLLM engine not initialized. Call initWebLLM first.");
  }

  const { temperature = 0.7, maxTokens = 1024 } = options;

  const response = await engineInstance.chat.completions.create({
    messages: messages as ChatCompletionMessageParam[],
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? "auto" : undefined,
    temperature,
    max_tokens: maxTokens,
  });

  const choice = response.choices[0];
  const message = choice.message;

  return {
    content: message.content,
    toolCalls: message.tool_calls as ToolCall[] | undefined ?? null,
  };
}

/**
 * Stream chat completion (without tool calling - for regular responses)
 */
export async function* streamChat(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  if (!engineInstance) {
    throw new Error("WebLLM engine not initialized. Call initWebLLM first.");
  }

  const { temperature = 0.7, maxTokens = 1024 } = options;

  const stream = await engineInstance.chat.completions.create({
    messages: messages as ChatCompletionMessageParam[],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

/**
 * Reset the chat context (clear KV cache)
 */
export async function resetChat(): Promise<void> {
  if (engineInstance) {
    await engineInstance.resetChat();
  }
}

/**
 * Get model info
 */
export function getModelInfo(modelId: WebLLMModelId) {
  return WEBLLM_MODELS.find((m) => m.id === modelId);
}

