import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, X } from "lucide-react";
import type { MealPhoto } from "../domain/meals";
import { downloadAttachment, uploadAttachment } from "../lib/api";
import { prepareMealPhoto } from "../lib/meals";
import { imageAlt } from "../lib/image-store";
import { useOne } from "../lib/workspace";
export function MealPhotoImage({ photo }: { photo: MealPhoto }) {
  const [image, setImage] = useState({ url: "", error: false });
  useEffect(() => {
    let alive = true,
      url = "";
    setImage({ url: "", error: false });
    void downloadAttachment(photo.ref)
      .then((blob) => {
        if (alive) {
          url = URL.createObjectURL(blob);
          setImage({ url, error: false });
        }
      })
      .catch(() => {
        if (alive) setImage({ url: "", error: true });
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.ref]);
  return image.url ? (
    <img src={image.url} alt={photo.alt || "Meal photo"} loading="lazy" />
  ) : (
    <span
      className="meal-photo-placeholder"
      role="img"
      aria-label={
        (photo.alt || "Meal photo") +
        (image.error ? " · unavailable" : " · loading")
      }
    >
      <ImageIcon size={20} />
      <small>{image.error ? "Photo unavailable" : "Loading photo…"}</small>
    </span>
  );
}
export default function MealPhotos({
  photos,
  onChange,
  disabled,
  onBusyChange,
}: {
  photos: MealPhoto[];
  onChange: (photos: MealPhoto[]) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { demo } = useOne();
  const input = useRef<HTMLInputElement>(null),
    latest = useRef(photos),
    alive = useRef(true),
    lock = useRef(false);
  latest.current = photos;
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function upload(files: File[]) {
    if (lock.current || disabled || !files.length) return;
    setError("");
    if (demo) {
      setError(
        "Sign in to upload private meal photos. You can still try text and nutrition records here.",
      );
      return;
    }
    if (files.length + latest.current.length > 6) {
      setError("Add up to 6 photos per meal.");
      return;
    }
    lock.current = true;
    setUploading(true);
    onBusyChange(true);
    try {
      const attached = [...latest.current];
      for (const file of files) {
        const blob = await prepareMealPhoto(file);
        const ref = await uploadAttachment(blob);
        if (!alive.current) return;
        attached.push({ ref, alt: imageAlt(file.name) });
        onChange([...attached]);
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not upload this photo. Try again.",
        );
    } finally {
      lock.current = false;
      if (alive.current) {
        setUploading(false);
        onBusyChange(false);
      }
    }
  }
  return (
    <section
      className="meal-photos-editor"
      aria-label="Meal photos"
      aria-busy={uploading}
    >
      <header>
        <div>
          <strong>Photos</strong>
          <small>Up to 6 · private to your account</small>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={disabled || uploading || photos.length >= 6}
          onClick={() => input.current?.click()}
        >
          <Camera size={15} />
          {uploading ? "Uploading…" : "Add photos"}
        </button>
      </header>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload meal photos"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          void upload(files);
        }}
      />
      {!!photos.length && (
        <div className="meal-photo-grid">
          {photos.map((photo, i) => (
            <figure key={photo.ref}>
              <MealPhotoImage photo={photo} />
              <button
                type="button"
                className="meal-photo-remove"
                aria-label={`Remove photo ${i + 1}`}
                disabled={disabled || uploading}
                onClick={() =>
                  onChange(photos.filter((p) => p.ref !== photo.ref))
                }
              >
                <X size={14} />
              </button>
            </figure>
          ))}
        </div>
      )}
      {!photos.length && (
        <p className="fine">
          A photo, a few words, or both. Camera photos are resized for a quicker
          upload.
        </p>
      )}
      {error && (
        <p className="meal-photo-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
