/**
 * Storage.js
 * Persistent localStorage manager for Luka's 18-Hole Golf Adventure.
 * Tracks course records, star badges (Gold/Silver/Bronze), Mini-Golf Leaderboard,
 * trophy unlocks, Pro Shop coins & cosmetics, and 3-tier age progression difficulty levels.
 */

const STORAGE_KEY = 'luka_golf_adventure_save_v1';

export const DIFFICULTY_LEVELS = {
  kindergarten: {
    id: 'kindergarten',
    badge: '🌱 Level 1: Kindergarten',
    shortLabel: '🌱 Kindergarten',
    description: '3-Digit Number Matching (120–420), +10 Stepping Stones, and Touch-to-Count Addition (up to 7).'
  },
  grade1: {
    id: 'grade1',
    badge: '🚀 Level 2: 1st Grade',
    shortLabel: '🚀 1st Grade',
    description: 'Base-10 Place Value (300 + 50), Exact 3-Digit Targets (234, 127), 10s Bridges, and Missing Addends (up to 12).'
  },
  grade2: {
    id: 'grade2',
    badge: '🏆 Level 3: 2nd Grade+',
    shortLabel: '🏆 2nd Grade+',
    description: 'Full 3-Part Place Value (200 + 30 + 4), 3-Digit Mental Math (+10 / -10), and Equations up to 20!'
  }
};

export const PRO_SHOP_CATALOG = {
  balls: [
    { id: 'classic',  name: 'Classic Golf Ball', icon: '⚪', cost: 0 },
    { id: 'soccer',   name: 'Soccer Kick Ball',  icon: '⚽', cost: 20 },
    { id: 'pizza',    name: 'Pepperoni Pizza',   icon: '🍕', cost: 30 },
    { id: 'dino_egg', name: 'Spotted Dino Egg',  icon: '🥚', cost: 40 },
    { id: 'donut',    name: 'Sprinkle Donut',    icon: '🍩', cost: 50 },
    { id: 'meteor',   name: 'Cosmic Fireball',   icon: '☄️', cost: 75 }
  ],
  tracers: [
    { id: 'classic_white', name: 'Cloud White',   icon: '⚪', hex: '#FFFFFF', glow: '#B0BEC5', cost: 0 },
    { id: 'rainbow_prism', name: 'Rainbow Prism', icon: '🌈', hex: 'rainbow', glow: '#FF4081', cost: 35 },
    { id: 'champion_gold', name: 'Champion Gold', icon: '✨', hex: '#FFD700', glow: '#FF8F00', cost: 40 },
    { id: 'plasma_blue',   name: 'Cyber Plasma',  icon: '⚡', hex: '#00E5FF', glow: '#00B0FF', cost: 45 },
    { id: 'magma_fire',    name: 'Magma Flame',   icon: '🔥', hex: '#FF3D00', glow: '#FF9100', cost: 50 },
    { id: 'slime_green',   name: 'Toxic Dino',    icon: '🧪', hex: '#76FF03', glow: '#00E676', cost: 45 },
    { id: 'galaxy_purple', name: 'Galaxy Void',   icon: '🔮', hex: '#D500F9', glow: '#651FFF', cost: 55 }
  ],
  effects: [
    { id: 'sparkles',      name: 'Starlight Shimmer', icon: '⭐', desc: 'Glittering stars around the ball', cost: 0 },
    { id: 'sonic_rings',   name: 'Sonic Boom Rings',  icon: '💫', desc: 'Expanding supersonic shockwaves',  cost: 40 },
    { id: 'rocket_boost',  name: 'Afterburner Jets',  icon: '🚀', desc: 'Blazing rocket exhaust cones',      cost: 50 },
    { id: 'lightning_arc', name: 'Thunder Arc',       icon: '⚡', desc: 'Crackling electric lightning',      cost: 55 },
    { id: 'magic_bubbles', name: 'Prism Bubbles',     icon: '🫧', desc: 'Pop-able colorful soap bubbles',   cost: 40 },
    { id: 'confetti_pop',  name: 'Confetti Cannon',    icon: '🎉', desc: 'Celebration confetti burst',       cost: 60 }
  ],
  trails: [
    { id: 'white',     name: 'Classic Cloud',    icon: '💨', cost: 0 },
    { id: 'rainbow',   name: 'Rainbow Sparkle',  icon: '🌈', cost: 25 },
    { id: 'flame',     name: 'Rocket Flame',     icon: '🔥', cost: 35 },
    { id: 'bubble',    name: 'Bubble Pop',       icon: '🫧', cost: 45 },
    { id: 'lightning', name: 'Cyber Lightning',  icon: '⚡', cost: 60 }
  ],
  pets: [
    { id: 'puppy',     name: 'Golden Puppy Caddy', icon: '🐶', cost: 0 },
    { id: 'baby_dino', name: 'Baby T-Rex Caddy',   icon: '🦖', cost: 30 },
    { id: 'robot',     name: 'Beep-Boop Bot',      icon: '🤖', cost: 45 },
    { id: 'parrot',    name: 'Pirate Parrot',      icon: '🦜', cost: 60 }
  ]
};

