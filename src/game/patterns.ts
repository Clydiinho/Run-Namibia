import { AnimalType, CollectibleType, Lane, ObstacleType } from '../types/game';

/**
 * Chunk Pattern Definition
 * Each pattern specifies fixed relative Z positions (0 to chunkLength)
 * for obstacles, collectibles, animal crossings, and rainbows.
 */
export interface PatternObstacleDef {
  relZ: number; // Offset from start of chunk (e.g. 20, 45, 75)
  lane: Lane;
  type: ObstacleType;
  isAnimal?: boolean;
  animalType?: AnimalType;
  crossingDirection?: -1 | 1; // Optional override, otherwise engine alternates
}

export interface PatternCollectibleDef {
  relZ: number;
  lane: Lane;
  type: CollectibleType;
  yOffset?: number; // 0 for ground, >0 for jump arcs or rainbow apex
}

export interface PatternRainbowDef {
  relZ: number;
  apexLane: Lane; // Lane where rainbow apex and gold pickup float
}

export interface ChunkPattern {
  id: string;
  name: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'BREATHING';
  isBreathing?: boolean;
  hasAnimal?: boolean;
  hasRainbow?: boolean;
  hasDiamond?: boolean;
  rainbow?: PatternRainbowDef;
  obstacles: PatternObstacleDef[];
  collectibles: PatternCollectibleDef[];
}

// ==========================================
// 1. BREATHING ROOM PATTERNS (Recovery)
// ==========================================
export const BREATHING_PATTERNS: ChunkPattern[] = [
  {
    id: 'breath_straight_coins',
    name: 'Center Lane Coin Run',
    difficulty: 'BREATHING',
    isBreathing: true,
    obstacles: [],
    collectibles: [
      { relZ: 15, lane: 0, type: 'COIN' },
      { relZ: 35, lane: 0, type: 'COIN' },
      { relZ: 55, lane: 0, type: 'COIN' },
      { relZ: 75, lane: 0, type: 'COIN' },
      { relZ: 95, lane: 0, type: 'COIN' },
    ],
  },
  {
    id: 'breath_zigzag_coins',
    name: 'Gentle Zig-Zag Coins',
    difficulty: 'BREATHING',
    isBreathing: true,
    obstacles: [],
    collectibles: [
      { relZ: 20, lane: -1, type: 'COIN' },
      { relZ: 40, lane: 0, type: 'COIN' },
      { relZ: 60, lane: 1, type: 'COIN' },
      { relZ: 80, lane: 0, type: 'COIN' },
    ],
  },
  {
    id: 'breath_split_trail',
    name: 'Dual Flank Trails',
    difficulty: 'BREATHING',
    isBreathing: true,
    obstacles: [],
    collectibles: [
      { relZ: 20, lane: -1, type: 'COIN' },
      { relZ: 40, lane: -1, type: 'COIN' },
      { relZ: 60, lane: 1, type: 'COIN' },
      { relZ: 80, lane: 1, type: 'COIN' },
    ],
  },
];

// ==========================================
// 2. EASY PATTERNS
// ==========================================
export const EASY_PATTERNS: ChunkPattern[] = [
  {
    // Pattern: Empty chunk with a coin line (breathing room)
    id: 'easy_empty_coin_line',
    name: 'Open Road Coin Trail',
    difficulty: 'EASY',
    isBreathing: true,
    obstacles: [],
    collectibles: [
      { relZ: 20, lane: 0, type: 'COIN' },
      { relZ: 40, lane: 0, type: 'COIN' },
      { relZ: 60, lane: 0, type: 'COIN' },
      { relZ: 80, lane: 0, type: 'COIN' },
    ],
  },
  {
    // Pattern: One low rock in a single lane, coins in the other lanes
    id: 'easy_low_rock_single',
    name: 'Low Rock with Safe Coins',
    difficulty: 'EASY',
    obstacles: [
      { relZ: 45, lane: 0, type: 'LOW_ROCK' },
    ],
    collectibles: [
      { relZ: 30, lane: -1, type: 'COIN' },
      { relZ: 50, lane: -1, type: 'COIN' },
      { relZ: 70, lane: 1, type: 'COIN' },
    ],
  },
  {
    // Pattern: One log (jump) in a single lane
    id: 'easy_low_log_single',
    name: 'Low Log Jump Trial',
    difficulty: 'EASY',
    obstacles: [
      { relZ: 45, lane: 1, type: 'LOW_LOG' },
    ],
    collectibles: [
      { relZ: 25, lane: -1, type: 'COIN' },
      { relZ: 45, lane: -1, type: 'COIN' },
      { relZ: 65, lane: -1, type: 'COIN' },
    ],
  },
  {
    // Pattern: A rainbow over a clear lane with gold at the top, coins on the ground
    id: 'easy_rainbow_clear_lane',
    name: 'Scenic Rainbow Arch with Gold',
    difficulty: 'EASY',
    hasRainbow: true,
    rainbow: { relZ: 50, apexLane: 0 },
    obstacles: [],
    collectibles: [
      // Ground coins leading up to rainbow
      { relZ: 20, lane: 0, type: 'COIN', yOffset: 0 },
      // Floating Gold bar at rainbow apex (jump height 110)
      { relZ: 50, lane: 0, type: 'GOLD', yOffset: 110 },
      // Ground coin after landing
      { relZ: 80, lane: 0, type: 'COIN', yOffset: 0 },
    ],
  },
];

