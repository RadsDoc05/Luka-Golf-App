/**
 * GameState.js
 * Manages game modes for Luka's Golf Adventure:
 *   1. 'course'        — 18-Hole Golf Courses (Tropical, Dino, Cyber, Canyon)
 *   2. 'driving_range' — Canyon Volcano Driving Range (Exact 3-Digit Yardages 234/127, Place Value, Basic Math + Streak Fireworks)
 *   3. 'minigolf'      — Wacky 9-Hole Mini-Golf Course (Basic Math Equations + Deterministic Tunnel & Obstacle Animations)
 */

import { COURSE_THEMES, getHolesByCourse } from '../game/Courses.js';
import { MathEngine, MINIGOLF_HOLES } from '../game/MathEngine.js';

const LANE_OFFSETS = {
  left: -175,
  center: 0,
  right: 175
};

export class GameState {
  constructor(storage) {
    this.storage = storage;
    this.appMode = 'course'; // 'course' | 'driving_range' | 'minigolf'

    // 18-Hole Course State
    this.activeCourseKey = 'tropical';
    this.courseHoles = [];
    this.currentHoleIndex = 0;
    this.scorecard = {};
    this.currentHole = null;
    this.strokes = 0;
    this.lie = 'tee';
    this.stageBeforeHazard = 'tee';
    this.aimLane = 'center';
    this.aimConfirmed = false; // Step 1: Choose Left / Center / Right Aim before Math Equation!
    this.bonusTargets = [];
    this.remainingYards = 0;
    this.remainingFeet = 0;
    this.currentChallenge = null;

    // Driving Range State
    this.rangeSubMode = 'exact_3digit'; // 'exact_3digit' | 'place_value_3digit' | 'basic_math' | 'mix'
    this.rangeShotCounter = 0;
    this.rangeStreak = 0;
    this.rangeTargets = []; // 3 visual target carts on the range

    // Mini-Golf State
    this.miniGolfHoleIndex = 0;
    this.miniGolfAttempts = 0;
    this.miniGolfStreak = 0;
    this.miniGolfScorecard = {};

    // Mega Power Drive Streak Charger
    this.megaDriveStreak = 0;
    this.megaDriveUnlocked = false;
  }

  // ==========================================================================
  // MODE 1: 18-HOLE GOLF COURSES
  // ==========================================================================
  startCourse(courseKey = 'tropical', startHoleIndex = 0) {
    this.appMode = 'course';
    this.activeCourseKey = courseKey;
    this.courseHoles = getHolesByCourse(courseKey);
    this.currentHoleIndex = Math.max(0, Math.min(startHoleIndex, this.courseHoles.length - 1));
    this.scorecard = {};
    this.loadCurrentHole();
  }

  loadCurrentHole() {
    this.currentHole = this.courseHoles[this.currentHoleIndex];
    this.strokes = 0;
    this.lie = 'tee';
    this.stageBeforeHazard = 'tee';
    this.aimLane = 'center';
    this.aimConfirmed = false;
    this.remainingYards = this.currentHole.totalYards;
    this.remainingFeet = this.currentHole.puttTargetFeet;
    this._spawnBonusTargets();
    this._generateChallengeForCurrentStage(false);
    return this.currentHole;
  }

  // ==========================================================================
  // MODE 2: CANYON VOLCANO DRIVING RANGE
  // ==========================================================================
  startDrivingRange(subMode = 'exact_3digit') {
    this.appMode = 'driving_range';
    this.rangeSubMode = subMode;
    this.strokes = 0;
    this.lie = 'tee';
    this.currentHole = {
      number: 1,
      name: 'Canyon Volcano Range',
      theme: 'driving_range',
      par: 1,
      pinOffsetX: 0
    };
    this.loadNextDrivingRangeTarget();
  }

  setDrivingRangeSubMode(subMode) {
    this.rangeSubMode = subMode;
    this.loadNextDrivingRangeTarget();
  }

  loadNextDrivingRangeTarget() {
    const settings = this.storage.getSettings();
    this.currentChallenge = MathEngine.createDrivingRangeChallenge(
      this.rangeSubMode,
      this.rangeShotCounter,
      settings.difficultyLevel || 'kindergarten',
      settings.adaptiveScore ?? 1
    );
    const coords = [
      { x: 350, y: 495 },
      { x: 640, y: 465 },
      { x: 930, y: 495 }
    ];
    this.rangeTargets = this.currentChallenge.options.map((optVal, idx) => ({
      value: optVal,
      isCorrect: Number(optVal) === Number(this.currentChallenge.targetValue),
      yardsLabel:
        this.currentChallenge.subMode === 'basic_math'
          ? `${optVal} (${this.currentChallenge.targetYards} YDS)`
          : `${optVal} YDS`,
      x: coords[idx].x,
      y: coords[idx].y
    }));
    return this.currentChallenge;
  }

