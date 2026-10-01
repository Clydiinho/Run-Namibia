import { Collectible, Obstacle, Particle, PlayerState, Rainbow, SceneryElement, ScorePopup } from '../types/game';
import { RUN_CONFIG } from './config';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  // Horizon position (percentage of canvas height)
  private horizonY: number = RUN_CONFIG.road.horizonY;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public resize(width: number, height: number, dpr: number = window.devicePixelRatio || 1) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    const isPortrait = height > width;
    this.horizonY = isPortrait ? 0.33 : RUN_CONFIG.road.horizonY;
  }

  /**
   * Projects a 3D coordinate (lanePos, y, z) into 2D screen coordinates
   */
  public project(lanePos: number, y: number, z: number, cameraOffset: { x: number; y: number } = { x: 0, y: 0 }) {
    const horizon = this.height * this.horizonY + cameraOffset.y;
    const groundY = this.height * RUN_CONFIG.road.groundY + cameraOffset.y;
    const maxZ = RUN_CONFIG.road.maxDepthZ;

    // Perspective scale factor
    const perspective = Math.max(0.04, 1 - z / maxZ);
    const powScale = Math.pow(perspective, 1.8);

    // Screen Y based on distance & height
    const screenY = horizon + (groundY - horizon) * powScale - y * powScale * 2.2;

    // Roomy road width
    const isPortrait = this.height > this.width;
    const roadFactor = isPortrait
      ? RUN_CONFIG.road.roadWidthFactorPortrait
      : RUN_CONFIG.road.roadWidthFactorLandscape;
    const baseRoadWidth = this.width * roadFactor;
    const laneWidthAtDepth = ((baseRoadWidth / 3) * RUN_CONFIG.road.laneSpacingMultiplier * (isPortrait ? 0.86 : 0.82)) * powScale;

    // Screen X based on lane position (-1 left, 0 center, +1 right)
    const centerX = this.width / 2 + cameraOffset.x;
    const screenX = centerX + lanePos * laneWidthAtDepth;

    return {
      x: screenX,
      y: screenY,
      scale: powScale,
      laneWidth: laneWidthAtDepth,
      visible: z >= -15 && z <= maxZ,
    };
  }

  /**
   * Clear screen & render full scene
   */
  public render(
    player: PlayerState,
    obstacles: Obstacle[],
    rainbows: Rainbow[],
    collectibles: Collectible[],
    scenery: SceneryElement[],
    particles: Particle[],
    popups: ScorePopup[],
    speed: number,
    distance: number,
    shake: { x: number; y: number },
    gameTime: number
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Camera shake
    ctx.translate(shake.x, shake.y);

    // 1. Draw Namibian Desert Sky & Sun
    this.drawSky(gameTime);

    // 2. Draw Spitzkoppe Granite Peaks & Sossusvlei Red Dunes
    this.drawBackgroundMountainsAndDunes(player.lanePosition, distance);

    // 3. Draw Ground Sand & Tapered Desert Road
    this.drawGroundAndRoad(distance, speed, gameTime);

    // 4. Sort and render world objects by distance (painter's algorithm)
    this.drawWorldEntities(player, obstacles, rainbows, collectibles, scenery, gameTime);

    // 5. Draw Particles (dust, sparkles, explosions)
    this.drawParticles(particles);

    // 6. Draw Speed streaks if going fast
    if (speed > 18) {
      this.drawSpeedLines(speed, gameTime);
    }

    // 7. Draw Floating Score Popups
    this.drawPopups(popups);

    ctx.restore();
  }

  private drawSky(gameTime: number) {
    const ctx = this.ctx;
    const horizon = this.height * this.horizonY;

    // Glowing warm African sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.45, '#38bdf8');
    skyGrad.addColorStop(0.75, '#fde047');
    skyGrad.addColorStop(1, '#ea580c');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, horizon + 2);

    // Radiant Kalahari Sun
    const sunX = this.width * 0.72;
    const sunY = horizon * 0.52;
    const sunRadius = Math.min(this.width, this.height) * 0.085;

    // Sun outer corona
    const coronaGrad = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius * 2.8);
    coronaGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    coronaGrad.addColorStop(0.3, 'rgba(251, 191, 36, 0.45)');
    coronaGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.15)');
    coronaGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Solid Sun disk
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Desert birds circling high
    this.drawBirds(sunX, sunY, gameTime);
  }

  private drawBirds(sunX: number, sunY: number, gameTime: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.5)';
    ctx.lineWidth = 1.5;

    const birds = [
      { x: sunX - 110, y: sunY - 40, size: 9, speed: 0.5 },
      { x: sunX - 70, y: sunY - 55, size: 7, speed: 0.4 },
      { x: sunX - 140, y: sunY - 25, size: 11, speed: 0.6 },
    ];

    birds.forEach((b, i) => {
      const flap = Math.sin(gameTime * 4 + i) * 3;
      const bx = b.x + Math.sin(gameTime * 0.5 + i) * 20;
      const by = b.y + Math.cos(gameTime * 0.5 + i) * 6;

      ctx.beginPath();
      ctx.moveTo(bx - b.size, by + flap);
      ctx.quadraticCurveTo(bx - b.size * 0.5, by - flap, bx, by);
      ctx.quadraticCurveTo(bx + b.size * 0.5, by - flap, bx + b.size, by + flap);
      ctx.stroke();
    });
  }

  private drawBackgroundMountainsAndDunes(playerLane: number, distance: number) {
    const ctx = this.ctx;
    const horizon = this.height * this.horizonY;
    const parallax = playerLane * -12 + (distance * 0.04) % this.width;

    // Layer 1: Spitzkoppe Granite Mountain Ridges
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(0, horizon);

    const mtnWidth = this.width / 5;
    for (let i = -1; i <= 6; i++) {
      const px = i * mtnWidth - (parallax * 0.2 % mtnWidth);
      ctx.lineTo(px, horizon);
      ctx.lineTo(px + mtnWidth * 0.4, horizon - 45 - (i % 3) * 18);
      ctx.lineTo(px + mtnWidth * 0.65, horizon - 28);
      ctx.lineTo(px + mtnWidth, horizon);
    }
    ctx.lineTo(this.width, horizon);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Sossusvlei Dune 45 Red Dunes
    const duneWidth = this.width / 3.2;
    for (let i = -1; i <= 4; i++) {
      const dx = i * duneWidth - (parallax * 0.5 % duneWidth);
      const peakX = dx + duneWidth * 0.48;
      const peakY = horizon - 52 - ((i * 13) % 20);

      // Lit face
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(dx, horizon);
      ctx.quadraticCurveTo(dx + duneWidth * 0.25, horizon - 25, peakX, peakY);
      ctx.lineTo(dx + duneWidth, horizon);
      ctx.closePath();
      ctx.fill();

      // Shadow face
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(dx, horizon);
      ctx.quadraticCurveTo(dx + duneWidth * 0.25, horizon - 25, peakX, peakY);
      ctx.quadraticCurveTo(peakX + duneWidth * 0.15, horizon - 15, peakX + duneWidth * 0.35, horizon);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawGroundAndRoad(distance: number, speed: number, gameTime: number) {
    const ctx = this.ctx;
    const horizon = this.height * this.horizonY;

    // Desert Sand Ground Plane
    const groundGrad = ctx.createLinearGradient(0, horizon, 0, this.height);
    groundGrad.addColorStop(0, '#c2410c');
    groundGrad.addColorStop(0.35, '#d97706');
    groundGrad.addColorStop(1, '#b45309');

    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, this.width, this.height - horizon);

    // Sand ripples
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.lineWidth = 1.5;
    for (let y = horizon + 15; y < this.height; y += 38) {
      const rippleOffset = (distance * 0.8 + y * 2) % 40;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(this.width * 0.25, y + 6 - rippleOffset * 0.1, this.width * 0.75, y - 6, this.width, y);
      ctx.stroke();
    }

    // Road Projection Coordinates
    const projLeftBottom = this.project(-1.75, 0, 0);
    const projRightBottom = this.project(1.75, 0, 0);
    const projLeftTop = this.project(-1.75, 0, RUN_CONFIG.road.maxDepthZ * 0.96);
    const projRightTop = this.project(1.75, 0, RUN_CONFIG.road.maxDepthZ * 0.96);

    // Road Gravel Base Surface
    ctx.beginPath();
    ctx.moveTo(projLeftTop.x, horizon);
    ctx.lineTo(projRightTop.x, horizon);
    ctx.lineTo(projRightBottom.x, this.height);
    ctx.lineTo(projLeftBottom.x, this.height);
    ctx.closePath();

    const roadGrad = ctx.createLinearGradient(0, horizon, 0, this.height);
    roadGrad.addColorStop(0, '#57534e');
    roadGrad.addColorStop(0.4, '#44403c');
    roadGrad.addColorStop(1, '#292524');

    ctx.fillStyle = roadGrad;
    ctx.fill();

    // Road Borders / Shoulders
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(projLeftTop.x, horizon);
    ctx.lineTo(projLeftBottom.x, this.height);
    ctx.moveTo(projRightTop.x, horizon);
    ctx.lineTo(projRightBottom.x, this.height);
    ctx.stroke();

    // Lane Divider Dashes
    [-0.5, 0.5].forEach((dividerLane) => {
      const numSegments = 16;
      for (let i = 0; i < numSegments; i++) {
        const segmentZ = ((i * 40 - (distance * 8) % 40) + 400) % 400;
        const p1 = this.project(dividerLane, 0, segmentZ);
        const p2 = this.project(dividerLane, 0, Math.min(390, segmentZ + 16));

        if (p1.visible && p2.visible && p1.scale > 0.06) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
          ctx.lineWidth = Math.max(2, 9 * p1.scale);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
  }

  private drawWorldEntities(
    player: PlayerState,
    obstacles: Obstacle[],
    rainbows: Rainbow[],
    collectibles: Collectible[],
    scenery: SceneryElement[],
    gameTime: number
  ) {
    type Renderable =
      | { type: 'scenery'; item: SceneryElement; z: number }
      | { type: 'rainbow'; item: Rainbow; z: number }
      | { type: 'obstacle'; item: Obstacle; z: number }
      | { type: 'collectible'; item: Collectible; z: number }
      | { type: 'player'; z: number };

    const renderables: Renderable[] = [
      ...scenery.map((s) => ({ type: 'scenery' as const, item: s, z: s.z })),
      ...rainbows.map((r) => ({ type: 'rainbow' as const, item: r, z: r.z })),
      ...obstacles.map((o) => ({ type: 'obstacle' as const, item: o, z: o.z })),
      ...collectibles.map((c) => ({ type: 'collectible' as const, item: c, z: c.z })),
      { type: 'player' as const, z: 25 },
    ];

    // Sort descending by z (furthest first, closest last)
    renderables.sort((a, b) => b.z - a.z);

    renderables.forEach((r) => {
      if (r.type === 'scenery') {
        this.drawSceneryElement(r.item);
      } else if (r.type === 'rainbow') {
        this.drawRainbow(r.item, gameTime);
      } else if (r.type === 'obstacle') {
        this.drawObstacle(r.item, gameTime);
      } else if (r.type === 'collectible') {
        this.drawCollectible(r.item, gameTime);
      } else if (r.type === 'player') {
        this.drawPlayer(player, gameTime);
      }
    });
  }

  private drawSceneryElement(s: SceneryElement) {
    const ctx = this.ctx;
    const laneOffset = s.xOffset > 0 ? 2.15 + s.xOffset : -2.15 + s.xOffset;
    const proj = this.project(laneOffset, 0, s.z);

    if (!proj.visible || proj.scale < 0.05) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);
    const size = RUN_CONFIG.entities.sceneryBaseSize * proj.scale * s.scale;

    if (s.type === 'ACACIA_TREE') {
      // Camelthorn Acacia Tree
      ctx.fillStyle = 'rgba(80, 30, 5, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.7, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = Math.max(2, size * 0.11);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-size * 0.12, -size * 0.5, 0, -size * 0.8);
      ctx.stroke();

      ctx.lineWidth = Math.max(1.5, size * 0.07);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.75);
      ctx.lineTo(-size * 0.45, -size * 0.95);
      ctx.moveTo(0, -size * 0.75);
      ctx.lineTo(size * 0.45, -size * 0.95);
      ctx.stroke();

      ctx.fillStyle = '#2e4c25';
      ctx.beginPath();
      ctx.ellipse(-size * 0.25, -size * 1.05, size * 0.55, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse(size * 0.2, -size * 1.08, size * 0.5, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.ellipse(0, -size * 1.15, size * 0.65, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.type === 'DEAD_VLEI_TREE') {
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.08, -size * 0.5);
      ctx.lineTo(0, -size * 0.9);
      ctx.moveTo(-size * 0.08, -size * 0.5);
      ctx.lineTo(-size * 0.35, -size * 0.75);
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(size * 0.35, -size * 0.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.1, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================
  // RAINBOW ARCH RENDERING
  // ==========================================
  private drawRainbow(rainbow: Rainbow, gameTime: number) {
    const ctx = this.ctx;
    const projLeft = this.project(-1.7, 0, rainbow.z);
    const projRight = this.project(1.7, 0, rainbow.z);
    // Apex of rainbow matches the player's peak jump height
    const apexHeight = RUN_CONFIG.loot.GOLD_APEX_HEIGHT;
    const projApex = this.project(rainbow.apexLane, apexHeight, rainbow.z);

    if (!projLeft.visible || projApex.scale < 0.06) return;

    ctx.save();

    // Mathematically solve the control point so the top of the arch
    // crowns exactly at the height of the player's jump (projApex.y)
    const baseLineY = (projLeft.y + projRight.y) * 0.5;
    const controlY = 2 * projApex.y - baseLineY;

    // Rainbow arch bands: Red, Orange, Yellow, Green, Blue, Violet
    const colors = [
      'rgba(239, 68, 68, 0.55)',
      'rgba(249, 115, 22, 0.55)',
      'rgba(250, 204, 21, 0.55)',
      'rgba(34, 197, 94, 0.55)',
      'rgba(56, 189, 248, 0.55)',
      'rgba(168, 85, 247, 0.5)',
    ];

    const baseBandWidth = Math.max(2.5, 7.5 * projApex.scale);

    colors.forEach((col, idx) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = baseBandWidth;
      ctx.beginPath();
      const bandOffset = (idx - 2.5) * (baseBandWidth * 0.95);
      ctx.moveTo(projLeft.x, projLeft.y);
      ctx.quadraticCurveTo(projApex.x, controlY + bandOffset, projRight.x, projRight.y);
      ctx.stroke();
    });

    // Cloud puffs at rainbow footings
    const drawCloud = (x: number, y: number, scale: number) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(x, y - 6 * scale, 14 * scale, 0, Math.PI * 2);
      ctx.arc(x - 10 * scale, y - 4 * scale, 10 * scale, 0, Math.PI * 2);
      ctx.arc(x + 10 * scale, y - 4 * scale, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    drawCloud(projLeft.x, projLeft.y, projLeft.scale);
    drawCloud(projRight.x, projRight.y, projRight.scale);

    // Sparkle trail leading up along the rainbow to the apex gold
    const numSparkles = 6;
    for (let i = 0; i < numSparkles; i++) {
      const t = (i / numSparkles + gameTime * 0.6) % 1;
      const sx = (1 - t) * (1 - t) * projLeft.x + 2 * (1 - t) * t * projApex.x + t * t * projRight.x;
      const sy = (1 - t) * (1 - t) * projLeft.y + 2 * (1 - t) * t * controlY + t * t * projRight.y;

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.5, 4 * projApex.scale), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================
  // OBSTACLE & MOVING ANIMAL RENDERING
  // ==========================================
  private drawObstacle(obs: Obstacle, gameTime: number) {
    const ctx = this.ctx;
    const laneX = obs.lanePos !== undefined ? obs.lanePos : obs.lane;

    // 1. ANIMAL WARNING MARKER
    // If animal is in warning phase (about 1 second before entering road),
    // display an alert badge / arrow on the side of the road it will enter from!
    if (obs.isAnimal && (obs.warningTimer ?? 0) > 0) {
      const warningLane = obs.warningSide === 'left' ? -1.55 : 1.55;
      const warningProj = this.project(warningLane, 18, obs.z);

      if (warningProj.visible && warningProj.scale > 0.06) {
        ctx.save();
        ctx.translate(warningProj.x, warningProj.y);

        const pulse = 1 + Math.sin(gameTime * 14) * 0.18;
        const badgeSize = 28 * warningProj.scale * pulse;

        // Glowing Warning Pill / Diamond Badge
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12 * warningProj.scale;

        ctx.fillStyle = '#dc2626'; // Vivid hazard red
        ctx.beginPath();
        ctx.arc(0, 0, badgeSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 3 * warningProj.scale);
        ctx.stroke();

        // Direction Arrow & Exclamation
        ctx.fillStyle = '#ffffff';
        ctx.font = `black ${Math.max(10, badgeSize * 1.05)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const arrow = obs.crossingDirection === 1 ? '▶' : '◀';
        ctx.fillText(`! ${arrow}`, 0, 0);

        ctx.restore();
      }
      // Do not draw the animal on the road until warning has played
      return;
    }

    // 2. PROJECT TO SCREEN
    const proj = this.project(laneX, 0, obs.z);
    if (!proj.visible || proj.scale < 0.05) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);

    const baseSize = RUN_CONFIG.entities.obstacleBaseSize * proj.scale;
    const anim = obs.animTime || gameTime;

    // Contact Ground Shadow
    ctx.fillStyle = 'rgba(25, 15, 10, 0.45)';
    ctx.beginPath();
    const shadowWidth = obs.type === 'LOW_LOG' || obs.type === 'RAISED_LOG' ? baseSize * 0.95 : baseSize * 0.65;
    ctx.ellipse(0, 0, shadowWidth, baseSize * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // ==========================================
    // STATIONARY OBSTACLES: ROCKS & LOGS
    // ==========================================

    if (obs.type === 'LOW_ROCK') {
      // Grey/Brown low rock (Jumpable!)
      ctx.fillStyle = '#57534e'; // Granite stone dark base
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.48, 0);
      ctx.lineTo(-baseSize * 0.42, -baseSize * 0.38);
      ctx.lineTo(-baseSize * 0.1, -baseSize * 0.52);
      ctx.lineTo(baseSize * 0.35, -baseSize * 0.45);
      ctx.lineTo(baseSize * 0.48, -baseSize * 0.18);
      ctx.lineTo(baseSize * 0.42, 0);
      ctx.closePath();
      ctx.fill();

      // Sunlit Facet
      ctx.fillStyle = '#a8a29e'; // Desert sunlit rock surface
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.1, -baseSize * 0.52);
      ctx.lineTo(baseSize * 0.35, -baseSize * 0.45);
      ctx.lineTo(baseSize * 0.22, -baseSize * 0.22);
      ctx.lineTo(-baseSize * 0.18, -baseSize * 0.24);
      ctx.closePath();
      ctx.fill();

      // Sharp highlight ridge
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = Math.max(1, baseSize * 0.03);
      ctx.stroke();
    } else if (obs.type === 'BOULDER') {
      // Large Granite Boulder (Lane Blocker - must dodge!)
      ctx.fillStyle = '#44403c'; // Dark dense rock
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.55, 0);
      ctx.lineTo(-baseSize * 0.54, -baseSize * 0.5);
      ctx.lineTo(-baseSize * 0.25, -baseSize * 0.88);
      ctx.lineTo(baseSize * 0.28, -baseSize * 0.82);
      ctx.lineTo(baseSize * 0.56, -baseSize * 0.4);
      ctx.lineTo(baseSize * 0.52, 0);
      ctx.closePath();
      ctx.fill();

      // Facet shading
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.25, -baseSize * 0.88);
      ctx.lineTo(baseSize * 0.28, -baseSize * 0.82);
      ctx.lineTo(baseSize * 0.35, -baseSize * 0.35);
      ctx.lineTo(-baseSize * 0.15, -baseSize * 0.4);
      ctx.closePath();
      ctx.fill();

      // Bright top sun edge
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.25, -baseSize * 0.88);
      ctx.lineTo(baseSize * 0.05, -baseSize * 0.85);
      ctx.lineTo(0, -baseSize * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === 'LOW_LOG') {
      // Warm brown fallen log lying across lane (Jumpable!)
      const lw = baseSize * 1.15;
      const lh = baseSize * 0.28;

      ctx.fillStyle = '#713f12'; // Rich warm bark brown
      ctx.beginPath();
      ctx.roundRect(-lw * 0.5, -lh, lw, lh, baseSize * 0.06);
      ctx.fill();

      // Log End Rings (Cross-section)
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.ellipse(-lw * 0.48, -lh * 0.5, baseSize * 0.07, lh * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(lw * 0.48, -lh * 0.5, baseSize * 0.07, lh * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Broken twigs
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.05);
      ctx.beginPath();
      ctx.moveTo(-lw * 0.15, -lh);
      ctx.lineTo(-lw * 0.22, -lh * 1.55);
      ctx.moveTo(lw * 0.2, -lh);
      ctx.lineTo(lw * 0.28, -lh * 1.45);
      ctx.stroke();
    } else if (obs.type === 'RAISED_LOG') {
      // Raised wooden log on supports (Must SLIDE under!)
      const rw = baseSize * 1.25;
      const postW = Math.max(3, baseSize * 0.12);
      const postH = baseSize * 0.62;
      const logH = baseSize * 0.24;
      const clearanceY = postH - logH;

      // Two sturdy upright wooden support posts
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-rw * 0.46, -postH, postW, postH);
      ctx.fillRect(rw * 0.46 - postW, -postH, postW, postH);

      // Elevated horizontal log across top
      ctx.fillStyle = '#854d0e'; // Warm golden-brown log
      ctx.beginPath();
      ctx.roundRect(-rw * 0.5, -postH, rw, logH, baseSize * 0.06);
      ctx.fill();

      // Wood rings on log ends
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.ellipse(-rw * 0.48, -postH + logH * 0.5, baseSize * 0.06, logH * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(rw * 0.48, -postH + logH * 0.5, baseSize * 0.06, logH * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clearance arrow pointing down indicating "Slide!"
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      const arrowY = -clearanceY * 0.65;
      ctx.moveTo(0, arrowY + 8 * proj.scale);
      ctx.lineTo(-10 * proj.scale, arrowY - 4 * proj.scale);
      ctx.lineTo(10 * proj.scale, arrowY - 4 * proj.scale);
      ctx.closePath();
      ctx.fill();
    }

    // ==========================================
    // MOVING ANIMALS (6 WILDLIFE SPECIES)
    // ==========================================
    else if (obs.isAnimal) {
      // Flip sprite to face crossing travel direction
      const facing = obs.crossingDirection === -1 ? -1 : 1;
      ctx.scale(facing, 1);

      if (obs.type === 'LION') {
        // Fast & dangerous Kalahari Lion with dark mane
        const lw = baseSize * 0.8;
        const lh = baseSize * 0.72;
        const trot = Math.sin(anim * 14) * 3;
        ctx.translate(0, trot);

        // Legs
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = Math.max(2, baseSize * 0.08);
        ctx.lineCap = 'round';
        [-lw * 0.28, -lw * 0.1, lw * 0.12, lw * 0.32].forEach((lx, idx) => {
          const lSwing = Math.sin(anim * 16 + idx * 2) * baseSize * 0.14;
          ctx.beginPath();
          ctx.moveTo(lx, -lh * 0.38);
          ctx.lineTo(lx + lSwing, 0);
          ctx.stroke();
        });

        // Muscular Tawny Body
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(0, -lh * 0.48, lw * 0.45, lh * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark Majestic Kalahari Lion Mane!
        const hx = lw * 0.36;
        const hy = -lh * 0.68;
        ctx.fillStyle = '#451a03'; // Iconic black/brown Kalahari mane
        ctx.beginPath();
        ctx.arc(hx, hy, lw * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(hx + lw * 0.08, hy, lw * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(hx + lw * 0.18, hy + lh * 0.04, lw * 0.09, lh * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose & Eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(hx + lw * 0.22, hy + lh * 0.02, baseSize * 0.03, 0, Math.PI * 2);
        ctx.arc(hx + lw * 0.12, hy - lh * 0.04, baseSize * 0.025, 0, Math.PI * 2);
        ctx.fill();

        // Tufted tail
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = Math.max(1.5, baseSize * 0.04);
        ctx.beginPath();
        ctx.moveTo(-lw * 0.42, -lh * 0.5);
        ctx.quadraticCurveTo(-lw * 0.6, -lh * 0.6, -lw * 0.55, -lh * 0.25);
        ctx.stroke();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(-lw * 0.55, -lh * 0.25, baseSize * 0.05, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'RHINO') {
        // Heavy, armored Black/White Rhino with prominent horn
        const rw = baseSize * 0.95;
        const rh = baseSize * 0.78;
        const trot = Math.sin(anim * 8) * 2;
        ctx.translate(0, trot);

        // Sturdy pillar legs
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(3, baseSize * 0.11);
        ctx.lineCap = 'round';
        [-rw * 0.32, -rw * 0.14, rw * 0.14, rw * 0.32].forEach((lx, idx) => {
          const lSwing = Math.sin(anim * 10 + idx * 2) * baseSize * 0.08;
          ctx.beginPath();
          ctx.moveTo(lx, -rh * 0.35);
          ctx.lineTo(lx + lSwing, 0);
          ctx.stroke();
        });

        // Massive armored barrel body
        ctx.fillStyle = '#64748b'; // Slate grey hide
        ctx.beginPath();
        ctx.ellipse(0, -rh * 0.52, rw * 0.46, rh * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shoulder hump
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(-rw * 0.12, -rh * 0.72, rw * 0.26, rh * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy Head
        const hx = rw * 0.38;
        const hy = -rh * 0.45;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(hx, hy, rw * 0.24, rh * 0.26, 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Prominent Curved Rhino Horn!
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(hx + rw * 0.16, hy + rh * 0.06);
        ctx.quadraticCurveTo(hx + rw * 0.35, hy - rh * 0.05, hx + rw * 0.38, hy - rh * 0.38);
        ctx.quadraticCurveTo(hx + rw * 0.22, hy - rh * 0.15, hx + rw * 0.1, hy - rh * 0.08);
        ctx.closePath();
        ctx.fill();

        // Secondary small horn
        ctx.beginPath();
        ctx.moveTo(hx + rw * 0.06, hy - rh * 0.1);
        ctx.lineTo(hx + rw * 0.12, hy - rh * 0.22);
        ctx.lineTo(hx + rw * 0.02, hy - rh * 0.18);
        ctx.closePath();
        ctx.fill();
      } else if (obs.type === 'ZEBRA') {
        // High-contrast Black & White Striped Mountain Zebra
        const zw = baseSize * 0.75;
        const zh = baseSize * 0.82;
        const trot = Math.sin(anim * 12) * 3;
        ctx.translate(0, trot);

        // Striped legs
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = Math.max(2, baseSize * 0.07);
        ctx.lineCap = 'round';
        [-zw * 0.28, -zw * 0.1, zw * 0.12, zw * 0.3].forEach((lx, idx) => {
          const lSwing = Math.sin(anim * 14 + idx * 2) * baseSize * 0.12;
          ctx.beginPath();
          ctx.moveTo(lx, -zh * 0.35);
          ctx.lineTo(lx + lSwing, 0);
          ctx.stroke();
        });

        // White Body Base
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -zh * 0.48, zw * 0.46, zh * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bold Black Zebra Stripes across body
        ctx.fillStyle = '#09090b';
        [-zw * 0.32, -zw * 0.18, -zw * 0.04, zw * 0.1, zw * 0.22].forEach((sx) => {
          ctx.fillRect(sx, -zh * 0.68, zw * 0.06, zh * 0.4);
        });

        // Head & Neck with mane
        const hx = zw * 0.36;
        const hy = -zh * 0.72;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(hx, hy, zw * 0.18, zh * 0.2, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Head stripes & Black muzzle
        ctx.fillStyle = '#09090b';
        ctx.fillRect(hx - zw * 0.08, hy - zh * 0.15, zw * 0.05, zh * 0.25);
        ctx.fillRect(hx, hy - zh * 0.18, zw * 0.05, zh * 0.25);

        // Black Snout
        ctx.beginPath();
        ctx.arc(hx + zw * 0.16, hy + zh * 0.06, zw * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Upright Mohawk Mane
        ctx.fillRect(hx - zw * 0.18, hy - zh * 0.26, zw * 0.24, zh * 0.08);
      } else if (obs.type === 'SPRINGBOK') {
        // Swift bounding Springbok (lyre horns, white underbelly)
        const pronk = Math.abs(Math.sin(anim * 10)) * 6;
        ctx.translate(0, -pronk);

        const sw = baseSize * 0.58;
        const sh = baseSize * 0.78;

        // Slender legs
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, baseSize * 0.05);
        ctx.lineCap = 'round';
        [-sw * 0.28, -sw * 0.1, sw * 0.1, sw * 0.28].forEach((lx, idx) => {
          const lBend = Math.sin(anim * 14 + idx) * baseSize * 0.1;
          ctx.beginPath();
          ctx.moveTo(lx, -sh * 0.38);
          ctx.lineTo(lx + lBend, 0);
          ctx.stroke();
        });

        // Warm Cinnamon Back
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(0, -sh * 0.45, sw * 0.45, sh * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chocolate Flank Stripe
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(0, -sh * 0.36, sw * 0.4, sh * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // White Underbelly
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, -sh * 0.3, sw * 0.36, sh * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head with curved lyre horns
        const hx = sw * 0.35;
        const hy = -sh * 0.7;
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(hx, hy, sw * 0.16, sh * 0.12, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Lyre-shaped black horns
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = Math.max(1.5, baseSize * 0.04);
        ctx.beginPath();
        ctx.moveTo(hx, hy - sh * 0.08);
        ctx.quadraticCurveTo(hx - sw * 0.08, hy - sh * 0.3, hx - sw * 0.02, hy - sh * 0.38);
        ctx.moveTo(hx + sw * 0.06, hy - sh * 0.08);
        ctx.quadraticCurveTo(hx + sw * 0.14, hy - sh * 0.3, hx + sw * 0.08, hy - sh * 0.38);
        ctx.stroke();
      } else if (obs.type === 'ELEPHANT') {
        // Massive Desert Elephant with big ears and long curved trunk
        const ew = baseSize * 1.05;
        const eh = baseSize * 0.95;
        const trot = Math.sin(anim * 6) * 2;
        ctx.translate(0, trot);

        // Huge pillar legs
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(4, baseSize * 0.13);
        ctx.lineCap = 'round';
        [-ew * 0.35, -ew * 0.15, ew * 0.15, ew * 0.35].forEach((lx, idx) => {
          const lSwing = Math.sin(anim * 8 + idx * 2) * baseSize * 0.08;
          ctx.beginPath();
          ctx.moveTo(lx, -eh * 0.35);
          ctx.lineTo(lx + lSwing, 0);
          ctx.stroke();
        });

        // Massive Grey Dome Body
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(0, -eh * 0.58, ew * 0.48, eh * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Giant African Ear flapping
        const earFlap = Math.sin(anim * 8) * ew * 0.06;
        const hx = ew * 0.38;
        const hy = -eh * 0.65;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(hx - ew * 0.1 + earFlap, hy, ew * 0.22, eh * 0.3, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(hx, hy, ew * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // White Ivory Tusk
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = Math.max(2, baseSize * 0.06);
        ctx.beginPath();
        ctx.moveTo(hx + ew * 0.1, hy + eh * 0.08);
        ctx.quadraticCurveTo(hx + ew * 0.26, hy + eh * 0.14, hx + ew * 0.24, hy - eh * 0.04);
        ctx.stroke();

        // Long flexible trunk swaying
        const trunkWave = Math.sin(anim * 8) * ew * 0.12;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(3.5, baseSize * 0.11);
        ctx.beginPath();
        ctx.moveTo(hx + ew * 0.12, hy);
        ctx.quadraticCurveTo(hx + ew * 0.28, hy + eh * 0.25, hx + ew * 0.22 + trunkWave, hy + eh * 0.48);
        ctx.stroke();
      } else if (obs.type === 'OSTRICH') {
        // Fast running Ostrich with fluffy plumage and long bobbing neck
        const ow = baseSize * 0.54;
        const oh = baseSize * 1.05;
        const stride = Math.sin(anim * 14) * baseSize * 0.14;

        // Long runner legs
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = Math.max(2, baseSize * 0.06);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-ow * 0.15, -oh * 0.45);
        ctx.lineTo(-ow * 0.18 + stride, 0);
        ctx.moveTo(ow * 0.15, -oh * 0.45);
        ctx.lineTo(ow * 0.18 - stride, 0);
        ctx.stroke();

        // Black Body Plumage
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.ellipse(0, -oh * 0.52, ow * 0.45, oh * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // White Wing Fringe
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(0, -oh * 0.42, ow * 0.36, oh * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Long bobbing neck
        const headX = ow * 0.28 + Math.cos(anim * 14) * 4;
        const headY = -oh * 0.94;
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = Math.max(2.5, baseSize * 0.07);
        ctx.beginPath();
        ctx.moveTo(ow * 0.18, -oh * 0.55);
        ctx.quadraticCurveTo(ow * 0.35, -oh * 0.72, headX, headY);
        ctx.stroke();

        // Head & Beak
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.ellipse(headX, headY, ow * 0.12, oh * 0.06, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(headX + ow * 0.08, headY - oh * 0.02);
        ctx.lineTo(headX + ow * 0.2, headY);
        ctx.lineTo(headX + ow * 0.08, headY + oh * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ==========================================
  // COLLECTIBLE RENDERING (COINS, GOLD, DIAMONDS)
  // ==========================================
  private drawCollectible(col: Collectible, gameTime: number) {
    if (col.collected) return;
    const ctx = this.ctx;

    // Bobbing motion (gold at apex bobs softly, ground items bob higher)
    const bob = Math.sin(gameTime * 5 + col.id) * (col.type === 'GOLD' ? 4 : 8);
    const heightY = col.yOffset + 25 + bob;
    const proj = this.project(col.lane, heightY, col.z);

    if (!proj.visible || proj.scale < 0.05) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);

    const size = RUN_CONFIG.entities.collectibleBaseSize * proj.scale;
    const rot = col.rotation + gameTime * 3;

    // Contact Ground Shadow (only if near ground)
    if (col.yOffset < 15) {
      const shadowProj = this.project(col.lane, 0, col.z);
      ctx.fillStyle = 'rgba(40, 20, 10, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, shadowProj.y - proj.y, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (col.type === 'COIN') {
      // 1x Common: Golden Namibian N$ coin with 3D spin
      const spinScale = Math.cos(rot);
      ctx.save();
      ctx.scale(spinScale, 1);

      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10 * proj.scale;

      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
      ctx.fill();

      if (Math.abs(spinScale) > 0.3) {
        ctx.fillStyle = '#854d0e';
        ctx.font = `bold ${Math.max(8, size * 0.4)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N$', 0, 0);
      }
      ctx.restore();
    } else if (col.type === 'GOLD') {
      // 5x Uncommon: Radiant Gold Bar / Nugget (Floats only on Rainbows!)
      const pulse = 1 + Math.sin(gameTime * 8) * 0.12;

      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 18 * proj.scale;

      // Sparkling outer glow aura
      const glowGrad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.95);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
      glowGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.4)');
      glowGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.95 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Shiny Gold Bar Ingot
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-size * 0.52, -size * 0.3, size * 1.04, size * 0.6, size * 0.1);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(-size * 0.46, -size * 0.25, size * 0.92, size * 0.5, size * 0.08);
      ctx.fill();

      // Gleaming top highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-size * 0.38, -size * 0.2);
      ctx.lineTo(size * 0.38, -size * 0.2);
      ctx.lineTo(size * 0.3, -size * 0.1);
      ctx.lineTo(-size * 0.3, -size * 0.1);
      ctx.closePath();
      ctx.fill();

      // Text label
      ctx.fillStyle = '#78350f';
      ctx.font = `black ${Math.max(8, size * 0.26)}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('5x GOLD', 0, size * 0.04);
    } else if (col.type === 'DIAMOND') {
      // 15x Rare: Glowing Faceted Diamond (Crystalline Blue-White Gem)
      ctx.rotate(rot * 0.5);

      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18 * proj.scale;

      const dSize = size * 0.65;

      // Faceted diamond polygon
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize * 0.85, -dSize * 0.2);
      ctx.lineTo(0, dSize);
      ctx.lineTo(-dSize * 0.85, -dSize * 0.2);
      ctx.closePath();
      ctx.fill();

      // Upper facets
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize * 0.85, -dSize * 0.2);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Shimmering white highlight facet
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(-dSize * 0.85, -dSize * 0.2);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================
  // PLAYER RENDERING (WITH GROUND SLIDE)
  // ==========================================
  private drawPlayer(player: PlayerState, gameTime: number) {
    const ctx = this.ctx;
    const proj = this.project(player.lanePosition, player.y, 25);

    if (!proj.visible) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate((player.tilt * Math.PI) / 180);

    const size = RUN_CONFIG.entities.playerBaseSize * proj.scale;

    // 1. Ground Contact Shadow
    const shadowProj = this.project(player.lanePosition, 0, 25);
    const shadowY = shadowProj.y - proj.y;
    const shadowScale = Math.max(0.2, 1 - player.y / 110);

    ctx.fillStyle = 'rgba(25, 12, 5, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, shadowY, size * 0.35 * shadowScale, size * 0.12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // ==========================================
    // SLIDING STATE (DUCKED LOW UNDER LOGS)
    // ==========================================
    if (player.isSliding) {
      // Crouched slide posture along the ground
      ctx.save();
      ctx.translate(0, -size * 0.25);

      // Sand slide rooster-tail spray
      ctx.fillStyle = 'rgba(217, 119, 6, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-size * 0.28, size * 0.2, size * 0.35, size * 0.08, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal slid legs
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(3, size * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, size * 0.1);
      ctx.lineTo(size * 0.35, size * 0.18);
      ctx.stroke();

      // Sneakers
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(size * 0.35, size * 0.18, size * 0.12, size * 0.06, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Low Torso
      ctx.fillStyle = '#0284c7'; // Blue hoodie
      ctx.beginPath();
      ctx.roundRect(-size * 0.28, -size * 0.08, size * 0.52, size * 0.24, size * 0.06);
      ctx.fill();

      // Namibian flag stripe on back
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-size * 0.28, -size * 0.02, size * 0.52, size * 0.035);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-size * 0.28, size * 0.015, size * 0.52, size * 0.03);

      // Ducked head
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(size * 0.1, -size * 0.12, size * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Red headband
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(size * 0.02, -size * 0.16, size * 0.18, size * 0.04);

      ctx.restore();
      ctx.restore();
      return;
    }

    // ==========================================
    // RUNNING & JUMPING STATE
    // ==========================================
    const runCycle = player.runCycle;
    const isJumping = player.isJumping;

    const legL = isJumping ? -0.4 : Math.sin(runCycle) * 0.7;
    const legR = isJumping ? 0.3 : -Math.sin(runCycle) * 0.7;
    const armL = isJumping ? -0.6 : -Math.sin(runCycle) * 0.6;
    const armR = isJumping ? -0.6 : Math.sin(runCycle) * 0.6;
    const bobY = isJumping ? 0 : Math.abs(Math.sin(runCycle)) * 4;

    const bodyY = -size * 0.95 + bobY;

    // Legs
    const legWidth = Math.max(2.5, size * 0.12);
    ctx.lineWidth = legWidth;
    ctx.lineCap = 'round';

    // Left Leg & Sneaker
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-size * 0.16, bodyY + size * 0.5);
    const footLX = -size * 0.18 + Math.sin(legL) * size * 0.35;
    const footLY = bodyY + size * 0.5 + Math.cos(legL) * size * 0.45;
    ctx.lineTo(footLX, footLY);
    ctx.stroke();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.ellipse(footLX, footLY, size * 0.14, size * 0.08, legL * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(footLX - size * 0.12, footLY + size * 0.04, size * 0.22, size * 0.04);

    // Right Leg & Sneaker
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(size * 0.16, bodyY + size * 0.5);
    const footRX = size * 0.18 + Math.sin(legR) * size * 0.35;
    const footRY = bodyY + size * 0.5 + Math.cos(legR) * size * 0.45;
    ctx.lineTo(footRX, footRY);
    ctx.stroke();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.ellipse(footRX, footRY, size * 0.14, size * 0.08, legR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(footRX - size * 0.12, footRY + size * 0.04, size * 0.22, size * 0.04);

    // Torso / Blue Hoodie
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(-size * 0.28, bodyY + size * 0.12, size * 0.56, size * 0.44, size * 0.08);
    ctx.fill();

    // Namibian Flag Stripes
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-size * 0.28, bodyY + size * 0.26, size * 0.56, size * 0.05);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-size * 0.28, bodyY + size * 0.31, size * 0.56, size * 0.04);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-size * 0.28, bodyY + size * 0.35, size * 0.56, size * 0.04);

    // Backpack
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-size * 0.18, bodyY + size * 0.16, size * 0.36, size * 0.3, size * 0.06);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = legWidth * 0.9;
    ctx.beginPath();
    ctx.moveTo(-size * 0.26, bodyY + size * 0.18);
    ctx.lineTo(-size * 0.38, bodyY + size * 0.32 + armL * size * 0.2);
    ctx.moveTo(size * 0.26, bodyY + size * 0.18);
    ctx.lineTo(size * 0.38, bodyY + size * 0.32 + armR * size * 0.2);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, bodyY + size * 0.08, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, bodyY + size * 0.04, size * 0.19, Math.PI, Math.PI * 2);
    ctx.fill();

    // Sporty Red Headband
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-size * 0.16, bodyY + size * 0.02, size * 0.32, size * 0.05);

    ctx.restore();
  }

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx;
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawSpeedLines(speed: number, gameTime: number) {
    const ctx = this.ctx;
    const numLines = Math.min(18, Math.floor((speed - 15) * 2));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < numLines; i++) {
      const seed = (i * 97 + gameTime * 100) % 1000;
      const angle = (seed / 1000) * Math.PI * 2;
      const r1 = this.width * 0.2 + (seed % 150);
      const r2 = r1 + 60 + (speed * 3);

      const cx = this.width / 2;
      const cy = this.height * this.horizonY;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1 * 0.6);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2 * 0.6);
      ctx.stroke();
    }
  }

  private drawPopups(popups: ScorePopup[]) {
    const ctx = this.ctx;
    popups.forEach((popup) => {
      ctx.save();
      ctx.globalAlpha = popup.alpha;
      ctx.fillStyle = popup.color;
      ctx.font = `bold 22px 'Syne', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    });
  }
}
