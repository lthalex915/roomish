import { create } from "zustand";
import { localDb } from "@/lib/db/local";

export const PROVIDERS = [
  {
    id: "openrouter",
    label: "OpenRouter",
    hint: "One key for many models. Easy starting point.",
    defaultBase: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    keyHelp: "https://openrouter.ai/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "Official ChatGPT API.",
    defaultBase: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyHelp: "https://platform.openai.com/api-keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    hint: "Usually cheaper. Strong for study pages.",
    defaultBase: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    keyHelp: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    hint: "Paste an xAI key if you have one.",
    defaultBase: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
    keyHelp: "https://console.x.ai",
  },
  {
    id: "compatible",
    label: "OpenAI compatible",
    hint: "Any host that speaks the OpenAI chat format.",
    defaultBase: "",
    defaultModel: "gpt-4o-mini",
    keyHelp: "",
  },
] as const;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

type AiSettings = {
  enabled: boolean;
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  hydrate: () => Promise<void>;
  setEnabled: (v: boolean) => void;
  setProvider: (id: ProviderId) => void;
  setApiKey: (v: string) => void;
  setBaseUrl: (v: string) => void;
  setModel: (v: string) => void;
  clearKey: () => void;
};

export function providerMeta(id: ProviderId) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

async function write(s: AiSettings) {
  if (typeof indexedDB === "undefined") return;
  await localDb().settings.put({
    id: "default",
    enabled: s.enabled,
    provider: s.provider,
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    model: s.model,
  });
}

export const useAiSettings = create<AiSettings>((set, get) => ({
  enabled: false,
  provider: "openrouter",
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openai/gpt-4o-mini",
  hydrate: async () => {
    if (typeof indexedDB === "undefined") return;
    const row = await localDb().settings.get("default");
    if (row) {
      set({
        enabled: row.enabled,
        provider: row.provider,
        apiKey: row.apiKey,
        baseUrl: row.baseUrl,
        model: row.model,
      });
    }
  },
  setEnabled: (enabled) => {
    set({ enabled });
    void write(get());
  },
  setProvider: (provider) => {
    const meta = providerMeta(provider);
    set({ provider, baseUrl: meta.defaultBase, model: meta.defaultModel });
    void write(get());
  },
  setApiKey: (apiKey) => {
    set({ apiKey });
    void write(get());
  },
  setBaseUrl: (baseUrl) => {
    set({ baseUrl });
    void write(get());
  },
  setModel: (model) => {
    set({ model });
    void write(get());
  },
  clearKey: () => {
    set({ apiKey: "", enabled: false });
    void write(get());
  },
}));

export function aiReady(s: Pick<AiSettings, "enabled" | "apiKey" | "provider" | "baseUrl">) {
  if (!s.enabled || !s.apiKey.trim()) return false;
  if (s.provider === "compatible" && !s.baseUrl.trim()) return false;
  return true;
}
