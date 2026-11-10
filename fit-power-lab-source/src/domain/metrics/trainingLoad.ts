/** Time constants, in days, of the chronic (fitness) and the acute (fatigue) load. */
export const CTL_DAYS = 42;
export const ATL_DAYS = 7;

export interface RideLoad {
  startTime: Date;
  tss: number;
}

export interface DailyLoad {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  tss: number;
  /** Fitness at the end of the day. */
  ctl: number;
  /** Fatigue at the end of the day. */
  atl: number;
  /** Form of the morning: yesterday's CTL minus yesterday's ATL. */
  tsb: number;
}

export interface WeeklyLoad {
  /** Monday of the week, `YYYY-MM-DD`. */
  weekStart: string;
  tss: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar date of the moment in the machine's time zone. */
export const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

/** Steps by calendar days, so a daylight saving change cannot skip or repeat a date. */
const addDays = (d: Date, days: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

function sumByDay(rides: RideLoad[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const ride of rides) {
    const key = localDateKey(ride.startTime);
    byDay.set(key, (byDay.get(key) ?? 0) + ride.tss);
  }
  return byDay;
}

/**
 * CTL, ATL and TSB for every day from the first ride to the last: exponentially weighted averages
 * of the daily TSS with time constants of 42 and 7 days, starting from 0 the day before.
 */
export function trainingLoad(rides: RideLoad[]): DailyLoad[] {
  const byDay = sumByDay(rides);
  const keys = [...byDay.keys()].sort();
  const firstKey = keys[0];
  const lastKey = keys.at(-1);
  if (firstKey === undefined || lastKey === undefined) return [];

  const rows: DailyLoad[] = [];
  let ctl = 0;
  let atl = 0;
  for (let day = parseKey(firstKey); localDateKey(day) <= lastKey; day = addDays(day, 1)) {
    const date = localDateKey(day);
    const tss = byDay.get(date) ?? 0;
    const tsb = ctl - atl;
    ctl += (tss - ctl) / CTL_DAYS;
    atl += (tss - atl) / ATL_DAYS;
    rows.push({ date, tss, ctl, atl, tsb });
  }
  return rows;
}

const mondayOf = (d: Date): Date => addDays(d, -((d.getDay() + 6) % 7));

/** TSS added up per week (Monday to Sunday), including the weeks without a ride. */
export function weeklyTss(rides: RideLoad[]): WeeklyLoad[] {
  const byWeek = new Map<string, number>();
  for (const ride of rides) {
    const key = localDateKey(mondayOf(ride.startTime));
    byWeek.set(key, (byWeek.get(key) ?? 0) + ride.tss);
  }
  const keys = [...byWeek.keys()].sort();
  const firstKey = keys[0];
  const lastKey = keys.at(-1);
  if (firstKey === undefined || lastKey === undefined) return [];

  const weeks: WeeklyLoad[] = [];
  for (let week = parseKey(firstKey); localDateKey(week) <= lastKey; week = addDays(week, 7)) {
    const weekStart = localDateKey(week);
    weeks.push({ weekStart, tss: byWeek.get(weekStart) ?? 0 });
  }
  return weeks;
}
