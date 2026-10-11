/** Attempt 1 is the base name. Attempt n >= 2 adds `-n`, as in `name-2`. */
export function numberedName(baseName: string, attempt: number): string {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(`attempt must be an integer >= 1, got ${attempt}`);
  }
  return attempt === 1 ? baseName : `${baseName}-${attempt}`;
}
