import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type AIProvider = "openai" | "xai" | "mistral" | "ollama";

export function AISettingsPage() {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434/api");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const settings = useQuery(api.aiSettings.get, {});
  const saveSettings = useMutation(api.aiSettings.save);
  const deleteSettings = useMutation(api.aiSettings.remove);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModelId(settings.modelId || "");
      setOllamaBaseUrl(settings.ollamaBaseUrl || "http://localhost:11434/api");
    }
  }, [settings]);

  const handleSave = async () => {
    if (!apiKey.trim() && provider !== "ollama") {
      toast.error("API key is required");
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings({
        provider,
        apiKey: apiKey.trim() || "dummy",
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
      case "openai": return "gpt-4o-mini";
      case "xai": return "grok-2-latest";
      case "mistral": return "mistral-large-latest";
      case "ollama": return "llama3.2";
      default: return "";
    }
  };

  const providers = [
    { id: "openai", name: "OpenAI", desc: "GPT-4, GPT-3.5, and other OpenAI models" },
    { id: "xai", name: "xAI (Grok)", desc: "Grok models from xAI" },
    { id: "mistral", name: "Mistral AI", desc: "Mistral's powerful language models" },
    { id: "ollama", name: "Ollama", desc: "Local or remote Ollama instance (no API key)" },
  ];

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
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-teal/10 border border-accent-teal/20">
              <div className="w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
              <p className="text-sm text-accent-teal">
                Configured: <span className="font-medium">{settings.provider}</span>
                {settings.modelId && <span className="text-accent-teal/70"> ({settings.modelId})</span>}
              </p>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-3">
              AI Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as AIProvider)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    provider === p.id
                      ? 'border-primary bg-primary/10'
                      : 'border-[rgba(113,113,122,0.2)] hover:border-[rgba(113,113,122,0.4)] hover:bg-white/[0.02]'
                  }`}
                >
                  <p className={`font-medium ${provider === p.id ? 'text-primary' : 'text-white'}`}>
                    {p.name}
                  </p>
                  <p className="text-secondary/70 text-xs mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          {provider !== "ollama" && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                API Key
                {settings && <span className="text-secondary/50 font-normal"> (leave blank to keep existing)</span>}
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

          {/* Model Override */}
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

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving || (!apiKey.trim() && provider !== "ollama" && !settings)}
              className="btn-primary flex-1"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              onClick={handleTest}
              disabled={isTesting || (!apiKey.trim() && provider !== "ollama" && !settings)}
              className="btn-success"
            >
              {isTesting ? "Testing..." : "Test"}
            </button>
            {settings && (
              <button onClick={handleDelete} className="btn-danger">
                Delete
              </button>
            )}
          </div>

          {/* Security note */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-[rgba(113,113,122,0.15)]">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-secondary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">Security</p>
                <p className="text-secondary/70 text-xs mt-1">
                  API keys are encrypted with AES-256-GCM before storage. They're only decrypted server-side for API calls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
