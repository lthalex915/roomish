import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProviderId } from "./settings-store";

const PRESETS: Record<Exclude<ProviderId, "compatible">, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
};

const CONTINUE_PROMPT =
  "Your previous reply was cut off by the output length limit. Continue from the exact next character. Do not repeat anything already written. Do not add commentary or markdown fences.";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const inputSchema = z.object({
  provider: z.enum(["openrouter", "openai", "deepseek", "xai", "compatible"]),
  apiKey: z.string().min(8).max(400),
  baseUrl: z.string().optional().default(""),
  model: z.string().min(1).max(120),
  messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() })).min(1).max(40),
  maxTokens: z.number().int().min(64).max(32768).optional().default(4096),
  continueOnLength: z.boolean().optional().default(true),
  maxContinues: z.number().int().min(0).max(8).optional().default(4),
  completeJson: z.boolean().optional().default(false),
});

function resolveBase(provider: ProviderId, baseUrl: string): string {
  if (provider !== "compatible") return PRESETS[provider];
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (!url) throw new Error("Type the server address for OpenAI compatible.");
  if (!/^https:\/\//i.test(url)) throw new Error("The custom address must start with https://");
  if (url.endsWith("/chat/completions")) url = url.replace(/\/chat\/completions$/, "");
  return url;
}

function finishOf(choice: {
  finish_reason?: string | null;
  native_finish_reason?: string | null;
} | undefined): string {
  const raw = `${choice?.finish_reason ?? ""} ${choice?.native_finish_reason ?? ""}`.toLowerCase();
  if (!raw.trim()) return "unknown";
  if (raw.includes("length") || raw.includes("max_token") || raw.includes("max_output")) return "length";
  if (raw.includes("stop") || raw.includes("end_turn") || raw.includes("eos")) return "stop";
  return choice?.finish_reason ?? "unknown";
}

export function looksIncompleteJson(text: string): boolean {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return false;
  } catch {
    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escape = false;
    for (const ch of trimmed) {
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") braces += 1;
      else if (ch === "}") braces -= 1;
      else if (ch === "[") brackets += 1;
      else if (ch === "]") brackets -= 1;
    }
    return inString || braces > 0 || brackets > 0 || braces < 0;
  }
}

function tokenError(
  status: number,
  body: string,
): { kind: "auth" | "rate" | "tokens" | "size" | "other"; message: string } {
  if (status === 401 || status === 403) {
    return { kind: "auth", message: "The key was refused. Check it belongs to this provider." };
  }
  if (status === 429) {
    return { kind: "rate", message: "That provider is busy or out of credit. Wait, then try again." };
  }
  if (
    /unsupported_parameter|unknown_parameter|max_tokens is not supported|use ['"]?max_completion_tokens|instead of ['"]?max_tokens/i.test(
      body,
    )
  ) {
    return { kind: "tokens", message: body };
  }
  if (
    /max_tokens.*(too (large|high|big)|exceed)|invalid.?max_tokens|maximum output|output length|max_completion_tokens.*(too|exceed|invalid)|context_length_exceeded/i.test(
      body,
    )
  ) {
    return { kind: "size", message: body };
  }
  return { kind: "other", message: `Provider error ${status}. ${body.slice(0, 280)}` };
}

async function postChat(
  url: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

async function oneCompletion(opts: {
  url: string;
  headers: Record<string, string>;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
}): Promise<{ ok: true; text: string; finish: string } | { ok: false; error: string }> {
  const sizes = [...new Set([opts.maxTokens, 8192, 4096, 2048].filter((n) => n >= 256))].sort((a, b) => b - a);
  let lastError = "The model could not start a reply.";

  for (const size of sizes) {
    const basePayload = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
    };

    let res = await postChat(opts.url, opts.headers, { ...basePayload, max_tokens: size });
    if (!res.ok) {
      const body = await res.text();
      const err = tokenError(res.status, body);
      if (err.kind === "tokens") {
        res = await postChat(opts.url, opts.headers, { ...basePayload, max_completion_tokens: size });
      } else if (err.kind === "size") {
        lastError = err.message;
        continue;
      } else {
        return { ok: false, error: err.message };
      }
    }
    if (!res.ok) {
      const body = await res.text();
      const err = tokenError(res.status, body);
      if (err.kind === "size") {
        lastError = err.message;
        continue;
      }
      return { ok: false, error: err.message };
    }

    const json = (await res.json()) as {
      choices?: {
        message?: { content?: string };
        finish_reason?: string | null;
        native_finish_reason?: string | null;
      }[];
    };
    const choice = json.choices?.[0];
    const text = choice?.message?.content ?? "";
    if (!text.trim() && finishOf(choice) !== "length") {
      return { ok: false, error: "The model returned an empty reply." };
    }
    return { ok: true, text, finish: finishOf(choice) };
  }

  return { ok: false, error: lastError };
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

    const url = `${base}/chat/completions`;
    const model = data.model.trim();
    const maxTokens = data.maxTokens ?? 4096;
    const maxContinues = data.continueOnLength === false ? 0 : (data.maxContinues ?? 4);
    const seed = data.messages.map((m) => ({ role: m.role, content: m.content }));

    let assembled = "";
    let truncated = false;
    let continues = 0;

    for (let attempt = 0; attempt <= maxContinues; attempt += 1) {
      const messages: ChatMessage[] =
        attempt === 0
          ? seed
          : [
              ...seed,
              { role: "assistant", content: assembled },
              { role: "user", content: CONTINUE_PROMPT },
            ];
      const result = await oneCompletion({
        url,
        headers,
        model,
        messages,
        maxTokens,
        temperature: attempt === 0 ? 0.3 : 0.1,
      });
      if (!result.ok) return result;
      assembled += result.text;
      if (result.finish === "length") {
        truncated = true;
        continues += 1;
        continue;
      }
      truncated = false;
      break;
    }

    if (data.completeJson && looksIncompleteJson(assembled) && continues < Math.max(maxContinues, 1)) {
      const extra = await oneCompletion({
        url,
        headers,
        model,
        messages: [
          ...seed,
          { role: "assistant", content: assembled },
          {
            role: "user",
            content:
              "The JSON is incomplete. Continue from the exact next character so the document becomes valid JSON. Do not repeat. No markdown fences.",
          },
        ],
        maxTokens,
        temperature: 0.1,
      });
      if (extra.ok) {
        assembled += extra.text;
        truncated = extra.finish === "length" || looksIncompleteJson(assembled);
      }
    } else if (data.completeJson) {
      truncated = looksIncompleteJson(assembled);
    }

    const text = assembled.trim();
    if (!text) return { ok: false as const, error: "The model returned an empty reply." };
    return { ok: true as const, text, truncated };
  });
