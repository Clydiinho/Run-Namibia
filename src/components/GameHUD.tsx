import React from 'react';
import { Volume2, VolumeX, Pause, Play, Music, Sparkles } from 'lucide-react';
import { GameStats } from '../types/game';
import { MilestoneEvent, DIFFICULTY_CONFIGS } from '../game/engine';

interface GameHUDProps {
  stats: GameStats;
  milestone: MilestoneEvent | null;
  isPaused: boolean;
  isMuted: boolean;
  isMusicPlaying: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  milestone,
  isPaused,
  isMuted,
  isMusicPlaying,
  onTogglePause,
  onToggleMute,
  onToggleMusic,
}) => {
  const diffConfig = DIFFICULTY_CONFIGS[stats.difficulty] || DIFFICULTY_CONFIGS.MEDIUM;

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none p-3 md:p-6 flex flex-col justify-between z-20">
      {/* Top Bar with Score, Distance & Controls */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & Collectibles */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Main Score Counter */}
          <div className="bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 px-4 py-2 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 block">
                Score
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {diffConfig.name}
              </span>
            </div>
            <span className="font-mono text-2xl md:text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {Math.floor(stats.score).toLocaleString()}
            </span>
          </div>

          {/* Loot Counters: Coins, Gold on Rainbows, and Diamonds */}
          <div className="flex items-center gap-2.5 bg-neutral-950/75 backdrop-blur-md border border-neutral-800/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300">
            {/* Coins (1x) */}
            <div className="flex items-center gap-1 text-amber-300" title="Coins (1x)">
              <span className="text-sm">🪙</span>
              <span className="font-mono tabular-nums">{stats.coins}</span>
            </div>
            <span className="text-neutral-600">·</span>
            {/* Gold (5x) from Rainbows */}
            <div className="flex items-center gap-1 text-yellow-400" title="Gold from Rainbows (5x)">
              <span className="text-sm">✨</span>
              <span className="font-mono tabular-nums text-yellow-300">{stats.gold}</span>
            </div>
            <span className="text-neutral-600">·</span>
            {/* Diamonds (15x) */}
            <div className="flex items-center gap-1 text-cyan-400" title="Rare Diamonds (15x)">
              <span className="text-sm">💎</span>
              <span className="font-mono tabular-nums">{stats.gems}</span>
            </div>
            {stats.highScore > 0 && (
              <>
                <span className="text-neutral-600 hidden sm:inline">·</span>
                <span className="text-neutral-400 hidden sm:inline text-[11px]">
                  Best: <span className="font-mono text-amber-400 tabular-nums">{stats.highScore}</span>
                </span>
              </>
            )}
          </div>
        </div>


        {/* Center: Milestone Banner */}
        {milestone && (
          <div className="hidden sm:flex flex-col items-center bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-amber-600/95 text-white px-5 py-2 rounded-xl shadow-xl border border-amber-300/40 animate-bounce">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Namibia Landmark</span>
            </div>
            <span className="text-base font-bold tracking-tight">{milestone.title}</span>
            <span className="text-[11px] text-amber-100">{milestone.subtitle}</span>
          </div>
        )}

        {/* Right: Distance & Action Buttons */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Distance */}
          <div className="bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 px-4 py-2 rounded-xl shadow-lg text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90 block">
              Distance
            </span>
            <span className="font-mono text-2xl md:text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {Math.floor(stats.distance)}<span className="text-sm font-bold text-neutral-400 ml-1">m</span>
            </span>
          </div>

          {/* Quick Controls Bar */}
          <div className="flex items-center gap-1.5 bg-neutral-950/70 backdrop-blur-md border border-neutral-800/80 p-1 rounded-lg">
            <button
              onClick={onToggleMusic}
              className={`p-2 rounded-md transition-colors ${
                isMusicPlaying
                  ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={isMusicPlaying ? 'Stop Desert Groove' : 'Play Desert Groove'}
              aria-label="Toggle background music"
            >
              <Music className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleMute}
              className={`p-2 rounded-md transition-colors ${
                isMuted
                  ? 'text-rose-400 bg-rose-400/10 hover:bg-rose-400/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
              aria-label="Toggle mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onTogglePause}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
              title={isPaused ? 'Resume Game' : 'Pause Game'}
              aria-label="Pause or Resume"
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Milestone Toast */}
      {milestone && (
        <div className="sm:hidden mt-3 mx-auto flex flex-col items-center bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-amber-600/95 text-white px-4 py-1.5 rounded-lg shadow-xl border border-amber-300/40">
          <span className="text-xs font-extrabold">{milestone.title}</span>
          <span className="text-[10px] text-amber-100">{milestone.subtitle}</span>
        </div>
      )}
    </div>
  );
};
