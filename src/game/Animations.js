/**
 * Animations.js
 * Deterministic state-driven animations for Luka's Golf Adventure:
 *   1. 18-Hole Golf Course shots, curved aiming lanes, mid-flight Turbo Boost, and slapstick hazards
 *   2. Canyon Volcano Driving Range target blasts, Radial Firework Explosions & Volcano Lava Eruptions
 *   3. Wacky Mini-Golf multi-stage Tunnel & Obstacle courses (Windmill, 3-Pipe Coaster, Dino Jaw, Warp Portals, Pinball, Pirate Cannon)
 */

const LANE_OFFSETS = {
  left: -175,
  center: 0,
  right: 175
};

export class AnimationController {
  constructor(audio) {
    this.audio = audio;
    this.golferPose = 'idle';
    this.activeShot = null;
    this.hazardEffect = null;
    this.celebration = null;
    this.milestoneEffect = null; // Volcano Eruption + Grand Finale Fireworks
    this.particles = [];
    this.fireworkSparks = [];    // Radial glowing firework sparks
    this.lavaBombs = [];         // Erupting molten lava blobs from the volcano crater
    this.floatingTexts = [];
    this.lingeringDriveArc = null; // Keeps the glowing Shot Tracer Arc visible after a drive lands!
    this.ballPos = { x: 640, y: 650, radius: 15, visible: true, spinAngle: 0 };
  }

  resetForLie(lie, pinOffsetX = 0) {
    this.activeShot = null;
    this.hazardEffect = null;
    this.celebration = null;
    this.lingeringDriveArc = null;
    this.golferPose = 'idle';

    if (lie === 'tee') {
      this.ballPos = { x: 645, y: 655, radius: 15, visible: true, spinAngle: 0 };
    } else if (lie === 'fairway' || lie === 'hazard') {
      this.ballPos = { x: 645, y: 635, radius: 13, visible: true, spinAngle: 0 };
    } else if (lie === 'green') {
      this.ballPos = { x: 640, y: 650, radius: 13, visible: true, spinAngle: 0 };
    } else if (lie === 'holed') {
      this.ballPos = { x: 640 + pinOffsetX, y: 412, radius: 5, visible: false, spinAngle: 0 };
    }
  }

