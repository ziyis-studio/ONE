import { useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { Crosshair, Maximize, Minus, Pause, Play, Plus } from "lucide-react";
import type { TagGraph } from "../domain/tag-graph";
import { graphScene } from "../lib/graph-scene";
import type { GraphScene, GraphSceneSnapshot } from "../lib/graph-scene";
import { useMotionPreference } from "../lib/motion-preference";
import { IconButton } from "./ui";
export default function TagGraphCanvas({
  graph,
  selected,
  onSelect,
  onOpen,
}: {
  graph: TagGraph;
  selected: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const reduced = useMotionPreference(),
    [paused, setPaused] = useState(reduced),
    [zoom, setZoom] = useState(100),
    [hover, setHover] = useState("");
  const svg = useRef<SVGSVGElement>(null),
    world = useRef<SVGGElement>(null),
    marks = useRef(new Map<string, SVGGElement>()),
    lines = useRef(new Map<number, SVGLineElement>()),
    scene = useRef<GraphScene | null>(null),
    previousScene = useRef<GraphSceneSnapshot | undefined>(undefined),
    tooltip = useRef<HTMLDivElement>(null),
    pointer = useRef({ x: 0, y: 0 }),
    dragging = useRef(false),
    tooltipId = useId(),
    hint = useId();
  const hoverNode = graph.nodes.find((n) => n.id === hover);
  function positionTooltip(clientX: number, clientY: number) {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    pointer.current = { x: clientX - box.left, y: clientY - box.top };
    paintTooltip();
  }
  function paintTooltip() {
    const tip = tooltip.current,
      box = svg.current?.getBoundingClientRect();
    if (!tip || !box) return;
    const x = Math.max(
      8,
      Math.min(pointer.current.x + 16, box.width - tip.offsetWidth - 12),
    );
    const y = Math.max(
      8,
      Math.min(pointer.current.y + 16, box.height - tip.offsetHeight - 12),
    );
    tip.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  useLayoutEffect(() => {
    paintTooltip();
  }, [hover]);
  const active =
      (graph.nodes.some((n) => n.id === hover) ? hover : "") || selected,
    neighbors = new Set([active]);
  for (const edge of graph.links) {
    if (edge.source === active) neighbors.add(edge.target);
    if (edge.target === active) neighbors.add(edge.source);
  }
  useLayoutEffect(() => {
    if (!svg.current || !world.current) return;
    const layout = graphScene(
      graph,
      svg.current,
      world.current,
      marks.current,
      lines.current,
      reduced,
      setZoom,
      previousScene.current,
    );
    scene.current = layout;
    return () => {
      previousScene.current = layout.snapshot();
      layout.dispose();
      scene.current = null;
    };
  }, [graph, reduced]);
  useEffect(() => {
    if (reduced) setPaused(true);
  }, [reduced]);
  useLayoutEffect(() => {
    scene.current?.pause(paused);
  }, [paused, reduced, graph]);
  return (
    <div className="tag-graph-canvas-wrap">
      <div className="tag-graph-camera" aria-label="Graph controls">
        <IconButton label="Zoom out" onClick={() => scene.current?.zoom(0.8)}>
          <Minus size={15} />
        </IconButton>
        <span aria-label="Graph zoom">{zoom}%</span>
        <IconButton label="Zoom in" onClick={() => scene.current?.zoom(1.25)}>
          <Plus size={15} />
        </IconButton>
        <IconButton label="Fit graph" onClick={() => scene.current?.fit()}>
          <Maximize size={15} />
        </IconButton>
        <IconButton
          label="Center selected node"
          disabled={!selected}
          onClick={() => scene.current?.focus(selected)}
        >
          <Crosshair size={15} />
        </IconButton>
        <button
          type="button"
          className="icon-button"
          aria-label={
            paused ? "Resume graph animation" : "Pause graph animation"
          }
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
      </div>
      <svg
        ref={svg}
        className="tag-graph-canvas"
        role="group"
        aria-label="Tag relationship graph"
        aria-describedby={hint}
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          dragging.current = true;
          setHover("");
          const node = (e.target as Element).closest<SVGGElement>(
            "[data-graph-node]",
          );
          scene.current?.down(
            e.pointerId,
            e.clientX,
            e.clientY,
            node?.dataset.graphNode,
          );
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          scene.current?.move(e.pointerId, e.clientX, e.clientY);
          if (!dragging.current) positionTooltip(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          const id = scene.current?.up(e.pointerId);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (id !== null && id !== undefined) onSelect(id);
        }}
        onPointerCancel={(e) => {
          dragging.current = false;
          setHover("");
          scene.current?.up(e.pointerId);
        }}
        onKeyDown={(e) => {
          if ((e.target as Element).closest("[data-graph-node]")) return;
          const keys: Record<string, () => void> = {
            "+": () => scene.current?.zoom(1.25),
            "=": () => scene.current?.zoom(1.25),
            "-": () => scene.current?.zoom(0.8),
            "0": () => scene.current?.fit(),
            ArrowLeft: () => scene.current?.pan(40, 0),
            ArrowRight: () => scene.current?.pan(-40, 0),
            ArrowUp: () => scene.current?.pan(0, 40),
            ArrowDown: () => scene.current?.pan(0, -40),
            Escape: () => onSelect(""),
          };
          if (keys[e.key]) {
            e.preventDefault();
            keys[e.key]();
          }
        }}
      >
        <g ref={world} className="graph-world">
          <g aria-hidden="true" className="graph-links">
            {graph.links.map((edge, i) => (
              <line
                key={edge.source + "/" + edge.target}
                ref={(n) => {
                  if (n) lines.current.set(i, n);
                  else lines.current.delete(i);
                }}
                data-kind={edge.kind}
                data-inherited={edge.inherited || undefined}
                data-active={
                  (active &&
                    (edge.source === active || edge.target === active)) ||
                  undefined
                }
                data-dim={
                  (active &&
                    edge.source !== active &&
                    edge.target !== active) ||
                  undefined
                }
              />
            ))}
          </g>
          {graph.nodes.map((node, i) => (
            <g
              key={node.id}
              ref={(n) => {
                if (n) marks.current.set(node.id, n);
                else marks.current.delete(node.id);
              }}
              data-graph-node={node.id}
              data-kind={node.kind}
              data-selected={selected === node.id || undefined}
              data-hovered={hover === node.id || undefined}
              aria-describedby={hover === node.id ? tooltipId : undefined}
              data-dim={(active && !neighbors.has(node.id)) || undefined}
              data-stage={node.stage}
              className="graph-node"
              role="button"
              tabIndex={0}
              aria-label={`${node.kind === "tag" ? "Tag #" : node.kind === "project" ? "Project " : node.kind === "note" ? "Note " : "Task "}${node.label}, ${node.connections} connections`}
              aria-pressed={selected === node.id}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch" && !dragging.current) {
                  positionTooltip(event.clientX, event.clientY);
                  setHover(node.id);
                }
              }}
              onPointerLeave={() =>
                setHover((current) => (current === node.id ? "" : current))
              }
              onFocus={(event) => {
                const box = event.currentTarget
                  .querySelector(".graph-node-dot")
                  ?.getBoundingClientRect();
                if (box) positionTooltip(box.right, box.top);
                setHover(node.id);
              }}
              onBlur={() =>
                setHover((current) => (current === node.id ? "" : current))
              }
              onDoubleClick={() => onOpen(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(node.id);
                }
                if (e.key === "Escape") {
                  e.stopPropagation();
                  onSelect("");
                  setHover("");
                }
              }}
            >
              <g
                className="graph-node-mark"
                style={{ animationDelay: Math.min(i, 20) * 8 + "ms" }}
              >
                <circle className="graph-node-hit" r={22} />
                <circle
                  className="graph-node-halo"
                  r={node.kind === "tag" ? 18 : 13}
                />
                {node.kind === "project" ? (
                  <rect
                    x={-6}
                    y={-6}
                    width={12}
                    height={12}
                    rx={3}
                    className="graph-node-dot"
                  />
                ) : (
                  <circle
                    r={node.kind === "tag" ? 10 : 5}
                    className="graph-node-dot"
                  />
                )}
                <text y={node.kind === "tag" ? 29 : 22} textAnchor="middle">
                  {node.kind === "tag" ? "#" : ""}
                  {node.label.length > 25
                    ? node.label.slice(0, 24) + "…"
                    : node.label}
                </text>
              </g>
            </g>
          ))}
        </g>
      </svg>
      {hoverNode && (
        <div
          ref={tooltip}
          id={tooltipId}
          role="tooltip"
          className="graph-hover-card"
        >
          <span>
            {hoverNode.kind}
            {hoverNode.stage
              ? " · " +
                {
                  todo: "To do",
                  progress: "In progress",
                  hold: "On hold",
                  done: "Done",
                }[hoverNode.stage]
              : ""}
          </span>
          <strong>
            {hoverNode.kind === "tag" ? "#" : ""}
            {hoverNode.label}
          </strong>
          <small>
            {hoverNode.connections}{" "}
            {hoverNode.connections === 1 ? "connection" : "connections"}
            {hoverNode.projectTitle ? " · " + hoverNode.projectTitle : ""}
          </small>
        </div>
      )}
      <p id={hint} className="tag-graph-hint">
        Drag nodes or the canvas · Scroll / pinch to zoom · Enter selects a
        focused node
      </p>
    </div>
  );
}
