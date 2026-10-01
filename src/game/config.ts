/**
 * Run Namibia - Central Gameplay & Engine Tuning Configuration
 * All tunable gameplay values, speeds, spawn thresholds, and loot values are centralized here.
 */

export const RUN_CONFIG = {
  // ==========================================
  // 1. MASTER AUDIO
  // ==========================================
  audio: {
    // Master volume (0.0 to 1.0)
    MASTER_VOLUME: 0.8,
  },

  // ==========================================
  // 2. DIFFICULTY TIMINGS & PROGRESSION
  // ==========================================
  difficultyProgression: {
    // Time in seconds when MEDIUM patterns begin appearing
    MEDIUM_START_TIME: 20.0,
    // Time in seconds when HARD patterns begin appearing
    HARD_START_TIME: 45.0,
    // First obstacle appears within 2-3 seconds from start
    FIRST_OBSTACLE_TIME: 2.3,
  },

  // ==========================================
  // 3. ROAD & PERSPECTIVE GEOMETRY
  // ==========================================
  road: {
    // Lane spacing multiplier (1.45 = roomy Subway Surfers track feel)
    laneSpacingMultiplier: 1.45,
    // Road coverage factor across screen width
    roadWidthFactorPortrait: 0.96,
    roadWidthFactorLandscape: 0.84,
    // Vanishing point road factor at horizon
    topRoadWidthFactor: 0.075,
    // Horizon vertical position (35% from top of canvas)
    horizonY: 0.35,
    // Ground baseline position (88% from top of canvas)
    groundY: 0.88,
    // Maximum render depth Z
    maxDepthZ: 620,
  },

  // ==========================================
  // 4. RUN SPEED & PROGRESSION CURVE
  // ==========================================
  speed: {
    // Starting base speed
    baseSpeed: 4.8,
    // Maximum sprint speed at high distances
    maxSpeed: 24.0,
    // Exponential ramp constant in meters
    rampDistance: 680,
    // Multipliers applied per selected difficulty preset
    difficultyMultipliers: {
      EASY: { speedScale: 0.85, maxSpeedScale: 0.75, scoreMult: 1.0 },
      MEDIUM: { speedScale: 1.0, maxSpeedScale: 1.0, scoreMult: 1.5 },
      HARD: { speedScale: 1.25, maxSpeedScale: 1.2, scoreMult: 2.2 },
    },
  },

  // ==========================================
  // 5. CHUNK & PATTERN SPAWNING
  // ==========================================
  chunks: {
    // Base length of one track chunk in Z distance units
    baseChunkLength: 115,
    // Distance ahead to spawn the very first obstacle (~2.3s reaction at base speed)
    firstObstacleDistance: 42,
    // How far ahead to maintain spawned chunks
    spawnAheadDistance: 590,
    // How far behind the player before recycling entities
    recycleBehindDistance: -30,
    // Dynamic spacing scaling factor with speed to keep player reaction time fair
    speedSpacingFactor: 0.038,
  },

  // ==========================================
  // 6. STATIONARY OBSTACLES (ROCKS & LOGS)
  // ==========================================
  stationary: {
    // Required jump height clearance for low rock and low log
    LOW_OBSTACLE_JUMP_HEIGHT: 30,
    // Height of raised log clearance (sliding player height is ~14)
    RAISED_LOG_HEIGHT: 26,
    // Boulder is impassable by jumping (must switch lanes)
    BOULDER_JUMP_HEIGHT: 999,
  },

  // ==========================================
  // 7. MOVING ANIMALS (CROSSING WILDLIFE)
  // ==========================================
  animals: {
    // Time in seconds warning marker flashes before animal enters road
    WARNING_TIME: 1.0,
    // Off-road starting X position for animals before crossing
    OFFROAD_START_X: 1.6,
    // Road verge exit threshold where animal is removed
    ROAD_EXIT_X: 1.55,
    // Crossing speeds across lanes (lateral units / second)
    speeds: {
      SPRINGBOK: 1.6, // Fast & agile
      OSTRICH: 1.45,  // Swift runner
      ZEBRA: 1.25,    // Medium pace
      LION: 1.85,     // Fast predator, dangerous timing
      RHINO: 0.85,    // Heavy, slow
      ELEPHANT: 0.65, // Massive, slowest
    },
    // Jumpability definitions
    canJumpOver: {
      SPRINGBOK: true,
      OSTRICH: true,
      ZEBRA: true,
      LION: false,     // Fast, must be timed
      RHINO: false,    // Huge, cannot jump
      ELEPHANT: false, // Massive, cannot jump
    },
    // Required jump height for jumpable animals
    requiredJumpHeights: {
      SPRINGBOK: 32,
      OSTRICH: 36,
      ZEBRA: 35,
      LION: 999,
      RHINO: 999,
      ELEPHANT: 999,
    },
    // Collision box scale reduction (10% smaller than visual sprite for fair near-misses)
    hitboxReduction: 0.10,
  },

  // ==========================================
  // 8. LOOT & COLLECTIBLES (COINS, GOLD, DIAMONDS)
  // ==========================================
  loot: {
    // Collectible tier point values
    COIN_VALUE: 10,       // 1x common
    GOLD_VALUE: 50,       // 5x uncommon (rainbows only)
    DIAMOND_VALUE: 150,   // 15x rare
    // Diamond minimum game time in seconds (never in first 20s)
    DIAMOND_MIN_TIME: 20.0,
    // Diamond appearance frequency (roughly 1 for every 8-10 chunks)
    DIAMOND_CHUNK_INTERVAL: 9,
    // Rainbow appearance frequency (approx. 1 for every 3-4 chunks)
    RAINBOW_FREQUENCY_CHUNKS: 3.5,
    // Rainbow minimum game time in seconds (never in first 10s)
    RAINBOW_MIN_TIME: 10.0,
    // Height of gold floating at rainbow apex (player must jump to reach)
    // Player peak jump height reaches ~115-118
    GOLD_APEX_HEIGHT: 110,
    // Forgiving pickup radius for gold jump apex
    GOLD_PICKUP_RADIUS: 34,
  },

  // ==========================================
  // 9. PLAYER MECHANICS
  // ==========================================
  player: {
    // Jump initial vertical velocity
    jumpVelocity: 13.0,
    // Gravity acceleration
    gravity: 28.0,
    // Duration in seconds of a ground slide
    slideDuration: 0.82,
    // Fast drop velocity when sliding in midair
    airDropVelocity: -16.0,
  },

  // ==========================================
  // 10. ENTITY SIZES & COLLISION TOLERANCES
  // ==========================================
  entities: {
    playerBaseSize: 125,
    obstacleBaseSize: 115,
    collectibleBaseSize: 66,
    sceneryBaseSize: 190,
  },

  collision: {
    // Normalized lane tolerance for collision (-1 to 1 space)
    laneHitTolerance: 0.52,
    // Longitudinal Z hit depth tolerance
    zHitTolerance: 14,
    // Collectible pickup Z tolerance
    collectibleZTolerance: 22,
    // Collectible pickup lane tolerance
    collectibleLaneTolerance: 0.65,
  },
};
