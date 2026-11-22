import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { TagGraph } from "../domain/tag-graph";
type Point = SimulationNodeDatum & { id: string; kind: string };
type Link = SimulationLinkDatum<Point>;
type View = { x: number; y: number; k: number };
export type GraphSceneSnapshot = {
  positions: Map<string, { x: number; y: number }>;
  view: View;
  signature: string;
};
/** Physics and camera coordinates are presentation state, never workspace writes. */
export function graphScene(
  graph: TagGraph,
  svg: SVGSVGElement,
  world: SVGGElement,
  marks: Map<string, SVGGElement>,
  lines: Map<number, SVGLineElement>,
  reduced: boolean,
  onZoom: (percent: number) => void,
  previous?: GraphSceneSnapshot,
) {
  const points = graph.nodes.map((n, i): Point => ({
    id: n.id,
    kind: n.kind,
    x:
      previous?.positions.get(n.id)?.x ??
      Math.cos(i * 2.39996) * Math.sqrt(i + 1) * 28,
    y:
      previous?.positions.get(n.id)?.y ??
      Math.sin(i * 2.39996) * Math.sqrt(i + 1) * 28,
  }));
  const byId = new Map(points.map((n) => [n.id, n]));
  const links: Link[] = graph.links.map((l) => ({
    source: l.source,
    target: l.target,
  }));
  let width = svg.clientWidth || 1000,
    height = svg.clientHeight || 560,
    view: View = { x: width / 2, y: height / 2, k: 1 },
    paused = reduced,
    interacted = false;
  function camera(next: View) {
    view = next;
    world.style.setProperty("--graph-scale", String(view.k));
    world.toggleAttribute("data-compact-labels", view.k < 0.85);
    world.toggleAttribute("data-tiny-labels", view.k < 0.45);
    world.setAttribute(
      "transform",
      `translate(${view.x} ${view.y}) scale(${view.k})`,
    );
    onZoom(Math.round(view.k * 100));
  }
  function paint() {
    for (const point of points)
      marks
        .get(point.id)
        ?.setAttribute(
          "transform",
          `translate(${point.x || 0} ${point.y || 0})`,
        );
    links.forEach((link, index) => {
      const line = lines.get(index),
        source = link.source as Point,
        target = link.target as Point;
      if (!line) return;
      line.setAttribute("x1", String(source.x || 0));
      line.setAttribute("y1", String(source.y || 0));
      line.setAttribute("x2", String(target.x || 0));
      line.setAttribute("y2", String(target.y || 0));
    });
  }
  const simulation = forceSimulation<Point>(points)
    .stop()
    .force(
      "link",
      forceLink<Point, Link>(links)
        .id((n) => n.id)
        .distance(100)
        .strength(0.35),
    )
    .force(
      "charge",
      forceManyBody<Point>()
        .strength((n) => (n.kind === "tag" ? -260 : -140))
        .distanceMax(900),
    )
    .force("center", forceCenter(0, 0))
    .force("x", forceX<Point>(0).strength(0.025))
    .force("y", forceY<Point>(0).strength(0.025))
    .force(
      "collision",
      forceCollide<Point>((n) => (n.kind === "tag" ? 43 : 29)),
    )
    .alphaDecay(0.035)
    .on("tick", paint)
    .on("end", () => {
      if (!interacted) fit();
    });
  function fit() {
    if (!points.length) return;
    const xs = points.map((n) => n.x || 0),
      ys = points.map((n) => n.y || 0);
    const minX = Math.min(...xs) - 100,
      maxX = Math.max(...xs) + 100,
      minY = Math.min(...ys) - 65,
      maxY = Math.max(...ys) + 65;
    const k = Math.max(
      0.15,
      Math.min(
        1.4,
        (width - 40) / (maxX - minX),
        (height - 70) / (maxY - minY),
      ),
    );
    camera({
      x: width / 2 - ((minX + maxX) / 2) * k,
      y: height / 2 - ((minY + maxY) / 2) * k,
      k,
    });
  }
  const signature = graph.nodes
    .map((n) => n.id)
    .sort()
    .join("|");
  const sameNodes = previous?.signature === signature;
  simulation.tick(reduced ? 220 : previous ? 15 : 65);
  paint();
  if (sameNodes && previous) {
    interacted = true;
    camera(previous.view);
  } else fit();
  if (!paused) simulation.alpha(0.4).restart();
  const resize = () => {
    const oldWidth = width,
      oldHeight = height;
    width = svg.clientWidth || 1000;
    height = svg.clientHeight || 560;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    if (interacted)
      camera({
        ...view,
        x: view.x + (width - oldWidth) / 2,
        y: view.y + (height - oldHeight) / 2,
      });
    else fit();
  };
  resize();
  const observer =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  observer?.observe(svg);
  function local(clientX: number, clientY: number) {
    const r = svg.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function zoom(factor: number, x = width / 2, y = height / 2) {
    interacted = true;
    const k = Math.max(0.15, Math.min(4, view.k * factor)),
      ratio = k / view.k;
    camera({ x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, k });
  }
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    const p = local(event.clientX, event.clientY);
    zoom(
      Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * 0.004),
      p.x,
      p.y,
    );
  };
  svg.addEventListener("wheel", wheel, { passive: false });
  const touches = new Map<number, { x: number; y: number }>();
  let gesture: {
    id?: string;
    x: number;
    y: number;
    start: View;
    moved: boolean;
  } | null = null;
  let pinch: { distance: number; x: number; y: number; view: View } | null =
    null;
  return {
    snapshot: (): GraphSceneSnapshot => ({
      positions: new Map(
        points.map((n) => [n.id, { x: n.x || 0, y: n.y || 0 }]),
      ),
      view: { ...view },
      signature,
    }),
    fit,
    zoom,
    focus(id: string) {
      const node = byId.get(id);
      if (node) {
        interacted = true;
        camera({
          x: width / 2 - (node.x || 0) * view.k,
          y: height / 2 - (node.y || 0) * view.k,
          k: view.k,
        });
      }
    },
    pause(value: boolean) {
      paused = value;
      if (value) {
        simulation.stop();
        if (!interacted) fit();
      } else simulation.alpha(0.45).restart();
    },
    pan(dx: number, dy: number) {
      interacted = true;
      camera({ ...view, x: view.x + dx, y: view.y + dy });
    },
    down(pointer: number, clientX: number, clientY: number, id?: string) {
      const p = local(clientX, clientY);
      touches.set(pointer, p);
      interacted = true;
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          view: { ...view },
        };
        gesture = null;
        return;
      }
      gesture = { id, ...p, start: { ...view }, moved: false };
      const node = id ? byId.get(id) : null;
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
        if (!paused) simulation.alphaTarget(0.12).restart();
      }
    },
    move(pointer: number, clientX: number, clientY: number) {
      if (!touches.has(pointer)) return;
      const p = local(clientX, clientY);
      touches.set(pointer, p);
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()],
          k = Math.max(
            0.15,
            Math.min(
              4,
              (pinch.view.k * Math.hypot(a.x - b.x, a.y - b.y)) /
                Math.max(1, pinch.distance),
            ),
          ),
          ratio = k / pinch.view.k;
        camera({
          x: (a.x + b.x) / 2 - (pinch.x - pinch.view.x) * ratio,
          y: (a.y + b.y) / 2 - (pinch.y - pinch.view.y) * ratio,
          k,
        });
        return;
      }
      if (!gesture) return;
      gesture.moved ||= Math.hypot(p.x - gesture.x, p.y - gesture.y) > 4;
      if (gesture.id) {
        const node = byId.get(gesture.id)!;
        node.fx = node.x = (p.x - view.x) / view.k;
        node.fy = node.y = (p.y - view.y) / view.k;
        paint();
      } else
        camera({
          ...view,
          x: gesture.start.x + p.x - gesture.x,
          y: gesture.start.y + p.y - gesture.y,
        });
    },
    up(pointer: number) {
      touches.delete(pointer);
      const selected = gesture && !gesture.moved ? gesture.id || "" : null;
      if (gesture?.id) {
        const node = byId.get(gesture.id)!;
        node.fx = node.fy = null;
        simulation.alphaTarget(0);
      }
      if (pinch)
        for (const node of points) {
          node.fx = node.fy = null;
        } // End a pinch without leaving its first node pinned.
      gesture = null;
      pinch = null;
      return selected;
    },
    dispose() {
      simulation.stop();
      observer?.disconnect();
      svg.removeEventListener("wheel", wheel);
    },
  };
}
export type GraphScene = ReturnType<typeof graphScene>;