// ==========================================
// 3. MEDIUM PATTERNS
// ==========================================
export const MEDIUM_PATTERNS: ChunkPattern[] = [
  {
    // Pattern: Two obstacles in two lanes, one lane left open with coins
    id: 'med_two_obstacles_one_open',
    name: 'Double Hazard (Right Lane Clear)',
    difficulty: 'MEDIUM',
    obstacles: [
      { relZ: 45, lane: -1, type: 'BOULDER' },
      { relZ: 45, lane: 0, type: 'LOW_ROCK' },
    ],
    collectibles: [
      { relZ: 25, lane: 1, type: 'COIN' },
      { relZ: 45, lane: 1, type: 'COIN' },
      { relZ: 65, lane: 1, type: 'COIN' },
    ],
  },
  {
    // Pattern: A raised log (slide) across the lane with coins after it
    id: 'med_raised_log_slide',
    name: 'Raised Log Slide Gate',
    difficulty: 'MEDIUM',
    obstacles: [
      { relZ: 45, lane: 0, type: 'RAISED_LOG' },
    ],
    collectibles: [
      { relZ: 20, lane: 0, type: 'COIN' },
      // Reward coins directly after the slide
      { relZ: 65, lane: 0, type: 'COIN' },
      { relZ: 85, lane: 0, type: 'COIN' },
    ],
  },
  {
    // Pattern: One animal crossing, with coins before and after
    id: 'med_animal_crossing_springbok',
    name: 'Springbok Leap Crossing',
    difficulty: 'MEDIUM',
    hasAnimal: true,
    obstacles: [
      {
        relZ: 50,
        lane: 0,
        type: 'SPRINGBOK',
        isAnimal: true,
        animalType: 'SPRINGBOK',
      },
    ],
    collectibles: [
      { relZ: 20, lane: -1, type: 'COIN' },
      { relZ: 80, lane: 1, type: 'COIN' },
    ],
  },
  {
    // Pattern: One animal crossing (Zebra)
    id: 'med_animal_crossing_zebra',
    name: 'Zebra Road Crossing',
    difficulty: 'MEDIUM',
    hasAnimal: true,
    obstacles: [
      {
        relZ: 50,
        lane: 0,
        type: 'ZEBRA',
        isAnimal: true,
        animalType: 'ZEBRA',
      },
    ],
    collectibles: [
      { relZ: 20, lane: 0, type: 'COIN' },
      { relZ: 80, lane: 0, type: 'COIN' },
    ],
  },
  {
    // Pattern: A coin arc over a rock
    id: 'med_coin_arc_over_rock',
    name: 'High Coin Arc Jump Over Rock',
    difficulty: 'MEDIUM',
    obstacles: [
      { relZ: 45, lane: 0, type: 'LOW_ROCK' },
    ],
    collectibles: [
      { relZ: 28, lane: 0, type: 'COIN', yOffset: 12 },
      { relZ: 45, lane: 0, type: 'COIN', yOffset: 42 }, // Apex directly above rock
      { relZ: 62, lane: 0, type: 'COIN', yOffset: 12 },
    ],
  },
  {
    // Pattern: A rainbow in one lane with an obstacle in a different lane
    id: 'med_rainbow_lane_split',
    name: 'Rainbow Flight with Side Boulder',
    difficulty: 'MEDIUM',
    hasRainbow: true,
    rainbow: { relZ: 50, apexLane: 1 },
    obstacles: [
      { relZ: 50, lane: -1, type: 'BOULDER' },
    ],
    collectibles: [
      { relZ: 25, lane: 1, type: 'COIN' },
      { relZ: 50, lane: 1, type: 'GOLD', yOffset: 110 },
      { relZ: 75, lane: 1, type: 'COIN' },
    ],
  },
];

