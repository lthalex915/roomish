import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ClientOnly } from "@/components/hydrate-stores";
import { Button } from "@/components/ui/button";
import {
  PROVIDERS,
  aiReady,
  providerMeta,
  useAiSettings,
  type ProviderId,
} from "@/lib/ai/settings-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsRoute });

function SettingsRoute() {
  return (
    <ClientOnly>
      <SettingsPage />
    </ClientOnly>
  );
}

function SettingsPage() {
  const s = useAiSettings();
  const meta = providerMeta(s.provider);
  const on = aiReady(s);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Keys</p>
      <h1 className="mt-2 font-serif text-4xl">Bring your own coach</h1>
      <p className="mt-2 text-muted">
        Compose and the study coach stay off until you paste a key. It is stored in the local
        database on this device, not on a Roomish server.
      </p>

      <label className="mt-8 flex min-h-11 items-center gap-3 rounded-3xl border border-border bg-surface px-5">
        <input
          type="checkbox"
          className="size-4 accent-ink"
          checked={s.enabled}
          onChange={(e) => s.setEnabled(e.target.checked)}
        />
        <span>Turn coach and compose on</span>
        <span className={cn("ml-auto text-xs", on ? "text-ink" : "text-muted")}>{on ? "Ready" : "Needs a key"}</span>
      </label>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Where is your key from?</legend>
        <div className="mt-3 grid gap-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-3xl border border-border bg-surface p-4",
                s.provider === p.id && "border-ink bg-primary/30",
              )}
            >
              <input
                type="radio"
                name="provider"
                className="mt-1 size-4 accent-ink"
                checked={s.provider === p.id}
                onChange={() => s.setProvider(p.id as ProviderId)}
              />
              <span>
                <span className="block font-medium">{p.label}</span>
                <span className="text-sm text-muted">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <ol className="mt-8 list-decimal space-y-3 pl-5 text-sm text-muted">
        <li>Open the provider website and create an account if you do not have one.</li>
        <li>
          Find API keys.{" "}
          {meta.keyHelp ? (
            <a className="text-ink underline" href={meta.keyHelp} target="_blank" rel="noreferrer">
              Open the key page
            </a>
          ) : (
            "Use the docs for your compatible host."
          )}
        </li>
        <li>Create a key. Copy it once. Treat it like a password.</li>
        <li>Paste it below.</li>
      </ol>

      <label className="mt-6 grid gap-2 text-sm">
        <span>API key</span>
        <input
          type="password"
          autoComplete="off"
          className="h-11 rounded-full border border-border bg-surface px-4 outline-none focus:border-ink"
          value={s.apiKey}
          onChange={(e) => s.setApiKey(e.target.value)}
          placeholder="sk-…"
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm">
        <span>Model name</span>
        <input
          className="h-11 rounded-full border border-border bg-surface px-4 outline-none focus:border-ink"
          value={s.model}
          onChange={(e) => s.setModel(e.target.value)}
          placeholder={meta.defaultModel}
        />
      </label>
      {s.provider === "compatible" ? (
        <label className="mt-4 grid gap-2 text-sm">
          <span>Server address</span>
          <input
            className="h-11 rounded-full border border-border bg-surface px-4 font-mono text-sm outline-none focus:border-ink"
            value={s.baseUrl}
            onChange={(e) => s.setBaseUrl(e.target.value)}
            placeholder="https://example.com/v1"
          />
        </label>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            if (!s.apiKey.trim()) {
              toast.error("Paste a key first.");
              return;
            }
            s.setEnabled(true);
            toast.success("Saved on this device.");
          }}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            s.clearKey();
            toast.message("Key removed.");
          }}
        >
          Remove key
        </Button>
      </div>
    </div>
  );
}
