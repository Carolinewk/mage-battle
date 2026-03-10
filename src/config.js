export const VIRTUAL_WIDTH = 480;
export const VIRTUAL_HEIGHT = 270;

export const ARENA = {
  centerX: VIRTUAL_WIDTH / 2,
  centerY: VIRTUAL_HEIGHT / 2 + 10,
  radiusX: 186,
  radiusY: 100,
  safePadding: 12,
};

export const MAGE_STATS = {
  maxHealth: 100,
  baseSpeed: 68,
  boostedSpeed: 112,
  radius: 10,
  stopDistance: 5,
  slowedPercent: 56,
};

export const ABILITY_SLOTS = [
  { id: "q", key: "KeyQ", label: "Q" },
  { id: "w", key: "KeyW", label: "W" },
  { id: "e", key: "KeyE", label: "E" },
  { id: "r", key: "KeyR", label: "R" },
];

export const ABILITY_OPTIONS = {
  q: ["fireball", "shockBolt"],
  w: ["stunShot", "blockWall"],
  e: ["speedBoost", "slowShot"],
  r: ["thunderStrike", "immortality"],
};

export const DEFAULT_PLAYER_LOADOUT = {
  q: "fireball",
  w: "stunShot",
  e: "speedBoost",
  r: "thunderStrike",
};

export const DEFAULT_ENEMY_LOADOUT = {
  q: "fireball",
  w: "stunShot",
  e: "speedBoost",
  r: "thunderStrike",
};

export const DEFAULT_PLAYER_STYLE = {
  hatColor: "#d4b06a",
  wandColor: "#7fd6e5",
};

export const DEFAULT_ENEMY_STYLE = {
  hatColor: "#d4b06a",
  wandColor: "#d4b06a",
};

export const SPELLS = {
  fireball: {
    slot: "q",
    hudLabel: "FOGO",
    name: "Fireball",
    cooldown: 1000,
    damage: 5,
    speed: 128,
    radius: 4,
    range: 138,
    color: "#d79857",
  },
  shockBolt: {
    slot: "q",
    hudLabel: "CHOQUE",
    name: "Shock",
    cooldown: 1400,
    damage: 4,
    speed: 148,
    radius: 4,
    range: 134,
    color: "#7fd6e5",
  },
  stunShot: {
    slot: "w",
    hudLabel: "STUN",
    name: "Stun",
    cooldown: 4000,
    damage: 3,
    speed: 104,
    radius: 4,
    range: 122,
    stunDuration: 1650,
    color: "#7fd6e5",
  },
  blockWall: {
    slot: "w",
    hudLabel: "BLOQ",
    name: "Block",
    cooldown: 5500,
    duration: 2400,
    wallDistance: 22,
    wallLength: 30,
    wallThickness: 7,
    color: "#aeb7c1",
  },
  speedBoost: {
    slot: "e",
    hudLabel: "RAPIDO",
    name: "Speed Boost",
    cooldown: 6000,
    duration: 2200,
    auraRadius: 20,
    color: "#8bcf9c",
  },
  slowShot: {
    slot: "e",
    hudLabel: "LENTO",
    name: "Slow Shot",
    cooldown: 5200,
    damage: 2,
    speed: 112,
    radius: 4,
    range: 126,
    slowDuration: 2100,
    color: "#8bcf9c",
  },
  thunderStrike: {
    slot: "r",
    hudLabel: "RAIO",
    name: "Thunder Strike",
    cooldown: 10000,
    damagePercent: 20,
    radius: 20,
    range: 148,
    castDelay: 450,
    color: "#9d7bea",
  },
  immortality: {
    slot: "r",
    hudLabel: "IMORT",
    name: "Immortality",
    cooldown: 12000,
    duration: 3000,
    color: "#d4b06a",
  },
};

export const COLORS = {
  playerRobe: "#314575",
  enemyRobe: "#6e2233",
  playerGlow: "#7fd6e5",
  enemyGlow: "#d4b06a",
  crowdA: "#d4b06a",
  crowdB: "#7fd6e5",
  crowdC: "#6e2233",
};
