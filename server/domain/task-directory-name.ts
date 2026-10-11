function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function localDate(now: Date): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function localTime(now: Date): string {
  return `${pad2(now.getHours())}${pad2(now.getMinutes())}`;
}

/** `YYYY-MM-DD-<slug>` with a slug, `YYYY-MM-DD-HHMM` without one. Uses local time. */
export function taskDirectoryBaseName({ now, slug }: { now: Date; slug?: string }): string {
  return `${localDate(now)}-${slug ?? localTime(now)}`;
}
