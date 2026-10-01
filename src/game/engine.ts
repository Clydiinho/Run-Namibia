import { sounds } from '../audio/soundManager';
import {
  AnimalType,
  Collectible,
  CollectibleType,
  DifficultyConfig,
  DifficultyLevel,
  GameStats,
  Lane,
  Obstacle,
  Particle,
  PlayerState,
  Rainbow,
  SceneryElement,
  ScorePopup,
} from '../types/game';
import { RUN_CONFIG } from './config';
import {
  BREATHING_PATTERNS,
  ChunkPattern,
  EASY_PATTERNS,
  HARD_PATTERNS,
  MEDIUM_PATTERNS,
} from './patterns';

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
    subtitle: 'Lightning reflexes · Fast hazards & wildlife crossings',
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
    isSliding: false,
    slideTimer: 0,
    runCycle: 0,
    tilt: 0,
    invulnerableTime: 0,
  };

  public obstacles: Obstacle[] = [];
  public collectibles: Collectible[] = [];
  public rainbows: Rainbow[] = [];
  public scenery: SceneryElement[] = [];
  public particles: Particle[] = [];
  public popups: ScorePopup[] = [];

  public stats: GameStats = {
    score: 0,
    distance: 0,
    coins: 0,
    gold: 0,
    gems: 0,
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
  private nextChunkZ: number = 20;
  private chunkCount: number = 0;
  private lastPatternId: string = '';
  private nextEntityId: number = 1;

  // Alternating direction for animal crossings (-1: right to left, 1: left to right)
  private nextAnimalDirection: -1 | 1 = 1;

  // Callback Hooks
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
      const saved = localStorage.getItem('namibia_run_high_scores');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.stats.highScore = parsed[this.stats.difficulty]?.score || 0;
        this.stats.bestDistance = parsed[this.stats.difficulty]?.distance || 0;
      }
    } catch {
      // ignore
    }
  }

  public saveHighScores() {
    try {
      const saved = localStorage.getItem('namibia_run_high_scores');
      const scores = saved ? JSON.parse(saved) : {};
      const currentDiff = this.stats.difficulty;

      const prevScore = scores[currentDiff]?.score || 0;
      const prevDist = scores[currentDiff]?.distance || 0;

      scores[currentDiff] = {
        score: Math.max(prevScore, Math.floor(this.stats.score)),
        distance: Math.max(prevDist, Math.floor(this.stats.distance)),
      };
      localStorage.setItem('namibia_run_high_scores', JSON.stringify(scores));
      this.stats.highScore = scores[currentDiff].score;
      this.stats.bestDistance = scores[currentDiff].distance;
    } catch {
      // ignore
    }
  }

  public reset() {
    this.player = {
      lane: 0,
      targetLane: 0,
      lanePosition: 0,
      y: 0,
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      runCycle: 0,
      tilt: 0,
      invulnerableTime: 0,
    };

    this.obstacles = [];
    this.collectibles = [];
    this.rainbows = [];
    this.particles = [];
    this.popups = [];

    const config = this.getConfig();
    this.stats.score = 0;
    this.stats.distance = 0;
    this.stats.coins = 0;
    this.stats.gold = 0;
    this.stats.gems = 0;
    this.stats.speed = config.baseSpeed;

    this.gameTime = 0;
    this.shake = { x: 0, y: 0 };
    this.isRunning = true;
    this.currentMilestone = null;
    this.milestoneTimer = 0;

    this.chunkCount = 0;
    this.lastPatternId = '';
    this.nextChunkZ = 15;
    this.nextAnimalDirection = 1;

    this.loadHighScores();
    this.seedInitialScenery();

    // Prime the track with initial chunks
    while (this.nextChunkZ < RUN_CONFIG.chunks.spawnAheadDistance) {
      this.spawnNextChunk();
    }
  }

  private seedInitialScenery() {
    this.scenery = [];
    for (let z = 40; z < RUN_CONFIG.road.maxDepthZ; z += 35) {
      const isLeft = Math.random() > 0.5;
      this.scenery.push({
        id: this.nextEntityId++,
        z,
        xOffset: isLeft ? -(0.55 + Math.random() * 1.3) : 0.55 + Math.random() * 1.3,
        type: Math.random() > 0.4 ? 'ACACIA_TREE' : Math.random() > 0.5 ? 'DEAD_VLEI_TREE' : 'DUNE_SHRUB',
        scale: 0.75 + Math.random() * 0.45,
      });
    }
  }

  // Steering Controls
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
    // Allow jump if grounded or near-ground
    if (!this.player.isJumping || this.player.y < 8) {
      this.player.vy = RUN_CONFIG.player.jumpVelocity;
      this.player.isJumping = true;
      this.player.isSliding = false;
      this.player.slideTimer = 0;
      sounds.playJump();
      this.spawnDust(8);
    }
  }

  public slide() {
    if (!this.isRunning) return;
    // Fast dive to ground if currently airborne
    if (this.player.isJumping && this.player.vy > 0) {
      this.player.vy = RUN_CONFIG.player.airDropVelocity;
    }

    // Enter ground slide state
    this.player.isSliding = true;
    this.player.slideTimer = RUN_CONFIG.player.slideDuration;
    sounds.playSlide();
    this.spawnDust(6);
  }

  // ==========================================
  // MAIN UPDATE LOOP
  // ==========================================
  public update(dt: number) {
    if (!this.isRunning) return;

    this.gameTime += dt;
    const config = this.getConfig();

    // 1. Dynamic Speed Progression Curve
    const speedProgress = 1 - Math.exp(-this.stats.distance / RUN_CONFIG.speed.rampDistance);
    this.stats.speed = config.baseSpeed + (config.maxSpeed - config.baseSpeed) * speedProgress;

    // World longitudinal motion delta
    const moveZ = this.stats.speed * dt * 28;
    this.stats.distance += (this.stats.speed * dt * 2.8) / 10;
    this.stats.score += dt * 10 * config.scoreMultiplier * (1 + this.stats.gems * 0.05 + this.stats.gold * 0.02);

    // 2. Check Landmarks / Milestones
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

    // 3. Player Lane Movement & Steering Banking
    const laneDelta = this.player.targetLane - this.player.lanePosition;
    this.player.lanePosition += laneDelta * Math.min(1, dt * 14);
    this.player.tilt = (this.player.targetLane - this.player.lanePosition) * 1.2;

    // 4. Slide Timer
    if (this.player.isSliding) {
      this.player.slideTimer -= dt;
      if (this.player.slideTimer <= 0) {
        this.player.isSliding = false;
        this.player.slideTimer = 0;
      }
    }

    // 5. Jump Kinematics
    if (this.player.isJumping) {
      this.player.y += this.player.vy * dt * 38;
      this.player.vy -= RUN_CONFIG.player.gravity * dt;
      if (this.player.y <= 0) {
        this.player.y = 0;
        this.player.vy = 0;
        this.player.isJumping = false;
        this.spawnDust(6);
      }
    } else {
      // Footstep dust puffs while running
      this.player.runCycle += dt * (10 + this.stats.speed * 0.5);
      if (Math.sin(this.player.runCycle) > 0.95 && Math.random() > 0.5 && !this.player.isSliding) {
        this.spawnDust(2);
      }
    }

    // 6. Update Entities
    this.updateObstacles(moveZ, dt);
    this.updateRainbows(moveZ);
    this.updateCollectibles(moveZ);
    this.updateScenery(moveZ);
    this.updateParticles(dt);
    this.updatePopups(dt);

    // 7. Screen Shake Decay
    this.shake.x *= 0.85;
    this.shake.y *= 0.85;
    if (Math.abs(this.shake.x) < 0.1) this.shake.x = 0;
    if (Math.abs(this.shake.y) < 0.1) this.shake.y = 0;

    // 8. Track Chunk Spawner
    this.nextChunkZ -= moveZ;
    while (this.nextChunkZ < RUN_CONFIG.chunks.spawnAheadDistance) {
      this.spawnNextChunk();
    }

    // Replenish Scenery
    this.maintainScenery();

    // 9. Collision & Pickup Checks
    this.checkCollisions();
  }

  // ==========================================
  // STRUCTURED CHUNK SPAWNER
  // ==========================================
  private spawnNextChunk() {
    const startZ = this.nextChunkZ;
    const chunkIdx = this.chunkCount++;
    const config = this.getConfig();

    // Dynamic chunk length scaling with speed to keep reaction time fair
    const speedRatio = (this.stats.speed - RUN_CONFIG.speed.baseSpeed) * RUN_CONFIG.chunks.speedSpacingFactor;
    const chunkLength = RUN_CONFIG.chunks.baseChunkLength * (1 + Math.max(0, speedRatio));

    // Chunk 0: Welcome coin run (breathing room)
    if (chunkIdx === 0) {
      this.applyPattern(BREATHING_PATTERNS[0], startZ);
      this.nextChunkZ += chunkLength * 0.85;
      return;
    }

    // Chunk 1: The very first obstacle! Appears in ~2-3 seconds at base speed
    if (chunkIdx === 1) {
      // One single low rock in center lane with safe coins
      const firstRockPattern: ChunkPattern = {
        id: 'chunk_first_rock',
        name: 'First Rock',
        difficulty: 'EASY',
        obstacles: [
          { relZ: RUN_CONFIG.chunks.firstObstacleDistance, lane: 0, type: 'LOW_ROCK' },
        ],
        collectibles: [
          { relZ: 20, lane: -1, type: 'COIN' },
          { relZ: 40, lane: -1, type: 'COIN' },
          { relZ: 20, lane: 1, type: 'COIN' },
          { relZ: 40, lane: 1, type: 'COIN' },
        ],
      };
      this.applyPattern(firstRockPattern, startZ);
      this.nextChunkZ += chunkLength;
      return;
    }

    // SEQUENCING RULES:
    // 1. Always alternate between a Challenge Chunk and a Breathing-Room Chunk.
    // 2. Chunks 2-4: EASY only.
    // 3. Introduce MEDIUM after 20s (or chunk 6+).
    // 4. Introduce HARD after 45s.
    // 5. Never repeat the same pattern twice in a row.

    const isBreathing = chunkIdx % 2 === 1;

    let chosenPool: ChunkPattern[];

    if (isBreathing) {
      chosenPool = BREATHING_PATTERNS;
    } else {
      // Determine difficulty tier based on elapsed gameTime and config
      const time = this.gameTime;
      const isHardAllowed = time >= RUN_CONFIG.difficultyProgression.HARD_START_TIME || config.level === 'HARD';
      const isMediumAllowed = time >= RUN_CONFIG.difficultyProgression.MEDIUM_START_TIME || config.level === 'MEDIUM' || config.level === 'HARD';

      if (chunkIdx <= 4 || (!isMediumAllowed && !isHardAllowed)) {
        chosenPool = EASY_PATTERNS;
      } else if (!isHardAllowed || Math.random() < 0.5) {
        chosenPool = MEDIUM_PATTERNS;
      } else {
        chosenPool = HARD_PATTERNS;
      }
    }

    // Filter out the last used pattern to avoid immediate repeats
    const validPatterns = chosenPool.filter((p) => p.id !== this.lastPatternId);
    const pattern = validPatterns[Math.floor(Math.random() * validPatterns.length)] || chosenPool[0];

    this.lastPatternId = pattern.id;
    this.applyPattern(pattern, startZ);

    this.nextChunkZ += chunkLength;
  }

  /**
   * Instantiates obstacles, rainbows, and collectibles from a pattern onto the track
   */
  private applyPattern(pattern: ChunkPattern, startZ: number) {
    // 1. Rainbow
    if (pattern.hasRainbow && pattern.rainbow) {
      const rainbowZ = startZ + pattern.rainbow.relZ;
      const apexLane = pattern.rainbow.apexLane;

      this.rainbows.push({
        id: this.nextEntityId++,
        z: rainbowZ,
        apexLane,
        passed: false,
      });
    }

    // 2. Obstacles (Rocks, Logs, Crossing Animals)
    for (const obsDef of pattern.obstacles) {
      const obstacleZ = startZ + obsDef.relZ;

      if (obsDef.isAnimal && obsDef.animalType) {
        // MOVING ANIMAL CROSSING
        // Direction alternates: some left to right, some right to left
        const direction = obsDef.crossingDirection !== undefined ? obsDef.crossingDirection : this.nextAnimalDirection;
        this.nextAnimalDirection = (this.nextAnimalDirection === 1 ? -1 : 1);

        const animalType = obsDef.animalType;
        const speed = RUN_CONFIG.animals.speeds[animalType] || 1.2;
        const startX = direction === 1 ? -RUN_CONFIG.animals.OFFROAD_START_X : RUN_CONFIG.animals.OFFROAD_START_X;
        const warningSide = direction === 1 ? 'left' : 'right';

        const canJumpOver = RUN_CONFIG.animals.canJumpOver[animalType] ?? false;
        const requiredJumpHeight = RUN_CONFIG.animals.requiredJumpHeights[animalType] ?? 999;

        const animalObstacle: Obstacle = {
          id: this.nextEntityId++,
          z: obstacleZ,
          lane: obsDef.lane,
          lanePos: startX,
          type: animalType,
          width: 32,
          height: 32,
          passed: false,
          isMoving: true,
          isAnimal: true,
          animalType,
          crossingDirection: direction,
          crossingSpeed: speed,
          warningSide,
          warningTimer: RUN_CONFIG.animals.WARNING_TIME, // 1 second warning before crossing
          warningPlayed: false,
          hasEnteredRoad: false,
          hasLeftRoad: false,
          canJumpOver,
          requiredJumpHeight,
          animTime: Math.random() * 5,
        };

        this.obstacles.push(animalObstacle);
      } else {
        // STATIONARY OBSTACLE (LOW_ROCK, BOULDER, LOW_LOG, RAISED_LOG)
        this.obstacles.push({
          id: this.nextEntityId++,
          z: obstacleZ,
          lane: obsDef.lane,
          lanePos: obsDef.lane,
          type: obsDef.type,
          width: 30,
          height: obsDef.type === 'RAISED_LOG' || obsDef.type === 'BOULDER' ? 45 : 30,
          passed: false,
          isMoving: false,
          isAnimal: false,
        });
      }
    }

    // 3. Collectibles (Coins, Gold on Rainbows, Diamonds)
    for (const colDef of pattern.collectibles) {
      this.collectibles.push({
        id: this.nextEntityId++,
        z: startZ + colDef.relZ,
        lane: colDef.lane,
        type: colDef.type,
        collected: false,
        yOffset: colDef.yOffset || 0,
        rotation: Math.random() * Math.PI,
      });
    }
  }

  // ==========================================
  // ENTITY LIFECYCLE & PHYSICS UPDATES
  // ==========================================
  private updateObstacles(moveZ: number, dt: number) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= moveZ;
      obs.animTime = (obs.animTime || 0) + dt;

      // Handle Moving Animal Crossing Behavior
      if (obs.isAnimal && obs.animalType) {
        if ((obs.warningTimer ?? 0) > 0) {
          // Play warning audio cue once when warning begins
          if (!obs.warningPlayed) {
            obs.warningPlayed = true;
            sounds.playAnimalSound(obs.animalType, true);
          }
          obs.warningTimer = (obs.warningTimer ?? 0) - dt;
        } else {
          // Warning finished: play full entrance sound on entry
          if (!obs.hasEnteredRoad) {
            obs.hasEnteredRoad = true;
            sounds.playAnimalSound(obs.animalType, false);
          }

          // Advance sideways crossing across all 3 lanes at steady speed
          const dir = obs.crossingDirection ?? 1;
          const spd = obs.crossingSpeed ?? 1.2;
          obs.lanePos += dir * spd * dt;

          // Discrete lane assignment for spatial lookups
          obs.lane = (obs.lanePos < -0.33 ? -1 : obs.lanePos > 0.33 ? 1 : 0) as Lane;

          // Check if animal has finished crossing and left the road
          if (
            (dir === 1 && obs.lanePos > RUN_CONFIG.animals.ROAD_EXIT_X) ||
            (dir === -1 && obs.lanePos < -RUN_CONFIG.animals.ROAD_EXIT_X)
          ) {
            obs.hasLeftRoad = true;
          }
        }
      }

      // Remove obstacles behind player or animals that completed crossing
      if (obs.z < RUN_CONFIG.chunks.recycleBehindDistance || obs.hasLeftRoad) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateRainbows(moveZ: number) {
    for (let i = this.rainbows.length - 1; i >= 0; i--) {
      const rainbow = this.rainbows[i];
      rainbow.z -= moveZ;
      if (rainbow.z < RUN_CONFIG.chunks.recycleBehindDistance) {
        this.rainbows.splice(i, 1);
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

  private maintainScenery() {
    const highestSceneryZ = this.scenery.reduce((max, s) => Math.max(max, s.z), 0);
    if (highestSceneryZ < RUN_CONFIG.road.maxDepthZ) {
      const nextZ = Math.max(highestSceneryZ + 35, RUN_CONFIG.road.maxDepthZ - 40);
      const isLeft = Math.random() > 0.5;
      this.scenery.push({
        id: this.nextEntityId++,
        z: nextZ,
        xOffset: isLeft ? -(0.55 + Math.random() * 1.3) : 0.55 + Math.random() * 1.3,
        type: Math.random() > 0.4 ? 'ACACIA_TREE' : Math.random() > 0.5 ? 'DEAD_VLEI_TREE' : 'DUNE_SHRUB',
        scale: 0.75 + Math.random() * 0.45,
      });
    }
  }

  // ==========================================
  // COLLISION DETECTION & LOOT COLLECTION
  // ==========================================
  private checkCollisions() {
    const playerZ = 25;
    const playerLane = this.player.lanePosition;
    const playerY = this.player.y;
    const isSliding = this.player.isSliding;
    const config = this.getConfig();

    // 1. Collectibles Check (COIN, GOLD on Rainbows, DIAMOND)
    for (let i = 0; i < this.collectibles.length; i++) {
      const col = this.collectibles[i];
      if (col.collected) continue;

      const dz = Math.abs(col.z - playerZ);
      const dLane = Math.abs(playerLane - col.lane);

      // Gold at rainbow apex requires jumping to reach!
      if (col.type === 'GOLD') {
        const apexY = RUN_CONFIG.loot.GOLD_APEX_HEIGHT;
        const dy = Math.abs(playerY - apexY);
        // Forgiving radius around rainbow apex
        if (
          dz < RUN_CONFIG.collision.collectibleZTolerance + 8 &&
          dLane < RUN_CONFIG.collision.collectibleLaneTolerance + 0.15 &&
          dy < RUN_CONFIG.loot.GOLD_PICKUP_RADIUS &&
          playerY > 65 // Must be near peak of jump, cannot pick up on ground or sliding
        ) {
          col.collected = true;
          const goldVal = Math.round(RUN_CONFIG.loot.GOLD_VALUE * config.scoreMultiplier);
          this.stats.score += goldVal;
          this.stats.gold += 1;
          sounds.playGold();
          this.addPopup(0, -75, `+${goldVal} GOLD! ✨`, '#facc15');
          this.spawnSparkles(col.lane, playerY + 20, '#facc15', 18);
        }
      } else {
        // Standard coins & diamonds
        if (dz < RUN_CONFIG.collision.collectibleZTolerance && dLane < RUN_CONFIG.collision.collectibleLaneTolerance) {
          col.collected = true;

          if (col.type === 'COIN') {
            const coinVal = Math.round(RUN_CONFIG.loot.COIN_VALUE * config.scoreMultiplier);
            this.stats.score += coinVal;
            this.stats.coins += 1;
            sounds.playCoin();
            this.addPopup(0, -60, `+${coinVal} N$`, '#fde047');
            this.spawnSparkles(col.lane, playerY + 20, '#facc15', 6);
          } else if (col.type === 'DIAMOND') {
            const gemVal = Math.round(RUN_CONFIG.loot.DIAMOND_VALUE * config.scoreMultiplier);
            this.stats.score += gemVal;
            this.stats.gems += 1;
            sounds.playDiamond();
            this.addPopup(0, -70, `+${gemVal} DIAMOND! 💎`, '#38bdf8');
            this.spawnSparkles(col.lane, playerY + 20, '#38bdf8', 20);
          }
        }
      }
    }

    // 2. Obstacles Collision Check
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dz = Math.abs(obs.z - playerZ);
      const obstacleLaneX = obs.lanePos !== undefined ? obs.lanePos : obs.lane;
      const dLane = Math.abs(playerLane - obstacleLaneX);

      // Hitbox reduction for animals (10% smaller for fair near misses)
      const reduction = obs.isAnimal ? (1 - RUN_CONFIG.animals.hitboxReduction) : 1.0;
      const hitToleranceZ = RUN_CONFIG.collision.zHitTolerance * reduction;
      const hitToleranceLane = RUN_CONFIG.collision.laneHitTolerance * reduction;

      // Animals only cause a crash while ON the road (lanePos between -1.2 and +1.2)
      if (obs.isAnimal && (obs.lanePos < -1.25 || obs.lanePos > 1.25)) {
        continue;
      }

      if (dz < hitToleranceZ && dLane < hitToleranceLane) {
        // Check Obstacle Avoidance Rules:

        // A. RAISED_LOG: Must slide under!
        if (obs.type === 'RAISED_LOG') {
          if (isSliding && playerY < 12) {
            // Safely slid underneath!
            if (!obs.passed) {
              obs.passed = true;
              const slideBonus = Math.round(20 * config.scoreMultiplier);
              this.stats.score += slideBonus;
              this.addPopup(0, -50, `SLID UNDER! +${slideBonus}`, '#38bdf8');
              this.spawnSparkles(obstacleLaneX, 10, '#38bdf8', 8);
            }
            continue;
          } else {
            // Hit raised log because player didn't slide
            this.handleCrash(obs);
            break;
          }
        }

        // B. LOW_ROCK and LOW_LOG: Must jump over!
        if (obs.type === 'LOW_ROCK' || obs.type === 'LOW_LOG') {
          const reqHeight = RUN_CONFIG.stationary.LOW_OBSTACLE_JUMP_HEIGHT;
          if (playerY > reqHeight) {
            if (!obs.passed) {
              obs.passed = true;
              const jumpBonus = Math.round(20 * config.scoreMultiplier);
              this.stats.score += jumpBonus;
              this.addPopup(0, -50, `LEAPED! +${jumpBonus}`, '#4ade80');
              this.spawnSparkles(obstacleLaneX, 10, '#4ade80', 6);
            }
            continue;
          } else {
            this.handleCrash(obs);
            break;
          }
        }

        // C. BOULDER: Large, cannot jump over! Must switch lanes
        if (obs.type === 'BOULDER') {
          this.handleCrash(obs);
          break;
        }

        // D. MOVING ANIMALS (Lion, Rhino, Elephant, Zebra, Springbok, Ostrich)
        if (obs.isAnimal) {
          if (obs.canJumpOver && playerY > (obs.requiredJumpHeight ?? 32)) {
            // Leaped over smaller animal (Springbok, Ostrich, Zebra)
            if (!obs.passed) {
              obs.passed = true;
              const animalBonus = Math.round(30 * config.scoreMultiplier);
              this.stats.score += animalBonus;
              this.addPopup(0, -55, `VAULTED ${obs.animalType}! +${animalBonus}`, '#4ade80');
              this.spawnSparkles(obstacleLaneX, 15, '#4ade80', 10);
            }
            continue;
          } else {
            // Touched crossing animal: counts as crash!
            this.handleCrash(obs);
            break;
          }
        }
      }
    }
  }

  private handleCrash(obs: Obstacle) {
    this.isRunning = false;
    sounds.playHit();
    sounds.playGameOver();
    sounds.stopMusic();

    // Camera shake
    this.shake = {
      x: (Math.random() - 0.5) * 28,
      y: (Math.random() - 0.5) * 28,
    };

    // Sand and impact particles
    const laneX = obs.lanePos !== undefined ? obs.lanePos : obs.lane;
    this.spawnExplosion(laneX, this.player.y);

    this.saveHighScores();

    if (this.onGameOverCallback) {
      this.onGameOverCallback(this.stats);
    }
  }

  // ==========================================
  // VISUAL EFFECTS & POPUPS
  // ==========================================
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
        alpha: 0.9,
        decay: 0.02 + Math.random() * 0.02,
      });
    }
  }

  private spawnExplosion(lane: number, y: number) {
    const colors = ['#f59e0b', '#dc2626', '#78350f', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x: lane * 100,
        y: -y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
      });
    }
  }

  private addPopup(x: number, y: number, text: string, color: string = '#fde047') {
    this.popups.push({
      id: this.nextEntityId++,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      vy: -1.4,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay * (dt * 60);
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.y += popup.vy * (dt * 60);
      popup.alpha -= 0.015 * (dt * 60);
      if (popup.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }
}
