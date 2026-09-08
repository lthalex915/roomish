import { cn } from "@/lib/utils";
import type { Check } from "@/lib/room/schema";

type Props = {
  check: Check;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  wrong?: boolean;
};

function parseMatching(value: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const chunk of value.split(";")) {
    const [left, right] = chunk.split("=>").map((s) => s.trim());
    if (left && right) map[left] = right;
  }
  return map;
}

const field =
  "w-full rounded-xl border border-border bg-bg px-3 py-2 text-ink outline-none focus:border-ink";

function optionClass(picked: boolean, wrong?: boolean) {
  return cn(
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2",
    picked && wrong && "border-danger bg-danger/10 text-danger",
    picked && !wrong && "border-ink bg-primary/40",
    !picked && "border-border bg-bg",
  );
}

export function CheckField({ check, value, onChange, disabled, wrong }: Props) {
  if (check.type === "mcq" || check.type === "true_false") {
    const options = check.type === "true_false" ? ["True", "False"] : check.choices;
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        {options.map((choice) => {
          const picked = value === choice;
          return (
            <label key={choice} className={optionClass(picked, wrong)}>
              <input
                type="radio"
                name={check.qid}
                value={choice}
                checked={picked}
                onChange={() => onChange(choice)}
                className={cn("size-4", picked && wrong ? "accent-danger" : "accent-ink")}
              />
              <span>{choice}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  if (check.type === "select_all") {
    const selected = value.split(",").map((s) => s.trim()).filter(Boolean);
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        {check.choices.map((choice) => {
          const on = selected.includes(choice);
          return (
            <label key={choice} className={optionClass(on, wrong)}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => {
                  const next = on ? selected.filter((c) => c !== choice) : [...selected, choice];
                  onChange(next.join(", "));
                }}
                className={cn("size-4", on && wrong ? "accent-danger" : "accent-ink")}
              />
              <span>{choice}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  if (check.type === "matching") {
    const current = parseMatching(value);
    const expected = parseMatching(check.answer);
    const update = (left: string, right: string) => {
      const next = { ...current, [left]: right };
      onChange(
        check.pairs_left
          .map((l) => (next[l] ? `${l} => ${next[l]}` : null))
          .filter(Boolean)
          .join("; "),
      );
    };
    return (
      <div className="grid gap-3">
        {check.pairs_left.map((left) => {
          const picked = Boolean(current[left]);
          const rowWrong = Boolean(wrong && picked && current[left] !== expected[left]);
          return (
            <label key={left} className="grid gap-1 text-sm">
              <span className={rowWrong ? "text-danger" : "text-muted"}>{left}</span>
              <select
                className={cn(field, rowWrong && "border-danger text-danger")}
                value={current[left] ?? ""}
                disabled={disabled}
                onChange={(e) => update(left, e.target.value)}
              >
                <option value="">Choose…</option>
                {check.pairs_right.map((right) => (
                  <option key={right} value={right}>
                    {right}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      className={cn(field, wrong && "border-danger text-danger")}
      value={value}
      disabled={disabled}
      placeholder="A short answer"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
