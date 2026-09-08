declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (els?: Element[]) => Promise<void>;
      typesetClear?: (els?: Element[]) => void;
      startup?: { promise?: Promise<void>; typeset?: boolean };
      tex?: unknown;
      svg?: unknown;
    };
  }
}

let loading: Promise<void> | null = null;
let queue: Promise<void> = Promise.resolve();

export function loadMathJax(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MathJax?.typesetPromise) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    window.MathJax = {
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true,
      },
      svg: { fontCache: "global" },
      startup: { typeset: false },
    };

    const existing = document.getElementById("MathJax-script");
    if (existing) {
      if (window.MathJax?.typesetPromise) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "MathJax-script";
    script.async = true;
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.onload = () => {
      const ready = window.MathJax?.startup?.promise;
      if (ready) void ready.then(() => resolve());
      else resolve();
    };
    script.onerror = () => reject(new Error("MathJax failed to load"));
    document.head.appendChild(script);
  });

  return loading;
}

export async function typesetMath(el: HTMLElement | null): Promise<void> {
  if (!el) return;
  const run = queue.then(async () => {
    await loadMathJax();
    const mj = window.MathJax;
    mj?.typesetClear?.([el]);
    await mj?.typesetPromise?.([el]);
  });
  queue = run.catch(() => undefined);
  try {
    await run;
  } catch {
    /* keep the TeX source visible if the CDN is blocked */
  }
}
