import { ARENA } from "./config.js";

export const ONE_SECOND_MS = 1000;
export const DIRECTION_SCALE = 1024;

const ARENA_CLAMP_SCALE = 1024;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function divideRounded(value, divisor) {
  if (!divisor) {
    return 0;
  }

  const magnitude = Math.abs(value);
  const halfDivisor = Math.floor(Math.abs(divisor) / 2);
  const rounded = Math.floor((magnitude + halfDivisor) / Math.abs(divisor));
  return value < 0 ? -rounded : rounded;
}

export function scaleValue(value, numerator, denominator = 100) {
  return divideRounded(value * numerator, denominator);
}

export function integerSqrt(value) {
  if (value <= 0) {
    return 0;
  }

  let next = value;
  let current = Math.floor((value + 1) / 2);

  while (current < next) {
    next = current;
    current = Math.floor((current + Math.floor(value / current)) / 2);
  }

  return next;
}

export function lengthSquared(x, y) {
  return x * x + y * y;
}

export function length(x, y) {
  return integerSqrt(lengthSquared(x, y));
}

export function normalize(x, y, scale = DIRECTION_SCALE) {
  const size = length(x, y);
  if (!size) {
    return { x: 0, y: 0 };
  }

  return {
    x: divideRounded(x * scale, size),
    y: divideRounded(y * scale, size),
  };
}

export function distance(ax, ay, bx, by) {
  return length(bx - ax, by - ay);
}

export function clampPointToDistance(originX, originY, targetX, targetY, maxDistance) {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const size = length(dx, dy);

  if (!size || size <= maxDistance) {
    return { x: targetX, y: targetY };
  }

  return {
    x: originX + divideRounded(dx * maxDistance, size),
    y: originY + divideRounded(dy * maxDistance, size),
  };
}

export function pointInArena(x, y, padding = 0) {
  const radiusX = ARENA.radiusX - padding;
  const radiusY = ARENA.radiusY - padding;
  const dx = x - ARENA.centerX;
  const dy = y - ARENA.centerY;
  const radiusXSquared = radiusX * radiusX;
  const radiusYSquared = radiusY * radiusY;
  return dx * dx * radiusYSquared + dy * dy * radiusXSquared <= radiusXSquared * radiusYSquared;
}

export function constrainToArena(entity, padding = 0) {
  const radiusX = ARENA.radiusX - padding;
  const radiusY = ARENA.radiusY - padding;
  const dx = entity.x - ARENA.centerX;
  const dy = entity.y - ARENA.centerY;
  const radiusXSquared = radiusX * radiusX;
  const radiusYSquared = radiusY * radiusY;
  const boundary = radiusXSquared * radiusYSquared;
  const distanceToEdge = dx * dx * radiusYSquared + dy * dy * radiusXSquared;

  if (distanceToEdge <= boundary) {
    return entity;
  }

  const scaledBoundary = Math.floor((boundary * ARENA_CLAMP_SCALE * ARENA_CLAMP_SCALE) / distanceToEdge);
  const scale = integerSqrt(scaledBoundary);
  entity.x = ARENA.centerX + divideRounded(dx * scale, ARENA_CLAMP_SCALE);
  entity.y = ARENA.centerY + divideRounded(dy * scale, ARENA_CLAMP_SCALE);
  return entity;
}

export function circleCollision(a, b) {
  const radius = a.radius + b.radius;
  return lengthSquared(a.x - b.x, a.y - b.y) <= radius * radius;
}

export function cooldownBag() {
  return {
    fireball: 0,
    shockBolt: 0,
    stunShot: 0,
    blockWall: 0,
    speedBoost: 0,
    slowShot: 0,
    thunderStrike: 0,
    immortality: 0,
  };
}

export function pseudoRandom(seed) {
  let value = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

export function pseudoRandomInt(seed, max) {
  if (max <= 0) {
    return 0;
  }

  return pseudoRandom(seed) % max;
}

export function pseudoRandomSigned(seed, magnitude) {
  if (magnitude <= 0) {
    return 0;
  }

  return pseudoRandomInt(seed, magnitude * 2 + 1) - magnitude;
}
