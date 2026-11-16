import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  parseHex,
  readableAccent,
  useTheme,
} from "../lib/theme";
import "./appearance-settings.css";

export default function AppearanceSettings() {
  const { primaryColor, setPrimaryColor } = useTheme();
  const id = useId();
  const [feedback, setFeedback] = useState("");
  function choose(color: string) {
    const saved = setPrimaryColor(color);
    const name =
      ACCENT_PRESETS.find((p) => p.color === color)?.name ||
      color.toUpperCase();
    setFeedback(
      saved
        ? `${name} applied and saved.`
        : "Applied for this visit. Browser storage is unavailable.",
    );
  }
  return (
    <section className="settings-card one-appearance" aria-labelledby={id}>
      <header>
        <Palette size={20} />
        <div>
          <h2 id={id}>Make it yours</h2>
          <p>Your color, throughout ONE.</p>
        </div>
      </header>
      <fieldset className="one-accent-options">
        <legend>Primary color</legend>
        <div className="one-accent-grid">
          {ACCENT_PRESETS.map((preset) => (
            <label
              key={preset.color}
              className="one-accent-choice"
              data-selected={primaryColor === preset.color || undefined}
              style={{ "--swatch": preset.color } as CSSProperties}
            >
              <input
                type="radio"
                name={id + "-accent"}
                value={preset.color}
                checked={primaryColor === preset.color}
                onChange={() => choose(preset.color)}
              />
              <span className="one-accent-swatch" aria-hidden="true">
                {primaryColor === preset.color && <Check size={15} />}
              </span>
              <span>{preset.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <CustomAccent color={primaryColor} onApply={choose} />
      <div className="one-appearance-footer">
        <p>
          Applies immediately to navigation, buttons and your ONE mark. Saved in
          this browser.
        </p>
        {primaryColor !== DEFAULT_ACCENT && (
          <button
            type="button"
            className="text-button"
            onClick={() => choose(DEFAULT_ACCENT)}
          >
            <RotateCcw size={13} />
            Reset to Violet
          </button>
        )}
      </div>
      <p className="one-appearance-feedback" role="status">
        {feedback}
      </p>
    </section>
  );
}
function CustomAccent({
  color,
  onApply,
}: {
  color: string;
  onApply: (color: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(color.toUpperCase());
  const [error, setError] = useState("");
  // Sync external preset/tab changes while preserving the focused input node.
  useEffect(() => {
    setDraft(color.toUpperCase());
    setError("");
  }, [color]);
  return (
    <form
      className="one-custom-accent"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const hex = parseHex(draft);
        if (!hex) {
          setError("Enter a HEX color, such as #7852EE.");
          return;
        }
        if (!readableAccent(hex)) {
          setError("Choose a deeper shade to keep white text clear.");
          return;
        }
        setError("");
        onApply(hex);
      }}
    >
      <label htmlFor={id}>
        Custom color<span>Use a HEX value for your own shade.</span>
      </label>
      <div className="one-custom-accent-control">
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className="primary-button"
          disabled={parseHex(draft) === color}
        >
          Apply color
        </button>
      </div>
      {error && (
        <p id={id + "-error"} className="form-message error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
