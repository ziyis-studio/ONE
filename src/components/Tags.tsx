import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Hash,
  Network,
  List,
  PencilLine,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { useViewState } from "../lib/view-state";
import { useConfirm } from "../lib/confirmation";
import { api } from "../lib/api";
import type { TagGraph, TagOption } from "../domain/tag-graph";
import { Dialog, IconButton, Spinner } from "./ui";
import { SelectField } from "./SelectField";
import { PageDate } from "./PageDate";
import TagGraphCanvas from "./TagGraphCanvas";
import TagList from "./TagList";
import { DiscreteTabs } from "./interactions";
import "./tag-graph.css";
export default function Tags() {
  const { data, demo, session, scope, edit, execute, busy, notify } = useOne();
  const confirm = useConfirm();
  const [view, setView] = useViewState<string>("tags.view", "graph");
  const [listOptions, setListOptions] = useState<TagOption[]>([]);
  const [query, setQuery] = useViewState<string>("tags.query", ""),
    [kind, setKind] = useViewState<"all" | "task" | "project" | "note">(
      "tags.kind",
      "all",
    ),
    [tag, setTag] = useViewState<string>("tags.filter", ""),
    [includeCompleted, setCompleted] = useViewState<boolean>(
      "tags.completed",
      true,
    ),
    [includeUntagged, setUntagged] = useViewState<boolean>(
      "tags.untagged",
      false,
    );
  const [graph, setGraph] = useState<TagGraph | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState("");
  const [form, setForm] = useState<{ from?: string; name: string } | null>(
      null,
    ),
    [formError, setFormError] = useState(""),
    [saving, setSaving] = useState(false);
  const writeLock = useRef(false);
  useEffect(() => {
    if (view === "list") return;
    const abort = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const filters = {
        q: query,
        kind,
        tag,
        includeCompleted,
        includeUntagged,
      };
      try {
        const result = await api<TagGraph>(
          demo ? "/v1/sample/tag-graph" : "/v1/tag-graph",
          session?.access_token || "",
          {
            method: "POST",
            body: JSON.stringify(
              demo ? { workspace: data, query: filters } : filters,
            ),
            signal: abort.signal,
          },
        );
        if (active) setGraph(result);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the graph.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [
    data,
    demo,
    session?.access_token,
    scope,
    query,
    kind,
    tag,
    includeCompleted,
    includeUntagged,
    retry,
    view,
  ]);
  const node = graph?.nodes.find((n) => n.id === selected);
  const adjacent = new Set<string>();
  if (node)
    for (const edge of graph!.links) {
      if (edge.source === node.id) adjacent.add(edge.target);
      if (edge.target === node.id) adjacent.add(edge.source);
    }
  const connected =
    graph?.nodes.filter((n) => n.kind !== "tag" && adjacent.has(n.id)) || [];
  const showForm = (from?: string) => {
    setFormError("");
    setForm({ from, name: from || "" });
  };
  function open(id: string) {
    const target = graph?.nodes.find((n) => n.id === id);
    if (target?.entityId && target.kind !== "tag")
      edit({ kind: target.kind, id: target.entityId });
    else setSelected(id);
  }
  async function saveTag() {
    if (!form || busy || writeLock.current) return;
    writeLock.current = true;
    setSaving(true);
    setFormError("");
    try {
      await execute(
        form.from
          ? { type: "tag.rename", from: form.from, to: form.name }
          : { type: "tag.create", name: form.name },
      );
      const normalized = form.name.trim().toLowerCase();
      setSelected("tag:" + encodeURIComponent(normalized));
      if (tag === form.from) setTag(normalized);
      if (!form.from) {
        setQuery("");
        setTag(view === "list" ? normalized : "");
      }
      setForm(null);
      notify(form.from ? "Tag updated." : "Tag created.");
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "Could not save the tag.",
      );
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }
  async function removeTag(target: { label: string }) {
    if (
      busy ||
      writeLock.current ||
      !(await confirm({
        title: `Remove #${target.label}?`,
        description:
          "This removes the tag from every task, project and note. The items are kept.",
        confirmLabel: "Remove tag",
      }))
    )
      return;
    writeLock.current = true;
    try {
      await execute({ type: "tag.rename", from: target.label, to: null });
      setSelected("");
      if (tag === target.label) setTag("");
      notify("Tag removed.");
    } catch {
      /* Workspace keeps the saved snapshot and reports the error. */
    } finally {
      writeLock.current = false;
    }
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <PageDate />
          <h1>
            Tags<span className="accent">.</span>
          </h1>
          <p className="page-description">
            Find the threads that connect your work.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => showForm()}
        >
          <Tag size={15} />
          New tag
        </button>
      </div>
      <div className="tag-graph-filters">
        <DiscreteTabs
          value={view}
          onChange={setView}
          label="Tags view"
          items={[
            { value: "graph", label: "Graph", icon: <Network size={14} /> },
            { value: "list", label: "List", icon: <List size={14} /> },
          ]}
        />
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Find tags or items"
            placeholder="Find tags or items…"
            value={query}
            maxLength={200}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <SelectField
          label="Item type"
          hideLabel
          value={kind}
          onChange={(v) => setKind(v as typeof kind)}
          options={[
            { value: "all", label: "All items" },
            { value: "task", label: "Tasks" },
            { value: "project", label: "Projects" },
            { value: "note", label: "Notes" },
          ]}
        />
        <SelectField
          label="Filter by tag"
          hideLabel
          value={tag}
          onChange={setTag}
          options={[
            { value: "", label: "All tags" },
            ...(view === "list" ? listOptions : graph?.availableTags || []).map(
              (t) => ({
                value: t.name,
                label: `#${t.name} · ${t.items}`,
              }),
            ),
            ...(tag &&
            !(view === "list" ? listOptions : graph?.availableTags || []).some(
              (t) => t.name === tag,
            )
              ? [{ value: tag, label: "#" + tag }]
              : []),
          ]}
        />
        <label className="tag-graph-check">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => setCompleted(e.target.checked)}
          />
          Completed
        </label>
        <label className="tag-graph-check">
          <input
            type="checkbox"
            checked={includeUntagged}
            onChange={(e) => setUntagged(e.target.checked)}
          />
          Untagged
        </label>
      </div>
      {error && view !== "list" ? (
        <div className="tag-graph-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setRetry((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}
      <section
        className="tag-graph-card"
        aria-label="Tags and connected items"
        aria-busy={view !== "list" && loading}
      >
        <header className="tag-graph-heading">
          <span>
            {view === "list" ? <List size={16} /> : <Network size={16} />}
            {view === "list" ? "Tags" : "Graph"}
          </span>
          {view !== "list" && (
            <div className="tag-graph-legend" aria-label="Graph legend">
              <span data-kind="tag">Tags</span>
              <span data-kind="task">Tasks</span>
              <span data-kind="project">Projects</span>
              <span data-kind="note">Notes</span>
            </div>
          )}
          {loading && view !== "list" && <Spinner size={14} />}
        </header>
        {view === "list" ? (
          <TagList
            filters={{ q: query, kind, tag, includeCompleted, includeUntagged }}
            onSelectTag={setTag}
            onOptions={setListOptions}
            onRename={showForm}
            onRemove={(name) => void removeTag({ label: name })}
            onOpen={(item) => {
              if (item.entityId && item.kind !== "tag")
                edit({ kind: item.kind, id: item.entityId });
            }}
          />
        ) : graph?.nodes.length ? (
          <div className={"tag-graph-body" + (node ? " has-selection" : "")}>
            <TagGraphCanvas
              graph={graph}
              selected={node?.id || ""}
              onSelect={setSelected}
              onOpen={open}
            />
            {node && (
              <aside
                className="tag-graph-detail"
                aria-label="Selected graph item"
              >
                <header>
                  <span>
                    {node.kind === "tag" ? "TAG" : node.kind.toUpperCase()}
                  </span>
                  <IconButton
                    label="Clear graph selection"
                    onClick={() => setSelected("")}
                  >
                    <X size={14} />
                  </IconButton>
                </header>
                <h2>
                  {node.kind === "tag" && <Hash size={18} />} {node.label}
                </h2>
                {node.stage && (
                  <p className="tag-graph-meta">
                    {
                      {
                        todo: "To do",
                        progress: "In progress",
                        hold: "On hold",
                        done: "Done",
                      }[node.stage]
                    }
                    {node.projectTitle ? " · " + node.projectTitle : ""}
                  </p>
                )}
                {node.kind === "tag" ? (
                  <div className="tag-graph-detail-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => showForm(node.label)}
                    >
                      <PencilLine size={13} />
                      Rename
                    </button>
                    <IconButton
                      label={"Remove tag #" + node.label}
                      disabled={busy}
                      onClick={() => void removeTag(node)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => open(node.id)}
                  >
                    Open {node.kind}
                    <ArrowUpRight size={14} />
                  </button>
                )}
                {!!node.tags.length && (
                  <div className="tag-graph-item-tags">
                    {node.tags.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() =>
                          setSelected("tag:" + encodeURIComponent(name))
                        }
                      >
                        #{name}
                      </button>
                    ))}
                  </div>
                )}
                {node.kind === "task" &&
                  graph.links.some(
                    (l) => l.source === node.id && l.inherited,
                  ) && (
                    <p className="tag-graph-meta">
                      Dashed tag links are inherited from the project.
                    </p>
                  )}
                <h3>
                  Connected items <span>{connected.length}</span>
                </h3>
                <div className="tag-graph-neighbors">
                  {connected.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelected(item.id)}
                    >
                      <i data-kind={item.kind} />
                      <span>
                        {item.label}
                        <small>
                          {item.kind}
                          {item.projectTitle ? " · " + item.projectTitle : ""}
                        </small>
                      </span>
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
                {!connected.length && (
                  <p className="tag-graph-meta">
                    {node.kind === "tag"
                      ? "No connected items in this view. Add this tag in a task, project or note editor."
                      : "No other items connected in this view."}
                  </p>
                )}
              </aside>
            )}
          </div>
        ) : loading ? (
          <div className="tag-graph-empty">
            <Spinner />
            <p>Loading connections…</p>
          </div>
        ) : (
          <div className="tag-graph-empty">
            <Tag size={28} />
            <h2>
              {query || tag
                ? "No matching connections"
                : "A place for your connections"}
            </h2>
            <p>
              {query || tag
                ? "Try another search or include untagged items."
                : "Create a tag or add tags to tasks, projects and notes to see them here."}
            </p>
            {(query || tag) && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  setTag("");
                }}
              >
                Clear search and tag filter
              </button>
            )}
          </div>
        )}
        {view !== "list" && (
          <footer className="tag-graph-footer">
            <span>
              {graph
                ? `${graph.shownItems} items · ${graph.nodes.filter((n) => n.kind === "tag").length} tags · ${graph.links.length} connections`
                : "Your tags and their connections"}
            </span>
            <span>
              {graph?.truncated
                ? `Showing a portion of ${graph.totalMatches} matching items. Narrow the search or filters.`
                : "Click a node to explore · Double-click an item to open"}
            </span>
          </footer>
        )}
      </section>
      {form && (
        <Dialog
          title={form.from ? "Rename tag" : "New tag"}
          onClose={() => {
            if (!saving) setForm(null);
          }}
          dirty={form.name !== (form.from || "")}
        >
          <form
            className="tag-name-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveTag();
            }}
          >
            <div className="tag-name-fields">
              <label>
                Tag name
                <input
                  autoFocus
                  value={form.name}
                  maxLength={40}
                  required
                  disabled={saving}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. design"
                />
              </label>
              <p>
                {form.from
                  ? "If this name already exists, their connections will be combined."
                  : "Add this tag to a task, project or note to connect it."}
              </p>
              {formError && <p role="alert">{formError}</p>}
            </div>
            <footer className="tag-name-footer">
              <button
                type="submit"
                className="primary-button"
                disabled={busy || saving || !form.name.trim()}
              >
                {saving ? <Spinner size={14} /> : <Tag size={14} />}{" "}
                {form.from ? "Save tag" : "Create tag"}
              </button>
            </footer>
          </form>
        </Dialog>
      )}
    </>
  );
}
