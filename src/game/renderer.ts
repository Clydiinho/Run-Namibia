import { Collectible, Obstacle, Particle, PlayerState, SceneryElement, ScorePopup } from '../types/game';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  // Horizon position (percentage of canvas height)
  private horizonY: number = 0.38;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public resize(width: number, height: number, dpr: number = window.devicePixelRatio || 1) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
  }

  /**
   * Projects a 3D coordinate (laneX, y, z) into 2D screen coordinates
   * z: 0 is at player plane, maxDistance is near horizon
   */
  public project(lanePos: number, y: number, z: number, cameraOffset: { x: number; y: number } = { x: 0, y: 0 }) {
    const horizon = this.height * this.horizonY + cameraOffset.y;
    const groundY = this.height * 0.88 + cameraOffset.y;
    const maxZ = 600;

    // Perspective scale factor (1 at player, 0.05 near horizon)
    const perspective = Math.max(0.04, 1 - z / maxZ);
    const powScale = Math.pow(perspective, 1.8);

    // Screen Y based on distance
    const screenY = horizon + (groundY - horizon) * powScale - y * powScale * 2.2;

    // Road width at this depth
    const roadWidthAtDepth = this.width * 0.72 * powScale;
    const laneWidthAtDepth = roadWidthAtDepth / 3;

    // Screen X based on lane position (-1 left, 0 center, +1 right)
    const centerX = this.width / 2 + cameraOffset.x;
    const screenX = centerX + lanePos * laneWidthAtDepth;

    return {
      x: screenX,
      y: screenY,
      scale: powScale,
      visible: z >= -10 && z <= maxZ,
    };
  }

  /**
   * Clear screen & render full scene
   */
  public render(
    player: PlayerState,
    obstacles: Obstacle[],
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

    // Apply camera shake & tilt
    ctx.translate(shake.x, shake.y);

    // 1. Draw Namibian Desert Sky & Sun
    this.drawSky(gameTime);

    // 2. Draw Spitzkoppe Granite Peaks & Sossusvlei Red Dunes
    this.drawBackgroundMountainsAndDunes(player.lanePosition, distance);

    // 3. Draw Ground Sand & Tapered Desert Road
    this.drawGroundAndRoad(distance, speed, gameTime);

    // 4. Sort and render world objects by distance (painter's algorithm from back to front)
    this.drawWorldEntities(player, obstacles, collectibles, scenery, gameTime);

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
    skyGrad.addColorStop(0, '#0284c7'); // Clear high Namibian blue
    skyGrad.addColorStop(0.45, '#38bdf8'); // Sky blue
    skyGrad.addColorStop(0.75, '#fde047'); // Warm African golden sunlight
    skyGrad.addColorStop(1, '#f97316'); // Warm desert amber horizon

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, horizon);

    // Majestic Glowing Sun
    const sunX = this.width * 0.68;
    const sunY = horizon * 0.48;
    const sunRadius = Math.min(this.width, this.height) * 0.085;

    // Sun outer glow
    const sunGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius * 3.5);
    sunGlow.addColorStop(0, 'rgba(255, 250, 200, 0.85)');
    sunGlow.addColorStop(0.3, 'rgba(251, 191, 36, 0.45)');
    sunGlow.addColorStop(0.7, 'rgba(249, 115, 22, 0.15)');
    sunGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');

    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Sun disc
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Occasional gentle desert birds circling high
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

    // Layer 1: Distant Spitzkoppe Granite Mountain Ridges
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

    // Layer 2: Iconic Sossusvlei Dune 45 Red Dunes with dramatic crest shadows
    const duneWidth = this.width / 3.2;
    for (let i = -1; i <= 4; i++) {
      const dx = i * duneWidth - (parallax * 0.5 % duneWidth);
      const peakX = dx + duneWidth * 0.48;
      const peakY = horizon - 52 - ((i * 13) % 20);

      // Lit face (warm orange copper)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(dx, horizon);
      ctx.quadraticCurveTo(dx + duneWidth * 0.25, horizon - 25, peakX, peakY);
      ctx.lineTo(dx + duneWidth, horizon);
      ctx.closePath();
      ctx.fill();

      // Shadow face (deep rich terracotta maroon)
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
    groundGrad.addColorStop(0, '#c2410c'); // Deep desert copper near horizon
    groundGrad.addColorStop(0.35, '#d97706'); // Warm Namib sand amber
    groundGrad.addColorStop(1, '#b45309'); // Rich ochre foreground

    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, this.width, this.height - horizon);

    // Sand ripples & texture lines on shoulders
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
    const topCenter = this.width / 2;
    const topWidth = this.width * 0.055;
    const bottomWidth = this.width * 0.78;

    // Road Gravel Base Surface
    ctx.beginPath();
    ctx.moveTo(topCenter - topWidth, horizon);
    ctx.lineTo(topCenter + topWidth, horizon);
    ctx.lineTo(this.width / 2 + bottomWidth / 2, this.height);
    ctx.lineTo(this.width / 2 - bottomWidth / 2, this.height);
    ctx.closePath();

    const roadGrad = ctx.createLinearGradient(0, horizon, 0, this.height);
    roadGrad.addColorStop(0, '#57534e'); // Distant gravel grey
    roadGrad.addColorStop(0.4, '#44403c'); // Asphalt / packed desert road
    roadGrad.addColorStop(1, '#292524'); // Dark contrast foreground road

    ctx.fillStyle = roadGrad;
    ctx.fill();

    // Road Borders / Shoulders (gravel verge)
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topCenter - topWidth, horizon);
    ctx.lineTo(this.width / 2 - bottomWidth / 2, this.height);
    ctx.moveTo(topCenter + topWidth, horizon);
    ctx.lineTo(this.width / 2 + bottomWidth / 2, this.height);
    ctx.stroke();

    // Lane Divider Dashes (moving smoothly towards player based on distance)
    const laneWidthTop = (topWidth * 2) / 3;
    const laneWidthBottom = bottomWidth / 3;

    // 2 Divider lines: between Left & Mid (-0.5 lane) and Mid & Right (+0.5 lane)
    [-0.5, 0.5].forEach((dividerLane) => {
      const numSegments = 16;
      for (let i = 0; i < numSegments; i++) {
        // Perspective distribution of dashes
        const segmentZ = ((i * 40 - (distance * 8) % 40) + 400) % 400;
        const p1 = this.project(dividerLane, 0, segmentZ);
        const p2 = this.project(dividerLane, 0, Math.min(390, segmentZ + 16));

        if (p1.visible && p2.visible && p1.scale > 0.06) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
          ctx.lineWidth = Math.max(1.5, 7 * p1.scale);
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
    collectibles: Collectible[],
    scenery: SceneryElement[],
    gameTime: number
  ) {
    // Combine all world entities with their z distance and render order
    type Renderable =
      | { type: 'scenery'; item: SceneryElement; z: number }
      | { type: 'obstacle'; item: Obstacle; z: number }
      | { type: 'collectible'; item: Collectible; z: number }
      | { type: 'player'; z: number };

    const renderables: Renderable[] = [
      ...scenery.map((s) => ({ type: 'scenery' as const, item: s, z: s.z })),
      ...obstacles.map((o) => ({ type: 'obstacle' as const, item: o, z: o.z })),
      ...collectibles.map((c) => ({ type: 'collectible' as const, item: c, z: c.z })),
      { type: 'player' as const, z: 25 }, // Player sits at z=25
    ];

    // Sort descending by z (furthest first, closest last)
    renderables.sort((a, b) => b.z - a.z);

    renderables.forEach((r) => {
      if (r.type === 'scenery') {
        this.drawSceneryElement(r.item);
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
    // Scenery sits outside road on left or right
    const laneOffset = s.xOffset > 0 ? 1.8 + s.xOffset : -1.8 + s.xOffset;
    const proj = this.project(laneOffset, 0, s.z);

    if (!proj.visible || proj.scale < 0.05) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);
    const size = 180 * proj.scale * s.scale;

    if (s.type === 'ACACIA_TREE') {
      // Camelthorn Acacia Tree (Iconic Namibian flat-topped umbrella tree)
      // Ground shadow
      ctx.fillStyle = 'rgba(80, 30, 5, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.7, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gnarled dark trunk
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = Math.max(2, size * 0.11);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-size * 0.12, -size * 0.5, 0, -size * 0.8);
      ctx.stroke();

      // Branching arms
      ctx.lineWidth = Math.max(1.5, size * 0.07);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.75);
      ctx.lineTo(-size * 0.45, -size * 0.95);
      ctx.moveTo(0, -size * 0.75);
      ctx.lineTo(size * 0.45, -size * 0.95);
      ctx.stroke();

      // Flat-topped acacia canopy foliage
      ctx.fillStyle = '#2e4c25'; // African olive-green foliage
      ctx.beginPath();
      ctx.ellipse(-size * 0.25, -size * 1.05, size * 0.55, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse(size * 0.2, -size * 1.08, size * 0.5, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4d7c0f'; // Highlighted top layer
      ctx.beginPath();
      ctx.ellipse(0, -size * 1.15, size * 0.65, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.type === 'DEAD_VLEI_TREE') {
      // Ancient scorched camelthorn silhouette of Dead Vlei
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.08, -size * 0.5);
      ctx.lineTo(0, -size * 0.9);
      // Twisted bare branches
      ctx.moveTo(-size * 0.08, -size * 0.5);
      ctx.lineTo(-size * 0.35, -size * 0.75);
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(size * 0.35, -size * 0.85);
      ctx.stroke();
    } else {
      // Desert grass / shrub tuft
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.1, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawObstacle(obs: Obstacle, gameTime: number) {
    const ctx = this.ctx;
    const laneX = obs.lanePos !== undefined ? obs.lanePos : obs.lane;
    const proj = this.project(laneX, 0, obs.z);

    if (!proj.visible || proj.scale < 0.05) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);

    const baseSize = 85 * proj.scale;
    const anim = obs.animTime || gameTime;

    // Contact Shadow on ground (sizes dynamically with creature body)
    ctx.fillStyle = 'rgba(30, 20, 15, 0.45)';
    ctx.beginPath();
    const shadowWidth = obs.type === 'FALLEN_TRUNK' ? baseSize * 0.95 : baseSize * 0.65;
    ctx.ellipse(0, 0, shadowWidth, baseSize * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    if (obs.type === 'ORYX') {
      // Iconic Namibian Oryx (Gemsbok) - National animal with majestic long straight V-horns!
      const bob = Math.sin(anim * 6) * (obs.isMoving ? 4 * proj.scale : 1);
      ctx.translate(0, bob);

      const ow = baseSize * 0.65;
      const oh = baseSize * 0.9;

      // Legs with black sock markings
      ctx.lineWidth = Math.max(2, baseSize * 0.07);
      ctx.strokeStyle = '#e2e8f0'; // White lower legs
      ctx.lineCap = 'round';

      // Back legs & Front legs
      [-ow * 0.35, -ow * 0.15, ow * 0.15, ow * 0.35].forEach((lx, idx) => {
        const legSwing = obs.isMoving ? Math.sin(anim * 10 + idx * 1.5) * baseSize * 0.12 : 0;
        ctx.beginPath();
        ctx.moveTo(lx, -oh * 0.35);
        ctx.lineTo(lx + legSwing, 0);
        ctx.stroke();
      });

      // Muscular Fawn-Grey Body
      ctx.fillStyle = '#94a3b8'; // Ash/slate fawn
      ctx.beginPath();
      ctx.ellipse(0, -oh * 0.42, ow * 0.48, oh * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bold Black Flank Stripe
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -oh * 0.35, ow * 0.42, oh * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Underbelly
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -oh * 0.3, ow * 0.38, oh * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black tail with tuft
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.04);
      ctx.beginPath();
      ctx.moveTo(-ow * 0.45, -oh * 0.42);
      ctx.quadraticCurveTo(-ow * 0.55, -oh * 0.25, -ow * 0.5, -oh * 0.15);
      ctx.stroke();

      // Neck and Head
      const headX = ow * 0.38;
      const headY = -oh * 0.72;

      // Strong Neck
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(ow * 0.15, -oh * 0.55);
      ctx.lineTo(headX, headY);
      ctx.lineTo(headX + ow * 0.18, headY + oh * 0.12);
      ctx.lineTo(ow * 0.3, -oh * 0.35);
      ctx.closePath();
      ctx.fill();

      // White Head Base
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(headX, headY, ow * 0.18, oh * 0.16, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Bold Black Mask on Face
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(headX + 2, headY, ow * 0.08, oh * 0.12, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Black Snout tip
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(headX + ow * 0.14, headY + oh * 0.06, ow * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // Magnificent Long Straight Spear Horns (Iconic V-shape)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(2, baseSize * 0.05);
      ctx.lineCap = 'round';

      // Left Horn
      ctx.beginPath();
      ctx.moveTo(headX - ow * 0.04, headY - oh * 0.1);
      ctx.lineTo(headX - ow * 0.22, headY - oh * 0.65);
      ctx.stroke();

      // Right Horn
      ctx.beginPath();
      ctx.moveTo(headX + ow * 0.04, headY - oh * 0.1);
      ctx.lineTo(headX - ow * 0.08, headY - oh * 0.68);
      ctx.stroke();
    } else if (obs.type === 'SPRINGBOK') {
      // Swift bounding Springbok (pronking gazelle)
      const pronk = Math.abs(Math.sin(anim * 8)) * (obs.isMoving ? 14 * proj.scale : 4 * proj.scale);
      ctx.translate(0, -pronk);

      const sw = baseSize * 0.55;
      const sh = baseSize * 0.75;

      // Slender legs
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.05);
      ctx.lineCap = 'round';
      [-sw * 0.3, -sw * 0.1, sw * 0.1, sw * 0.3].forEach((lx, idx) => {
        const legBend = Math.sin(anim * 12 + idx) * baseSize * 0.1;
        ctx.beginPath();
        ctx.moveTo(lx, -sh * 0.38);
        ctx.lineTo(lx + legBend, 0);
        ctx.stroke();
      });

      // Warm Cinnamon Back
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -sh * 0.44, sw * 0.44, sh * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark Chocolate Side Stripe
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -sh * 0.36, sw * 0.4, sh * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brilliant White Underbelly
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -sh * 0.3, sw * 0.36, sh * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head with curved lyre horns
      const hx = sw * 0.35;
      const hy = -sh * 0.7;

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(hx, hy, sw * 0.15, sh * 0.12, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // White face blaze
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(hx + 2, hy, sw * 0.06, sh * 0.1, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Lyre-shaped curved black horns
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.04);
      ctx.beginPath();
      ctx.moveTo(hx, hy - sh * 0.08);
      ctx.quadraticCurveTo(hx - sw * 0.08, hy - sh * 0.3, hx - sw * 0.02, hy - sh * 0.38);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hx + sw * 0.06, hy - sh * 0.08);
      ctx.quadraticCurveTo(hx + sw * 0.14, hy - sh * 0.3, hx + sw * 0.08, hy - sh * 0.38);
      ctx.stroke();
    } else if (obs.type === 'WARTHOG') {
      // Desert Warthog (Pumbaa) - Sturdy, running with tail straight up!
      const ww = baseSize * 0.65;
      const wh = baseSize * 0.55;

      const trot = Math.sin(anim * 14) * 3;
      ctx.translate(0, trot);

      // Scurrying legs
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(2, baseSize * 0.07);
      ctx.lineCap = 'round';
      [-ww * 0.28, -ww * 0.1, ww * 0.1, ww * 0.28].forEach((lx, idx) => {
        const legTrot = Math.sin(anim * 16 + idx * 2) * baseSize * 0.12;
        ctx.beginPath();
        ctx.moveTo(lx, -wh * 0.35);
        ctx.lineTo(lx + legTrot, 0);
        ctx.stroke();
      });

      // Stout Barrel Body
      ctx.fillStyle = '#475569'; // Rugged desert hide
      ctx.beginPath();
      ctx.ellipse(0, -wh * 0.5, ww * 0.46, wh * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bristly dark dorsal ridge / mane
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, -wh * 0.72, ww * 0.38, wh * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout and Head
      const hx = ww * 0.36;
      const hy = -wh * 0.52;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(hx, hy, ww * 0.24, wh * 0.26, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Flat snout disk
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(hx + ww * 0.16, hy + wh * 0.04, ww * 0.09, wh * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upward-curving Ivory Tusks!
      ctx.strokeStyle = '#fef08a'; // Yellowish ivory
      ctx.lineWidth = Math.max(2, baseSize * 0.06);
      ctx.beginPath();
      ctx.moveTo(hx + ww * 0.08, hy + wh * 0.1);
      ctx.quadraticCurveTo(hx + ww * 0.22, hy + wh * 0.12, hx + ww * 0.24, hy - wh * 0.08);
      ctx.stroke();

      // Comical antenna-tail held straight UP!
      const tailWiggle = Math.sin(anim * 20) * 0.15;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.04);
      ctx.beginPath();
      ctx.moveTo(-ww * 0.42, -wh * 0.55);
      ctx.lineTo(-ww * 0.44 + tailWiggle * baseSize * 0.3, -wh * 1.15);
      ctx.stroke();

      // Tail tuft
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-ww * 0.44 + tailWiggle * baseSize * 0.3, -wh * 1.18, baseSize * 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'OSTRICH') {
      // Tall desert Ostrich pacing or blocking lane
      const ow = baseSize * 0.5;
      const oh = baseSize * 1.05;

      const stride = Math.sin(anim * 10) * baseSize * 0.14;

      // Long powerful runner legs
      ctx.strokeStyle = '#fed7aa'; // Tan legs
      ctx.lineWidth = Math.max(2, baseSize * 0.06);
      ctx.lineCap = 'round';

      // Left leg
      ctx.beginPath();
      ctx.moveTo(-ow * 0.15, -oh * 0.45);
      ctx.lineTo(-ow * 0.18 + stride, 0);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(ow * 0.15, -oh * 0.45);
      ctx.lineTo(ow * 0.18 - stride, 0);
      ctx.stroke();

      // Fluffy Black Body Plumage
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(0, -oh * 0.52, ow * 0.45, oh * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // White wing tips
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -oh * 0.42, ow * 0.36, oh * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Long curved neck bobbing
      const neckBob = Math.cos(anim * 10) * 3;
      const headX = ow * 0.25 + neckBob;
      const headY = -oh * 0.92;

      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = Math.max(2.5, baseSize * 0.08);
      ctx.beginPath();
      ctx.moveTo(ow * 0.18, -oh * 0.55);
      ctx.quadraticCurveTo(ow * 0.35, -oh * 0.72, headX, headY);
      ctx.stroke();

      // Small Head & Beak
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(headX, headY, ow * 0.12, oh * 0.06, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(headX + ow * 0.08, headY - oh * 0.02);
      ctx.lineTo(headX + ow * 0.2, headY);
      ctx.lineTo(headX + ow * 0.08, headY + oh * 0.03);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(headX + 2, headY - 1, baseSize * 0.03, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'FALLEN_TRUNK') {
      // Fallen dead camelthorn tree trunk across the lane (Jumpable!)
      const tw = baseSize * 1.15;
      const th = baseSize * 0.32;

      // Main gnarled log
      ctx.fillStyle = '#451a03'; // Dark dry wood bark
      ctx.beginPath();
      ctx.roundRect(-tw * 0.5, -th, tw, th, baseSize * 0.08);
      ctx.fill();

      // Wood rings on log ends
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(-tw * 0.48, -th * 0.5, baseSize * 0.08, th * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(tw * 0.48, -th * 0.5, baseSize * 0.08, th * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Broken branches poking upward
      ctx.strokeStyle = '#291102';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.06);
      ctx.beginPath();
      ctx.moveTo(-tw * 0.2, -th);
      ctx.lineTo(-tw * 0.28, -th * 1.6);
      ctx.moveTo(tw * 0.15, -th);
      ctx.lineTo(tw * 0.24, -th * 1.5);
      ctx.stroke();
    } else if (obs.type === 'ROCK') {
      // Desert Granite Boulder
      ctx.fillStyle = '#78350f'; // Dark base
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.55, 0);
      ctx.lineTo(-baseSize * 0.5, -baseSize * 0.5);
      ctx.lineTo(-baseSize * 0.15, -baseSize * 0.8);
      ctx.lineTo(baseSize * 0.4, -baseSize * 0.7);
      ctx.lineTo(baseSize * 0.55, -baseSize * 0.25);
      ctx.lineTo(baseSize * 0.45, 0);
      ctx.closePath();
      ctx.fill();

      // Lit Facet (Desert sunlight reflection)
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.15, -baseSize * 0.8);
      ctx.lineTo(baseSize * 0.4, -baseSize * 0.7);
      ctx.lineTo(baseSize * 0.25, -baseSize * 0.3);
      ctx.lineTo(-baseSize * 0.2, -baseSize * 0.35);
      ctx.closePath();
      ctx.fill();

      // Bright edge highlight
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-baseSize * 0.15, -baseSize * 0.8);
      ctx.lineTo(baseSize * 0.15, -baseSize * 0.75);
      ctx.lineTo(0, -baseSize * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === 'ROAD_BARRIER') {
      // Roadwork barrier
      const w = baseSize * 1.1;
      const h = baseSize * 0.75;

      // Barrier posts
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w * 0.45, -h, w * 0.09, h);
      ctx.fillRect(w * 0.36, -h, w * 0.09, h);

      // Barrier board
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-w * 0.5, -h * 0.9, w, h * 0.5);

      // Warning stripes (orange & white or yellow & black)
      ctx.fillStyle = '#ea580c';
      for (let sx = -w * 0.5; sx < w * 0.5; sx += w * 0.22) {
        ctx.beginPath();
        ctx.moveTo(sx, -h * 0.4);
        ctx.lineTo(sx + w * 0.1, -h * 0.4);
        ctx.lineTo(sx + w * 0.18, -h * 0.9);
        ctx.lineTo(sx + w * 0.08, -h * 0.9);
        ctx.closePath();
        ctx.fill();
      }

      // Flashing yellow hazard beacon on top
      const flash = Math.sin(gameTime * 8) > 0;
      ctx.fillStyle = flash ? '#facc15' : '#854d0e';
      ctx.beginPath();
      ctx.arc(0, -h * 1.05, baseSize * 0.14, 0, Math.PI * 2);
      ctx.fill();

      if (flash) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.beginPath();
        ctx.arc(0, -h * 1.05, baseSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obs.type === 'ACACIA_BUSH') {
      // Thorny Acacia scrub bush
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.ellipse(0, -baseSize * 0.35, baseSize * 0.55, baseSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sharp thorns / twigs poking out
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = Math.max(1.5, baseSize * 0.06);
      for (let a = 0; a < Math.PI * 2; a += 0.7) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * baseSize * 0.4, -baseSize * 0.35 + Math.sin(a) * baseSize * 0.25);
        ctx.lineTo(Math.cos(a) * baseSize * 0.65, -baseSize * 0.35 + Math.sin(a) * baseSize * 0.45);
        ctx.stroke();
      }
    } else if (obs.type === 'MEERKAT') {
      // Cute desert Meerkat standing sentinel on the road
      const mh = baseSize * 0.85;
      const mw = baseSize * 0.28;

      // Body
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, -mh * 0.5, mw * 0.5, mh * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(0, -mh * 0.45, mw * 0.3, mh * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(0, -mh * 0.85, mw * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Eye markings (dark sunglasses marking)
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(-mw * 0.2, -mh * 0.86, mw * 0.16, 0, Math.PI * 2);
      ctx.arc(mw * 0.2, -mh * 0.86, mw * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // Curious head tilt
      const lookTilt = Math.sin(gameTime * 3) * 0.15;
      ctx.rotate(lookTilt);
    } else {
      // Default rock fallback
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -baseSize * 0.4, baseSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCollectible(col: Collectible, gameTime: number) {
    if (col.collected) return;
    const ctx = this.ctx;

    // Gentle vertical bobbing
    const bob = Math.sin(gameTime * 5 + col.id) * 12;
    const proj = this.project(col.lane, 25 + bob, col.z);

    if (!proj.visible || proj.scale < 0.05) return;

    ctx.save();
    ctx.translate(proj.x, proj.y);

    // Dynamic scale based on depth
    const size = 52 * proj.scale;
    const rot = col.rotation + gameTime * 3;

    // Ground shadow beneath collectible
    const shadowProj = this.project(col.lane, 0, col.z);
    ctx.fillStyle = 'rgba(40, 20, 10, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, shadowProj.y - proj.y, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (col.type === 'COIN') {
      // Namibian Dollar Golden Coin with 3D rotation
      const spinScale = Math.cos(rot);

      ctx.save();
      ctx.scale(spinScale, 1);

      // Gold Coin Outer Glow
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10 * proj.scale;

      // Coin Base Rim
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Coin Face
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
      ctx.fill();

      // "N$" Coin Stamping
      if (Math.abs(spinScale) > 0.3) {
        ctx.fillStyle = '#854d0e';
        ctx.font = `bold ${Math.max(8, size * 0.4)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N$', 0, 0);
      }

      ctx.restore();
    } else if (col.type === 'DIAMOND') {
      // Namibian Desert Diamond (Crystalline Cyan / Violet Diamond Gem)
      ctx.save();
      ctx.rotate(Math.sin(gameTime * 2) * 0.2);

      // Diamond Shimmer Glow
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15 * proj.scale;

      // Diamond facets
      const dw = size * 0.6;
      const dh = size * 0.7;

      // Top facet
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.moveTo(-dw * 0.5, -dh * 0.2);
      ctx.lineTo(-dw * 0.25, -dh * 0.5);
      ctx.lineTo(dw * 0.25, -dh * 0.5);
      ctx.lineTo(dw * 0.5, -dh * 0.2);
      ctx.closePath();
      ctx.fill();

      // Bottom facet (tapering to sharp point)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(-dw * 0.5, -dh * 0.2);
      ctx.lineTo(dw * 0.5, -dh * 0.2);
      ctx.lineTo(0, dh * 0.55);
      ctx.closePath();
      ctx.fill();

      // Center brilliance sparkle facet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -dh * 0.4);
      ctx.lineTo(dw * 0.2, -dh * 0.1);
      ctx.lineTo(0, dh * 0.2);
      ctx.lineTo(-dw * 0.2, -dh * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    } else {
      // Golden Powerup Star
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12 * proj.scale;

      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * Math.PI * 2) / 5 - Math.PI / 2 + rot * 0.5;
        const innerAngle = outerAngle + Math.PI / 5;
        const ox = Math.cos(outerAngle) * size * 0.6;
        const oy = Math.sin(outerAngle) * size * 0.6;
        const ix = Math.cos(innerAngle) * size * 0.28;
        const iy = Math.sin(innerAngle) * size * 0.28;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPlayer(player: PlayerState, gameTime: number) {
    const ctx = this.ctx;
    // Project player onto screen (at z=25)
    const proj = this.project(player.lanePosition, player.y, 25);

    ctx.save();
    ctx.translate(proj.x, proj.y);

    // Leaning / Banking angle when switching lanes
    ctx.rotate(player.tilt * 0.22);

    const size = 95 * proj.scale;

    // 1. Cast shadow on ground (shrinks and softens as player jumps higher)
    const shadowProj = this.project(player.lanePosition, 0, 25);
    const jumpHeightRatio = Math.min(1, player.y / 120);
    const shadowWidth = size * 0.7 * (1 - jumpHeightRatio * 0.35);
    const shadowAlpha = 0.5 * (1 - jumpHeightRatio * 0.5);

    ctx.fillStyle = `rgba(30, 20, 15, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, shadowProj.y - proj.y, shadowWidth, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Invulnerability flashing if recently hit
    if (player.invulnerableTime > 0 && Math.sin(gameTime * 25) > 0) {
      ctx.globalAlpha = 0.45;
    }

    // 2. Animated Character Model (Young Namibian Runner viewed from behind)
    const runCycle = player.runCycle;
    const isJumping = player.isJumping;

    // Leg swing angles
    const legL = isJumping ? -0.4 : Math.sin(runCycle) * 0.7;
    const legR = isJumping ? 0.3 : -Math.sin(runCycle) * 0.7;
    const armL = isJumping ? -0.6 : -Math.sin(runCycle) * 0.6;
    const armR = isJumping ? -0.6 : Math.sin(runCycle) * 0.6;
    const bobY = isJumping ? 0 : Math.abs(Math.sin(runCycle)) * 4;

    const bodyY = -size * 0.95 + bobY;

    // Legs & Modern Running Sneakers
    const legWidth = Math.max(2.5, size * 0.12);
    ctx.lineWidth = legWidth;
    ctx.lineCap = 'round';

    // Left Leg
    ctx.strokeStyle = '#1e293b'; // Athletic runner tights/shorts
    ctx.beginPath();
    ctx.moveTo(-size * 0.16, bodyY + size * 0.5);
    const footLX = -size * 0.18 + Math.sin(legL) * size * 0.35;
    const footLY = bodyY + size * 0.5 + Math.cos(legL) * size * 0.45;
    ctx.lineTo(footLX, footLY);
    ctx.stroke();

    // Left Sneaker (Bright modern running kicks)
    ctx.fillStyle = '#06b6d4'; // Cyan neon accent sneaker
    ctx.beginPath();
    ctx.ellipse(footLX, footLY, size * 0.14, size * 0.08, legL * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff'; // White sneaker sole
    ctx.fillRect(footLX - size * 0.12, footLY + size * 0.04, size * 0.22, size * 0.04);

    // Right Leg
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(size * 0.16, bodyY + size * 0.5);
    const footRX = size * 0.18 + Math.sin(legR) * size * 0.35;
    const footRY = bodyY + size * 0.5 + Math.cos(legR) * size * 0.45;
    ctx.lineTo(footRX, footRY);
    ctx.stroke();

    // Right Sneaker
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.ellipse(footRX, footRY, size * 0.14, size * 0.08, legR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(footRX - size * 0.12, footRY + size * 0.04, size * 0.22, size * 0.04);

    // Torso / Athletic Hoodie with Namibian Colors Stripe
    ctx.fillStyle = '#0284c7'; // Vibrant Namibian royal blue hoodie
    ctx.beginPath();
    ctx.roundRect(-size * 0.28, bodyY + size * 0.12, size * 0.56, size * 0.44, size * 0.08);
    ctx.fill();

    // Namibian Flag Accent Stripe across jacket back (Sun Gold & Crimson Red)
    ctx.fillStyle = '#fbbf24'; // Namibian golden yellow
    ctx.fillRect(-size * 0.28, bodyY + size * 0.26, size * 0.56, size * 0.05);
    ctx.fillStyle = '#dc2626'; // Namibian red
    ctx.fillRect(-size * 0.28, bodyY + size * 0.31, size * 0.56, size * 0.04);
    ctx.fillStyle = '#16a34a'; // Namibian green
    ctx.fillRect(-size * 0.28, bodyY + size * 0.35, size * 0.56, size * 0.04);

    // Modern Urban Runner Backpack / Hydration pack
    ctx.fillStyle = '#0f172a'; // Sleek dark backpack
    ctx.beginPath();
    ctx.roundRect(-size * 0.18, bodyY + size * 0.16, size * 0.36, size * 0.3, size * 0.06);
    ctx.fill();

    // Backpack reflective safety badge
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-size * 0.07, bodyY + size * 0.24, size * 0.14, size * 0.04);

    // Arms
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = legWidth * 0.9;

    // Left Arm
    ctx.beginPath();
    ctx.moveTo(-size * 0.26, bodyY + size * 0.18);
    ctx.lineTo(-size * 0.38, bodyY + size * 0.32 + armL * size * 0.2);
    ctx.stroke();

    // Right Arm
    ctx.beginPath();
    ctx.moveTo(size * 0.26, bodyY + size * 0.18);
    ctx.lineTo(size * 0.38, bodyY + size * 0.32 + armR * size * 0.2);
    ctx.stroke();

    // Head / Neck
    ctx.fillStyle = '#78350f'; // Warm skin tone
    ctx.beginPath();
    ctx.arc(0, bodyY + size * 0.08, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Hair: Stylized modern fade / textured hair
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, bodyY + size * 0.04, size * 0.19, Math.PI, Math.PI * 2);
    ctx.fill();

    // Runner's Headband or cap
    ctx.fillStyle = '#e11d48'; // Sporty red headband
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
