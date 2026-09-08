import type { Check } from "./schema";

function normalize(text: string, caseSensitive: boolean): string {
  let value = text.normalize("NFKC").trim();
  if (!caseSensitive) value = value.toLowerCase();
  return value.replace(/\s+/g, " ");
}

function parts(text: string, caseSensitive: boolean): string[] {
  return normalize(text, caseSensitive)
    .split(/[,;/|]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .sort();
}

export function isCorrect(check: Check, submission: string): boolean {
  const keys = [check.answer, ...(check.accepted ?? [])];
  if (check.type === "select_all") {
    const got = parts(submission, check.case_sensitive);
    const want = parts(keys[0] ?? "", check.case_sensitive);
    return got.length > 0 && got.join("|") === want.join("|");
  }
  const got = normalize(submission, check.case_sensitive);
  return keys.some((k) => normalize(k, check.case_sensitive) === got);
}
