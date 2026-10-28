/**
 * Courses.js
 * Defines the 4 themed courses and all 18 distinct holes for Luka's 18-Hole Golf Adventure.
 *
 * Themes:
 *   - Holes 1-5:   Tropical Resort (Palm trees, ocean water hazard, inflatable kiddie pool)
 *   - Holes 6-9:   Dinosaur Valley (T-Rex fossils, sleeping pterodactyl nests, volcano lava vents)
 *   - Holes 10-14: Cyber City      (Floating hovercars, neon light posts, glass traps)
 *   - Holes 15-18: Canyon Gorge    (Waterfalls, rickety rope bridges, red rock cliffs)
 */

export const COURSE_THEMES = {
  tropical: {
    id: 'tropical',
    name: 'Tropical Resort',
    subtitle: 'Holes 1–5 • Sunny Palms & Kiddie Pools',
    holeRange: [1, 5],
    icon: '🌴',
    accentColor: '#00BCD4',
    backdropSvg: 'courses/tropical.svg',
    parTotal: 19
  },
  dino: {
    id: 'dino',
    name: 'Dinosaur Valley',
    subtitle: 'Holes 6–9 • Pterodactyl Nests & Lava Vents',
    holeRange: [6, 9],
    icon: '🦖',
    accentColor: '#FF7043',
    backdropSvg: 'courses/dino.svg',
    parTotal: 16
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber City',
    subtitle: 'Holes 10–14 • Flying Hovercars & Neon Greens',
    holeRange: [10, 14],
    icon: '🛸',
    accentColor: '#00E5FF',
    backdropSvg: 'courses/cyber.svg',
    parTotal: 20
  },
  canyon: {
    id: 'canyon',
    name: 'Canyon Gorge',
    subtitle: 'Holes 15–18 • Rope Bridges & Waterfalls',
    holeRange: [15, 18],
    icon: '🏜️',
    accentColor: '#FFB300',
    backdropSvg: 'courses/canyon.svg',
    parTotal: 17
  }
};

