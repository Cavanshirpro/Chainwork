import React from 'react';
import { CornerDownLeft, Delete, RotateCcw } from 'lucide-react';
import { PuzzleDefinition } from '../data/puzzles';
import { BoardState, isRungLocked } from '../game/rules';

interface TileRackProps {
  puzzle: PuzzleDefinition;
  board: BoardState;
  onPlaceLetter: (letter: string) => void;
  onBackspace: () => void;
  onClearRung: () => void;
  onCheckRung: () => void;
}

export const TileRack: React.FC<TileRackProps> = ({
  puzzle,
  board,
  onPlaceLetter,
  onBackspace,
  onClearRung,
  onCheckRung,
}) => {
  const activeRung = board.rungs[board.activeRungIndex];
  const isLocked = isRungLocked(activeRung) || board.outcome !== 'playing';
  const isReadyToCheck = !isLocked && activeRung.letters.every((ch) => ch !== '');

  return (
    <section
      aria-label="Letter tile rack"
      className="bg-white border border-[rgba(24,26,24,0.12)] rounded-2xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(24,26,24,0.05)]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#181a18]">
          Available Tile Rack ({puzzle.tileRack.length} Letters)
        </span>
        <span className="text-xs text-[#5b5e58]">
          Editing Rung {board.activeRungIndex + 1} · Slot {board.activeSlotIndex + 1}
        </span>
      </div>

      {/* 12-tile letterpress rack */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mb-3.5">
        {puzzle.tileRack.map((letter) => {
          const isEliminated = board.eliminatedRackLetters.includes(letter);
          const isConfirmed = board.confirmedRackLetters.includes(letter);

          return (
            <button
              key={letter}
              type="button"
              disabled={isLocked || isEliminated}
              onClick={(e) => {
                e.currentTarget.blur();
                onPlaceLetter(letter);
              }}
              aria-label={`Place letter ${letter}${isEliminated ? ' (eliminated)' : isConfirmed ? ' (in chain)' : ''}`}
              className={`relative h-12 rounded-lg border font-bold text-lg flex items-center justify-center transition-all select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d] ${
                isEliminated
                  ? 'bg-[#f4f3ef] text-[#5b5e58]/40 border-[#e2e0d8] line-through cursor-not-allowed'
                  : isConfirmed
                    ? 'bg-[#f0fdf4] hover:bg-[#dcfce7] active:translate-y-px text-[#14532d] border-[#86efac] border-b-[3px] border-b-[#15803d]'
                    : 'bg-[#f8f7f3] hover:bg-[#eae8e1] active:translate-y-px text-[#181a18] border-[#c8c4ba] border-b-[3px] border-b-[#9f9a8e]'
              }`}
            >
              <span>{letter}</span>
              {isConfirmed && !isEliminated && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#15803d] absolute top-1.5 right-1.5"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Action Strip */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isLocked}
            onClick={(e) => {
              e.currentTarget.blur();
              onBackspace();
            }}
            aria-label="Backspace letter"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg bg-[#eae8e1] hover:bg-[#dcd8ce] disabled:opacity-50 text-[#181a18] font-medium text-xs transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Delete className="w-4 h-4" aria-hidden="true" />
            Backspace
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={(e) => {
              e.currentTarget.blur();
              onClearRung();
            }}
            aria-label="Clear unlocked tiles in active rung"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg bg-[#eae8e1] hover:bg-[#dcd8ce] disabled:opacity-50 text-[#181a18] font-medium text-xs transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onCheckRung();
          }}
          disabled={!isReadyToCheck}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-[#15803d] hover:bg-[#166534] disabled:bg-[#eae8e1] disabled:text-[#5b5e58] text-white font-semibold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
        >
          <CornerDownLeft className="w-4 h-4" aria-hidden="true" />
          Check Rung
        </button>
      </div>
    </section>
  );
};
