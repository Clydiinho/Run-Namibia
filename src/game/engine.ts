import { sounds } from '../audio/soundManager';
import {
  Collectible,
  CollectibleType,
  DifficultyConfig,
  DifficultyLevel,
  GameStats,
  Lane,
  Obstacle,
  ObstacleType,
  Particle,
  PlayerState,
  SceneryElement,
  ScorePopup,
} from '../types/game';
import { RUN_CONFIG } from './config';

export interface MilestoneEvent {
  distance: number;
  title: string;
  subtitle: string;
}

export const MILESTONES: MilestoneEvent[] = [
  { distance: 100, title: 'Sossusvlei Dunes', subtitle: 'Entering the iconic red sand corridor' },
  { distance: 250, title: 'Spitzkoppe Peaks', subtitle: 'Granite peaks rising on the horizon' },
  { distance: 500, title: 'Skeleton Coast Trail', subtitle: 'Ocean mist meets desert sands' },
  { distance: 1000, title: 'Etosha Safari Plains', subtitle: 'The great white wildlife expanse' },
  { distance: 2000, title: 'Legend of Namibia', subtitle: 'Maximum runner prestige achieved!' },
];

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  EASY: {
    level: 'EASY',
    name: 'Scout Run',
    subtitle: 'Scenic Namibian plains · Slower pace, relaxed wildlife',
    tag: 'Easy · 1.0x',
    baseSpeed: RUN_CONFIG.speed.baseSpeed * RUN_CONFIG.speed.difficultyMultipliers.EASY.speedScale,
    maxSpeed: RUN_CONFIG.speed.maxSpeed * RUN_CONFIG.speed.difficultyMultipliers.EASY.maxSpeedScale,
    obstacleSpacing: 155,
    scoreMultiplier: RUN_CONFIG.speed.difficultyMultipliers.EASY.scoreMult,
    movingAnimalRate: 0.15,
  },
  MEDIUM: {
    level: 'MEDIUM',
    name: 'Desert Dash',
    subtitle: 'The authentic run · Dynamic wildlife & obstacles',
    tag: 'Normal · 1.5x',
    baseSpeed: RUN_CONFIG.speed.baseSpeed * RUN_CONFIG.speed.difficultyMultipliers.MEDIUM.speedScale,
    maxSpeed: RUN_CONFIG.speed.maxSpeed * RUN_CONFIG.speed.difficultyMultipliers.MEDIUM.maxSpeedScale,
    obstacleSpacing: 115,
    scoreMultiplier: RUN_CONFIG.speed.difficultyMultipliers.MEDIUM.scoreMult,
    movingAnimalRate: 0.45,
  },
  HARD: {
    level: 'HARD',
    name: 'Kalahari Beast',
    subtitle: 'Lightning reflexes · Darting animals & fast hazards',
    tag: 'Hard · 2.2x',
    baseSpeed: RUN_CONFIG.speed.baseSpeed * RUN_CONFIG.speed.difficultyMultipliers.HARD.speedScale,
    maxSpeed: RUN_CONFIG.speed.maxSpeed * RUN_CONFIG.speed.difficultyMultipliers.HARD.maxSpeedScale,
    obstacleSpacing: 82,
    scoreMultiplier: RUN_CONFIG.speed.difficultyMultipliers.HARD.scoreMult,
    movingAnimalRate: 0.75,
  },
};

export class GameEngine {
  public player: PlayerState = {
    lane: 0,
    targetLane: 0,
    lanePosition: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    runCycle: 0,
    tilt: 0,
    invulnerableTime: 0,
  };

  public obstacles: Obstacle[] = [];
  public collectibles: Collectible[] = [];
  public scenery: SceneryElement[] = [];
  public particles: Particle[] = [];
  public popups: ScorePopup[] = [];

  public stats: GameStats = {
    score: 0,
    distance: 0,
    gems: 0,
    coins: 0,
    speed: RUN_CONFIG.speed.baseSpeed,
    highScore: 0,
    bestDistance: 0,
    difficulty: 'MEDIUM',
  };

