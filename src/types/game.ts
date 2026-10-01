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

export type ObstacleType =
  | 'ROCK'
  | 'ACACIA_BUSH'
  | 'FALLEN_TRUNK'
  | 'ROAD_BARRIER'
  | 'ORYX'
  | 'SPRINGBOK'
  | 'WARTHOG'
  | 'OSTRICH'
  | 'MEERKAT';

export type CollectibleType = 'COIN' | 'DIAMOND' | 'STAR';

export interface Obstacle {
  id: number;
  z: number; // Distance ahead of player (0 to maxDistance)
  lane: Lane;
  lanePos: number; // Continuous lane position (-1 to 1) for moving animals
  type: ObstacleType;
  width: number;
  height: number;
  passed: boolean;
  vx?: number; // Lateral movement speed across lanes for running animals
  animTime?: number; // Internal animation clock for legs/horns
  isMoving?: boolean;
}

export interface Collectible {
  id: number;
  z: number;
  lane: Lane;
  type: CollectibleType;
  collected: boolean;
  yOffset: number; // For floating/bobbing
  rotation: number;
}

export interface SceneryElement {
  id: number;
  z: number;
  xOffset: number; // negative for left, positive for right
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
  lanePosition: number; // -1 to 1 continuous for smooth lane changes
  y: number; // Height above ground (0 when on ground)
  vy: number; // Vertical velocity
  isJumping: boolean;
  runCycle: number; // For leg & arm animation
  tilt: number; // Leaning when changing lanes
  invulnerableTime: number;
}

export interface GameStats {
  score: number;
  distance: number; // In meters
  gems: number;
  coins: number;
  speed: number;
  highScore: number;
  bestDistance: number;
  difficulty: DifficultyLevel;
}

