import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, API_PROXY } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: "one-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
export async function signIn(identifier: string, password: string) {
  if (identifier.includes("@")) {
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier.trim(),
      password,
    });
    if (error) throw error;
  } else {
    const response = await fetch(`${API_PROXY}?path=/username-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: identifier.trim().toLowerCase(),
        password,
      }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Too many attempts. Please wait a minute."
          : response.status === 401
            ? "Check your username and password."
            : "Sign in is unavailable. Please try again.",
      );
    const { error } = await supabase.auth.setSession(data);
    if (error) throw error;
  }
}