  public shake = { x: 0, y: 0 };
  public gameTime: number = 0;
  public isRunning: boolean = false;
  public currentMilestone: MilestoneEvent | null = null;
  public milestoneTimer: number = 0;

  // Chunk Spawner Tracking
  private nextChunkZ: number = 40;
  private chunkCount: number = 0;

  private nextEntityId: number = 1;
  private onGameOverCallback?: (stats: GameStats) => void;
  private onMilestoneCallback?: (milestone: MilestoneEvent) => void;

  constructor() {
    this.loadPreferences();
    this.loadHighScores();
    this.seedInitialScenery();
  }

  public setCallbacks(
    onGameOver: (stats: GameStats) => void,
    onMilestone?: (milestone: MilestoneEvent) => void
  ) {
    this.onGameOverCallback = onGameOver;
    this.onMilestoneCallback = onMilestone;
  }

  public getConfig(): DifficultyConfig {
    return DIFFICULTY_CONFIGS[this.stats.difficulty] || DIFFICULTY_CONFIGS.MEDIUM;
  }

  public setDifficulty(diff: DifficultyLevel) {
    this.stats.difficulty = diff;
    try {
      localStorage.setItem('namibia_run_difficulty', diff);
    } catch {
      // ignore
    }
  }

  public loadPreferences() {
    try {
      const savedDiff = localStorage.getItem('namibia_run_difficulty') as DifficultyLevel;
      if (savedDiff && DIFFICULTY_CONFIGS[savedDiff]) {
        this.stats.difficulty = savedDiff;
      }
    } catch {
      // ignore
    }
  }

  public loadHighScores() {
    try {
      const diffKey = `namibia_run_highscore_${this.stats.difficulty}`;
      const savedScore = localStorage.getItem(diffKey) || localStorage.getItem('namibia_run_highscore');
      const savedDist = localStorage.getItem('namibia_run_bestdist');
      if (savedScore) this.stats.highScore = parseInt(savedScore, 10) || 0;
      if (savedDist) this.stats.bestDistance = parseInt(savedDist, 10) || 0;
    } catch {
      // LocalStorage fallback
    }
  }

  public saveHighScores() {
    try {
      const diffKey = `namibia_run_highscore_${this.stats.difficulty}`;
      if (this.stats.score > this.stats.highScore) {
        this.stats.highScore = Math.floor(this.stats.score);
        localStorage.setItem(diffKey, String(this.stats.highScore));
        localStorage.setItem('namibia_run_highscore', String(this.stats.highScore));
      }
      if (this.stats.distance > this.stats.bestDistance) {
        this.stats.bestDistance = Math.floor(this.stats.distance);
        localStorage.setItem('namibia_run_bestdist', String(this.stats.bestDistance));
      }
    } catch {
      // LocalStorage fallback
    }
  }

  public reset() {
    this.loadHighScores();
    const config = this.getConfig();

    this.player = {
      lane: 0,
      targetLane: 0,
      lanePosition: 0,
      y: 0,
      vy: 0,
      isJumping: false,
      runCycle: 0,
      tilt: 0,
      invulnerableTime: 0,
    };
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.popups = [];
    this.stats.score = 0;
    this.stats.distance = 0;
    this.stats.gems = 0;
    this.stats.coins = 0;
    this.stats.speed = config.baseSpeed;
    this.shake = { x: 0, y: 0 };
    this.gameTime = 0;
    this.currentMilestone = null;
    this.milestoneTimer = 0;

    // Reset Chunk Spawner
    // Start initial chunk right ahead of player
    this.nextChunkZ = 45;
    this.chunkCount = 0;

    this.seedInitialScenery();

    // Populate chunks up to spawnAheadDistance
    while (this.nextChunkZ < RUN_CONFIG.chunks.spawnAheadDistance) {
      this.spawnNextChunk();
    }

    this.isRunning = true;
  }