  // ==========================================================================
  // MODE 3: WACKY MINI-GOLF CARNIVAL COURSE
  // ==========================================================================
  startMiniGolf(holeIdx = 0) {
    this.appMode = 'minigolf';
    this.miniGolfHoleIndex = holeIdx % MINIGOLF_HOLES.length;
    this.miniGolfAttempts = 0;
    this.miniGolfScorecard = {};
    this.strokes = 0;
    this.lie = 'green';
    this.loadMiniGolfHole();
  }

  loadMiniGolfHole() {
    const settings = this.storage.getSettings();
    const meta = MINIGOLF_HOLES[this.miniGolfHoleIndex % MINIGOLF_HOLES.length];
    this.strokes = 0;
    this.lie = 'green';
    this.currentHole = {
      number: meta.number,
      name: meta.name,
      theme: 'minigolf',
      obstacleType: meta.obstacleType,
      par: meta.par,
      pinOffsetX: 0
    };
    this.currentChallenge = MathEngine.createMiniGolfChallenge(
      this.miniGolfHoleIndex,
      this.miniGolfAttempts,
      settings.difficultyLevel || 'kindergarten',
      settings.adaptiveScore ?? 1
    );
    return this.currentHole;
  }

  needsAimSelection() {
    return (
      this.appMode === 'course' &&
      (this.stageBeforeHazard === 'tee' || this.stageBeforeHazard === 'approach') &&
      !this.aimConfirmed
    );
  }

  setAimLane(lane) {
    if (['left', 'center', 'right'].includes(lane)) {
      this.aimLane = lane;
    }
  }

  confirmAimLane(lane) {
    this.setAimLane(lane);
    this.aimConfirmed = true;
    const bonus = (this.bonusTargets || []).find(b => b.lane === this.aimLane && !b.collected);
    return {
      lane: this.aimLane,
      bonus
    };
  }

  _spawnBonusTargets() {
    if (this.stageBeforeHazard === 'putt') {
      this.bonusTargets = [];
      return;
    }
    const lanes = ['left', 'center', 'right'];
    const shuffled = [...lanes].sort(() => Math.random() - 0.5);
    const types = [
      { kind: 'coin',    icon: '🪙', label: '+15 COINS', coins: 15 },
      { kind: 'mystery', icon: '🎁', label: 'MYSTERY +25', coins: 25 },
      { kind: 'rainbow', icon: '🌈', label: 'BOOST +20', coins: 20 }
    ];

    this.bonusTargets = [
      {
        lane: shuffled[0],
        x: 640 + LANE_OFFSETS[shuffled[0]],
        y: 505,
        ...types[this.currentHole.number % types.length],
        collected: false
      },
      {
        lane: shuffled[1],
        x: 640 + LANE_OFFSETS[shuffled[1]],
        y: 485,
        ...types[(this.currentHole.number + 1) % types.length],
        collected: false
      }
    ];
  }

  _generateChallengeForCurrentStage(isRescue = false) {
    const settings = this.storage.getSettings();
    const hole = this.currentHole;
    const stage = this.stageBeforeHazard;

    if (stage === 'tee') {
      this.currentChallenge = MathEngine.createTeeChallenge(
        hole.driveTargetYards,
        settings.mathMode,
        isRescue,
        hole.number,
        settings.difficultyLevel || 'kindergarten'
      );
    } else if (stage === 'approach') {
      this.currentChallenge = MathEngine.createApproachChallenge(
        hole.approachTargetYards,
        isRescue,
        hole.number
      );
    } else if (stage === 'putt') {
      this.currentChallenge = MathEngine.createPuttChallenge(
        hole.puttTargetFeet,
        hole.puttAddends,
        isRescue,
        hole.number,
        settings.difficultyLevel || 'kindergarten',
        settings.adaptiveScore ?? 1
      );
    }
    return this.currentChallenge;
  }

