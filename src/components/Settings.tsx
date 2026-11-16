import { useEffect, useState } from "react";
import {
  Download,
  LogOut,
  RotateCcw,
  Check,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import { useOne } from "../lib/workspace";
import { api } from "../lib/api";
import { supabase } from "../lib/auth";
import { DEMO_KEY } from "../lib/demo";
import { PageIntro } from "./Pages";
import { SelectField } from "./SelectField";
import { Spinner } from "./ui";
import AppearanceSettings from "./AppearanceSettings";
export default function Settings({ onExit }: { onExit: () => void }) {
  const { data, zone, setZone, session, demo, notify, reload } = useOne();
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
    setSaving(true);
    setProfileError("");
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error("Please sign in again.");
      await api("/v1/profile", auth.session.access_token, {
        method: "PATCH",
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });
      notify("Your username is saved.");
    } catch (cause) {
      setProfileError(
        cause instanceof Error ? cause.message : "Could not save.",
      );
    } finally {
      setSaving(false);
    }
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { app: "ONE", exportedAt: new Date().toISOString(), workspace: data },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "one-workspace-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("A copy of your workspace, kept.");
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
                    aria-label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                <p className="form-message error" role="alert">
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
        <section className="settings-card">
          <h2>A copy, just in case</h2>
          <p>
            Download your workspace as JSON. It includes your plans and notes,
            without account credentials.
          </p>
          <button className="secondary-button" onClick={download}>
            <Download size={14} />
            Export workspace
          </button>
          {demo && (
            <div className="settings-row">
              <span>
                Begin again
                <small>
                  Reset this sample workspace to its starting point.
                </small>
              </span>
              <button
                className="text-button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset all changes in this sample workspace?",
                    )
                  ) {
                    localStorage.removeItem(DEMO_KEY);
                    void reload();
                  }
                }}
              >
                <RotateCcw size={14} />
                Reset demo
              </button>
            </div>
          )}
        </section>
        <p className="settings-foot">
          ONE <span>·</span> A little space for everything that matters.
        </p>
      </div>
    </>
  );
}
