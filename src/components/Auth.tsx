import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Check,
  LockKeyhole,
  CircleAlert,
  Mail,
} from "lucide-react";
import { signIn, supabase } from "../lib/auth";
import {
  authProblem,
  identifierProblem,
  passwordProblem,
} from "../lib/auth-feedback";
import type { AuthMode } from "../lib/auth-feedback";
import { AuthLogo } from "./AuthLogo";
import type { AuthLogoState } from "./AuthLogo";
import { useMotionPreference } from "../lib/motion-preference";
import "./auth.css";

type Phase = "idle" | "active" | "submitting" | "error" | "success";
export default function Auth({
  onDemo,
  recovery: initialRecovery = false,
  onRecovered,
  onTransitionChange,
  onAuthenticated,
  initialError = "",
}: {
  onDemo: () => void;
  recovery?: boolean;
  onRecovered?: () => void;
  onTransitionChange?: (pending: boolean) => void;
  onAuthenticated?: () => void;
  initialError?: string;
}) {
  const [recovery, setRecovery] = useState(initialRecovery);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(recovery ? 1 : 0);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState(initialError);
  const [fieldError, setFieldError] = useState<
    "identifier" | "password" | null
  >(null);
  const [message, setMessage] = useState("");
  const [leaving, setLeaving] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const alive = useRef(true);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const reduced = useMotionPreference();
  const busy = phase === "submitting";
  const blocked = busy || (phase === "success" && !message);
  const creating = mode === "signup" || recovery;
  const logoState: AuthLogoState =
    phase === "active" || busy ? "loading" : phase;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(finishTimer.current);
      clearTimeout(leaveTimer.current);
    };
  }, []);

  function engage() {
    setPhase((current) => (current === "idle" ? "active" : current));
  }
  function edited() {
    setError("");
    setFieldError(null);
    setPhase("active");
  }
  function invalid(problem: string, field: "identifier" | "password") {
    setError(problem);
    setFieldError(field);
    setPhase("error");
    (field === "identifier" ? identifierRef : passwordRef).current?.focus();
  }
  function complete(enterWorkspace: boolean) {
    setPhase("success");
    if (!enterWorkspace) {
      locked.current = false;
      onTransitionChange?.(false);
      return;
    }
    // SIGNED_IN has already reached the parent. Keep Auth mounted for the payoff.
    leaveTimer.current = setTimeout(
      () => setLeaving(true),
      reduced ? 100 : 880,
    );
    finishTimer.current = setTimeout(
      () => {
        if (!alive.current) return;
        if (initialRecovery) onRecovered?.();
        onAuthenticated?.();
      },
      reduced ? 180 : 1080,
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current || blocked || message) return;
    setError("");
    setFieldError(null);
    if (!recovery && step === 0) {
      const problem = identifierProblem(identifier, mode);
      if (problem) return invalid(problem, "identifier");
      setIdentifier(identifier.trim());
      if (mode !== "reset") {
        setPhase("active");
        setStep(1);
        return;
      }
    }
    if (recovery || step === 1) {
      const problem = passwordProblem(password, creating);
      if (problem) return invalid(problem, "password");
    }
    locked.current = true;
    setPhase("submitting");
    onTransitionChange?.(true);
    try {
      if (recovery) {
        const { error: cause } = await supabase.auth.updateUser({ password });
        if (cause) throw cause;
        if (alive.current) complete(true);
      } else if (mode === "reset") {
        const { error: cause } = await supabase.auth.resetPasswordForEmail(
          identifier.trim(),
          { redirectTo: location.origin },
        );
        if (cause) throw cause;
        if (!alive.current) return;
        setMessage(
          "If an account uses this email, a reset link is on its way. Open it to choose a new password.",
        );
        complete(false);
      } else if (mode === "signup") {
        const { data, error: cause } = await supabase.auth.signUp({
          email: identifier.trim(),
          password,
          options: { emailRedirectTo: location.origin },
        });
        if (cause) throw cause;
        if (!alive.current) return;
        if (!data.session)
          setMessage(
            "Open the confirmation link in your email, then come back to sign in.",
          );
        complete(!!data.session);
      } else {
        await signIn(identifier.trim(), password);
        if (alive.current) complete(true);
      }
    } catch (cause) {
      if (!alive.current) return;
      setError(authProblem(cause));
      setPhase("error");
      locked.current = false;
      onTransitionChange?.(false);
      (step === 1 ? passwordRef : identifierRef).current?.focus();
    }
  }
  function switchMode(next: AuthMode) {
    if (blocked) return;
    setMode(next);
    setStep(0);
    setError("");
    setFieldError(null);
    setMessage("");
    setPassword("");
    setShow(false);
    setPhase("idle");
    locked.current = false;
  }
  const title = message
    ? "Check your inbox."
    : recovery
      ? "A fresh start."
      : mode === "signup"
        ? "A space of your own."
        : mode === "reset"
          ? "Reset your password."
          : "Welcome back.";
  const buttonLabel =
    phase === "success"
      ? recovery
        ? "Password updated"
        : "You’re in"
      : busy
        ? recovery
          ? "Saving password…"
          : mode === "reset"
            ? "Sending link…"
            : mode === "signup"
              ? "Creating account…"
              : "Signing in…"
        : recovery
          ? "Save new password"
          : mode === "reset"
            ? "Send reset link"
            : step === 0
              ? "Continue"
              : mode === "signup"
                ? "Create account"
                : "Sign in";
  const hint =
    step === 1 && creating
      ? "At least 8 characters. Make it something only you know."
      : "";
  return (
    <main className="one-auth">
      <header className="one-auth-header">
        <a href="#/" className="one-auth-wordmark" aria-label="ONE home">
          ONE
        </a>
        <span>Your personal workspace</span>
      </header>
      <motion.section
        className="one-auth-content"
        initial={false}
        animate={{ opacity: leaving ? 0 : 1, y: leaving && !reduced ? -6 : 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        aria-labelledby="auth-heading"
      >
        <div className="one-auth-emblem">
          <AuthLogo state={logoState} />
        </div>
        <h1 id="auth-heading">{title}</h1>
        <p className="one-auth-subtitle">
          {message
            ? identifier
            : recovery
              ? "Choose a new password for ONE."
              : mode === "reset"
                ? "We’ll email you a link to get back in."
                : mode === "signup"
                  ? "Your plans, habits, and thoughts. All in ONE."
                  : "Make room for your day."}
        </p>
        {message ? (
          <div className="one-auth-confirmation">
            <div className="one-auth-notice" role="status">
              <Mail size={19} aria-hidden="true" />
              <p>{message}</p>
            </div>
            <button
              type="button"
              className="one-auth-submit"
              onClick={() => switchMode("signin")}
            >
              Back to sign in <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="one-auth-email-help">
              Can’t find it? Check your spam folder too.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="one-auth-form"
            noValidate
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setPhase((current) =>
                  current === "active" ? "idle" : current,
                );
            }}
          >
            <div className="one-auth-step">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={String(step) + mode}
                  initial={{ opacity: 0, y: reduced ? 0 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduced ? 0 : -4 }}
                  transition={{ duration: reduced ? 0 : 0.14 }}
                >
                  {!recovery && step === 0 ? (
                    <div className="one-auth-field">
                      <label htmlFor="auth-identifier">
                        {mode === "signin"
                          ? "Email or username"
                          : "Email address"}
                      </label>
                      <input
                        ref={identifierRef}
                        id="auth-identifier"
                        name="username"
                        autoComplete={
                          mode === "signup" || mode === "reset"
                            ? "email"
                            : "username"
                        }
                        type={mode === "signin" ? "text" : "email"}
                        inputMode={mode === "signin" ? "text" : "email"}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={identifier}
                        onChange={(event) => {
                          setIdentifier(event.target.value);
                          edited();
                        }}
                        onFocus={engage}
                        placeholder="you@example.com"
                        required
                        maxLength={254}
                        readOnly={blocked}
                        aria-invalid={fieldError === "identifier"}
                        aria-describedby="auth-feedback"
                      />
                    </div>
                  ) : (
                    <>
                      {!recovery && (
                        <input
                          type="hidden"
                          name="username"
                          autoComplete="username"
                          value={identifier}
                        />
                      )}
                      {!recovery && (
                        <button
                          type="button"
                          className="one-auth-back"
                          disabled={blocked}
                          onClick={() => {
                            setStep(0);
                            setPassword("");
                            setShow(false);
                            setError("");
                            setFieldError(null);
                            setPhase("idle");
                          }}
                        >
                          <ArrowLeft size={14} aria-hidden="true" />
                          <span>{identifier}</span>
                          <span className="sr-only">
                            Change email or username
                          </span>
                        </button>
                      )}
                      <div className="one-auth-field">
                        <div className="one-auth-label-row">
                          <label htmlFor="auth-password">
                            {recovery ? "New password" : "Password"}
                          </label>
                          {!recovery && mode === "signin" && (
                            <button
                              type="button"
                              disabled={blocked}
                              onClick={() => switchMode("reset")}
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="one-auth-password">
                          <input
                            ref={passwordRef}
                            id="auth-password"
                            name="password"
                            type={show ? "text" : "password"}
                            autoComplete={
                              creating ? "new-password" : "current-password"
                            }
                            value={password}
                            onChange={(event) => {
                              setPassword(event.target.value);
                              edited();
                            }}
                            onFocus={engage}
                            placeholder={
                              creating
                                ? "At least 8 characters"
                                : "Enter your password"
                            }
                            required
                            minLength={creating ? 8 : 1}
                            maxLength={1024}
                            readOnly={blocked}
                            autoFocus={!recovery}
                            aria-invalid={fieldError === "password"}
                            aria-describedby="auth-feedback"
                          />
                          <button
                            type="button"
                            aria-label={
                              show ? "Hide password" : "Show password"
                            }
                            aria-pressed={show}
                            onClick={() => setShow(!show)}
                          >
                            {show ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="one-auth-feedback" id="auth-feedback">
              {error ? (
                <p role="alert" className="one-auth-error">
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : (
                <p className="one-auth-hint">{hint}</p>
              )}
            </div>
            <button
              className="one-auth-submit"
              disabled={blocked}
              aria-busy={busy}
            >
              <span>{buttonLabel}</span>
              {phase === "success" ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                !busy && <ArrowRight size={17} aria-hidden="true" />
              )}
            </button>
            <span className="sr-only" role="status">
              {busy
                ? buttonLabel
                : phase === "success"
                  ? "Success. Opening your workspace."
                  : ""}
            </span>
            {recovery && error.includes("reset link") && (
              <button
                type="button"
                className="one-auth-recovery-link"
                onClick={() => {
                  setRecovery(false);
                  switchMode("reset");
                }}
              >
                Request a new reset link
              </button>
            )}
          </form>
        )}
        {!recovery && !message && (
          <>
            <p className="one-auth-switch">
              {mode === "signin" ? "New to ONE? " : "Already have an account? "}
              <button
                type="button"
                disabled={blocked}
                onClick={() =>
                  switchMode(mode === "signin" ? "signup" : "signin")
                }
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
            <div className="one-auth-divider">
              <span />
              or
              <span />
            </div>
            <button
              className="one-auth-demo"
              disabled={blocked}
              onClick={onDemo}
            >
              Explore ONE
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <p className="one-auth-demo-note">
              A sample workspace. No account needed.
            </p>
          </>
        )}
      </motion.section>
      <footer className="one-auth-footer">
        <span>A little space for what matters.</span>
        <span>
          <LockKeyhole size={12} aria-hidden="true" />
          Your space stays yours.
        </span>
      </footer>
    </main>
  );
}
