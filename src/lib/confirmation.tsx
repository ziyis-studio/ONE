import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleAlert } from "lucide-react";
import "../components/confirmation.css";
import { usePopupExit } from "./popup-exit";

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
};
type Request = Confirmation & {
  resolve: (accepted: boolean) => void;
  previous: HTMLElement | null;
};
const Context = createContext<
  ((options: Confirmation) => Promise<boolean>) | null
>(null);
export const DISCARD_CHANGES: Confirmation = {
  title: "Discard unsaved changes?",
  description: "Your latest edits haven’t been saved.",
  confirmLabel: "Discard changes",
  cancelLabel: "Keep editing",
};

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const pending = useRef<Request | null>(null);
  const confirm = useCallback((options: Confirmation) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = {
        ...options,
        resolve,
        previous: document.activeElement as HTMLElement | null,
      };
      pending.current = next;
      setRequest(next);
    });
  }, []);
  const finish = useCallback((accepted: boolean) => {
    const current = pending.current;
    pending.current = null;
    setRequest(null);
    current?.resolve(accepted);
  }, []);
  useEffect(
    () => () => {
      pending.current?.resolve(false);
      pending.current = null;
    },
    [],
  );
  return (
    <Context.Provider value={confirm}>
      {children}
      {request && <ConfirmationPrompt request={request} finish={finish} />}
    </Context.Provider>
  );
}
export function useConfirm() {
  const confirm = useContext(Context);
  if (!confirm) throw new Error("ConfirmationProvider is required.");
  return confirm;
}
function ConfirmationPrompt({
  request,
  finish,
}: {
  request: Request;
  finish: (accepted: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    cancel = useRef<HTMLButtonElement>(null);
  const title = useId(),
    description = useId();
  usePopupExit(ref, "confirmation");
  useLayoutEffect(() => {
    const root = ref.current!,
      overflow = document.body.style.overflow;
    const siblings = [...document.body.children].filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node !== root,
    );
    const previous = siblings.map((node) => ({
      node,
      inert: !!node.inert,
      hidden: node.getAttribute("aria-hidden"),
    }));
    for (const { node } of previous) {
      node.inert = true;
      node.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";
    cancel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish(false);
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = [...root.querySelectorAll<HTMLButtonElement>("button")];
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      event.preventDefault();
      event.stopImmediatePropagation();
      buttons[
        (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.body.style.overflow = overflow;
      for (const { node, inert, hidden } of previous) {
        node.inert = inert;
        if (hidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", hidden);
      }
      if (request.previous?.isConnected) request.previous.focus();
    };
  }, [finish, request]);
  return createPortal(
    <div
      ref={ref}
      className="one-confirm-shade"
      data-one-confirm="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) finish(false);
      }}
    >
      <div
        className="one-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title}
        aria-describedby={description}
      >
        <CircleAlert size={24} strokeWidth={1.5} aria-hidden="true" />
        <h2 id={title}>{request.title}</h2>
        <p id={description}>{request.description}</p>
        <footer>
          <button
            type="button"
            ref={cancel}
            className="secondary-button"
            onClick={() => finish(false)}
          >
            {request.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => finish(true)}
          >
            {request.confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
