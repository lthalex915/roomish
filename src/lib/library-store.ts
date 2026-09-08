import { create } from "zustand";
import {
  localDb,
  migrateLegacyIfNeeded,
  newId,
  type Chapter,
  type Course,
  type Semester,
} from "@/lib/db/local";
import { isCorrect } from "@/lib/room/grade";
import { SAMPLE_ROOMS } from "@/lib/room/samples";
import { checkCount, parseRoom, parseRoomJson, type Room } from "@/lib/room/schema";

export type RoomProgress = {
  submissions: Record<string, string>;
  revealed: Record<string, boolean>;
};

type LibraryState = {
  rooms: Record<string, Room>;
  progress: Record<string, RoomProgress>;
  chapterOf: Record<string, string | null>;
  semesters: Semester[];
  courses: Course[];
  chapters: Chapter[];
  ready: boolean;
  hydrate: () => Promise<void>;
  importRoom: (room: Room, chapterId?: string | null) => Promise<void>;
  importJson: (text: string, chapterId?: string | null) => Promise<Room>;
  removeRoom: (slug: string) => Promise<void>;
  assignRoom: (slug: string, chapterId: string | null) => Promise<void>;
  setSubmission: (slug: string, qid: string, value: string) => void;
  markRevealed: (slug: string, qid: string) => void;
  resetProgress: (slug: string) => void;
  addSemester: (name: string, term: string) => Promise<Semester>;
  removeSemester: (id: string) => Promise<void>;
  addCourse: (semesterId: string, name: string, code: string, description: string) => Promise<Course>;
  removeCourse: (id: string) => Promise<void>;
  addChapter: (courseId: string, title: string) => Promise<Chapter>;
  removeChapter: (id: string) => Promise<void>;
};

function emptyProgress(): RoomProgress {
  return { submissions: {}, revealed: {} };
}

async function persistProgress(slug: string, progress: RoomProgress) {
  await localDb().progress.put({ slug, ...progress });
}

let hydrateLock: Promise<void> | null = null;

