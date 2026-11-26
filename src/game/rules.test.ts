import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, getDailyPuzzle, getPuzzleNumber } from '../data/puzzles';
import { isValidDictionaryWord } from '../data/dictionary';
import {
  applyHintTier,
  changedLetterIndex,
  createInitialBoard,
  evaluateTiles,
  generateShareText,
  hammingDistance,
  submitRungGuess,
} from './rules';
import { buildWeeklyCompletionSeries, DEFAULT_STATS } from './storage';

test('all puzzles have valid 6-word 1-letter-step chains in dictionary and tileRack', () => {
  for (const puzzle of PUZZLES) {
    assert.equal(puzzle.words.length, 6, `${puzzle.id} must have 6 words`);
    assert.equal(puzzle.clues.length, 4, `${puzzle.id} must have 4 clues`);
    assert.equal(puzzle.tileRack.length, 12, `${puzzle.id} must have 12 tiles in rack`);

    for (let i = 0; i < puzzle.words.length; i++) {
      const w = puzzle.words[i];
      assert.equal(w.length, 4, `${puzzle.id} word ${w} must be 4 chars`);
      assert.equal(isValidDictionaryWord(w), true, `${puzzle.id} word ${w} must be in dictionary`);

      for (const ch of w) {
        assert.equal(puzzle.tileRack.includes(ch), true, `${puzzle.id} rack missing letter ${ch} from ${w}`);
      }

      if (i > 0) {
        const dist = hammingDistance(puzzle.words[i - 1], w);
        assert.equal(dist, 1, `${puzzle.id} step ${puzzle.words[i - 1]} -> ${w} must differ by 1 letter (got ${dist})`);
        assert.notEqual(changedLetterIndex(puzzle.words[i - 1], w), null);
      }
    }

    for (const clue of puzzle.clues) {
      assert.equal(clue.trim().length > 5, true, `${puzzle.id} has empty clue`);
    }
  }
});

test('evaluateTiles handles duplicate letters accurately', () => {
  assert.deepEqual(evaluateTiles('BALL', 'BELL'), ['exact', 'absent', 'exact', 'exact']);
  assert.deepEqual(evaluateTiles('LEAL', 'TELL'), ['present', 'exact', 'absent', 'exact']);
  assert.deepEqual(evaluateTiles('COLD', 'BOLD'), ['absent', 'exact', 'exact', 'exact']);
});

test('daily puzzle mapping is deterministic and maps 2026-11-26 to #330', () => {
  assert.equal(getPuzzleNumber('2026-01-01'), 1);
  assert.equal(getPuzzleNumber('2026-11-26'), 330);
  const { puzzle, puzzleNumber } = getDailyPuzzle('2026-11-26');
  assert.equal(puzzleNumber, 330);
  assert.equal(puzzle.id, 'puzzle-01');
  assert.equal(puzzle.words[0], 'COLD');
  assert.equal(puzzle.words[5], 'WARM');
});

test('submitRungGuess validates links, updates checks, and wins canonical chain', () => {
  const puzzle = PUZZLES[0]; // COLD -> BOLD -> BALD -> BARD -> WARD -> WARM
  let board = createInitialBoard(puzzle);

  // Invalid word rejected without consuming check
  const invalid = submitRungGuess(board, puzzle, 0, 'ZZZZ');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.board.checksUsed, 0);

  // Invalid jump (>1 letter from COLD) rejected without consuming check
  const jump = submitRungGuess(board, puzzle, 0, 'WARM');
  assert.equal(jump.valid, false);
  assert.equal(jump.board.checksUsed, 0);

  // Valid alternate bridge CORD on rung 0 consumes 1 check and bridges
  const bridge = submitRungGuess(board, puzzle, 0, 'CORD');
  assert.equal(bridge.valid, true);
  assert.equal(bridge.solvedRung, false);
  assert.equal(bridge.board.checksUsed, 1);
  assert.equal(bridge.board.rungs[0].status, 'bridged');
  board = bridge.board;

  // Solve canonical rungs 0..3
  for (let i = 0; i < 4; i++) {
    const res = submitRungGuess(board, puzzle, i, puzzle.words[i + 1]);
    assert.equal(res.valid, true);
    assert.equal(res.solvedRung, true);
    board = res.board;
  }

  assert.equal(board.outcome, 'won');
  assert.equal(board.winMode, 'canonical');
  assert.equal(board.checksUsed, 5);
});

