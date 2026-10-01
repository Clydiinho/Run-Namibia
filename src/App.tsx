import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, MilestoneEvent } from './game/engine';
import { GameRenderer } from './game/renderer';
import { sounds } from './audio/soundManager';
import { DifficultyLevel, GameState, GameStats } from './types/game';
import { GameHUD } from './components/GameHUD';
import { StartScreen } from './components/StartScreen';
import { GameOverModal } from './components/GameOverModal';
import { MobileControls } from './components/MobileControls';
import { AiStoryModal } from './components/AiStoryModal';
import { AuthModal } from './components/AuthModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import {
  fetchCurrentPlayerProfile,
  signOutPlayer,
  submitScoreToSupabase,
  PlayerProfile,
  ScoreSubmissionResult,
  supabase,
} from './lib/supabase';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>('START');
  const [stats, setStats] = useState<GameStats>(engineRef.current.stats);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [milestone, setMilestone] = useState<MilestoneEvent | null>(null);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [showStory, setShowStory] = useState<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Supabase Auth and Leaderboard state
  const [currentPlayer, setCurrentPlayer] = useState<PlayerProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<ScoreSubmissionResult | null>(null);

  const handleSelectDifficulty = (level: DifficultyLevel) => {
    engineRef.current.setDifficulty(level);
    engineRef.current.loadHighScores();
    setStats({ ...engineRef.current.stats, difficulty: level });
  };

  // Touch swipe tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Detect touch device and load initial player profile on mount
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    // Initial auth check
    fetchCurrentPlayerProfile().then((profile) => {
      if (profile) setCurrentPlayer(profile);
    });

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const p = await fetchCurrentPlayerProfile();
        setCurrentPlayer(p);
      } else {
        const p = await fetchCurrentPlayerProfile();
        setCurrentPlayer(p);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize Renderer and Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const renderer = new GameRenderer(ctx);
    rendererRef.current = renderer;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      renderer.resize(w, h, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial render for background
    renderer.render(
      engineRef.current.player,
      engineRef.current.obstacles,
      engineRef.current.collectibles,
      engineRef.current.scenery,
      engineRef.current.particles,
      engineRef.current.popups,
      engineRef.current.stats.speed,
      engineRef.current.stats.distance,
      engineRef.current.shake,
      0
    );

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Configure Game Engine Callbacks
  useEffect(() => {
    const engine = engineRef.current;

    engine.setCallbacks(
      async (finalStats) => {
        // Game Over callback
        const previousHigh = finalStats.highScore;
        const newScore = Math.floor(finalStats.score);
        const hitNewRecord = newScore > previousHigh && previousHigh > 0;
        setIsNewHigh(hitNewRecord);
        setStats({ ...finalStats });
        setGameState('GAME_OVER');

        // Submit score to Supabase via RPC
        const result = await submitScoreToSupabase(newScore);
        if (result) {
          setSubmissionResult(result);
          if (result.is_new_best) {
            setIsNewHigh(true);
          }
          setCurrentPlayer((prev) => (prev ? { ...prev, best_score: result.best_score } : null));
        }
      },
      (newMilestone) => {
        setMilestone(newMilestone);
      }
    );
  }, []);

  // Main Game Animation Loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); // Clamp to prevent massive dt spikes
    lastTimeRef.current = timestamp;

    const engine = engineRef.current;
    const renderer = rendererRef.current;

    if (engine.isRunning && !isPaused) {
      engine.update(dt);
      setStats({ ...engine.stats });
      setMilestone(engine.currentMilestone);
    }

    if (renderer) {
      renderer.render(
        engine.player,
        engine.obstacles,
        engine.collectibles,
        engine.scenery,
        engine.particles,
        engine.popups,
        engine.stats.speed,
        engine.stats.distance,
        engine.shake,
        engine.gameTime
      );
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPaused]);

  // Start / Stop Game Loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameLoop]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const engine = engineRef.current;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          engine.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          engine.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          if (gameState === 'START') {
            if (!currentPlayer) {
              setAuthMode('signup');
              setIsAuthOpen(true);
            } else {
              startGame();
            }
          } else if (gameState === 'GAME_OVER') {
            restartGame();
          } else {
            engine.jump();
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          engine.slide();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          if (gameState === 'PLAYING') {
            togglePause();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, currentPlayer]);

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Minimum swipe threshold
    if (Math.max(absDx, absDy) > 28 && dt < 450) {
      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0) {
          engineRef.current.moveRight();
        } else {
          engineRef.current.moveLeft();
        }
      } else {
        // Vertical swipe
        if (dy < 0) {
          engineRef.current.jump();
        } else {
          engineRef.current.slide();
        }
      }
    }
    touchStartRef.current = null;
  };

  // Game Control Actions
  const startGame = () => {
    if (!currentPlayer) {
      setAuthMode('signup');
      setIsAuthOpen(true);
      return;
    }

    setSubmissionResult(null);
    engineRef.current.reset();
    setStats({ ...engineRef.current.stats });
    setGameState('PLAYING');
    setIsPaused(false);
    setIsNewHigh(false);

    if (isMusicPlaying) {
      sounds.startMusic();
    }
  };

  const restartGame = () => {
    startGame();
  };

  const togglePause = () => {
    if (gameState !== 'PLAYING') return;
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        sounds.stopMusic();
      } else if (isMusicPlaying) {
        sounds.startMusic();
      }
      return next;
    });
  };

  const toggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const toggleMusic = () => {
    setIsMusicPlaying((prev) => {
      const next = !prev;
      if (next) {
        sounds.startMusic();
      } else {
        sounds.stopMusic();
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await signOutPlayer();
    setCurrentPlayer(null);
  };

  const handleOpenAuth = (mode: 'signup' | 'login' = 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 60fps HTML5 Canvas Engine */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-pointer"
        onClick={() => {
          // If in game, clicking upper area can trigger jump on desktop/tablets
          if (gameState === 'PLAYING') {
            engineRef.current.jump();
          }
        }}
      />

      {/* In-Game HUD */}
      {gameState === 'PLAYING' && (
        <GameHUD
          stats={stats}
          milestone={milestone}
          isPaused={isPaused}
          isMuted={isMuted}
          isMusicPlaying={isMusicPlaying}
          onTogglePause={togglePause}
          onToggleMute={toggleMute}
          onToggleMusic={toggleMusic}
        />
      )}

      {/* On-Screen Mobile Thumb Controls */}
      {gameState === 'PLAYING' && !isPaused && (
        <MobileControls
          onMoveLeft={() => engineRef.current.moveLeft()}
          onMoveRight={() => engineRef.current.moveRight()}
          onJump={() => engineRef.current.jump()}
        />
      )}

      {/* Pause Overlay */}
      {gameState === 'PLAYING' && isPaused && (
        <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2 font-display">PAUSED</h3>
            <p className="text-sm text-neutral-400 mb-6">Catch your breath in the shade.</p>
            <button
              onClick={togglePause}
              className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-base shadow-lg transition-colors cursor-pointer"
            >
              RESUME RUN
            </button>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
        <StartScreen
          stats={stats}
          currentDifficulty={stats.difficulty}
          onSelectDifficulty={handleSelectDifficulty}
          onStart={startGame}
          onShowStory={() => setShowStory(true)}
          currentPlayer={currentPlayer}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          stats={stats}
          isNewHigh={isNewHigh}
          submissionResult={submissionResult}
          onRestart={restartGame}
          onSelectDifficulty={handleSelectDifficulty}
          onShowStory={() => setShowStory(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />
      )}

      {/* Auth Modal for Sign Up / Log In */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={async () => {
          const profile = await fetchCurrentPlayerProfile();
          setCurrentPlayer(profile);
          setIsAuthOpen(false);
        }}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentPlayer={currentPlayer}
      />

      {/* Live AI Demo Story Slide Modal */}
      {showStory && <AiStoryModal onClose={() => setShowStory(false)} />}
    </div>
  );
}
