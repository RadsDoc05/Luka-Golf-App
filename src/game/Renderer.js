/**
 * Renderer.js
 * HTML5 Canvas 2D renderer (1280x800 target resolution) for Luka's Golf Adventure.
 * Features:
 *   1. Rich Per-Hole Animated Environments (Dolphins, Pirate Ships, Dinosaurs, Hovercars, Hot Air Balloons, Trains, Waterfalls, Ferris Wheel)
 *   2. Interactive Tappable Driving Range Bullseye Target Signs (`t.hitBox`)
 *   3. Full-Screen Volcano Lava Eruptions & Radial Firework Particle Shows
 *   4. Wacky Mini-Golf Tunnels & Obstacles
 */

import { MINIGOLF_BALL_COLORS, MINIGOLF_CLUB_COLORS } from '../core/Storage.js';

// Universal Cross-Browser Polyfill for CanvasRenderingContext2D.prototype.roundRect
// Ensures roundRect works 100% reliably on older Android WebViews, Onn tablets, and legacy browsers
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    if (radii === undefined) radii = 0;
    let r = 0;
    if (typeof radii === 'number') {
      r = radii;
    } else if (Array.isArray(radii) && radii.length > 0) {
      r = radii[0];
    }
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

const LANE_OFFSETS = {
  left: -175,
  center: 0,
  right: 175
};

const BALL_ICONS = {
  classic: null,
  soccer: '⚽',
  pizza: '🍕',
  dino_egg: '🥚',
  donut: '🍩',
  meteor: '☄️'
};

const PET_ICONS = {
  puppy: '🐶',
  baby_dino: '🦖',
  robot: '🤖',
  parrot: '🦜'
};

export class CanvasRenderer {
  constructor(canvas, animations, storage) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animations = animations;
    this.storage = storage;
    this.assetPrefix = (window.location.pathname || '').includes('/src/') ? '../assets/images' : './assets/images';