  private seedInitialScenery() {
    this.scenery = [];
    for (let z = 40; z < RUN_CONFIG.road.maxDepthZ; z += 40) {
      // Left side scenery
      this.scenery.push({
        id: this.nextEntityId++,
        z,
        xOffset: -(0.4 + Math.random() * 1.4),
        type: Math.random() > 0.3 ? 'ACACIA_TREE' : 'DEAD_VLEI_TREE',
        scale: 0.8 + Math.random() * 0.4,
      });
      // Right side scenery
      this.scenery.push({
        id: this.nextEntityId++,
        z: z + 20,
        xOffset: 0.4 + Math.random() * 1.4,
        type: Math.random() > 0.4 ? 'ACACIA_TREE' : 'DUNE_SHRUB',
        scale: 0.8 + Math.random() * 0.4,
      });
    }
  }

  // Input Handlers
  public moveLeft() {
    if (!this.isRunning) return;
    if (this.player.targetLane > -1) {
      this.player.targetLane = (this.player.targetLane - 1) as Lane;
    }
  }

  public moveRight() {
    if (!this.isRunning) return;
    if (this.player.targetLane < 1) {
      this.player.targetLane = (this.player.targetLane + 1) as Lane;
    }
  }

  public jump() {
    if (!this.isRunning) return;
    if (!this.player.isJumping || this.player.y < 8) {
      this.player.vy = 12.8;
      this.player.isJumping = true;
      sounds.playJump();
      this.spawnDust(8);
    }
  }

  public slide() {
    if (!this.isRunning) return;
    // Fast drop if in air
    if (this.player.isJumping && this.player.vy > 0) {
      this.player.vy = -12;
    }
  }

  // Update Game Physics & State
  public update(dt: number) {
    if (!this.isRunning) return;

    this.gameTime += dt;
    const config = this.getConfig();

    // ==========================================
    // 1. Smooth Speed Curve
    // speed = baseSpeed + (maxSpeed - baseSpeed) * (1 - exp(-distance / rampDistance))
    // ==========================================
    const speedProgress = 1 - Math.exp(-this.stats.distance / RUN_CONFIG.speed.rampDistance);
    this.stats.speed = config.baseSpeed + (config.maxSpeed - config.baseSpeed) * speedProgress;

    // World longitudinal motion
    const moveZ = this.stats.speed * dt * 28;
    this.stats.distance += (this.stats.speed * dt * 2.8) / 10;
    this.stats.score += dt * 10 * config.scoreMultiplier * (1 + this.stats.gems * 0.1);

    // ==========================================
    // 2. Check Landmarks / Milestones
    // ==========================================
    for (const m of MILESTONES) {
      if (
        this.stats.distance >= m.distance &&
        this.stats.distance - (this.stats.speed * dt * 2.8) / 10 < m.distance
      ) {
        this.currentMilestone = m;
        this.milestoneTimer = 3.5;
        sounds.playMilestone();
        if (this.onMilestoneCallback) this.onMilestoneCallback(m);
        this.addPopup(0, -40, `📍 ${m.title}!`, '#fef08a');
        break;
      }
    }
    if (this.milestoneTimer > 0) {
      this.milestoneTimer -= dt;
      if (this.milestoneTimer <= 0) this.currentMilestone = null;
    }

    // ==========================================
    // 3. Player Lane Movement & Banking Physics
    // ==========================================
    const laneDelta = this.player.targetLane - this.player.lanePosition;
    this.player.lanePosition += laneDelta * Math.min(1, dt * 14);
    this.player.tilt = (this.player.targetLane - this.player.lanePosition) * 1.2;

    // ==========================================
    // 4. Player Jump Kinematics
    // ==========================================
    if (this.player.isJumping) {
      this.player.y += this.player.vy * dt * 38;
      this.player.vy -= 28 * dt; // Gravity
      if (this.player.y <= 0) {
        this.player.y = 0;
        this.player.vy = 0;
        this.player.isJumping = false;
        this.spawnDust(6);
      }
    } else {
      // Footstep dust puffs
      this.player.runCycle += dt * (10 + this.stats.speed * 0.5);
      if (Math.sin(this.player.runCycle) > 0.95 && Math.random() > 0.5) {
        this.spawnDust(2);
      }
    }

    // ==========================================
    // 5. Update World Objects & Shift Z
    // ==========================================
    this.updateObstacles(moveZ, dt);
    this.updateCollectibles(moveZ);
    this.updateScenery(moveZ);
    this.updateParticles(dt);
    this.updatePopups(dt);

    // ==========================================
    // 6. Camera Screen Shake Decay
    // ==========================================
    this.shake.x *= 0.85;
    this.shake.y *= 0.85;
    if (Math.abs(this.shake.x) < 0.1) this.shake.x = 0;
    if (Math.abs(this.shake.y) < 0.1) this.shake.y = 0;

    // ==========================================
    // 7. Track Chunk Spawner (Pattern System)
    // ==========================================
    this.nextChunkZ -= moveZ;
    while (this.nextChunkZ < RUN_CONFIG.chunks.spawnAheadDistance) {
      this.spawnNextChunk();
    }

    // Replenish Scenery on sides
    this.maintainScenery();

    // ==========================================
    // 8. Collision Detection
    // ==========================================
    this.checkCollisions();
  }

