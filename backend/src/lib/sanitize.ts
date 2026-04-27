const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function sanitize(input: string): string {
  return input
    .replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] || char)
    .trim();
}

export function sanitizeOrNull(input: string | null | undefined): string | null {
  if (input == null) return null;
  return sanitize(input);
}
