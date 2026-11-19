import type { Workspace } from "../domain/model";
import type { Command } from "../domain/commands";
import { apiUrl } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    cache: "no-store",
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000),
  });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error?.code || "request_failed",
      body.error?.message || "The request could not be completed.",
    );
  return body.data as T;
}
export const loadWorkspace = (token: string) =>
  api<Workspace>("/v1/workspace", token);
export const sendCommand = (token: string, command: Command) =>
  api<{ snapshot: Workspace; id?: string; recoveryId?: string }>(
    "/v1/commands",
    token,
    {
      method: "POST",
      body: JSON.stringify(command),
    },
  );

export async function accessToken() {
  const { supabase } = await import("./auth");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  return data.session.access_token;
}
export async function downloadAttachment(ref: string): Promise<Blob> {
  const path = ref.startsWith("planner-file://")
    ? "/v1/files/" + ref.slice(15)
    : "/v1/images/" + ref.slice(16);
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Attachment could not be downloaded.");
  return response.blob();
}
export async function uploadAttachment(
  file: Blob,
  ref?: string,
): Promise<string> {
  const image = file.type.startsWith("image/");
  const path =
    (image ? "/v1/images" : "/v1/files") +
    (ref ? "/" + ref.split("://")[1] : "");
  const result = await api<{ ref: string }>(path, await accessToken(), {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  return ref || result.ref;
}