  // ==========================================
  // PATTERN-BASED TRACK CHUNK SPAWNER
  // ==========================================
  private spawnNextChunk() {
    const startZ = this.nextChunkZ;
    const chunkIdx = this.chunkCount++;
    const config = this.getConfig();

    // Dynamically scale chunk length so player's reaction time stays fair at higher speeds
    const speedRatio = (this.stats.speed - RUN_CONFIG.speed.baseSpeed) * RUN_CONFIG.chunks.speedSpacingFactor;
    const chunkLength = RUN_CONFIG.chunks.baseChunkLength * (1 + Math.max(0, speedRatio));

    // Chunk 0: Welcome coin run (first 2-3 seconds has coins in center lane)
    if (chunkIdx === 0) {
      this.spawnCoinLine(startZ + 15, 0, 4);
      this.nextChunkZ += chunkLength * 0.75;
      return;
    }

    // Chunk 1: The very first obstacle! Appears in ~2-3 seconds at base speed
    if (chunkIdx === 1) {
      // Guaranteed single low obstacle (e.g. Meerkat or Rock) in Lane 0, coins in Left and Right
      this.obstacles.push({
        id: this.nextEntityId++,
        z: startZ + 30,
        lane: 0,
        lanePos: 0,
        type: 'MEERKAT',
        width: 30,
        height: 30,
        passed: false,
        isMoving: false,
      });
      this.spawnCoinLine(startZ + 20, -1, 3);
      this.spawnCoinLine(startZ + 20, 1, 3);
      this.nextChunkZ += chunkLength;
      return;
    }

    // RHYTHM GUARANTEE:
    // Alternate between an Obstacle Chunk and a Coin Breathing-Room Chunk
    // Every 3rd chunk is a pure breathing coin chunk
    const isBreathingChunk = chunkIdx % 3 === 2;

    if (isBreathingChunk) {
      // Breathing Room Patterns
      const breathRoll = Math.random();
      if (breathRoll < 0.45) {
        // Pattern: Long Coin Run with a Diamond
        const lane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
        this.spawnCoinLine(startZ + 15, lane, 5, true);
      } else if (breathRoll < 0.75) {
        // Pattern: Zig-Zag Coins across lanes
        this.spawnZigZagCoins(startZ + 15);
      } else {
        // Pattern: Jump-over trunk with a coin arc above it!
        const trunkLane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
        this.spawnJumpBarrierWithCoinArc(startZ + 35, trunkLane);
      }
    } else {
      // Obstacle Challenge Patterns
      // Tier 1 (chunks 2 to 5): Easy single-lane obstacles only
      // Tier 2 (chunks 6 to 10): Moving animals & jump barriers
      // Tier 3 (chunks 11+): Double obstacles (1 safe lane) & complex patterns

      if (chunkIdx <= 5 || config.level === 'EASY') {
        // TIER 1: Single Obstacle, 2 lanes guaranteed open
        this.spawnSingleObstaclePattern(startZ + 35);
      } else if (chunkIdx <= 10 || (config.level === 'MEDIUM' && Math.random() < 0.55)) {
        // TIER 2: Animal Crossing, Jump Arc, or Slide Barrier
        const tier2Roll = Math.random();
        if (tier2Roll < 0.4) {
          this.spawnAnimalCrossingPattern(startZ + 35);
        } else if (tier2Roll < 0.7) {
          this.spawnJumpBarrierWithCoinArc(startZ + 35);
        } else {
          this.spawnSingleObstaclePattern(startZ + 35);
        }
      } else {
        // TIER 3: Advanced Challenges (Double Obstacles, Fast Wildlife)
        const tier3Roll = Math.random();
        if (tier3Roll < 0.48) {
          // Double Obstacle leaving exactly 1 lane open
          this.spawnDoubleObstaclePattern(startZ + 40);
        } else if (tier3Roll < 0.8) {
          this.spawnAnimalCrossingPattern(startZ + 35);
        } else {
          this.spawnJumpBarrierWithCoinArc(startZ + 35);
        }
      }
    }

    this.nextChunkZ += chunkLength;
  }

