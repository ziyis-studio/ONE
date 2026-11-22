/** Read legacy comma-separated drafts and newer lossless tag-array drafts. */
export function readTagDraft(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string"))
      return parsed;
  } catch {
    /* Older editor drafts contain plain text. */
  }
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
