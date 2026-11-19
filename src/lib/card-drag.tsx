import { useEffect, useId, useRef, useState } from "react";
import type {
  DragEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import type { Stage } from "./actions";
import "../components/card-drag.css";

type Item = { id: string; title: string };
type Placement = { id: string; stage: Stage; beforeId: string | null };
export type CardDragBinding = {
  "data-sort-id": string;
  "data-sort-scope": string;
  "data-sort-stage": Stage;
  "data-sorting"?: true;
  "data-keyboard-sorting"?: true;
  "aria-busy"?: true;
  "aria-describedby": string;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onDragStartCapture: DragEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
};
type Session = {
  item: Item;
  origin: Placement;
  placement: Placement;
  node: HTMLElement;
  pointerId: number;
  touch: boolean;
  keyboard: boolean;
  active: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  layer: HTMLDivElement | null;
  timer: ReturnType<typeof setTimeout> | null;
  frame: number;
  detach: () => void;
};
const same = (a: Placement, b: Placement) =>
  a.id === b.id && a.stage === b.stage && a.beforeId === b.beforeId;
const interactive =
  'input,textarea,select,a,[contenteditable="true"],[data-no-card-drag]';

/** Only the visual insertion slot is projected locally. The API owns every mutation. */
export function useCardDrag<T extends Item>({
  items,
  stageOf,
  lanes,
  board,
  disabled,
  onMove,
}: {
  items: T[];
  stageOf: (item: T) => Stage;
  lanes: Stage[];
  board: boolean;
  disabled: boolean;
  onMove: (item: T, stage: Stage, beforeId: string | null) => Promise<unknown>;
}) {
  const scope = useId(),
    descriptionId = useId();
  const latest = useRef({ items, stageOf, lanes, board, disabled, onMove });
  latest.current = { items, stageOf, lanes, board, disabled, onMove };
  const session = useRef<Session | null>(null),
    alive = useRef(true),
    saving = useRef(false);
  const clearClickGuard = useRef<(() => void) | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  function focusCard(id: string) {
    requestAnimationFrame(() => {
      const node = [
        ...document.querySelectorAll<HTMLElement>("[data-sort-id]"),
      ].find((n) => n.dataset.sortScope === scope && n.dataset.sortId === id);
      node
        ?.querySelector<HTMLButtonElement>(".one-card-open,.one-inline-open")
        ?.focus({ preventScroll: true });
    });
  }
  function clean(s: Session) {
    s.detach();
    if (s.timer) clearTimeout(s.timer);
    cancelAnimationFrame(s.frame);
    s.layer?.remove();
    document.body.classList.remove("one-card-drag-active");
    session.current = null;
  }
  function end(commit: boolean) {
    const s = session.current;
    if (!s) return;
    const active = s.active,
      drop = s.placement;
    clean(s);
    setActiveId(null);
    if (!active) return;
    // Consume only the pointer gesture's trailing click. A new gesture clears
    // the guard immediately, so the next intentional click stays responsive.
    if (!s.keyboard) {
      clearClickGuard.current?.();
      const clear = () => {
        window.removeEventListener("click", stop, true);
        window.removeEventListener("pointerdown", clear, true);
        clearClickGuard.current = null;
      };
      const stop = (e: MouseEvent) => {
        if (!e.detail) return;
        e.preventDefault();
        e.stopPropagation();
        clear();
      };
      window.addEventListener("click", stop, true);
      window.addEventListener("pointerdown", clear, true);
      clearClickGuard.current = clear;
    }
    if (!commit || same(drop, s.origin)) {
      setPlacement(null);
      setAnnouncement(commit ? "Position unchanged." : "Move cancelled.");
      if (s.keyboard) focusCard(s.item.id);
      return;
    }
    const item = latest.current.items.find((i) => i.id === s.item.id);
    if (!item) {
      setPlacement(null);
      return;
    }
    saving.current = true;
    setPending(true);
    setAnnouncement(`Saving position of ${item.title}.`);
    void latest.current
      .onMove(item, drop.stage, drop.beforeId)
      .then(() => {
        if (alive.current) setAnnouncement(`${item.title} moved.`);
      })
      .catch(() => {
        // The workspace presents the API error; removing the preview restores its snapshot.
        if (alive.current)
          setAnnouncement(
            `Could not move ${item.title}. Its saved position was restored.`,
          );
      })
      .finally(() => {
        saving.current = false;
        if (alive.current) {
          setPending(false);
          setPlacement(null);
          if (s.keyboard) focusCard(item.id);
        }
      });
  }
  function project(next: Placement, s: Session) {
    if (same(next, s.placement)) return;
    s.placement = next;
    setPlacement(next);
    setAnnouncement(
      `${s.item.title}, ${next.stage === "progress" ? "In progress" : next.stage === "hold" ? "On hold" : next.stage === "done" ? "Done" : "To do"}.`,
    );
  }
  function hit(s: Session): boolean {
    const element = document.elementFromPoint(s.x, s.y);
    // Layout animation can expose the table or a lane's background between
    // moving rows. Keep that space droppable instead of cancelling on release.
    const lane =
      element?.closest<HTMLElement>("[data-sort-lane]") ??
      [...document.querySelectorAll<HTMLElement>("[data-sort-lane]")].find(
        (node) => {
          if (node.dataset.sortScope !== scope || node.closest("[inert]"))
            return false;
          const r = node.getBoundingClientRect();
          return (
            s.x >= r.left && s.x <= r.right && s.y >= r.top && s.y <= r.bottom
          );
        },
      );
    if (!lane || lane.dataset.sortScope !== scope) return false;
    const hovered = element?.closest<HTMLElement>("[data-sort-id]");
    if (hovered?.dataset.sortId === s.item.id) return true;
    const nodes = [
      ...lane.querySelectorAll<HTMLElement>("[data-sort-id]"),
    ].filter(
      (n) => n.dataset.sortScope === scope && n.dataset.sortId !== s.item.id,
    );
    const before = nodes.find((node) => {
      const r = node.getBoundingClientRect();
      return s.y < r.top + r.height / 2;
    });
    project(
      {
        id: s.item.id,
        stage: latest.current.board
          ? (lane.dataset.sortLane as Stage)
          : s.origin.stage,
        beforeId: before?.dataset.sortId || null,
      },
      s,
    );
    return true;
  }
  function draw(s: Session) {
    if (session.current !== s || !s.active || s.keyboard) return;
    if (s.layer)
      s.layer.style.transform = `translate3d(${s.x - s.offsetX}px,${s.y - s.offsetY}px,0)`;
    hit(s);
    const edge = 48,
      speed = (point: number, min: number, max: number) =>
        point < min + edge
          ? -Math.ceil(((min + edge - point) / edge) * 14)
          : point > max - edge
            ? Math.ceil(((point - max + edge) / edge) * 14)
            : 0;
    const lane = document
      .elementFromPoint(s.x, s.y)
      ?.closest<HTMLElement>("[data-sort-lane]");
    const scroller = lane?.closest<HTMLElement>(".board-scroll");
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      scroller.scrollLeft += speed(s.x, r.left, Math.min(r.right, innerWidth));
    }
    const dy = speed(s.y, 0, innerHeight);
    if (dy) window.scrollBy(0, dy);
    s.frame = requestAnimationFrame(() => draw(s));
  }
  function activate(s: Session) {
    if (session.current !== s || latest.current.disabled) return;
    if (s.timer) clearTimeout(s.timer);
    s.active = true;
    const rect = s.node.getBoundingClientRect();
    const layer = document.createElement("div"),
      clone = s.node.cloneNode(true) as HTMLElement;
    const width = Math.min(rect.width, innerWidth - 20),
      height = Math.min(rect.height, 400);
    layer.className = "one-card-drag-overlay";
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
    Object.assign(layer.style, {
      width: width + "px",
      height: height + "px",
      borderRadius: getComputedStyle(s.node).borderRadius || "14px",
    });
    clone.removeAttribute("data-sort-id");
    clone.removeAttribute("data-sorting");
    clone.removeAttribute("aria-busy");
    clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    clone.removeAttribute("id");
    Object.assign(clone.style, {
      margin: "0",
      width: "100%",
      height: rect.height + "px",
      transform: "none",
      opacity: "1",
    });
    if (clone.tagName === "TR") {
      const table = document.createElement("table"),
        body = document.createElement("tbody");
      table.className = "data-table task-table";
      body.append(clone);
      table.append(body);
      layer.append(table);
    } else layer.append(clone);
    s.offsetX = Math.min(width - 8, Math.max(8, s.startX - rect.left));
    s.offsetY = Math.min(height - 8, Math.max(8, s.startY - rect.top));
    s.layer = layer;
    layer.style.transform = `translate3d(${s.x - s.offsetX}px,${s.y - s.offsetY}px,0)`;
    document.body.append(layer);
    document.body.classList.add("one-card-drag-active");
    setActiveId(s.item.id);
    setPlacement(s.placement);
    setAnnouncement(`Picked up ${s.item.title}. Escape cancels the move.`);
    s.frame = requestAnimationFrame(() => draw(s));
  }
  function origin(item: T): Placement {
    const stage = latest.current.stageOf(item),
      members = latest.current.items.filter(
        (i) => !latest.current.board || latest.current.stageOf(i) === stage,
      );
    return {
      id: item.id,
      stage,
      beforeId:
        members[members.findIndex((i) => i.id === item.id) + 1]?.id || null,
    };
  }
  function start(item: T, event: React.PointerEvent<HTMLElement>) {
    if (
      latest.current.disabled ||
      saving.current ||
      session.current ||
      event.button !== 0 ||
      event.isPrimary === false
    )
      return;
    const target = event.target as HTMLElement;
    if (
      target.closest(interactive) ||
      (target.closest("button") &&
        !target.closest(".one-card-open,.one-inline-open"))
    )
      return;
    const initial = origin(item);
    const s: Session = {
      item,
      origin: initial,
      placement: initial,
      node: event.currentTarget,
      pointerId: event.pointerId,
      touch: event.pointerType === "touch",
      keyboard: false,
      active: false,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: 0,
      offsetY: 0,
      layer: null,
      timer: null,
      frame: 0,
      detach: () => {},
    };
    session.current = s;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.active && Math.hypot(s.x - s.startX, s.y - s.startY) > 6) {
        if (s.touch) {
          end(false);
          return;
        }
        activate(s);
      }
      if (s.active) e.preventDefault();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      const valid = s.active ? hit(s) : false;
      end(valid);
    };
    const cancel = () => end(false),
      key = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          end(false);
        }
      };
    const touchMove = (e: TouchEvent) => {
      if (s.active) e.preventDefault();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("touchmove", touchMove, { passive: false });
    s.detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchmove", touchMove);
    };
    if (s.touch) s.timer = setTimeout(() => activate(s), 220);
  }
  function keyboard(item: T, event: React.KeyboardEvent<HTMLElement>) {
    if (
      session.current ||
      saving.current ||
      latest.current.disabled ||
      event.code !== "Space" ||
      !(event.target as HTMLElement).matches(".one-card-open,.one-inline-open")
    )
      return;
    event.preventDefault();
    const initial = origin(item);
    const s: Session = {
      item,
      origin: initial,
      placement: initial,
      node: event.currentTarget,
      pointerId: -1,
      touch: false,
      keyboard: true,
      active: true,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      layer: null,
      timer: null,
      frame: 0,
      detach: () => {},
    };
    session.current = s;
    setActiveId(item.id);
    setPlacement(initial);
    setAnnouncement(
      `Picked up ${item.title}. Use arrow keys, Enter to drop, Escape to cancel.`,
    );
    const key = (e: KeyboardEvent) => {
      if (
        ![
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Enter",
          " ",
          "Escape",
          "Tab",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape" || e.key === "Tab") {
        end(false);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        end(true);
        return;
      }
      const current = projected(latest.current.items, s.placement);
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        latest.current.board
      ) {
        const at = latest.current.lanes.indexOf(s.placement.stage),
          stage = latest.current.lanes[at + (e.key === "ArrowRight" ? 1 : -1)];
        if (stage) project({ ...s.placement, stage, beforeId: null }, s);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const members = current.filter(
            (i) =>
              !latest.current.board ||
              visualStage(i, s.placement) === s.placement.stage,
          ),
          at = members.findIndex((i) => i.id === item.id);
        const beforeId =
          e.key === "ArrowUp"
            ? members[at - 1]?.id
            : at < members.length - 1
              ? members[at + 2]?.id || null
              : undefined;
        if (beforeId !== undefined) project({ ...s.placement, beforeId }, s);
      }
      focusCard(item.id);
    };
    window.addEventListener("keydown", key, true);
    s.detach = () => window.removeEventListener("keydown", key, true);
  }
  function visualStage(item: T, p: Placement | null = placement): Stage {
    return p?.id === item.id ? p.stage : stageOf(item);
  }
  function projected(members: T[], p: Placement | null): T[] {
    if (!p) return members;
    const item = members.find((i) => i.id === p.id);
    if (!item) return members;
    const rest = members.filter((i) => i.id !== p.id);
    const at = p.beforeId ? rest.findIndex((i) => i.id === p.beforeId) : -1;
    rest.splice(at < 0 ? rest.length : at, 0, item);
    return rest;
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (session.current) clean(session.current);
      clearClickGuard.current?.();
    };
  }, []);
  return {
    items: projected(items, placement),
    stageOf: visualStage,
    activeId,
    pending,
    lane: (stage: Stage | "list") => ({
      "data-sort-lane": stage,
      "data-sort-scope": scope,
      "data-sort-over":
        activeId && placement?.stage === stage ? true : undefined,
    }),
    card: (item: T): CardDragBinding => ({
      "data-sort-id": item.id,
      "data-sort-scope": scope,
      "data-sort-stage": visualStage(item),
      "data-sorting":
        activeId === item.id && !session.current?.keyboard ? true : undefined,
      "data-keyboard-sorting":
        activeId === item.id && session.current?.keyboard ? true : undefined,
      "aria-describedby": descriptionId,
      "aria-busy": pending && placement?.id === item.id ? true : undefined,
      onPointerDown: (e) => start(item, e),
      onDragStartCapture: (e) => {
        e.preventDefault();
      },
      onKeyDown: (e) => keyboard(item, e),
    }),
    descriptionId,
    feedback: (
      <>
        <span className="sr-only" id={descriptionId}>
          Drag to move. With the card focused, press Space, use arrow keys, then
          Enter to drop or Escape to cancel.
        </span>
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </>
    ),
  };
}
