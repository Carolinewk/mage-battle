export const VIRTUAL_WIDTH = 480;
export const VIRTUAL_HEIGHT = 270;

export const ARENA = {
  centerX: VIRTUAL_WIDTH / 2,
  centerY: VIRTUAL_HEIGHT / 2 + 10,
  radiusX: 168,
  radiusY: 92,
  safePadding: 12,
};

export const MAGE_STATS = {
  maxHealth: 100,
  baseSpeed: 68,
  boostedSpeed: 112,
  radius: 10,
  stopDistance: 5,
};

export const SPELLS = {
  fireball: {
    key: "KeyQ",
    name: "Fireball",
    cooldown: 1,
    damage: 8,
    speed: 128,
    radius: 4,
    range: 138,
    color: "#ff9445",
  },
  stunShot: {
    key: "KeyW",
    name: "Stun Shot",
    cooldown: 4,
    damage: 5,
    speed: 104,
    radius: 4,
    range: 122,
    stunDuration: 1.65,
    color: "#7ee6ff",
  },
  speedBoost: {
    key: "KeyE",
    name: "Speed Boost",
    cooldown: 6,
    duration: 2.2,
    auraRadius: 20,
    color: "#8cf7a8",
  },
  thunderStrike: {
    key: "KeyR",
    name: "Thunder Strike",
    cooldown: 10,
    damage: 20,
    radius: 20,
    range: 148,
    castDelay: 0.45,
    color: "#fff09d",
  },
};

export const COLORS = {
  playerRobe: "#a83ff6",
  enemyRobe: "#d74a4a",
  playerGlow: "#e2a3ff",
  enemyGlow: "#ffb28c",
  crowdA: "#f4df82",
  crowdB: "#79b0ff",
  crowdC: "#ff8daa",
};