  // Pattern: Single Obstacle in one lane, coins in other lanes (Fairness: 2 lanes open)
  private spawnSingleObstaclePattern(obstacleZ: number) {
    const lanes: Lane[] = [-1, 0, 1];
    const blockedLane = lanes[Math.floor(Math.random() * 3)];
    const openLanes = lanes.filter((l) => l !== blockedLane);

    const typeRoll = Math.random();
    const obsType: ObstacleType =
      typeRoll < 0.35 ? 'ROCK' : typeRoll < 0.65 ? 'ACACIA_BUSH' : 'WARTHOG';

    this.obstacles.push({
      id: this.nextEntityId++,
      z: obstacleZ,
      lane: blockedLane,
      lanePos: blockedLane,
      type: obsType,
      width: 30,
      height: 30,
      passed: false,
      isMoving: false,
    });

    // Reward coins in one of the open safe lanes
    const coinLane = openLanes[Math.floor(Math.random() * openLanes.length)];
    this.spawnCoinLine(obstacleZ - 15, coinLane, 3);
  }

  // Pattern: Double Obstacle (2 lanes blocked at same Z, exactly 1 lane open!)
  private spawnDoubleObstaclePattern(obstacleZ: number) {
    const lanes: Lane[] = [-1, 0, 1];
    // Pick the single SAFE open lane
    const safeLane = lanes[Math.floor(Math.random() * 3)];
    const blockedLanes = lanes.filter((l) => l !== safeLane);

    // Obstacle types for the 2 blocked lanes
    const obstacleTypes: ObstacleType[] = ['ROCK', 'ROAD_BARRIER', 'ACACIA_BUSH', 'ORYX', 'FALLEN_TRUNK'];

    blockedLanes.forEach((bLane, idx) => {
      const type = obstacleTypes[(idx + Math.floor(Math.random() * 3)) % obstacleTypes.length];
      this.obstacles.push({
        id: this.nextEntityId++,
        z: obstacleZ,
        lane: bLane,
        lanePos: bLane,
        type,
        width: 30,
        height: type === 'ROAD_BARRIER' || type === 'ORYX' ? 50 : 30,
        passed: false,
        isMoving: false,
      });
    });

    // Provide a guiding line of coins through the safe lane
    this.spawnCoinLine(obstacleZ - 18, safeLane, 4, true);
  }

