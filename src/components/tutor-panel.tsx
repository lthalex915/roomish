import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Prose } from "@/components/prose";
import { Button } from "@/components/ui/button";
import { completeChat } from "@/lib/ai/chat";
import { TUTOR_SYSTEM } from "@/lib/ai/prompts";
import { aiReady, useAiSettings } from "@/lib/ai/settings-store";
import type { Check, Task } from "@/lib/room/schema";

type Msg = { role: "user" | "assistant"; content: string };

export function TutorPanel({
  task,
  check,
  submission,
  revealed,
}: {
  task: Task;
  check: Check;
  submission: string;
  revealed: boolean;
}) {
  const settings = useAiSettings();
  const ready = aiReady(settings);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const context = [
    `The learner pinned this exact question. Answer only this one unless they ask otherwise.`,
    `Page ${task.id}: ${task.title}`,
    `Notes:\n${task.teach}`,
    `Pinned question id: ${check.qid}`,
    `Type: ${check.type}`,
    `Prompt: ${check.prompt}`,
    check.stem_note ? `Stem note: ${check.stem_note}` : "",
    check.choices.length ? `Choices: ${check.choices.join(" | ")}` : "",
    `Canonical answer: ${check.answer}`,
    `Learner typed: ${submission || "(nothing yet)"}`,
    `Already checked: ${revealed ? "yes" : "no"}`,
  ]
    .filter(Boolean)
    .join("\n");

  async function ask(text: string) {
    if (!ready) {
      toast.message("Add a key under Keys first.");
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const result = await completeChat({
        data: {
          provider: settings.provider,
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          maxTokens: 700,
          messages: [
            { role: "system", content: TUTOR_SYSTEM },
            { role: "system", content: context },
            ...next.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages([...next, { role: "assistant", content: result.text }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Coach failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside id="study-coach" className="h-fit rounded-3xl border border-dashed border-ink/30 bg-primary/20 p-5 lg:sticky lg:top-20">
      <p className="font-serif text-lg">Study coach</p>
      <p className="mt-1 text-sm text-muted">
        Asking about <span className="font-semibold text-ink">{check.qid}</span>
      </p>
      <p className="mt-1 line-clamp-3 text-sm text-ink">{check.prompt}</p>
      {!ready ? (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/settings">Add a key</Link>
        </Button>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                ask(
                  `Explain the pinned question ${check.qid} step by step. Do not start with the final answer.`,
                )
              }
            >
              Explain this question
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                ask(
                  revealed
                    ? `Walk through why the correct answer to ${check.qid} is right, step by step.`
                    : `Give me a hint for ${check.qid}, not the full answer.`,
                )
              }
            >
              {revealed ? "Walk through" : "Hint"}
            </Button>
          </div>
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto text-sm">
            {messages.length === 0 ? (
              <p className="text-muted">Press Ask coach on a question, then talk here.</p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "rounded-2xl bg-surface px-3 py-2"
                      : "rounded-2xl border border-border bg-bg px-3 py-2"
                  }
                >
                  {m.role === "assistant" ? <Prose text={m.content} /> : m.content}
                </div>
              ))
            )}
            {busy ? <p className="text-muted">Thinking…</p> : null}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (text) void ask(text);
            }}
          >
            <input
              className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-ink"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Ask about ${check.qid}…`}
            />
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              Send
            </Button>
          </form>
        </>
      )}
    </aside>
  );
}
