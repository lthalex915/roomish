import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckField } from "@/components/check-field";
import { ClientOnly } from "@/components/hydrate-stores";
import { Prose } from "@/components/prose";
import { TutorPanel } from "@/components/tutor-panel";
import { Button } from "@/components/ui/button";
import { completedChecks, useLibrary } from "@/lib/library-store";
import { isCorrect } from "@/lib/room/grade";
import { checkCount, maxPoints, type Room, type Task } from "@/lib/room/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/$slug")({ component: PlayRoute });

function PlayRoute() {
  return (
    <ClientOnly>
      <PlayPage />
    </ClientOnly>
  );
}

function PlayPage() {
  const { slug } = Route.useParams();
  const room = useLibrary((s) => s.rooms[slug]);
  const progress = useLibrary((s) => s.progress[slug]);
  const setSubmission = useLibrary((s) => s.setSubmission);
  const markRevealed = useLibrary((s) => s.markRevealed);
  const resetProgress = useLibrary((s) => s.resetProgress);
  const [page, setPage] = useState(0);
  const [showRecap, setShowRecap] = useState(false);
  const [coachQid, setCoachQid] = useState<string | null>(null);

  useEffect(() => {
    setCoachQid(null);
  }, [page]);

  if (!room) {
    return (
      <div>
        <h1 className="font-serif text-3xl">That lesson is not on this device</h1>
        <Button asChild className="mt-4">
          <Link to="/">Back to the shelf</Link>
        </Button>
      </div>
    );
  }

  const task = room.tasks[Math.min(page, room.tasks.length - 1)];
  const submissions = progress?.submissions ?? {};
  const revealed = progress?.revealed ?? {};
  const done = completedChecks(room, progress);
  const total = checkCount(room);
  const focused =
    task.checks.find((c) => c.qid === coachQid) ??
    task.checks.find((c) => !revealed[c.qid]) ??
    task.checks[task.checks.length - 1];

  function askCoach(qid: string) {
    setCoachQid(qid);
    window.setTimeout(() => {
      document.getElementById("study-coach")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 40);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <p className="text-sm text-muted">
          <Link to="/" className="text-muted">
            Shelf
          </Link>
          <span className="mx-2">/</span>
          {room.room.title}
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {room.tasks.map((item, i) => {
            const finished = item.checks.every(
              (c) => revealed[c.qid] && isCorrect(c, submissions[c.qid] ?? ""),
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPage(i);
                  setShowRecap(false);
                }}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm",
                  i === page && !showRecap ? "bg-ink text-bg" : "bg-surface text-muted",
                )}
              >
                {finished ? "● " : `${i + 1} · `}
                {item.title}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowRecap(true)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm",
              showRecap ? "bg-ink text-bg" : "bg-surface text-muted",
            )}
          >
            Wrap-up
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {done} of {total} correct
        </p>

        {showRecap ? (
          <RecapView room={room} submissions={submissions} revealed={revealed} />
        ) : (
          <TaskView
            task={task}
            slug={slug}
            submissions={submissions}
            revealed={revealed}
            setSubmission={setSubmission}
            markRevealed={markRevealed}
            coachQid={focused.qid}
            onAskCoach={askCoach}
            onNext={() => {
              if (page < room.tasks.length - 1) setPage(page + 1);
              else setShowRecap(true);
            }}
            isLast={page === room.tasks.length - 1}
          />
        )}
        <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => resetProgress(slug)}>
          Reset answers
        </Button>
      </div>
      {!showRecap ? (
        <TutorPanel
          task={task}
          check={focused}
          submission={submissions[focused.qid] ?? ""}
          revealed={Boolean(revealed[focused.qid])}
        />
      ) : null}
    </div>
  );
}

function TaskView({
  task,
  slug,
  submissions,
  revealed,
  setSubmission,
  markRevealed,
  coachQid,
  onAskCoach,
  onNext,
  isLast,
}: {
  task: Task;
  slug: string;
  submissions: Record<string, string>;
  revealed: Record<string, boolean>;
  setSubmission: (slug: string, qid: string, value: string) => void;
  markRevealed: (slug: string, qid: string) => void;
  coachQid: string;
  onAskCoach: (qid: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{task.id.replace("T", "Page ")}</p>
      <h1 className="mt-1 font-serif text-3xl">{task.title}</h1>
      <section className="mt-6">
        <Prose text={task.teach} />
      </section>
      <div className="mt-8 grid gap-6">
        {task.checks.map((check, index) => {
          const value = submissions[check.qid] ?? "";
          const shown = Boolean(revealed[check.qid]);
          const ok = shown && isCorrect(check, value);
          const pinned = coachQid === check.qid;
          return (
            <article
              key={check.qid}
              className={cn(
                "rounded-3xl bg-surface p-6 shadow-[6px_6px_0_0_#1c1914]",
                pinned && "outline outline-2 outline-ink",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  <span className="mr-2 text-xs uppercase tracking-wide text-muted">Q{index + 1}</span>
                  {check.prompt}
                </p>
                <Button
                  type="button"
                  variant={pinned ? "primary" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => onAskCoach(check.qid)}
                >
                  {pinned ? "Coach has this" : "Ask coach"}
                </Button>
              </div>
              {check.stem_note ? <p className="mt-1 text-sm text-muted">{check.stem_note}</p> : null}
              <div className="mt-4">
                <CheckField
                  check={check}
                  value={value}
                  disabled={shown && ok}
                  onChange={(v) => setSubmission(slug, check.qid, v)}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => markRevealed(slug, check.qid)}>
                  Check
                </Button>
                {shown ? (
                  <div className={ok ? "text-ink" : "text-danger"}>
                    {ok ? <Prose text={`Yes. ${check.explain}`} /> : <Prose text={`Not yet. ${check.hint || "Try another wording."}`} />}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <Button type="button" variant="outline" className="mt-6" onClick={onNext}>
        {isLast ? "Wrap-up" : "Next page"}
      </Button>
    </div>
  );
}

function RecapView({
  room,
  submissions,
  revealed,
}: {
  room: Room;
  submissions: Record<string, string>;
  revealed: Record<string, boolean>;
}) {
  const score = useMemo(() => {
    let got = 0;
    for (const task of room.tasks) {
      for (const check of task.checks) {
        if (revealed[check.qid] && isCorrect(check, submissions[check.qid] ?? "")) got += check.points;
      }
    }
    return got;
  }, [room, submissions, revealed]);

  return (
    <div className="mt-6">
      <h1 className="font-serif text-3xl">Wrap-up</h1>
      <p className="mt-2 text-muted">
        Score {score} / {maxPoints(room)}
      </p>
      <h2 className="mt-6 font-serif text-xl">Keep these</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
        {room.recap.key_terms.map((t) => (
          <li key={t}>
            <Prose text={t} />
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-serif text-xl">Easy to mix up</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
        {room.recap.common_mistakes.map((t) => (
          <li key={t}>
            <Prose text={t} />
          </li>
        ))}
      </ul>
      <Button asChild className="mt-8">
        <Link to="/">Back to the shelf</Link>
      </Button>
    </div>
  );
}
