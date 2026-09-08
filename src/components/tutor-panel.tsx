import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Prose } from "@/components/prose";
import { Button } from "@/components/ui/button";
import { completeChat } from "@/lib/ai/chat";
import { TUTOR_SYSTEM } from "@/lib/ai/prompts";
import { aiReady, useAiSettings } from "@/lib/ai/settings-store";
import { typesetMath } from "@/lib/math/mathjax";
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
  const logRef = useRef<HTMLDivElement>(null);
  const pin = `${task.id}:${check.qid}`;
  const reqId = useRef(0);

  useEffect(() => {
    reqId.current += 1;
    setMessages([]);
    setDraft("");
    setBusy(false);
  }, [pin]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    void typesetMath(logRef.current);
  }, [messages, busy]);

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

  function clearChat() {
    setMessages([]);
    setDraft("");
  }

  async function ask(text: string) {
    if (!ready) {
      toast.message("Add a key under Keys first.");
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    const id = reqId.current;
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
          maxTokens: 4096,
          continueOnLength: true,
          maxContinues: 2,
          messages: [
            { role: "system", content: TUTOR_SYSTEM },
            { role: "system", content: context },
            ...next.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
      });
      if (reqId.current !== id) return;
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages([...next, { role: "assistant", content: result.text }]);
    } catch (err) {
      if (reqId.current !== id) return;
      toast.error(err instanceof Error ? err.message : "Coach failed");
    } finally {
      if (reqId.current === id) setBusy(false);
    }
  }

  return (
    <aside
      id="study-coach"
      className="flex h-[min(78dvh,44rem)] flex-col rounded-3xl border border-dashed border-ink/30 bg-primary/20 p-4 lg:sticky lg:top-20 lg:h-[calc(100dvh-6.5rem)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-base font-normal">Study coach</p>
          <p className="mt-1 text-xs font-normal text-muted">
            Asking about <span className="text-ink">{check.qid}</span>
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={busy || messages.length === 0} onClick={clearChat}>
          Clear
        </Button>
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-normal text-ink">{check.prompt}</p>
      {!ready ? (
        <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
          <Link to="/settings">Add a key</Link>
        </Button>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
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
          <div ref={logRef} className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-xs font-normal">
            {messages.length === 0 ? (
              <p className="text-muted">Press Ask coach on a question, then talk here.</p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "rounded-2xl bg-surface px-3 py-2 font-normal"
                      : "rounded-2xl border border-border bg-bg px-3 py-2 font-normal"
                  }
                >
                  {m.role === "assistant" ? <Prose text={m.content} className="note-prose-coach" /> : m.content}
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
              className="h-10 flex-1 rounded-full border border-border bg-surface px-4 text-xs font-normal outline-none focus:border-ink"
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
