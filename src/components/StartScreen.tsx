import React from 'react';
import { Play, Sparkles, Trophy, Compass, Smartphone, Monitor, Flame, Zap, Shield } from 'lucide-react';
import { DifficultyLevel, GameStats } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../game/engine';

interface StartScreenProps {
  stats: GameStats;
  currentDifficulty: DifficultyLevel;
  onSelectDifficulty: (level: DifficultyLevel) => void;
  onStart: () => void;
  onShowStory: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  stats,
  currentDifficulty,
  onSelectDifficulty,
  onStart,
  onShowStory,
}) => {
  const currentConfig = DIFFICULTY_CONFIGS[currentDifficulty];

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/85 via-neutral-950/75 to-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-30 overflow-y-auto">
      <div className="w-full max-w-lg bg-neutral-900/95 border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col items-center text-center relative overflow-hidden my-auto">
        {/* Decorative Top Sun Gradient */}
        <div className="absolute -top-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Live Presentation Demo Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live AI Demo · High School Edition</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-1.5 font-display bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
          RUN NAMIBIA
        </h1>

        <p className="text-neutral-300 text-xs sm:text-sm max-w-sm mb-4">
          Sprint across Sossusvlei dunes, dodge darting Namibian wildlife, and collect desert diamonds!
        </p>

        {/* Difficulty Level Segmented Selector */}
        <div className="w-full mb-4">
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

        {/* Namibian Wildlife & Obstacles Showcase */}
        <div className="w-full bg-neutral-950/70 border border-neutral-800 rounded-2xl p-2.5 mb-4 text-left">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5 px-1">
            Namibian Wildlife & Hazards
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs text-neutral-300">
            <div className="bg-neutral-900/90 rounded-xl p-2 flex flex-col">
              <div className="flex items-center gap-1 font-bold text-white mb-0.5">
                <span>🦌</span>
                <span className="truncate">Oryx</span>
              </div>
              <span className="text-[10px] text-neutral-400 leading-tight">National animal with straight spear-horns</span>
            </div>

            <div className="bg-neutral-900/90 rounded-xl p-2 flex flex-col">
              <div className="flex items-center gap-1 font-bold text-amber-300 mb-0.5">
                <span>🐗</span>
                <span className="truncate">Warthog</span>
              </div>
              <span className="text-[10px] text-neutral-400 leading-tight">Darting runner with upright tail</span>
            </div>

            <div className="bg-neutral-900/90 rounded-xl p-2 flex flex-col">
              <div className="flex items-center gap-1 font-bold text-cyan-300 mb-0.5">
                <span>🦤</span>
                <span className="truncate">Ostrich</span>
              </div>
              <span className="text-[10px] text-neutral-400 leading-tight">Tall pacing desert bird · Dodge lanes!</span>
            </div>
          </div>
        </div>

        {/* Primary START Button */}
        <button
          onClick={onStart}
          className="w-full py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-orange-950/50 flex items-center justify-center gap-3 transition-all cursor-pointer group mb-3.5"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current group-hover:scale-110 transition-transform" />
          <span>START {currentConfig.name.toUpperCase()}</span>
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

        {/* Best Score (if recorded) */}
        {stats.highScore > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-300/90 mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Record: <strong className="font-mono text-white text-sm">{stats.highScore.toLocaleString()}</strong></span>
          </div>
        )}

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