test('alternate complete 4-rung chain also wins', () => {
  const puzzle = PUZZLES[0]; // COLD -> ... -> WARM
  let board = createInitialBoard(puzzle);

  // Alternate chain: COLD -> CORD -> LORD -> LARD -> WARD -> WARM
  // Verify every letter of CORD/LORD/LARD/WARD is in rack or add test rack puzzle
  const altPuzzle = {
    ...puzzle,
    tileRack: Array.from(new Set([...puzzle.tileRack, 'R', 'L', 'W', 'C', 'O', 'D', 'A', 'M'])).sort(),
  };

  for (const [idx, word] of ['CORD', 'LORD', 'LARD', 'WARD'].entries()) {
    const res = submitRungGuess(board, altPuzzle, idx, word);
    assert.equal(res.valid, true, `Failed on ${word}: ${res.error}`);
    board = res.board;
  }

  assert.equal(board.outcome, 'won');
  assert.equal(board.winMode, 'alternate');
});

test('three-tier hint system progresses cleanly Tier 1 -> Tier 2 -> Tier 3', () => {
  const puzzle = PUZZLES[0];
  let board = createInitialBoard(puzzle);

  const t1 = applyHintTier(board, puzzle, 0);
  assert.equal(t1.applied, true);
  assert.equal(t1.tier, 1);
  assert.equal(t1.board.rungs[0].shiftIndex, 0);
  board = t1.board;

  const t2 = applyHintTier(board, puzzle, 0);
  assert.equal(t2.applied, true);
  assert.equal(t2.tier, 2);
  assert.equal(t2.board.rungs[0].letters[0], 'B');
  assert.equal(t2.board.rungs[0].lockedIndices.includes(0), true);
  assert.equal(t2.board.eliminatedRackLetters.length > 0, true);
  board = t2.board;

  const t3 = applyHintTier(board, puzzle, 0);
  assert.equal(t3.applied, true);
  assert.equal(t3.tier, 3);
  assert.equal(t3.board.rungs[0].status, 'hint-solved');
  assert.equal(t3.board.rungs[0].acceptedWord, 'BOLD');
});

test('share text is strictly spoiler-free and excludes puzzle words', () => {
  const puzzle = PUZZLES[0];
  let board = createInitialBoard(puzzle);
  board = submitRungGuess(board, puzzle, 0, 'BOLD').board;
  board = applyHintTier(board, puzzle, 1).board;
  board = applyHintTier(board, puzzle, 1).board;
  board = applyHintTier(board, puzzle, 1).board;

  const text = generateShareText({
    puzzleNumber: 330,
    startWord: puzzle.words[0],
    goalWord: puzzle.words[5],
    won: true,
    checksUsed: board.checksUsed,
    maxChecks: board.maxChecks,
    streak: 4,
    hintsUsed: 3,
    shareRows: board.shareRows,
  });

  // Must not reveal any middle rung solution words
  for (let i = 1; i <= 4; i++) {
    assert.equal(text.includes(puzzle.words[i]), false, `Share text leaked ${puzzle.words[i]}`);
  }
  assert.equal(text.includes('🟩🟩🟩🟩'), true);
  assert.equal(text.includes('🟦🟦🟦🟦'), true);
  assert.equal(text.includes('CHAINWORK #330'), true);
});

test('buildWeeklyCompletionSeries returns 7 chronological days with accurate completion counts', () => {
  const stats = {
    ...DEFAULT_STATS,
    won: 3,
    lastCompletedDateKey: '2026-11-26',
    dailyHistory: {
      '2026-11-18': { won: true, checksUsed: 6 }, // outside 7-day window
      '2026-11-21': { won: true, checksUsed: 5 },
      '2026-11-24': { won: false, checksUsed: 10 },
      '2026-11-25': { won: true, checksUsed: 4 },
      '2026-11-26': { won: true, checksUsed: 5 },
    },
  };

  const series = buildWeeklyCompletionSeries(stats, '2026-11-26');
  assert.equal(series.length, 7);
  assert.equal(series[0].dateKey, '2026-11-20');
  assert.equal(series[6].dateKey, '2026-11-26');
  assert.deepEqual(
    series.map((p) => p.completed),
    [0, 1, 0, 0, 0, 1, 1],
  );
  assert.equal(series[6].checksUsed, 5);
  assert.equal(series[4].checksUsed, 10);
});
