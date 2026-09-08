export type MathSlot = { display: boolean; tex: string };

const TOKEN = (i: number) => `%%MATH${i}%%`;

function isCurrencyBody(body: string): boolean {
  const t = body.trim();
  return /^\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|usd|dollars?))?$/i.test(t);
}

function park(src: string, pattern: RegExp): { text: string; chunks: string[] } {
  const chunks: string[] = [];
  const text = src.replace(pattern, (full) => {
    const i = chunks.length;
    chunks.push(full);
    return `\u0000CODE${i}\u0000`;
  });
  return { text, chunks };
}

function unpark(src: string, chunks: string[]): string {
  return src.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => chunks[Number(i)] ?? "");
}

/**
 * Lift math out of markdown so `$` is never a delimiter.
 * Existing `$...$` / `$$...$$` become MathJax `\(...\)` / `\[...\]`
 * unless the dollars look like money ($100).
 */
export function parkMath(input: string): { markdown: string; slots: MathSlot[] } {
  const fences = park(input, /```[\s\S]*?```/g);
  const ticks = park(fences.text, /`[^`]*`/g);
  let text = ticks.text;
  const slots: MathSlot[] = [];

  const take = (display: boolean, tex: string) => {
    const i = slots.length;
    slots.push({ display, tex: tex.trim() });
    return TOKEN(i);
  };

  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) => take(true, tex));
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => take(true, tex));
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex: string) => take(false, tex));
  text = text.replace(/\$([^$\n]+?)\$/g, (full: string, tex: string) =>
    isCurrencyBody(tex) ? full : take(false, tex),
  );

  return { markdown: unpark(unpark(text, ticks.chunks), fences.chunks), slots };
}

export { TOKEN as mathToken };
