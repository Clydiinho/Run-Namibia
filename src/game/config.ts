/**
 * Run Namibia - Gameplay & Engine Tuning Configuration
 * All tunable values are centralized here for easy gameplay balancing.
 */

export const RUN_CONFIG = {
  // ==========================================
  // 1. ROAD & CAMERA GEOMETRY
  // ==========================================
  road: {
    // Lane spacing multiplier (1.45 = 45% wider lanes for roomy Subway Surfers feel)
    laneSpacingMultiplier: 1.45,
    // Road coverage factor across screen width (portrait: 0.96, landscape: 0.84)
    roadWidthFactorPortrait: 0.96,
    roadWidthFactorLandscape: 0.84,
    // Vanishing point top road width factor at horizon
    topRoadWidthFactor: 0.075,
    // Horizon vertical position (0.34 = 34% from top of canvas)
    horizonY: 0.35,
    // Ground baseline position (0.88 = 88% from top of canvas)
    groundY: 0.88,
    // Maximum render depth Z
    maxDepthZ: 620,
  },

  // ==========================================
  // 2. RUN SPEED & PROGRESSION CURVE
  // ==========================================
  speed: {
    // Starting speed (about 55% of previous speed for comfortable, accessible start)
    baseSpeed: 4.8,
    // Maximum sprint speed at high distances
    maxSpeed: 25.0,
    // Ramp distance constant k (in meters).
    // Speed curve: speed = baseSpeed + (maxSpeed - baseSpeed) * (1 - exp(-distance / rampDistance))
    rampDistance: 650,
    // Multipliers applied per difficulty level
    difficultyMultipliers: {
      EASY: { speedScale: 0.85, maxSpeedScale: 0.75, scoreMult: 1.0 },
      MEDIUM: { speedScale: 1.0, maxSpeedScale: 1.0, scoreMult: 1.5 },
      HARD: { speedScale: 1.25, maxSpeedScale: 1.2, scoreMult: 2.2 },
    },
  },

  // ==========================================
  // 3. CHUNK & OBSTACLE PATTERN SPAWNING
  // ==========================================
  chunks: {
    // Base length of one track chunk in Z distance units
    baseChunkLength: 110,
    // Distance ahead to spawn the very first obstacle (~2.5s reaction at base speed)
    firstObstacleDistance: 45,
    // How far ahead of the player to maintain spawned chunks
    spawnAheadDistance: 580,
    // How far behind the player before recycling/removing entities
    recycleBehindDistance: -25,
    // Dynamic chunk length scaling factor with speed to keep reaction time fair
    speedSpacingFactor: 0.035,
  },

  // ==========================================
  // 4. ENTITY SIZES & VISUAL SCALING
  // ==========================================
  entities: {
    // Player character size multiplier (scaled up to match wider lanes)
    playerBaseSize: 125, // previous was 95
    // Obstacle base size (rocks, animals, barriers)
    obstacleBaseSize: 115, // previous was 85
    // Collectibles base size (coins, diamonds, stars)
    collectibleBaseSize: 66, // previous was 52
    // Scenery base size (trees, shrubs)
    sceneryBaseSize: 190,
  },

  // ==========================================
  // 5. COLLISION & HITBOX TOLERANCES
  // ==========================================
  collision: {
    // Normalized lane tolerance for collision (-1 to 1 space)
    laneHitTolerance: 0.56,
    // Longitudinal Z hit depth tolerance
    zHitTolerance: 15,
    // Trunk hit depth tolerance
    trunkZHitTolerance: 18,
    // Collectible pickup Z tolerance
    collectibleZTolerance: 22,
    // Collectible pickup lane tolerance
    collectibleLaneTolerance: 0.65,
  },
};
