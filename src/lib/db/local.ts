import Dexie, { type Table } from "dexie";
import type { ProviderId } from "@/lib/ai/settings-store";
import type { Room } from "@/lib/room/schema";

export type Semester = {
  id: string;
  name: string;
  term: string;
  createdAt: number;
};

export type Course = {
  id: string;
  semesterId: string;
  name: string;
  code: string;
  description: string;
  createdAt: number;
};

export type Chapter = {
  id: string;
  courseId: string;
  title: string;
  order: number;
  createdAt: number;
};

export type RoomRow = {
  slug: string;
  data: Room;
  chapterId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ProgressRow = {
  slug: string;
  submissions: Record<string, string>;
  revealed: Record<string, boolean>;
};

export type SettingsRow = {
  id: "default";
  enabled: boolean;
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type MetaRow = {
  key: string;
  value: unknown;
};

class RoomishDB extends Dexie {
  semesters!: Table<Semester, string>;
  courses!: Table<Course, string>;
  chapters!: Table<Chapter, string>;
  rooms!: Table<RoomRow, string>;
  progress!: Table<ProgressRow, string>;
  settings!: Table<SettingsRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("roomish-local");
    this.version(1).stores({
      semesters: "id, createdAt",
      courses: "id, semesterId, createdAt",
      chapters: "id, courseId, order",
      rooms: "slug, chapterId, updatedAt",
      progress: "slug",
      settings: "id",
      meta: "key",
    });
  }
}

let _db: RoomishDB | null = null;

export function localDb(): RoomishDB {
  if (!_db) _db = new RoomishDB();
  return _db;
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

type ZustandPersist<T> = { state?: T };

function readLegacy<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ZustandPersist<T>;
    return parsed.state ?? (parsed as T);
  } catch {
    return null;
  }
}

export async function migrateLegacyIfNeeded() {
  const db = localDb();
  const flag = await db.meta.get("migrated-v1");
  if (flag) return;

  const count = await db.rooms.count();
  if (count === 0) {
    const legacy = readLegacy<{
      rooms?: Record<string, Room>;
      progress?: Record<string, ProgressRow>;
      seeded?: boolean;
    }>("roomish-library");
    if (legacy?.rooms) {
      const now = Date.now();
      await db.rooms.bulkPut(
        Object.values(legacy.rooms).map((room) => ({
          slug: room.room.slug,
          data: room,
          chapterId: null,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    if (legacy?.progress) {
      await db.progress.bulkPut(
        Object.entries(legacy.progress).map(([slug, p]) => ({
          slug,
          submissions: p.submissions ?? {},
          revealed: p.revealed ?? {},
        })),
      );
    }
  }

  const hasSettings = await db.settings.get("default");
  if (!hasSettings) {
    const legacy = readLegacy<{
      enabled?: boolean;
      provider?: ProviderId;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    }>("roomish-ai-settings");
    if (legacy) {
      await db.settings.put({
        id: "default",
        enabled: Boolean(legacy.enabled),
        provider: legacy.provider ?? "openrouter",
        apiKey: legacy.apiKey ?? "",
        baseUrl: legacy.baseUrl ?? "https://openrouter.ai/api/v1",
        model: legacy.model ?? "gpt-4o-mini",
      });
    }
  }

  await db.meta.put({ key: "migrated-v1", value: true });
}