  // Pattern: Jump-over barrier (Fallen Trunk or Rock) with a coin arc above it!
  private spawnJumpBarrierWithCoinArc(obstacleZ: number, designatedLane?: Lane) {
    const lane: Lane = designatedLane !== undefined ? designatedLane : ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
    const type: ObstacleType = Math.random() > 0.4 ? 'FALLEN_TRUNK' : 'ROCK';

    this.obstacles.push({
      id: this.nextEntityId++,
      z: obstacleZ,
      lane,
      lanePos: lane,
      type,
      width: 30,
      height: 30,
      passed: false,
      isMoving: false,
    });

    // 3 Coins forming a jump parabola: up and over the obstacle
    this.collectibles.push({
      id: this.nextEntityId++,
      z: obstacleZ - 16,
      lane,
      type: 'COIN',
      collected: false,
      yOffset: 12,
      rotation: 0,
    });
    this.collectibles.push({
      id: this.nextEntityId++,
      z: obstacleZ,
      lane,
      type: 'COIN',
      collected: false,
      yOffset: 45, // High apex directly over the barrier
      rotation: 0.5,
    });
    this.collectibles.push({
      id: this.nextEntityId++,
      z: obstacleZ + 16,
      lane,
      type: 'COIN',
      collected: false,
      yOffset: 12,
      rotation: 1.0,
    });
  }

  // Pattern: Animal Crossing (Moving Warthog, Springbok, or Ostrich pacing lanes)
  private spawnAnimalCrossingPattern(obstacleZ: number) {
    const animalTypes: ObstacleType[] = ['WARTHOG', 'SPRINGBOK', 'OSTRICH'];
    const chosenType = animalTypes[Math.floor(Math.random() * animalTypes.length)];
    const startLane: Lane = Math.random() > 0.5 ? -1 : 1;
    const direction = startLane === -1 ? 1 : -1;
    const speed = chosenType === 'WARTHOG' ? 1.4 : chosenType === 'SPRINGBOK' ? 1.2 : 0.85;

    this.obstacles.push({
      id: this.nextEntityId++,
      z: obstacleZ,
      lane: startLane,
      lanePos: startLane,
      type: chosenType,
      width: 30,
      height: chosenType === 'OSTRICH' ? 50 : 30,
      passed: false,
      isMoving: true,
      vx: direction * speed,
      animTime: Math.random() * 5,
    });

    // Provide coins in the center lane
    this.spawnCoinLine(obstacleZ - 15, 0, 3);
  }

