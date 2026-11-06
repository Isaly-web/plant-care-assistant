// Retention rule for uploaded files (backlog B3, period to be confirmed by a lawyer). Pure.
// Files are kept until the user deletes them or the account is deleted, and are removed
// automatically after FILE_RETENTION_MONTHS of inactivity. Same rule as the other Isaly apps.

export const FILE_RETENTION_MONTHS = 12;

export function inactivityCutoff(now: Date, months = FILE_RETENTION_MONTHS): Date {
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function toMs(v: string | Date | null | undefined): number | null {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

/** The most recent valid timestamp, or null if none is valid. */
export function latestActivity(...values: Array<string | Date | null | undefined>): Date | null {
  let best: number | null = null;
  for (const v of values) {
    const t = toMs(v);
    if (t !== null && (best === null || t > best)) best = t;
  }
  return best === null ? null : new Date(best);
}

/** True only when the last activity is known and older than the cutoff (fail closed). */
export function isInactive(last: string | Date | null | undefined, cutoff: Date): boolean {
  const t = toMs(last);
  return t !== null && t < cutoff.getTime();
}
