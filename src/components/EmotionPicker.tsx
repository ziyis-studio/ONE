import { useId } from "react";
import { emotions } from "../lib/emotions";
import { MessageCircle } from "lucide-react";
import "./emotion-picker.css";
export default function EmotionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const options = emotions.some((option) => option.value === value)
    ? emotions
    : [...emotions, { value, label: value, icon: MessageCircle }];
  return (
    <fieldset className="one-emotion-picker">
      <legend>
        How does it feel? <span>Optional</span>
      </legend>
      <div className="one-emotion-grid">
        {options.map(({ value: emotion, label, icon: Icon }) => (
          <label
            className="one-emotion-choice"
            data-selected={emotion === value || undefined}
            key={emotion}
          >
            <input
              type="radio"
              name={id}
              value={emotion}
              checked={emotion === value}
              onChange={() => onChange(emotion)}
            />
            <Icon size={15} strokeWidth={1.6} aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
