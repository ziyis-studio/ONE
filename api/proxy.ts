import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
/** Same-origin transport only. Planner API remains the authority for auth, RLS,
 * validation, revisions and all business mutations. No elevated credentials. */
const defaultApi = "https://planner-api-ziyis-studio.vercel.app";
const supabaseUrl = "https://dwzwlqzsdozcsrrauggi.supabase.co";
const publishableKey = "sb_publishable_w7OhhWtpsXTEQDBGLL7j-g_D0RzZiur";
const resource =
  /^\/v1\/(health|workspace|commands|profile|tasks|projects|conditions|thoughts|habits|occurrences|executions|schedule|sleep|tags|notes|databases|records|images|recovery|backup)(\/[a-zA-Z0-9._/-]+)?$/;

export async function handleProxy(
  request: Request,
  transport: typeof fetch = fetch,
) {
  const reply = (status: number, code: string, message: string) =>
    Response.json(
      { error: { code, message } },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const login = path === "/username-login";
  if (
    (!login && !resource.test(path)) ||
    path.includes("..") ||
    path.includes("//")
  )
    return reply(404, "not_found", "Unknown API route.");
  if (
    !["GET", "POST", "PATCH", "DELETE"].includes(request.method) ||
    (login && request.method !== "POST")
  )
    return reply(405, "method_not_allowed", "Method not allowed.");
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    return reply(403, "origin_denied", "Origin not allowed.");
  const token = request.headers.get("authorization");
  if (!login && path !== "/v1/health" && !/^Bearer \S+$/.test(token || ""))
    return reply(401, "unauthorized", "Please sign in again.");
  const headers = new Headers();
  for (const key of ["content-type", "if-match", "authorization"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  let target: URL;
  if (login) {
    target = new URL(
      "/functions/v1/username-login",
      process.env.SUPABASE_URL || supabaseUrl,
    );
    headers.delete("authorization");
    headers.set(
      "apikey",
      process.env.SUPABASE_PUBLISHABLE_KEY || publishableKey,
    );
  } else {
    target = new URL(path, process.env.PLANNER_API_URL || defaultApi);
    for (const [key, value] of url.searchParams)
      if (key !== "path") target.searchParams.append(key, value);
  }
  try {
    const body =
      request.method === "GET" ? undefined : await request.arrayBuffer();
    if (
      body &&
      body.byteLength >
        (login ? 4096 : path === "/v1/backup" ? 3_500_000 : 1_048_576)
    )
      return reply(413, "body_too_large", "Request is too large.");
    const upstream = await transport(target, {
      method: request.method,
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    const outputHeaders = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const key of ["content-type", "etag", "x-request-id", "retry-after"]) {
      const value = upstream.headers.get(key);
      if (value) outputHeaders.set(key, value);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: outputHeaders,
    });
  } catch {
    return reply(
      503,
      "api_unavailable",
      "ONE could not reach your workspace. Please refresh before retrying a change.",
    );
  }
}
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(",") : value);
    const protocol =
      req.headers["x-forwarded-proto"] === "http" ? "http" : "https";
    const base = protocol + "://" + (req.headers.host || "localhost");
    const init: RequestInit & { duplex?: "half" } = {
      method: req.method,
      headers,
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body !== undefined)
        init.body = Buffer.isBuffer(req.body)
          ? new Uint8Array(req.body)
          : typeof req.body === "string"
            ? req.body
            : JSON.stringify(req.body);
      else {
        init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
        init.duplex = "half";
      }
    }
    const response = await handleProxy(
      new Request(new URL(req.url || "/api/proxy", base), init),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        error: {
          code: "internal_error",
          message: "Request could not be completed.",
        },
      }),
    );
  }
}
