import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlignLeft,
  CheckSquare2,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  PencilLine,
  Quote,
  Table2,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { uploadAttachment } from "../lib/api";
import { useOne } from "../lib/workspace";
import { MarkdownContent } from "./MarkdownContent";
import {
  matchingCommands,
  slashRange,
  insertMarkdown,
} from "../lib/markdown-commands";
import type { MarkdownCommand, MarkdownRange } from "../lib/markdown-commands";
import { useDocumentTextareaSize } from "../lib/use-document-textarea-size";
import "./markdown-editor.css";

const icons: Record<string, LucideIcon> = {
  text: AlignLeft,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  bullet: List,
  number: ListOrdered,
  todo: CheckSquare2,
  quote: Quote,
  code: Code2,
  divider: Minus,
  table: Table2,
  image: Image,
  file: Paperclip,
};
const fileTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const accept =
  "image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.csv,.zip,.docx,.xlsx,.pptx";

/** A short-lived mirror locates the native textarea caret without replacing its editing behavior. */
function menuPosition(area: HTMLTextAreaElement, cursor: number) {
  const mirror = document.createElement("div"),
    style = getComputedStyle(area);
  for (const key of [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "padding",
    "border",
    "boxSizing",
    "tabSize",
  ] as const)
    mirror.style[key] = style[key];
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    width: `${area.clientWidth}px`,
    top: "0",
    left: "0",
  });
  mirror.textContent = area.value.slice(0, cursor);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.append(marker);
  document.body.append(mirror);
  const box = area.getBoundingClientRect(),
    lineHeight = parseFloat(style.lineHeight) || 24;
  const caret = box.top + marker.offsetTop - area.scrollTop;
  const left = Math.max(
    12,
    Math.min(box.left + marker.offsetLeft, innerWidth - 312),
  );
  const height = Math.min(330, innerHeight - 32);
  const top = Math.max(
    12,
    Math.min(caret + lineHeight + 6, innerHeight - height - 12),
  );
  mirror.remove();
  return { left, top, maxHeight: height };
}
export default function MarkdownComposer({
  value,
  onChange,
  disabled,
  onBusyChange,
  document = false,
  label = "Notes",
  ariaLabel = "Description",
  maxLength = 10000,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  document?: boolean;
  label?: string;
  ariaLabel?: string;
  maxLength?: number;
}) {
  const { demo, notify } = useOne();
  const area = useRef<HTMLTextAreaElement>(null),
    input = useRef<HTMLInputElement>(null),
    menuRef = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null),
    latest = useRef(value),
    selected = useRef<MarkdownRange | null>(null),
    nextCursor = useRef<number | null>(null),
    pending = useRef<MarkdownRange | null>(null),
    uploadingRef = useRef(false);
  latest.current = value;
  const [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false),
    [menu, setMenu] = useState<MarkdownRange | null>(null),
    [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 12,
    top: 12,
    maxHeight: 330,
  });
  const menuId = useId(),
    helpId = useId(),
    commands = matchingCommands(menu?.query || "");
  const menuOwner =
    area.current
      ?.closest("[data-one-dialog]")
      ?.getAttribute("data-one-dialog") || undefined;
  useDocumentTextareaSize(area, value, document && !preview);
  useLayoutEffect(() => {
    if (area.current && nextCursor.current !== null && !preview && !uploading) {
      const cursor = nextCursor.current;
      area.current.focus({ preventScroll: true });
      area.current.setSelectionRange(cursor, cursor);
      selected.current = { start: cursor, end: cursor, query: "" };
      nextCursor.current = null;
    }
  }, [value, preview, uploading, menu]);
  useLayoutEffect(() => {
    if (!menu || !area.current) return;
    const positionMenu = () =>
      area.current && setPosition(menuPosition(area.current, menu.start));
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      )
        setMenu(null);
    };
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      window.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  useEffect(() => {
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  function selection() {
    const node = area.current;
    if (node)
      selected.current = {
        start: node.selectionStart,
        end: node.selectionEnd,
        query: "",
      };
  }
  function showSlash(next: string, start: number, end = start) {
    setMenu(slashRange(next, start, end));
    setActive(0);
  }
  function place(next: string, cursor: number) {
    if (next.length > maxLength) {
      notify(
        `Keep this text under ${maxLength.toLocaleString()} characters.`,
        true,
      );
      return;
    }
    nextCursor.current = cursor;
    onChange(next);
    setMenu(null);
    setPreview(false);
  }
  function chooseFile(range: MarkdownRange | null, imageOnly = false) {
    pending.current = range;
    setMenu(null);
    if (input.current) {
      input.current.accept = imageOnly
        ? "image/png,image/jpeg,image/webp,image/gif"
        : accept;
      input.current.click();
    }
  }
  async function attach(file: File, range: MarkdownRange | null) {
    if (disabled || uploadingRef.current) return;
    if (demo) {
      notify("Sign in to attach private files.", true);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "",
      type = fileTypes[ext];
    if (!type) {
      notify("Choose an image, PDF, text, Office document or ZIP file.", true);
      return;
    }
    const image = type.startsWith("image/");
    if (!file.size || file.size > (image ? 5 : 3) * 1024 * 1024) {
      notify(
        image ? "Choose an image up to 5 MB." : "Choose a file up to 3 MB.",
        true,
      );
      return;
    }
    uploadingRef.current = true;
    setUploading(true);
    onBusyChange(true);
    try {
      const ref = await uploadAttachment(
        file.type === type ? file : new Blob([file], { type }),
      );
      const name =
        file.name.replace(/[()[\]\\\r\n\x00-\x1f]/g, "_").slice(0, 180) ||
        "Attachment";
      const markdown = `${ref.startsWith("planner-image://") ? "!" : ""}[${name}](${ref})`;
      const source = latest.current;
      const target = range || { start: source.length, end: source.length };
      const before = source.slice(0, target.start),
        after = source.slice(target.end);
      const insert = `${before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""}${markdown}${after && !after.startsWith("\n") ? "\n\n" : ""}`;
      const result = insertMarkdown(source, target, insert);
      place(result.value, result.cursor);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not attach file.",
        true,
      );
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      onBusyChange(false);
    }
  }
  function apply(command: MarkdownCommand) {
    if (!menu) return;
    if ("attachment" in command) {
      chooseFile(menu, command.attachment === "image");
      return;
    }
    const result = insertMarkdown(
      latest.current,
      menu,
      command.insert,
      "cursor" in command ? command.cursor : command.insert.length,
    );
    place(result.value, result.cursor);
  }
  return (
    <section
      ref={root}
      className={`markdown-notes markdown-composer${document ? " is-document" : ""}`}
    >
      <header>
        <strong>{label}</strong>
        <div>
          <button
            type="button"
            disabled={disabled || uploading}
            aria-label="Insert Markdown block"
            onClick={() => {
              setPreview(false);
              const end = selected.current?.start ?? value.length;
              const start = value.lastIndexOf("\n", end - 1) + 1;
              setMenu({ start, end: start, query: "" });
              setActive(0);
              requestAnimationFrame(() => area.current?.focus());
            }}
          >
            <Type size={14} />
            <span>Format</span>
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => {
              setPreview(!preview);
              setMenu(null);
            }}
          >
            {preview ? <PencilLine size={14} /> : <Eye size={14} />}
            {preview ? "Write" : "Preview"}
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => chooseFile(selected.current)}
          >
            <Paperclip size={14} />
            {uploading ? "Uploading…" : "Attach"}
          </button>
        </div>
      </header>
      <input
        ref={input}
        type="file"
        hidden
        aria-label="Attach file or image"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void attach(file, pending.current);
          pending.current = null;
        }}
      />
      {preview ? (
        <div className="markdown-preview">
          <MarkdownContent>
            {value || "*A fresh page. What would you like to keep?*"}
          </MarkdownContent>
        </div>
      ) : (
        <div
          className="markdown-source"
          data-uploading={uploading || undefined}
          onDragOver={(event) => {
            if ([...event.dataTransfer.types].includes("Files")) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={(event) => {
            const file = event.dataTransfer.files[0];
            if (file) {
              event.preventDefault();
              void attach(file, selected.current);
            }
          }}
        >
          <textarea
            ref={area}
            className={`markdown-input${document ? " note-writing" : ""}`}
            aria-label={ariaLabel}
            aria-describedby={helpId}
            aria-haspopup="listbox"
            aria-controls={menu ? menuId : undefined}
            aria-activedescendant={
              menu && commands[active]
                ? `${menuId}-${commands[active].id}`
                : undefined
            }
            value={value}
            rows={document ? 12 : 5}
            maxLength={maxLength}
            disabled={disabled || uploading}
            placeholder="Write a thought, or type / for headings, lists, images and files…"
            onChange={(event) => {
              onChange(event.target.value);
              selection();
              showSlash(
                event.target.value,
                event.target.selectionStart,
                event.target.selectionEnd,
              );
            }}
            onSelect={() => {
              selection();
            }}
            onClick={(event) =>
              showSlash(
                value,
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              )
            }
            onPaste={(event) => {
              const file = event.clipboardData.files[0];
              if (file) {
                event.preventDefault();
                selection();
                void attach(file, selected.current);
              }
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (
                menu &&
                ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(
                  event.key,
                )
              ) {
                event.preventDefault();
                event.stopPropagation();
                if (event.key === "Escape") setMenu(null);
                else if (event.key === "ArrowDown" || event.key === "ArrowUp")
                  setActive((index) =>
                    commands.length
                      ? (index +
                          (event.key === "ArrowDown"
                            ? 1
                            : commands.length - 1)) %
                        commands.length
                      : 0,
                  );
                else if (commands[active]) apply(commands[active]);
              } else if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "Enter"
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              } else if (
                event.key.startsWith("Arrow") ||
                event.key === "Home" ||
                event.key === "End"
              )
                setMenu(null);
            }}
          />
        </div>
      )}
      <small id={helpId}>
        {document ? "Type / for blocks · " : "Markdown · type / for blocks · "}
        images up to 5 MB · files up to 3 MB
      </small>
      {menu &&
        !preview &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="markdown-command-menu"
            style={position}
            role="listbox"
            aria-label="Formatting commands"
            data-one-dialog-owner={menuOwner}
          >
            <div className="markdown-command-heading">
              Insert a block{menu.query && <span>/{menu.query}</span>}
            </div>
            {commands.map((command, index) => {
              const Icon = icons[command.id];
              return (
                <button
                  key={command.id}
                  id={`${menuId}-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => apply(command)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <strong>{command.label}</strong>
                    <small>{command.hint}</small>
                  </span>
                </button>
              );
            })}
            {!commands.length && (
              <p>No matching commands. Try “heading”, “image” or “file”.</p>
            )}
            <footer>↑↓ to move · Enter to insert · Esc to close</footer>
          </div>,
          window.document.body,
        )}
    </section>
  );
}
