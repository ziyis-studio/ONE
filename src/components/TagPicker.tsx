import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { Check, Hash, Plus, Search, X } from "lucide-react";
import { useOne } from "../lib/workspace";
import { api } from "../lib/api";
import type { TagOptions } from "../domain/tag-graph";
import { PopoverExit } from "../lib/popup-exit";
import { Spinner } from "./ui";
import "./tag-picker.css";
export default function TagPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const { data, demo, session, scope, busy, execute } = useOne();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [options, setOptions] = useState<TagOptions | null>(null),
    [loading, setLoading] = useState(false),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [owner, setOwner] = useState<string>();
  const root = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null),
    list = useRef<HTMLDivElement>(null),
    createButton = useRef<HTMLButtonElement>(null),
    lock = useRef(false),
    alive = useRef(true),
    label = useId(),
    listId = useId();
  const selectedKey = JSON.stringify(value),
    blocked = disabled || busy || creating;
  useLayoutEffect(
    () =>
      setOwner(
        root.current
          ?.closest("[data-one-dialog]")
          ?.getAttribute("data-one-dialog") || undefined,
      ),
    [],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      const filters = { q: query, selected: JSON.parse(selectedKey) };
      try {
        const result = await api<TagOptions>(
          demo ? "/v1/sample/tag-options" : "/v1/tag-options",
          session?.access_token || "",
          {
            method: "POST",
            body: JSON.stringify(
              demo ? { workspace: data, query: filters } : filters,
            ),
            signal: abort.signal,
          },
        );
        if (active) setOptions(result);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Could not load tags.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
      abort.abort();
    };
  }, [
    open,
    query,
    selectedKey,
    data,
    demo,
    session?.access_token,
    scope,
    retry,
  ]);
  const selected = new Set(options?.selected || value);
  function toggle(name: string) {
    if (blocked || loading || !options) return;
    const next = selected.has(name)
      ? options.selected.filter((t) => t !== name)
      : [...options.selected, name];
    if (next.length > 30) {
      setError("Use up to 30 tags per item.");
      return;
    }
    onChange(next);
    search.current?.focus();
  }
  async function create() {
    const candidate = options?.create;
    if (!candidate?.allowed || loading || blocked || lock.current || !options)
      return;
    lock.current = true;
    setCreating(true);
    setError("");
    try {
      await execute({ type: "tag.create", name: candidate.name });
      if (alive.current) {
        onChange([...options.selected, candidate.name]);
        setQuery("");
        search.current?.focus();
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : "Could not create this tag.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setCreating(false);
    }
  }
  return (
    <div ref={root} className="tag-picker-field">
      <span id={label} className="tag-picker-label">
        Tags
      </span>
      <div className="tag-picker-control" aria-labelledby={label} role="group">
        {value.map((name) => (
          <span className="tag-picker-chip" key={name}>
            <Hash size={10} aria-hidden="true" />
            <span>{name}</span>
            <button
              type="button"
              aria-label={"Remove tag " + name}
              disabled={blocked}
              onClick={() => onChange(value.filter((t) => t !== name))}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <DialogTrigger
          isOpen={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setQuery("");
          }}
        >
          <Button
            className="tag-picker-trigger"
            aria-label="Choose tags"
            isDisabled={blocked}
          >
            <Plus size={13} />
            {value.length ? "Add" : "Choose tags"}
          </Button>
          <Popover
            className="tag-picker-popover"
            placement="bottom start"
            offset={7}
            data-one-dialog-owner={owner}
          >
            <PopoverExit kind="select" />
            <Dialog className="tag-picker-dialog" aria-label="Choose tags">
              {({ close }) => (
                <>
                  <label className="tag-picker-search">
                    <Search size={14} />
                    <input
                      ref={search}
                      autoFocus
                      aria-label="Search tags"
                      placeholder="Search or create a tag…"
                      value={query}
                      maxLength={200}
                      disabled={creating}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          (
                            list.current?.querySelector<HTMLElement>(
                              '[role="option"]:not([aria-disabled="true"])',
                            ) || createButton.current
                          )?.focus();
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!loading) {
                            const exact = options?.items.find(
                              (t) => t.name === query.trim().toLowerCase(),
                            );
                            if (exact) toggle(exact.name);
                            else if (options?.items[0])
                              toggle(options.items[0].name);
                            else void create();
                          }
                        }
                      }}
                    />
                  </label>
                  {loading ? (
                    <div className="tag-picker-loading">
                      <Spinner size={15} />
                      Loading tags…
                    </div>
                  ) : error ? (
                    <div className="tag-picker-error" role="alert">
                      {error}
                      <button
                        type="button"
                        onClick={() => setRetry((n) => n + 1)}
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <>
                      <ListBox
                        ref={list}
                        id={listId}
                        aria-label="Tag choices"
                        className="tag-picker-options"
                        selectionMode="multiple"
                        selectionBehavior="toggle"
                        selectedKeys={selected}
                        items={options?.items || []}
                        disabledKeys={
                          blocked
                            ? (options?.items || []).map((t) => t.name)
                            : selected.size >= 30
                              ? (options?.items || [])
                                  .filter((t) => !selected.has(t.name))
                                  .map((t) => t.name)
                              : []
                        }
                        onSelectionChange={(keys) => {
                          if (keys !== "all" && !blocked) {
                            const next = [...keys].map(String);
                            if (next.length <= 30) onChange(next);
                            else setError("Use up to 30 tags per item.");
                          }
                        }}
                        renderEmptyState={() => (
                          <p className="tag-picker-empty">
                            {query
                              ? "No existing tags match."
                              : "No tags yet. Type to create one."}
                          </p>
                        )}
                      >
                        {(item) => (
                          <ListBoxItem
                            id={item.name}
                            textValue={item.name}
                            aria-label={item.name}
                            className="tag-picker-option"
                          >
                            <span className="tag-picker-option-name">
                              <Hash size={11} />
                              {item.name}
                            </span>
                            <small>
                              {item.items} {item.items === 1 ? "item" : "items"}
                            </small>
                            <Check
                              size={13}
                              className={
                                selected.has(item.name) ? "" : "unselected"
                              }
                            />
                          </ListBoxItem>
                        )}
                      </ListBox>
                      {options?.create && (
                        <div className="tag-picker-create">
                          <button
                            ref={createButton}
                            type="button"
                            disabled={blocked || !options.create.allowed}
                            aria-label={`Create tag "${options.create.name}"`}
                            onClick={() => void create()}
                          >
                            {creating ? (
                              <Spinner size={13} />
                            ) : (
                              <Plus size={13} />
                            )}
                            Create <span>#{options.create.name}</span>
                          </button>
                          {options.create.reason && (
                            <p>{options.create.reason}</p>
                          )}
                        </div>
                      )}
                      {options && options.total > options.items.length && (
                        <p className="tag-picker-hint">
                          Showing 50 of {options.total} tags. Keep typing to
                          narrow the list.
                        </p>
                      )}
                    </>
                  )}
                  <footer>
                    <small>{value.length} selected</small>
                    <Button className="text-button" onPress={close}>
                      Done
                    </Button>
                  </footer>
                </>
              )}
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>
    </div>
  );
}
