export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://dwzwlqzsdozcsrrauggi.supabase.co";
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_w7OhhWtpsXTEQDBGLL7j-g_D0RzZiur";
export const API_BASE = import.meta.env.VITE_API_URL || "/api";
export const apiUrl = (path: string) => API_BASE.replace(/\/$/, "") + path;
export const DEFAULT_ZONE = "Asia/Kuala_Lumpur";
