import React, { useState } from 'react';
import { BookOpen, Layers, Play } from 'lucide-react';
import { PuzzleDefinition } from '../data/puzzles';
import { TileFeedback } from '../game/rules';

interface TitleScreenProps {
  puzzleNumber: number;
  dailyPuzzle: PuzzleDefinition;
  dailyCompleted: boolean;
  dailyInProgress: boolean;
  currentStreak: number;
  onStartDaily: () => void;
  onStartPractice: () => void;
  onOpenRules: () => void;
}

const SPECIMEN_ROWS: Array<{
  word: string;
  label: string;
  feedback: TileFeedback[];
}> = [
  { word: 'DUSK', label: 'Start', feedback: ['anchor', 'anchor', 'anchor', 'anchor'] },
  { word: 'DESK', label: 'U → E', feedback: ['exact', 'exact', 'exact', 'exact'] },
  { word: 'DECK', label: 'S → C', feedback: ['exact', 'exact', 'exact', 'exact'] },
  { word: 'PECK', label: 'D → P', feedback: ['hint', 'exact', 'exact', 'exact'] },
  { word: 'PEAK', label: 'Goal', feedback: ['anchor', 'anchor', 'anchor', 'anchor'] },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  puzzleNumber,
  dailyPuzzle,
  dailyCompleted,
  dailyInProgress,
  currentStreak,
  onStartDaily,
  onStartPractice,
  onOpenRules,
}) => {
  const [flippedTile, setFlippedTile] = useState<string | null>(null);

  const handleSpecimenClick = (rIdx: number, cIdx: number) => {
    const key = `${rIdx}-${cIdx}`;
    setFlippedTile(null);
    requestAnimationFrame(() => setFlippedTile(key));
  };

  const getTileClasses = (fb: TileFeedback) => {
    switch (fb) {
      case 'anchor':
        return 'bg-[#181a18] text-[#f4f3ef] border-[#181a18] border-b-[3px] border-b-black';
      case 'exact':
        return 'bg-[#15803d] text-white border-[#14532d] border-b-[3px] border-b-[#052e16]';
      case 'present':
        return 'bg-[#b45309] text-white border-[#92400e] border-b-[3px] border-b-[#451a03]';
      case 'hint':
        return 'bg-[#1d4ed8] text-white border-[#1e40af] border-b-[3px] border-b-[#172554]';
      default:
        return 'bg-white text-[#181a18] border-[#d6d3cb] border-b-[3px] border-b-[#bab6ac]';
    }
  };

  const ctaLabel = dailyCompleted
    ? "View Today's Result"
    : dailyInProgress
      ? 'Resume Daily Puzzle'
      : "Play Today's Puzzle";

  return (
    <main className="paper-grid-bg min-h-screen w-full flex flex-col justify-between px-6 py-8 md:px-12 lg:px-20">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          {/* Left Column: Bespoke SVG Emblem, Metadata & Primary CTA over calm negative space */}
          <section className="flex flex-col items-start text-left max-w-xl">
            <div className="mb-6">
              <svg
                viewBox="0 0 320 68"
                className="w-64 sm:w-72 h-auto"
                role="img"
                aria-label="Chainwork emblem"
              >
                {/* Interlocking letterpress tile motif */}
                <rect x="2" y="8" width="44" height="48" rx="7" fill="#181a18" />
                <rect x="2" y="8" width="44" height="44" rx="7" fill="#ffffff" stroke="#181a18" strokeWidth="2.5" />
                <text
                  x="24"
                  y="38"
                  textAnchor="middle"
                  fill="#181a18"
                  fontFamily="Fraunces, Georgia, serif"
                  fontWeight="700"
                  fontSize="24"
                >
                  C
                </text>

                <path
                  d="M48 30 H62"
                  stroke="#15803d"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="55" cy="30" r="3.5" fill="#15803d" />

                <rect x="64" y="8" width="44" height="48" rx="7" fill="#052e16" />
                <rect x="64" y="8" width="44" height="44" rx="7" fill="#15803d" stroke="#14532d" strokeWidth="2" />
                <text
                  x="86"
                  y="38"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily="Fraunces, Georgia, serif"
                  fontWeight="700"
                  fontSize="24"
                >
                  W
                </text>

                <text
                  x="126"
                  y="40"
                  fill="#181a18"
                  fontFamily="Fraunces, Georgia, serif"
                  fontWeight="700"
                  fontSize="32"
                  letterSpacing="-0.5"
                >
                  Chainwork
                </text>
              </svg>
            </div>

            <h1
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#181a18] leading-[1.1] mb-4"
              style={{ textWrap: 'balance' }}
            >
              Bridge two words, one shifted tile at a time.
            </h1>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[#5b5e58] font-medium mb-8 tabular-nums">
              <span>Daily #{puzzleNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{dailyPuzzle.title}</span>
              <span aria-hidden="true">·</span>
              <span>
                {dailyPuzzle.words[0]} → {dailyPuzzle.words[5]}
              </span>
              {currentStreak > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#15803d] font-semibold">Streak {currentStreak}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                data-start="true"
                onClick={onStartDaily}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#15803d] hover:bg-[#166534] active:translate-y-px text-white font-semibold text-base shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                {ctaLabel}
              </button>

              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-white hover:bg-[#eae8e1] text-[#181a18] border border-[rgba(24,26,24,0.16)] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181a18]"
              >
                <Layers className="w-4 h-4" aria-hidden="true" />
                Practice Archive
              </button>

              <button
                type="button"
                onClick={onOpenRules}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-[#5b5e58] hover:text-[#181a18] underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                How to Play
              </button>
            </div>
          </section>

          {/* Right Column: Interactive Letterpress Specimen Showcase */}
          <aside
            aria-label="Interactive word-chain preview"
            className="bg-white border border-[rgba(24,26,24,0.12)] rounded-2xl p-6 sm:p-7 shadow-[0_12px_32px_rgba(24,26,24,0.06)] max-w-md w-full mx-auto"
          >
            <div className="flex items-center justify-between text-xs font-medium text-[#5b5e58] mb-5">
              <span>Specimen Chain</span>
              <span>Click any tile to flip</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              {SPECIMEN_ROWS.map((row, rIdx) => (
                <React.Fragment key={row.word}>
                  <div className="flex items-center gap-3 w-full justify-between">
                    <span className="w-12 text-right font-mono text-[11px] uppercase tracking-wider text-[#5b5e58]">
                      {row.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {row.word.split('').map((ch, cIdx) => {
                        const isFlipped = flippedTile === `${rIdx}-${cIdx}`;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => handleSpecimenClick(rIdx, cIdx)}
                            aria-label={`Flip specimen letter ${ch}`}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border font-bold text-lg sm:text-xl flex items-center justify-center transition-transform hover:-translate-y-0.5 cursor-pointer select-none ${getTileClasses(row.feedback[cIdx])} ${isFlipped ? 'animate-tile-flip' : ''}`}
                          >
                            {ch}
                          </button>
                        );
                      })}
                    </div>
                    <span className="w-12" aria-hidden="true" />
                  </div>
                  {rIdx < SPECIMEN_ROWS.length - 1 && (
                    <div className="h-3 w-px bg-[rgba(24,26,24,0.18)]" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[rgba(24,26,24,0.08)] flex items-center justify-between text-xs text-[#5b5e58]">
              <span>1-letter step per rung</span>
              <span>3-tier progressive hints</span>
            </div>
          </aside>
        </div>
      </div>

      {/* Single flat control hint line in bottom safe margin */}
      <footer className="pt-6 text-center text-xs text-[#5b5e58] tracking-wide">
        Enter Start · Type A–Z or Click Tiles · ↑↓ Switch Rung · Esc Pause
      </footer>
    </main>
  );
};
