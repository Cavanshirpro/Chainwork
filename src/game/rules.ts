import { isValidDictionaryWord } from '../data/dictionary';
import { PuzzleDefinition } from '../data/puzzles';

export type TileFeedback = 'empty' | 'draft' | 'exact' | 'present' | 'absent' | 'hint' | 'anchor';

export type RungStatus = 'unsolved' | 'bridged' | 'solved' | 'hint-solved';

export type HintTier = 0 | 1 | 2 | 3;

export interface RungGuess {
  word: string;
  feedback: TileFeedback[];
  isExact: boolean;
}

export interface RungState {
  /** 4-character draft array (empty string '' for unfilled slots) */
  letters: [string, string, string, string];
  /** Indices locked by Tier 2 hint (0..3) */
  lockedIndices: number[];
  status: RungStatus;
  hintTier: HintTier;
  /** Index 0..3 of the letter that shifts from the previous canonical word (revealed at Tier 1) */
  shiftIndex: number | null;
  guesses: RungGuess[];
  /** Last submitted valid candidate word (preserved when bridged on alternate paths) */
  acceptedWord: string | null;
}

export interface BoardState {
  rungs: [RungState, RungState, RungState, RungState];
  activeRungIndex: number; // 0..3
  activeSlotIndex: number; // 0..3
  checksUsed: number;
  maxChecks: number;
  eliminatedRackLetters: string[];
  confirmedRackLetters: string[];
  outcome: 'playing' | 'won' | 'lost';
  winMode: 'canonical' | 'alternate' | null;
  /** Each check produces a row in the spoiler-free share log */
  shareRows: Array<{
    rungIndex: number;
    tiles: TileFeedback[];
    hintNote?: string;
  }>;
}

export const MAX_CHECKS = 10;

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Math.max(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}

export function changedLetterIndex(a: string, b: string): number | null {
  if (a.length !== b.length) return null;
  let found: number | null = null;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (found !== null) return null;
      found = i;
    }
  }
  return found;
}

export function evaluateTiles(guess: string, target: string): TileFeedback[] {
  const g = guess.toUpperCase().split('');
  const t = target.toUpperCase().split('');
  const result: TileFeedback[] = ['absent', 'absent', 'absent', 'absent'];
  const remainingTarget: Record<string, number> = {};

  // Pass 1: exact matches
  for (let i = 0; i < 4; i++) {
    if (g[i] === t[i]) {
      result[i] = 'exact';
    } else {
      remainingTarget[t[i]] = (remainingTarget[t[i]] || 0) + 1;
    }
  }

  // Pass 2: present in wrong position
  for (let i = 0; i < 4; i++) {
    if (result[i] === 'exact') continue;
    const ch = g[i];
    if (remainingTarget[ch] && remainingTarget[ch] > 0) {
      result[i] = 'present';
      remainingTarget[ch]--;
    }
  }

  return result;
}

export function createInitialBoard(_puzzle: PuzzleDefinition): BoardState {
  const emptyRung = (): RungState => ({
    letters: ['', '', '', ''],
    lockedIndices: [],
    status: 'unsolved',
    hintTier: 0,
    shiftIndex: null,
    guesses: [],
    acceptedWord: null,
  });

  return {
    rungs: [emptyRung(), emptyRung(), emptyRung(), emptyRung()],
    activeRungIndex: 0,
    activeSlotIndex: 0,
    checksUsed: 0,
    maxChecks: MAX_CHECKS,
    eliminatedRackLetters: [],
    confirmedRackLetters: [],
    outcome: 'playing',
    winMode: null,
    shareRows: [],
  };
}

export function isRungLocked(rung: RungState): boolean {
  return rung.status === 'solved' || rung.status === 'hint-solved';
}

export function getResolvedChainWord(board: BoardState, puzzle: PuzzleDefinition, fullIndex: number): string | null {
  if (fullIndex === 0) return puzzle.words[0];
  if (fullIndex === 5) return puzzle.words[5];
  const rung = board.rungs[fullIndex - 1];
  return rung.acceptedWord;
}

