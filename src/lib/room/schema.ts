import { z } from "zod";

export const audienceSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const checkTypeSchema = z.enum([
  "mcq",
  "short",
  "fill",
  "true_false",
  "matching",
  "select_all",
]);

export const blankSchema = z.object({
  id: z.string(),
  before: z.string().optional().default(""),
  after: z.string().optional().default(""),
});

export const checkSchema = z
  .object({
    qid: z.string().min(1),
    type: checkTypeSchema,
    prompt: z.string().min(1),
    stem_note: z.string().optional().default(""),
    choices: z.array(z.string()).optional().default([]),
    blanks: z.array(blankSchema).optional().default([]),
    pairs_left: z.array(z.string()).optional().default([]),
    pairs_right: z.array(z.string()).optional().default([]),
    answer: z.string().min(1),
    accepted: z.array(z.string()).optional().default([]),
    case_sensitive: z.boolean().optional().default(false),
    points: z.number().int().min(0).max(100).optional().default(10),
    hint: z.string().optional().default(""),
    explain: z.string().optional().default(""),
  })
  .superRefine((check, ctx) => {
    if ((check.type === "mcq" || check.type === "select_all") && check.choices.length < 2) {
      ctx.addIssue({ code: "custom", message: `${check.qid} needs at least two choices` });
    }
    if (
      check.type === "matching" &&
      (check.pairs_left.length < 2 || check.pairs_left.length !== check.pairs_right.length)
    ) {
      ctx.addIssue({ code: "custom", message: `${check.qid} matching pairs must line up` });
    }
  });

export const taskSchema = z.object({
  id: z.string().regex(/^T\d+$/),
  title: z.string().min(1),
  teach: z.string().optional().default(""),
  checks: z.array(checkSchema).min(1),
});

export const roomMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  topic: z.string().min(1),
  audience: audienceSchema,
  estimated_minutes: z.number().int().min(3).max(90),
  language: z.string().optional().default("en"),
  learning_objectives: z.array(z.string()).optional().default([]),
  intro: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
});

export const recapSchema = z.object({
  key_terms: z.array(z.string()).optional().default([]),
  common_mistakes: z.array(z.string()).optional().default([]),
  next_room_ideas: z.array(z.string()).optional().default([]),
});

export const roomSchema = z.object({
  schema_version: z.literal("1.0"),
  service: z.literal("Roomish"),
  room: roomMetaSchema,
  tasks: z.array(taskSchema).min(1).max(20),
  recap: recapSchema.optional().default({
    key_terms: [],
    common_mistakes: [],
    next_room_ideas: [],
  }),
});

export type Audience = z.infer<typeof audienceSchema>;
export type CheckType = z.infer<typeof checkTypeSchema>;
export type Check = z.infer<typeof checkSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Room = z.infer<typeof roomSchema>;

export function parseRoom(input: unknown): Room {
  return roomSchema.parse(input);
}

export function parseRoomJson(text: string): Room {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return parseRoom(JSON.parse(trimmed));
}

export function checkCount(room: Room): number {
  return room.tasks.reduce((n, t) => n + t.checks.length, 0);
}

export function maxPoints(room: Room): number {
  return room.tasks.reduce((n, t) => n + t.checks.reduce((m, c) => m + c.points, 0), 0);
}
