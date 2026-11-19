import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { Paperclip, Eye, PencilLine, Download } from "lucide-react";
import { uploadAttachment, downloadAttachment } from "../lib/api";
import { imageAlt } from "../lib/image-store";
import { useOne } from "../lib/workspace";
function PrivateImage({ src, alt }: { src: string; alt?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true,
      objectUrl = "";
    setUrl("");
    void downloadAttachment(src)
      .then((blob) => {
        if (alive) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url ? (
    <img src={url} alt={alt || "Attached image"} />
  ) : (
    <span role="img" aria-label={alt || "Attached image"}>
      Image unavailable
    </span>
  );
}
export function MarkdownContent({ children }: { children: string }) {
  const { notify } = useOne();
  return (
    <ReactMarkdown
      urlTransform={(url) =>
        /^planner-(image|file):\/\//.test(url) ? url : defaultUrlTransform(url)
      }
      components={{
        img: ({ src, alt }) =>
          src?.startsWith("planner-image://") ? (
            <PrivateImage src={src} alt={alt} />
          ) : (
            <img src={src} alt={alt} loading="lazy" />
          ),
        a: ({ href, children }) =>
          href?.startsWith("planner-file://") ||
          href?.startsWith("planner-image://") ? (
            <button
              type="button"
              className="attachment-link"
              onClick={() =>
                void downloadAttachment(href)
                  .then((blob) => {
                    const url = URL.createObjectURL(blob),
                      a = document.createElement("a");
                    a.href = url;
                    a.download =
                      typeof children === "string" ? children : "attachment";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  })
                  .catch((e) => notify(e.message, true))
              }
            >
              <Download size={14} />
              {children}
            </button>
          ) : (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
export default function MarkdownNotes({
  value,
  onChange,
  disabled,
  onBusyChange,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  onBusyChange: (v: boolean) => void;
}) {
  const { demo, notify } = useOne(),
    input = useRef<HTMLInputElement>(null),
    latest = useRef(value),
    area = useRef<HTMLTextAreaElement>(null);
  latest.current = value;
  const [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false);
  return (
    <section className="markdown-notes">
      <header>
        <strong>Notes</strong>
        <div>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => setPreview(!preview)}
          >
            {preview ? <PencilLine size={14} /> : <Eye size={14} />}{" "}
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => input.current?.click()}
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
        accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.csv,.zip,.docx,.xlsx,.pptx"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (demo) {
            notify("Sign in to attach private files.", true);
            return;
          }
          setUploading(true);
          onBusyChange(true);
          try {
            const fallback: Record<string, string> = {
              md: "text/markdown",
              txt: "text/plain",
              csv: "text/csv",
              zip: "application/zip",
            };
            const blob = file.type
              ? file
              : new Blob([file], {
                  type:
                    fallback[file.name.split(".").pop() || ""] ||
                    "application/octet-stream",
                });
            const ref = await uploadAttachment(blob);
            const name =
              imageAlt(file.name) +
              (file.type.startsWith("image/")
                ? ""
                : "." + file.name.split(".").pop());
            onChange(
              latest.current +
                "\n\n" +
                (ref.startsWith("planner-image://") ? "!" : "") +
                "[" +
                name.replace(/[()[\]\\]/g, "_") +
                "](" +
                ref +
                ")",
            );
          } catch (err) {
            notify(
              err instanceof Error ? err.message : "Could not attach file.",
              true,
            );
          } finally {
            setUploading(false);
            onBusyChange(false);
          }
        }}
      />
      {preview ? (
        <div className="markdown-preview">
          <MarkdownContent>{value || "*No notes yet.*"}</MarkdownContent>
        </div>
      ) : (
        <textarea
          ref={area}
          aria-label="Description"
          rows={5}
          maxLength={10000}
          disabled={disabled || uploading}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write notes with Markdown. Drop in context, lists, links, or attachments…"
        />
      )}
      <small>
        Markdown supported · private images up to 5 MB, files up to 3 MB
      </small>
    </section>
  );
}
