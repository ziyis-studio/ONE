import type { Workspace } from "../domain/model";
import type { Command } from "../domain/commands";
import { API_PROXY } from "./config";

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
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const [route, query] = path.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("path", route);
  const response = await fetch(`${API_PROXY}?${params}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
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