  // Helper: Spawn a straight line of coins in a single lane
  private spawnCoinLine(startZ: number, lane: Lane, count: number, hasDiamond: boolean = false) {
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const type: CollectibleType = isLast && hasDiamond ? 'DIAMOND' : 'COIN';
      this.collectibles.push({
        id: this.nextEntityId++,
        z: startZ + i * 22,
        lane,
        type,
        collected: false,
        yOffset: 0,
        rotation: i * 0.4,
      });
    }
  }

  // Helper: Spawn zig-zag coins across lanes
  private spawnZigZagCoins(startZ: number) {
    const sequence: Lane[] = [-1, 0, 1, 0];
    sequence.forEach((lane, idx) => {
      this.collectibles.push({
        id: this.nextEntityId++,
        z: startZ + idx * 24,
        lane,
        type: idx === 2 ? 'DIAMOND' : 'COIN',
        collected: false,
        yOffset: 0,
        rotation: idx * 0.5,
      });
    });
  }

  // Maintain road-verge scenery
  private maintainScenery() {
    const highestSceneryZ = this.scenery.reduce((max, s) => Math.max(max, s.z), 0);
    if (highestSceneryZ < RUN_CONFIG.road.maxDepthZ) {
      const nextZ = Math.max(highestSceneryZ + 35, RUN_CONFIG.road.maxDepthZ - 40);
      const isLeft = Math.random() > 0.5;
      this.scenery.push({
        id: this.nextEntityId++,
        z: nextZ,
        xOffset: isLeft ? -(0.4 + Math.random() * 1.4) : 0.4 + Math.random() * 1.4,
        type: Math.random() > 0.35 ? 'ACACIA_TREE' : Math.random() > 0.5 ? 'DEAD_VLEI_TREE' : 'DUNE_SHRUB',
        scale: 0.75 + Math.random() * 0.5,
      });
    }
  }

  // Entity Lifecycle & Shift
  private updateObstacles(moveZ: number, dt: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= moveZ;
      obs.animTime = (obs.animTime || 0) + dt;

      // Lateral movement for dynamic wildlife
      if (obs.isMoving && obs.vx) {
        obs.lanePos += obs.vx * dt;

        // Bounce between road edges (-1.08 to 1.08)
        if (obs.lanePos > 1.08) {
          obs.lanePos = 1.08;
          obs.vx = -Math.abs(obs.vx);
        } else if (obs.lanePos < -1.08) {
          obs.lanePos = -1.08;
          obs.vx = Math.abs(obs.vx);
        }

        // Discrete lane approximation
        obs.lane = (obs.lanePos < -0.33 ? -1 : obs.lanePos > 0.33 ? 1 : 0) as Lane;
      }

      if (obs.z < RUN_CONFIG.chunks.recycleBehindDistance) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCollectibles(moveZ: number) {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.z -= moveZ;
      col.rotation += 0.05;
      if (col.z < RUN_CONFIG.chunks.recycleBehindDistance || col.collected) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private updateScenery(moveZ: number) {
    for (let i = this.scenery.length - 1; i >= 0; i--) {
      const s = this.scenery[i];
      s.z -= moveZ;
      if (s.z < RUN_CONFIG.chunks.recycleBehindDistance) {
        this.scenery.splice(i, 1);
      }
    }
  }

  // Collision Checking
  private checkCollisions() {
    const playerZ = 25;
    const playerLane = this.player.lanePosition;
    const playerY = this.player.y;
    const config = this.getConfig();

    // 1. Collectibles Check
    for (let i = 0; i < this.collectibles.length; i++) {
      const col = this.collectibles[i];
      if (col.collected) continue;

      const dz = Math.abs(col.z - playerZ);
      const dLane = Math.abs(playerLane - col.lane);

      if (dz < RUN_CONFIG.collision.collectibleZTolerance && dLane < RUN_CONFIG.collision.collectibleLaneTolerance) {
        col.collected = true;

        if (col.type === 'COIN') {
          const coinVal = Math.round(10 * config.scoreMultiplier);
          this.stats.score += coinVal;
          this.stats.coins += 1;
          sounds.playCoin();
          this.addPopup(0, -60, `+${coinVal} N$`, '#fde047');
          this.spawnSparkles(col.lane, playerY + 20, '#facc15', 6);
        } else if (col.type === 'DIAMOND') {
          const gemVal = Math.round(50 * config.scoreMultiplier);
          this.stats.score += gemVal;
          this.stats.gems += 1;
          sounds.playDiamond();
          this.addPopup(0, -65, `+${gemVal} GEM! 💎`, '#38bdf8');
          this.spawnSparkles(col.lane, playerY + 20, '#38bdf8', 12);
        } else if (col.type === 'STAR') {
          const starVal = Math.round(100 * config.scoreMultiplier);
          this.stats.score += starVal;
          sounds.playStar();
          this.addPopup(0, -70, `+${starVal} STAR! ⭐`, '#fbbf24');
          this.spawnSparkles(col.lane, playerY + 20, '#fbbf24', 16);
        }
      }
    }

    // 2. Obstacles Collision Check
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dz = Math.abs(obs.z - playerZ);
      const obstacleLaneX = obs.lanePos !== undefined ? obs.lanePos : obs.lane;
      const dLane = Math.abs(playerLane - obstacleLaneX);

      // Hitbox boundary check
      const hitToleranceZ = obs.type === 'FALLEN_TRUNK' ? RUN_CONFIG.collision.trunkZHitTolerance : RUN_CONFIG.collision.zHitTolerance;
      const hitToleranceLane = RUN_CONFIG.collision.laneHitTolerance;

      if (dz < hitToleranceZ && dLane < hitToleranceLane) {
        // Can player jump over this obstacle?
        let requiredJumpHeight = 38;
        if (obs.type === 'MEERKAT') {
          requiredJumpHeight = 32;
        } else if (obs.type === 'WARTHOG') {
          requiredJumpHeight = 35;
        } else if (obs.type === 'FALLEN_TRUNK' || obs.type === 'ROCK' || obs.type === 'ACACIA_BUSH') {
          requiredJumpHeight = 38;
        } else if (obs.type === 'SPRINGBOK') {
          requiredJumpHeight = 42;
        } else if (obs.type === 'ROAD_BARRIER') {
          requiredJumpHeight = 58;
        } else if (obs.type === 'ORYX' || obs.type === 'OSTRICH') {
          requiredJumpHeight = 65;
        }

        if (playerY > requiredJumpHeight) {
          if (!obs.passed) {
            obs.passed = true;
            const jumpBonus = Math.round(25 * config.scoreMultiplier);
            this.stats.score += jumpBonus;
            const animalIcon =
              obs.type === 'ORYX'
                ? '🦌 ORYX'
                : obs.type === 'SPRINGBOK'
                ? '🦌 SPRINGBOK'
                : obs.type === 'WARTHOG'
                ? '🐗 WARTHOG'
                : obs.type === 'OSTRICH'
                ? '🦤 OSTRICH'
                : obs.type === 'MEERKAT'
                ? '🦫 MEERKAT'
                : '🪵 TRUNK';
            this.addPopup(0, -50, `LEAPED! ${animalIcon} +${jumpBonus}`, '#4ade80');
            this.spawnSparkles(obstacleLaneX, 10, '#4ade80', 6);
          }
          continue;
        }

        // Collision Impact
        this.handleCrash(obs);
        break;
      }
    }
  }

  private handleCrash(obs: Obstacle) {
    this.isRunning = false;
    sounds.playHit();
    sounds.playGameOver();
    sounds.stopMusic();

    // Screen shake
    this.shake = {
      x: (Math.random() - 0.5) * 26,
      y: (Math.random() - 0.5) * 26,
    };

    // Sand and rock burst particles
    const laneX = obs.lanePos !== undefined ? obs.lanePos : obs.lane;
    this.spawnExplosion(laneX, this.player.y);

    this.saveHighScores();

    if (this.onGameOverCallback) {
      this.onGameOverCallback(this.stats);
    }
  }

  private spawnDust(count: number = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#d97706' : '#b45309',
        alpha: 0.6,
        decay: 0.03 + Math.random() * 0.03,
      });
    }
  }

  private spawnSparkles(lane: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: lane * 100,
        y: -y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 2.5 + Math.random() * 3.5,
        color,
        alpha: 1,
        decay: 0.03 + Math.random() * 0.02,
      });
    }
  }

  private spawnExplosion(lane: number, y: number) {
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      this.particles.push({
        x: lane * 100,
        y: -y - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 6,
        color: ['#ea580c', '#f59e0b', '#78350f', '#ef4444'][Math.floor(Math.random() * 4)],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // Gravity
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private addPopup(x: number, y: number, text: string, color: string) {
    this.popups.push({
      id: this.nextEntityId++,
      x: window.innerWidth ? window.innerWidth / 2 : 400,
      y: window.innerHeight ? window.innerHeight * 0.5 : 300,
      text,
      color,
      alpha: 1,
      vy: -1.8,
    });
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y += pop.vy;
      pop.alpha -= dt * 1.3;
      if (pop.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }
}
