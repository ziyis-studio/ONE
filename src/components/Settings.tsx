import RecoverySettings from "./RecoverySettings";
import { useEffect, useRef, useState } from "react";
import { LogOut, RotateCcw, Check, Globe2, ShieldCheck } from "lucide-react";
import { useOne } from "../lib/workspace";
import { api } from "../lib/api";
import { supabase } from "../lib/auth";
import { DEMO_KEY } from "../lib/demo";
import { PageIntro } from "./Pages";
import { SelectField } from "./SelectField";
import { Spinner } from "./ui";
import AppearanceSettings from "./AppearanceSettings";
import { useConfirm } from "../lib/confirmation";
import { useResetViews } from "../lib/view-state";
export default function Settings({ onExit }: { onExit: () => void }) {
  const { zone, setZone, session, demo, notify, reload } = useOne();
  const confirm = useConfirm();
  const resetViews = useResetViews();
  const usernameRef = useRef<HTMLInputElement>(null),
    savingRef = useRef(false);
  const [username, setUsername] = useState(""),
    [saving, setSaving] = useState(false),
    [loading, setLoading] = useState(!demo),
    [profileError, setProfileError] = useState("");
  useEffect(() => {
    if (demo) return;
    let active = true;
    void api<{ username: string | null }>("/v1/profile", session!.access_token)
      .then((profile) => {
        if (active) setUsername(profile.username || "");
      })
      .catch((cause) => {
        if (active)
          setProfileError(
            cause instanceof Error ? cause.message : "Could not load profile.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, session?.user.id]);
  async function saveProfile() {
    if (loading || savingRef.current) return;
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(normalized)) {
      setProfileError(
        !normalized
          ? "Enter a username."
          : "Use 3–32 letters, numbers, dots, dashes or underscores. Start with a letter or number.",
      );
      usernameRef.current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setProfileError("");
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error("Please sign in again.");
      await api("/v1/profile", auth.session.access_token, {
        method: "PATCH",
        body: JSON.stringify({ username: normalized }),
      });
      setUsername(normalized);
      notify("Your username is saved.");
    } catch (cause) {
      setProfileError(
        cause instanceof Error ? cause.message : "Could not save.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const zones = [
    ...new Set([
      zone,
      "Asia/Kuala_Lumpur",
      "Asia/Singapore",
      "Asia/Shanghai",
      "Asia/Hong_Kong",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Asia/Kolkata",
      "Australia/Sydney",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Los_Angeles",
      "UTC",
    ]),
  ];
  return (
    <>
      <PageIntro
        title="Settings"
        subtitle="A few little things to make this space yours."
      />
      <div className="settings-stack">
        <AppearanceSettings />
        <section className="settings-card">
          <header>
            <Globe2 size={20} />
            <div>
              <h2>Your sense of time</h2>
              <p>Dates and times, wherever you are.</p>
            </div>
          </header>
          <div className="settings-row">
            <span>
              Time zone<small>New plans use this time zone.</small>
            </span>
            <SelectField
              label="Time zone"
              hideLabel
              className="one-settings-zone"
              value={zone}
              onChange={setZone}
              options={zones.map((zone) => ({
                value: zone,
                label: zone.replaceAll("_", " "),
              }))}
            />
          </div>
          <div className="settings-row">
            <span>
              Motion
              <small>
                ONE follows your device’s reduced motion preference.
              </small>
            </span>
            <span className="setting-value">System preference</span>
          </div>
        </section>
        <section className="settings-card">
          <header>
            <ShieldCheck size={20} />
            <div>
              <h2>Your account</h2>
              <p>
                {demo
                  ? "You’re exploring a sample workspace."
                  : session?.user.email}
              </p>
            </div>
          </header>
          {!demo && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void saveProfile();
              }}
            >
              <label className="settings-row">
                <span>
                  Username
                  <small>
                    3–32 letters, numbers, dots, dashes, or underscores.
                  </small>
                </span>
                <div className="username-field">
                  <input
                    ref={usernameRef}
                    aria-label="Username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setProfileError("");
                    }}
                    aria-invalid={!!profileError}
                    aria-describedby={
                      profileError ? "username-error" : undefined
                    }
                    disabled={loading || saving}
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}"
                  />
                  <button
                    className="icon-button"
                    aria-label="Save username"
                    disabled={loading || saving}
                  >
                    {saving ? <Spinner /> : <Check size={16} />}
                  </button>
                </div>
              </label>
              {profileError && (
                <p
                  id="username-error"
                  className="form-message error"
                  role="alert"
                >
                  {profileError}
                </p>
              )}
            </form>
          )}
          <div className="settings-row">
            <span>
              {demo ? "A space to explore" : "Your workspace is private"}
              <small>
                {demo
                  ? "Changes stay in this browser. Your real workspace is separate."
                  : "Your account controls access to your data."}
              </small>
            </span>
            <button className="secondary-button" onClick={onExit}>
              <LogOut size={14} />
              {demo ? "Back to sign in" : "Sign out"}
            </button>
          </div>
        </section>
        <RecoverySettings />
        {demo && (
          <section className="settings-card">
            <div className="settings-row">
              <span>
                Begin again
                <small>
                  Reset this sample workspace to its starting point.
                </small>
              </span>
              <button
                className="text-button"
                onClick={async () => {
                  if (
                    !(await confirm({
                      title: "Reset the sample workspace?",
                      description:
                        "Your sample records, drafts, Trash and focus history will be reset. Your real workspace and appearance preferences stay as they are.",
                      confirmLabel: "Reset sample",
                      cancelLabel: "Keep exploring",
                    }))
                  )
                    return;
                  try {
                    localStorage.removeItem(DEMO_KEY);
                    localStorage.removeItem("one-drafts-v1:demo");
                    localStorage.removeItem("one-trash-v1:demo");
                    localStorage.removeItem("one-pomodoro-v1:demo");
                    window.dispatchEvent(
                      new StorageEvent("storage", {
                        key: "one-pomodoro-v1:demo",
                      }),
                    );
                    window.dispatchEvent(new Event("one-drafts"));
                    await reload();
                    resetViews();
                  } catch {
                    notify(
                      "Could not reset the sample. Browser storage is unavailable.",
                      true,
                    );
                  }
                }}
              >
                <RotateCcw size={14} />
                Reset demo
              </button>
            </div>
          </section>
        )}
        <p className="settings-foot">
          ONE <span>·</span> A little space for everything that matters.
        </p>
      </div>
    </>
  );
}