export const HOLES = [
  // =========================================================================
  // COURSE 1: TROPICAL RESORT (Holes 1 - 5)
  // =========================================================================
  {
    number: 1,
    name: 'Coconut Kickoff',
    theme: 'tropical',
    par: 3,
    totalYards: 150,
    driveTargetYards: 120,
    approachTargetYards: 30,
    puttTargetFeet: 4,
    puttAddends: [2, 2],
    mishapType: 'kiddie_pool',
    mishapHeadline: 'BONK! SPLASH!',
    mishapText: 'Bounced off a coconut tree right into the inflatable kiddie pool!',
    mishapVoiceKey: 'mishap_kiddie_pool',
    pinOffsetX: 0
  },
  {
    number: 2,
    name: 'Cabana Breeze',
    theme: 'tropical',
    par: 4,
    totalYards: 280,
    driveTargetYards: 250,
    approachTargetYards: 30,
    puttTargetFeet: 5,
    puttAddends: [3, 2],
    mishapType: 'kiddie_pool',
    mishapHeadline: 'COCONUT RICOCHET!',
    mishapText: 'Boinged off two coconuts and made a giant splash in the kiddie pool!',
    mishapVoiceKey: 'mishap_kiddie_pool',
    pinOffsetX: -35
  },
  {
    number: 3,
    name: 'Tiki Lagoon',
    theme: 'tropical',
    par: 4,
    totalYards: 390,
    driveTargetYards: 350,
    approachTargetYards: 40,
    puttTargetFeet: 6,
    puttAddends: [4, 2],
    mishapType: 'kiddie_pool',
    mishapHeadline: 'DUCKY SPLASH!',
    mishapText: 'Landed next to the rubber ducky in the resort kiddie pool!',
    mishapVoiceKey: 'mishap_kiddie_pool',
    pinOffsetX: 40
  },
  {
    number: 4,
    name: 'Starfish Shore',
    theme: 'tropical',
    par: 3,
    totalYards: 180,
    driveTargetYards: 160,
    approachTargetYards: 20,
    puttTargetFeet: 3,
    puttAddends: [2, 1],
    mishapType: 'kiddie_pool',
    mishapHeadline: 'PALM TREE BOING!',
    mishapText: 'Ping-ponged down a palm tree trunk into the kiddie pool!',
    mishapVoiceKey: 'mishap_kiddie_pool',
    pinOffsetX: -20
  },
  {
    number: 5,
    name: 'Pineapple Bay',
    theme: 'tropical',
    par: 5,
    totalYards: 470,
    driveTargetYards: 420,
    approachTargetYards: 50,
    puttTargetFeet: 7,
    puttAddends: [4, 3],
    mishapType: 'kiddie_pool',
    mishapHeadline: 'CANNONBALL SPLASH!',
    mishapText: 'Did a flip off a palm frond and cannonballed into the kiddie pool!',
    mishapVoiceKey: 'mishap_kiddie_pool',
    pinOffsetX: 25
  },

  // =========================================================================
  // COURSE 2: DINOSAUR VALLEY (Holes 6 - 9)
  // =========================================================================
  {
    number: 6,
    name: 'Pterodactyl Perch',
    theme: 'dino',
    par: 4,
    totalYards: 320,
    driveTargetYards: 290,
    approachTargetYards: 30,
    puttTargetFeet: 5,
    puttAddends: [3, 2],
    mishapType: 'dino_nest',
    mishapHeadline: 'SQUAWK! DINO NEST!',
    mishapText: 'Plopped right into a sleeping pterodactyl nest! Look at that wobbly egg!',
    mishapVoiceKey: 'dino_nest',
    pinOffsetX: -40
  },
  {
    number: 7,
    name: 'Magma Meadow',
    theme: 'dino',
    par: 3,
    totalYards: 190,
    driveTargetYards: 150,
    approachTargetYards: 40,
    puttTargetFeet: 6,
    puttAddends: [3, 3],
    mishapType: 'lava_vent',
    mishapHeadline: 'SSSSS! SPICY LAVA!',
    mishapText: 'Splashed into a bubbling volcano lava vent with a silly SSSSS!',
    mishapVoiceKey: 'lava_vent',
    pinOffsetX: 35
  },
  {
    number: 8,
    name: 'T-Rex Ribcage Run',
    theme: 'dino',
    par: 5,
    totalYards: 440,
    driveTargetYards: 380,
    approachTargetYards: 60,
    puttTargetFeet: 8,
    puttAddends: [5, 3],
    mishapType: 'dino_nest',
    mishapHeadline: 'WOBBLY DINO EGG!',
    mishapText: 'Rolled into the pterodactyl nest! The baby dino thinks it is an egg!',
    mishapVoiceKey: 'dino_nest',
    pinOffsetX: -25
  },
  {
    number: 9,
    name: 'Volcano Crater Cup',
    theme: 'dino',
    par: 4,
    totalYards: 350,
    driveTargetYards: 310,
    approachTargetYards: 40,
    puttTargetFeet: 7,
    puttAddends: [5, 2],
    mishapType: 'lava_vent',
    mishapHeadline: 'SIZZLE POP!',
    mishapText: 'Hopped into a hot lava puddle—SSSSS! Time for a cool rescue shot!',
    mishapVoiceKey: 'lava_vent',
    pinOffsetX: 15
  },

  // =========================================================================
  // COURSE 3: CYBER CITY (Holes 10 - 14)
  // =========================================================================
  {
    number: 10,
    name: 'Hovercar Highway',
    theme: 'cyber',
    par: 4,
    totalYards: 390,
    driveTargetYards: 350,
    approachTargetYards: 40,
    puttTargetFeet: 5,
    puttAddends: [3, 2],
    mishapType: 'hovercar',
    mishapHeadline: 'BEEP-BEEP! HOVERCAR!',
    mishapText: 'Bounced right off a flying hovercar windshield! Meep-meep!',
    mishapVoiceKey: 'mishap_hovercar',
    pinOffsetX: 30
  },
  {
    number: 11,
    name: 'Neon Laser Links',
    theme: 'cyber',
    par: 3,
    totalYards: 170,
    driveTargetYards: 150,
    approachTargetYards: 20,
    puttTargetFeet: 4,
    puttAddends: [3, 1],
    mishapType: 'hovercar',
    mishapHeadline: 'WINDSHIELD WIPER BOING!',
    mishapText: 'Zapped off a robot taxi windshield with a cartoon boing!',
    mishapVoiceKey: 'mishap_hovercar',
    pinOffsetX: -35
  },
  {
    number: 12,
    name: 'Robot Plaza',
    theme: 'cyber',
    par: 4,
    totalYards: 360,
    driveTargetYards: 310,
    approachTargetYards: 50,
    puttTargetFeet: 8,
    puttAddends: [4, 4],
    mishapType: 'hovercar',
    mishapHeadline: 'HOVER-BUMPER BOUNCE!',
    mishapText: 'Pinged off a glowing hovercar bumper and honked the horn!',
    mishapVoiceKey: 'mishap_hovercar',
    pinOffsetX: 20
  },
  {
    number: 13,
    name: 'Glass Dome Green',
    theme: 'cyber',
    par: 4,
    totalYards: 290,
    driveTargetYards: 260,
    approachTargetYards: 30,
    puttTargetFeet: 6,
    puttAddends: [5, 1],
    mishapType: 'hovercar',
    mishapHeadline: 'SPACE TAXI BONK!',
    mishapText: 'Ricocheted off a flying hovercar windshield in mid-air!',
    mishapVoiceKey: 'mishap_hovercar',
    pinOffsetX: -20
  },
  {
    number: 14,
    name: 'Cyber Skyline',
    theme: 'cyber',
    par: 5,
    totalYards: 470,
    driveTargetYards: 410,
    approachTargetYards: 60,
    puttTargetFeet: 9,
    puttAddends: [5, 4],
    mishapType: 'hovercar',
    mishapHeadline: 'TURBO HOVER BOING!',
    mishapText: 'Bounced off the cyber hovercar windshield with a neon flash!',
    mishapVoiceKey: 'mishap_hovercar',
    pinOffsetX: 0
  },

  // =========================================================================
  // COURSE 4: CANYON GORGE (Holes 15 - 18)
  // =========================================================================
  {
    number: 15,
    name: 'Rickety Rope Crossing',
    theme: 'canyon',
    par: 4,
    totalYards: 330,
    driveTargetYards: 290,
    approachTargetYards: 40,
    puttTargetFeet: 6,
    puttAddends: [4, 2],
    mishapType: 'rope_bridge',
    mishapHeadline: 'TWANG! ROPE BRIDGE!',
    mishapText: 'Danced across the rickety rope bridge and splashed by the waterfall!',
    mishapVoiceKey: 'mishap_canyon',
    pinOffsetX: -30
  },
  {
    number: 16,
    name: 'Echo Waterfall',
    theme: 'canyon',
    par: 3,
    totalYards: 200,
    driveTargetYards: 170,
    approachTargetYards: 30,
    puttTargetFeet: 5,
    puttAddends: [2, 3],
    mishapType: 'rope_bridge',
    mishapHeadline: 'WATERFALL MIST!',
    mishapText: 'Bounced off a red canyon boulder into the waterfall lagoon!',
    mishapVoiceKey: 'mishap_canyon',
    pinOffsetX: 35
  },
  {
    number: 17,
    name: 'Red Mesa Ridge',
    theme: 'canyon',
    par: 5,
    totalYards: 470,
    driveTargetYards: 420,
    approachTargetYards: 50,
    puttTargetFeet: 8,
    puttAddends: [6, 2],
    mishapType: 'rope_bridge',
    mishapHeadline: 'BRIDGE BONGO!',
    mishapText: 'Played the wooden rope bridge planks like a xylophone!',
    mishapVoiceKey: 'mishap_canyon',
    pinOffsetX: -15
  },
  {
    number: 18,
    name: 'Grand Canyon Finale',
    theme: 'canyon',
    par: 5,
    totalYards: 480,
    driveTargetYards: 420,
    approachTargetYards: 60,
    puttTargetFeet: 9,
    puttAddends: [6, 3],
    mishapType: 'rope_bridge',
    mishapHeadline: 'CANYON CLIFF BOING!',
    mishapText: 'Ricocheted off the canyon cliff and twanged the rope bridge!',
    mishapVoiceKey: 'mishap_canyon',
    pinOffsetX: 0
  }
];

export function getHoleByNumber(holeNumber) {
  return HOLES.find(h => h.number === Number(holeNumber)) || HOLES[0];
}

export function getHolesByCourse(courseKey) {
  if (courseKey === 'full18') {
    return [...HOLES];
  }
  return HOLES.filter(h => h.theme === courseKey);
}