export function isChainComplete(board: BoardState, puzzle: PuzzleDefinition): {
  complete: boolean;
  mode: 'canonical' | 'alternate' | null;
} {
  const chain: string[] = [puzzle.words[0]];
  for (let i = 0; i < 4; i++) {
    const w = board.rungs[i].acceptedWord;
    if (!w || w.length !== 4 || !isValidDictionaryWord(w)) {
      return { complete: false, mode: null };
    }
    chain.push(w);
  }
  chain.push(puzzle.words[5]);

  for (let i = 0; i < 5; i++) {
    if (hammingDistance(chain[i], chain[i + 1]) !== 1) {
      return { complete: false, mode: null };
    }
  }

  const matchesCanonical = chain.every((w, idx) => w === puzzle.words[idx]);
  return {
    complete: true,
    mode: matchesCanonical ? 'canonical' : 'alternate',
  };
}

export function findNextUnsolvedRung(board: BoardState, fromIndex: number): number {
  for (let offset = 1; offset <= 4; offset++) {
    const idx = (fromIndex + offset) % 4;
    if (!isRungLocked(board.rungs[idx])) return idx;
  }
  return fromIndex;
}

export interface SubmissionResult {
  valid: boolean;
  error?: string;
  board: BoardState;
  solvedRung: boolean;
  completedChain: boolean;
  feedback?: TileFeedback[];
}

export function submitRungGuess(
  board: BoardState,
  puzzle: PuzzleDefinition,
  rungIndex: number,
  rawWord?: string,
): SubmissionResult {
  if (board.outcome !== 'playing') {
    return { valid: false, error: 'Puzzle already finished.', board, solvedRung: false, completedChain: false };
  }

  const rung = board.rungs[rungIndex];
  if (isRungLocked(rung)) {
    return { valid: false, error: 'This rung is already locked.', board, solvedRung: false, completedChain: false };
  }

  const word = (rawWord ?? rung.letters.join('')).toUpperCase().trim();
  if (!/^[A-Z]{4}$/.test(word)) {
    return { valid: false, error: 'Fill all 4 letter tiles first.', board, solvedRung: false, completedChain: false };
  }

  for (const ch of word) {
    if (!puzzle.tileRack.includes(ch)) {
      return {
        valid: false,
        error: `Letter "${ch}" is not in today's tile rack.`,
        board,
        solvedRung: false,
        completedChain: false,
      };
    }
  }

  if (!isValidDictionaryWord(word)) {
    return {
      valid: false,
      error: `"${word}" is not in the word list.`,
      board,
      solvedRung: false,
      completedChain: false,
    };
  }

  // Enforce 1-letter link rule against immediately adjacent locked anchors (Start, Goal, or solved rungs)
  const fullIdx = rungIndex + 1;
  const prevWord =
    fullIdx - 1 === 0
      ? puzzle.words[0]
      : isRungLocked(board.rungs[rungIndex - 1])
        ? board.rungs[rungIndex - 1].acceptedWord
        : null;
  const nextWord =
    fullIdx + 1 === 5
      ? puzzle.words[5]
      : isRungLocked(board.rungs[rungIndex + 1])
        ? board.rungs[rungIndex + 1].acceptedWord
        : null;

  if (prevWord && hammingDistance(word, prevWord) !== 1) {
    return {
      valid: false,
      error: `Must differ by 1 letter from ${prevWord}.`,
      board,
      solvedRung: false,
      completedChain: false,
    };
  }

  if (nextWord && hammingDistance(word, nextWord) !== 1) {
    return {
      valid: false,
      error: `Must differ by 1 letter from ${nextWord}.`,
      board,
      solvedRung: false,
      completedChain: false,
    };
  }

  const canonicalTarget = puzzle.words[fullIdx];
  const isCanonicalMatch = word === canonicalTarget;
  const feedback = evaluateTiles(word, canonicalTarget);

  const nextRungs = board.rungs.map((r, idx) => {
    if (idx !== rungIndex) return r;
    const guessEntry: RungGuess = {
      word,
      feedback,
      isExact: isCanonicalMatch,
    };
    return {
      ...r,
      letters: word.split('') as [string, string, string, string],
      status: isCanonicalMatch ? ('solved' as const) : ('bridged' as const),
      acceptedWord: word,
      guesses: [...r.guesses, guessEntry],
    };
  }) as [RungState, RungState, RungState, RungState];

  const confirmedSet = new Set(board.confirmedRackLetters);
  for (let i = 0; i < 4; i++) {
    if (feedback[i] === 'exact' || feedback[i] === 'present') {
      confirmedSet.add(word[i]);
    }
  }

  const checksUsed = board.checksUsed + 1;
  const updatedBoard: BoardState = {
    ...board,
    rungs: nextRungs,
    checksUsed,
    confirmedRackLetters: Array.from(confirmedSet),
    shareRows: [
      ...board.shareRows,
      {
        rungIndex,
        tiles: feedback,
      },
    ],
  };

  const chainCheck = isChainComplete(updatedBoard, puzzle);
  if (chainCheck.complete) {
    // Lock all rungs cleanly on alternate completion too
    const finalizedRungs = updatedBoard.rungs.map((r) => ({
      ...r,
      status: r.status === 'hint-solved' ? ('hint-solved' as const) : ('solved' as const),
    })) as [RungState, RungState, RungState, RungState];

    return {
      valid: true,
      board: {
        ...updatedBoard,
        rungs: finalizedRungs,
        outcome: 'won',
        winMode: chainCheck.mode,
      },
      solvedRung: true,
      completedChain: true,
      feedback,
    };
  }

  if (checksUsed >= board.maxChecks) {
    return {
      valid: true,
      board: {
        ...updatedBoard,
        outcome: 'lost',
      },
      solvedRung: isCanonicalMatch,
      completedChain: false,
      feedback,
    };
  }

  const nextActiveRung = isCanonicalMatch
    ? findNextUnsolvedRung(updatedBoard, rungIndex)
    : rungIndex;

  return {
    valid: true,
    board: {
      ...updatedBoard,
      activeRungIndex: nextActiveRung,
      activeSlotIndex: nextActiveRung !== rungIndex ? 0 : updatedBoard.activeSlotIndex,
    },
    solvedRung: isCanonicalMatch,
    completedChain: false,
    feedback,
  };
}

