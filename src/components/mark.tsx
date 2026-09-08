import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={cn("size-9", className)} aria-hidden>
      <rect x="6" y="8" width="22" height="22" rx="3" fill="#efe9d8" stroke="#1c1914" strokeWidth="1.4" />
      <rect x="3" y="4" width="22" height="22" rx="3" fill="#fffdf7" stroke="#1c1914" strokeWidth="1.4" />
      <path d="M17 4h8v8H17z" fill="#c0e916" stroke="#1c1914" strokeWidth="1.2" />
      <path d="M25 4 17 12" stroke="#1c1914" strokeWidth="1.2" />
    </svg>
  );
}
