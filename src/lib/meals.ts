import type { Nutrient } from "../domain/meals";
export const mealLabels = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  other: "Other",
} as const;
export const nutrientLabels: Record<Nutrient, string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
  fiber: "Fiber",
};
export const nutritionText = (value: number | null | undefined) =>
  value == null
    ? "—"
    : value.toLocaleString("en", { maximumFractionDigits: 2 });
/** Resize camera photos before uploading through the API's bounded request body. */
export async function prepareMealPhoto(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG or WebP photo up to 20 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This photo could not be opened. Try a JPEG or PNG copy.");
  });
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Photo processing is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Photo processing failed.")),
        "image/jpeg",
        0.86,
      ),
    );
    if (blob.size > 3 * 1024 * 1024)
      throw new Error("This photo is still too large. Try a smaller copy.");
    return blob;
  } finally {
    bitmap.close();
  }
}
