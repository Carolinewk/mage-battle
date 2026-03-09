import { ARENA } from "./config.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function normalize(x, y) {
  const size = Math.hypot(x, y);
  if (!size) {
    return { x: 0, y: 0 };
  }

  return { x: x / size, y: y / size };
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleToVector(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function clampPointToDistance(originX, originY, targetX, targetY, maxDistance) {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const size = Math.hypot(dx, dy);

  if (!size || size <= maxDistance) {
    return { x: targetX, y: targetY };
  }

  const scale = maxDistance / size;
  return {
    x: originX + dx * scale,
    y: originY + dy * scale,
  };
}

export function pointInArena(x, y, padding = 0) {
  const radiusX = ARENA.radiusX - padding;
  const radiusY = ARENA.radiusY - padding;
  const dx = x - ARENA.centerX;
  const dy = y - ARENA.centerY;
  return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
}

export function constrainToArena(entity, padding = 0) {
  const radiusX = ARENA.radiusX - padding;
  const radiusY = ARENA.radiusY - padding;
  const dx = entity.x - ARENA.centerX;
  const dy = entity.y - ARENA.centerY;
  const distanceToEdge = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);

  if (distanceToEdge <= 1) {
    return entity;
  }

  const scale = 1 / Math.sqrt(distanceToEdge);
  entity.x = ARENA.centerX + dx * scale;
  entity.y = ARENA.centerY + dy * scale;
  return entity;
}

export function circleCollision(a, b) {
  const radius = a.radius + b.radius;
  return distance(a.x, a.y, b.x, b.y) <= radius;
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
  const value = Math.sin(seed * 91.133 + seed * seed * 0.0021) * 43758.5453;
  return value - Math.floor(value);
}
