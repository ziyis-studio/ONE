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
export const emotions = [
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
export function emotionIcon(value: string) {
  return emotions.find((e) => e.value === value)?.icon || MessageCircle;
}
