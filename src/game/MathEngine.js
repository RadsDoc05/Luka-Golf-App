/**
 * MathEngine.js
 * Age-Appropriate Concrete Golf Math Engine (Kindergarten / 1st Grade / 2nd Grade+ Levels).
 *
 * Features:
 *   1. Rich procedural + curated variety of 3-digit yardages and equations (with anti-repeat history)
 *   2. Exact equation-specific audio keys (e.g. `eq_5_plus_2_eq_7`) so audio NEVER says the wrong addends
 *   3. Concrete Addition, Intuitive Take-Away Subtraction, and Missing-Addend puzzles
 */

const ONES_WORDS = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS_WORDS_ARRAY = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

const EXACT_DRIVING_YARDAGES = [
  234, 127, 345, 182, 269, 415, 158, 372, 246, 139, 318, 427, 291, 164, 353, 219, 482, 176,
  143, 258, 367, 412, 195, 284, 329, 461, 136, 275, 394, 438, 167, 241, 386, 452, 118, 307
];

// Anti-repeat history so Luka gets fresh numbers & equations every turn
const recentKeys = [];
function rememberAndCheckRecent(key, maxHistory = 10) {
  const isRecent = recentKeys.includes(key);
  recentKeys.push(key);
  if (recentKeys.length > maxHistory) {
    recentKeys.shift();
  }
  return isRecent;
}

export const MINIGOLF_HOLES = [
  {
    number: 1,
    name: 'Spinning Windmill Tunnel',
    obstacleType: 'windmill',
    par: 2,
    description: 'Solve the equation to roll through the spinning windmill door into the tunnel!'
  },
  {
    number: 2,
    name: 'Rainbow 3-Tunnel Coaster',
    obstacleType: 'pipe_coaster',
    par: 2,
    description: 'Zoom through three underground rainbow tunnels right to the cup!'
  },
  {
    number: 3,
    name: 'T-Rex Jaw & Bone Bridge',
    obstacleType: 'dino_jaw',
    par: 2,
    description: 'Roll into the T-Rex mouth tunnel and rattle across the xylophone bone bridge!'
  },
  {
    number: 4,
    name: 'Space Portal Warp Tubes',
    obstacleType: 'warp_portals',
    par: 2,
    description: 'Enter the Blue Warp Tunnel and teleport out of the Pink Portal!'
  },
  {
    number: 5,
    name: 'Volcano Pinball Bumpers',
    obstacleType: 'pinball_bumpers',
    par: 2,
    description: 'Shoot through the lava tunnel and bounce off 3 glowing pinball bumpers!'
  },
  {
    number: 6,
    name: 'Pirate Cannon Cave',
    obstacleType: 'pirate_cannon',
    par: 2,
    description: 'Roll into the treasure cave tunnel and fire out of the pirate cannon into the cup!'
  },
  {
    number: 7,
    name: 'Shark Mouth Whirlpool',
    obstacleType: 'shark_whirlpool',
    par: 2,
    description: 'Dodge the chomping great white shark and swirl into the cyan whirlpool pipe!'
  },
  {
    number: 8,
    name: 'Space Rocket Launchpad',
    obstacleType: 'space_rocket',
    par: 2,
    description: 'Blast into the rocket booster tunnel and launch through the stars into the cup!'
  },
  {
    number: 9,
    name: 'Ice Cream Mountain',
    obstacleType: 'ice_cream_mountain',
    par: 2,
    description: 'Spiral down the giant sundae slide and drop through the cherry chute into the cup!'
  }
];

