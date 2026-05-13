/**
 * Minimal HTML → plain-text converter used to derive the email plain-text
 * fallback when authors leave it blank. Handles only the elements TipTap's
 * StarterKit can produce in this codebase (paragraphs, line breaks, lists,
 * basic inline formatting). Not safe for arbitrary external HTML.
 */
export function htmlToText(html: string): string {
  if (!html) return "";

  let text = html;

  // Normalize block-level boundaries to newlines.
  text = text.replace(/<\s*br\s*\/?>/gi, "\n");
  text = text.replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n");
  text = text.replace(/<\s*li[^>]*>/gi, "• ");

  // Strip remaining tags.
  text = text.replace(/<[^>]+>/g, "");

  // Decode the handful of entities StarterKit emits.
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse runs of blank lines / trailing whitespace.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