export interface HintResult {
  applied: boolean;
  tier: HintTier;
  board: BoardState;
  message: string;
}

export function applyHintTier(
  board: BoardState,
  puzzle: PuzzleDefinition,
  targetRungIndex: number,
): HintResult {
  if (board.outcome !== 'playing') {
    return { applied: false, tier: 0, board, message: 'Puzzle is already complete.' };
  }

  let rungIndex = targetRungIndex;
  if (isRungLocked(board.rungs[rungIndex])) {
    rungIndex = findNextUnsolvedRung(board, rungIndex);
    if (isRungLocked(board.rungs[rungIndex])) {
      return { applied: false, tier: 0, board, message: 'All rungs are already solved.' };
    }
  }

  const rung = board.rungs[rungIndex];
  const nextTier = Math.min(3, rung.hintTier + 1) as HintTier;
  if (nextTier === rung.hintTier) {
    return { applied: false, tier: rung.hintTier, board, message: 'All 3 hint tiers used on this rung.' };
  }

  const canonicalWord = puzzle.words[rungIndex + 1];
  const prevCanonical = puzzle.words[rungIndex];
  const shiftIdx = changedLetterIndex(prevCanonical, canonicalWord) ?? 0;

  // All letters genuinely used in the canonical puzzle
  const allCanonicalLetters = new Set(puzzle.words.join('').split(''));
  const decoyLetters = puzzle.tileRack.filter(
    (ch) => !allCanonicalLetters.has(ch) && !board.eliminatedRackLetters.includes(ch),
  );

  if (nextTier === 1) {
    const nextRungs = board.rungs.map((r, idx) =>
      idx === rungIndex ? { ...r, hintTier: 1 as HintTier, shiftIndex: shiftIdx } : r,
    ) as [RungState, RungState, RungState, RungState];

    return {
      applied: true,
      tier: 1,
      board: { ...board, rungs: nextRungs, activeRungIndex: rungIndex },
      message: `Clue unlocked for Rung ${rungIndex + 1}.`,
    };
  }

  if (nextTier === 2) {
    // Reveal the changed letter slot first if not already locked, else first unrevealed slot
    let revealIdx = shiftIdx;
    if (rung.lockedIndices.includes(revealIdx) || rung.letters[revealIdx] === canonicalWord[revealIdx]) {
      const candidateIdx = [0, 1, 2, 3].find(
        (i) => !rung.lockedIndices.includes(i) && rung.letters[i] !== canonicalWord[i],
      );
      revealIdx = candidateIdx ?? shiftIdx;
    }

    const updatedLetters = [...rung.letters] as [string, string, string, string];
    updatedLetters[revealIdx] = canonicalWord[revealIdx];
    const updatedLocked = Array.from(new Set([...rung.lockedIndices, revealIdx]));
    const newlyEliminated = decoyLetters.slice(0, 2);

    const nextRungs = board.rungs.map((r, idx) =>
      idx === rungIndex
        ? {
            ...r,
            hintTier: 2 as HintTier,
            shiftIndex: shiftIdx,
            letters: updatedLetters,
            lockedIndices: updatedLocked,
          }
        : r,
    ) as [RungState, RungState, RungState, RungState];

    const firstUnlocked = [0, 1, 2, 3].find((i) => !updatedLocked.includes(i)) ?? 0;

    return {
      applied: true,
      tier: 2,
      board: {
        ...board,
        rungs: nextRungs,
        activeRungIndex: rungIndex,
        activeSlotIndex: firstUnlocked,
        eliminatedRackLetters: [...board.eliminatedRackLetters, ...newlyEliminated],
        confirmedRackLetters: Array.from(new Set([...board.confirmedRackLetters, canonicalWord[revealIdx]])),
      },
      message: `Locked tile "${canonicalWord[revealIdx]}" in position ${revealIdx + 1}.`,
    };
  }

  // Tier 3: Reveal full rung word
  const nextRungs = board.rungs.map((r, idx) =>
    idx === rungIndex
      ? {
          ...r,
          hintTier: 3 as HintTier,
          shiftIndex: shiftIdx,
          letters: canonicalWord.split('') as [string, string, string, string],
          lockedIndices: [0, 1, 2, 3],
          status: 'hint-solved' as const,
          acceptedWord: canonicalWord,
        }
      : r,
  ) as [RungState, RungState, RungState, RungState];

  const updatedBoard: BoardState = {
    ...board,
    rungs: nextRungs,
    shareRows: [
      ...board.shareRows,
      {
        rungIndex,
        tiles: ['hint', 'hint', 'hint', 'hint'],
        hintNote: `R${rungIndex + 1} Revealed`,
      },
    ],
  };

  const chainCheck = isChainComplete(updatedBoard, puzzle);
  if (chainCheck.complete) {
    return {
      applied: true,
      tier: 3,
      board: {
        ...updatedBoard,
        outcome: 'won',
        winMode: chainCheck.mode,
      },
      message: `Rung ${rungIndex + 1} revealed — Chain complete!`,
    };
  }

  const nextActive = findNextUnsolvedRung(updatedBoard, rungIndex);
  return {
    applied: true,
    tier: 3,
    board: {
      ...updatedBoard,
      activeRungIndex: nextActive,
      activeSlotIndex: 0,
    },
    message: `Revealed Rung ${rungIndex + 1}.`,
  };
}

