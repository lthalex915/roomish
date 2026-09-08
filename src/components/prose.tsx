import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ children }) => <p className="note-p">{children}</p>,
  h1: ({ children }) => <h3 className="note-h">{children}</h3>,
  h2: ({ children }) => <h3 className="note-h">{children}</h3>,
  h3: ({ children }) => <h3 className="note-h">{children}</h3>,
  ul: ({ children }) => <ul className="note-ul">{children}</ul>,
  ol: ({ children }) => <ol className="note-ol">{children}</ol>,
  li: ({ children }) => <li className="note-li">{children}</li>,
  blockquote: ({ children }) => <blockquote className="note-quote">{children}</blockquote>,
  a: ({ href, children }) => (
    <a href={href} className="underline decoration-ink/30 underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const text = String(children).replace(/\n$/, "");
    const fenced = Boolean(className) || text.includes("\n");
    if (!fenced) {
      return (
        <code className="note-inline-code" {...props}>
          {text}
        </code>
      );
    }
    const lang = /language-([\w+-]+)/.exec(className ?? "")?.[1];
    return (
      <pre className="note-pre">
        {lang ? <span className="note-lang">{lang}</span> : null}
        <code className="note-code" {...props}>
          {text}
        </code>
      </pre>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="note-table-wrap">
      <table className="note-table">{children}</table>
    </div>
  ),
};

export function Prose({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  return (
    <div className={cn("note-prose", className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {text}
      </Markdown>
    </div>
  );
}
