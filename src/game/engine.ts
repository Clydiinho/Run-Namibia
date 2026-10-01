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
    baseSpeed: 7.0,
    maxSpeed: 16.0,
    obstacleSpacing: 155,
    scoreMultiplier: 1.0,
    movingAnimalRate: 0.15,
  },
  MEDIUM: {
    level: 'MEDIUM',
    name: 'Desert Dash',
    subtitle: 'The authentic run · Dynamic wildlife & obstacles',
    tag: 'Normal · 1.5x',
    baseSpeed: 8.8,
    maxSpeed: 23.0,
    obstacleSpacing: 115,
    scoreMultiplier: 1.5,
    movingAnimalRate: 0.45,
  },
  HARD: {
    level: 'HARD',
    name: 'Kalahari Beast',
    subtitle: 'Lightning reflexes · Darting animals & fast hazards',
    tag: 'Hard · 2.2x',
    baseSpeed: 12.0,
    maxSpeed: 30.0,
    obstacleSpacing: 82,
    scoreMultiplier: 2.2,
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
    speed: 8.8,
    highScore: 0,
    bestDistance: 0,
    difficulty: 'MEDIUM',
  };

  public shake = { x: 0, y: 0 };
  public gameTime: number = 0;
  public isRunning: boolean = false;
  public currentMilestone: MilestoneEvent | null = null;
  public milestoneTimer: number = 0;

  private nextEntityId: number = 1;
  private lastObstacleZ: number = 200;
  private lastSceneryZ: number = 0;
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
    this.lastObstacleZ = 200;
    this.lastSceneryZ = 0;
    this.currentMilestone = null;
    this.milestoneTimer = 0;

    this.seedInitialScenery();
    this.isRunning = true;
  }

  private seedInitialScenery() {
    this.scenery = [];
    for (let z = 50; z < 550; z += 45) {
      // Left side scenery
      this.scenery.push({
        id: this.nextEntityId++,
        z,
        xOffset: -(0.5 + Math.random() * 1.5),
        type: Math.random() > 0.3 ? 'ACACIA_TREE' : 'DEAD_VLEI_TREE',
        scale: 0.8 + Math.random() * 0.4,
      });
      // Right side scenery
      this.scenery.push({
        id: this.nextEntityId++,
        z: z + 20,
        xOffset: 0.5 + Math.random() * 1.5,
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

    // 1. Distance & Progressive Speed Scaling
    // Speed ramps up based on difficulty settings
    const speedRamp = Math.min(1.8, this.stats.distance / 350);
    this.stats.speed = Math.min(
      config.maxSpeed,
      config.baseSpeed * (1 + speedRamp * 0.75)
    );

    const moveZ = this.stats.speed * dt * 28;
    this.stats.distance += (this.stats.speed * dt * 2.8) / 10;
    this.stats.score += dt * 10 * config.scoreMultiplier * (1 + this.stats.gems * 0.1);

    // 2. Check Milestones
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

    // 3. Player Lane Movement & Banking Physics
    const laneDelta = this.player.targetLane - this.player.lanePosition;
    this.player.lanePosition += laneDelta * Math.min(1, dt * 14);
    this.player.tilt = (this.player.targetLane - this.player.lanePosition) * 1.2;

    // 4. Player Jump Kinematics
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
      this.player.runCycle += dt * (12 + this.stats.speed * 0.6);
      if (Math.sin(this.player.runCycle) > 0.95 && Math.random() > 0.5) {
        this.spawnDust(2);
      }
    }

    // 5. Update World Objects (Move towards player along Z axis)
    this.updateObstacles(moveZ, dt);
    this.updateCollectibles(moveZ);
    this.updateScenery(moveZ);
    this.updateParticles(dt);
    this.updatePopups(dt);

    // 6. Camera Screen Shake Decay
    this.shake.x *= 0.85;
    this.shake.y *= 0.85;
    if (Math.abs(this.shake.x) < 0.1) this.shake.x = 0;
    if (Math.abs(this.shake.y) < 0.1) this.shake.y = 0;

    // 7. Spawn New Entities
    this.spawnEntities();

    // 8. Collision Detection
    this.checkCollisions();
  }

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

      if (obs.z < -20) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCollectibles(moveZ: number) {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.z -= moveZ;
      col.rotation += 0.05;
      if (col.z < -20 || col.collected) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private updateScenery(moveZ: number) {
    for (let i = this.scenery.length - 1; i >= 0; i--) {
      const s = this.scenery[i];
      s.z -= moveZ;
      if (s.z < -30) {
        this.scenery.splice(i, 1);
      }
    }
  }

  private spawnEntities() {
    const maxZ = 550;
    const config = this.getConfig();

    // Continuous Scenery Generation on both road verges
    const highestSceneryZ = this.scenery.reduce((max, s) => Math.max(max, s.z), 0);
    if (highestSceneryZ < maxZ) {
      const nextZ = Math.max(highestSceneryZ + 35, maxZ - 50);
      const isLeft = Math.random() > 0.5;
      this.scenery.push({
        id: this.nextEntityId++,
        z: nextZ,
        xOffset: isLeft ? -(0.5 + Math.random() * 1.5) : 0.5 + Math.random() * 1.5,
        type: Math.random() > 0.35 ? 'ACACIA_TREE' : Math.random() > 0.5 ? 'DEAD_VLEI_TREE' : 'DUNE_SHRUB',
        scale: 0.75 + Math.random() * 0.5,
      });
    }

    // Obstacle & Collectible Spawning
    const highestObstacleZ = this.obstacles.reduce((max, o) => Math.max(max, o.z), 0);
    const minSpacing = Math.max(55, config.obstacleSpacing - this.stats.speed * 1.8);

    if (highestObstacleZ < maxZ - minSpacing) {
      const spawnZ = maxZ;

      // Warmup period for players to settle in (shorter on Hard)
      const warmupDistance = config.level === 'HARD' ? 15 : config.level === 'MEDIUM' ? 30 : 50;
      const isWarmup = this.stats.distance < warmupDistance;
      const spawnTypeRoll = Math.random();

      if (!isWarmup && spawnTypeRoll < 0.72) {
        // Spawn Obstacle
        const availableLanes: Lane[] = [-1, 0, 1];
        const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

        // Rich variety of obstacles: Animals & Hazards
        // Animals: ORYX, SPRINGBOK, WARTHOG, OSTRICH, MEERKAT
        // Hazards: ROCK, ACACIA_BUSH, FALLEN_TRUNK, ROAD_BARRIER
        const obstaclePool: ObstacleType[] = [
          'ORYX',
          'SPRINGBOK',
          'WARTHOG',
          'OSTRICH',
          'MEERKAT',
          'FALLEN_TRUNK',
          'ROCK',
          'ACACIA_BUSH',
          'ROAD_BARRIER',
        ];

        // Weight towards animals as requested
        const isAnimal = Math.random() < 0.68;
        let obsType: ObstacleType;

        if (isAnimal) {
          const animals: ObstacleType[] = ['ORYX', 'SPRINGBOK', 'WARTHOG', 'OSTRICH', 'MEERKAT'];
          obsType = animals[Math.floor(Math.random() * animals.length)];
        } else {
          const hazards: ObstacleType[] = ['FALLEN_TRUNK', 'ROCK', 'ACACIA_BUSH', 'ROAD_BARRIER'];
          obsType = hazards[Math.floor(Math.random() * hazards.length)];
        }

        // Moving Animal behavior
        const canMove = obsType === 'WARTHOG' || obsType === 'SPRINGBOK' || obsType === 'OSTRICH' || obsType === 'ORYX';
        const shouldMove = canMove && Math.random() < config.movingAnimalRate;
        const moveSpeed = obsType === 'WARTHOG' ? 1.4 : obsType === 'SPRINGBOK' ? 1.2 : 0.8;
        const moveDirection = Math.random() > 0.5 ? 1 : -1;

        this.obstacles.push({
          id: this.nextEntityId++,
          z: spawnZ,
          lane: chosenLane,
          lanePos: chosenLane,
          type: obsType,
          width: 30,
          height: obsType === 'ROAD_BARRIER' || obsType === 'ORYX' || obsType === 'OSTRICH' ? 50 : 30,
          passed: false,
          isMoving: shouldMove,
          vx: shouldMove ? moveDirection * moveSpeed : 0,
          animTime: Math.random() * 10,
        });

        // On HARD mode and high distance, occasionally spawn a second obstacle in another lane!
        if (config.level === 'HARD' && this.stats.distance > 150 && Math.random() < 0.35) {
          const otherLanes = availableLanes.filter((l) => l !== chosenLane);
          const secondLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
          this.obstacles.push({
            id: this.nextEntityId++,
            z: spawnZ + 35,
            lane: secondLane,
            lanePos: secondLane,
            type: 'FALLEN_TRUNK',
            width: 30,
            height: 25,
            passed: false,
            isMoving: false,
          });
        }

        // Spawn a collectible in an open lane to reward dodging!
        const openLanes = availableLanes.filter((l) => l !== chosenLane);
        if (openLanes.length > 0) {
          const rewardLane = openLanes[Math.floor(Math.random() * openLanes.length)];
          const isDiamond = Math.random() < 0.3;

          this.collectibles.push({
            id: this.nextEntityId++,
            z: spawnZ,
            lane: rewardLane,
            type: isDiamond ? 'DIAMOND' : 'COIN',
            collected: false,
            yOffset: 0,
            rotation: Math.random() * Math.PI,
          });
        }
      } else {
        // Spawn a rewarding trail of coins / diamonds in a single lane
        const trailLane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
        const isStar = Math.random() < 0.18;
        const colType: CollectibleType = isStar ? 'STAR' : Math.random() < 0.35 ? 'DIAMOND' : 'COIN';

        for (let i = 0; i < 3; i++) {
          this.collectibles.push({
            id: this.nextEntityId++,
            z: spawnZ + i * 26,
            lane: trailLane,
            type: colType,
            collected: false,
            yOffset: 0,
            rotation: i * 0.4,
          });
        }
      }
    }
  }

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

      if (dz < 18 && dLane < 0.6) {
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
      const hitToleranceZ = obs.type === 'FALLEN_TRUNK' ? 16 : 14;
      const hitToleranceLane = obs.type === 'FALLEN_TRUNK' ? 0.6 : 0.52;

      if (dz < hitToleranceZ && dLane < hitToleranceLane) {
        // Can player jump over this obstacle?
        // Heights vary by creature/obstacle
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
          // Tall creatures with long horns/neck: difficult jump, dodging advised!
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

        // CRASH!
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

    // Vigorous screen shake
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
        x: (lane * 100),
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
      p.vy += 0.08; // Slight gravity
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

