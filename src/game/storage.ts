import { BoardState } from './rules';

export interface DailyRecord {
  won: boolean;
  checksUsed: number;
}

export interface PlayerStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  lastCompletedDateKey: string | null;
  distribution: Record<number, number>; // checksUsed (1..10) -> count
  totalHintsUsed: number;
  dailyHistory: Record<string, DailyRecord>;
}

export interface WeeklyCompletionPoint {
  dateKey: string;
  dayLabel: string;
  completed: number;
  won: boolean;
  checksUsed: number | null;
}

export interface SavedDailySession {
  dateKey: string;
  puzzleId: string;
  board: BoardState;
  recordedInStats: boolean;
}

const STATS_KEY = 'chainwork_stats_v1';
const DAILY_SESSION_KEY = 'chainwork_daily_v1';
const MUTE_KEY = 'chainwork_muted_v1';

export const DEFAULT_STATS: PlayerStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastCompletedDateKey: null,
  distribution: {},
  totalHintsUsed: 0,
  dailyHistory: {},
};

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const py = dt.getUTCFullYear();
  const pm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const pd = String(dt.getUTCDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

function previousDateKey(dateKey: string): string {
  return shiftDateKey(dateKey, -1);
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildWeeklyCompletionSeries(
  stats: PlayerStats,
  endDateKey: string,
): WeeklyCompletionPoint[] {
  const points: WeeklyCompletionPoint[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const dk = shiftDateKey(endDateKey, offset);
    const [y, m, d] = dk.split('-').map(Number);
    const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const record = stats.dailyHistory[dk];
    const isLegacyToday =
      !record && stats.lastCompletedDateKey === dk && stats.won > 0;
    const completed = record ? (record.won ? 1 : 0) : isLegacyToday ? 1 : 0;

    points.push({
      dateKey: dk,
      dayLabel: SHORT_WEEKDAYS[utcDay],
      completed,
      won: completed === 1,
      checksUsed: record ? record.checksUsed : null,
    });
  }
  return points;
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS, distribution: {}, dailyHistory: {} };
    const parsed = JSON.parse(raw) as Partial<PlayerStats>;
    return {
      played: parsed.played ?? 0,
      won: parsed.won ?? 0,
      currentStreak: parsed.currentStreak ?? 0,
      maxStreak: parsed.maxStreak ?? 0,
      lastCompletedDateKey: parsed.lastCompletedDateKey ?? null,
      distribution: parsed.distribution ?? {},
      totalHintsUsed: parsed.totalHintsUsed ?? 0,
      dailyHistory: parsed.dailyHistory ?? {},
    };
  } catch {
    return { ...DEFAULT_STATS, distribution: {}, dailyHistory: {} };
  }
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordDailyOutcome(
  stats: PlayerStats,
  dateKey: string,
  won: boolean,
  checksUsed: number,
  hintsUsed: number,
): PlayerStats {
  if (stats.lastCompletedDateKey === dateKey) {
    return stats;
  }

  const prevDay = previousDateKey(dateKey);
  const nextStreak = won
    ? stats.lastCompletedDateKey === prevDay
      ? stats.currentStreak + 1
      : 1
    : 0;

  const nextDist = { ...stats.distribution };
  if (won) {
    nextDist[checksUsed] = (nextDist[checksUsed] ?? 0) + 1;
  }

  const nextHistory: Record<string, DailyRecord> = {
    ...stats.dailyHistory,
    [dateKey]: { won, checksUsed },
  };

  const updated: PlayerStats = {
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    currentStreak: nextStreak,
    maxStreak: Math.max(stats.maxStreak, nextStreak),
    lastCompletedDateKey: dateKey,
    distribution: nextDist,
    totalHintsUsed: stats.totalHintsUsed + hintsUsed,
    dailyHistory: nextHistory,
  };

  saveStats(updated);
  return updated;
}

export function loadDailySession(dateKey: string): SavedDailySession | null {
  try {
    const raw = localStorage.getItem(DAILY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDailySession;
    if (parsed.dateKey !== dateKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailySession(session: SavedDailySession): void {
  try {
    localStorage.setItem(DAILY_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore
  }
}
