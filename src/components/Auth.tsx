import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  LockKeyhole,
  CircleAlert,
} from "lucide-react";
import { signIn, supabase } from "../lib/auth";
import { Logo, Spinner } from "./ui";

export default function Auth({
  onDemo,
  recovery = false,
  onRecovered,
}: {
  onDemo: () => void;
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(recovery ? 1 : 0);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const title = recovery
    ? "A fresh start."
    : mode === "signup"
      ? "Make space for you."
      : mode === "reset"
        ? "A little help getting in."
        : "Welcome to your space.";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!recovery && step === 0 && mode !== "reset") {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      if (recovery) {
        const { error: cause } = await supabase.auth.updateUser({ password });
        if (cause) throw cause;
        onRecovered?.();
      } else if (mode === "reset") {
        const { error: cause } = await supabase.auth.resetPasswordForEmail(
          identifier.trim(),
          { redirectTo: location.origin },
        );
        if (cause) throw cause;
        setMessage(
          "If an account uses this email, a reset link is on its way.",
        );
      } else if (mode === "signup") {
        const { data, error: cause } = await supabase.auth.signUp({
          email: identifier.trim(),
          password,
          options: { emailRedirectTo: location.origin },
        });
        if (cause) throw cause;
        if (!data.session)
          setMessage(
            "Check your email to confirm your account, then come back to sign in.",
          );
      } else await signIn(identifier, password);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next: typeof mode) {
    setMode(next);
    setStep(0);
    setError("");
    setMessage("");
    setPassword("");
  }
  return (
    <main className="auth-page">
      <div className="auth-glow glow-one" />
      <div className="auth-glow glow-two" />
      <header className="auth-header">
        <a href="#/" className="brand" aria-label="ONE home">
          <Logo size={28} />
          <span>ONE</span>
        </a>
        <span className="auth-header-note">
          A little clarity. A little space.
        </span>
      </header>
      <motion.div
        className="auth-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
      >
        <div className="auth-symbol">
          <Logo size={56} />
          <span className="symbol-halo" />
        </div>
        <p className="eyebrow">
          {recovery ? "WELCOME BACK" : "ALL THE THINGS THAT MATTER"}
        </p>
        <h1>{title}</h1>
        <p className="auth-subtitle">
          {recovery
            ? "Choose a new password for ONE."
            : mode === "reset"
              ? "We’ll send you a link to reset your password."
              : "Your plans, habits, and thoughts. Together in ONE."}
        </p>
        <form onSubmit={submit} className="auth-form">
          <AnimatePresence mode="wait">
            <motion.div
              key={String(step) + mode}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {!recovery && step === 0 ? (
                <label className="auth-input-label">
                  {mode === "signin" ? "Email or username" : "Email address"}
                  <input
                    key="identifier"
                    autoComplete={mode === "signup" ? "email" : "username"}
                    type={mode === "signin" ? "text" : "email"}
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder={
                      mode === "signin"
                        ? "you@yourspace.com"
                        : "Your email address"
                    }
                    required
                    maxLength={254}
                    autoFocus
                  />
                </label>
              ) : (
                <>
                  {!recovery && (
                    <button
                      type="button"
                      className="identifier-back"
                      onClick={() => {
                        setStep(0);
                        setPassword("");
                        setError("");
                      }}
                    >
                      <ArrowLeft size={13} />
                      {identifier}
                    </button>
                  )}
                  <label className="auth-input-label">
                    {recovery ? "New password" : "Password"}
                    <span className="password-input">
                      <input
                        key="password"
                        type={show ? "text" : "password"}
                        autoComplete={
                          mode === "signup" || recovery
                            ? "new-password"
                            : "current-password"
                        }
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={
                          mode === "signup" || recovery
                            ? "At least 8 characters"
                            : "Your password"
                        }
                        required
                        minLength={mode === "signup" || recovery ? 8 : 1}
                        maxLength={1024}
                        autoFocus
                      />
                      <button
                        type="button"
                        aria-label={show ? "Hide password" : "Show password"}
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {error && (
            <p className="form-message error" role="alert">
              <CircleAlert size={15} />
              {error}
            </p>
          )}
          {message && (
            <p className="form-message success" role="status">
              <Check size={15} />
              {message}
            </p>
          )}
          <button className="auth-submit" disabled={busy || !!message}>
            {busy ? (
              <Spinner />
            ) : (
              <>
                {recovery
                  ? "Save new password"
                  : mode === "reset"
                    ? "Send reset link"
                    : step === 0
                      ? "Continue"
                      : mode === "signup"
                        ? "Create your space"
                        : "Sign in"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
          {!recovery && mode === "signin" && step === 1 && (
            <button
              type="button"
              className="auth-link"
              onClick={() => switchMode("reset")}
            >
              Forgot your password?
            </button>
          )}
        </form>
        {!recovery && (
          <>
            <p className="auth-switch">
              {mode === "signin" ? "New here? " : "Already have a space? "}
              <button
                onClick={() =>
                  switchMode(mode === "signin" ? "signup" : "signin")
                }
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
            <div className="auth-divider">
              <span />
              or take a look around
              <span />
            </div>
            <button className="demo-button" onClick={onDemo}>
              Explore ONE
              <ArrowUpRightIcon />
            </button>
            <p className="demo-explanation">
              A sample workspace, just for you to explore.
            </p>
          </>
        )}
      </motion.div>
      <footer className="auth-footer">
        <span>YOUR SPACE, IN FOCUS.</span>
        <span>
          <LockKeyhole size={11} />
          Private by design
        </span>
      </footer>
    </main>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
