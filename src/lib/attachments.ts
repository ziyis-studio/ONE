import { imageReferences, imageKey, validateStoredImage } from "./image-store";
export const fileKey = (ref: string) =>
  /^planner-file:\/\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|txt|md|csv|zip|docx|xlsx|pptx)$/.test(
    ref,
  )
    ? ref.slice(15)
    : null;
export const attachmentKey = (ref: string) => imageKey(ref) || fileKey(ref);
export const attachmentReferences = (text: string) => [
  ...new Set([
    ...imageReferences(text),
    ...(text.match(/planner-file:\/\/[a-z0-9.-]+/g) || []).filter(
      (ref) => !!fileKey(ref),
    ),
  ]),
];
// Early feedback only; the backend repeats file validation before every upload/restore.
export async function validateStoredAttachment(ref: string, blob: Blob) {
  if (imageKey(ref)) return validateStoredImage(ref, blob);
  if (!fileKey(ref) || !blob.size || blob.size > 3 * 1024 * 1024)
    throw new Error("Invalid attachment.");
}
