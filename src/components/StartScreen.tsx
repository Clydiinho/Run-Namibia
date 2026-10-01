import React from 'react';
import { Play, Sparkles, Trophy, Compass, Smartphone, Monitor, Flame, Zap, Shield, User, LogOut, LogIn } from 'lucide-react';
import { DifficultyLevel, GameStats } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../game/engine';
import { PlayerProfile } from '../lib/supabase';

interface StartScreenProps {
  stats: GameStats;
  currentDifficulty: DifficultyLevel;
  onSelectDifficulty: (level: DifficultyLevel) => void;
  onStart: () => void;
  onShowStory: () => void;
  currentPlayer: PlayerProfile | null;
  onOpenAuth: (mode?: 'signup' | 'login') => void;
  onLogout: () => void;
  onOpenLeaderboard: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  stats,
  currentDifficulty,
  onSelectDifficulty,
  onStart,
  onShowStory,
  currentPlayer,
  onOpenAuth,
  onLogout,
  onOpenLeaderboard,
}) => {
  const currentConfig = DIFFICULTY_CONFIGS[currentDifficulty];

  const handleStartClick = () => {
    if (!currentPlayer) {
      onOpenAuth('signup');
    } else {
      onStart();
    }
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/85 via-neutral-950/75 to-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-30 overflow-y-auto">
      <div className="w-full max-w-lg bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col items-center text-center relative overflow-hidden my-auto">
        {/* Decorative Top Sun Gradient */}
        <div className="absolute -top-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar: Player Account Status & Leaderboard Trigger */}
        <div className="w-full flex items-center justify-between gap-2 mb-3 bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-2 px-3">
          {currentPlayer ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>{currentPlayer.nickname}</span>
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  Best: {currentPlayer.best_score.toLocaleString()} pts
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('signup')}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-neutral-800"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in to play</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
              title="View Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>

            {currentPlayer && (
              <button
                onClick={onLogout}
                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-1.5 font-display bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
          RUN NAMIBIA
        </h1>

        <p className="text-neutral-300 text-xs sm:text-sm max-w-sm mb-4">
          Sprint across Sossusvlei dunes, dodge darting Namibian wildlife, and compete on the global leaderboard!
        </p>

        {/* Not Logged In Callout Banner if needed */}
        {!currentPlayer && (
          <div
            onClick={() => onOpenAuth('signup')}
            className="w-full bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-2.5 mb-3.5 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="text-left pl-1">
              <p className="text-xs font-bold text-amber-300">Account required to play</p>
              <p className="text-[11px] text-neutral-400">Choose a nickname to save scores &amp; join the top 20.</p>
            </div>
            <span className="text-xs font-bold bg-amber-500 text-neutral-950 px-2.5 py-1 rounded-xl shadow shrink-0">
              Sign In
            </span>
          </div>
        )}

        {/* Difficulty Level Segmented Selector */}
        <div className="w-full mb-3.5">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Select Difficulty</span>
            <span className="text-xs font-mono text-amber-400">{currentConfig.tag}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950/80 rounded-2xl border border-neutral-800">
            <button
              type="button"
              onClick={() => onSelectDifficulty('EASY')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                currentDifficulty === 'EASY'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Scout</span>
              </div>
              <span className="text-[10px] opacity-80 font-normal">1.0x Score</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDifficulty('MEDIUM')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                currentDifficulty === 'MEDIUM'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Normal</span>
              </div>
              <span className="text-[10px] opacity-80 font-normal">1.5x Score</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDifficulty('HARD')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                currentDifficulty === 'HARD'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>Kalahari</span>
              </div>
              <span className="text-[10px] opacity-80 font-normal">2.2x Score</span>
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 px-1 text-left">
            {currentConfig.subtitle}
          </p>
        </div>

        {/* Primary START Button */}
        <button
          onClick={handleStartClick}
          className="w-full py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-orange-950/50 flex items-center justify-center gap-3 transition-all cursor-pointer group mb-3.5"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current group-hover:scale-110 transition-transform" />
          <span>{currentPlayer ? `START ${currentConfig.name.toUpperCase()}` : 'LOG IN & PLAY'}</span>
        </button>

        {/* Controls Card */}
        <div className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-2.5 mb-3 text-left text-xs">
          <div className="flex items-center justify-between text-neutral-400 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5 text-neutral-200">
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </span>
            <span className="flex items-center gap-1.5 text-neutral-200">
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-neutral-300 text-[11px]">
            <div>
              <p><strong className="text-white">← / →</strong> or <strong className="text-white">A / D</strong>: Steer</p>
              <p><strong className="text-white">Space / ↑</strong>: Jump over obstacles</p>
            </div>
            <div>
              <p><strong className="text-white">Swipe Left / Right</strong>: Steer</p>
              <p><strong className="text-white">Swipe Up</strong> or <strong className="text-white">Jump Button</strong></p>
            </div>
          </div>
        </div>

        {/* Live Presentation Inspiration Hook */}
        <button
          onClick={onShowStory}
          className="text-xs text-neutral-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Live Demo: See the Idea ➔ AI ➔ Code Pipeline</span>
        </button>
      </div>
    </div>
  );
};

