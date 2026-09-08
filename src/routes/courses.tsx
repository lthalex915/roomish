import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClientOnly } from "@/components/hydrate-stores";
import { Button } from "@/components/ui/button";
import { completedChecks, useLibrary } from "@/lib/library-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courses")({ component: CoursesRoute });

function CoursesRoute() {
  return (
    <ClientOnly>
      <CoursesPage />
    </ClientOnly>
  );
}

function CoursesPage() {
  const semesters = useLibrary((s) => s.semesters);
  const courses = useLibrary((s) => s.courses);
  const chapters = useLibrary((s) => s.chapters);
  const rooms = useLibrary((s) => s.rooms);
  const chapterOf = useLibrary((s) => s.chapterOf);
  const progress = useLibrary((s) => s.progress);
  const addSemester = useLibrary((s) => s.addSemester);
  const removeSemester = useLibrary((s) => s.removeSemester);
  const addCourse = useLibrary((s) => s.addCourse);
  const removeCourse = useLibrary((s) => s.removeCourse);
  const addChapter = useLibrary((s) => s.addChapter);
  const removeChapter = useLibrary((s) => s.removeChapter);
  const assignRoom = useLibrary((s) => s.assignRoom);

  const [semesterId, setSemesterId] = useState<string | null>(semesters[0]?.id ?? null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [semName, setSemName] = useState("");
  const [semTerm, setSemTerm] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");

  const activeSemester = semesters.find((s) => s.id === semesterId) ?? semesters[0];
  const semesterCourses = courses.filter((c) => c.semesterId === activeSemester?.id);
  const activeCourse = semesterCourses.find((c) => c.id === courseId) ?? semesterCourses[0] ?? null;
  const courseChapters = chapters
    .filter((c) => c.courseId === activeCourse?.id)
    .sort((a, b) => a.order - b.order);
  const unfiled = useMemo(
    () => Object.values(rooms).filter((r) => !chapterOf[r.room.slug]),
    [rooms, chapterOf],
  );

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Binder</p>
      <h1 className="mt-2 font-serif text-4xl">Semester → course → chapter → lesson</h1>
      <p className="mt-2 text-muted">A filing cabinet, not a hacking path.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <div className="grid gap-2">
            {semesters.map((sem) => (
              <button
                key={sem.id}
                type="button"
                onClick={() => {
                  setSemesterId(sem.id);
                  setCourseId(null);
                }}
                className={cn(
                  "rounded-2xl px-4 py-3 text-left",
                  sem.id === activeSemester?.id ? "bg-ink text-bg" : "bg-surface text-muted",
                )}
              >
                <span className="block font-medium">{sem.name}</span>
                {sem.term ? <span className="text-xs opacity-80">{sem.term}</span> : null}
              </button>
            ))}
          </div>
          <form
            className="mt-4 grid gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const row = await addSemester(semName, semTerm);
              setSemName("");
              setSemTerm("");
              setSemesterId(row.id);
              toast.success(`Added ${row.name}`);
            }}
          >
            <input
              className="h-11 rounded-full border border-border bg-surface px-4 text-sm"
              placeholder="Term, e.g. Fall 2026"
              value={semName}
              onChange={(e) => setSemName(e.target.value)}
            />
            <input
              className="h-11 rounded-full border border-border bg-surface px-4 text-sm"
              placeholder="Label (optional)"
              value={semTerm}
              onChange={(e) => setSemTerm(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={!semName.trim()}>
              Add term
            </Button>
          </form>
        </aside>

        <section>
          {!activeSemester ? (
            <p className="text-muted">Add a term to start filing.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {semesterCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setCourseId(course.id)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm",
                        course.id === activeCourse?.id ? "bg-primary text-primary-fg" : "bg-surface text-muted",
                      )}
                    >
                      {course.code ? `${course.code} · ` : ""}
                      {course.name}
                    </button>
                  ))}
                </div>
                <Button type="button" variant="ghost" onClick={() => void removeSemester(activeSemester.id)}>
                  Remove term
                </Button>
              </div>
              <form
                className="mt-4 flex flex-wrap gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const row = await addCourse(activeSemester.id, courseName, courseCode, "");
                  setCourseName("");
                  setCourseCode("");
                  setCourseId(row.id);
                }}
              >
                <input
                  className="h-11 min-w-40 flex-1 rounded-full border border-border bg-surface px-4"
                  placeholder="Course name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
                <input
                  className="h-11 w-28 rounded-full border border-border bg-surface px-4"
                  placeholder="Code"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
                <Button type="submit" disabled={!courseName.trim()}>
                  Add course
                </Button>
              </form>

              {activeCourse ? (
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-2xl">{activeCourse.name}</h2>
                    <Button type="button" variant="ghost" onClick={() => void removeCourse(activeCourse.id)}>
                      Remove course
                    </Button>
                  </div>
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await addChapter(activeCourse.id, chapterTitle);
                      setChapterTitle("");
                    }}
                  >
                    <input
                      className="h-11 flex-1 rounded-full border border-border bg-surface px-4"
                      placeholder="Chapter or topic"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                    />
                    <Button type="submit" disabled={!chapterTitle.trim()}>
                      Add chapter
                    </Button>
                  </form>
                  <div className="mt-6 grid gap-4">
                    {courseChapters.map((chapter) => {
                      const quizzes = Object.values(rooms).filter((r) => chapterOf[r.room.slug] === chapter.id);
                      return (
                        <article key={chapter.id} className="rounded-3xl border border-border bg-surface p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-serif text-lg">
                              {chapter.order}. {chapter.title}
                            </h3>
                            <Button type="button" variant="ghost" size="sm" onClick={() => void removeChapter(chapter.id)}>
                              Remove
                            </Button>
                          </div>
                          <ul className="mt-3 grid gap-2">
                            {quizzes.length === 0 ? (
                              <li className="text-sm text-muted">Empty chapter.</li>
                            ) : (
                              quizzes.map((room) => {
                                const done = completedChecks(room, progress[room.room.slug]);
                                const total = room.tasks.reduce((n, t) => n + t.checks.length, 0);
                                return (
                                  <li
                                    key={room.room.slug}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-3 py-2"
                                  >
                                    <span>
                                      {room.room.title}
                                      <span className="ml-2 text-xs text-muted">
                                        {done}/{total}
                                      </span>
                                    </span>
                                    <span className="flex gap-2">
                                      <Button asChild size="sm">
                                        <Link to="/play/$slug" params={{ slug: room.room.slug }}>
                                          Open
                                        </Link>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => void assignRoom(room.room.slug, null)}
                                      >
                                        Unfile
                                      </Button>
                                    </span>
                                  </li>
                                );
                              })
                            )}
                          </ul>
                          {unfiled.length > 0 ? (
                            <label className="mt-3 block text-sm text-muted">
                              File a lesson from the shelf
                              <select
                                className="mt-1 h-11 w-full rounded-full border border-border bg-bg px-3 text-ink"
                                defaultValue=""
                                onChange={(e) => {
                                  const slug = e.target.value;
                                  if (slug) void assignRoom(slug, chapter.id);
                                  e.target.value = "";
                                }}
                              >
                                <option value="">Choose…</option>
                                {unfiled.map((room) => (
                                  <option key={room.room.slug} value={room.room.slug}>
                                    {room.room.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-8 text-sm text-muted">Add a course to this term.</p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
