import React from 'react';
import { ArrowDownToLine, Check, Lock, Sparkles } from 'lucide-react';
import { PuzzleDefinition } from '../data/puzzles';
import { BoardState, changedLetterIndex, hammingDistance, isRungLocked, TileFeedback } from '../game/rules';

interface ChainBoardProps {
  puzzle: PuzzleDefinition;
  board: BoardState;
  flipNonceByRung: number[];
  shakeRungIndex: number | null;
  lastPopKey: string | null;
  onSelectSlot: (rungIndex: number, slotIndex: number) => void;
  onCarryAdjacent: (rungIndex: number) => void;
}

function getTileStyle(fb: TileFeedback, isActiveSlot: boolean, isLockedSlot: boolean): string {
  const focusRing = isActiveSlot ? 'ring-2 ring-[#15803d] ring-offset-2 ring-offset-white' : '';
  switch (fb) {
    case 'anchor':
      return `bg-[#181a18] text-[#f4f3ef] border-[#181a18] border-b-[3px] border-b-black ${focusRing}`;
    case 'exact':
      return `bg-[#15803d] text-white border-[#14532d] border-b-[3px] border-b-[#052e16] ${focusRing}`;
    case 'present':
      return `bg-[#b45309] text-white border-[#92400e] border-b-[3px] border-b-[#451a03] ${focusRing}`;
    case 'absent':
      return `bg-[#52554e] text-white border-[#3f423c] border-b-[3px] border-b-[#272925] ${focusRing}`;
    case 'hint':
      return `bg-[#1d4ed8] text-white border-[#1e40af] border-b-[3px] border-b-[#172554] ${focusRing}`;
    case 'draft':
      return `bg-white text-[#181a18] border-[#8b8980] border-b-[3px] border-b-[#6f6d65] ${isLockedSlot ? 'ring-1 ring-[#1d4ed8]/40' : ''} ${focusRing}`;
    default:
      return `bg-[#f8f7f3] text-[#181a18] border-[#d6d3cb] border-b-[2px] border-b-[#c2beb4] ${focusRing}`;
  }
}

