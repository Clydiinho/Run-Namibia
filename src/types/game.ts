export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Lane = -1 | 0 | 1; // -1: Left, 0: Center, 1: Right

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyConfig {
  level: DifficultyLevel;
  name: string;
  subtitle: string;
  tag: string;
  baseSpeed: number;
  maxSpeed: number;
  obstacleSpacing: number;
  scoreMultiplier: number;
  movingAnimalRate: number;
}

// Stationary Obstacles (ROCKS & LOGS only)
export type StationaryObstacleType =
  | 'LOW_ROCK'    // Low rock the player must jump over
  | 'BOULDER'     // Large boulder that blocks a lane, must switch lanes
  | 'LOW_LOG'     // Wooden log lying across lane, must jump over
  | 'RAISED_LOG'; // Raised wooden log on supports, must slide under

// Moving Animals (sideways crossing obstacles)
export type AnimalType =
  | 'SPRINGBOK' // Smaller, swift, jumpable
  | 'OSTRICH'   // Smaller body, jumpable
  | 'ZEBRA'     // Medium, jumpable
  | 'LION'      // Fast and dangerous, must be timed
  | 'RHINO'     // Slow and large, cannot be jumped over
  | 'ELEPHANT'; // Slow and large, cannot be jumped over

export type ObstacleType = StationaryObstacleType | AnimalType;

// Three collectible tiers: COINS (1x), GOLD (5x on rainbows), DIAMONDS (15x rare)
export type CollectibleType = 'COIN' | 'GOLD' | 'DIAMOND';

export interface Obstacle {
  id: number;
  z: number; // Distance ahead of player
  lane: Lane;
  lanePos: number; // Continuous position (-1 to 1 across track; animals start off-road at ±1.6)
  type: ObstacleType;
  width: number;
  height: number;
  passed: boolean;
  isMoving: boolean;

  // Animal crossing state
  isAnimal?: boolean;
  animalType?: AnimalType;
  crossingDirection?: -1 | 1; // -1 = right to left, 1 = left to right
  crossingSpeed?: number;
  warningSide?: 'left' | 'right';
  warningTimer?: number; // Counts down before animal enters the road
  warningPlayed?: boolean;
  hasEnteredRoad?: boolean;
  hasLeftRoad?: boolean;
  canJumpOver?: boolean;
  requiredJumpHeight?: number;

  animTime?: number;
}

export interface Rainbow {
  id: number;
  z: number;
  apexLane: Lane; // Lane where rainbow apex and floating gold are positioned
  passed: boolean;
}

export interface Collectible {
  id: number;
  z: number;
  lane: Lane;
  type: CollectibleType;
  collected: boolean;
  yOffset: number; // Height above ground (coins: 0 or arc; gold: apex height)
  rotation: number;
  rainbowId?: number; // If attached to a rainbow apex
}

export interface SceneryElement {
  id: number;
  z: number;
  xOffset: number;
  type: 'ACACIA_TREE' | 'DEAD_VLEI_TREE' | 'DUNE_SHRUB' | 'MILESTONE_SIGN';
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface PlayerState {
  lane: Lane;
  targetLane: Lane;
  lanePosition: number; // -1 to 1 continuous for smooth steering
  y: number; // Height above ground
  vy: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number; // Remaining duration of slide
  runCycle: number;
  tilt: number;
  invulnerableTime: number;
}

export interface GameStats {
  score: number;
  distance: number; // Meters
  coins: number;    // 1x common
  gold: number;     // 5x uncommon (from rainbows)
  gems: number;     // 15x rare diamonds
  speed: number;
  highScore: number;
  bestDistance: number;
  difficulty: DifficultyLevel;
}
