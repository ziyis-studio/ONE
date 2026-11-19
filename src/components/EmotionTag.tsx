import "./emotion-tag.css";
import { emotionIcon } from "../lib/emotions";
export default function EmotionTag({
  value,
  className = "tag",
}: {
  value: string;
  className?: string;
}) {
  const Icon = emotionIcon(value);
  return (
    <span className={className + " emotion-tag"}>
      <Icon size={12} strokeWidth={1.6} aria-hidden="true" />
      {value}
    </span>
  );
}
