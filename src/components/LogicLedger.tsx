import React from 'react';
import { Eye, KeyRound, Lightbulb, Sparkles } from 'lucide-react';
import { PuzzleDefinition } from '../data/puzzles';
import { BoardState, isRungLocked, TileFeedback } from '../game/rules';

interface LogicLedgerProps {
  puzzle: PuzzleDefinition;
  board: BoardState;
  statusMessage: { text: string; tone: 'neutral' | 'error' | 'success' | 'hint' } | null;
  onUseHint: () => void;
}

const MINI_TILE_CLASS: Record<TileFeedback, string> = {
  exact: 'bg-[#15803d] text-white',
  present: 'bg-[#b45309] text-white',
  absent: 'bg-[#52554e] text-white',
  hint: 'bg-[#1d4ed8] text-white',
  draft: 'bg-[#eae8e1] text-[#181a18]',
  empty: 'bg-[#eae8e1] text-[#181a18]',
  anchor: 'bg-[#181a18] text-white',
};

export const LogicLedger: React.FC<LogicLedgerProps> = ({
  puzzle,
  board,
  statusMessage,
  onUseHint,
}) => {
  const activeIdx = board.activeRungIndex;
  const activeRung = board.rungs[activeIdx];
  const isLocked = isRungLocked(activeRung);
  const nextTier = Math.min(3, activeRung.hintTier + 1);

  const tierItems = [
    {
      tier: 1,
      label: 'Tier 1 · Clue',
      desc: 'Reveals definition & shifting slot',
      icon: Lightbulb,
    },
    {
      tier: 2,
      label: 'Tier 2 · Letter',
      desc: 'Locks a tile & prunes 2 decoys',
      icon: KeyRound,
    },
    {
      tier: 3,
      label: 'Tier 3 · Reveal',
      desc: 'Solves and locks full rung',
      icon: Eye,
    },
  ];

  return (
    <aside
      aria-label="Hints and tile deduction log"
      className="bg-white border border-[rgba(24,26,24,0.12)] rounded-2xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(24,26,24,0.05)] flex flex-col gap-4"
    >
      {/* Inline Status / Feedback Banner */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`px-3 py-2 rounded-lg text-xs font-medium border ${
            statusMessage.tone === 'error'
              ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
              : statusMessage.tone === 'success'
                ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                : statusMessage.tone === 'hint'
                  ? 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]'
                  : 'bg-[#f8f7f3] text-[#181a18] border-[rgba(24,26,24,0.1)]'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Three-Tier Hint Panel */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-[#181a18]">
            Three-Tier Hints · Rung {activeIdx + 1}
          </h2>
          <span className="text-xs font-mono text-[#5b5e58] tabular-nums">
            Tier {activeRung.hintTier}/3
          </span>
        </div>

        {/* Tier progression indicators */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {tierItems.map((item) => {
            const Icon = item.icon;
            const unlocked = activeRung.hintTier >= item.tier;
            return (
              <div
                key={item.tier}
                className={`rounded-lg px-2.5 py-2 border text-left transition-colors ${
                  unlocked
                    ? 'bg-[#eff6ff] border-[#93c5fd] text-[#1e3a8a]'
                    : 'bg-[#f8f7f3] border-[rgba(24,26,24,0.08)] text-[#5b5e58]'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>T{item.tier}</span>
                </div>
                <div className="text-[11px] leading-tight mt-0.5 truncate">
                  {item.label.split('· ')[1]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Revealed Tier 1 Clue Card */}
        {activeRung.hintTier >= 1 ? (
          <div className="rounded-lg bg-[#f8f7f3] border border-[rgba(24,26,24,0.1)] px-3 py-2.5 mb-3">
            <div className="text-xs font-semibold text-[#181a18] mb-0.5">
              “{puzzle.clues[activeIdx]}”
            </div>
            {activeRung.shiftIndex !== null && (
              <div className="text-[11px] text-[#5b5e58] font-mono">
                Tile {activeRung.shiftIndex + 1} shifts from previous rung
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-[#f8f7f3] border border-dashed border-[rgba(24,26,24,0.14)] px-3 py-2.5 mb-3 text-xs text-[#5b5e58]">
            Unlock Tier 1 to reveal Rung {activeIdx + 1}’s definition clue and shifting letter index.
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onUseHint();
          }}
          disabled={isLocked || board.outcome !== 'playing' || activeRung.hintTier >= 3}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-[#eae8e1] disabled:text-[#5b5e58] text-white font-semibold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          {isLocked
            ? `Rung ${activeIdx + 1} Locked`
            : activeRung.hintTier >= 3
              ? 'All 3 Hints Used'
              : `Use Tier ${nextTier} Hint: ${tierItems[nextTier - 1].label.split('· ')[1]}`}
        </button>
      </div>

      {/* Deduction History for Active Rung */}
      <div className="pt-3 border-t border-[rgba(24,26,24,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[#181a18]">
            Rung {activeIdx + 1} Checks
          </h3>
          <span className="text-[11px] font-mono text-[#5b5e58] tabular-nums">
            {activeRung.guesses.length} recorded
          </span>
        </div>

        {activeRung.guesses.length === 0 ? (
          <p className="text-xs text-[#5b5e58]">
            No checks on Rung {activeIdx + 1} yet. Place 4 tiles and press Enter to evaluate.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
            {activeRung.guesses.map((g, gIdx) => (
              <div
                key={gIdx}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-[#f8f7f3]"
              >
                <div className="flex items-center gap-1">
                  {g.word.split('').map((ch, cIdx) => (
                    <span
                      key={cIdx}
                      className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${MINI_TILE_CLASS[g.feedback[cIdx]]}`}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-[#5b5e58]">
                  {g.isExact ? 'Exact' : `${g.feedback.filter((f) => f === 'exact').length}/4 match`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="pt-3 border-t border-[rgba(24,26,24,0.1)] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#5b5e58]">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#15803d]" aria-hidden="true" /> Exact
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#b45309]" aria-hidden="true" /> In Rung
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#52554e]" aria-hidden="true" /> Miss
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#1d4ed8]" aria-hidden="true" /> Hint
        </span>
      </div>
    </aside>
  );
};