  submitAnswer(answerValue) {
    const challenge = this.currentChallenge;
    const isCorrect = Number(answerValue) === Number(challenge.targetValue);
    const adaptiveUpdate = this.storage.recordAnswerOutcome(isCorrect);

    let megaJustUnlocked = false;
    if (isCorrect) {
      this.megaDriveStreak += 1;
      if (this.megaDriveStreak >= 3 && !this.megaDriveUnlocked) {
        this.megaDriveUnlocked = true;
        megaJustUnlocked = true;
      }
    } else {
      this.megaDriveStreak = 0;
    }

    // ========================================================================
    // DRIVING RANGE SUBMISSION
    // ========================================================================
    if (this.appMode === 'driving_range') {
      this.strokes += 1;
      const pickedTarget =
        this.rangeTargets.find(t => Number(t.value) === Number(answerValue)) ||
        this.rangeTargets[1] ||
        { x: 640, y: 465, value: answerValue };

      if (!isCorrect) {
        this.rangeStreak = 0;
        return {
          mode: 'driving_range',
          correct: false,
          streak: 0,
          isMilestone: false,
          targetX: pickedTarget.x,
          targetY: pickedTarget.y,
          mishapHeadline: 'TRACTOR BONK!',
          mishapText: 'Bounced off the driving range ball-picker tractor! Try that target again!'
        };
      }

      this.rangeShotCounter += 1;
      this.rangeStreak += 1;
      const isMilestone = this.rangeStreak > 0 && this.rangeStreak % 3 === 0;
      const earnedCoins = isMilestone ? 40 : 15;
      this.storage.addCoins(earnedCoins);

      return {
        mode: 'driving_range',
        correct: true,
        streak: this.rangeStreak,
        isMilestone,
        earnedCoins,
        targetX: pickedTarget.x,
        targetY: pickedTarget.y,
        targetYards: challenge.targetYards
      };
    }

    // ========================================================================
    // MINI-GOLF SUBMISSION
    // ========================================================================
    if (this.appMode === 'minigolf') {
      this.strokes += 1;
      this.miniGolfAttempts += 1;
      const obstacleType = this.currentHole.obstacleType;

      if (!isCorrect) {
        this.miniGolfStreak = 0;
        return {
          mode: 'minigolf',
          correct: false,
          obstacleType,
          strokes: this.strokes
        };
      }

      this.miniGolfStreak += 1;
      const isMilestone = this.miniGolfStreak > 0 && this.miniGolfStreak % 3 === 0;
      const earnedCoins = isMilestone ? 35 : 20;
      this.storage.addCoins(earnedCoins);

      // Record hole score on the Mini-Golf Leaderboard
      const holeNum = this.currentHole.number;
      this.miniGolfScorecard[holeNum] = this.strokes;
      this.storage.recordMiniGolfHole(holeNum, this.strokes);

      return {
        mode: 'minigolf',
        correct: true,
        holed: true,
        obstacleType,
        strokes: this.strokes,
        par: this.currentHole.par,
        streak: this.miniGolfStreak,
        isMilestone,
        earnedCoins
      };
    }

    // ========================================================================
    // 18-HOLE COURSE SUBMISSION
    // ========================================================================
    const hole = this.currentHole;
    this.strokes += 1;

    if (!isCorrect) {
      this.lie = 'hazard';
      const unlockedTrophy = this.storage.recordMishap();
      const mishapPool = [
        'banana_peel',
        'mud_splat',
        'crab_snatch',
        'squirrel_tree',
        'boomerang',
        'giant_bubble',
        hole.mishapType || 'kiddie_pool'
      ];
      const chosenMishap = mishapPool[Math.floor(Math.random() * mishapPool.length)];
      return {
        mode: 'course',
        correct: false,
        strokes: this.strokes,
        mishapType: chosenMishap,
        mishapHeadline: hole.mishapHeadline,
        mishapText: hole.mishapText,
        mishapVoiceKey: hole.mishapVoiceKey,
        unlockedTrophy
      };
    }

    const completedStage = this.stageBeforeHazard;
    let newlyUnlockedTrophies = [];

    let hitBonus = null;
    if (completedStage !== 'putt') {
      const target = this.bonusTargets.find(b => b.lane === this.aimLane && !b.collected);
      if (target) {
        target.collected = true;
        hitBonus = target;
      }
    }

    const baseCoins = completedStage === 'putt' ? 20 : 10;
    const bonusCoins = hitBonus ? hitBonus.coins : 0;
    const totalEarnedCoins = baseCoins + bonusCoins;
    this.storage.addCoins(totalEarnedCoins);

    if (challenge.mode === 'advanced' && completedStage === 'tee') {
      const t = this.storage.unlockTrophy('base10_builder');
      if (t) newlyUnlockedTrophies.push(t);
    }

    const isPar3Ace =
      hole.par === 3 &&
      this.strokes === 1 &&
      (hole.number === 4 || hole.number === 11 || challenge.mode === 'advanced');

    if (completedStage === 'tee') {
      if (isPar3Ace) {
        this.lie = 'holed';
        this.stageBeforeHazard = 'holed';
        this.remainingYards = 0;
        this.remainingFeet = 0;
        this.scorecard[hole.number] = this.strokes;
        const holeTrophies = this.storage.recordHoleScore(hole.number, this.strokes, hole.par);
        newlyUnlockedTrophies.push(...holeTrophies);
        return {
          mode: 'course',
          correct: true,
          shotType: 'putt',
          aimLane: this.aimLane,
          hitBonus,
          earnedCoins: totalEarnedCoins,
          holed: true,
          strokes: this.strokes,
          par: hole.par,
          unlockedTrophies: newlyUnlockedTrophies
        };
      }

      const launchedAim = this.aimLane;
      const driveYards = hole.driveTargetYards;
      const wasMegaDrive = this.megaDriveUnlocked;
      if (wasMegaDrive) {
        this.megaDriveUnlocked = false;
        this.megaDriveStreak = 0;
      }
      this.lie = 'fairway';
      this.stageBeforeHazard = 'approach';
      this.aimLane = 'center';
      this.aimConfirmed = false;
      this.remainingYards = hole.approachTargetYards;
      this._spawnBonusTargets();
      this._generateChallengeForCurrentStage(false);
      return {
        mode: 'course',
        correct: true,
        shotType: 'drive',
        isMegaPower: wasMegaDrive,
        megaJustUnlocked,
        megaStreak: this.megaDriveStreak,
        megaUnlocked: this.megaDriveUnlocked,
        driveYards,
        aimLane: launchedAim,
        hitBonus,
        earnedCoins: totalEarnedCoins,
        holed: false,
        strokes: this.strokes,
        nextChallenge: this.currentChallenge,
        unlockedTrophies: newlyUnlockedTrophies,
        adaptiveUpdate
      };
    }

    if (completedStage === 'approach') {
      const launchedAim = this.aimLane;
      this.lie = 'green';
      this.stageBeforeHazard = 'putt';
      this.aimConfirmed = true;
      this.remainingYards = 0;
      this.remainingFeet = hole.puttTargetFeet;
      this.bonusTargets = [];
      this._generateChallengeForCurrentStage(false);
      return {
        mode: 'course',
        correct: true,
        shotType: 'approach',
        aimLane: launchedAim,
        hitBonus,
        earnedCoins: totalEarnedCoins,
        holed: false,
        strokes: this.strokes,
        megaJustUnlocked,
        megaStreak: this.megaDriveStreak,
        megaUnlocked: this.megaDriveUnlocked,
        nextChallenge: this.currentChallenge,
        unlockedTrophies: newlyUnlockedTrophies,
        adaptiveUpdate
      };
    }

    this.lie = 'holed';
    this.stageBeforeHazard = 'holed';
    this.remainingYards = 0;
    this.remainingFeet = 0;
    this.scorecard[hole.number] = this.strokes;

    const holeTrophies = this.storage.recordHoleScore(hole.number, this.strokes, hole.par);
    newlyUnlockedTrophies.push(...holeTrophies);

    return {
      mode: 'course',
      correct: true,
      shotType: 'putt',
      aimLane: 'center',
      hitBonus: null,
      earnedCoins: totalEarnedCoins,
      holed: true,
      strokes: this.strokes,
      par: hole.par,
      megaJustUnlocked,
      megaStreak: this.megaDriveStreak,
      megaUnlocked: this.megaDriveUnlocked,
      unlockedTrophies: newlyUnlockedTrophies,
      adaptiveUpdate
    };
  }

