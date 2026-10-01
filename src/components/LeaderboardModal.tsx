import React, { useEffect, useState } from 'react';
import { X, Trophy, RefreshCw, Medal, User, Crown } from 'lucide-react';
import { fetchLeaderboard, fetchUserRank, LeaderboardEntry, PlayerProfile, isSupabaseConfigured } from '../lib/supabase';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: PlayerProfile | null;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentPlayer,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [refreshSeconds, setRefreshSeconds] = useState(10);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { entries: data } = await fetchLeaderboard(20);
    setEntries(data);

    if (currentPlayer) {
      // Check if user is in top 20
      const foundIndex = data.findIndex((e) => e.id === currentPlayer.id);
      if (foundIndex >= 0) {
        setUserRank(foundIndex + 1);
      } else {
        // Fetch rank from database
        const rank = await fetchUserRank(currentPlayer.id, currentPlayer.best_score);
        setUserRank(rank);
      }
    }
    setLoading(false);
    setRefreshSeconds(10);
  };

  // Auto-refresh every 10 seconds when modal is open
  useEffect(() => {
    if (!isOpen) return;

    loadData();

    // 1-second countdown ticker
    const timer = setInterval(() => {
      setRefreshSeconds((prev) => {
        if (prev <= 1) {
          loadData(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, currentPlayer?.id, currentPlayer?.best_score]);

  if (!isOpen) return null;

  const isUserInTop20 = currentPlayer && entries.some((e) => e.id === currentPlayer.id);

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col relative my-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pr-8">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-0.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Public Hall of Fame</span>
            </div>
            <h3 className="text-2xl font-extrabold text-white font-display">
              Run Namibia Leaderboard
            </h3>
          </div>

          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 bg-neutral-950/80 border border-neutral-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="font-mono text-[11px]">{refreshSeconds}s</span>
          </button>
        </div>

        {/* Config Notice if demo */}
        {!isSupabaseConfigured && (
          <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 mb-3">
            Showing demo leaderboard. Connect your Supabase project in <code className="font-mono">.env</code> for live real-time scores!
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto border border-neutral-800/80 rounded-2xl bg-neutral-950/60 divide-y divide-neutral-800/60">
          {entries.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-neutral-400">
              No scores recorded yet. Be the first to set a record!
            </div>
          )}

          {entries.map((entry) => {
            const isCurrentPlayer = currentPlayer && entry.id === currentPlayer.id;
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                  isCurrentPlayer
                    ? 'bg-amber-500/15 border-l-4 border-l-amber-400 text-white font-bold'
                    : 'text-neutral-300 hover:bg-neutral-800/30'
                }`}
              >
                {/* Rank & Nickname */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 text-center font-mono text-xs font-black shrink-0">
                    {entry.rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-neutral-950 shadow">
                        <Crown className="w-3.5 h-3.5 fill-current" />
                      </span>
                    ) : entry.rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-neutral-950 font-bold">
                        2
                      </span>
                    ) : entry.rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-bold">
                        3
                      </span>
                    ) : (
                      <span className="text-neutral-500">#{entry.rank}</span>
                    )}
                  </div>

                  <span className={`text-xs truncate ${isCurrentPlayer ? 'text-amber-300 font-extrabold' : 'text-neutral-200'}`}>
                    {entry.nickname}
                    {isCurrentPlayer && <span className="ml-1.5 text-[10px] text-amber-400 uppercase font-semibold">(You)</span>}
                  </span>
                </div>

                {/* Score */}
                <div className="font-mono text-sm font-bold text-amber-400 tabular-nums shrink-0">
                  {entry.best_score.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">pts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pinned Logged-in Player's Row if Outside Top 20 */}
        {currentPlayer && !isUserInTop20 && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                Rank #{userRank || '—'}
              </span>
              <span className="text-xs font-bold text-white">
                {currentPlayer.nickname} <span className="text-neutral-400 font-normal">(Your Status)</span>
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-amber-400 tabular-nums">
              {currentPlayer.best_score.toLocaleString()} <span className="text-[10px] text-neutral-400 font-normal">pts</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
