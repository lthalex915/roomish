import {
  Children,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parkMath, type MathSlot } from "@/lib/math/delimiters";
import { typesetMath } from "@/lib/math/mathjax";
import { cn } from "@/lib/utils";

function injectMath(node: ReactNode, slots: MathSlot[]): ReactNode {
  if (node == null || typeof node === "boolean") return node;
  if (typeof node === "number") return node;
  if (typeof node === "string") return swapTokens(node, slots);
  if (Array.isArray(node)) {
    return Children.map(node, (child) => injectMath(child, slots));
  }
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children != null) {
    return cloneElement(node, { children: injectMath(node.props.children, slots) });
  }
  return node;
}

function swapTokens(text: string, slots: MathSlot[]): ReactNode {
  const re = /%%MATH(\d+)%%/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const slot = slots[Number(match[1])];
    if (slot) {
      out.push(
        slot.display ? (
          <span key={match[0]} className="math-display">{`\\[${slot.tex}\\]`}</span>
        ) : (
          <span key={match[0]} className="math-inline">{`\\(${slot.tex}\\)`}</span>
        ),
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  if (out.length === 0) return text;
  if (out.length === 1) return out[0];
  return out;
}

function makeComponents(slots: MathSlot[]): Components {
  const wrap =
    (className: string, Tag: "p" | "h3" | "ul" | "ol" | "li" | "blockquote") =>
    ({ children }: { children?: ReactNode }) => {
      const El = Tag;
      return <El className={className}>{injectMath(children, slots)}</El>;
    };

  return {
    p: wrap("note-p", "p"),
    h1: wrap("note-h", "h3"),
    h2: wrap("note-h", "h3"),
    h3: wrap("note-h", "h3"),
    ul: wrap("note-ul", "ul"),
    ol: wrap("note-ol", "ol"),
    li: wrap("note-li", "li"),
    blockquote: wrap("note-quote", "blockquote"),
    a: ({ href, children }) => (
      <a href={href} className="underline decoration-ink/30 underline-offset-2" target="_blank" rel="noreferrer">
        {injectMath(children, slots)}
      </a>
    ),
    strong: ({ children }) => <span>{injectMath(children, slots)}</span>,
    b: ({ children }) => <span>{injectMath(children, slots)}</span>,
    em: ({ children }) => <em className="font-normal italic">{injectMath(children, slots)}</em>,
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
    td: ({ children }) => <td>{injectMath(children, slots)}</td>,
    th: ({ children }) => <th>{injectMath(children, slots)}</th>,
  };
}

export function Prose({ text, className }: { text: string; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { markdown, slots } = useMemo(() => parkMath(text), [text]);
  const components = useMemo(() => makeComponents(slots), [slots]);

  useLayoutEffect(() => {
    void typesetMath(rootRef.current);
  }, [markdown, slots]);

  if (!text.trim()) return null;
  return (
    <div ref={rootRef} className={cn("note-prose", className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