  prepareRescueShot() {
    this.lie = this.stageBeforeHazard === 'putt' ? 'green' : 'fairway';
    this.aimConfirmed = true; // Keep chosen aim lane during rescue shot
    return this._generateChallengeForCurrentStage(true);
  }

  hasNextHole() {
    if (this.appMode === 'minigolf') {
      return this.miniGolfHoleIndex < MINIGOLF_HOLES.length - 1;
    }
    return this.currentHoleIndex < this.courseHoles.length - 1;
  }

  advanceToNextHole() {
    if (this.appMode === 'minigolf') {
      if (this.miniGolfHoleIndex < MINIGOLF_HOLES.length - 1) {
        this.miniGolfHoleIndex += 1;
      } else {
        this.miniGolfHoleIndex = 0;
      }
      return this.loadMiniGolfHole();
    }
    if (this.hasNextHole()) {
      this.currentHoleIndex += 1;
      return this.loadCurrentHole();
    }
    return null;
  }

  getCourseTotals() {
    let totalStrokes = 0;
    let totalPar = 0;
    for (const h of this.courseHoles) {
      totalPar += h.par;
      totalStrokes += this.scorecard[h.number] || h.par;
    }
    return {
      courseKey: this.activeCourseKey,
      courseMeta: COURSE_THEMES[this.activeCourseKey] || {
        id: 'full18',
        name: '18-Hole Championship',
        icon: '🏆'
      },
      totalStrokes,
      totalPar,
      holesCount: this.courseHoles.length
    };
  }

  getMiniGolfTotals() {
    let totalStrokes = 0;
    let totalPar = 0;
    for (const h of MINIGOLF_HOLES) {
      totalPar += h.par;
      totalStrokes += this.miniGolfScorecard[h.number] || h.par;
    }
    return {
      totalStrokes,
      totalPar,
      holesCount: MINIGOLF_HOLES.length
    };
  }
}