export function countTotalHintTiersUsed(board: BoardState): number {
  return board.rungs.reduce((sum, r) => sum + r.hintTier, 0);
}

export function tileFeedbackToEmoji(fb: TileFeedback): string {
  switch (fb) {
    case 'exact':
      return '🟩';
    case 'present':
      return '🟨';
    case 'hint':
      return '🟦';
    default:
      return '⬜';
  }
}

export function generateShareText(params: {
  puzzleNumber: number;
  startWord: string;
  goalWord: string;
  won: boolean;
  checksUsed: number;
  maxChecks: number;
  streak: number;
  hintsUsed: number;
  shareRows: BoardState['shareRows'];
}): string {
  const scoreLabel = params.won ? `${params.checksUsed}/${params.maxChecks}` : `X/${params.maxChecks}`;
  const header = `CHAINWORK #${params.puzzleNumber} · ${scoreLabel}`;
  const sub = `${params.startWord} → ${params.goalWord} · Streak ${params.streak}`;
  const grid = params.shareRows.map((row) => row.tiles.map(tileFeedbackToEmoji).join('')).join('\n');
  const footer = params.hintsUsed === 0 ? 'Hints: None (Pure Solve)' : `Hints: ${params.hintsUsed} tier${params.hintsUsed === 1 ? '' : 's'} used`;

  return [header, sub, '', grid, '', footer].filter((line, idx, arr) => !(line === '' && arr[idx - 1] === '')).join('\n');
}