export const MINIGOLF_BALL_COLORS = [
  { id: 'yellow', name: 'Sunny Yellow',   hex: '#FFD600', stroke: '#F57F17' },
  { id: 'cyan',   name: 'Electric Blue',  hex: '#00E5FF', stroke: '#00838F' },
  { id: 'pink',   name: 'Neon Pink',      hex: '#FF4081', stroke: '#AD1457' },
  { id: 'green',  name: 'Slime Green',    hex: '#00E676', stroke: '#1B5E20' },
  { id: 'orange', name: 'Lava Orange',    hex: '#FF6D00', stroke: '#BF360C' },
  { id: 'purple', name: 'Cosmic Purple',  hex: '#D500F9', stroke: '#6A1B9A' },
  { id: 'red',    name: 'Rocket Red',     hex: '#FF1744', stroke: '#B71C1C' },
  { id: 'white',  name: 'Classic White',  hex: '#FFFFFF', stroke: '#455A64' }
];

export const MINIGOLF_CLUB_COLORS = [
  { id: 'gold',   name: 'Champion Gold',  hex: '#FFD600', shaft: '#FFF59D', stroke: '#E65100' },
  { id: 'cyan',   name: 'Cyber Blue',     hex: '#00E5FF', shaft: '#B2EBF2', stroke: '#006064' },
  { id: 'red',    name: 'Flame Red',      hex: '#FF1744', shaft: '#FFCDD2', stroke: '#880E4F' },
  { id: 'green',  name: 'Dino Green',     hex: '#00E676', shaft: '#B9F6CA', stroke: '#1B5E20' },
  { id: 'purple', name: 'Galaxy Purple',  hex: '#D500F9', shaft: '#E1BEE7', stroke: '#4A148C' },
  { id: 'pink',   name: 'Candy Pink',     hex: '#FF4081', shaft: '#F8BBD0', stroke: '#880E4F' },
  { id: 'orange', name: 'Magma Orange',   hex: '#FF6D00', shaft: '#FFE0B2', stroke: '#BF360C' },
  { id: 'silver', name: 'Pro Silver',     hex: '#ECEFF1', shaft: '#CFD8DC', stroke: '#37474F' }
];