export class MathEngine {
  /**
   * Converts ANY integer (including exact 3-digit yardages, thousands, and millions)
   * into natural spoken English words ("One thousand", "Two hundred and thirty-four").
   */
  static numberToWords(num) {
    const n = Math.round(Number(num));
    if (isNaN(n)) return `${num}`;
    if (n < 0) return `negative ${this.numberToWords(Math.abs(n)).toLowerCase()}`;
    if (n === 0) return 'zero';

    const helper = (val) => {
      if (val < 20) return ONES_WORDS[val];
      if (val < 100) {
        const t = Math.floor(val / 10);
        const o = val % 10;
        return o ? `${TENS_WORDS_ARRAY[t]}-${ONES_WORDS[o]}` : TENS_WORDS_ARRAY[t];
      }
      if (val < 1000) {
        const h = Math.floor(val / 100);
        const rem = val % 100;
        const hPart = `${ONES_WORDS[h]} hundred`;
        if (rem === 0) return hPart;
        return `${hPart} and ${helper(rem)}`;
      }
      if (val < 1000000) {
        const th = Math.floor(val / 1000);
        const rem = val % 1000;
        const thPart = `${helper(th)} thousand`;
        if (rem === 0) return thPart;
        if (rem < 100) return `${thPart} and ${helper(rem)}`;
        return `${thPart} ${helper(rem)}`;
      }
      if (val < 1000000000) {
        const m = Math.floor(val / 1000000);
        const rem = val % 1000000;
        const mPart = `${helper(m)} million`;
        if (rem === 0) return mPart;
        if (rem < 100) return `${mPart} and ${helper(rem)}`;
        return `${mPart} ${helper(rem)}`;
      }
      return `${val}`;
    };

    const res = helper(n).trim();
    return res.charAt(0).toUpperCase() + res.slice(1);
  }

