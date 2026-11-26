import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, HelpCircle, Pause, Volume2, VolumeX } from 'lucide-react';
import { getDailyPuzzle, getLocalDateKey, PUZZLES, PuzzleDefinition } from './data/puzzles';
import {
  applyHintTier,
  BoardState,
  countTotalHintTiersUsed,
  createInitialBoard,
  isRungLocked,
  submitRungGuess,
} from './game/rules';
import {
  loadDailySession,
  loadMuted,
  loadStats,
  PlayerStats,
  recordDailyOutcome,
  saveDailySession,
  saveMuted,
} from './game/storage';
import { soundEngine } from './utils/sound';
import { haptics } from './utils/haptics';
import { TitleScreen } from './components/TitleScreen';
import { ChainBoard } from './components/ChainBoard';
import { LogicLedger } from './components/LogicLedger';
import { TileRack } from './components/TileRack';
import { OutcomeModal, PauseModal, RulesModal, StatsModal } from './components/Modals';

type ScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const dateKey = useMemo(() => getLocalDateKey(), []);
  const daily = useMemo(() => getDailyPuzzle(dateKey), [dateKey]);

  const initialSession = useMemo(() => loadDailySession(dateKey), [dateKey]);
  const [stats, setStats] = useState<PlayerStats>(() => loadStats());
  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadMuted();
    soundEngine.setMuted(m);
    return m;
  });

  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [practicePuzzleId, setPracticePuzzleId] = useState<string>(PUZZLES[1].id);

  const [dailyBoard, setDailyBoard] = useState<BoardState>(() =>
    initialSession ? initialSession.board : createInitialBoard(daily.puzzle),
  );
  const [dailyRecorded, setDailyRecorded] = useState<boolean>(() => initialSession?.recordedInStats ?? false);
  const [practiceBoard, setPracticeBoard] = useState<BoardState>(() => createInitialBoard(PUZZLES[1]));

  const [screen, setScreen] = useState<ScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  const [flipNonceByRung, setFlipNonceByRung] = useState<number[]>([0, 0, 0, 0]);
  const [shakeRungIndex, setShakeRungIndex] = useState<number | null>(null);
  const [lastPopKey, setLastPopKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    tone: 'neutral' | 'error' | 'success' | 'hint';
  } | null>(null);

  const activePuzzle: PuzzleDefinition = useMemo(() => {
    if (mode === 'daily') return daily.puzzle;
    return PUZZLES.find((p) => p.id === practicePuzzleId) ?? PUZZLES[0];
  }, [mode, daily.puzzle, practicePuzzleId]);

  const activeBoard = mode === 'daily' ? dailyBoard : practiceBoard;

  const setActiveBoard = useCallback(
    (updater: (prev: BoardState) => BoardState) => {
      if (mode === 'daily') {
        setDailyBoard(updater);
      } else {
        setPracticeBoard(updater);
      }
    },
    [mode],
  );

  // Sync body[data-state] for state machine clarity & automated checks
  useEffect(() => {
    const bodyState =
      screen === 'title'
        ? 'title'
        : screen === 'paused'
          ? 'paused'
          : activeBoard.outcome !== 'playing' && screen === 'gameover'
            ? 'gameover'
            : 'playing';
    document.body.dataset.state = bodyState;
  }, [screen, activeBoard.outcome]);

  // Persist daily board progress automatically
  useEffect(() => {
    saveDailySession({
      dateKey,
      puzzleId: daily.puzzle.id,
      board: dailyBoard,
      recordedInStats: dailyRecorded,
    });
  }, [dateKey, daily.puzzle.id, dailyBoard, dailyRecorded]);

  // Record daily stats once when daily game completes
  useEffect(() => {
    if (mode === 'daily' && dailyBoard.outcome !== 'playing' && !dailyRecorded) {
      const updated = recordDailyOutcome(
        stats,
        dateKey,
        dailyBoard.outcome === 'won',
        dailyBoard.checksUsed,
        countTotalHintTiersUsed(dailyBoard),
      );
      setStats(updated);
      setDailyRecorded(true);
    }
  }, [mode, dailyBoard, dailyRecorded, stats, dateKey]);

  const triggerShake = useCallback((rungIdx: number) => {
    setShakeRungIndex(null);
    requestAnimationFrame(() => setShakeRungIndex(rungIdx));
    setTimeout(() => setShakeRungIndex((cur) => (cur === rungIdx ? null : cur)), 300);
  }, []);

  const triggerFlip = useCallback((rungIdx: number) => {
    setFlipNonceByRung((prev) => prev.map((n, idx) => (idx === rungIdx ? n + 1 : n)));
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      saveMuted(next);
      return next;
    });
  }, []);

  const handleStartDaily = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMode('daily');
    setStatusMessage(null);
    if (dailyBoard.outcome !== 'playing') {
      setScreen('gameover');
      setOutcomeModalOpen(true);
    } else {
      setScreen('playing');
      setOutcomeModalOpen(false);
    }
  }, [dailyBoard.outcome]);

  const handleStartPractice = useCallback((targetId?: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const chosenId = targetId ?? practicePuzzleId;
    const chosen = PUZZLES.find((p) => p.id === chosenId) ?? PUZZLES[1];
    setMode('practice');
    setPracticePuzzleId(chosen.id);
    setPracticeBoard(createInitialBoard(chosen));
    setFlipNonceByRung([0, 0, 0, 0]);
    setStatusMessage({ text: `Practice puzzle: ${chosen.title}`, tone: 'neutral' });
    setOutcomeModalOpen(false);
    setScreen('playing');
  }, [practicePuzzleId]);

  const handleSelectSlot = useCallback(
    (rungIdx: number, slotIdx: number) => {
      if (activeBoard.outcome !== 'playing') return;
      setActiveBoard((prev) => ({
        ...prev,
        activeRungIndex: rungIdx,
        activeSlotIndex: slotIdx,
      }));
      soundEngine.playTileTap();
    },
    [activeBoard.outcome, setActiveBoard],
  );

  const handlePlaceLetter = useCallback(
    (letter: string) => {
      const upper = letter.toUpperCase();
      if (activeBoard.outcome !== 'playing') return;

      const rungIdx = activeBoard.activeRungIndex;
      const rung = activeBoard.rungs[rungIdx];
      if (isRungLocked(rung)) {
        setStatusMessage({ text: `Rung ${rungIdx + 1} is locked. Select an open rung.`, tone: 'neutral' });
        return;
      }

      if (!activePuzzle.tileRack.includes(upper)) {
        soundEngine.playErrorShake();
        haptics.vibrateError();
        triggerShake(rungIdx);
        setStatusMessage({ text: `Letter "${upper}" is not in today's 12-tile rack.`, tone: 'error' });
        return;
      }

      if (activeBoard.eliminatedRackLetters.includes(upper)) {
        soundEngine.playErrorShake();
        haptics.vibrateError();
        setStatusMessage({ text: `Letter "${upper}" was eliminated by a hint.`, tone: 'error' });
        return;
      }

      let targetSlot = activeBoard.activeSlotIndex;
      if (rung.lockedIndices.includes(targetSlot)) {
        const openSlot = [0, 1, 2, 3].find((i) => !rung.lockedIndices.includes(i));
        if (openSlot === undefined) return;
        targetSlot = openSlot;
      }

      const nextLetters = [...rung.letters] as [string, string, string, string];
      nextLetters[targetSlot] = upper;

      // Advance cursor to next unlocked slot (prefer empty slot, else next unlocked)
      let nextSlot = targetSlot;
      for (let step = 1; step <= 4; step++) {
        const cand = (targetSlot + step) % 4;
        if (!rung.lockedIndices.includes(cand) && nextLetters[cand] === '') {
          nextSlot = cand;
          break;
        }
        if (step === 1 && !rung.lockedIndices.includes(cand)) {
          nextSlot = cand;
        }
      }

      setActiveBoard((prev) => ({
        ...prev,
        rungs: prev.rungs.map((r, i) => (i === rungIdx ? { ...r, letters: nextLetters } : r)) as BoardState['rungs'],
        activeSlotIndex: nextSlot,
      }));

      setLastPopKey(`${rungIdx}-${targetSlot}`);
      soundEngine.playTileTap();
      haptics.vibrateTilePlace();
      setStatusMessage(null);
    },
    [activeBoard, activePuzzle.tileRack, setActiveBoard, triggerShake],
  );

  const handleBackspace = useCallback(() => {
    if (activeBoard.outcome !== 'playing') return;
    const rungIdx = activeBoard.activeRungIndex;
    const rung = activeBoard.rungs[rungIdx];
    if (isRungLocked(rung)) return;

    const slot = activeBoard.activeSlotIndex;
    const nextLetters = [...rung.letters] as [string, string, string, string];

    let clearIdx = slot;
    if (nextLetters[clearIdx] === '' || rung.lockedIndices.includes(clearIdx)) {
      const prevUnlocked = [3, 2, 1, 0].find(
        (i) => i < slot && !rung.lockedIndices.includes(i) && nextLetters[i] !== '',
      ) ?? [3, 2, 1, 0].find((i) => !rung.lockedIndices.includes(i) && nextLetters[i] !== '');
      if (prevUnlocked === undefined) return;
      clearIdx = prevUnlocked;
    }

    if (rung.lockedIndices.includes(clearIdx)) return;
    nextLetters[clearIdx] = '';

    setActiveBoard((prev) => ({
      ...prev,
      rungs: prev.rungs.map((r, i) => (i === rungIdx ? { ...r, letters: nextLetters } : r)) as BoardState['rungs'],
      activeSlotIndex: clearIdx,
    }));
    soundEngine.playTileRemove();
  }, [activeBoard, setActiveBoard]);

  const handleClearRung = useCallback(() => {
    if (activeBoard.outcome !== 'playing') return;
    const rungIdx = activeBoard.activeRungIndex;
    const rung = activeBoard.rungs[rungIdx];
    if (isRungLocked(rung)) return;

    const nextLetters = rung.letters.map((ch, idx) =>
      rung.lockedIndices.includes(idx) ? ch : '',
    ) as [string, string, string, string];

    const firstOpen = [0, 1, 2, 3].find((i) => !rung.lockedIndices.includes(i)) ?? 0;

    setActiveBoard((prev) => ({
      ...prev,
      rungs: prev.rungs.map((r, i) => (i === rungIdx ? { ...r, letters: nextLetters } : r)) as BoardState['rungs'],
      activeSlotIndex: firstOpen,
    }));
    soundEngine.playTileRemove();
  }, [activeBoard, setActiveBoard]);

  const handleCarryAdjacent = useCallback(
    (rungIdx: number) => {
      if (activeBoard.outcome !== 'playing') return;
      const rung = activeBoard.rungs[rungIdx];
      if (isRungLocked(rung)) return;

      let source: string | null = null;
      if (rungIdx === 0) source = activePuzzle.words[0];
      else if (rungIdx === 3) source = activePuzzle.words[5];
      else source = activeBoard.rungs[rungIdx - 1].acceptedWord ?? activeBoard.rungs[rungIdx + 1].acceptedWord;

      if (!source) return;
      const nextLetters = source.split('').map((ch, idx) =>
        rung.lockedIndices.includes(idx) ? rung.letters[idx] : ch,
      ) as [string, string, string, string];

      const preferredSlot =
        rung.shiftIndex !== null && !rung.lockedIndices.includes(rung.shiftIndex)
          ? rung.shiftIndex
          : [0, 1, 2, 3].find((i) => !rung.lockedIndices.includes(i)) ?? 0;

      setActiveBoard((prev) => ({
        ...prev,
        rungs: prev.rungs.map((r, i) => (i === rungIdx ? { ...r, letters: nextLetters } : r)) as BoardState['rungs'],
        activeRungIndex: rungIdx,
        activeSlotIndex: preferredSlot,
      }));
      soundEngine.playTileTap();
      haptics.vibrateTilePlace();
      setStatusMessage({ text: `Carried ${source} into Rung ${rungIdx + 1} — swap 1 tile.`, tone: 'neutral' });
    },
    [activeBoard, activePuzzle.words, setActiveBoard],
  );

  const handleCheckRung = useCallback(() => {
    if (activeBoard.outcome !== 'playing') return;
    const rungIdx = activeBoard.activeRungIndex;
    const result = submitRungGuess(activeBoard, activePuzzle, rungIdx);

    if (!result.valid) {
      soundEngine.playErrorShake();
      haptics.vibrateError();
      triggerShake(rungIdx);
      setStatusMessage({ text: result.error ?? 'Invalid entry.', tone: 'error' });
      return;
    }

    setActiveBoard(() => result.board);
    triggerFlip(rungIdx);

    // Play staggered card flip chimes
    [0, 1, 2, 3].forEach((i) => soundEngine.playCardFlip(i));

    if (result.completedChain) {
      haptics.vibrateRungSolved();
      setTimeout(() => {
        soundEngine.playVictoryFanfare();
        setScreen('gameover');
        setOutcomeModalOpen(true);
      }, 480);
      setStatusMessage({ text: 'Chain complete!', tone: 'success' });
    } else if (result.board.outcome === 'lost') {
      haptics.vibrateError();
      setTimeout(() => {
        soundEngine.playErrorShake();
        setScreen('gameover');
        setOutcomeModalOpen(true);
      }, 480);
      setStatusMessage({ text: 'No checks remaining.', tone: 'error' });
    } else if (result.solvedRung) {
      haptics.vibrateRungSolved();
      setTimeout(() => soundEngine.playRungSolved(), 280);
      setStatusMessage({ text: `Rung ${rungIdx + 1} locked!`, tone: 'success' });
    } else {
      const exactCount = result.feedback?.filter((f) => f === 'exact').length ?? 0;
      setStatusMessage({
        text: `Valid bridge! ${exactCount}/4 tiles match Rung ${rungIdx + 1}'s target.`,
        tone: 'neutral',
      });
    }
  }, [activeBoard, activePuzzle, setActiveBoard, triggerFlip, triggerShake]);

  const handleUseHint = useCallback(() => {
    if (activeBoard.outcome !== 'playing') return;
    const res = applyHintTier(activeBoard, activePuzzle, activeBoard.activeRungIndex);
    if (!res.applied) {
      setStatusMessage({ text: res.message, tone: 'neutral' });
      return;
    }

    setActiveBoard(() => res.board);
    soundEngine.playHintReveal(res.tier);
    setStatusMessage({ text: res.message, tone: 'hint' });

    if (res.tier === 3) {
      haptics.vibrateRungSolved();
      triggerFlip(activeBoard.activeRungIndex);
      if (res.board.outcome === 'won') {
        setTimeout(() => {
          soundEngine.playVictoryFanfare();
          setScreen('gameover');
          setOutcomeModalOpen(true);
        }, 480);
      }
    }
  }, [activeBoard, activePuzzle, setActiveBoard, triggerFlip]);

  const handleRestartCurrent = useCallback(() => {
    setActiveBoard(() => createInitialBoard(activePuzzle));
    setFlipNonceByRung([0, 0, 0, 0]);
    setStatusMessage({ text: 'Puzzle reset.', tone: 'neutral' });
    setScreen('playing');
    setOutcomeModalOpen(false);
  }, [activePuzzle, setActiveBoard]);

  const handlePlayPracticeNext = useCallback(() => {
    const currentIdx = PUZZLES.findIndex((p) => p.id === activePuzzle.id);
    const nextPuzzle = PUZZLES[(currentIdx + 1) % PUZZLES.length];
    handleStartPractice(nextPuzzle.id);
  }, [activePuzzle.id, handleStartPractice]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (rulesModalOpen) {
        if (e.key === 'Escape') setRulesModalOpen(false);
        return;
      }
      if (statsModalOpen) {
        if (e.key === 'Escape') setStatsModalOpen(false);
        return;
      }

      if (screen === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartDaily();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (outcomeModalOpen) {
          setOutcomeModalOpen(false);
        } else {
          setScreen((prev) => (prev === 'paused' ? 'playing' : 'paused'));
        }
        return;
      }

      if (screen !== 'playing' || outcomeModalOpen) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleCheckRung();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveBoard((prev) => ({
          ...prev,
          activeRungIndex: (prev.activeRungIndex + 3) % 4,
        }));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveBoard((prev) => ({
          ...prev,
          activeRungIndex: (prev.activeRungIndex + 1) % 4,
        }));
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveBoard((prev) => ({
          ...prev,
          activeSlotIndex: (prev.activeSlotIndex + 3) % 4,
        }));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveBoard((prev) => ({
          ...prev,
          activeSlotIndex: (prev.activeSlotIndex + 1) % 4,
        }));
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handlePlaceLetter(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    rulesModalOpen,
    statsModalOpen,
    outcomeModalOpen,
    handleStartDaily,
    handleCheckRung,
    handleBackspace,
    handlePlaceLetter,
    setActiveBoard,
  ]);

  if (screen === 'title') {
    return (
      <>
        <TitleScreen
          puzzleNumber={daily.puzzleNumber}
          dailyPuzzle={daily.puzzle}
          dailyCompleted={dailyBoard.outcome !== 'playing'}
          dailyInProgress={dailyBoard.checksUsed > 0 && dailyBoard.outcome === 'playing'}
          currentStreak={stats.currentStreak}
          onStartDaily={handleStartDaily}
          onStartPractice={() => handleStartPractice()}
          onOpenRules={() => setRulesModalOpen(true)}
        />
        <RulesModal open={rulesModalOpen} onClose={() => setRulesModalOpen(false)} />
      </>
    );
  }

  const solvedCount = activeBoard.rungs.filter((r) => isRungLocked(r)).length;

  return (
    <div className="paper-grid-bg min-h-screen flex flex-col justify-between">
      {/* Slim World-Matched HUD Header */}
      <header className="w-full border-b border-[rgba(24,26,24,0.12)] bg-white/95 px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setScreen('title');
            }}
            aria-label="Return to Chainwork title screen"
            className="font-display text-xl font-bold text-[#181a18] hover:text-[#15803d] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Chainwork
          </button>
          <span className="hidden sm:inline text-xs font-mono text-[#5b5e58] truncate">
            {mode === 'daily' ? `Daily #${daily.puzzleNumber}` : `Practice · ${activePuzzle.title}`}
          </span>
        </div>

        {/* Live Gameplay Counters (desktop/tablet inline; mobile uses compact strip above board) */}
        <div className="hidden sm:flex items-center gap-4 sm:gap-6 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[#5b5e58]">Checks</span>
            <span className="font-semibold text-[#181a18]">
              {activeBoard.checksUsed}/{activeBoard.maxChecks}
            </span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[#5b5e58]">Rungs</span>
            <span className="font-semibold text-[#15803d]">{solvedCount}/4</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[#5b5e58]">Streak</span>
            <span className="font-semibold text-[#181a18]">{stats.currentStreak}</span>
          </div>
        </div>

        {/* Compact Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {activeBoard.outcome !== 'playing' && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setOutcomeModalOpen(true);
              }}
              className="px-2.5 h-9 sm:h-10 rounded-lg bg-[#15803d] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Result
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setRulesModalOpen(true);
            }}
            aria-label="How to Play"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-[#eae8e1] text-[#181a18] flex items-center justify-center cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setStatsModalOpen(true);
            }}
            aria-label="Daily Statistics"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-[#eae8e1] text-[#181a18] flex items-center justify-center cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              handleToggleMute();
            }}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-[#eae8e1] text-[#181a18] flex items-center justify-center cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setScreen('paused');
            }}
            aria-label="Pause and puzzle archive"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-[#eae8e1] text-[#181a18] flex items-center justify-center cursor-pointer"
          >
            <Pause className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Play Workspace */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-3 sm:py-6 flex flex-col gap-3.5 sm:gap-4 justify-center">
        {/* Mobile-only compact status line (keeps header completely collision-free on 390px) */}
        <div className="flex sm:hidden items-center justify-between px-1 text-xs font-mono tabular-nums text-[#5b5e58]">
          <span>
            {mode === 'daily' ? `Daily #${daily.puzzleNumber}` : activePuzzle.title}
          </span>
          <div className="flex items-center gap-3">
            <span>
              Checks <strong className="text-[#181a18]">{activeBoard.checksUsed}/{activeBoard.maxChecks}</strong>
            </span>
            <span>
              Rungs <strong className="text-[#15803d]">{solvedCount}/4</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-3.5 sm:gap-5 items-start">
          <div className="order-1">
            <ChainBoard
              puzzle={activePuzzle}
              board={activeBoard}
              flipNonceByRung={flipNonceByRung}
              shakeRungIndex={shakeRungIndex}
              lastPopKey={lastPopKey}
              onSelectSlot={handleSelectSlot}
              onCarryAdjacent={handleCarryAdjacent}
            />
          </div>
          <div className="order-3 lg:order-2">
            <LogicLedger
              puzzle={activePuzzle}
              board={activeBoard}
              statusMessage={statusMessage}
              onUseHint={handleUseHint}
            />
          </div>
          <div className="order-2 lg:order-3 lg:col-span-2">
            <TileRack
              puzzle={activePuzzle}
              board={activeBoard}
              onPlaceLetter={handlePlaceLetter}
              onBackspace={handleBackspace}
              onClearRung={handleClearRung}
              onCheckRung={handleCheckRung}
            />
          </div>
        </div>
      </main>

      <OutcomeModal
        open={outcomeModalOpen}
        mode={mode}
        puzzleNumber={daily.puzzleNumber}
        puzzle={activePuzzle}
        board={activeBoard}
        stats={stats}
        onClose={() => setOutcomeModalOpen(false)}
        onPlayPracticeNext={handlePlayPracticeNext}
        onReturnTitle={() => {
          setOutcomeModalOpen(false);
          setScreen('title');
        }}
      />

      <PauseModal
        open={screen === 'paused'}
        mode={mode}
        currentPuzzleId={activePuzzle.id}
        onResume={() => setScreen(activeBoard.outcome !== 'playing' ? 'gameover' : 'playing')}
        onRestart={handleRestartCurrent}
        onSelectPuzzle={(id) => handleStartPractice(id)}
        onReturnDaily={() => {
          setMode('daily');
          setScreen(dailyBoard.outcome !== 'playing' ? 'gameover' : 'playing');
        }}
        onReturnTitle={() => setScreen('title')}
      />

      <StatsModal open={statsModalOpen} stats={stats} dateKey={dateKey} onClose={() => setStatsModalOpen(false)} />
      <RulesModal open={rulesModalOpen} onClose={() => setRulesModalOpen(false)} />
    </div>
  );
}