    // Ensure roundRect is polyfilled on instance ctx as well
    if (this.ctx && !this.ctx.roundRect) {
      this.ctx.roundRect = function(x, y, w, h, radii) {
        if (radii === undefined) radii = 0;
        let r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0) || 0;
        r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
      };
    }

    // Camera & HiDPI state for 1:1 uniform aspect ratio in both Landscape & Portrait
    this.dpr = 1;
    this.camScale = 1;
    this.camOffsetX = 0;
    this.camOffsetY = 0;

    this.images = {};
    this._preloadImages();
  }

  _preloadImages() {
    const manifest = {
      course_tropical:      'courses/tropical.svg',
      course_dino:          'courses/dino.svg',
      course_cyber:         'courses/cyber.svg',
      course_canyon:        'courses/canyon.svg',
      course_driving_range: 'courses/driving_range.svg',
      course_minigolf:      'courses/minigolf.svg',
      golfer_idle:          'characters/golfer_idle.svg',
      golfer_backswing:     'characters/golfer_backswing.svg',
      golfer_impact:        'characters/golfer_impact.svg',
      golfer_mishap:        'characters/golfer_mishap.svg',
      golfer_celebrate:     'characters/golfer_celebrate.svg',
      golf_ball:            'ui/golf_ball.svg',
      flag_pin:             'ui/flag_pin.svg'
    };

    for (const [key, relPath] of Object.entries(manifest)) {
      const img = new Image();
      img.src = `${this.assetPrefix}/${relPath}`;
      this.images[key] = img;
    }
  }

  /**
   * Synchronizes canvas backing resolution with `window.devicePixelRatio` (HiDPI / Retina)
   * and computes a strictly 1:1 uniform scale (`scaleX === scaleY`) so Portrait mode is
   * NEVER elongated or pixelated!
   */
  _syncCameraAndDPR() {
    const stageEl = this.canvas.parentElement || this.canvas;
    const cssW = Math.max(320, stageEl.offsetWidth || 1280);
    const cssH = Math.max(320, stageEl.offsetHeight || 800);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    this.dpr = dpr;
    const isPortrait = cssH > cssW * 1.05;

    if (isPortrait) {
      // In Portrait mode: fit 820 world units of width centered on x=640 with 1:1 square pixels!
      // Position the golf action (y=80..720) in the upper/middle viewport above the bottom math deck.
      this.camScale = cssW / 820;
      this.camOffsetX = cssW * 0.5 - 640 * this.camScale;
      this.camOffsetY = cssH * 0.39 - 430 * this.camScale;
    } else {
      // In Landscape mode: uniform 1:1 scale filling the stage, centered on (640, 400)
      this.camScale = Math.max(cssW / 1280, cssH / 800);
      this.camOffsetX = cssW * 0.5 - 640 * this.camScale;
      this.camOffsetY = cssH * 0.5 - 400 * this.camScale;
    }

    if (!Number.isFinite(this.camScale) || this.camScale <= 0) this.camScale = 1;
    if (!Number.isFinite(this.camOffsetX)) this.camOffsetX = 0;
    if (!Number.isFinite(this.camOffsetY)) this.camOffsetY = 0;
  }

  /**
   * Converts a browser pointer event `(clientX, clientY)` into `(worldX, worldY)` in the 1280x800 scene.
   */
  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 640, y: 400 };

    const stageEl = this.canvas.parentElement || this.canvas;
    const cssW = Math.max(320, stageEl.offsetWidth || 1280);
    const cssH = Math.max(320, stageEl.offsetHeight || 800);

    // Local CSS coordinate inside the stage (accounting for CSS transform scale)
    const localX = ((clientX - rect.left) / rect.width) * cssW;
    const localY = ((clientY - rect.top) / rect.height) * cssH;

    return {
      x: (localX - this.camOffsetX) / (this.camScale || 1),
      y: (localY - this.camOffsetY) / (this.camScale || 1)
    };
  }

  render(gameState, now = performance.now()) {
    const ctx = this.ctx;
    const hole = gameState.currentHole;
    if (!hole) return;

    this._syncCameraAndDPR();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply uniform 1:1 HiDPI camera transform
    const s = (Number.isFinite(this.camScale) && this.camScale > 0 ? this.camScale : 1) * (this.dpr || 1);
    const ox = (Number.isFinite(this.camOffsetX) ? this.camOffsetX : 0) * (this.dpr || 1);
    const oy = (Number.isFinite(this.camOffsetY) ? this.camOffsetY : 0) * (this.dpr || 1);
    ctx.setTransform(s, 0, 0, s, ox, oy);

    // Dynamic Ball-Follow Camera Zoom on Course Drives!
    const activeShot = this.animations.activeShot;
    const isCourseDrive = activeShot && activeShot.kind === 'correct' && activeShot.shotType === 'drive';

    if (isCourseDrive && activeShot.flightT > 0.03 && activeShot.flightT < 0.96) {
      const flightT = activeShot.flightT;
      const zoomCurve = Math.sin(Math.min(1, Math.max(0, (flightT - 0.03) / 0.93)) * Math.PI);
      const maxZoom = activeShot.isMegaPower ? 2.45 : 1.75;
      const zoom = 1.0 + zoomCurve * (maxZoom - 1.0);

      const ball = this.animations.ballPos;
      // Focus smoothly toward the soaring ball
      const focusX = 640 + (ball.x - 640) * (0.84 * zoomCurve);
      const focusY = 400 + (ball.y - 400) * (0.84 * zoomCurve);

      ctx.translate(640, 400);
      ctx.scale(zoom, zoom);
      ctx.translate(-focusX, -focusY);
    }

    // Apply volcano rumble or mega drive impact camera shake!
    const isMegaCharging = (this.animations.isMegaActive && this.animations.golferPose === 'backswing') ||
      (activeShot && activeShot.isMegaPower && (!activeShot.swingTriggered || activeShot.flightT < 0.05));
    if (this.animations.milestoneEffect || (activeShot && activeShot.isMegaPower && activeShot.landingBounceTriggered) || isMegaCharging) {
      const mult = isMegaCharging ? 4 : 7;
      const shakeX = Math.sin(now * 0.08) * mult;
      const shakeY = Math.cos(now * 0.095) * (mult * 0.8);
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Backdrop + Per-Hole Time-of-Day & Animated Scenery
    try {
      this._drawCourseBackdrop(ctx, hole.theme, hole.number || 1, now);
    } catch (e) {
      console.warn('Backdrop render warning:', e);
    }
    try {
      this._drawDynamicEnvironment(ctx, hole.theme, hole.number || 1, now);
    } catch (e) {
      console.warn('Dynamic environment render warning:', e);
    }

    // 2. Mode-Specific Scenery & Targets
    try {
      if (gameState.appMode === 'driving_range') {
        this._drawDrivingRangeTargets(ctx, gameState, now);
      } else if (gameState.appMode === 'minigolf') {
        this._drawGreenAndFlag(ctx, hole, 'green', now);
        this._drawMiniGolfObstacles(ctx, hole.obstacleType, now);
      } else {
        this._drawGreenAndFlag(ctx, hole, gameState.lie, now);
        this._drawAimingAndBonusTargets(ctx, gameState, now);
      }
    } catch (e) {
      console.warn('Mode scenery render warning:', e);
    }

    // 3. Draw Tee Box Foreground
    try {
      this._drawForegroundTeeBox(ctx, gameState.lie);
    } catch (e) {
      console.warn('Tee box render warning:', e);
    }

    // 4. Draw Slapstick Hazard Reaction (if active)
    try {
      if (this.animations.hazardEffect) {
        this._drawHazardReaction(ctx, this.animations.hazardEffect, now);
      }
    } catch (e) {
      console.warn('Hazard render warning:', e);
    }

    // 5. Draw Ball Flight Trail, Pro-Golf Drive Shot Tracer & Golf Ball
    try {
      this._drawBallAndTrail(ctx, now);
    } catch (e) {
      console.warn('Ball trail render warning:', e);
    }

    // 6. Draw Luka Golfer (with Custom Club Color) & Caddy Pet Companion
    try {
      this._drawGolferAndPet(ctx, now);
    } catch (e) {
      console.warn('Golfer render warning:', e);
    }

    // 7. Draw Celebrations, Volcano Milestone Lava & Radial Fireworks
    try {
      this._drawCelebrations(ctx, now);
    } catch (e) {
      console.warn('Celebrations render warning:', e);
    }

    // 8. Dragon Ball Z In-Flight Anime Speed Lines & Impact White Flash
    try {
      if (activeShot && activeShot.isMegaPower) {
        if (activeShot.flightT > 0.02 && activeShot.flightT < 0.90) {
          this._drawMegaSpeedLines(ctx, 1.0, now);
        }
        if (activeShot.flightT < 0.08) {
          const flashAlpha = (1.0 - (activeShot.flightT / 0.08)) * 0.88;
          ctx.fillStyle = `rgba(255, 255, 245, ${flashAlpha})`;
          ctx.fillRect(-300, -600, 1880, 2200);
        }
      }
    } catch (e) {
      console.warn('DBZ mega effects render warning:', e);
    }

    ctx.restore();
  }

  _drawCourseBackdrop(ctx, theme, holeNumber, now) {
    // Fill extended vertical sky & turf for Portrait mode so there are never black bars!
    const skyColors = {
      tropical: '#29B6F6',
      dino: '#FF7043',
      cyber: '#1A103C',
      canyon: '#FF8A65',
      driving_range: '#FF7043',
      minigolf: '#311B92'
    };
    const turfColors = {
      tropical: '#1B5E20',
      dino: '#33691E',
      cyber: '#0D2622',
      canyon: '#2E7D32',
      driving_range: '#2E7D32',
      minigolf: '#1B5E20'
    };
    ctx.fillStyle = skyColors[theme] || '#29B6F6';
    ctx.fillRect(-300, -600, 1880, 1020);
    ctx.fillStyle = turfColors[theme] || '#1B5E20';
    ctx.fillRect(-300, 400, 1880, 1200);

    const img = this.images[`course_${theme}`];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, 1280, 800);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, '#29B6F6');
      grad.addColorStop(0.5, '#81D4FA');
      grad.addColorStop(0.5, '#66BB6A');
      grad.addColorStop(1, '#2E7D32');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 800);
    }

    // Per-Hole Time-of-Day Atmosphere Tint so every hole feels distinct!
    ctx.save();
    const variant = holeNumber % 4;
    if (variant === 2) {
      // Golden Sunset Glow
      const grad = ctx.createLinearGradient(0, 0, 0, 420);
      grad.addColorStop(0, 'rgba(255, 111, 0, 0.22)');
      grad.addColorStop(1, 'rgba(255, 214, 0, 0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 420);
    } else if (variant === 3) {
      // Tropical Twilight / Starlight Shimmer
      ctx.fillStyle = 'rgba(49, 27, 146, 0.16)';
      ctx.fillRect(0, 0, 1280, 400);
      for (let i = 0; i < 14; i++) {
        const sx = (i * 97 + 50) % 1220;
        const sy = 80 + ((i * 53) % 180);
        const twinkle = 0.35 + Math.abs(Math.sin(now * 0.004 + i)) * 0.65;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (variant === 0) {
      // Rainbow Sky Arch!
      const rbColors = ['rgba(255,23,68,0.18)', 'rgba(255,234,0,0.18)', 'rgba(0,230,118,0.18)', 'rgba(0,176,255,0.18)'];
      rbColors.forEach((c, idx) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(640, 420, 360 - idx * 9, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  /**
   * Draws rich animated background wildlife, vehicles, boats, dinosaurs, trains, and props
   * customized per theme AND hole number so the courses feel alive and varied!
   */
  _drawDynamicEnvironment(ctx, theme, holeNumber, now) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drifting Fluffy Clouds across the sky
    for (let i = 0; i < 3; i++) {
      const cx = ((now * (0.015 + i * 0.005) + i * 420 + holeNumber * 130) % 1420) - 70;
      const cy = 115 + i * 38;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 48, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 28, cy + 4, 36, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (theme === 'tropical') {
      // 1. Bobbing Duck in Kiddie Pool
      const bob = Math.sin(now * 0.004) * 5;
      ctx.font = '32px sans-serif';
      ctx.fillText('🦆', 975, 572 + bob);

      // 2. Sailing Ship / Yacht cruising across the ocean horizon
      const boatX = 120 + ((now * 0.025 + holeNumber * 180) % 980);
      const boatBob = Math.sin(now * 0.005) * 4;
      ctx.font = '42px sans-serif';
      ctx.fillText(holeNumber % 2 === 0 ? '⛵' : '🛥️', boatX, 342 + boatBob);

      // 3. Leaping Dolphin arc out of the ocean!
      const dolphinCycle = (now * 0.0018 + holeNumber) % (Math.PI * 2);
      if (Math.sin(dolphinCycle) > 0) {
        const dx = 310 + Math.cos(dolphinCycle) * 65;
        const dy = 355 - Math.sin(dolphinCycle) * 55;
        ctx.font = '36px sans-serif';
        ctx.fillText('🐬', dx, dy);
      }

      // 4. Scuttling Crab near the beach bunker
      const crabX = 250 + Math.sin(now * 0.004) * 35;
      ctx.font = '28px sans-serif';
      ctx.fillText('🦀', crabX, 535);

      // 5. Extra Island Props by Hole Number
      if (holeNumber >= 3) {
        ctx.font = '46px sans-serif';
        ctx.fillText('🦩', 195, 485 + Math.sin(now * 0.006) * 3);
        ctx.fillText('🏖️', 1055, 470);
      }
    } else if (theme === 'dino') {
      // 1. Volcano Rising Smoke & Glowing Magma Crater
      const vx = 1020;
      const vy = 125;
      const drift = (now * 0.04) % 55;
      ctx.fillStyle = 'rgba(255, 87, 34, 0.45)';
      ctx.beginPath();
      ctx.arc(vx, vy + 14, 32 + Math.sin(now * 0.009) * 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(vx, vy - drift, 18 + drift * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Gliding Pterodactyls in the Sky
      const pteroX = 1150 - ((now * 0.06 + holeNumber * 150) % 1050);
      const pteroY = 175 + Math.sin(now * 0.007) * 18;
      ctx.font = '44px sans-serif';
      ctx.fillText('🦅', pteroX, pteroY);

      // 3. Friendly Long-Neck Brachiosaurus & T-Rex along the Jungle Ridge
      const dinoBob = Math.sin(now * 0.003) * 5;
      ctx.font = '62px sans-serif';
      ctx.fillText('🦕', 185 + Math.sin(now * 0.0015) * 25, 415 + dinoBob);
      if (holeNumber % 2 === 1) {
        ctx.font = '50px sans-serif';
        ctx.fillText('🦖', 1085, 455 - dinoBob);
      }

      // 4. Bubbling Lava Geyser
      const geyserH = 12 + Math.abs(Math.sin(now * 0.006)) * 28;
      ctx.fillStyle = 'rgba(255, 193, 7, 0.75)';
      ctx.beginPath();
      ctx.ellipse(980, 445 - geyserH / 2, 10, geyserH, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme === 'cyber') {
      // 1. Pulsing Neon Grid Lines on the Fairway
      const pulse = 0.25 + Math.sin(now * 0.006) * 0.15;
      ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(500, 402, 280, 390);

      // 2. Multiple Flying Hovercars & Spaceships zooming across Sky-Lanes!
      const car1X = ((now * 0.09 + holeNumber * 200) % 1360) - 40;
      const car2X = 1320 - ((now * 0.075 + holeNumber * 110) % 1360);
      ctx.font = '40px sans-serif';
      ctx.fillText('🛸', car1X, 205 + Math.sin(now * 0.008) * 8);
      ctx.fillText('🚀', car2X, 265 + Math.cos(now * 0.007) * 8);

      // 3. Rotating Cyber Neon Wheel in the Skyline
      ctx.save();
      ctx.translate(220, 265);
      ctx.rotate(now * 0.0015);
      ctx.strokeStyle = '#EA80FC';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 46);
        ctx.stroke();
      }
      ctx.restore();
    } else if (theme === 'canyon') {
      // 1. Cascading Waterfall Droplets & Mist Cloud
      const mist = Math.sin(now * 0.006) * 8;
      ctx.fillStyle = 'rgba(225, 245, 254, 0.72)';
      ctx.beginPath();
      ctx.arc(1062 + mist, 445, 28, 0, Math.PI * 2);
      ctx.arc(1090 - mist, 452, 22, 0, Math.PI * 2);
      ctx.fill();

      // 2. Drifting Colorful Hot Air Balloons between the Canyon Mesas!
      const balloon1Y = 195 + Math.sin(now * 0.003) * 16;
      const balloon2Y = 235 + Math.cos(now * 0.0025) * 14;
      ctx.font = '52px sans-serif';
      ctx.fillText('🎈', 260 + Math.sin(now * 0.001) * 30, balloon1Y);
      ctx.font = '38px sans-serif';
      ctx.fillText('🎈', 940 + Math.cos(now * 0.0012) * 25, balloon2Y);

      // 3. Soaring Canyon Eagle
      const eagleX = 640 + Math.cos(now * 0.0018) * 260;
      const eagleY = 155 + Math.sin(now * 0.0036) * 22;
      ctx.font = '40px sans-serif';
      ctx.fillText('🦅', eagleX, eagleY);

      // 4. Chugging Canyon Train along the Distant Ridge
      const trainX = ((now * 0.045 + holeNumber * 220) % 1400) - 60;
      ctx.font = '32px sans-serif';
      ctx.fillText('🚂🚃🚃', trainX, 368);
    } else if (theme === 'driving_range') {
      // 1. Active Volcano Crater Glow, Rising Smoke & Flowing Lava River
      const vx = 690;
      const vy = 130;
      const isErupting = Boolean(this.animations.milestoneEffect);
      const glowRadius = isErupting ? 68 + Math.sin(now * 0.025) * 18 : 32 + Math.sin(now * 0.008) * 6;

      const lavaGrad = ctx.createRadialGradient(vx, vy + 10, 6, vx, vy + 10, glowRadius);
      lavaGrad.addColorStop(0, '#FFF59D');
      lavaGrad.addColorStop(0.5, '#FF6D00');
      lavaGrad.addColorStop(1, 'rgba(255, 23, 68, 0)');
      ctx.fillStyle = lavaGrad;
      ctx.beginPath();
      ctx.arc(vx, vy + 10, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Animated Smoke Plume
      const drift = (now * 0.04) % 52;
      ctx.fillStyle = isErupting ? 'rgba(255, 145, 0, 0.65)' : 'rgba(255, 255, 255, 0.48)';
      ctx.beginPath();
      ctx.arc(vx, vy - drift, 18 + drift * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Animated Ball-Picker Tractor cruising across the far range!
      const tractorX = 220 + ((now * 0.035) % 840);
      ctx.font = '34px sans-serif';
      ctx.fillText('🚜', tractorX, 412 + Math.sin(now * 0.02) * 2);
    } else if (theme === 'minigolf') {
      // Rotating Carnival Ferris Wheel in the Top-Left Background
      ctx.save();
      ctx.translate(185, 255);
      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(now * 0.0012);
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 56);
        ctx.stroke();
        ctx.fillStyle = i % 2 === 0 ? '#FF4081' : '#00E5FF';
        ctx.beginPath();
        ctx.arc(0, 56, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ==========================================================================
  // DRIVING RANGE BULLSEYE TARGET CARTS (WITH INTERACTIVE TOUCH HITBOXES!)
  // ==========================================================================
  _drawDrivingRangeTargets(ctx, gameState, now) {
    ctx.save();

    // Streak Counter Badge above Volcano Crater
    ctx.fillStyle = 'rgba(20, 12, 8, 0.9)';
    ctx.strokeStyle = gameState.rangeStreak >= 3 ? '#00E676' : '#FFD600';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(520, 82, 340, 44, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFD600';
    ctx.font = 'bold 21px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 STREAK: ${gameState.rangeStreak} (3 = 🌋 ERUPTION!)`, 690, 110);

    // Draw the 3 Animated Canyon Smash Boss Targets
    const bob = Math.sin(now * 0.005) * 5;
    const pulse = 1 + Math.sin(now * 0.008) * 0.035;
    const targets = gameState.rangeTargets || [];

    targets.forEach((t, idx) => {
      const tx = t.x;
      const ty = t.y + bob;

      // Clickable hitbox in canvas coordinates so Luka can tap either the target or sign!
      t.hitBox = {
        xMin: tx - 110,
        xMax: tx + 110,
        yMin: ty - 110,
        yMax: ty + 60
      };

      // Ground Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(tx, ty + 38, 80, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // ======================================================================
      // TARGET 0: 🛸 ALIEN UFO SAUCER & TRACTOR BEAM
      // ======================================================================
      if (idx === 0) {
        // Pulsing Tractor Beam
        const beamAlpha = 0.25 + Math.sin(now * 0.006) * 0.12;
        ctx.fillStyle = `rgba(0, 229, 255, ${beamAlpha})`;
        ctx.beginPath();
        ctx.moveTo(tx - 24, ty - 2);
        ctx.lineTo(tx + 24, ty - 2);
        ctx.lineTo(tx + 65, ty + 38);
        ctx.lineTo(tx - 65, ty + 38);
        ctx.closePath();
        ctx.fill();

        // Metallic Saucer Body
        ctx.fillStyle = '#78909C';
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 68, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cockpit Dome
        ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(tx, ty - 8, 25, Math.PI, 0, false);
        ctx.fill();

        // Rotating Strobe Lights
        for (let i = 0; i < 5; i++) {
          const lAngle = now * 0.004 + (i * Math.PI * 2) / 5;
          const lx = tx + Math.cos(lAngle) * 52;
          const ly = ty + Math.sin(lAngle) * 14;
          ctx.fillStyle = i % 2 === 0 ? '#76FF03' : '#FFEA00';
          ctx.beginPath();
          ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // ======================================================================
      // TARGET 1: 🦖 ROBO T-REX CANYON BOSS
      // ======================================================================
      else if (idx === 1) {
        const jawOpen = Math.abs(Math.sin(now * 0.004)) * 12;

        // Steel Head Base
        ctx.fillStyle = '#455A64';
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(tx - 52, ty - 38, 104, 52, 14);
        ctx.fill();
        ctx.stroke();

        // Snapping Titanium Lower Jaw
        ctx.fillStyle = '#37474F';
        ctx.beginPath();
        ctx.roundRect(tx - 44, ty + 8 + jawOpen, 88, 22, 8);
        ctx.fill();
        ctx.stroke();

        // Sharp Metal Teeth
        ctx.fillStyle = '#ECEFF1';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(tx - 36 + i * 22, ty + 12);
          ctx.lineTo(tx - 26 + i * 22, ty + 12);
          ctx.lineTo(tx - 31 + i * 22, ty + 24);
          ctx.closePath();
          ctx.fill();
        }

        // Glowing Laser Visor Beam
        ctx.fillStyle = '#FF1744';
        ctx.shadowColor = '#FF1744';
        ctx.shadowBlur = 12;
        ctx.fillRect(tx - 38, ty - 22, 76, 9);
        ctx.shadowBlur = 0;
      }
      // ======================================================================
      // TARGET 2: 🏴‍☠️ PIRATE GALLEON & TNT CANNON
      // ======================================================================
      else {
        // Weathered Wooden Hull
        ctx.fillStyle = '#5D4037';
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx - 64, ty - 6);
        ctx.lineTo(tx + 64, ty - 6);
        ctx.lineTo(tx + 46, ty + 26);
        ctx.lineTo(tx - 46, ty + 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mast & Jolly Roger Skull Sail
        ctx.fillStyle = '#212121';
        ctx.fillRect(tx - 4, ty - 48, 8, 44);
        ctx.fillStyle = '#FAFAFA';
        ctx.font = '22px sans-serif';
        ctx.fillText('🏴‍☠️', tx + 2, ty - 26);

        // Red TNT Barrel with Sizzling Fuse
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.roundRect(tx + 28, ty - 18, 24, 28, 4);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('TNT', tx + 40, ty - 3);

        // Spark on fuse
        const spark = Math.sin(now * 0.03) > 0;
        ctx.fillStyle = spark ? '#FFEA00' : '#FF3D00';
        ctx.beginPath();
        ctx.arc(tx + 40, ty - 22, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ======================================================================
      // BIG TAPPABLE YARDAGE SIGNBOARD WITH BOSS ICON
      // ======================================================================
      ctx.save();
      ctx.translate(tx, ty - 68);
      ctx.scale(pulse, pulse);

      const signGradients = [
        ['#004D40', '#00B4D8'], // UFO Teal
        ['#BF360C', '#FF5722'], // Dino Flame
        ['#3E2723', '#8D6E63']  // Pirate Timber
      ];
      const signCols = signGradients[idx % signGradients.length];
      const signGrad = ctx.createLinearGradient(0, -32, 0, 32);
      signGrad.addColorStop(0, signCols[0]);
      signGrad.addColorStop(1, signCols[1]);

      ctx.fillStyle = signGrad;
      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-94, -32, 188, 64, 18);
      ctx.fill();
      ctx.stroke();

      const icons = ['🛸', '🦖', '🏴‍☠️'];
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${icons[idx]} ${t.value}`, 0, -5);

      ctx.fillStyle = '#FFEA00';
      ctx.font = 'bold 12px "Fredoka", sans-serif';
      ctx.fillText('👆 TAP TARGET', 0, 19);
      ctx.restore();
    });

    ctx.restore();
  }

  // ==========================================================================
  // WACKY MINI-GOLF TUNNELS & OBSTACLES
  // ==========================================================================
  _drawMiniGolfObstacles(ctx, obstacleType, now) {
    ctx.save();
    ctx.textAlign = 'center';

    if (obstacleType === 'windmill') {
      ctx.fillStyle = '#D32F2F';
      ctx.strokeStyle = '#FFF59D';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(595, 535);
      ctx.lineTo(612, 435);
      ctx.lineTo(668, 435);
      ctx.lineTo(685, 535);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#120024';
      ctx.beginPath();
      ctx.arc(640, 535, 22, Math.PI, 0, false);
      ctx.fill();

      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(675, 505);
      ctx.quadraticCurveTo(785, 495, 775, 455);
      ctx.stroke();
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(775, 455, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(640, 465);
      ctx.rotate(now * 0.0022);
      ctx.fillStyle = '#FFEA00';
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-8, -78, 16, 68);
        ctx.strokeRect(-8, -78, 16, 68);
      }
      ctx.restore();
    } else if (obstacleType === 'pipe_coaster') {
      const pipes = [
        { x0: 430, y0: 575, x1: 430, y1: 480, color: '#00E676', label: 'TUNNEL 1' },
        { x0: 840, y0: 530, x1: 820, y1: 440, color: '#EA80FC', label: 'TUNNEL 2' }
      ];
      for (const p of pipes) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 34;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x0, p.y0);
        ctx.lineTo(p.x1, p.y1);
        ctx.stroke();

        ctx.fillStyle = '#1A237E';
        ctx.beginPath();
        ctx.arc(p.x0, p.y0, 15, 0, Math.PI * 2);
        ctx.arc(p.x1, p.y1, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obstacleType === 'dino_jaw') {
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(605, 440, 70, 75);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#FFF9C4';
        ctx.fillRect(595, 446 + i * 18, 90, 10);
      }
      ctx.font = '72px sans-serif';
      ctx.fillText('🦖', 490, 555);
    } else if (obstacleType === 'warp_portals') {
      const pulse = Math.sin(now * 0.01) * 5;
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(435, 535, 32 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.fill();

      ctx.strokeStyle = '#FF4081';
      ctx.beginPath();
      ctx.arc(845, 455, 32 - pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 64, 129, 0.45)';
      ctx.fill();
    } else if (obstacleType === 'pinball_bumpers') {
      ctx.strokeStyle = '#FF6D00';
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(450, 570);
      ctx.lineTo(460, 475);
      ctx.stroke();

      const bumpers = [
        { x: 565, y: 455, c: '#FFEA00' },
        { x: 735, y: 465, c: '#00E5FF' },
        { x: 645, y: 485, c: '#FF4081' }
      ];
      for (const b of bumpers) {
        ctx.fillStyle = b.c;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '22px sans-serif';
        ctx.fillText('⭐', b.x, b.y + 7);
      }
    } else if (obstacleType === 'pirate_cannon') {
      ctx.fillStyle = '#00B0FF';
      ctx.fillRect(345, 450, 590, 36);
      ctx.font = '64px sans-serif';
      ctx.fillText('🏴‍☠️', 470, 565);
      ctx.fillText('💣', 510, 495);
    } else if (obstacleType === 'shark_whirlpool') {
      // 1. Ocean Lagoon Pool
      ctx.fillStyle = '#0288D1';
      ctx.beginPath();
      ctx.ellipse(640, 500, 260, 75, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Swirling Cyan Whirlpool Rings
      for (let i = 0; i < 3; i++) {
        const spin = now * 0.005 + i * (Math.PI / 1.5);
        ctx.strokeStyle = i % 2 === 0 ? '#00E5FF' : '#E0F7FA';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(640, 455, 60 - i * 16, 22 - i * 6, spin, 0, Math.PI * 1.6);
        ctx.stroke();
      }

      // 3. Chomping Great White Shark Head
      const chomp = Math.abs(Math.sin(now * 0.006)) * 14;
      ctx.font = '68px sans-serif';
      ctx.fillText('🦈', 490, 555 - chomp * 0.4);

      // Water Splashes around Shark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 4; i++) {
        const sx = 460 + i * 20;
        const sy = 560 + Math.sin(now * 0.015 + i) * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (obstacleType === 'space_rocket') {
      // 1. Yellow Launch Gantry
      ctx.strokeStyle = '#FBC02D';
      ctx.lineWidth = 5;
      ctx.strokeRect(580, 400, 120, 150);
      ctx.beginPath();
      ctx.moveTo(580, 400); ctx.lineTo(700, 550);
      ctx.moveTo(700, 400); ctx.lineTo(580, 550);
      ctx.stroke();

      // 2. Tall Space Rocket
      ctx.font = '76px sans-serif';
      ctx.fillText('🚀', 640, 470);

      // 3. Blazing Booster Thruster Flames
      const flameH = 14 + Math.sin(now * 0.03) * 8;
      ctx.fillStyle = '#FF3D00';
      ctx.beginPath();
      ctx.moveTo(625, 510);
      ctx.lineTo(655, 510);
      ctx.lineTo(640, 510 + flameH);
      ctx.closePath();
      ctx.fill();

      // 4. Entry Booster Tube
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(510, 565);
      ctx.lineTo(600, 530);
      ctx.stroke();
    } else if (obstacleType === 'ice_cream_mountain') {
      // 1. Waffle Cone Ramp
      ctx.fillStyle = '#FFE082';
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(430, 570);
      ctx.lineTo(510, 570);
      ctx.lineTo(560, 510);
      ctx.lineTo(480, 510);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. Giant 3-Scoop Mountain
      // Mint Scoop
      ctx.fillStyle = '#A7FFEB';
      ctx.beginPath();
      ctx.arc(600, 480, 32, 0, Math.PI * 2);
      ctx.fill();
      // Strawberry Scoop
      ctx.fillStyle = '#FF80AB';
      ctx.beginPath();
      ctx.arc(655, 475, 30, 0, Math.PI * 2);
      ctx.fill();
      // Vanilla Scoop on Top
      ctx.fillStyle = '#FFF9C4';
      ctx.beginPath();
      ctx.arc(628, 440, 26, 0, Math.PI * 2);
      ctx.fill();

      // Dripping Chocolate Fudge
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.roundRect(615, 436, 26, 28, 8);
      ctx.fill();

      // Big Glossy Cherry on Top
      ctx.font = '36px sans-serif';
      ctx.fillText('🍒', 628, 412);
    }

    ctx.restore();
  }

  _drawGreenAndFlag(ctx, hole, lie, now) {
    const pinX = 640 + (hole.pinOffsetX || 0);
    const pinY = 415;

    ctx.save();
    const isPutting = lie === 'green';
    const greenRx = isPutting ? 240 : 145;
    const greenRy = isPutting ? 75 : 38;
    const greenY = isPutting ? 435 : 422;

    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.ellipse(pinX, greenY, greenRx + 16, greenRy + 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#A5D6A7';
    ctx.beginPath();
    ctx.ellipse(pinX, greenY, greenRx, greenRy, 0, 0, Math.PI * 2);
    ctx.fill();

    const flagImg = this.images.flag_pin;
    const cupY = isPutting ? 412 : pinY;
    if (flagImg && flagImg.complete && flagImg.naturalWidth > 0) {
      const waveOffset = Math.sin(now * 0.006) * 2;
      ctx.drawImage(flagImg, pinX - 24 + waveOffset, cupY - 128, 84, 140);
    } else {
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.ellipse(pinX, cupY, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hole.theme !== 'minigolf') {
      ctx.fillStyle = 'rgba(25, 35, 45, 0.85)';
      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 3;
      const badgeW = 148;
      const badgeH = 38;
      ctx.beginPath();
      ctx.roundRect(pinX - badgeW / 2, cupY - 168, badgeW, badgeH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFD600';
      ctx.font = 'bold 20px "Fredoka", "Comic Sans MS", sans-serif';
      ctx.textAlign = 'center';
      const distLabel =
        lie === 'green'
          ? `${hole.puttTargetFeet} FT TO CUP`
          : lie === 'fairway'
          ? `${hole.approachTargetYards} YDS TO PIN`
          : `${hole.driveTargetYards} YDS DRIVE`;
      ctx.fillText(distLabel, pinX, cupY - 142);
    }

    ctx.restore();
  }

  _drawAimingAndBonusTargets(ctx, gameState, now) {
    if (gameState.lie === 'green' || gameState.lie === 'holed') return;

    const hole = gameState.currentHole;
    const pinX = 640 + (hole.pinOffsetX || 0) * 0.7;
    const isStep1Aim = gameState.needsAimSelection && gameState.needsAimSelection();

    ctx.save();
    gameState.aimLaneHitBoxes = [];

    // 1. Draw all 3 Fairway Aim Lanes (Left, Center, Right) so Luka can see & tap any lane!
    const lanes = [
      { id: 'left',   label: '⬅️ LEFT',   x: 640 + LANE_OFFSETS.left,   y: 500 },
      { id: 'center', label: '⬆️ CENTER', x: 640 + LANE_OFFSETS.center, y: 480 },
      { id: 'right',  label: '➡️ RIGHT',  x: 640 + LANE_OFFSETS.right,  y: 500 }
    ];

    if (!this.animations.activeShot) {
      for (const laneInfo of lanes) {
        const isSelected = gameState.aimLane === laneInfo.id;
        const lCtrlX = laneInfo.x;

        // Faint guide curves for unselected lanes during Step 1 Aim Selection; bold glowing curve for selected lane!
        if (isSelected || isStep1Aim) {
          ctx.save();
          ctx.strokeStyle = isSelected
            ? 'rgba(255, 234, 0, 0.92)'
            : 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = isSelected ? 7 : 3;
          ctx.setLineDash(isSelected ? [14, 9] : [8, 10]);
          ctx.lineDashOffset = -(now * 0.04) % 46;
          ctx.beginPath();
          ctx.moveTo(645, 645);
          ctx.quadraticCurveTo(lCtrlX, 490, pinX, 435);
          ctx.stroke();
          ctx.restore();
        }

        // Record clickable hitbox for each lane on the fairway canvas
        gameState.aimLaneHitBoxes.push({
          lane: laneInfo.id,
          x1: laneInfo.x - 78,
          x2: laneInfo.x + 78,
          y1: laneInfo.y - 68,
          y2: laneInfo.y + 72
        });

        // Draw Step-1 Aim Target Pad on the fairway
        if (isStep1Aim) {
          const pulse = Math.sin(now * 0.008) * 4;
          ctx.fillStyle = isSelected ? 'rgba(255, 214, 0, 0.38)' : 'rgba(0, 229, 255, 0.22)';
          ctx.strokeStyle = isSelected ? '#FFD600' : '#00E5FF';
          ctx.lineWidth = isSelected ? 4 : 2.5;
          ctx.beginPath();
          ctx.ellipse(laneInfo.x, laneInfo.y + 22, 54 + pulse, 22 + pulse * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0D1B2A';
          ctx.beginPath();
          ctx.roundRect(laneInfo.x - 54, laneInfo.y + 42, 108, 26, 10);
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#FFD600' : '#00E5FF';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = isSelected ? '#FFD600' : '#E0F7FA';
          ctx.font = 'bold 14px "Fredoka", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(laneInfo.label, laneInfo.x, laneInfo.y + 55);
        }
      }
    }

    // 2. Draw Floating Bonus Targets (Coins, Mystery Gifts, Rainbow Boosts)
    const bob = Math.sin(now * 0.006) * 7;
    for (const target of gameState.bonusTargets || []) {
      if (target.collected) continue;
      const isAimed = target.lane === gameState.aimLane;
      const tx = target.x;
      const ty = target.y + bob;

      target.hitBox = {
        x1: tx - 65,
        x2: tx + 65,
        y1: ty - 65,
        y2: ty + 70
      };

      ctx.fillStyle = isAimed ? 'rgba(255, 214, 0, 0.52)' : 'rgba(255, 255, 255, 0.26)';
      ctx.strokeStyle = isAimed ? '#FFD600' : 'rgba(255,255,255,0.75)';
      ctx.lineWidth = isAimed ? 4.5 : 2.5;
      ctx.beginPath();
      ctx.arc(tx, ty, isAimed ? 38 : 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = isAimed ? '42px sans-serif' : '35px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(target.icon, tx, ty);

      ctx.fillStyle = 'rgba(13, 27, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(tx - 52, ty + 32, 104, 22, 8);
      ctx.fill();

      ctx.fillStyle = isAimed ? '#FFD600' : '#FFFFFF';
      ctx.font = 'bold 13px "Fredoka", sans-serif';
      ctx.fillText(target.label, tx, ty + 43);
    }

    ctx.restore();
  }

  _drawForegroundTeeBox(ctx, lie) {
    ctx.save();
    ctx.fillStyle = lie === 'hazard' ? '#FFCC80' : '#4CAF50';
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(610, 665, 195, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (lie === 'tee' && !this.animations.activeShot) {
      ctx.fillStyle = '#FF5252';
      ctx.fillRect(641, 660, 8, 18);
    }
    ctx.restore();
  }

  _drawHazardReaction(ctx, effect, now) {
    const elapsed = now - effect.startTime;
    const pulse = Math.sin(elapsed * 0.015) * 8;

    ctx.save();
    const ringRadius = Math.min(95, 20 + (elapsed * 0.08) % 80);
    ctx.strokeStyle =
      effect.type === 'lava_vent'
        ? '#FFEA00'
        : effect.type === 'hovercar'
        ? '#00E5FF'
        : '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(effect.x, effect.y, ringRadius, ringRadius * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '46px sans-serif';
    ctx.textAlign = 'center';
    if (effect.type === 'banana_peel') {
      ctx.save();
      ctx.translate(effect.x, effect.y - 10);
      ctx.rotate(now * 0.01);
      ctx.fillText('🍌', 0, 0);
      ctx.restore();
      ctx.fillText('💫', effect.x + 28, effect.y - 28 + pulse);
    } else if (effect.type === 'mud_splat') {
      ctx.fillText('💩', effect.x, effect.y - 12 + pulse);
      ctx.fillText('💦', effect.x + 26, effect.y - 26 - Math.abs(pulse));
    } else if (effect.type === 'crab_snatch') {
      const crawl = Math.sin(now * 0.015) * 14;
      ctx.fillText('🦀', effect.x + crawl, effect.y - 14);
      ctx.fillText('🏖️', effect.x - 30, effect.y - 8);
    } else if (effect.type === 'squirrel_tree') {
      ctx.fillText('🐿️', effect.x, effect.y - 20 + pulse);
      ctx.fillText('🌰', effect.x + 24, effect.y - 6);
    } else if (effect.type === 'boomerang') {
      ctx.save();
      ctx.translate(effect.x, effect.y - 16);
      ctx.rotate(-now * 0.012);
      ctx.fillText('🪃', 0, 0);
      ctx.restore();
    } else if (effect.type === 'giant_bubble') {
      const bPulse = 28 + Math.sin(now * 0.01) * 6;
      ctx.fillStyle = 'rgba(234, 128, 252, 0.45)';
      ctx.strokeStyle = '#EA80FC';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y - 18, bPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillText('🫧', effect.x, effect.y - 16);
    } else if (effect.type === 'dino_nest') {
      ctx.fillText('🦖', effect.x - 25, effect.y - 18 + pulse);
      ctx.fillText('🥚', effect.x + 22, effect.y - 8 - pulse);
    } else if (effect.type === 'lava_vent') {
      ctx.fillText('🌋', effect.x, effect.y - 15 + pulse);
      ctx.fillText('💨', effect.x + 30, effect.y - 42 - Math.abs(pulse));
    } else if (effect.type === 'kiddie_pool') {
      ctx.fillText('💦', effect.x - 24, effect.y - 22 - Math.abs(pulse));
      ctx.fillText('🦆', effect.x + 24, effect.y - 18 + pulse);
    } else if (effect.type === 'hovercar') {
      ctx.fillText('⚡', effect.x, effect.y - 30 + pulse);
    } else if (effect.type === 'rope_bridge') {
      ctx.fillText('🌉', effect.x, effect.y - 20 + pulse);
    }

    const bx = Math.min(1110, Math.max(170, effect.x));
    const by = effect.y - 85;
    ctx.fillStyle = '#FFFDE7';
    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(bx - 110, by - 32, 220, 52, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D50000';
    ctx.font = 'bold 24px "Fredoka", "Comic Sans MS", sans-serif';
    ctx.fillText(effect.bubble, bx, by + 3);
    ctx.restore();
  }

  /**
   * Draws a dramatic Pro-Golf Shot Tracer Arc Ribbon across the sky for Course Drives!
   */
  _drawDriveShotTracer(ctx, points, yardsLabel, alpha = 1.0, now = 0, tracerStyle = 'classic_white') {
    if (!points || points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const first = points[0];
    const last = points[points.length - 1];

    // 1. Soft Ground Shadow of the Flight Path on the Fairway
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(last.x, Math.max(470, last.y + 40));
    ctx.stroke();

    // Configure Tracer Visual Palettes
    let auraColor = 'rgba(0, 229, 255, 0.42)';
    let nodeColors = ['#FFEA00', '#00E5FF'];
    let tracerGrad = ctx.createLinearGradient(first.x, first.y, last.x, last.y);

    if (tracerStyle === 'champion_gold') {
      auraColor = 'rgba(255, 143, 0, 0.52)';
      tracerGrad.addColorStop(0, '#FFE082');
      tracerGrad.addColorStop(0.35, '#FFD700');
      tracerGrad.addColorStop(0.7, '#FF8F00');
      tracerGrad.addColorStop(1, '#FFA000');
      nodeColors = ['#FFE57F', '#FFFFFF'];
    } else if (tracerStyle === 'plasma_blue') {
      auraColor = 'rgba(0, 176, 255, 0.58)';
      tracerGrad.addColorStop(0, '#00E5FF');
      tracerGrad.addColorStop(0.5, '#00B0FF');
      tracerGrad.addColorStop(1, '#2979FF');
      nodeColors = ['#80D8FF', '#FFFFFF'];
    } else if (tracerStyle === 'magma_fire') {
      auraColor = 'rgba(255, 61, 0, 0.58)';
      tracerGrad.addColorStop(0, '#FF1744');
      tracerGrad.addColorStop(0.4, '#FF6D00');
      tracerGrad.addColorStop(1, '#FFEA00');
      nodeColors = ['#FFD600', '#FF3D00'];
    } else if (tracerStyle === 'slime_green') {
      auraColor = 'rgba(0, 230, 118, 0.58)';
      tracerGrad.addColorStop(0, '#76FF03');
      tracerGrad.addColorStop(0.5, '#00E676');
      tracerGrad.addColorStop(1, '#1DE9B6');
      nodeColors = ['#B9F6CA', '#CCFF90'];
    } else if (tracerStyle === 'galaxy_purple') {
      auraColor = 'rgba(101, 31, 255, 0.58)';
      tracerGrad.addColorStop(0, '#D500F9');
      tracerGrad.addColorStop(0.5, '#651FFF');
      tracerGrad.addColorStop(1, '#3D5AFE');
      nodeColors = ['#EA80FC', '#8C9EFF'];
    } else if (tracerStyle === 'rainbow_prism') {
      auraColor = 'rgba(255, 64, 129, 0.48)';
      tracerGrad.addColorStop(0, '#FF1744');
      tracerGrad.addColorStop(0.2, '#FF9100');
      tracerGrad.addColorStop(0.4, '#FFEA00');
      tracerGrad.addColorStop(0.6, '#00E676');
      tracerGrad.addColorStop(0.8, '#00B0FF');
      tracerGrad.addColorStop(1, '#D500F9');
      nodeColors = ['#FFEA00', '#FF4081'];
    } else {
      // Classic White
      auraColor = 'rgba(0, 229, 255, 0.38)';
      tracerGrad.addColorStop(0, '#FFFFFF');
      tracerGrad.addColorStop(0.5, '#ECEFF1');
      tracerGrad.addColorStop(1, '#B0BEC5');
      nodeColors = ['#FFFFFF', '#80D8FF'];
    }

    // 2. Outer Neon Plasma Aura Ribbon
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 3. Vibrant Pro-Tracer Core Ribbon
    ctx.strokeStyle = tracerGrad;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 4. Crisp White Inner Laser Core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 5. Sparkling Stardust Nodes along the Flight Arc
    for (let i = 4; i < points.length; i += 7) {
      const pt = points[i];
      const twinkle = 3.5 + Math.sin(now * 0.02 + i) * 2;
      ctx.fillStyle = i % 2 === 0 ? nodeColors[0] : nodeColors[1];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, twinkle, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawMegaSpeedLines(ctx, zoomCurve, now) {
    ctx.save();
    const speedTime = now * 2.2;
    for (let i = 0; i < 28; i++) {
      const y = -120 + ((i * 47 + (i % 3) * 20) % 960);
      const length = 190 + ((i * 63) % 240);
      const speed = 1.3 + (i % 4) * 0.45;
      const x = 1450 - ((speedTime * speed + i * 110) % 1850);
      const alpha = 0.35 + ((i % 5) * 0.12);
      ctx.strokeStyle = i % 3 === 0
        ? `rgba(255, 234, 0, ${alpha})`
        : (i % 3 === 1 ? `rgba(0, 229, 255, ${alpha})` : `rgba(255, 255, 255, ${alpha})`);
      ctx.lineWidth = 1.8 + (i % 4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - length, y + (i % 2 === 0 ? 8 : -6));
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawBallAndTrail(ctx, now = performance.now()) {
    const shot = this.animations.activeShot;
    const lingering = this.animations.lingeringDriveArc;
    const ball = this.animations.ballPos;
    const equipped = this.storage
      ? this.storage.data.equipped
      : { ball: 'classic', tracer: 'classic_white', effect: 'sparkles', trail: 'white', ballColor: 'yellow', clubColor: 'gold' };

    ctx.save();

    // A. Draw Lingering Drive Shot Tracer Arc (after drive lands so Luka can admire the full path!)
    if (!shot && lingering && lingering.points) {
      const elapsed = now - lingering.startTime;
      const fade = Math.max(0, 1 - elapsed / lingering.duration);
      this._drawDriveShotTracer(ctx, lingering.points, lingering.driveYards, fade, now, equipped.tracer);

      // Expanding Golden Landing Ring on the fairway
      const ringR = 16 + (elapsed * 0.05) % 45;
      ctx.strokeStyle = `rgba(255, 234, 0, ${fade * 0.85})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(lingering.endX, lingering.endY, ringR, ringR * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // B. Draw Active Drive Shot Tracer Ribbon (for Course Tee Drives!)
    const isCourseDrive = shot && shot.kind === 'correct' && shot.shotType === 'drive';
    if (isCourseDrive && shot.fullArcPoints && shot.fullArcPoints.length > 1) {
      this._drawDriveShotTracer(ctx, shot.fullArcPoints, shot.currentYards, 1.0, now, equipped.tracer);
    }

    // C. Draw Special In-Flight Effect (Behind the Ball!)
    if (isCourseDrive && shot) {
      this._drawSpecialFlightEffect(ctx, ball, equipped.effect, now);
    }

    // D. Draw Standard / Cosmetic Particle Trail
    if (shot && shot.trail && shot.trail.length > 1) {
      const rainbowColors = ['#FF1744', '#FF9100', '#FFEA00', '#00E676', '#00B0FF', '#D500F9'];
      for (let i = 0; i < shot.trail.length; i++) {
        const pt = shot.trail[i];
        const alpha = (i + 1) / shot.trail.length;
        let fill = `rgba(255, 255, 255, ${alpha * 0.8})`;

        if (shot.kind === 'mishap') {
          fill = `rgba(255, 234, 0, ${alpha * 0.75})`;
        } else if (pt.turbo || equipped.trail === 'rainbow') {
          fill = rainbowColors[i % rainbowColors.length];
        } else if (equipped.trail === 'flame') {
          fill = i % 2 === 0 ? '#FF3D00' : '#FFEA00';
        } else if (equipped.trail === 'bubble') {
          fill = `rgba(128, 216, 255, ${alpha * 0.85})`;
        } else if (equipped.trail === 'lightning') {
          fill = i % 2 === 0 ? '#00E5FF' : '#EA80FC';
        }

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(3, pt.r * (pt.turbo ? 0.85 : 0.6)), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!ball.visible) {
      ctx.restore();
      return;
    }

    // E. Golf Ball Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius * 0.9, ball.radius * 1.15, ball.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // F. Glowing Halo around the Ball during Course Drives so it's super easy to track in the sky!
    if (isCourseDrive) {
      const haloPulse = ball.radius * 2.1 + Math.sin(now * 0.025) * 4;
      const haloGrad = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.4, ball.x, ball.y, haloPulse);
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      haloGrad.addColorStop(0.5, 'rgba(255, 234, 0, 0.55)');
      haloGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, haloPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // G. Draw High-Detail Custom Vector Golf Ball (Soccer, Pizza, Dino Egg, Donut, Meteor, Classic!)
    this._drawCustomGolfBall(ctx, ball, equipped, now);

    // H. Blazing DBZ Kamehameha Energy Corona when Mega Power is active!
    if (isCourseDrive && shot.isMegaPower) {
      this._drawDbzKamehamehaBall(ctx, ball, now);
    }

    // I. Live In-Flight Yardage Counter Badge following the Ball on Course Drives!
    if (isCourseDrive && shot.currentYards > 0) {
      const isMega = !!shot.isMegaPower;
      const badgeX = ball.x;
      const badgeY = Math.max(95, ball.y - ball.radius - (isMega ? 34 : 28));
      const badgeW = isMega ? 230 : 132;
      const badgeH = isMega ? 40 : 34;

      ctx.fillStyle = isMega ? 'rgba(10, 0, 30, 0.95)' : 'rgba(13, 27, 42, 0.9)';
      ctx.strokeStyle = isMega ? '#00E5FF' : '#FFEA00';
      ctx.lineWidth = isMega ? 4 : 3;
      if (isMega) {
        ctx.shadowColor = '#FFEA00';
        ctx.shadowBlur = 16;
      }
      ctx.beginPath();
      ctx.roundRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#FFEA00';
      ctx.font = isMega ? 'bold 16px "Fredoka", sans-serif' : 'bold 20px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isMega) {
        ctx.fillText(`⚡🔥 ${shot.currentYards} YDS! SUPER SAIYAN! 🔥⚡`, badgeX, badgeY);
      } else {
        ctx.fillText(`🚀 ${shot.currentYards} YDS`, badgeX, badgeY - 1);
      }
    }

    ctx.restore();
  }

  _drawSpecialFlightEffect(ctx, ball, effectId, now) {
    ctx.save();
    const bx = ball.x;
    const by = ball.y;

    if (effectId === 'sonic_rings') {
      // Supersonic Expanding Shockwave Rings pulsing backwards
      for (let i = 0; i < 3; i++) {
        const ringT = (now * 0.006 + i * 0.33) % 1;
        const ringR = 14 + ringT * 38;
        const alpha = (1 - ringT) * 0.75;
        ctx.strokeStyle = `rgba(255, 234, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(bx - ringT * 32, by + ringT * 12, ringR, ringR * 0.45, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (effectId === 'rocket_boost') {
      // Blazing Conical Rocket Afterburner Thruster Flames
      const fLen = 22 + Math.sin(now * 0.04) * 10;
      const fGrad = ctx.createLinearGradient(bx, by, bx - fLen * 1.5, by + fLen * 0.6);
      fGrad.addColorStop(0, '#FFFFFF');
      fGrad.addColorStop(0.3, '#FFEA00');
      fGrad.addColorStop(0.7, '#FF3D00');
      fGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');

      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - 6);
      ctx.lineTo(bx - 6, by + 6);
      ctx.lineTo(bx - fLen * 1.4, by + 4);
      ctx.closePath();
      ctx.fill();
    } else if (effectId === 'lightning_arc') {
      // Crackling Electric Plasma Bolts
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by - 8);
      ctx.lineTo(bx - 22, by + (Math.sin(now * 0.05) > 0 ? -16 : 14));
      ctx.lineTo(bx - 36, by - 2);
      ctx.stroke();

      ctx.strokeStyle = '#EA80FC';
      ctx.beginPath();
      ctx.moveTo(bx + 8, by + 10);
      ctx.lineTo(bx + 18, by + 22);
      ctx.lineTo(bx + 30, by + 14);
      ctx.stroke();
    } else if (effectId === 'magic_bubbles') {
      // Iridescent Soap Bubbles
      for (let i = 0; i < 4; i++) {
        const bX = bx - 18 - i * 14 + Math.sin(now * 0.01 + i) * 6;
        const bY = by + 6 + i * 8 + Math.cos(now * 0.012 + i) * 5;
        const bR = 6 + (i % 3) * 2.5;
        ctx.fillStyle = 'rgba(128, 216, 255, 0.45)';
        ctx.strokeStyle = 'rgba(255, 64, 129, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bX, bY, bR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (effectId === 'confetti_pop') {
      // Streamers of Party Confetti
      const confColors = ['#FF1744', '#00E5FF', '#FFEA00', '#D500F9', '#76FF03'];
      for (let i = 0; i < 6; i++) {
        const cx = bx - 15 - i * 12 + Math.sin(now * 0.015 + i) * 8;
        const cy = by + 10 + i * 6 + Math.cos(now * 0.02 + i) * 8;
        ctx.fillStyle = confColors[i % confColors.length];
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      }
    } else {
      // Default: Sparkling Starlight Shimmer
      for (let i = 0; i < 5; i++) {
        const starAngle = now * 0.005 + (i * Math.PI * 2) / 5;
        const sx = bx + Math.cos(starAngle) * 24;
        const sy = by + Math.sin(starAngle) * 20;
        const sSize = 3 + Math.sin(now * 0.02 + i) * 1.5;
        ctx.fillStyle = i % 2 === 0 ? '#FFEA00' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawCustomGolfBall(ctx, ball, equipped, now) {
    const ballType = equipped.ball || 'classic';
    const r = Math.max(16, ball.radius);

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.spinAngle || 0);

    // ========================================================================
    // 1. SOCCER KICK BALL ⚽
    // ========================================================================
    if (ballType === 'soccer') {
      // White Sphere Base
      const sGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      sGrad.addColorStop(0, '#FFFFFF');
      sGrad.addColorStop(0.75, '#EEEEEE');
      sGrad.addColorStop(1, '#9E9E9E');

      ctx.fillStyle = sGrad;
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center Black Pentagon
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = Math.cos(angle) * (r * 0.42);
        const py = Math.sin(angle) * (r * 0.42);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Outer Stitching Lines to Edge
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const innerX = Math.cos(angle) * (r * 0.42);
        const innerY = Math.sin(angle) * (r * 0.42);
        const outerX = Math.cos(angle) * (r * 0.92);
        const outerY = Math.sin(angle) * (r * 0.92);
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
      }
    }
    // ========================================================================
    // 2. PEPPERONI PIZZA SLICE / PIE 🍕
    // ========================================================================
    else if (ballType === 'pizza') {
      // Golden Baked Crust Rim
      ctx.fillStyle = '#FFB300';
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Marinara Sauce & Cheese
      ctx.fillStyle = '#FFEE58';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.fill();

      // Savory Red Pepperoni Rounds
      const peps = [
        { x: -r * 0.32, y: -r * 0.28 },
        { x: r * 0.35,  y: -r * 0.22 },
        { x: 0,          y: r * 0.34 },
        { x: 0,          y: -r * 0.05 }
      ];
      ctx.fillStyle = '#C62828';
      ctx.strokeStyle = '#8E0000';
      ctx.lineWidth = 1.2;
      for (const p of peps) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Chopped Oregano Herb Flecks
      ctx.fillStyle = '#2E7D32';
      for (let i = 0; i < 6; i++) {
        const ox = Math.sin(i * 1.7) * (r * 0.6);
        const oy = Math.cos(i * 2.3) * (r * 0.6);
        ctx.fillRect(ox - 1, oy - 1, 2.5, 2.5);
      }
    }
    // ========================================================================
    // 3. SPOTTED DINO EGG 🥚
    // ========================================================================
    else if (ballType === 'dino_egg') {
      const eGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      eGrad.addColorStop(0, '#B2DFDB');
      eGrad.addColorStop(0.5, '#4DB6AC');
      eGrad.addColorStop(1, '#00695C');

      ctx.fillStyle = eGrad;
      ctx.strokeStyle = '#004D40';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Prehistoric Spots
      const spots = [
        { x: -r * 0.32, y: -r * 0.35, r: r * 0.22 },
        { x: r * 0.34,  y: 0,          r: r * 0.26 },
        { x: -r * 0.2,  y: r * 0.42,  r: r * 0.24 }
      ];
      ctx.fillStyle = '#004D40';
      for (const s of spots) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden Hatching Crack
      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.2);
      ctx.lineTo(r * 0.15, 0);
      ctx.lineTo(-r * 0.05, r * 0.2);
      ctx.stroke();
    }
    // ========================================================================
    // 4. SPRINKLE DONUT 🍩
    // ========================================================================
    else if (ballType === 'donut') {
      // Golden Baked Pastry
      ctx.fillStyle = '#FFA726';
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Strawberry Pink Icing
      ctx.fillStyle = '#FF4081';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      ctx.fill();

      // Hollow Doughnut Center
      ctx.fillStyle = '#2E7D32'; // Fairway turf hole
      ctx.strokeStyle = '#FFA726';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Multi-Colored Rainbow Sprinkles
      const sprinkleCols = ['#00E5FF', '#FFEA00', '#FFFFFF', '#76FF03', '#D500F9'];
      for (let i = 0; i < 7; i++) {
        const sAngle = (i * Math.PI * 2) / 7;
        const sx = Math.cos(sAngle) * (r * 0.6);
        const sy = Math.sin(sAngle) * (r * 0.6);
        ctx.fillStyle = sprinkleCols[i % sprinkleCols.length];
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sAngle + 0.5);
        ctx.fillRect(-2, -5, 4, 10);
        ctx.restore();
      }
    }
    // ========================================================================
    // 5. COSMIC FIREBALL METEOR ☄️
    // ========================================================================
    else if (ballType === 'meteor') {
      // Fiery Magma Aura
      const mPulse = r * 1.35 + Math.sin(now * 0.02) * 3;
      const mGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, mPulse);
      mGrad.addColorStop(0, '#FFEA00');
      mGrad.addColorStop(0.4, '#FF3D00');
      mGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(0, 0, mPulse, 0, Math.PI * 2);
      ctx.fill();

      // Charcoal Asteroid Base
      ctx.fillStyle = '#212121';
      ctx.strokeStyle = '#FF3D00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Magma Fissures
      ctx.strokeStyle = '#FFEA00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.2);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.5, r * 0.4);
      ctx.moveTo(-r * 0.1, -r * 0.6);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.4, -r * 0.5);
      ctx.stroke();
    }
    // ========================================================================
    // 6. CLASSIC 3D DIMPLED GOLF BALL (TINTED BY MINIGOLF BALL COLOR) ⚪
    // ========================================================================
    else {
      const colorObj =
        MINIGOLF_BALL_COLORS.find(c => c.id === equipped.ballColor) ||
        MINIGOLF_BALL_COLORS[0];

      const ballGrad = ctx.createRadialGradient(-r * 0.32, -r * 0.32, r * 0.15, 0, 0, r);
      ballGrad.addColorStop(0, '#FFFFFF');
      ballGrad.addColorStop(0.35, colorObj.hex);
      ballGrad.addColorStop(1, colorObj.stroke);

      ctx.fillStyle = ballGrad;
      ctx.strokeStyle = '#102027';
      ctx.lineWidth = Math.max(1.8, r * 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shaded Dimple Dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.28, Math.max(1.5, r * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawGolferAndPet(ctx, now) {
    const pose = this.animations.golferPose || 'idle';
    const img = this.images[`golfer_${pose}`] || this.images.golfer_idle;
    const equipped = this.storage
      ? this.storage.data.equipped
      : { pet: 'puppy', clubColor: 'gold' };

    ctx.save();
    const breathY = pose === 'idle' ? Math.sin(now * 0.004) * 3 : 0;
    const jumpY = pose === 'celebrate' ? -Math.abs(Math.sin(now * 0.01)) * 22 : 0;
    const baseY = 410 + breathY + jumpY;

    // Draw Dragon Ball Z Super Saiyan Golden Flame Aura around Luka!
    const isMega = this.animations.isMegaActive || (this.animations.activeShot && this.animations.activeShot.isMegaPower);
    if (isMega) {
      this._drawDbzSuperSaiyanAura(ctx, 527, baseY + 140, now, pose === 'backswing');
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 420, baseY, 215, 285);
    }

    // Draw Luka's Custom-Colored Golf Club Overlay so his chosen Club Color shines!
    const clubMeta =
      MINIGOLF_CLUB_COLORS.find(c => c.id === equipped.clubColor) ||
      MINIGOLF_CLUB_COLORS[0];

    ctx.save();
    ctx.lineCap = 'round';
    let handX = 562;
    let handY = baseY + 152;
    let headX = 626;
    let headY = baseY + 244;

    if (pose === 'backswing') {
      handX = 505;
      handY = baseY + 95;
      headX = 432;
      headY = baseY + 42;
    } else if (pose === 'impact') {
      handX = 568;
      handY = baseY + 125;
      headX = 648;
      headY = baseY + 62;
    } else if (pose === 'celebrate') {
      handX = 582;
      handY = baseY + 78;
      headX = 625;
      headY = baseY + 15;
    }

    // Club Shaft
    ctx.strokeStyle = clubMeta.stroke;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.strokeStyle = clubMeta.shaft;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    // Colored Club Head
    ctx.fillStyle = clubMeta.hex;
    ctx.strokeStyle = '#102027';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(headX + 6, headY, 16, 9, pose === 'backswing' ? -0.5 : 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const equippedPet = equipped.pet || 'puppy';
    const petEmoji = PET_ICONS[equippedPet] || '🐶';
    const petBounce =
      pose === 'celebrate' || pose === 'impact'
        ? -Math.abs(Math.sin(now * 0.014)) * 18
        : Math.sin(now * 0.005) * 4;

    ctx.font = '54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(petEmoji, 725, 655 + petBounce);

    if (pose === 'celebrate') {
      ctx.font = '24px sans-serif';
      ctx.fillText('❤️', 725, 602 + petBounce);
    } else if (pose === 'mishap') {
      ctx.font = '24px sans-serif';
      ctx.fillText('🙈', 725, 602);
    }

    ctx.restore();
  }

  _drawCelebrations(ctx, now) {
    // 1. Confetti Particles
    for (const p of this.animations.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      ctx.restore();
    }

    // 2. Erupting Molten Lava Bombs from the Volcano Crater!
    for (const lb of this.animations.lavaBombs) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, lb.life);
      ctx.fillStyle = lb.color;
      ctx.beginPath();
      ctx.arc(lb.x, lb.y, lb.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = lb.coreColor;
      ctx.beginPath();
      ctx.arc(lb.x, lb.y, lb.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Radial 360-Degree Glowing Firework Sparks!
    for (const sp of this.animations.fireworkSparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life);
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = sp.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sp.prevX, sp.prevY);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Milestone Volcano Eruption Sky Show & Center Banner!
    if (this.animations.milestoneEffect) {
      const mElapsed = now - this.animations.milestoneEffect.startTime;
      ctx.save();

      // Glowing Volcano Magma Beam shooting up from crater (690, 140)
      const beamPulse = 26 + Math.sin(mElapsed * 0.03) * 10;
      const beamGrad = ctx.createLinearGradient(690, 60, 690, 260);
      beamGrad.addColorStop(0, 'rgba(255, 234, 0, 0)');
      beamGrad.addColorStop(0.5, 'rgba(255, 145, 0, 0.75)');
      beamGrad.addColorStop(1, 'rgba(255, 23, 68, 0.9)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.ellipse(690, 130, beamPulse, 95, 0, 0, Math.PI * 2);
      ctx.fill();

      const burstPositions = [
        { x: 310, y: 225, icon: '🎆' },
        { x: 690, y: 175, icon: '🌋' },
        { x: 970, y: 225, icon: '🎇' },
        { x: 480, y: 195, icon: '🎇' },
        { x: 850, y: 195, icon: '🎆' }
      ];
      for (let i = 0; i < burstPositions.length; i++) {
        const bp = burstPositions[i];
        const scale = 1.1 + Math.sin(mElapsed * 0.015 + i) * 0.3;
        ctx.save();
        ctx.translate(bp.x, bp.y);
        ctx.scale(scale, scale);
        ctx.font = '78px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bp.icon, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    // 5. Floating Bonus Text Popups
    for (const ft of this.animations.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = 'bold 32px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 7;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    const cel = this.animations.celebration;
    if (!cel) return;

    const elapsed = now - cel.startTime;
    ctx.save();

    if (cel.type === 'eagle') {
      const eagleX = 180 + ((elapsed * 0.35) % 920);
      const eagleY = 185 + Math.sin(elapsed * 0.008) * 24;
      ctx.font = '76px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦅', eagleX, eagleY);
      ctx.font = '28px sans-serif';
      ctx.fillText('✨', eagleX - 55, eagleY + 10);
      ctx.fillText('✨', eagleX + 55, eagleY - 10);
    } else if (cel.type === 'birdie') {
      const bob = Math.sin(elapsed * 0.012) * 5;
      ctx.font = '46px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🐦', cel.pinX + 6, cel.pinY - 128 + bob);
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#FFEA00';
      ctx.fillText('♪ ♫', cel.pinX + 48, cel.pinY - 145 + bob);
    } else if (cel.type === 'albatross') {
      const albX = 140 + ((elapsed * 0.4) % 1000);
      const albY = 170 + Math.sin(elapsed * 0.007) * 26;
      ctx.font = '84px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦤', albX, albY);
      ctx.font = '32px sans-serif';
      ctx.fillText('✨🌈✨', albX, albY + 28);
    } else if (cel.type === 'par') {
      const scale = 1 + Math.sin(elapsed * 0.01) * 0.12;
      ctx.translate(640, 260);
      ctx.scale(scale, scale);
      ctx.font = '78px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🙌', 0, 0);
    } else if (cel.type === 'hole_in_one') {
      const fwX = 340 + ((Math.floor(elapsed / 400) * 290) % 600);
      const fwY = 180 + ((Math.floor(elapsed / 400) * 70) % 140);
      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎆', fwX, fwY);
      ctx.fillText('🎇', 1280 - fwX, fwY + 20);
    } else if (cel.type === 'bogey' || cel.type === 'double_bogey' || cel.type === 'triple_bogey') {
      const bScale = 1 + Math.sin(elapsed * 0.008) * 0.08;
      ctx.translate(640, 260);
      ctx.scale(bScale, bScale);
      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👍', 0, 0);
    }

    ctx.restore();
  }

  _drawDbzSuperSaiyanAura(ctx, cx, cy, now, isBackswing) {
    ctx.save();

    // 1. Ground Energy Impact/Crackle Disc under Luka's feet
    const feetY = cy + 130;
    const discPulse = 1.0 + Math.sin(now * 0.02) * 0.15;
    const groundGrad = ctx.createRadialGradient(cx, feetY, 15, cx, feetY, 95 * discPulse);
    groundGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    groundGrad.addColorStop(0.3, 'rgba(255, 234, 0, 0.85)');
    groundGrad.addColorStop(0.7, 'rgba(255, 109, 0, 0.45)');
    groundGrad.addColorStop(1, 'rgba(255, 214, 0, 0)');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.ellipse(cx, feetY, 100 * discPulse, 32 * discPulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rising Energy Flame Spikes (Super Saiyan Aura Tongues)
    const numSpikes = 16;
    const auraIntensity = isBackswing ? 1.3 : 1.0;
    for (let i = 0; i < numSpikes; i++) {
      const angle = -Math.PI * 0.85 + (i / (numSpikes - 1)) * Math.PI * 0.7;
      const baseDist = 80 + (i % 3) * 15;
      const spikeLen = (120 + Math.sin(now * 0.018 + i * 1.7) * 45) * auraIntensity;
      const tipX = cx + Math.cos(angle) * (baseDist + spikeLen);
      const tipY = cy - 40 + Math.sin(angle) * (baseDist + spikeLen) - Math.abs(Math.sin(now * 0.015 + i)) * 30;

      const flameGrad = ctx.createLinearGradient(cx, cy, tipX, tipY);
      flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      flameGrad.addColorStop(0.35, 'rgba(255, 234, 0, 0.85)');
      flameGrad.addColorStop(0.75, 'rgba(255, 87, 34, 0.6)');
      flameGrad.addColorStop(1, 'rgba(255, 23, 68, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      const p1x = cx + Math.cos(angle - 0.16) * 45;
      const p1y = cy + Math.sin(angle - 0.16) * 45;
      const p2x = cx + Math.cos(angle + 0.16) * 45;
      const p2y = cy + Math.sin(angle + 0.16) * 45;
      ctx.moveTo(p1x, p1y);
      ctx.quadraticCurveTo(cx + Math.cos(angle) * (baseDist * 0.6), cy + Math.sin(angle) * (baseDist * 0.6), tipX, tipY);
      ctx.quadraticCurveTo(p2x, p2y, p2x, p2y);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Crackling Electric Cyan & White Lightning Sparks
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12;
    for (let b = 0; b < 5; b++) {
      const seed = now * 0.007 + b * 2.3;
      const startAngle = (b / 5) * Math.PI * 2 + Math.sin(seed) * 0.4;
      let lx = cx + Math.cos(startAngle) * (60 + (b % 2) * 20);
      let ly = cy + Math.sin(startAngle) * (70 + (b % 3) * 15);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      for (let seg = 0; seg < 4; seg++) {
        lx += (Math.sin(seed * 3 + seg * 2.1) - 0.2) * 28;
        ly -= 18 + Math.cos(seed * 4 + seg * 1.7) * 14;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawDbzKamehamehaBall(ctx, ball, now) {
    ctx.save();
    const bx = ball.x;
    const by = ball.y;
    const br = Math.max(12, ball.radius * 1.5);

    // 1. Fiery Golden Super Saiyan Corona with dancing flame spires
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + now * 0.01;
      const spireLen = br * (1.6 + Math.sin(now * 0.03 + i * 2) * 0.45);
      const sx = bx + Math.cos(angle) * spireLen;
      const sy = by + Math.sin(angle) * spireLen;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 214, 0, 0.75)' : 'rgba(255, 87, 34, 0.65)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    // 2. Multi-layer Energy Orb Glow
    const orbGrad = ctx.createRadialGradient(bx, by, br * 0.2, bx, by, br * 1.8);
    orbGrad.addColorStop(0, '#FFFFFF');
    orbGrad.addColorStop(0.25, '#00E5FF');
    orbGrad.addColorStop(0.6, '#FFEA00');
    orbGrad.addColorStop(1, 'rgba(255, 87, 34, 0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(bx, by, br * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 3. Crackling Cyan Lightning Sparks Arcing around the Core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 4; k++) {
      const baseAng = (k / 4) * Math.PI * 2 + now * 0.02;
      let lx = bx + Math.cos(baseAng) * (br * 0.8);
      let ly = by + Math.sin(baseAng) * (br * 0.8);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      for (let s = 0; s < 3; s++) {
        lx += (Math.sin(now * 0.02 + s * 3 + k) - 0.2) * 16;
        ly += (Math.cos(now * 0.025 + s * 2 + k) - 0.2) * 16;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
