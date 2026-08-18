import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

export function daysBetween(fromStr: string, toStr: string): number {
  const from = parseISO(fromStr);
  const to = parseISO(toStr);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Human-friendly Swedish date, e.g. "18 augusti" or "Idag" / "Imorgon". */
export function formatFriendlyDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Idag";
  if (isTomorrow(d)) return "Imorgon";
  return format(d, "d MMMM", { locale: sv });
}

export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr), "d MMMM yyyy", { locale: sv });
}

export function formatRelativePast(dateStr: string): string {
  return formatDistanceToNowStrict(parseISO(dateStr), { addSuffix: true, locale: sv });
}

export function isOverdue(dateStr: string): boolean {
  const d = parseISO(dateStr);
  return isPast(d) && !isToday(d);
}

export const MONTH_NAMES_SV = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

export function monthName(monthNumber1to12: number): string {
  return MONTH_NAMES_SV[monthNumber1to12 - 1] ?? "";
}
