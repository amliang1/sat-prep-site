import clsx from "clsx";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function formatSection(section: string) {
  return section === "READING_WRITING" ? "Reading & Writing" : "Math";
}

export function formatDifficulty(difficulty: string) {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
