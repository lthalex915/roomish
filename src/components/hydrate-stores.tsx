import { useEffect, useState, type ReactNode } from "react";
import { useAiSettings } from "@/lib/ai/settings-store";
import { useLibrary } from "@/lib/library-store";

export function useClientReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await useLibrary.getState().hydrate();
      await useAiSettings.getState().hydrate();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useClientReady();
  if (!ready) return fallback ?? <p className="text-muted">Opening your notebook…</p>;
  return children;
}
