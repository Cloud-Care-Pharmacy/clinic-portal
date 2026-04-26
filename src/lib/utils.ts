import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&#39;": "'",
  "&#x27;": "'",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
};

function decodeHtmlEntity(entity: string): string {
  const namedEntity = HTML_ENTITIES[entity.toLowerCase()];
  if (namedEntity) return namedEntity;

  const decimalEntity = entity.match(/^&#(\d+);$/);
  if (decimalEntity) {
    return String.fromCodePoint(Number(decimalEntity[1]));
  }

  const hexEntity = entity.match(/^&#x([\da-f]+);$/i);
  if (hexEntity) {
    return String.fromCodePoint(Number.parseInt(hexEntity[1], 16));
  }

  return entity;
}

export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|apos|gt|lt|nbsp|quot);|&#\d+;|&#x[\da-f]+;/gi, decodeHtmlEntity)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
