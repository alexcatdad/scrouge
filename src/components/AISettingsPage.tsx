import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import {
  checkWebGPUSupport,
  DEFAULT_MODEL,
  isModelLoaded,
  unloadModel,
  WEBLLM_MODELS,
} from "../lib/webllm";

type AIProvider = "openai" | "xai" | "mistral" | "ollama" | "webllm";

export function AISettingsPage() {
  const [provider, setProvider] = useState<AIProvider>("webllm");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434/api");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);

  const settings = useQuery(api.aiSettings.get, {});
  const saveSettings = useMutation(api.aiSettings.save);
  const deleteSettings = useMutation(api.aiSettings.remove);

  // Check WebGPU support on mount
  useEffect(() => {
    checkWebGPUSupport().then(setWebGPUSupported);
  }, []);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModelId(settings.modelId || "");
      setOllamaBaseUrl(settings.ollamaBaseUrl || "http://localhost:11434/api");
    }
  }, [settings]);

  const handleSave = async () => {
    if (!apiKey.trim() && provider !== "ollama" && provider !== "webllm" && !settings) {
      toast.error("API key is required");
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings({
        provider,
        apiKey: provider === "webllm" ? "local" : apiKey.trim() || "dummy",
        modelId: modelId.trim() || undefined,
        ollamaBaseUrl: provider === "ollama" ? ollamaBaseUrl.trim() : undefined,
      });
      toast.success("AI settings saved!");
      setApiKey("");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete AI settings? The chat feature will be disabled.")) return;

    try {
      // Unload WebLLM model if loaded
      if (isModelLoaded()) {
        await unloadModel();
      }

      await deleteSettings({});
      toast.success("AI settings deleted");
      setApiKey("");
      setModelId("");
      setOllamaBaseUrl("http://localhost:11434/api");
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const handleTest = async () => {
    if (provider === "webllm") {
      if (!webGPUSupported) {
        toast.error("WebGPU is not supported in your browser");
        return;
      }
      toast.info("WebLLM will load when you open the chat");
      await handleSave();
      return;
    }

    if (!apiKey.trim() && provider !== "ollama") {
      toast.error("Enter an API key first");
      return;
    }

    setIsTesting(true);
    try {
      toast.info("Testing connection...");
      await handleSave();
      toast.success("Settings saved! Test the connection in the chat.");
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getDefaultModel = (p: AIProvider): string => {
    switch (p) {
      case "openai":
        return "gpt-4o-mini";
      case "xai":
        return "grok-2-latest";
      case "mistral":
        return "mistral-large-latest";
      case "ollama":
        return "llama3.2";
      case "webllm":
        return DEFAULT_MODEL;
      default:
        return "";
    }
  };

  const providers = [
    {
      id: "webllm",
      name: "Local AI (WebLLM)",
      desc: "Runs entirely in your browser • No API key needed",
      badge: "Recommended",
      badgeColor: "bg-accent-teal/20 text-accent-teal",
    },
    { id: "openai", name: "OpenAI", desc: "GPT-4, GPT-3.5, and other OpenAI models" },
    { id: "xai", name: "xAI (Grok)", desc: "Grok models from xAI" },
    { id: "mistral", name: "Mistral AI", desc: "Mistral's powerful language models" },
    { id: "ollama", name: "Ollama", desc: "Local or remote Ollama instance (no API key)" },
  ];

  const needsApiKey = provider !== "ollama" && provider !== "webllm";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-[rgba(113,113,122,0.15)]">
          <h2 className="font-display text-2xl font-bold text-white">AI Provider Settings</h2>
          <p className="text-secondary text-sm mt-1">
            Configure your AI provider to enable the chat assistant.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status indicator */}
          {settings && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl ${
                settings.provider === "webllm"
                  ? "bg-accent-teal/10 border border-accent-teal/20"
                  : "bg-primary/10 border border-primary/20"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  settings.provider === "webllm" ? "bg-accent-teal" : "bg-primary"
                }`}
              />
              <p
                className={`text-sm ${settings.provider === "webllm" ? "text-accent-teal" : "text-primary"}`}
              >
                Configured:{" "}
                <span className="font-medium">
                  {settings.provider === "webllm" ? "Local AI (WebLLM)" : settings.provider}
                </span>
                {settings.modelId && <span className="opacity-70"> ({settings.modelId})</span>}
              </p>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-3">AI Provider</label>
            <div className="grid grid-cols-1 gap-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as AIProvider)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    provider === p.id
                      ? p.id === "webllm"
                        ? "border-accent-teal bg-accent-teal/10"
                        : "border-primary bg-primary/10"
                      : "border-[rgba(113,113,122,0.2)] hover:border-[rgba(113,113,122,0.4)] hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium ${
                        provider === p.id
                          ? p.id === "webllm"
                            ? "text-accent-teal"
                            : "text-primary"
                          : "text-white"
                      }`}
                    >
                      {p.name}
                    </p>
                    {p.badge && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${p.badgeColor}`}
                      >
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-secondary/70 text-xs mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* WebLLM Settings */}
          {provider === "webllm" && (
            <div className="space-y-4">
              {/* WebGPU Status */}
              <div
                className={`p-4 rounded-xl border ${
                  webGPUSupported === null
                    ? "bg-white/[0.02] border-[rgba(113,113,122,0.15)]"
                    : webGPUSupported
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-amber-500/10 border-amber-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {webGPUSupported === null ? (
                    <>
                      <svg
                        className="w-5 h-5 text-secondary animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-secondary text-sm">Checking WebGPU support...</span>
                    </>
                  ) : webGPUSupported ? (
                    <>
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-green-500 text-sm font-medium">WebGPU Supported</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 text-amber-500"
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
                        <span className="text-amber-500 text-sm font-medium">
                          WebGPU Not Supported
                        </span>
                        <p className="text-secondary/70 text-xs mt-0.5">
                          Please use Chrome 113+ or Edge 113+, or choose a different provider.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Model</label>
                <select
                  value={modelId || DEFAULT_MODEL}
                  onChange={(e) => setModelId(e.target.value)}
                  className="input-field"
                >
                  {WEBLLM_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.size})
                    </option>
                  ))}
                </select>
                <p className="text-secondary/60 text-xs mt-2">
                  {WEBLLM_MODELS.find((m) => m.id === (modelId || DEFAULT_MODEL))?.description}
                </p>
              </div>

              {/* Info box */}
              <div className="p-4 rounded-xl bg-accent-teal/5 border border-accent-teal/10">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-accent-teal shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-accent-teal">How Local AI Works</p>
                    <ul className="text-secondary/70 text-xs mt-2 space-y-1">
                      <li>• Model downloads on first use (~2-4 GB, cached in browser)</li>
                      <li>• All inference runs locally on your device</li>
                      <li>• No data sent to external servers</li>
                      <li>• Works offline after initial download</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Key */}
          {needsApiKey && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                API Key
                {settings && (
                  <span className="text-secondary/50 font-normal">
                    {" "}
                    (leave blank to keep existing)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider} API key`}
                className="input-field"
              />
              <p className="text-secondary/60 text-xs mt-2">
                Your key is encrypted and never exposed to the browser.
              </p>
            </div>
          )}

          {/* Ollama Base URL */}
          {provider === "ollama" && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Ollama Base URL
              </label>
              <input
                type="text"
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/api"
                className="input-field"
              />
              <p className="text-secondary/60 text-xs mt-2">
                Local: http://localhost:11434/api | Remote: your server URL
              </p>
            </div>
          )}

          {/* Model Override (for non-webllm providers) */}
          {provider !== "webllm" && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Model ID <span className="text-secondary/50 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder={getDefaultModel(provider)}
                className="input-field"
              />
              <p className="text-secondary/60 text-xs mt-2">
                Default: <code className="text-primary/80">{getDefaultModel(provider)}</code>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={
                isSaving ||
                (needsApiKey && !apiKey.trim() && !settings) ||
                (provider === "webllm" && webGPUSupported === false)
              }
              className="btn-primary flex-1"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              onClick={handleTest}
              disabled={
                isTesting ||
                (needsApiKey && !apiKey.trim() && !settings) ||
                (provider === "webllm" && webGPUSupported === false)
              }
              className="btn-success"
            >
              {isTesting ? "Testing..." : provider === "webllm" ? "Save & Test" : "Test"}
            </button>
            {settings && (
              <button onClick={handleDelete} className="btn-danger">
                Delete
              </button>
            )}
          </div>

          {/* Security note */}
          {provider !== "webllm" && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[rgba(113,113,122,0.15)]">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white">Security</p>
                  <p className="text-secondary/70 text-xs mt-1">
                    API keys are encrypted with AES-256-GCM before storage. They're only decrypted
                    server-side for API calls.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
