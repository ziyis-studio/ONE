import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Expand, Minimize2, FileText } from "lucide-react";
import "./note-page.css";
export default function NotePageFrame({
  children,
  title,
  onClose,
  returnLabel = "notes",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  returnLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLInputElement>(".editor-title")
      ?.focus({ preventScroll: true });
  }, []);
  return (
    <section
      ref={root}
      className="note-page"
      role="region"
      aria-label="Note editor"
      data-focus-mode={focused || undefined}
    >
      <header className="note-page-header">
        <button type="button" className="note-page-back" onClick={onClose}>
          <ArrowLeft size={16} />
          <span>Back to {returnLabel}</span>
        </button>
        <div>
          <FileText size={14} />
          <h1>{title || "Untitled note"}</h1>
        </div>
        <button
          type="button"
          className="note-page-focus"
          aria-pressed={focused}
          onClick={() => setFocused((value) => !value)}
        >
          {focused ? <Minimize2 size={15} /> : <Expand size={15} />}
          <span>{focused ? "Exit focus mode" : "Focus mode"}</span>
        </button>
      </header>
      <div className="note-page-canvas">{children}</div>
    </section>
  );
}
