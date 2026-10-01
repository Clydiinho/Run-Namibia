import React from 'react';
import { RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { DifficultyLevel, GameStats } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../game/engine';
import { ScoreSubmissionResult } from '../lib/supabase';

interface GameOverModalProps {
  stats: GameStats;
  isNewHigh: boolean;
  submissionResult: ScoreSubmissionResult | null;
  onRestart: () => void;
  onSelectDifficulty: (level: DifficultyLevel) => void;
  onShowStory: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewHigh,
  submissionResult,
  onRestart,
  onSelectDifficulty,
  onShowStory,
  onOpenLeaderboard,
}) => {
  const currentConfig = DIFFICULTY_CONFIGS[stats.difficulty] || DIFFICULTY_CONFIGS.MEDIUM;
  const isPersonalBest = isNewHigh || (submissionResult?.is_new_best ?? false);

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-40 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col items-center text-center relative overflow-hidden my-auto">
        {/* Subtle desert gradient accent bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* High Score / Personal Best Badge */}
        {isPersonalBest && (
          <div className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wide animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEW PERSONAL BEST!</span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-1 font-display">
          GAME OVER
        </h2>

        {/* Required Encouraging Quote */}
        <p className="text-amber-300/90 text-sm font-medium italic mb-3">
          &ldquo;Not bad. Namibia isn&rsquo;t running itself.&rdquo;
        </p>

        {/* Leaderboard Submission & Rank Badge */}
        {submissionResult && (
          <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-300">
                  {submissionResult.is_new_best ? 'New Personal Best!' : 'Score Recorded'}
                </p>
                <p className="text-[10px] text-neutral-400">Synced to public leaderboard</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-extrabold text-white bg-amber-500/30 px-2.5 py-1 rounded-xl border border-amber-400/40">
                Rank #{submissionResult.rank}
              </span>
            </div>
          </div>
        )}

        {/* Difficulty Pill / Selector */}
        <div className="w-full bg-neutral-950/70 border border-neutral-800 rounded-xl p-1.5 mb-3.5">
          <div className="flex items-center justify-between text-[11px] px-1 mb-1 text-neutral-400 font-semibold">
            <span>Difficulty Mode</span>
            <span className="font-mono text-amber-400">{currentConfig.tag}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onSelectDifficulty('EASY')}
              className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                stats.difficulty === 'EASY'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              Scout
            </button>
            <button
              onClick={() => onSelectDifficulty('MEDIUM')}
              className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                stats.difficulty === 'MEDIUM'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => onSelectDifficulty('HARD')}
              className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                stats.difficulty === 'HARD'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              Kalahari
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-3.5">
          {/* Final Score */}
          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              Final Score
            </span>
            <span className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {Math.floor(stats.score).toLocaleString()}
            </span>
          </div>

          {/* Distance */}
          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              Distance
            </span>
            <span className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">
              {Math.floor(stats.distance)}<span className="text-xs text-neutral-400 ml-1">m</span>
            </span>
          </div>

          {/* Best Score */}
          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-2.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Record</span>
            </div>
            <span className="font-mono text-base font-bold text-white tabular-nums">
              {(submissionResult?.best_score || stats.highScore).toLocaleString()}
            </span>
          </div>

          {/* Loot Collected: Coins, Gold on Rainbows, and Diamonds */}
          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-2xl p-2.5 flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              Loot
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="text-amber-400" title="Coins">🪙 {stats.coins}</span>
              <span className="text-yellow-300" title="Gold">✨ {stats.gold}</span>
              <span className="text-cyan-400" title="Diamonds">💎 {stats.gems}</span>
            </div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="w-full flex flex-col gap-2 mb-2.5">
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 text-white font-bold text-base sm:text-lg shadow-xl shadow-orange-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>VIEW PUBLIC LEADERBOARD</span>
          </button>
        </div>

        {/* Presentation Story Toggle */}
        <button
          onClick={onShowStory}
          className="text-xs text-neutral-400 hover:text-amber-300 transition-colors py-1 cursor-pointer"
        >
          Show Live Demo Story: <span className="underline">Idea → AI → Code</span>
        </button>
      </div>
    </div>
  );
};