const DEFAULT_DATA = {
  settings: {
    difficultyLevel: 'kindergarten', // 'kindergarten' | 'grade1' | 'grade2'
    mathMode: 'starter',
    adaptiveDifficulty: true,        // Gradually steps up on streaks & eases down on misses
    adaptiveScore: 1,                // 0..9 continuous mastery index
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    voiceEnabled: true,
    sfxEnabled: true,
    wifiCacheEnabled: true,
    calcAdvancedOps: false           // Parental controls toggle for × and ÷ on talking calculator
  },
  coins: 30,
  unlockedShop: {
    balls: ['classic'],
    tracers: ['classic_white'],
    effects: ['sparkles'],
    trails: ['white'],
    pets: ['puppy']
  },
  equipped: {
    ball: 'classic',
    tracer: 'classic_white',
    effect: 'sparkles',
    trail: 'white',
    pet: 'puppy',
    ballColor: 'yellow',
    clubColor: 'gold'
  },
  courseRecords: {
    tropical: { bestStrokes: null, par: 19, star: null, completions: 0 },
    dino:     { bestStrokes: null, par: 16, star: null, completions: 0 },
    cyber:    { bestStrokes: null, par: 20, star: null, completions: 0 },
    canyon:   { bestStrokes: null, par: 17, star: null, completions: 0 },
    full18:   { bestStrokes: null, par: 72, star: null, completions: 0 }
  },
  miniGolfLeaderboard: {
    bestRoundStrokes: null,
    par: 18,
    star: null,
    holeBestStrokes: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null },
    topRounds: [] // [{ strokes, par, star, dateLabel, difficulty }]
  },
  holeBestStrokes: {},
  stats: {
    totalStrokes: 0,
    holesCompleted: 0,
    holesInOne: 0,
    eagles: 0,
    birdies: 0,
    pars: 0,
    mishapsTriggered: 0,
    bonusTargetsHit: 0
  },
  trophies: {
    first_tee:       { id: 'first_tee',       title: 'Rookie Golfer',     desc: 'Finish your very first hole!',            icon: '⛳', unlocked: false },
    hole_in_one:     { id: 'hole_in_one',     title: 'Ace Wonder!',       desc: 'Score a magical Hole in One!',            icon: '🎆', unlocked: false },
    mega_crusher:    { id: 'mega_crusher',    title: 'Mega Crusher',      desc: 'Launch a 500+ yard Mega Power Drive!',   icon: '🚀', unlocked: false },
    eagle_soar:      { id: 'eagle_soar',      title: 'Golden Eagle',      desc: 'Score an Eagle (2 under Par)!',           icon: '🦅', unlocked: false },
    birdie_buddy:    { id: 'birdie_buddy',    title: 'Bluebird Buddy',    desc: 'Score a Birdie (1 under Par)!',           icon: '🐦', unlocked: false },
    tropical_star:   { id: 'tropical_star',   title: 'Coconut King',      desc: 'Complete Tropical Resort (Holes 1-5)!',   icon: '🌴', unlocked: false },
    dino_star:       { id: 'dino_star',       title: 'Dino Tamer',        desc: 'Complete Dinosaur Valley (Holes 6-9)!',   icon: '🦖', unlocked: false },
    cyber_star:      { id: 'cyber_star',      title: 'Cyber Striker',     desc: 'Complete Cyber City (Holes 10-14)!',      icon: '🛸', unlocked: false },
    canyon_star:     { id: 'canyon_star',     title: 'Canyon Legend',     desc: 'Complete Canyon Gorge (Holes 15-18)!',    icon: '🏜️', unlocked: false },
    rescue_hero:     { id: 'rescue_hero',     title: 'Rescue Hero',       desc: 'Recover from 3 funny slapstick hazards!', icon: '🛟', unlocked: false },
    base10_builder:  { id: 'base10_builder',  title: 'Base-10 Builder',   desc: 'Hit a drive in 1st/2nd Grade Place Value!', icon: '🧮', unlocked: false },
    minigolf_master: { id: 'minigolf_master', title: 'Carnival King',     desc: 'Complete all 9 Wacky Mini-Golf holes!',   icon: '🎡', unlocked: false }
  }
};

