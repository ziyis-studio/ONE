import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Expand, Minimize2 } from "lucide-react";
import "./note-page.css";
const NoteActions = createContext<{
  focused: boolean;
  onToggle: () => void;
  onClose: () => void;
  returnLabel: string;
} | null>(null);
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
      <h1 className="one-visually-hidden">{title || "Untitled note"}</h1>
      <NoteActions.Provider
        value={{
          focused,
          onToggle: () => setFocused((value) => !value),
          onClose,
          returnLabel,
        }}
      >
        <div className="note-page-canvas">{children}</div>
      </NoteActions.Provider>
    </section>
  );
}
export function NoteTitleRow({ children }: { children: ReactNode }) {
  const actions = useContext(NoteActions);
  if (!actions) return <>{children}</>;
  const back = `Back to ${actions.returnLabel}`,
    focus = actions.focused ? "Exit focus mode" : "Focus mode";
  return (
    <div className="note-title-row">
      <button
        type="button"
        className="note-page-back"
        onClick={actions.onClose}
        aria-label={back}
        title={back}
      >
        <ArrowLeft size={16} />
        <span>{back}</span>
      </button>
      {children}
      <button
        type="button"
        className="note-page-focus"
        aria-pressed={actions.focused}
        onClick={actions.onToggle}
        aria-label={focus}
        title={focus}
      >
        {actions.focused ? <Minimize2 size={15} /> : <Expand size={15} />}
        <span>{focus}</span>
      </button>
    </div>
  );
}