  spawnFloatingText(text, x, y, color = '#FFD600') {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      life: 1.0
    });
  }

  /**
   * Spawns a radial 360-degree firework explosion at (cx, cy) in the visible sky!
   */
  spawnFireworkBurst(cx, cy, playSound = true) {
    if (playSound) {
      this.audio.playSfx('firework_burst');
    }
    const palettes = [
      ['#FFD600', '#FFEA00', '#FF9100', '#FFFFFF'],
      ['#00E5FF', '#18FFFF', '#EA80FC', '#FFFFFF'],
      ['#FF4081', '#FF80AB', '#FFD600', '#FFFFFF'],
      ['#00E676', '#76FF03', '#FFEA00', '#FFFFFF']
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const count = 34;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.12;
      const speed = 3.2 + Math.random() * 5.8;
      this.fireworkSparks.push({
        x: cx,
        y: cy,
        prevX: cx,
        prevY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        color: palette[i % palette.length],
        size: 5 + Math.random() * 5,
        life: 1.0
      });
    }
  }

  /**
   * Spawns molten glowing lava bombs shooting out of the Volcano Crater at (vx, vy)!
   */
  spawnVolcanoLavaEruption(vx = 690, vy = 135, count = 26) {
    const lavaColors = ['#FF1744', '#FF3D00', '#FF6D00', '#FF9100', '#FFEA00'];
    for (let i = 0; i < count; i++) {
      const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.35;
      const speed = 6 + Math.random() * 8.5;
      this.lavaBombs.push({
        x: vx + (Math.random() - 0.5) * 32,
        y: vy,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed - 2,
        radius: 8 + Math.random() * 11,
        color: lavaColors[i % lavaColors.length],
        coreColor: '#FFF59D',
        life: 1.0
      });
    }
  }

  // ==========================================================================
  // 18-HOLE COURSE CORRECT & MISHAP SHOTS
  // ==========================================================================
  playCorrectShot(shotType, pinOffsetX = 0, aimLane = 'center', hitBonus = null, onComplete = null, driveYards = 300, isMegaPower = false) {
    this.hazardEffect = null;
    this.lingeringDriveArc = null;
    const startX = this.ballPos.x;
    const startY = this.ballPos.y;

    if (isMegaPower) {
      this.audio.playSfx('dbz_charge');
    }

    // Emphasize Tee Drives with a soaring 3.2-second high-altitude flight & persistent Shot Tracer!
    let endX = 640 + (LANE_OFFSETS[aimLane] || 0) * 0.45 + pinOffsetX * 0.45;
    let endY = 472;
    let endRadius = 8;
    let peakHeight = isMegaPower ? 365 : 290;
    let duration = isMegaPower ? 3800 : 3200;
    const resolvedYards = isMegaPower
      ? Math.max(540, (driveYards || 300) + 240 + Math.floor(Math.random() * 80))
      : driveYards || 300;

    if (shotType === 'approach') {
      endX = 640 + pinOffsetX * 0.85;
      endY = 432;
      endRadius = 6.5;
      peakHeight = 185;
      duration = 1950;
    } else if (shotType === 'putt') {
      endX = 640 + pinOffsetX;
      endY = 412;
      endRadius = 5;
      peakHeight = 12;
      duration = 1350;
    }

    const ctrlX = shotType === 'putt' ? (startX + endX) / 2 : 640 + (LANE_OFFSETS[aimLane] || 0) * 1.15;

    this.golferPose = 'backswing';
    this.activeShot = {
      kind: 'correct',
      shotType,
      aimLane,
      hitBonus,
      isMegaPower: !!isMegaPower,
      driveYards: resolvedYards,
      currentYards: 0,
      flightT: 0,
      apexTriggered: false,
      landingBounceTriggered: false,
      bonusTriggered: false,
      turboActivated: false,
      startTime: performance.now(),
      duration,
      startX,
      startY,
      ctrlX,
      startRadius: this.ballPos.radius,
      endX,
      endY,
      endRadius,
      peakHeight,
      swingTriggered: false,
      trail: [],
      fullArcPoints: [{ x: startX, y: startY }],
      onComplete
    };
  }

  // ==========================================================================
  // DRIVING RANGE TARGET BLAST & VOLCANO STREAK FIREWORKS
  // ==========================================================================
  playDrivingRangeShot(isCorrect, targetX, targetY, isMilestone, streakCount, onComplete) {
    this.hazardEffect = null;
    const startX = this.ballPos.x;
    const startY = this.ballPos.y;

    this.golferPose = 'backswing';

    if (isCorrect) {
      this.activeShot = {
        kind: 'driving_range_hit',
        startTime: performance.now(),
        duration: 1550,
        startX,
        startY,
        ctrlX: (startX + targetX) / 2,
        startRadius: 15,
        endX: targetX,
        endY: targetY,
        endRadius: 7,
        peakHeight: 225,
        isMilestone,
        streakCount,
        turboActivated: false,
        swingTriggered: false,
        trail: [],
        onComplete
      };
    } else {
      // Slapstick Driving Range Mishap: Bounces off the range tractor / sign!
      this.activeShot = {
        kind: 'mishap',
        mishapType: 'hovercar',
        startTime: performance.now(),
        duration: 1500,
        startX,
        startY,
        bounceX: targetX,
        bounceY: targetY,
        endX: 640,
        endY: 590,
        sfx: 'hovercar',
        bubble: 'BONK! TRY AGAIN! 🚜',
        swingTriggered: false,
        impactTriggered: false,
        trail: [],
        onComplete
      };
    }
  }

  /**
   * Triggers a full-screen Volcano Eruption + Multi-Wave Firework Show!
   */
  triggerMilestoneFireworks(streakCount) {
    this.audio.playSfx('volcano_eruption');
    this.milestoneEffect = {
      streakCount,
      startTime: performance.now(),
      duration: 3200
    };

    this.spawnFloatingText(
      `🌋 VOLCANO ERUPTION! 🔥 ${streakCount} IN A ROW! +40 🪙`,
      640,
      275,
      '#FFEA00'
    );

    // Wave 1: Immediate Volcano Lava Eruption + Sky Fireworks
    this.spawnVolcanoLavaEruption(690, 138, 28);
    this.spawnFireworkBurst(380, 240, true);
    this.spawnFireworkBurst(920, 240, false);
    this._spawnConfettiAt(640, 260, 80, 550);

    // Staggered Multi-Wave Firework Show & Lava Fountains across 2.2 seconds!
    const waveTimes = [
      { delay: 420,  fx: 520, fy: 210, lava: true },
      { delay: 840,  fx: 780, fy: 220, lava: false },
      { delay: 1260, fx: 340, fy: 270, lava: true },
      { delay: 1680, fx: 950, fy: 260, lava: false },
      { delay: 2050, fx: 640, fy: 200, lava: true }
    ];

    waveTimes.forEach(w => {
      setTimeout(() => {
        if (!this.milestoneEffect) return;
        this.spawnFireworkBurst(w.fx, w.fy, true);
        if (w.lava) {
          this.spawnVolcanoLavaEruption(690, 138, 18);
        }
      }, w.delay);
    });
  }

  // ==========================================================================
  // WACKY MINI-GOLF MULTI-STAGE TUNNEL & OBSTACLE ANIMATIONS
  // ==========================================================================
  playMiniGolfObstacleShot(obstacleType, isCorrect, isMilestone, streakCount, onComplete) {
    this.hazardEffect = null;
    this.golferPose = 'backswing';

    const segments = this._buildMiniGolfSegments(obstacleType, isCorrect);
    this.activeShot = {
      kind: 'minigolf_segments',
      obstacleType,
      isCorrect,
      isMilestone,
      streakCount,
      segments,
      currentSegIdx: -1,
      startTime: performance.now(),
      duration: isCorrect ? 2450 : 1600,
      swingTriggered: false,
      trail: [],
      onComplete
    };
  }

  _buildMiniGolfSegments(obstacleType, isCorrect) {
    const start = { x: 640, y: 650 };
    const cup   = { x: 640, y: 408 };

    if (!isCorrect) {
      const rejectMap = {
        windmill:        { hitX: 640, hitY: 525, endX: 520, endY: 625, msg: 'BONK! WINDMILL BLADE! 🌀' },
        pipe_coaster:    { hitX: 430, hitY: 565, endX: 350, endY: 620, msg: 'HONK! WRONG PIPE! 🎺' },
        dino_jaw:        { hitX: 495, hitY: 545, endX: 590, endY: 630, msg: 'BURP! DINO JAW! 🦖' },
        warp_portals:    { hitX: 435, hitY: 535, endX: 540, endY: 625, msg: 'ZAP! PORTAL RIM! ⚡' },
        pinball_bumpers: { hitX: 550, hitY: 510, endX: 690, endY: 625, msg: 'BOING! PINBALL FLIPPER! 🔔' },
        pirate_cannon:   { hitX: 475, hitY: 555, endX: 575, endY: 630, msg: 'POOF! CANNON SMOKE! 🏴‍☠️' },
        shark_whirlpool:    { hitX: 490, hitY: 555, endX: 580, endY: 630, msg: 'CHOMP! SHARK TEETH! 🦈' },
        space_rocket:       { hitX: 510, hitY: 555, endX: 380, endY: 625, msg: 'CLANG! LAUNCH PAD! 🚀' },
        ice_cream_mountain: { hitX: 470, hitY: 560, endX: 560, endY: 630, msg: 'SPLAT! CHERRY BOUNCE! 🍒' }
      };
      const r = rejectMap[obstacleType] || rejectMap.windmill;
      return [
        { x0: start.x, y0: start.y, x1: r.hitX, y1: r.hitY, hidden: false, arc: 0, sfx: 'putt' },
        { x0: r.hitX,  y0: r.hitY,  x1: r.endX, y1: r.endY, hidden: false, arc: 35, sfx: 'boing', popup: r.msg }
      ];
    }

    switch (obstacleType) {
      case 'windmill':
        return [
          { x0: start.x, y0: start.y, x1: 640, y1: 530, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 640, y0: 530, x1: 775, y1: 455, hidden: true,  arc: 0, sfx: 'count_step', popup: '🌀 IN THE WINDMILL TUNNEL!' },
          { x0: 775, y0: 455, x1: cup.x, y1: cup.y, hidden: false, arc: 0, sfx: 'merge', popup: '✨ OUT THE CHUTE!' }
        ];

      case 'pipe_coaster':
        return [
          { x0: start.x, y0: start.y, x1: 430, y1: 575, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 430, y0: 575, x1: 430, y1: 480, hidden: true,  arc: 0, sfx: 'count_step', popup: '🟢 TUNNEL #1!' },
          { x0: 430, y0: 480, x1: 840, y1: 530, hidden: false, arc: 20, sfx: 'pop' },
          { x0: 840, y0: 530, x1: 820, y1: 440, hidden: true,  arc: 0, sfx: 'merge', popup: '🟣 TUNNEL #2 -> 🟡 EXIT #3!' },
          { x0: 820, y0: 440, x1: cup.x, y1: cup.y, hidden: false, arc: 0, sfx: 'coin' }
        ];

      case 'dino_jaw':
        return [
          { x0: start.x, y0: start.y, x1: 490, y1: 555, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 490, y0: 555, x1: 640, y1: 495, hidden: true,  arc: 0, sfx: 'dino', popup: '🦖 IN THE DINO MOUTH TUNNEL!' },
          { x0: 640, y0: 495, x1: cup.x, y1: cup.y, hidden: false, arc: 28, sfx: 'merge', popup: '🎵 BONE XYLOPHONE BRIDGE!' }
        ];

      case 'warp_portals':
        return [
          { x0: start.x, y0: start.y, x1: 435, y1: 535, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 435, y0: 535, x1: 845, y1: 455, hidden: true,  arc: 0, sfx: 'turbo', popup: '⚡ WARP TUNNEL TELEPORT!' },
          { x0: 845, y0: 455, x1: cup.x, y1: cup.y, hidden: false, arc: 0, sfx: 'coin', popup: '🌸 PINK PORTAL EXIT!' }
        ];

      case 'pinball_bumpers':
        return [
          { x0: start.x, y0: start.y, x1: 450, y1: 570, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 450, y0: 570, x1: 460, y1: 475, hidden: true,  arc: 0, sfx: 'count_step', popup: '🌋 LAVA TUBE TUNNEL!' },
          { x0: 460, y0: 475, x1: 565, y1: 455, hidden: false, arc: 15, sfx: 'pop', popup: '🔔 DING! BUMPER 1!' },
          { x0: 565, y0: 455, x1: 735, y1: 465, hidden: false, arc: 15, sfx: 'coin', popup: '🔔 DING! BUMPER 2!' },
          { x0: 735, y0: 465, x1: cup.x, y1: cup.y, hidden: false, arc: 10, sfx: 'merge', popup: '🔔 JACKPOT!' }
        ];

      case 'pirate_cannon':
        return [
          { x0: start.x, y0: start.y, x1: 470, y1: 565, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 470, y0: 565, x1: 510, y1: 485, hidden: true,  arc: 0, sfx: 'count_step', popup: '🏴‍☠️ TREASURE CAVE TUNNEL!' },
          { x0: 510, y0: 485, x1: cup.x, y1: cup.y, hidden: false, arc: 135, sfx: 'siren', popup: '💥 PIRATE CANNON BLAST!' }
        ];

      case 'shark_whirlpool':
        return [
          { x0: start.x, y0: start.y, x1: 490, y1: 560, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 490, y0: 560, x1: 720, y1: 495, hidden: true,  arc: 0, sfx: 'splash', popup: '🦈 IN SHARK BELLY TUNNEL!' },
          { x0: 720, y0: 495, x1: cup.x, y1: cup.y, hidden: false, arc: 40, sfx: 'merge', popup: '🌀 WHIRLPOOL PIPE IN THE HOLE!' }
        ];

      case 'space_rocket':
        return [
          { x0: start.x, y0: start.y, x1: 510, y1: 560, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 510, y0: 560, x1: 640, y1: 310, hidden: true,  arc: 0, sfx: 'turbo', popup: '🚀 BLAST OFF TO THE STARS!' },
          { x0: 640, y0: 310, x1: cup.x, y1: cup.y, hidden: false, arc: 155, sfx: 'cheer', popup: '🌟 TOUCHDOWN IN THE CUP!' }
        ];

      case 'ice_cream_mountain':
      default:
        return [
          { x0: start.x, y0: start.y, x1: 470, y1: 565, hidden: false, arc: 0, sfx: 'putt' },
          { x0: 470, y0: 565, x1: 610, y1: 485, hidden: true,  arc: 0, sfx: 'count_step', popup: '🍦 WAFFLE CONE SLIDE!' },
          { x0: 610, y0: 485, x1: cup.x, y1: cup.y, hidden: false, arc: 25, sfx: 'coin', popup: '🍒 CHERRY CHUTE HOLE-IN-ONE!' }
        ];
    }
  }

  triggerTurboBoost() {
    if (!this.activeShot || this.activeShot.turboActivated) {
      return false;
    }
    this.activeShot.turboActivated = true;
    this.audio.playSfx('turbo');
    this.spawnFloatingText('⚡ TURBO BOOST! +5 🪙', this.ballPos.x, this.ballPos.y - 30, '#00E5FF');
    this._spawnConfettiAt(this.ballPos.x, this.ballPos.y, 28);
    return true;
  }

  playMishapShot(mishapType, pinOffsetX = 0, onComplete) {
    const startX = this.ballPos.x;
    const startY = this.ballPos.y;

    const hazardCoords = {
      banana_peel:   { bounceX: 520,  bounceY: 480, endX: 430, endY: 590, sfx: 'slide_whistle', bubble: 'WHOOPS! 🍌' },
      mud_splat:     { bounceX: 740,  bounceY: 460, endX: 780, endY: 585, sfx: 'splat',         bubble: 'SPLAT! 💩' },
      crab_snatch:   { bounceX: 860,  bounceY: 490, endX: 920, endY: 600, sfx: 'clown_horn',    bubble: 'PINCH! 🦀' },
      squirrel_tree: { bounceX: 340,  bounceY: 410, endX: 290, endY: 560, sfx: 'squeak',        bubble: 'SQUEAK! 🐿️' },
      boomerang:     { bounceX: 640,  bounceY: 340, endX: 620, endY: 645, sfx: 'spring_twang',   bubble: 'BOOMERANG! 🪃' },
      giant_bubble:  { bounceX: 640,  bounceY: 450, endX: 640, endY: 280, sfx: 'boing',          bubble: 'POP! 🫧' },
      kiddie_pool:   { bounceX: 1095, bounceY: 325, endX: 990, endY: 572, sfx: 'splash',        bubble: 'SPLASH! 🛟' },
      dino_nest:     { bounceX: 280,  bounceY: 420, endX: 230, endY: 580, sfx: 'dino',          bubble: 'SQUAWK! 🦖🥚' },
      lava_vent:     { bounceX: 980,  bounceY: 430, endX: 1020, endY: 585, sfx: 'sizzle',        bubble: 'SSSSS! 🌋' },
      hovercar:      { bounceX: 1010, bounceY: 520, endX: 885, endY: 595, sfx: 'hovercar',      bubble: 'BEEP-BEEP! 🛸' },
      rope_bridge:   { bounceX: 240,  bounceY: 555, endX: 330, endY: 585, sfx: 'bridge',        bubble: 'TWANG! 🌉💦' }
    };

    const target = hazardCoords[mishapType] || hazardCoords.kiddie_pool;

    this.golferPose = 'backswing';
    this.activeShot = {
      kind: 'mishap',
      mishapType,
      startTime: performance.now(),
      duration: 1650,
      startX,
      startY,
      bounceX: target.bounceX,
      bounceY: target.bounceY,
      endX: target.endX,
      endY: target.endY,
      sfx: target.sfx,
      bubble: target.bubble,
      swingTriggered: false,
      impactTriggered: false,
      trail: [],
      onComplete
    };
  }

  startCelebration(strokes, par, pinOffsetX = 0) {
    const diff = strokes - par;
    let type = 'par';
    let headline = '⛳ EVEN PAR!';
    let subtext = `Par ${par} — ${strokes} strokes! Right on target!`;
    let scoreName = 'Even Par';
    let diffSign = 'E';
    let scoreSpeech = `Even par! Exactly ${strokes} strokes, right on target!`;
    let scoreKey = 'score_par';

    if (strokes === 1) {
      type = 'hole_in_one';
      headline = '🎆 HOLE IN ONE! (ACE!)';
      subtext = `1 Stroke on Par ${par}! An unbelievable magical Ace!`;
      scoreName = 'Hole-in-One';
      diffSign = diff <= 0 ? `${diff}` : `+${diff}`;
      scoreSpeech = 'Hole in one! An incredible Ace, Luka!';
      scoreKey = 'score_ace';
      this.audio.playSfx('siren');
      this.spawnFireworkBurst(420, 240, true);
      this.spawnFireworkBurst(860, 240, false);
    } else if (diff <= -3) {
      type = 'albatross';
      headline = '🦤 RARE ALBATROSS! (-3)';
      subtext = `3 Under Par! ${strokes} strokes on Par ${par}! Ultra rare double eagle!`;
      scoreName = 'Albatross';
      diffSign = '-3';
      scoreSpeech = 'Albatross! Three under par! What an unbelievable shot!';
      scoreKey = 'score_albatross';
      this.audio.playSfx('cheer');
      this.spawnFireworkBurst(640, 220, true);
    } else if (diff === -2) {
      type = 'eagle';
      headline = '🦅 GOLDEN EAGLE! (-2)';
      subtext = `2 Under Par! ${strokes} strokes on Par ${par}! Watch the eagle soar!`;
      scoreName = 'Eagle';
      diffSign = '-2';
      scoreSpeech = `Eagle! ${strokes} strokes on Par ${par} is two under par!`;
      scoreKey = 'score_eagle';
      this.audio.playSfx('cheer');
      this.spawnFireworkBurst(640, 230, true);
    } else if (diff === -1) {
      type = 'birdie';
      headline = '🐦 BLUEBIRD BIRDIE! (-1)';
      subtext = `1 Under Par! ${strokes} strokes on Par ${par}! Great golf!`;
      scoreName = 'Birdie';
      diffSign = '-1';
      scoreSpeech = `Birdie! ${strokes} strokes on Par ${par} is one under par!`;
      scoreKey = 'score_birdie';
      this.audio.playSfx('cheer');
    } else if (diff === 0) {
      type = 'par';
      headline = '⛳ EVEN PAR! (0)';
      subtext = `Right on Par ${par}! ${strokes} strokes, right on target!`;
      scoreName = 'Even Par';
      diffSign = 'E';
      scoreSpeech = `Even par! Exactly ${strokes} strokes on Par ${par}!`;
      scoreKey = 'score_par';
      this.audio.playSfx('cheer');
    } else if (diff === 1) {
      type = 'bogey';
      headline = '🟡 BOGEY (+1)';
      subtext = `1 Over Par! ${strokes} strokes on Par ${par}. Good effort, Luka!`;
      scoreName = 'Bogey';
      diffSign = '+1';
      scoreSpeech = `Bogey! ${strokes} strokes on Par ${par} is one over par. Good effort, Luka!`;
      scoreKey = 'score_bogey';
      this.audio.playSfx('pop');
    } else if (diff === 2) {
      type = 'double_bogey';
      headline = '🟠 DOUBLE BOGEY (+2)';
      subtext = `2 Over Par! ${strokes} strokes on Par ${par}. Keep swinging!`;
      scoreName = 'Double Bogey';
      diffSign = '+2';
      scoreSpeech = `Double bogey! ${strokes} strokes on Par ${par} is two over par. Great practice!`;
      scoreKey = 'score_double_bogey';
      this.audio.playSfx('pop');
    } else {
      type = 'triple_bogey';
      headline = `🔴 ${diff} OVER PAR`;
      subtext = `${diff} Over Par! Practice makes perfect! Onto the next hole!`;
      scoreName = 'Triple Bogey+';
      diffSign = `+${diff}`;
      scoreSpeech = `${diff} over par. Great practice, Luka! Let's hit the next hole!`;
      scoreKey = 'score_triple_bogey';
      this.audio.playSfx('pop');
    }

    this.golferPose = 'celebrate';
    this.celebration = {
      type,
      headline,
      subtext,
      scoreName,
      diffSign,
      scoreSpeech,
      scoreKey,
      strokes,
      par,
      startTime: performance.now(),
      pinX: 640 + pinOffsetX,
      pinY: 412
    };

    this._spawnConfetti(type === 'hole_in_one' || type === 'albatross' ? 120 : 55);
    return { type, headline, subtext, scoreName, diffSign, scoreSpeech, scoreKey, strokes, par };
  }

  _spawnConfetti(count) {
    this._spawnConfettiAt(640, 250, count, 700);
  }

  _spawnConfettiAt(cx, cy, count, spread = 140) {
    const colors = ['#FFD600', '#FF4081', '#00E5FF', '#76FF03', '#FF6D00', '#EA80FC', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * spread,
        y: cy + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 6,
        size: 8 + Math.random() * 10,
        color: colors[i % colors.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 1.0
      });
    }
  }

  update(now = performance.now()) {
    if (this.milestoneEffect && now - this.milestoneEffect.startTime > this.milestoneEffect.duration) {
      this.milestoneEffect = null;
    }

    if (this.lingeringDriveArc && now - this.lingeringDriveArc.startTime > this.lingeringDriveArc.duration) {
      this.lingeringDriveArc = null;
    }

    if (this.activeShot) {
      const shot = this.activeShot;
      const elapsed = now - shot.startTime;
      const t = Math.min(1, elapsed / shot.duration);

      if (t >= 0.10 && !shot.swingTriggered) {
        shot.swingTriggered = true;
        if (shot.kind === 'mishap') {
          this.golferPose = 'mishap';
          this.audio.playSfx('boing');
        } else {
          this.golferPose = 'impact';
          if (shot.isMegaPower) {
            this.audio.playSfx('dbz_boom');
          } else {
            this.audio.playSfx(shot.kind === 'minigolf_segments' ? 'putt' : 'swing');
          }
        }
      }

      if (t >= 0.10) {
        const flightT = (t - 0.10) / 0.90;
        shot.flightT = flightT;
        this.ballPos.spinAngle += 0.25;

        // --------------------------------------------------------------------
        // CASE A: MINI-GOLF MULTI-SEGMENT TUNNEL & OBSTACLE PATH
        // --------------------------------------------------------------------
        if (shot.kind === 'minigolf_segments') {
          const numSegs = shot.segments.length;
          const scaled = flightT * numSegs;
          const segIdx = Math.min(numSegs - 1, Math.floor(scaled));
          const segLocalT = scaled - segIdx;
          const seg = shot.segments[segIdx];

          if (segIdx !== shot.currentSegIdx) {
            shot.currentSegIdx = segIdx;
            if (seg.sfx) this.audio.playSfx(seg.sfx);
            if (seg.popup) {
              this.spawnFloatingText(seg.popup, (seg.x0 + seg.x1) / 2, Math.min(seg.y0, seg.y1) - 24, '#FFEA00');
              this._spawnConfettiAt((seg.x0 + seg.x1) / 2, (seg.y0 + seg.y1) / 2, 16, 70);
            }
          }

          this.ballPos.visible = !seg.hidden;
          this.ballPos.x = seg.x0 + (seg.x1 - seg.x0) * segLocalT;
          this.ballPos.y =
            seg.y0 + (seg.y1 - seg.y0) * segLocalT - Math.sin(segLocalT * Math.PI) * (seg.arc || 0);
          this.ballPos.radius = 13 - flightT * 4;

          if (!seg.hidden) {
            shot.trail.push({ x: this.ballPos.x, y: this.ballPos.y, r: this.ballPos.radius, turbo: true });
            if (shot.trail.length > 26) shot.trail.shift();
          }
        }
        // --------------------------------------------------------------------
        // CASE B: DRIVING RANGE TARGET HIT OR 18-HOLE CORRECT SHOT
        // --------------------------------------------------------------------
        else if (shot.kind === 'correct' || shot.kind === 'driving_range_hit') {
          const isCourseDrive = shot.kind === 'correct' && shot.shotType === 'drive';

          // For Course Drives: 0..0.82 is high-altitude sky flight; 0.82..1.0 is 3 fairway bounces & roll-out!
          const airPhaseEnd = isCourseDrive ? 0.82 : 0.86;
          let arcLift = 0;
          let bounceLift = 0;

          if (flightT <= airPhaseEnd) {
            const airT = flightT / airPhaseEnd;
            arcLift = Math.sin(airT * Math.PI) * shot.peakHeight;
          } else {
            const rollT = (flightT - airPhaseEnd) / (1 - airPhaseEnd);
            bounceLift = Math.abs(Math.sin(rollT * Math.PI * 3)) * (isCourseDrive ? 28 : 14) * (1 - rollT * 0.7);
            if (isCourseDrive && !shot.landingBounceTriggered) {
              shot.landingBounceTriggered = true;
              this.audio.playSfx('pop');
              this.spawnFloatingText(
                `💥 ${shot.driveYards} YARD DRIVE!`,
                this.ballPos.x,
                this.ballPos.y - 35,
                '#00E676'
              );
              this._spawnConfettiAt(this.ballPos.x, this.ballPos.y, 26, 95);
            }
          }

          const inv = 1 - flightT;
          const x =
            inv * inv * shot.startX +
            2 * inv * flightT * shot.ctrlX +
            flightT * flightT * shot.endX;

          const baseLinearY = shot.startY + (shot.endY - shot.startY) * flightT;

          this.ballPos.x = x;
          this.ballPos.y = baseLinearY - arcLift - bounceLift;
          this.ballPos.radius = shot.startRadius + (shot.endRadius - shot.startRadius) * flightT;

          if (isCourseDrive) {
            shot.currentYards = Math.min(
              shot.driveYards,
              Math.round(shot.driveYards * Math.min(1, flightT / 0.88))
            );
            // Trigger Apex Star Burst at the top of the drive arc!
            if (!shot.apexTriggered && flightT >= 0.41) {
              shot.apexTriggered = true;
              this.spawnFloatingText('🚀 SKY HIGH APEX!', this.ballPos.x, this.ballPos.y - 28, '#FFEA00');
              this._spawnConfettiAt(this.ballPos.x, this.ballPos.y, 18, 70);
            }
          }

          if (shot.hitBonus && !shot.bonusTriggered && flightT >= 0.48) {
            shot.bonusTriggered = true;
            this.audio.playSfx('coin');
            this.spawnFloatingText(
              `${shot.hitBonus.icon} ${shot.hitBonus.label}!`,
              shot.hitBonus.x,
              shot.hitBonus.y - 25,
              '#FFD600'
            );
            this._spawnConfettiAt(shot.hitBonus.x, shot.hitBonus.y, 24, 90);
          }

          shot.trail.push({
            x: this.ballPos.x,
            y: this.ballPos.y,
            r: this.ballPos.radius,
            turbo: shot.turboActivated || isCourseDrive
          });
          if (shot.trail.length > (isCourseDrive ? 55 : 28)) {
            shot.trail.shift();
          }

          if (shot.fullArcPoints) {
            shot.fullArcPoints.push({
              x: this.ballPos.x,
              y: this.ballPos.y,
              r: this.ballPos.radius
            });
          }
        }
        // --------------------------------------------------------------------
        // CASE C: SLAPSTICK MISHAP RICOCHET
        // --------------------------------------------------------------------
        else {
          if (flightT < 0.55) {
            const segT = flightT / 0.55;
            this.ballPos.x = shot.startX + (shot.bounceX - shot.startX) * segT;
            this.ballPos.y = shot.startY + (shot.bounceY - shot.startY) * segT - Math.sin(segT * Math.PI) * 140;
            this.ballPos.radius = 15 - segT * 4;
          } else {
            if (!shot.impactTriggered) {
              shot.impactTriggered = true;
              this.audio.playSfx(shot.sfx);
              this.hazardEffect = {
                type: shot.mishapType,
                x: shot.endX,
                y: shot.endY,
                bounceX: shot.bounceX,
                bounceY: shot.bounceY,
                bubble: shot.bubble,
                startTime: now
              };
            }
            const segT = (flightT - 0.55) / 0.45;
            this.ballPos.x = shot.bounceX + (shot.endX - shot.bounceX) * segT;
            this.ballPos.y = shot.bounceY + (shot.endY - shot.bounceY) * segT - Math.sin(segT * Math.PI) * 80;
            this.ballPos.radius = 11 - segT * 2;
          }
          shot.trail.push({ x: this.ballPos.x, y: this.ballPos.y, r: this.ballPos.radius });
          if (shot.trail.length > 24) shot.trail.shift();
        }
      }

      if (t >= 1) {
        const doneCb = shot.onComplete;
        if (shot.kind === 'driving_range_hit') {
          this.golferPose = 'celebrate';
          this.audio.playSfx('cheer');
          this.spawnFloatingText('🎯 BULLSEYE! +15 🪙', shot.endX, shot.endY - 40, '#00E676');
          this._spawnConfettiAt(shot.endX, shot.endY, 36, 120);
          // Always launch a firework burst on target hit + a mini volcano puff!
          this.spawnFireworkBurst(shot.endX, Math.max(210, shot.endY - 170), true);
          this.spawnVolcanoLavaEruption(690, 138, 10);

          if (shot.isMilestone) {
            this.triggerMilestoneFireworks(shot.streakCount);
          }
        } else if (shot.kind === 'minigolf_segments') {
          if (shot.isCorrect) {
            this.ballPos.visible = false;
            this.golferPose = 'celebrate';
            this.audio.playSfx('cup');
            this.spawnFireworkBurst(640, 250, true);
            if (shot.isMilestone) {
              this.triggerMilestoneFireworks(shot.streakCount);
            }
          } else {
            this.ballPos.visible = true;
            this.golferPose = 'mishap';
          }
        } else if (shot.kind === 'correct' && shot.shotType === 'putt') {
          this.ballPos.visible = false;
          this.audio.playSfx('cup');
        } else if (shot.kind === 'correct') {
          if (shot.isMegaPower) {
            this.audio.playSfx('dbz_boom');
            this.audio.playSfx('volcano_eruption');
            this.spawnVolcanoLavaEruption(690, 138, 16);
            this.triggerMilestoneFireworks(5);
            this.spawnFloatingText(`⚡💥 SUPER SAIYAN CRUSHER! ${shot.driveYards} YDS! 💥⚡`, shot.endX, shot.endY - 60, '#FFD600');
            this._spawnConfettiAt(shot.endX, shot.endY, 56, 160);
          } else {
            this.audio.playSfx('cheer');
            this.spawnFireworkBurst(shot.endX, Math.max(220, shot.endY - 140), false);
          }
          if (shot.shotType === 'drive' && shot.fullArcPoints && shot.fullArcPoints.length > 2) {
            this.lingeringDriveArc = {
              points: shot.fullArcPoints,
              driveYards: shot.driveYards,
              endX: shot.endX,
              endY: shot.endY,
              startTime: now,
              duration: 950
            };
          }
        }

        this.activeShot = null;
        if (doneCb) doneCb();
      }
    }

    // Update Confetti Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.rotation += p.vRot;
      p.life -= 0.01;
      if (p.life <= 0 || p.y > 820) {
        this.particles.splice(i, 1);
      }
    }

    // Update Radial Firework Sparks
    for (let i = this.fireworkSparks.length - 1; i >= 0; i--) {
      const sp = this.fireworkSparks[i];
      sp.prevX = sp.x;
      sp.prevY = sp.y;
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vx *= 0.96;
      sp.vy = sp.vy * 0.96 + 0.14;
      sp.life -= 0.016;
      if (sp.life <= 0) {
        this.fireworkSparks.splice(i, 1);
      }
    }

    // Update Volcano Erupting Lava Bombs
    for (let i = this.lavaBombs.length - 1; i >= 0; i--) {
      const lb = this.lavaBombs[i];
      lb.x += lb.vx;
      lb.y += lb.vy;
      lb.vy += 0.28; // gravity
      lb.life -= 0.014;
      if (lb.life <= 0 || lb.y > 760) {
        this.lavaBombs.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.0;
      ft.life -= 0.014;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }
}