export class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
        coins: typeof parsed.coins === 'number' ? parsed.coins : DEFAULT_DATA.coins,
        unlockedShop: {
          balls: (parsed.unlockedShop && parsed.unlockedShop.balls) || ['classic'],
          tracers: (parsed.unlockedShop && parsed.unlockedShop.tracers) || ['classic_white'],
          effects: (parsed.unlockedShop && parsed.unlockedShop.effects) || ['sparkles'],
          trails: (parsed.unlockedShop && parsed.unlockedShop.trails) || ['white'],
          pets: (parsed.unlockedShop && parsed.unlockedShop.pets) || ['puppy']
        },
        equipped: { ...DEFAULT_DATA.equipped, ...(parsed.equipped || {}) },
        courseRecords: { ...DEFAULT_DATA.courseRecords, ...(parsed.courseRecords || {}) },
        miniGolfLeaderboard: {
          ...DEFAULT_DATA.miniGolfLeaderboard,
          ...(parsed.miniGolfLeaderboard || {}),
          holeBestStrokes: {
            ...DEFAULT_DATA.miniGolfLeaderboard.holeBestStrokes,
            ...((parsed.miniGolfLeaderboard && parsed.miniGolfLeaderboard.holeBestStrokes) || {})
          },
          topRounds: (parsed.miniGolfLeaderboard && parsed.miniGolfLeaderboard.topRounds) || []
        },
        holeBestStrokes: { ...(parsed.holeBestStrokes || {}) },
        stats: { ...DEFAULT_DATA.stats, ...(parsed.stats || {}) },
        trophies: this._mergeTrophies(parsed.trophies || {})
      };
    } catch (err) {
      console.warn('Storage load fallback:', err);
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  _mergeTrophies(savedTrophies) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_DATA.trophies));
    for (const key of Object.keys(merged)) {
      if (savedTrophies[key] && savedTrophies[key].unlocked) {
        merged[key].unlocked = true;
      }
    }
    return merged;
  }

  save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('Storage save error:', err);
    }
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(partial) {
    this.data.settings = { ...this.data.settings, ...partial };
    // Sync legacy mathMode flag & baseline adaptiveScore when difficultyLevel is explicitly set
    if (partial.difficultyLevel) {
      this.data.settings.mathMode =
        partial.difficultyLevel === 'kindergarten' ? 'starter' : 'advanced';
      if (partial.adaptiveScore === undefined) {
        const scoreMap = { kindergarten: 1, grade1: 4, grade2: 7 };
        this.data.settings.adaptiveScore = scoreMap[partial.difficultyLevel] ?? 1;
        this.data.settings.consecutiveCorrect = 0;
        this.data.settings.consecutiveWrong = 0;
      }
    }
    this.save();
    return this.data.settings;
  }

  cycleDifficultyLevel() {
    const order = ['kindergarten', 'grade1', 'grade2'];
    const curr = this.data.settings.difficultyLevel || 'kindergarten';
    const next = order[(order.indexOf(curr) + 1) % order.length];
    this.updateSettings({ difficultyLevel: next });
    return next;
  }

  toggleCalcAdvancedOps() {
    const curr = Boolean(this.data.settings.calcAdvancedOps);
    this.updateSettings({ calcAdvancedOps: !curr });
    return !curr;
  }

  /**
   * Natural, gradual Adaptive Difficulty Progression:
   * - Steps up adaptiveScore (0..9) after 3 consecutive correct answers.
   * - Steps down adaptiveScore after 2 consecutive incorrect answers (or 1 if struggling).
   * - Automatically syncs difficultyLevel ('kindergarten' 0..3, 'grade1' 4..6, 'grade2' 7..9).
   */
  recordAnswerOutcome(isCorrect) {
    const s = this.data.settings;
    if (s.adaptiveDifficulty === false) {
      return { levelChanged: false, difficultyLevel: s.difficultyLevel, adaptiveScore: s.adaptiveScore || 1 };
    }

    let score = typeof s.adaptiveScore === 'number' ? s.adaptiveScore : 1;
    let cRight = s.consecutiveCorrect || 0;
    let cWrong = s.consecutiveWrong || 0;
    const prevLevel = s.difficultyLevel || 'kindergarten';

    if (isCorrect) {
      cRight += 1;
      cWrong = 0;
      // Step up gradually every 3 consecutive correct answers!
      if (cRight >= 3) {
        score = Math.min(9, score + 1);
        cRight = 0;
      }
    } else {
      cWrong += 1;
      cRight = 0;
      // Step down gently if Luka misses 2 in a row (or immediately if at high sub-tier)
      if (cWrong >= 2 || (cWrong >= 1 && score > 1)) {
        score = Math.max(0, score - 1);
        cWrong = 0;
      }
    }

    let nextLevel = 'kindergarten';
    if (score >= 7) {
      nextLevel = 'grade2';
    } else if (score >= 4) {
      nextLevel = 'grade1';
    }

    s.adaptiveScore = score;
    s.consecutiveCorrect = cRight;
    s.consecutiveWrong = cWrong;
    s.difficultyLevel = nextLevel;
    s.mathMode = nextLevel === 'kindergarten' ? 'starter' : 'advanced';
    this.save();

    return {
      levelChanged: nextLevel !== prevLevel,
      difficultyLevel: nextLevel,
      adaptiveScore: score
    };
  }

  setMiniGolfColors({ ballColor, clubColor }) {
    if (ballColor) {
      this.data.equipped.ballColor = ballColor;
    }
    if (clubColor) {
      this.data.equipped.clubColor = clubColor;
    }
    this.save();
    return this.data.equipped;
  }

  addCoins(amount) {
    this.data.coins = Math.max(0, (this.data.coins || 0) + amount);
    this.save();
    return this.data.coins;
  }

  buyOrEquipShopItem(category, itemId, cost) {
    const list = this.data.unlockedShop[category] || [];
    const equipKeyMap = {
      balls: 'ball',
      tracers: 'tracer',
      effects: 'effect',
      trails: 'trail',
      pets: 'pet'
    };
    const equipKey = equipKeyMap[category] || 'ball';

    if (list.includes(itemId)) {
      this.data.equipped[equipKey] = itemId;
      this.save();
      return { ok: true, action: 'equipped' };
    }

    if (this.data.coins < cost) {
      return { ok: false, reason: 'not_enough_coins' };
    }

    this.data.coins -= cost;
    list.push(itemId);
    this.data.unlockedShop[category] = list;
    this.data.equipped[equipKey] = itemId;
    this.save();
    return { ok: true, action: 'purchased' };
  }

  unlockTrophy(trophyId) {
    if (this.data.trophies[trophyId] && !this.data.trophies[trophyId].unlocked) {
      this.data.trophies[trophyId].unlocked = true;
      this.save();
      return this.data.trophies[trophyId];
    }
    return null;
  }

  recordMishap() {
    this.data.stats.mishapsTriggered += 1;
    let newlyUnlocked = null;
    if (this.data.stats.mishapsTriggered >= 3) {
      newlyUnlocked = this.unlockTrophy('rescue_hero');
    }
    this.save();
    return newlyUnlocked;
  }

  /**
   * Records a single Wacky Mini-Golf hole score and updates hole personal bests.
   */
  recordMiniGolfHole(holeNumber, strokes) {
    const mg = this.data.miniGolfLeaderboard;
    const prev = mg.holeBestStrokes[holeNumber];
    const isHoleRecord = prev === null || prev === undefined || strokes < prev;
    if (isHoleRecord) {
      mg.holeBestStrokes[holeNumber] = strokes;
    }
    this.save();
    return isHoleRecord;
  }

  /**
   * Records a full 6-hole Wacky Mini-Golf round on Luka's Mini-Golf Leaderboard!
   */
  recordMiniGolfRound(totalStrokes, totalPar = 12) {
    const mg = this.data.miniGolfLeaderboard;
    const isNewRecord = mg.bestRoundStrokes === null || totalStrokes < mg.bestRoundStrokes;
    if (isNewRecord) {
      mg.bestRoundStrokes = totalStrokes;
    }

    let earnedStar = 'bronze';
    if (totalStrokes < totalPar) {
      earnedStar = 'gold';
    } else if (totalStrokes === totalPar) {
      earnedStar = 'silver';
    }

    const starRank = { null: 0, bronze: 1, silver: 2, gold: 3 };
    if (starRank[earnedStar] > starRank[mg.star]) {
      mg.star = earnedStar;
    }

    const diffLevel = this.data.settings.difficultyLevel || 'kindergarten';
    const diffMeta = DIFFICULTY_LEVELS[diffLevel] || DIFFICULTY_LEVELS.kindergarten;
    const now = new Date();
    const dateLabel = `${now.toLocaleString('en-US', { month: 'short' })} ${now.getDate()}`;

    mg.topRounds.push({
      strokes: totalStrokes,
      par: totalPar,
      star: earnedStar,
      dateLabel,
      difficulty: diffMeta.shortLabel
    });

    // Sort Leaderboard by lowest strokes first and keep Top 6 entries
    mg.topRounds.sort((a, b) => a.strokes - b.strokes);
    mg.topRounds = mg.topRounds.slice(0, 6);

    const unlockedTrophy = this.unlockTrophy('minigolf_master');
    this.save();

    return {
      earnedStar,
      bestRoundStrokes: mg.bestRoundStrokes,
      isNewRecord,
      unlockedTrophy
    };
  }

  recordHoleScore(holeNumber, strokes, par) {
    const diff = strokes - par;
    this.data.stats.totalStrokes += strokes;
    this.data.stats.holesCompleted += 1;

    const prevBest = this.data.holeBestStrokes[holeNumber];
    if (!prevBest || strokes < prevBest) {
      this.data.holeBestStrokes[holeNumber] = strokes;
    }

    const unlocked = [];
    const firstTee = this.unlockTrophy('first_tee');
    if (firstTee) unlocked.push(firstTee);

    if (strokes === 1) {
      this.data.stats.holesInOne += 1;
      const t = this.unlockTrophy('hole_in_one');
      if (t) unlocked.push(t);
    } else if (diff <= -2) {
      this.data.stats.eagles += 1;
      const t = this.unlockTrophy('eagle_soar');
      if (t) unlocked.push(t);
    } else if (diff === -1) {
      this.data.stats.birdies += 1;
      const t = this.unlockTrophy('birdie_buddy');
      if (t) unlocked.push(t);
    } else if (diff === 0) {
      this.data.stats.pars += 1;
    }

    this.save();
    return unlocked;
  }

  recordCourseCompletion(courseKey, totalStrokes, totalPar) {
    const record = this.data.courseRecords[courseKey] || {
      bestStrokes: null,
      par: totalPar,
      star: null,
      completions: 0
    };

    record.completions += 1;
    record.par = totalPar;

    const isNewRecord = record.bestStrokes === null || totalStrokes < record.bestStrokes;
    if (isNewRecord) {
      record.bestStrokes = totalStrokes;
    }

    let earnedStar = 'bronze';
    if (totalStrokes < totalPar) {
      earnedStar = 'gold';
    } else if (totalStrokes === totalPar) {
      earnedStar = 'silver';
    }

    const starRank = { null: 0, bronze: 1, silver: 2, gold: 3 };
    if (starRank[earnedStar] > starRank[record.star]) {
      record.star = earnedStar;
    }

    this.data.courseRecords[courseKey] = record;

    const trophyMap = {
      tropical: 'tropical_star',
      dino: 'dino_star',
      cyber: 'cyber_star',
      canyon: 'canyon_star'
    };
    if (trophyMap[courseKey]) {
      this.unlockTrophy(trophyMap[courseKey]);
    }

    this.save();
    return {
      earnedStar,
      bestStar: record.star,
      bestStrokes: record.bestStrokes,
      isNewRecord
    };
  }

  resetAllProgress() {
    const currentSettings = { ...this.data.settings };
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.data.settings = currentSettings;
    this.save();
    return this.data;
  }
}
