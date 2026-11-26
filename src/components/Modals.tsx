import React, { useState } from 'react';
import { Check, Copy, Home, Play, RotateCcw, Share2, X } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getLocalDateKey, PUZZLES, PuzzleDefinition } from '../data/puzzles';
import { BoardState, countTotalHintTiersUsed, generateShareText, tileFeedbackToEmoji } from '../game/rules';
import { buildWeeklyCompletionSeries, PlayerStats, WeeklyCompletionPoint } from '../game/storage';

interface OutcomeModalProps {
  open: boolean;
  mode: 'daily' | 'practice';
  puzzleNumber: number;
  puzzle: PuzzleDefinition;
  board: BoardState;
  stats: PlayerStats;
  onClose: () => void;
  onPlayPracticeNext: () => void;
  onReturnTitle: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  open,
  mode,
  puzzleNumber,
  puzzle,
  board,
  stats,
  onClose,
  onPlayPracticeNext,
  onReturnTitle,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const won = board.outcome === 'won';
  const hintsUsed = countTotalHintTiersUsed(board);
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  const shareText = generateShareText({
    puzzleNumber: mode === 'daily' ? puzzleNumber : PUZZLES.findIndex((p) => p.id === puzzle.id) + 1,
    startWord: puzzle.words[0],
    goalWord: puzzle.words[5],
    won,
    checksUsed: board.checksUsed,
    maxChecks: board.maxChecks,
    streak: stats.currentStreak,
    hintsUsed,
    shareRows: board.shareRows,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[rgba(24,26,24,0.16)] rounded-2xl max-w-md w-full p-6 shadow-xl my-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-mono text-[#5b5e58] tabular-nums mb-1">
              {mode === 'daily' ? `Daily #${puzzleNumber}` : `Practice · ${puzzle.title}`}
            </div>
            <h2 id="outcome-modal-title" className="font-display text-2xl font-bold text-[#181a18]">
              {won ? 'Chain Complete' : 'Out of Checks'}
            </h2>
            <p className="text-xs text-[#5b5e58] mt-1">
              {won
                ? board.winMode === 'alternate'
                  ? 'Solved via a valid alternate word bridge.'
                  : `${puzzle.words[0]} → ${puzzle.words[5]} bridged in ${board.checksUsed} checks.`
                : `Canonical chain: ${puzzle.words.join(' → ')}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close result modal"
            className="w-10 h-10 rounded-lg hover:bg-[#eae8e1] flex items-center justify-center text-[#5b5e58] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Streak & Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Played', value: stats.played },
            { label: 'Win %', value: `${winPct}%` },
            { label: 'Streak', value: stats.currentStreak },
            { label: 'Best', value: stats.maxStreak },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-[#f8f7f3] border border-[rgba(24,26,24,0.08)] py-2.5 px-2 text-center"
            >
              <div className="text-xl font-bold font-mono text-[#181a18] tabular-nums">
                {stat.value}
              </div>
              <div className="text-[11px] text-[#5b5e58]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Spoiler-Free Result Grid Preview */}
        <div className="rounded-xl bg-[#f8f7f3] border border-[rgba(24,26,24,0.1)] p-4 mb-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#181a18] mb-2">
            <span>Spoiler-Free Result Grid</span>
            <span className="font-mono text-[#5b5e58] tabular-nums">
              {won ? `${board.checksUsed}/${board.maxChecks}` : `X/${board.maxChecks}`} · {hintsUsed} hints
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 py-2 font-mono text-base leading-none select-all">
            {board.shareRows.length === 0 ? (
              <span className="text-xs text-[#5b5e58]">No checks recorded</span>
            ) : (
              board.shareRows.map((row, idx) => (
                <div key={idx} className="tracking-widest">
                  {row.tiles.map(tileFeedbackToEmoji).join('')}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#181a18] hover:bg-[#2d302d] text-white font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#86efac]" aria-hidden="true" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                Copy Spoiler-Free Result
              </>
            )}
          </button>
        </div>

        {/* Next Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayPracticeNext}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            Practice Next
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg bg-[#eae8e1] hover:bg-[#dcd8ce] text-[#181a18] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  open: boolean;
  mode: 'daily' | 'practice';
  currentPuzzleId: string;
  onResume: () => void;
  onRestart: () => void;
  onSelectPuzzle: (puzzleId: string) => void;
  onReturnDaily: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  open,
  mode,
  currentPuzzleId,
  onResume,
  onRestart,
  onSelectPuzzle,
  onReturnDaily,
  onReturnTitle,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[rgba(24,26,24,0.16)] rounded-2xl max-w-md w-full p-6 shadow-xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-[#181a18]">
            Game Paused
          </h2>
          <button
            type="button"
            onClick={onResume}
            aria-label="Resume game"
            className="w-10 h-10 rounded-lg hover:bg-[#eae8e1] flex items-center justify-center text-[#5b5e58] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mb-5">
          <button
            type="button"
            onClick={onResume}
            className="w-full h-11 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm cursor-pointer"
          >
            Resume Puzzle
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-[#eae8e1] hover:bg-[#dcd8ce] text-[#181a18] font-semibold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Restart Current Puzzle
          </button>
          {mode === 'practice' && (
            <button
              type="button"
              onClick={onReturnDaily}
              className="w-full h-11 rounded-lg bg-[#f8f7f3] hover:bg-[#eae8e1] border border-[rgba(24,26,24,0.12)] text-[#181a18] font-semibold text-sm cursor-pointer"
            >
              Switch to Today’s Daily
            </button>
          )}
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full h-11 rounded-lg bg-white hover:bg-[#f8f7f3] border border-[rgba(24,26,24,0.12)] text-[#5b5e58] font-semibold text-sm cursor-pointer"
          >
            Return to Title Screen
          </button>
        </div>

        <div className="pt-4 border-t border-[rgba(24,26,24,0.1)]">
          <h3 className="text-xs font-semibold text-[#181a18] mb-2">
            Practice Archive ({PUZZLES.length} Puzzles)
          </h3>
          <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
            {PUZZLES.map((p, idx) => {
              const active = mode === 'practice' && p.id === currentPuzzleId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPuzzle(p.id)}
                  className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#f0fdf4] border-[#15803d] text-[#14532d] font-semibold'
                      : 'bg-[#f8f7f3] hover:bg-[#eae8e1] border-[rgba(24,26,24,0.08)] text-[#181a18]'
                  }`}
                >
                  <div className="font-mono text-[11px] text-[#5b5e58]">
                    #{idx + 1} · {p.words[0]} → {p.words[5]}
                  </div>
                  <div className="truncate">{p.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatsModalProps {
  open: boolean;
  stats: PlayerStats;
  dateKey?: string;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ open, stats, dateKey, onClose }) => {
  if (!open) return null;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const maxBucket = Math.max(1, ...Object.values(stats.distribution));
  const resolvedDateKey = dateKey ?? getLocalDateKey();
  const weeklyData = buildWeeklyCompletionSeries(stats, resolvedDateKey);
  const weeklyTotal = weeklyData.reduce((sum, pt) => sum + pt.completed, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[rgba(24,26,24,0.16)] rounded-2xl max-w-md w-full p-6 shadow-xl my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="stats-modal-title" className="font-display text-2xl font-bold text-[#181a18]">
            Daily Statistics
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close statistics"
            className="w-10 h-10 rounded-lg hover:bg-[#eae8e1] flex items-center justify-center text-[#5b5e58] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Played', value: stats.played },
            { label: 'Win %', value: `${winPct}%` },
            { label: 'Streak', value: stats.currentStreak },
            { label: 'Best', value: stats.maxStreak },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-[#f8f7f3] border border-[rgba(24,26,24,0.08)] py-2.5 px-2 text-center"
            >
              <div className="text-xl font-bold font-mono text-[#181a18] tabular-nums">
                {stat.value}
              </div>
              <div className="text-[11px] text-[#5b5e58]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 7-Day Weekly Performance Streak Trend (Recharts) */}
        <div className="mb-5 rounded-xl bg-[#f8f7f3] border border-[rgba(24,26,24,0.08)] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#181a18]">
              Last 7 Days · Daily Trend
            </h3>
            <span className="text-[11px] font-mono text-[#15803d] font-semibold tabular-nums">
              {weeklyTotal}/7 completed
            </span>
          </div>
          <div className="w-full h-32" data-testid="weekly-streak-chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={weeklyData} margin={{ top: 8, right: 6, left: -26, bottom: 0 }}>
                <XAxis
                  dataKey="dayLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5b5e58', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5b5e58', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(24, 26, 24, 0.05)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const pt = payload[0].payload as WeeklyCompletionPoint;
                    return (
                      <div className="rounded-lg bg-[#181a18] text-[#f4f3ef] px-2.5 py-1.5 text-[11px] font-mono shadow-md">
                        <div className="font-semibold">{pt.dateKey}</div>
                        <div>
                          {pt.won
                            ? `Solved${pt.checksUsed !== null ? ` · ${pt.checksUsed}/10 checks` : ''}`
                            : pt.checksUsed !== null
                              ? 'Attempted · Not solved'
                              : 'No puzzle completed'}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="completed" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                  {weeklyData.map((entry) => (
                    <Cell
                      key={entry.dateKey}
                      fill={entry.won ? '#15803d' : '#d6d3cb'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-[#181a18] mb-2">Check Distribution</h3>
        <div className="flex flex-col gap-1.5">
          {[4, 5, 6, 7, 8, 9, 10].map((checks) => {
            const count = stats.distribution[checks] ?? 0;
            const widthPct = Math.max(8, Math.round((count / maxBucket) * 100));
            return (
              <div key={checks} className="flex items-center gap-2 text-xs font-mono">
                <span className="w-5 text-right text-[#5b5e58] tabular-nums">{checks}</span>
                <div className="flex-1 bg-[#f4f3ef] rounded h-5 overflow-hidden">
                  <div
                    className={`h-full rounded flex items-center justify-end px-2 text-[11px] font-semibold tabular-nums ${
                      count > 0 ? 'bg-[#15803d] text-white' : 'bg-[#eae8e1] text-[#5b5e58]'
                    }`}
                    style={{ width: `${count > 0 ? widthPct : 8}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[rgba(24,26,24,0.16)] rounded-2xl max-w-md w-full p-6 shadow-xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="rules-modal-title" className="font-display text-2xl font-bold text-[#181a18]">
            How to Play
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="w-10 h-10 rounded-lg hover:bg-[#eae8e1] flex items-center justify-center text-[#5b5e58] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-[#181a18] leading-relaxed">
          <p>
            Bridge the <strong>Start</strong> and <strong>Goal</strong> words across four middle rungs. Each adjacent pair of words must differ by <strong>exactly one letter</strong>.
          </p>
          <p>
            Build words using the 12 letters in the <strong>Tile Rack</strong> (click tiles or type A–Z). Use <strong>Carry</strong> on an active rung to copy an adjacent word’s tiles and swap just one letter.
          </p>
          <div className="rounded-xl bg-[#f8f7f3] border border-[rgba(24,26,24,0.08)] p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-[#181a18]">Tile-Logic Colors</div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#15803d] text-white font-bold flex items-center justify-center">B</span>
              <span>Emerald: Letter is in the exact spot for that rung.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#b45309] text-white font-bold flex items-center justify-center">A</span>
              <span>Amber: Letter belongs in this rung, different slot.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#52554e] text-white font-bold flex items-center justify-center">R</span>
              <span>Slate: Letter is not used in this rung’s target word.</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#eff6ff] border border-[#bfdbfe] p-3.5 space-y-1 text-xs text-[#1e3a8a]">
            <div className="font-semibold">Three-Tier Hint System</div>
            <p>
              <strong>Tier 1 (Clue):</strong> Reveals the rung’s definition and shifting tile index.
            </p>
            <p>
              <strong>Tier 2 (Letter):</strong> Locks one tile on the board and eliminates 2 decoy rack letters.
            </p>
            <p>
              <strong>Tier 3 (Reveal):</strong> Solves and locks the full rung.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-11 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