export const ChainBoard: React.FC<ChainBoardProps> = ({
  puzzle,
  board,
  flipNonceByRung,
  shakeRungIndex,
  lastPopKey,
  onSelectSlot,
  onCarryAdjacent,
}) => {
  // Determine visible feedback for a slot in a middle rung
  const getSlotFeedback = (rungIdx: number, slotIdx: number): TileFeedback => {
    const rung = board.rungs[rungIdx];
    const ch = rung.letters[slotIdx];
    if (!ch) return 'empty';

    if (rung.status === 'hint-solved') return 'hint';
    if (rung.status === 'solved') return 'exact';
    if (rung.lockedIndices.includes(slotIdx)) return 'hint';

    // If current draft matches the last checked guess on this rung, show that guess's evaluated tile state!
    const lastGuess = rung.guesses[rung.guesses.length - 1];
    if (lastGuess && lastGuess.word === rung.letters.join('')) {
      return lastGuess.feedback[slotIdx];
    }

    return 'draft';
  };

  // Compute link indicator between full chain indices i and i+1 (0..4)
  const getBridgeState = (upperFullIdx: number) => {
    const getWord = (idx: number): string | null => {
      if (idx === 0) return puzzle.words[0];
      if (idx === 5) return puzzle.words[5];
      return board.rungs[idx - 1].acceptedWord;
    };

    const upper = getWord(upperFullIdx);
    const lower = getWord(upperFullIdx + 1);
    if (upper && lower && hammingDistance(upper, lower) === 1) {
      const idx = changedLetterIndex(upper, lower)!;
      return {
        linked: true,
        label: `${upper[idx]} → ${lower[idx]}`,
      };
    }
    return { linked: false, label: '1 letter' };
  };

  // Determine whether Carry Adjacent is available for a rung
  const getCarrySourceWord = (rungIdx: number): string | null => {
    if (rungIdx === 0) return puzzle.words[0];
    if (rungIdx === 3) return puzzle.words[5];
    const prevAccepted = board.rungs[rungIdx - 1].acceptedWord;
    if (prevAccepted) return prevAccepted;
    const nextAccepted = board.rungs[rungIdx + 1].acceptedWord;
    if (nextAccepted) return nextAccepted;
    return null;
  };

  return (
    <section
      aria-label="Word chain board"
      className="bg-white border border-[rgba(24,26,24,0.12)] rounded-2xl p-4 sm:p-6 shadow-[0_8px_24px_rgba(24,26,24,0.05)] flex flex-col items-center"
    >
      {/* START ANCHOR */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-3 px-2 py-1.5 rounded-xl bg-[#f8f7f3] border border-[rgba(24,26,24,0.08)]">
        <span className="w-14 sm:w-16 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#5b5e58] whitespace-nowrap shrink-0">
          Start
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {puzzle.words[0].split('').map((ch, idx) => (
            <div
              key={idx}
              className={`w-11 h-11 sm:w-13 sm:h-13 rounded-lg border font-bold text-lg sm:text-2xl flex items-center justify-center select-none ${getTileStyle('anchor', false, false)}`}
            >
              {ch}
            </div>
          ))}
        </div>
        <span className="w-14 sm:w-16 text-right text-[11px] font-mono text-[#5b5e58] whitespace-nowrap shrink-0">
          Anchor
        </span>
      </div>

      {/* BRIDGE 0 -> 1 */}
      {(() => {
        const b = getBridgeState(0);
        return (
          <div className="flex items-center justify-center h-6 my-0.5">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                b.linked ? 'text-[#15803d] font-semibold animate-link-snap' : 'text-[#5b5e58]/70'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
              {b.label}
            </span>
          </div>
        );
      })()}

      {/* 4 MIDDLE RUNGS */}
      {board.rungs.map((rung, rungIdx) => {
        const isActive = board.activeRungIndex === rungIdx && board.outcome === 'playing';
        const locked = isRungLocked(rung);
        const carrySource = getCarrySourceWord(rungIdx);
        const flipNonce = flipNonceByRung[rungIdx];
        const isShaking = shakeRungIndex === rungIdx;
        const bridgeAfter = getBridgeState(rungIdx + 1);

        return (
          <React.Fragment key={rungIdx}>
            <div
              className={`w-full flex items-center justify-between gap-2 sm:gap-3 px-2 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-[#f4f7f4] border border-[#15803d]/35'
                  : 'bg-transparent border border-transparent hover:bg-[#f8f7f3]'
              } ${isShaking ? 'animate-rung-shake' : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelectSlot(rungIdx, 0)}
                className="w-14 sm:w-16 text-left flex flex-col shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#15803d] rounded"
                aria-label={`Select Rung ${rungIdx + 1}`}
              >
                <span
                  className={`text-xs font-mono font-semibold whitespace-nowrap ${
                    isActive ? 'text-[#15803d]' : 'text-[#5b5e58]'
                  }`}
                >
                  Rung {rungIdx + 1}
                </span>
                <span className="text-[11px] text-[#5b5e58] flex items-center gap-1 whitespace-nowrap">
                  {rung.status === 'solved' && (
                    <>
                      <Check className="w-3 h-3 text-[#15803d]" aria-hidden="true" />
                      Solved
                    </>
                  )}
                  {rung.status === 'hint-solved' && (
                    <>
                      <Sparkles className="w-3 h-3 text-[#1d4ed8]" aria-hidden="true" />
                      Revealed
                    </>
                  )}
                  {rung.status === 'bridged' && 'Bridged'}
                  {rung.status === 'unsolved' && (rung.hintTier > 0 ? `Hint ${rung.hintTier}/3` : 'Open')}
                </span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2" role="group" aria-label={`Rung ${rungIdx + 1} letter slots`}>
                {[0, 1, 2, 3].map((slotIdx) => {
                  const ch = rung.letters[slotIdx];
                  const fb = getSlotFeedback(rungIdx, slotIdx);
                  const isSlotActive = isActive && board.activeSlotIndex === slotIdx && !locked;
                  const isSlotLocked = rung.lockedIndices.includes(slotIdx);
                  const isShiftHighlight = rung.shiftIndex === slotIdx && !locked;
                  const popKey = `${rungIdx}-${slotIdx}`;
                  const justPopped = lastPopKey === popKey;

                  return (
                    <button
                      key={`${slotIdx}-${flipNonce}`}
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectSlot(rungIdx, slotIdx);
                      }}
                      aria-label={`Rung ${rungIdx + 1} slot ${slotIdx + 1}${ch ? `: ${ch}` : ': empty'}${isSlotLocked ? ' (locked hint)' : ''}`}
                      style={
                        flipNonce > 0
                          ? { animationDelay: `${slotIdx * 75}ms` }
                          : undefined
                      }
                      className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-lg border font-bold text-lg sm:text-2xl flex items-center justify-center transition-transform cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d] ${getTileStyle(fb, isSlotActive, isSlotLocked)} ${flipNonce > 0 ? 'animate-tile-flip' : justPopped ? 'animate-tile-pop' : ''}`}
                    >
                      <span>{ch}</span>
                      {/* Non-hue-only affordance corner marks */}
                      {fb === 'exact' && (
                        <Check className="w-2.5 h-2.5 absolute top-1 right-1 opacity-85" aria-hidden="true" />
                      )}
                      {fb === 'present' && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-white/90 absolute top-1.5 right-1.5"
                          aria-hidden="true"
                        />
                      )}
                      {isSlotLocked && fb !== 'hint' && (
                        <Lock className="w-2.5 h-2.5 absolute top-1 right-1 text-[#1d4ed8]" aria-hidden="true" />
                      )}
                      {isShiftHighlight && !ch && (
                        <span
                          className="w-4 h-0.5 rounded-full bg-[#b45309] absolute bottom-1.5"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="w-14 sm:w-16 flex justify-end shrink-0">
                {!locked && carrySource && isActive ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onCarryAdjacent(rungIdx);
                    }}
                    title={`Copy letters from ${carrySource}`}
                    aria-label={`Carry letters from ${carrySource} into Rung ${rungIdx + 1}`}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-[#181a18] bg-[#eae8e1] hover:bg-[#dcd8ce] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ArrowDownToLine className="w-3 h-3" aria-hidden="true" />
                    Carry
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-[#5b5e58]">
                    {rung.guesses.length > 0 ? `${rung.guesses.length}×` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* BRIDGE BELOW RUNG */}
            <div className="flex items-center justify-center h-6 my-0.5">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                  bridgeAfter.linked ? 'text-[#15803d] font-semibold animate-link-snap' : 'text-[#5b5e58]/70'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                {bridgeAfter.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* GOAL ANCHOR */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-3 px-2 py-1.5 rounded-xl bg-[#f0f7f2] border border-[#15803d]/25">
        <span className="w-14 sm:w-16 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#15803d] whitespace-nowrap shrink-0">
          Goal
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {puzzle.words[5].split('').map((ch, idx) => (
            <div
              key={idx}
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-lg border border-[#14532d] border-b-[3px] border-b-[#052e16] bg-[#15803d] text-white font-bold text-lg sm:text-2xl flex items-center justify-center select-none"
            >
              {ch}
            </div>
          ))}
        </div>
        <span className="w-14 sm:w-16 text-right text-[11px] font-mono text-[#15803d] whitespace-nowrap shrink-0">
          Target
        </span>
      </div>
    </section>
  );
};