export const useLibrary = create<LibraryState>((set, get) => ({
  rooms: {},
  progress: {},
  chapterOf: {},
  semesters: [],
  courses: [],
  chapters: [],
  ready: false,
  hydrate: async () => {
    if (get().ready) return;
    if (hydrateLock) return hydrateLock;
    hydrateLock = (async () => {
      if (typeof indexedDB === "undefined") {
        set({ ready: true });
        return;
      }
      await migrateLegacyIfNeeded();
      const db = localDb();
      const seededFlag = await db.meta.get("seeded");
      const existingRooms = await db.rooms.count();
      const existingSemesters = await db.semesters.count();
      if (!seededFlag || existingRooms === 0 || existingSemesters === 0) {
        const now = Date.now();
        if (existingSemesters === 0) {
          const semester: Semester = {
            id: newId("sem"),
            name: "Demo term",
            term: "Sample",
            createdAt: now,
          };
          const course: Course = {
            id: newId("crs"),
            semesterId: semester.id,
            name: "Science 8",
            code: "SCI8",
            description: "A starter course so you can see the layout.",
            createdAt: now,
          };
          const chapter: Chapter = {
            id: newId("ch"),
            courseId: course.id,
            title: "Energy in plants",
            order: 1,
            createdAt: now,
          };
          await db.semesters.put(semester);
          await db.courses.put(course);
          await db.chapters.put(chapter);
          const photo = await db.rooms.get("photosynthesis-year-8");
          if (photo) await db.rooms.put({ ...photo, chapterId: chapter.id, updatedAt: now });
        }
        if (existingRooms === 0) {
          const chapter = (await db.chapters.toArray())[0];
          for (const sample of SAMPLE_ROOMS) {
            const slug = sample.room.slug;
            await db.rooms.put({
              slug,
              data: sample,
              chapterId: slug === "photosynthesis-year-8" ? chapter?.id ?? null : null,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        await db.meta.put({ key: "seeded", value: true });
      }

      const sampleFlag = await db.meta.get("samples-v2");
      if (!sampleFlag) {
        const now = Date.now();
        for (const sample of SAMPLE_ROOMS) {
          const slug = sample.room.slug;
          const existing = await db.rooms.get(slug);
          await db.rooms.put({
            slug,
            data: sample,
            chapterId: existing?.chapterId ?? (slug === "photosynthesis-year-8" ? (await db.chapters.toArray())[0]?.id ?? null : null),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          });
        }
        await db.meta.put({ key: "samples-v2", value: true });
      }
      const [roomRows, progressRows, semesters, courses, chapters] = await Promise.all([
        db.rooms.toArray(),
        db.progress.toArray(),
        db.semesters.orderBy("createdAt").reverse().toArray(),
        db.courses.orderBy("createdAt").toArray(),
        db.chapters.orderBy("order").toArray(),
      ]);
      const rooms: Record<string, Room> = {};
      const chapterOf: Record<string, string | null> = {};
      for (const row of roomRows) {
        rooms[row.slug] = row.data;
        chapterOf[row.slug] = row.chapterId;
      }
      const progress: Record<string, RoomProgress> = {};
      for (const row of progressRows) {
        progress[row.slug] = { submissions: row.submissions, revealed: row.revealed };
      }
      set({ rooms, progress, chapterOf, semesters, courses, chapters, ready: true });
    })();
    return hydrateLock;
  },
  importRoom: async (room, chapterId = null) => {
    const parsed = parseRoom(room);
    const slug = parsed.room.slug;
    const now = Date.now();
    const existing = await localDb().rooms.get(slug);
    await localDb().rooms.put({
      slug,
      data: parsed,
      chapterId: chapterId ?? existing?.chapterId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    set((s) => ({
      rooms: { ...s.rooms, [slug]: parsed },
      chapterOf: { ...s.chapterOf, [slug]: chapterId ?? existing?.chapterId ?? null },
    }));
  },
  importJson: async (text, chapterId = null) => {
    const parsed = parseRoomJson(text);
    await get().importRoom(parsed, chapterId);
    return parsed;
  },
  removeRoom: async (slug) => {
    await localDb().rooms.delete(slug);
    await localDb().progress.delete(slug);
    set((s) => {
      const rooms = { ...s.rooms };
      const progress = { ...s.progress };
      const chapterOf = { ...s.chapterOf };
      delete rooms[slug];
      delete progress[slug];
      delete chapterOf[slug];
      return { rooms, progress, chapterOf };
    });
  },
  assignRoom: async (slug, chapterId) => {
    const row = await localDb().rooms.get(slug);
    if (!row) return;
    await localDb().rooms.put({ ...row, chapterId, updatedAt: Date.now() });
    set((s) => ({ chapterOf: { ...s.chapterOf, [slug]: chapterId } }));
  },
  setSubmission: (slug, qid, value) => {
    const current = get().progress[slug] ?? emptyProgress();
    const next = { ...current, submissions: { ...current.submissions, [qid]: value } };
    set((s) => ({ progress: { ...s.progress, [slug]: next } }));
    void persistProgress(slug, next);
  },
  markRevealed: (slug, qid) => {
    const current = get().progress[slug] ?? emptyProgress();
    const next = { ...current, revealed: { ...current.revealed, [qid]: true } };
    set((s) => ({ progress: { ...s.progress, [slug]: next } }));
    void persistProgress(slug, next);
  },
  resetProgress: (slug) => {
    const next = emptyProgress();
    set((s) => ({ progress: { ...s.progress, [slug]: next } }));
    void persistProgress(slug, next);
  },
  addSemester: async (name, term) => {
    const row: Semester = {
      id: newId("sem"),
      name: name.trim() || "Untitled term",
      term: term.trim(),
      createdAt: Date.now(),
    };
    await localDb().semesters.put(row);
    set((s) => ({ semesters: [row, ...s.semesters] }));
    return row;
  },
  removeSemester: async (id) => {
    const courses = get().courses.filter((c) => c.semesterId === id);
    for (const course of courses) await get().removeCourse(course.id);
    await localDb().semesters.delete(id);
    set((s) => ({ semesters: s.semesters.filter((x) => x.id !== id) }));
  },
  addCourse: async (semesterId, name, code, description) => {
    const row: Course = {
      id: newId("crs"),
      semesterId,
      name: name.trim() || "Untitled course",
      code: code.trim(),
      description: description.trim(),
      createdAt: Date.now(),
    };
    await localDb().courses.put(row);
    set((s) => ({ courses: [...s.courses, row] }));
    return row;
  },
  removeCourse: async (id) => {
    const chapters = get().chapters.filter((c) => c.courseId === id);
    for (const chapter of chapters) await get().removeChapter(chapter.id);
    await localDb().courses.delete(id);
    set((s) => ({ courses: s.courses.filter((x) => x.id !== id) }));
  },
  addChapter: async (courseId, title) => {
    const siblings = get().chapters.filter((c) => c.courseId === courseId);
    const row: Chapter = {
      id: newId("ch"),
      courseId,
      title: title.trim() || "Untitled chapter",
      order: siblings.length + 1,
      createdAt: Date.now(),
    };
    await localDb().chapters.put(row);
    set((s) => ({ chapters: [...s.chapters, row] }));
    return row;
  },
  removeChapter: async (id) => {
    const slugs = Object.entries(get().chapterOf)
      .filter(([, chapterId]) => chapterId === id)
      .map(([slug]) => slug);
    for (const slug of slugs) await get().assignRoom(slug, null);
    await localDb().chapters.delete(id);
    set((s) => ({ chapters: s.chapters.filter((x) => x.id !== id) }));
  },
}));

export function roomList(rooms: Record<string, Room>): Room[] {
  return Object.values(rooms).sort((a, b) => a.room.title.localeCompare(b.room.title));
}

export function completedChecks(room: Room, progress?: RoomProgress): number {
  if (!progress) return 0;
  let n = 0;
  for (const task of room.tasks) {
    for (const check of task.checks) {
      if (progress.revealed[check.qid] && isCorrect(check, progress.submissions[check.qid] ?? "")) {
        n += 1;
      }
    }
  }
  return n;
}

export function placementLabel(
  slug: string,
  state: Pick<LibraryState, "chapterOf" | "chapters" | "courses" | "semesters">,
): string {
  const chapterId = state.chapterOf[slug];
  if (!chapterId) return "Loose leaf";
  const chapter = state.chapters.find((c) => c.id === chapterId);
  const course = chapter ? state.courses.find((c) => c.id === chapter.courseId) : undefined;
  const semester = course ? state.semesters.find((s) => s.id === course.semesterId) : undefined;
  return [semester?.name, course?.name, chapter?.title].filter(Boolean).join(" · ") || "Loose leaf";
}

export { checkCount };
