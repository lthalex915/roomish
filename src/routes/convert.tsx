import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ClientOnly } from "@/components/hydrate-stores";
import { Button } from "@/components/ui/button";
import { completeChat } from "@/lib/ai/chat";
import { CONVERT_SYSTEM } from "@/lib/ai/prompts";
import { aiReady, useAiSettings } from "@/lib/ai/settings-store";
import { useLibrary } from "@/lib/library-store";
import { parseRoomJson, type Audience } from "@/lib/room/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/convert")({ component: ConvertRoute });

function ConvertRoute() {
  return (
    <ClientOnly>
      <ConvertPage />
    </ClientOnly>
  );
}

function ConvertPage() {
  const settings = useAiSettings();
  const ready = aiReady(settings);
  const importRoom = useLibrary((s) => s.importRoom);
  const chapters = useLibrary((s) => s.chapters);
  const courses = useLibrary((s) => s.courses);
  const semesters = useLibrary((s) => s.semesters);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"topic" | "notes">("topic");
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<Audience>("beginner");
  const [chapterId, setChapterId] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!ready) {
      toast.message("Add a key under Keys first.");
      return;
    }
    if (text.trim().length < 8) {
      toast.error("Add a bit more of the topic or notes.");
      return;
    }
    setBusy(true);
    try {
      const result = await completeChat({
        data: {
          provider: settings.provider,
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          maxTokens: 16384,
          continueOnLength: true,
          maxContinues: 4,
          completeJson: true,
          messages: [
            { role: "system", content: CONVERT_SYSTEM },
            {
              role: "user",
              content:
                mode === "topic"
                  ? `Mode: generate from topic\nAudience: ${audience}\nTopic:\n${text.trim()}`
                  : `Mode: wrap existing notes or questions\nAudience: ${audience}\nSource:\n${text.trim()}`,
            },
          ],
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.truncated) {
        toast.message("The model hit a length cap. Check the preview — you may need to compose again.");
      }
      const room = parseRoomJson(result.text);
      setPreview(JSON.stringify(room, null, 2));
      toast.success(`Valid · ${room.tasks.length} pages`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn that into a lesson.");
    } finally {
      setBusy(false);
    }
  }

  async function importPreview() {
    try {
      const room = parseRoomJson(preview);
      await importRoom(room, chapterId || null);
      toast.success(`Saved “${room.room.title}” on this device`);
      void navigate({ to: "/play/$slug", params: { slug: room.room.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "JSON is not valid yet.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <p className="text-sm uppercase tracking-[0.18em] text-muted">Compose</p>
        <h1 className="mt-2 font-serif text-4xl">Turn notes into a lesson</h1>
        <p className="mt-2 text-muted">One generation. Replay for free. Filed on this device.</p>
        {!ready ? (
          <div className="mt-4 rounded-3xl border border-border bg-surface p-4 text-sm">
            Compose needs your own key.
            <Button asChild variant="outline" size="sm" className="mt-3 block w-fit">
              <Link to="/settings">Open Keys</Link>
            </Button>
          </div>
        ) : null}
        <div className="mt-6 flex gap-2">
          {(
            [
              ["topic", "From a topic"],
              ["notes", "From notes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "h-11 rounded-full px-4 text-sm",
                mode === id ? "bg-ink text-bg" : "bg-surface text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-4 grid gap-2 text-sm">
          <span>{mode === "topic" ? "Topic" : "Notes or questions"}</span>
          <textarea
            className="min-h-48 rounded-3xl border border-border bg-surface px-4 py-3 outline-none focus:border-ink"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === "topic"
                ? "Photosynthesis for year 8: chloroplasts, light, glucose."
                : "Paste your notes or Q&A list."
            }
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm">
          <span>How hard?</span>
          <select
            className="h-11 rounded-full border border-border bg-surface px-4"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="mt-4 grid gap-2 text-sm">
          <span>File under (optional)</span>
          <select
            className="h-11 rounded-full border border-border bg-surface px-4"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          >
            <option value="">Loose leaf — shelf only</option>
            {chapters.map((chapter) => {
              const course = courses.find((c) => c.id === chapter.courseId);
              const semester = course ? semesters.find((s) => s.id === course.semesterId) : undefined;
              return (
                <option key={chapter.id} value={chapter.id}>
                  {[semester?.name, course?.name, chapter.title].filter(Boolean).join(" · ")}
                </option>
              );
            })}
          </select>
        </label>
        <Button type="button" className="mt-5" disabled={busy || !ready} onClick={() => void generate()}>
          {busy ? "Composing…" : "Compose lesson JSON"}
        </Button>
      </section>
      <section className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-xl">Preview</h2>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!preview} onClick={() => void importPreview()}>
              Save to shelf
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!preview}
              onClick={() => {
                void navigator.clipboard.writeText(preview);
                toast.message("Copied JSON");
              }}
            >
              Copy
            </Button>
          </div>
        </div>
        <textarea
          className="mt-3 min-h-[28rem] w-full rounded-2xl border border-border bg-bg p-3 font-mono text-xs outline-none"
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          placeholder="The lesson file appears here."
        />
      </section>
    </div>
  );
}
