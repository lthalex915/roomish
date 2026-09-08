import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmBox } from "@/components/confirm-box";
import { ClientOnly } from "@/components/hydrate-stores";
import { Button } from "@/components/ui/button";
import {
  checkCount,
  completedChecks,
  placementLabel,
  roomList,
  useLibrary,
} from "@/lib/library-store";
import type { Audience, Room } from "@/lib/room/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <ClientOnly>
      <LibraryPage />
    </ClientOnly>
  );
}

function LibraryPage() {
  const rooms = useLibrary((s) => s.rooms);
  const progress = useLibrary((s) => s.progress);
  const chapterOf = useLibrary((s) => s.chapterOf);
  const chapters = useLibrary((s) => s.chapters);
  const courses = useLibrary((s) => s.courses);
  const semesters = useLibrary((s) => s.semesters);
  const importJson = useLibrary((s) => s.importJson);
  const removeRoom = useLibrary((s) => s.removeRoom);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Audience | "all">("all");
  const [paste, setPaste] = useState("");
  const [pending, setPending] = useState<Room | null>(null);

  const list = roomList(rooms).filter((r) => filter === "all" || r.room.audience === filter);

  async function loadText(text: string) {
    try {
      const room = await importJson(text);
      toast.success(`Filed “${room.room.title}”`);
      setPaste("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That file is not Roomish JSON.");
    }
  }

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Your shelf</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-xl font-serif text-4xl leading-tight">
          Short lessons. Stored on this device.
        </h1>
        <Button asChild>
          <Link to="/convert">Compose a lesson</Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["all", "beginner", "intermediate", "advanced"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-full px-4 py-2 text-sm capitalize",
              filter === item ? "bg-ink text-bg" : "bg-surface text-muted",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-10 text-muted">
          Nothing on this shelf yet. Import a file or compose notes.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {list.map((room) => (
            <RoomCard
              key={room.room.slug}
              room={room}
              place={placementLabel(room.room.slug, { chapterOf, chapters, courses, semesters })}
              done={completedChecks(room, progress[room.room.slug])}
              onRemove={() => setPending(room)}
            />
          ))}
        </div>
      )}

      <section className="mt-12 rounded-3xl border border-border bg-surface p-5">
        <h2 className="font-serif text-xl">Drop in a lesson file</h2>
        <p className="mt-1 text-sm text-muted">JSON only. No account. Stays on this device.</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await loadText(await file.text());
            e.target.value = "";
          }}
        />
        <div className="mt-4 grid gap-3">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            Choose a file
          </Button>
          <textarea
            className="min-h-28 rounded-2xl border border-dashed border-border bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-ink"
            placeholder="Or paste JSON"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <Button type="button" variant="outline" disabled={!paste.trim()} onClick={() => void loadText(paste)}>
            Import paste
          </Button>
        </div>
      </section>

      <ConfirmBox
        open={Boolean(pending)}
        title={`Delete “${pending?.room.title ?? "this lesson"}”?`}
        body="This removes the quiz and its answers from this device. It cannot be undone unless you still have a JSON copy. Course folders stay; only this lesson is deleted."
        confirmLabel="Delete quiz"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void removeRoom(pending.room.slug);
          setPending(null);
        }}
      />
    </div>
  );
}

function RoomCard({
  room,
  place,
  done,
  onRemove,
}: {
  room: Room;
  place: string;
  done: number;
  onRemove: () => void;
}) {
  const total = checkCount(room);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <article className="flex flex-col rounded-3xl border border-border bg-surface p-6 shadow-[6px_6px_0_0_#1c1914]">
      <p className="text-xs uppercase tracking-wide text-muted">{room.room.audience}</p>
      <h2 className="mt-1 font-serif text-2xl leading-snug">{room.room.title}</h2>
      <p className="mt-2 line-clamp-3 text-sm text-muted">{room.room.intro}</p>
      <p className="mt-3 text-xs">{place}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {done} / {total} · {room.room.estimated_minutes} min
      </p>
      <div className="mt-5 flex gap-2">
        <Button asChild className="flex-1">
          <Link to="/play/$slug" params={{ slug: room.room.slug }}>
            {done ? "Continue" : "Open"}
          </Link>
        </Button>
        <Button type="button" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </article>
  );
}
