import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, KeyRound, Sparkles } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Mark } from "@/components/mark";
import { aiReady, useAiSettings } from "@/lib/ai/settings-store";
import { useLibrary } from "@/lib/library-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Shelf" },
  { to: "/courses", label: "Courses" },
  { to: "/convert", label: "Compose" },
  { to: "/settings", label: "Keys" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const settings = useAiSettings();
  const on = aiReady(settings);

  useEffect(() => {
    void (async () => {
      await useLibrary.getState().hydrate();
      await useAiSettings.getState().hydrate();
    })();
  }, []);

  return (
    <div className="min-h-dvh text-ink">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-ink no-underline">
            <Mark />
            <span className="font-serif text-xl tracking-tight">Roomish</span>
          </Link>
          <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-2 text-sm text-muted no-underline hover:text-ink [&.active]:bg-ink [&.active]:text-bg"
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "active" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span
            className={cn(
              "hidden rounded-full px-3 py-1 text-xs sm:inline",
              on ? "bg-primary text-primary-fg" : "bg-raised text-muted",
            )}
          >
            {on ? "Coach on" : "Coach off"}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}

export const Icons = { BookOpen, GraduationCap, KeyRound, Sparkles };