// ==========================================
// 4. HARD PATTERNS
// ==========================================
export const HARD_PATTERNS: ChunkPattern[] = [
  {
    // Pattern: Rock or log in one lane plus an animal crossing (Lion)
    id: 'hard_obstacle_plus_lion',
    name: 'Prowling Lion & Low Log Barrier',
    difficulty: 'HARD',
    hasAnimal: true,
    obstacles: [
      { relZ: 30, lane: -1, type: 'LOW_LOG' },
      {
        relZ: 55,
        lane: 0,
        type: 'LION',
        isAnimal: true,
        animalType: 'LION',
      },
    ],
    collectibles: [
      { relZ: 20, lane: 1, type: 'COIN' },
      { relZ: 85, lane: 0, type: 'COIN' },
    ],
  },
  {
    // Pattern: Alternating obstacles that force a lane change then a jump
    id: 'hard_switch_then_jump',
    name: 'S-Bend: Dodge Boulder then Jump Log',
    difficulty: 'HARD',
    obstacles: [
      { relZ: 30, lane: 0, type: 'BOULDER' },
      { relZ: 68, lane: -1, type: 'LOW_ROCK' },
    ],
    collectibles: [
      { relZ: 20, lane: -1, type: 'COIN' },
      { relZ: 50, lane: 1, type: 'COIN' },
      { relZ: 85, lane: 1, type: 'COIN' },
    ],
  },
  {
    // Pattern: A large animal crossing (Elephant or Rhino) followed by a rare Diamond!
    id: 'hard_elephant_crossing_diamond',
    name: 'Elephant March & Risky Diamond',
    difficulty: 'HARD',
    hasAnimal: true,
    hasDiamond: true,
    obstacles: [
      {
        relZ: 40,
        lane: 0,
        type: 'ELEPHANT',
        isAnimal: true,
        animalType: 'ELEPHANT',
      },
    ],
    collectibles: [
      { relZ: 15, lane: -1, type: 'COIN' },
      // Rare diamond prize right behind the massive elephant crossing
      { relZ: 78, lane: 0, type: 'DIAMOND', yOffset: 12 },
    ],
  },
  {
    // Pattern: Rhino crossing with diamond reward
    id: 'hard_rhino_crossing_diamond',
    name: 'Charging Rhino & Desert Diamond',
    difficulty: 'HARD',
    hasAnimal: true,
    hasDiamond: true,
    obstacles: [
      {
        relZ: 40,
        lane: 0,
        type: 'RHINO',
        isAnimal: true,
        animalType: 'RHINO',
      },
    ],
    collectibles: [
      { relZ: 15, lane: 1, type: 'COIN' },
      { relZ: 78, lane: 0, type: 'DIAMOND', yOffset: 12 },
    ],
  },
  {
    // Pattern: Rainbow in far lane, with obstacles in other two lanes forcing quick switch before jump
    id: 'hard_rainbow_double_block',
    name: 'Precision Rainbow Dive (Two Lanes Blocked)',
    difficulty: 'HARD',
    hasRainbow: true,
    rainbow: { relZ: 55, apexLane: -1 },
    obstacles: [
      { relZ: 45, lane: 0, type: 'BOULDER' },
      { relZ: 45, lane: 1, type: 'RAISED_LOG' },
    ],
    collectibles: [
      { relZ: 20, lane: -1, type: 'COIN' },
      { relZ: 55, lane: -1, type: 'GOLD', yOffset: 110 },
      { relZ: 85, lane: -1, type: 'COIN' },
    ],
  },
  {
    // Pattern: Raised log followed immediately by Ostrich crossing
    id: 'hard_slide_then_ostrich',
    name: 'Duck Under Log then Watch the Ostrich',
    difficulty: 'HARD',
    hasAnimal: true,
    obstacles: [
      { relZ: 28, lane: 0, type: 'RAISED_LOG' },
      {
        relZ: 62,
        lane: 0,
        type: 'OSTRICH',
        isAnimal: true,
        animalType: 'OSTRICH',
      },
    ],
    collectibles: [
      { relZ: 45, lane: 0, type: 'COIN' },
      { relZ: 85, lane: 1, type: 'COIN' },
    ],
  },
];
