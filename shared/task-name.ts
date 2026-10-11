export const MAX_SLUG_LENGTH = 50;

export const EMPTY_SLUG_MESSAGE =
  "This name has no letters or digits that can be used in a directory name. Use other words, or leave the name empty.";

const NOT_KEPT = /[^\p{L}\p{M}\p{N}._-]+/gu;
const HYPHEN_RUNS = /-{2,}/g;
const EDGE_HYPHENS_AND_DOTS = /^[-.]+|[-.]+$/g;

function trimEdges(value: string): string {
  return value.replace(EDGE_HYPHENS_AND_DOTS, "");
}

/** Turns a task name into the slug part of a task directory name. May return "". */
export function slugify(name: string): string {
  const replaced = name
    .normalize("NFKC")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase())
    .replace(NOT_KEPT, "-")
    .replace(HYPHEN_RUNS, "-");
  const cut = Array.from(trimEdges(replaced)).slice(0, MAX_SLUG_LENGTH).join("");
  // Cutting can leave a "-" or "." at the end again.
  return trimEdges(cut);
}

export type TaskSlugResult = { ok: true; slug: string } | { ok: false; message: string };

export function parseTaskSlug(name: string): TaskSlugResult {
  const slug = slugify(name);
  return slug === "" ? { ok: false, message: EMPTY_SLUG_MESSAGE } : { ok: true, slug };
}

export type TaskNameFieldResult =
  | { ok: true; input: { name?: string } }
  | { ok: false; message: string };

/** Reads the launcher text field. A blank field means a task without a name. */
export function parseTaskNameField(text: string): TaskNameFieldResult {
  const name = text.trim();
  if (name === "") return { ok: true, input: {} };
  const slug = parseTaskSlug(name);
  return slug.ok ? { ok: true, input: { name } } : slug;
}
