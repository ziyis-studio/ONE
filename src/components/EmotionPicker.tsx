import { useId } from "react";
import {
  MessageCircle,
  CircleHelp,
  Lightbulb,
  Heart,
  Waves,
  Smile,
  Cloud,
  CloudRain,
  BookOpen,
  Wind,
} from "lucide-react";
import "./emotion-picker.css";
const emotions = [
  { value: "", label: "Just a thought", icon: MessageCircle },
  { value: "Curious", label: "Curious", icon: CircleHelp },
  { value: "Inspired", label: "Inspired", icon: Lightbulb },
  { value: "Grateful", label: "Grateful", icon: Heart },
  { value: "Calm", label: "Calm", icon: Waves },
  { value: "Excited", label: "Excited", icon: Smile },
  { value: "Unsure", label: "Unsure", icon: Cloud },
  { value: "Overwhelmed", label: "Overwhelmed", icon: CloudRain },
  { value: "Reflective", label: "Reflective", icon: BookOpen },
  { value: "Anxious", label: "Anxious", icon: Wind },
];
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
