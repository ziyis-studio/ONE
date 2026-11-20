import { api } from "./api";
import type { Workspace } from "../domain/model";
export const DEMO_KEY = "one-demo-v1";
export async function readDemo(zone: string): Promise<Workspace> {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
    if (saved?.schemaVersion === 1 && saved.tasks && saved.noteDatabases)
      return { ...saved, meals: saved.meals || [] };
  } catch {
    /* A new explicit sample can be requested. */
  }
  return api<Workspace>("/v1/sample?zone=" + encodeURIComponent(zone), "");
}
