export type AuthMode = "signin" | "signup" | "reset";

export function identifierProblem(value: string, mode: AuthMode) {
  const identifier = value.trim();
  if (!identifier)
    return mode === "signin"
      ? "Enter your email or username."
      : "Enter your email address.";
  if (identifier.length > 254) return "Use 254 characters or fewer.";
  if (mode !== "signin" || identifier.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))
      return "Enter a full email address, like you@example.com.";
  } else if (/\s/.test(identifier)) {
    return "Usernames don’t contain spaces. Try your email instead.";
  }
  return "";
}

export function passwordProblem(value: string, creating: boolean) {
  if (!value)
    return creating
      ? "Choose a password with at least 8 characters."
      : "Enter your password.";
  if (creating && value.length < 8)
    return "Use at least 8 characters for your password.";
  if (value.length > 1024) return "Use 1,024 characters or fewer.";
  return "";
}

// Provider details and account existence never become UI copy.
export function authProblem(cause: unknown) {
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : "";
  const status =
    cause && typeof cause === "object" && "status" in cause
      ? Number(cause.status)
      : 0;
  const detail = cause instanceof Error ? cause.message : "";
  if (
    code === "invalid_credentials" ||
    /invalid login credentials|check your username and password/i.test(detail)
  )
    return "Check your email or username and password, then try again.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(detail))
    return "Confirm your email using the link in your inbox, then sign in.";
  if (
    status === 429 ||
    /rate.limit|too many|security purposes/i.test(code + " " + detail)
  )
    return "Too many attempts. Wait a minute, then try again.";
  if (/password.*(weak|short)|weak_password/i.test(code + " " + detail))
    return "Choose a stronger password with at least 8 characters.";
  if (code === "same_password")
    return "Choose a different password from your current one.";
  if (
    /session.*(missing|expired|not_found)|refresh_token|otp_expired|flow_state_expired/i.test(
      code + " " + detail,
    )
  )
    return "This reset link has expired. Request a new one to continue.";
  if (
    cause instanceof TypeError ||
    /failed to fetch|network|fetch failed/i.test(detail)
  )
    return "Couldn’t connect. Check your connection and try again.";
  return "We couldn’t complete that request. Please try again in a moment.";
}
