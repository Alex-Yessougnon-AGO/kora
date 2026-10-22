import { addDays, startOfDay } from './dates';
import type { KoraData } from './models';

export type PeriodKey = '7d' | '30d' | '90d' | 'all';

export interface DateRange {
  key: PeriodKey;
  start: Date;
  end: Date;
  label: string;
  shortLabel: string;
  days: number;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; short: string }[] = [
  { key: '7d', label: '7 derniers jours', short: '7 jours' },
  { key: '30d', label: '30 derniers jours', short: '30 jours' },
  { key: '90d', label: '90 derniers jours', short: '90 jours' },
  { key: 'all', label: "Tout l'historique", short: 'Tout' },
];

export function getPeriodRange(key: PeriodKey, data?: KoraData, now = new Date()): DateRange {
  const end = new Date(now);
  let start: Date;
  let label: string;
  let shortLabel: string;

  if (key === 'all') {
    const candidates = [
      data?.createdAt,
      ...(data?.sales.map((s) => s.createdAt) ?? []),
      ...(data?.expenses.map((e) => e.createdAt) ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((time) => Number.isFinite(time));
    const earliest = candidates.length ? new Date(Math.min(...candidates)) : addDays(now, -30);
    start = startOfDay(earliest);
    label = "Tout l'historique";
    shortLabel = 'Tout';
  } else {
    const count = Number.parseInt(key, 10);
    start = startOfDay(addDays(now, -(count - 1)));
    const option = PERIOD_OPTIONS.find((item) => item.key === key);
    label = option?.label ?? `${count} derniers jours`;
    shortLabel = option?.short ?? `${count} jours`;
  }

  const days = Math.max(
    1,
    Math.round((startOfDay(end).getTime() - start.getTime()) / 86_400_000) + 1,
  );

  return { key, start, end, label, shortLabel, days };
}

export function previousRange(range: DateRange): DateRange {
  const end = new Date(range.start.getTime() - 1);
  const start = startOfDay(addDays(range.start, -range.days));
  return {
    key: range.key,
    start,
    end,
    label: 'Période précédente',
    shortLabel: 'Précédent',
    days: range.days,
  };
}

export function isInRange(iso: string, range: DateRange): boolean {
  const time = new Date(iso).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}
