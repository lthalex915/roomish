import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProviderId } from "./settings-store";

const PRESETS: Record<Exclude<ProviderId, "compatible">, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
};

const inputSchema = z.object({
  provider: z.enum(["openrouter", "openai", "deepseek", "xai", "compatible"]),
  apiKey: z.string().min(8).max(400),
  baseUrl: z.string().optional().default(""),
  model: z.string().min(1).max(120),
  messages: z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() }))
    .min(1)
    .max(24),
  maxTokens: z.number().int().min(64).max(4000).optional().default(800),
});

function resolveBase(provider: ProviderId, baseUrl: string): string {
  if (provider !== "compatible") return PRESETS[provider];
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (!url) throw new Error("Type the server address for OpenAI compatible.");
  if (!/^https:\/\//i.test(url)) throw new Error("The custom address must start with https://");
  if (url.endsWith("/chat/completions")) url = url.replace(/\/chat\/completions$/, "");
  return url;
}

export const completeChat = createServerFn({ method: "POST" })
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const base = resolveBase(data.provider, data.baseUrl);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.apiKey.trim()}`,
    };
    if (data.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://roomish.app";
      headers["X-Title"] = "Roomish";
    }
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: data.model.trim(),
        messages: data.messages,
        max_tokens: data.maxTokens,
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        return { ok: false as const, error: "The key was refused. Check it belongs to this provider." };
      }
      if (res.status === 429) {
        return { ok: false as const, error: "That provider is busy or out of credit. Wait, then try again." };
      }
      return { ok: false as const, error: `Provider error ${res.status}. ${body.slice(0, 280)}` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "The model returned an empty reply." };
    return { ok: true as const, text };
  });
