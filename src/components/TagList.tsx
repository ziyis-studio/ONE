import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Hash,
  PencilLine,
  Trash2,
} from "lucide-react";
import type {
  TagGraphNode,
  TagGraphQuery,
  TagListPage,
  TagOption,
} from "../domain/tag-graph";
import { api } from "../lib/api";
import { useOne } from "../lib/workspace";
import { IconButton, Spinner } from "./ui";
export default function TagList({
  filters,
  onSelectTag,
  onOpen,
  onRename,
  onRemove,
  onOptions,
}: {
  filters: TagGraphQuery;
  onSelectTag: (name: string) => void;
  onOpen: (item: TagGraphNode) => void;
  onRename: (name: string) => void;
  onRemove: (name: string) => void;
  onOptions: (options: TagOption[]) => void;
}) {
  const { data, demo, session, scope, busy } = useOne();
  const [untagged, setUntagged] = useState(false),
    [paging, setPaging] = useState({ key: "", offset: 0 }),
    [page, setPage] = useState<TagListPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const onlyUntagged = untagged && filters.includeUntagged && !filters.tag,
    key = JSON.stringify({ ...filters, onlyUntagged }),
    offset = paging.key === key ? paging.offset : 0;
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const query = { ...JSON.parse(key), offset, limit: 30 },
          result = await api<TagListPage>(
            demo ? "/v1/sample/tag-list" : "/v1/tag-list",
            session?.access_token || "",
            {
              method: "POST",
              body: JSON.stringify(demo ? { workspace: data, query } : query),
              signal: abort.signal,
            },
          );
        if (active) {
          if (result.total > 0 && offset >= result.total) {
            setPaging({
              key,
              offset: Math.floor((result.total - 1) / 30) * 30,
            });
            return;
          }
          setPage(result);
          onOptions(result.availableTags);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Could not load tags.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [key, offset, data, demo, session?.access_token, scope, retry, onOptions]);
  const itemsMode = !!filters.tag || onlyUntagged;
  return (
    <div className="tag-list" aria-label="Tags list" aria-busy={loading}>
      {itemsMode && (
        <div className="tag-list-selection">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setUntagged(false);
              onSelectTag("");
            }}
          >
            <ArrowLeft size={13} />
            All tags
          </button>
          <h2>
            {onlyUntagged ? "Untagged" : "#" + filters.tag}
            <small>{page?.mode === "items" ? page.total : 0} items</small>
          </h2>
        </div>
      )}
      {error ? (
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
      ) : !page && loading ? (
        <div className="tag-list-loading">
          <Spinner size={20} />
          Loading tags…
        </div>
      ) : (
        <>
          <div className="tag-list-table-wrap">
            <table
              className={"tag-list-table" + (loading ? " is-loading" : "")}
            >
              <thead>
                {itemsMode ? (
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th className="tag-list-tags-col">Tags</th>
                    <th>
                      <span className="one-visually-hidden">Open</span>
                    </th>
                  </tr>
                ) : (
                  <tr>
                    <th>Tag</th>
                    <th>Items</th>
                    <th className="tag-list-breakdown">Tasks</th>
                    <th className="tag-list-breakdown">Projects</th>
                    <th className="tag-list-breakdown">Notes</th>
                    <th>
                      <span className="one-visually-hidden">Actions</span>
                    </th>
                  </tr>
                )}
              </thead>
              <tbody>
                {itemsMode
                  ? (page?.mode === "items" ? page.items : []).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <button
                            type="button"
                            className="tag-list-item-name"
                            onClick={() => onOpen(item)}
                          >
                            {item.label}
                          </button>
                          {item.projectTitle && (
                            <small className="tag-list-subtitle">
                              {item.projectTitle}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="tag-list-kind" data-kind={item.kind}>
                            {item.kind}
                          </span>
                        </td>
                        <td className="tag-list-tags-col">
                          <span title={item.tags.join(", ")}>
                            {item.tags.map((t) => "#" + t).join(" · ") || "—"}
                          </span>
                        </td>
                        <td>
                          <IconButton
                            label={"Open " + item.kind + " " + item.label}
                            onClick={() => onOpen(item)}
                          >
                            <ArrowUpRight size={14} />
                          </IconButton>
                        </td>
                      </tr>
                    ))
                  : (page?.mode === "tags" ? page.rows : []).map((row) => (
                      <tr key={row.name === null ? "untagged-row" : "tag:" + row.name}>
                        <td>
                          <button
                            type="button"
                            className="tag-list-name"
                            onClick={() => {
                              if (row.name === null) setUntagged(true);
                              else {
                                setUntagged(false);
                                onSelectTag(row.name);
                              }
                            }}
                          >
                            <Hash size={14} />
                            {row.name ?? "Untagged"}
                          </button>
                          <small className="tag-list-mobile-counts">
                            {row.tasks} tasks · {row.projects} projects ·{" "}
                            {row.notes} notes
                          </small>
                        </td>
                        <td>{row.count}</td>
                        <td className="tag-list-breakdown">{row.tasks}</td>
                        <td className="tag-list-breakdown">{row.projects}</td>
                        <td className="tag-list-breakdown">{row.notes}</td>
                        <td>
                          <div className="tag-list-actions">
                            {row.name !== null && (
                              <>
                                <IconButton
                                  label={"Rename tag #" + row.name}
                                  disabled={busy}
                                  onClick={() => onRename(row.name!)}
                                >
                                  <PencilLine size={13} />
                                </IconButton>
                                <IconButton
                                  label={"Remove tag #" + row.name}
                                  disabled={busy}
                                  onClick={() => onRemove(row.name!)}
                                >
                                  <Trash2 size={13} />
                                </IconButton>
                              </>
                            )}
                            <IconButton
                              label={
                                row.name === null
                                  ? "View untagged items"
                                  : "View items tagged #" + row.name
                              }
                              onClick={() => {
                                if (row.name === null) setUntagged(true);
                                else {
                                  setUntagged(false);
                                  onSelectTag(row.name);
                                }
                              }}
                            >
                              <ArrowUpRight size={14} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!loading && page?.total === 0 && (
            <div className="tag-list-empty">
              {itemsMode
                ? "No connected items match these filters."
                : "No tags match these filters."}
            </div>
          )}
          <footer className="tag-list-footer">
            <span>
              {loading ? <Spinner size={13} /> : null}
              {page?.total
                ? `${offset + 1}–${Math.min(offset + 30, page.total)} of ${page.total} ${itemsMode ? "items" : "tags"}`
                : `0 ${itemsMode ? "items" : "tags"}`}
            </span>
            <div>
              <IconButton
                label="Previous tags page"
                disabled={loading || offset === 0}
                onClick={() =>
                  setPaging({ key, offset: Math.max(0, offset - 30) })
                }
              >
                <ChevronLeft size={15} />
              </IconButton>
              <IconButton
                label="Next tags page"
                disabled={loading || !page || offset + 30 >= page.total}
                onClick={() => setPaging({ key, offset: offset + 30 })}
              >
                <ChevronRight size={15} />
              </IconButton>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
