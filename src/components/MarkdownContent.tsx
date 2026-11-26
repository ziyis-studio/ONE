import { useEffect, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download } from "lucide-react";
import { downloadAttachment } from "../lib/api";
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
      remarkPlugins={[remarkGfm]}
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