  /**
   * Picks a varied 3-digit yardage from the curated list + procedural combinations, avoiding recent repeats.
   */
  static _pickVaried3DigitYardage(shotCounter = 0) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const idx = (shotCounter * 5 + Math.floor(Math.random() * EXACT_DRIVING_YARDAGES.length)) % EXACT_DRIVING_YARDAGES.length;
      const candidate = EXACT_DRIVING_YARDAGES[idx];
      if (!recentKeys.includes(`yd_${candidate}`) || attempt === 7) {
        rememberAndCheckRecent(`yd_${candidate}`);
        return candidate;
      }
    }
    return EXACT_DRIVING_YARDAGES[shotCounter % EXACT_DRIVING_YARDAGES.length];
  }

  /**
   * Generates a rich, non-repeating equation (`+`, `-`, or `missing`) scaled to `difficultyLevel` and `adaptiveScore`.
   */
  static _generateVariedEquation(difficultyLevel = 'kindergarten', allowMissing = true, forceOp = null, adaptiveScore = 1) {
    const isEasyStarter = difficultyLevel === 'kindergarten' && adaptiveScore <= 0;
    const ops = forceOp
      ? [forceOp]
      : isEasyStarter
      ? ['+', '+', '-']
      : allowMissing
      ? ['+', '-', '+', '-', 'missing']
      : ['+', '-'];

    for (let attempt = 0; attempt < 12; attempt++) {
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b, ans, total;

      if (difficultyLevel === 'grade2') {
        const boost = Math.max(0, adaptiveScore - 7); // 0..2
        if (op === '+') {
          a = 5 + Math.floor(Math.random() * (7 + boost * 2));
          b = 4 + Math.floor(Math.random() * (6 + boost * 2));
          ans = a + b;
        } else if (op === '-') {
          a = 10 + Math.floor(Math.random() * (7 + boost * 2));
          b = 3 + Math.floor(Math.random() * (a - 4));
          ans = a - b;
        } else {
          a = 5 + Math.floor(Math.random() * 7);
          ans = 4 + Math.floor(Math.random() * 7);
          total = a + ans;
          b = ans;
        }
      } else if (difficultyLevel === 'grade1') {
        const boost = Math.max(0, adaptiveScore - 4); // 0..2
        if (op === '+') {
          a = 3 + Math.floor(Math.random() * (5 + boost));
          b = 2 + Math.floor(Math.random() * (5 + boost));
          ans = a + b;
        } else if (op === '-') {
          a = 6 + Math.floor(Math.random() * (5 + boost * 2));
          b = 2 + Math.floor(Math.random() * (a - 3));
          ans = a - b;
        } else {
          a = 3 + Math.floor(Math.random() * 5);
          ans = 2 + Math.floor(Math.random() * 5);
          total = a + ans;
          b = ans;
        }
      } else if (isEasyStarter) {
        // Gentle confidence-builder tier when Luka misses answers (small numbers 1..4)
        if (op === '+') {
          a = 1 + Math.floor(Math.random() * 3); // 1..3
          b = 1 + Math.floor(Math.random() * 3); // 1..3
          ans = a + b;
        } else {
          a = 3 + Math.floor(Math.random() * 3); // 3..5
          b = 1 + Math.floor(Math.random() * Math.min(2, a - 1)); // 1..2
          ans = a - b;
        }
      } else {
        // Kindergarten: concrete numbers scaling with adaptiveScore (1..3)
        const maxAdd = Math.min(6, 3 + adaptiveScore);
        if (op === '+') {
          a = 1 + Math.floor(Math.random() * maxAdd);
          b = 1 + Math.floor(Math.random() * Math.max(3, maxAdd - 1));
          ans = a + b;
        } else if (op === '-') {
          a = 3 + Math.floor(Math.random() * (4 + adaptiveScore));
          b = 1 + Math.floor(Math.random() * Math.min(4, a - 1));
          ans = a - b;
        } else {
          a = 2 + Math.floor(Math.random() * 4);
          ans = 1 + Math.floor(Math.random() * 4);
          total = a + ans;
          b = ans;
        }
      }

      const sig = op === 'missing' ? `eq_m_${a}_${total}` : `eq_${a}_${op}_${b}`;
      if (!recentKeys.includes(sig) || attempt === 11) {
        rememberAndCheckRecent(sig);
        return { a, b, op, ans, total: total || ans };
      }
    }

    return { a: 3, b: 2, op: '+', ans: 5, total: 5 };
  }

  // ==========================================================================
  // DRIVING RANGE CHALLENGE GENERATOR (SCALES WITH KINDERGARTEN / 1ST / 2ND GRADE + ADAPTIVE SCORE)
  // ==========================================================================
  static createDrivingRangeChallenge(rangeMode = 'exact_3digit', shotCounter = 0, difficultyLevel = 'kindergarten', adaptiveScore = 1) {
    const effectiveMode =
      rangeMode === 'mix'
        ? ['exact_3digit', 'place_value_3digit', 'basic_math'][shotCounter % 3]
        : rangeMode;

    // Mode 1: Exact 3-Digit Number Recognition (234, 127, 345, etc.)
    if (effectiveMode === 'exact_3digit') {
      const baseTarget = this._pickVaried3DigitYardage(shotCounter);

      // In 2nd Grade+, add a 3-digit mental math jump (+10, +20, or +30)!
      if (difficultyLevel === 'grade2') {
        const jumps = [10, 20, 30, 40];
        const jump = jumps[shotCounter % jumps.length];
        const target = baseTarget + jump;
        const d1 = baseTarget - 10;
        const d2 = target + 100;
        const options = this._shuffle([target, d1, d2]);
        return {
          tier: 'driving_range',
          subMode: 'exact_3digit',
          targetValue: target,
          targetYards: target,
          unit: 'Yards',
          options,
          promptTitle: `🏆 2nd Grade Pro: ${baseTarget} + ${jump} = ? Yards!`,
          spokenPrompt: `${baseTarget} plus ${jump}! What is ${baseTarget} plus ${jump} yards?`,
          spokenPromptKey: `dr_mental_${baseTarget}_plus_${jump}`,
          successAudioText: `${baseTarget} plus ${jump} equals ${target} yards!`,
          successAudioKey: `dr_mental_ok_${baseTarget}_plus_${jump}_eq_${target}`
        };
      }

      const target = baseTarget;
      const h = Math.floor(target / 100);
      const t = Math.floor((target % 100) / 10);
      const o = target % 10;

      const swappedTensOnes = h * 100 + o * 10 + t;
      const d1 = swappedTensOnes !== target ? swappedTensOnes : target + 12;
      const d2 = h > 1 ? (h - 1) * 100 + t * 10 + o : (h + 1) * 100 + t * 10 + o;
      const options = this._shuffle([target, d1, d2]);
      const words = this.numberToWords(target);

      return {
        tier: 'driving_range',
        subMode: 'exact_3digit',
        targetValue: target,
        targetYards: target,
        unit: 'Yards',
        options,
        promptTitle: `🎯 Target @ ${target} Yards! Tap "${words}"!`,
        spokenPrompt: `Tap ${target}! Find ${words.toLowerCase()} yards!`,
        spokenPromptKey: `dr_exact_${target}`,
        successAudioText: `${words} yards!`,
        successAudioKey: `num_${target}`
      };
    }

    // Mode 2: 3-Digit Expanded Place-Value Builder (e.g. 200 + 30 + 4 = 234)
    if (effectiveMode === 'place_value_3digit') {
      const target = this._pickVaried3DigitYardage(shotCounter + 3);
      const h = Math.floor(target / 100) * 100;
      const t = Math.floor((target % 100) / 10) * 10;
      const o = target % 10;

      const d1 = h + o * 10 + Math.floor(t / 10);
      const d2 = (h === 200 ? 300 : 200) + t + o;
      const options = this._shuffle([target, d1 !== target ? d1 : target + 10, d2]);
      const words = this.numberToWords(target);

      return {
        tier: 'driving_range',
        subMode: 'place_value_3digit',
        targetValue: target,
        targetYards: target,
        placeParts: [h, t, o],
        unit: 'Yards',
        options,
        promptTitle: `🧱 Place Value Target: ${h} + ${t} + ${o} = ? Yards`,
        spokenPrompt: `${h} plus ${t} plus ${o}! Tap the total yards!`,
        spokenPromptKey: `dr_pv_${h}_${t}_${o}`,
        successAudioText: `${h} plus ${t} plus ${o} makes ${words.toLowerCase()} yards!`,
        successAudioKey: `dr_pv_ok_${h}_${t}_${o}_eq_${target}`
      };
    }

    // Mode 3: Basic Math Target Blaster (Addition & Subtraction with rich variety!)
    const eq = this._generateVariedEquation(difficultyLevel, false, null, adaptiveScore);
    const yds = this._pickVaried3DigitYardage(shotCounter);
    const distractors = this._pickDistractors(eq.ans, 1, 24);
    const options = this._shuffle([eq.ans, distractors[0], distractors[1]]);
    const opWord = eq.op === '+' ? 'plus' : 'minus';

    return {
      tier: 'driving_range',
      subMode: 'basic_math',
      targetValue: eq.ans,
      targetYards: yds,
      equation: { ...eq, yds },
      unit: 'Power',
      options,
      promptTitle: `🚀 Math Target Blaster: ${eq.a} ${eq.op} ${eq.b} = ?`,
      spokenPrompt: eq.op === '-'
        ? `${eq.a} take away ${eq.b}! How many are left?`
        : `${eq.a} plus ${eq.b}! What is ${eq.a} plus ${eq.b}?`,
      spokenPromptKey: `dr_math_${eq.a}_${opWord}_${eq.b}`,
      successAudioText: `${eq.a} ${opWord} ${eq.b} equals ${eq.ans}!`,
      successAudioKey: `eq_${eq.a}_${opWord}_${eq.b}_eq_${eq.ans}`
    };
  }

  // ==========================================================================
  // WACKY MINI-GOLF COURSE CHALLENGE GENERATOR (RICH EQUATION VARIETY!)
  // ==========================================================================
  static createMiniGolfChallenge(holeIndex = 0, attemptCount = 0, difficultyLevel = 'kindergarten', adaptiveScore = 1) {
    const holeMeta = MINIGOLF_HOLES[holeIndex % MINIGOLF_HOLES.length];

    // Give a fun mix of Addition, Subtraction, and Missing Addend across the 6 holes
    const preferredOps = adaptiveScore <= 0
      ? ['+', '+', '-', '+', '+', '-']
      : ['+', '+', '-', 'missing', '+', '-'];
    const preferredOp = preferredOps[(holeIndex + attemptCount) % preferredOps.length];
    const item = this._generateVariedEquation(difficultyLevel, adaptiveScore > 0, preferredOp, adaptiveScore);

    const distractors = this._pickDistractors(item.ans, 1, 22);
    const options = this._shuffle([item.ans, distractors[0], distractors[1]]);

    if (item.op === 'missing') {
      return {
        tier: 'minigolf',
        subMode: 'missing_addend',
        holeMeta,
        equation: item,
        targetValue: item.ans,
        unit: 'Balls',
        options,
        promptTitle: `🎡 ${holeMeta.name}: ${item.a} + [ ? ] = ${item.total}`,
        spokenPrompt: `${item.a} plus what makes ${item.total}? Find the missing number!`,
        spokenPromptKey: `mg_missing_${item.a}_to_${item.total}`,
        successAudioText: `${item.a} plus ${item.ans} equals ${item.total}! Into the tunnel!`,
        successAudioKey: `eq_missing_${item.a}_plus_${item.ans}_eq_${item.total}`
      };
    }

    const opWord = item.op === '+' ? 'plus' : 'minus';
    return {
      tier: 'minigolf',
      subMode: item.op === '+' ? 'add' : 'subtract',
      holeMeta,
      equation: item,
      targetValue: item.ans,
      unit: 'Feet',
      options,
      promptTitle: `🎡 ${holeMeta.name}: ${item.a} ${item.op} ${item.b} = ?`,
      spokenPrompt: item.op === '-'
        ? `${item.a} take away ${item.b}! How many are left?`
        : `${item.a} plus ${item.b}! What is ${item.a} plus ${item.b}?`,
      spokenPromptKey: `mg_ask_${item.a}_${opWord}_${item.b}`,
      successAudioText: `${item.a} ${opWord} ${item.b} equals ${item.ans}! Watch it go!`,
      successAudioKey: `eq_${item.a}_${opWord}_${item.b}_eq_${item.ans}_go`
    };
  }

  // ==========================================================================
  // 18-HOLE GOLF COURSE CHALLENGE GENERATORS
  // ==========================================================================
  static createTeeChallenge(targetYards, mode = 'starter', isRescue = false, holeNumber = 1, difficultyLevel = 'kindergarten') {
    // Add slight hole-to-hole variety while respecting the hole's distance class
    const hundreds = Math.floor(targetYards / 100) * 100;
    const tensChoices = [20, 30, 40, 50, 60, 70, 80, 90];
    const baseTens = targetYards % 100 || 50;
    const tens = isRescue ? tensChoices[(holeNumber + Math.floor(Math.random() * 4)) % tensChoices.length] : baseTens;
    const normalizedTarget = hundreds + tens;

    // 2nd Grade+: 3-Digit Place Value Drive (e.g., 300 + 40 + 5 = 345)
    if (difficultyLevel === 'grade2') {
      const ones = ((holeNumber * 3 + Math.floor(Math.random() * 7)) % 8) + 1; // 1..8
      const exactTarget = hundreds + tens + ones;
      const d1 = hundreds + ones * 10 + Math.floor(tens / 10);
      const d2 = exactTarget + 20;
      const options = this._shuffle([exactTarget, d1 !== exactTarget ? d1 : exactTarget - 10, d2]);

      return {
        tier: 'tee',
        subMode: 'place_value_3digit',
        mode: 'starter',
        isRescue,
        targetValue: exactTarget,
        placeParts: [hundreds, tens, ones],
        unit: 'Yards',
        options,
        promptTitle: isRescue
          ? `🛟 2nd Grade Rescue: ${hundreds} + ${tens} + ${ones} = ? Yards!`
          : `🏆 2nd Grade Pro Drive: ${hundreds} + ${tens} + ${ones} = ? Yards!`,
        spokenPrompt: `${hundreds} plus ${tens} plus ${ones}! Tap the total yards!`,
        spokenPromptKey: `tee_g2_${hundreds}_${tens}_${ones}`,
        successAudioText: `${hundreds} plus ${tens} plus ${ones} equals ${exactTarget} yards!`,
        successAudioKey: `tee_g2_ok_${exactTarget}`
      };
    }

    if (mode === 'advanced' || difficultyLevel === 'grade1') {
      const allHundreds = [100, 200, 300, 400];
      const distractHundreds = this._shuffle(allHundreds.filter(h => h !== hundreds));
      const hundredsOptions = this._shuffle([hundreds, distractHundreds[0], distractHundreds[1]]);

      const allTens = [10, 20, 30, 40, 50, 60, 70, 80, 90];
      const distractTens = this._shuffle(allTens.filter(t => t !== tens));
      const tensOptions = this._shuffle([tens, distractTens[0], distractTens[1]]);

      const spokenWords = this.numberToWords(normalizedTarget);
      return {
        tier: 'tee',
        subMode: 'base10',
        mode: 'advanced',
        isRescue,
        targetValue: normalizedTarget,
        unit: 'Yards',
        targetHundreds: hundreds,
        targetTens: tens,
        hundredsOptions,
        tensOptions,
        promptTitle: isRescue
          ? `🛟 Rescue Drive: Build ${normalizedTarget} Yards!`
          : `🧮 Base-10 Drive: Build ${normalizedTarget} Yards!`,
        spokenPrompt: isRescue
          ? `Rescue! Tap ${hundreds} and ${tens} to build ${normalizedTarget}!`
          : `Build ${normalizedTarget}! Tap ${hundreds} and ${tens}!`,
        spokenPromptKey: `build_${normalizedTarget}`,
        mergeAudioText: `${spokenWords} yards!`,
        mergeAudioKey: `num_${normalizedTarget}`
      };
    }

    if (!isRescue && [2, 5, 8, 11, 14, 17].includes(holeNumber)) {
      const smaller1 = Math.max(105, normalizedTarget - 90 - (holeNumber % 3) * 10);
      const smaller2 = Math.max(100, normalizedTarget - 160 - (holeNumber % 2) * 20);
      const options = this._shuffle([normalizedTarget, smaller1, smaller2]);
      return {
        tier: 'tee',
        subMode: 'biggest',
        mode: 'starter',
        isRescue: false,
        targetValue: normalizedTarget,
        unit: 'Yards',
        options,
        promptTitle: `💪 Monster Drive! Tap the BIGGEST Number of Yards!`,
        spokenPrompt: `Tap the biggest number of yards!`,
        spokenPromptKey: `monster_drive_biggest`
      };
    }

    if (!isRescue && [4, 7, 10, 13, 16].includes(holeNumber)) {
      const trainSeq = [100, 200, 300, 400];
      const missingIdx = holeNumber % 3 === 0 ? 1 : holeNumber % 2 === 0 ? 2 : 3;
      const answerHundred = trainSeq[missingIdx];
      const options = this._shuffle([100, 200, 300, 400].filter(x => x !== answerHundred).slice(0, 2).concat(answerHundred));
      return {
        tier: 'tee',
        subMode: 'hundreds_train',
        mode: 'starter',
        isRescue: false,
        targetValue: answerHundred,
        trainSequence: trainSeq.slice(0, missingIdx + 1).map((v, idx) => (idx === missingIdx ? '?' : v)),
        unit: 'Yards',
        options,
        promptTitle: `🚂 Number Train! Count by 100s to Fill the Missing Car!`,
        spokenPrompt: `Count by hundreds! What number comes next?`,
        spokenPromptKey: `hundreds_train_prompt`
      };
    }

    const candidatePool = [120, 140, 150, 160, 170, 210, 230, 240, 250, 260, 280, 290, 310, 330, 350, 370, 380, 410, 420, 440]
      .filter(n => n !== normalizedTarget && Math.abs(n - normalizedTarget) >= 50);
    const picked = this._shuffle(candidatePool).slice(0, 2);
    const options = this._shuffle([normalizedTarget, picked[0], picked[1]]);

    return {
      tier: 'tee',
      subMode: 'match',
      mode: 'starter',
      isRescue,
      targetValue: normalizedTarget,
      unit: 'Yards',
      options,
      promptTitle: isRescue
        ? `🛟 Rescue Shot: Find the ${normalizedTarget}-Yard Club!`
        : `🏌️ Tee Shot: Find the ${normalizedTarget}-Yard Driver!`,
      spokenPrompt: isRescue
        ? `Rescue! Tap ${normalizedTarget}! Find ${normalizedTarget} yards!`
        : `Tap ${normalizedTarget}! Find ${normalizedTarget} yards!`,
      spokenPromptKey: isRescue ? `rescue_driver_${normalizedTarget}` : `find_driver_${normalizedTarget}`
    };
  }

  static createApproachChallenge(targetYards, isRescue = false, holeNumber = 1) {
    const clampedTarget = Math.min(60, Math.max(20, Math.round(targetYards / 10) * 10));

    if (!isRescue && holeNumber % 2 === 0) {
      const stones = [];
      const count = Math.max(4, clampedTarget / 10 + 1);
      for (let i = 1; i <= count; i++) {
        const val = i * 10;
        stones.push(val === clampedTarget ? '?' : val);
      }
      const distractors = this._shuffle([10, 20, 30, 40, 50, 60].filter(n => n !== clampedTarget)).slice(0, 2);
      const options = this._shuffle([clampedTarget, distractors[0], distractors[1]]);

      return {
        tier: 'approach',
        subMode: 'missing_ten',
        isRescue: false,
        targetValue: clampedTarget,
        stones,
        options,
        unit: 'Yards',
        promptTitle: `🌉 10s Bridge! Count by 10s to Find the Missing Stone!`,
        spokenPrompt: `Find the missing number! Count by tens across the bridge!`,
        spokenPromptKey: `bridge_tens_${clampedTarget}`
      };
    }

    const totalBlocks = 6;
    const stepsRequired = clampedTarget / 10;

    return {
      tier: 'approach',
      subMode: 'stepping_stones',
      isRescue,
      targetValue: clampedTarget,
      unit: 'Yards',
      stepSize: 10,
      maxSteps: totalBlocks,
      stepsRequired,
      promptTitle: isRescue
        ? `🛟 Rescue Approach: Tap +10 Blocks to Reach ${clampedTarget} Yards!`
        : `⛳ Approach Shot: Count by 10s to ${clampedTarget} Yards!`,
      spokenPrompt: isRescue
        ? `Count by tens to ${clampedTarget} yards! Tap plus ten!`
        : `Count by tens to ${clampedTarget} yards! Tap plus ten!`,
      spokenPromptKey: `approach_${clampedTarget}`
    };
  }

  static createPuttChallenge(targetFeet, addends = null, isRescue = false, holeNumber = 1, difficultyLevel = 'kindergarten', adaptiveScore = 1) {
    // Mix of Missing Addend (Fill Box), Subtraction Take-Away, and Concrete Addition!
    const puzzleRoll = adaptiveScore <= 0
      ? (holeNumber % 2 === 0 ? 2 : 1)
      : (holeNumber + (isRescue ? 1 : 0)) % 3;

    // 1. Fill the Golf Box (Missing Addend)
    if (!isRescue && puzzleRoll === 0) {
      const eq = this._generateVariedEquation(difficultyLevel, true, 'missing', adaptiveScore);
      const sum = eq.total;
      const filledSlots = eq.a;
      const emptySlots = eq.ans;
      const distractors = this._pickDistractors(emptySlots, 1, 12);
      const options = this._shuffle([emptySlots, distractors[0], distractors[1]]);

      return {
        tier: 'putt',
        subMode: 'fill_box',
        isRescue: false,
        targetValue: emptySlots,
        totalSlots: sum,
        filledSlots,
        emptySlots,
        unit: 'Balls',
        options,
        promptTitle: `📦 Fill the Golf Box! ${filledSlots} Inside — How Many MORE to Make ${sum}?`,
        spokenPrompt: `${filledSlots} plus what makes ${sum}? Tap the missing balls!`,
        spokenPromptKey: `fill_box_${filledSlots}_to_${sum}`,
        successAudioText: `${filledSlots} plus ${emptySlots} equals ${sum}! In the cup!`,
        successAudioKey: `eq_${filledSlots}_plus_${emptySlots}_eq_${sum}_cup`
      };
    }

    // 2. Concrete Subtraction Putt (Take-Away Golf Balls!)
    if (!isRescue && puzzleRoll === 1) {
      const eq = this._generateVariedEquation(difficultyLevel, false, '-', adaptiveScore);
      const distractors = this._pickDistractors(eq.ans, 1, 14);
      const options = this._shuffle([eq.ans, distractors[0], distractors[1]]);

      return {
        tier: 'putt',
        subMode: 'subtract_balls',
        isRescue: false,
        targetValue: eq.ans,
        unit: 'Feet',
        equation: eq,
        options,
        promptTitle: `🕳️ Putting Green Subtraction: ${eq.a} − ${eq.b} = ? Feet Left`,
        spokenPrompt: `${eq.a} take away ${eq.b}! How many are left?`,
        spokenPromptKey: `putt_sub_${eq.a}_take_away_${eq.b}`,
        successAudioText: `${eq.a} minus ${eq.b} equals ${eq.ans} feet!`,
        successAudioKey: `eq_${eq.a}_minus_${eq.b}_eq_${eq.ans}_ft`
      };
    }

    // 3. Concrete Addition Putt (Varied Addends!)
    const eq = this._generateVariedEquation(difficultyLevel, false, '+', adaptiveScore);
    const left = eq.a;
    const right = eq.b;
    const sum = eq.ans;
    const distractors = this._pickDistractors(sum, 2, 18);
    const options = this._shuffle([sum, distractors[0], distractors[1]]);

    return {
      tier: 'putt',
      subMode: 'add_balls',
      isRescue,
      targetValue: sum,
      unit: 'Feet',
      addends: [left, right],
      options,
      promptTitle: isRescue
        ? `🛟 Rescue Putt: Count the Golf Balls! ${left} + ${right} = ?`
        : `🕳️ Putting Green: Count the Balls! ${left} + ${right} = ? Feet`,
      spokenPrompt: `${left} plus ${right}! What is ${left} plus ${right} feet?`,
      spokenPromptKey: `putt_add_${left}_plus_${right}`,
      successAudioText: `${left} plus ${right} equals ${sum} feet!`,
      successAudioKey: `eq_${left}_plus_${right}_eq_${sum}_ft`
    };
  }

  static _pickDistractors(correctAns, minVal = 1, maxVal = 18) {
    const pool = [];
    for (let v = minVal; v <= Math.max(maxVal, correctAns + 5); v++) {
      if (v !== correctAns) pool.push(v);
    }
    // Prefer nearby distractors so choices are realistic
    const nearby = pool.filter(v => Math.abs(v - correctAns) <= 4);
    const source = nearby.length >= 2 ? nearby : pool;
    return this._shuffle(source).slice(0, 2);
  }

  static _shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
