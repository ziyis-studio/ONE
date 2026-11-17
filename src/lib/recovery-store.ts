import type { RecoveryEntry } from "../domain/recovery";
import { recoveryPatchSchema } from "../domain/recovery";
export const trashKey = (scope: string) => "one-trash-v1:" + scope;
export function readTrash(scope: string): RecoveryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(trashKey(scope)) || "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (e) =>
            e &&
            typeof e.id === "string" &&
            typeof e.title === "string" &&
            typeof e.deletedAt === "string" &&
            recoveryPatchSchema.safeParse(e.patch).success,
        )
      : [];
  } catch {
    return [];
  }
}
export function writeTrash(scope: string, entries: RecoveryEntry[]) {
  localStorage.setItem(trashKey(scope), JSON.stringify(entries));
}
