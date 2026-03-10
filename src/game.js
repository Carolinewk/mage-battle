import {
  ABILITY_OPTIONS,
  ABILITY_SLOTS,
  ARENA,
  COLORS,
  DEFAULT_ENEMY_LOADOUT,
  DEFAULT_ENEMY_STYLE,
  DEFAULT_PLAYER_LOADOUT,
  DEFAULT_PLAYER_STYLE,
  MAGE_STATS,
  SPELLS,
} from "./config.js";
import {
  clampPointToDistance,
  circleCollision,
  constrainToArena,
  cooldownBag,
  distance,
  divideRounded,
  DIRECTION_SCALE,
  length,
  normalize,
  ONE_SECOND_MS,
  pointInArena,
  pseudoRandomInt,
  pseudoRandomSigned,
  scaleValue,
} from "./utils.js";

const MAX_WALK_CYCLE = 6283000;
const WALK_CYCLE_RATE = 120;

const ENEMY_STRAFE_BASE_MS = 800;
const ENEMY_STRAFE_VARIATION_MS = 500;
const ENEMY_DECISION_BASE_MS = 520;
const ENEMY_DECISION_VARIATION_MS = 260;

const PROJECTILE_CAST_FLASH_MS = 280;
const SELF_CAST_FLASH_MS = 200;
const IMMORTAL_CAST_FLASH_MS = 250;
const WALL_CAST_FLASH_MS = 180;
const STRIKE_CAST_FLASH_MS = 350;
const STRIKE_FLASH_MS = 300;
const IMPACT_FLASH_MS = 220;
const SHAKE_MS = 260;
const HURT_FLASH_MS = 350;
const CAST_ANIMATION_MS = 280;

function normalizeLoadout(loadout, defaults) {
  const nextLoadout = {};

  for (const slot of ABILITY_SLOTS) {
    const selectedAbility = loadout?.[slot.id];
    nextLoadout[slot.id] = ABILITY_OPTIONS[slot.id].includes(selectedAbility)
      ? selectedAbility
      : defaults[slot.id];
  }

  return nextLoadout;
}

function normalizeStyle(style, defaults) {
  return {
    hatColor: style?.hatColor ?? defaults.hatColor,
    wandColor: style?.wandColor ?? defaults.wandColor,
  };
}

function selectionFromMage(mage) {
  return {
    hatColor: mage.hatColor,
    wandColor: mage.wandColor,
    loadout: { ...mage.loadout },
  };
}

function createMage(id, label, x, y, robeColor, glowColor, style, loadout, isEnemy = false) {
  return {
    id,
    label,
    isEnemy,
    x,
    y,
    vx: 0,
    vy: 0,
    moveCarryX: 0,
    moveCarryY: 0,
    radius: MAGE_STATS.radius,
    aim: isEnemy ? { x: -DIRECTION_SCALE, y: 0 } : { x: DIRECTION_SCALE, y: 0 },
    health: MAGE_STATS.maxHealth,
    maxHealth: MAGE_STATS.maxHealth,
    cooldowns: cooldownBag(),
    stunTimer: 0,
    boostTimer: 0,
    slowTimer: 0,
    immortalTimer: 0,
    castFlash: 0,
    castAnimationTimer: 0,
    castAnimationDuration: CAST_ANIMATION_MS,
    hurtFlash: 0,
    walkCycle: 0,
    robeColor,
    glowColor,
    hatColor: style.hatColor,
    wandColor: style.wandColor,
    loadout,
    moveTarget: null,
    ai: isEnemy
      ? {
          strafeSign: 1,
          strafeTimer: 750,
          decisionTimer: 850,
        }
      : null,
  };
}

function createCrowd() {
  const spots = [];
  const colors = [COLORS.crowdA, COLORS.crowdB, COLORS.crowdC, "#d9edf8", "#76e3b6"];
  const outerX = ARENA.radiusX + 48;
  const outerY = ARENA.radiusY + 40;

  for (let index = 0; index < 200; index += 1) {
    const angle = (index / 200) * Math.PI * 2;
    const ringOffsetPercent = 720 + pseudoRandomInt(index + 8, 381);
    const x = ARENA.centerX + Math.round((Math.cos(angle) * outerX * ringOffsetPercent) / 1000);
    const y = ARENA.centerY + Math.round((Math.sin(angle) * outerY * ringOffsetPercent * 9) / 10000);

    spots.push({
      x,
      y,
      size: pseudoRandomInt(index + 3, 100) >= 60 ? 2 : 1,
      color: colors[index % colors.length],
      bouncePhase: pseudoRandomInt(index + 20, 6284),
    });
  }

  return spots;
}

function createParticle(x, y, color, size, lifetime, vx, vy, gravity = 0) {
  return {
    x,
    y,
    color,
    size,
    lifetime,
    maxLifetime: lifetime,
    vx,
    vy,
    gravity,
    moveCarryX: 0,
    moveCarryY: 0,
    gravityCarryY: 0,
  };
}

function randomDirection(seed) {
  let rawX = pseudoRandomSigned(seed + 17, DIRECTION_SCALE);
  let rawY = pseudoRandomSigned(seed + 53, DIRECTION_SCALE);

  if (!rawX && !rawY) {
    rawX = DIRECTION_SCALE;
  }

  return normalize(rawX, rawY, DIRECTION_SCALE);
}

function burst(game, x, y, color, count, speed, size = 2, lifetime = 350, gravity = 0) {
  for (let index = 0; index < count; index += 1) {
    const seed = x * 97 + y * 53 + index * 131 + game.time;
    const direction = randomDirection(seed);
    const velocityPercent = 45 + pseudoRandomInt(seed + 89, 71);
    const particleSpeed = scaleValue(speed, velocityPercent);
    const vx = divideRounded(direction.x * particleSpeed, DIRECTION_SCALE);
    const vy = divideRounded(direction.y * particleSpeed, DIRECTION_SCALE);

    game.particles.push(createParticle(x, y, color, size, lifetime, vx, vy, gravity));
  }
}

function projectDirection(directionValue, distanceValue) {
  return divideRounded(directionValue * distanceValue, DIRECTION_SCALE);
}

function moveEntity(entity, dtMs) {
  const pendingX = entity.vx * dtMs + entity.moveCarryX;
  const pendingY = entity.vy * dtMs + entity.moveCarryY;
  const deltaX = divideRounded(pendingX, ONE_SECOND_MS);
  const deltaY = divideRounded(pendingY, ONE_SECOND_MS);

  entity.moveCarryX = pendingX - deltaX * ONE_SECOND_MS;
  entity.moveCarryY = pendingY - deltaY * ONE_SECOND_MS;
  entity.x += deltaX;
  entity.y += deltaY;
}

function handPosition(mage) {
  return {
    x: mage.x + projectDirection(mage.aim.x, 10),
    y: mage.y - 3 + projectDirection(mage.aim.y, 7),
  };
}

function setAimTowards(mage, targetX, targetY) {
  const nextAim = normalize(targetX - mage.x, targetY - mage.y, DIRECTION_SCALE);

  if (nextAim.x || nextAim.y) {
    mage.aim = nextAim;
  }

  return mage.aim;
}

function abilityNeedsSelfTarget(abilityId) {
  return abilityId === "speedBoost" || abilityId === "immortality";
}

function startCastAnimation(mage) {
  mage.castAnimationTimer = CAST_ANIMATION_MS;
  mage.castAnimationDuration = CAST_ANIMATION_MS;
}

function getAbilityTargetPoint(caster, abilityId, targetPoint) {
  const ability = SPELLS[abilityId];

  if (!ability.range) {
    return { x: targetPoint.x, y: targetPoint.y };
  }

  return clampPointToDistance(caster.x, caster.y, targetPoint.x, targetPoint.y, ability.range);
}

function predictTargetPoint(source, target, projectileSpeed, leadPercent = 45) {
  const gap = distance(source.x, source.y, target.x, target.y);
  const travelMs = divideRounded(gap * ONE_SECOND_MS, projectileSpeed);

  return {
    x: target.x + divideRounded(target.vx * travelMs * leadPercent, ONE_SECOND_MS * 100),
    y: target.y + divideRounded(target.vy * travelMs * leadPercent, ONE_SECOND_MS * 100),
  };
}

function spawnProjectile(game, caster, abilityId, targetPoint) {
  const ability = SPELLS[abilityId];
  const cappedTarget = getAbilityTargetPoint(caster, abilityId, targetPoint);
  const direction = setAimTowards(caster, cappedTarget.x, cappedTarget.y);
  const hand = handPosition(caster);
  const spawnX = hand.x + projectDirection(direction.x, 5);
  const spawnY = hand.y + projectDirection(direction.y, 5);

  caster.cooldowns[abilityId] = ability.cooldown;
  caster.castFlash = PROJECTILE_CAST_FLASH_MS;
  startCastAnimation(caster);

  game.projectiles.push({
    ownerId: caster.id,
    abilityId,
    type: abilityId,
    x: spawnX,
    y: spawnY,
    vx: divideRounded(direction.x * ability.speed, DIRECTION_SCALE),
    vy: divideRounded(direction.y * ability.speed, DIRECTION_SCALE),
    moveCarryX: 0,
    moveCarryY: 0,
    radius: ability.radius,
    damage: ability.damage ?? 0,
    color: ability.color,
    travelLeft: ability.range,
  });

  burst(game, spawnX, spawnY, ability.color, abilityId === "fireball" ? 6 : 4, 22, 2, 220);
}

function castSpeedBoost(game, caster) {
  const ability = SPELLS.speedBoost;
  caster.cooldowns.speedBoost = ability.cooldown;
  caster.boostTimer = ability.duration;
  caster.castFlash = SELF_CAST_FLASH_MS;
  startCastAnimation(caster);
  burst(game, caster.x, caster.y, ability.color, 12, 20, 2, 450);
}

function castImmortality(game, caster) {
  const ability = SPELLS.immortality;
  caster.cooldowns.immortality = ability.cooldown;
  caster.immortalTimer = ability.duration;
  caster.castFlash = IMMORTAL_CAST_FLASH_MS;
  startCastAnimation(caster);
  burst(game, caster.x, caster.y, ability.color, 14, 20, 2, 500);
}

function castBlockWall(game, caster) {
  const ability = SPELLS.blockWall;
  const wallCenter = constrainToArena(
    {
      x: caster.x + projectDirection(caster.aim.x, ability.wallDistance),
      y: caster.y + projectDirection(caster.aim.y, ability.wallDistance),
    },
    ARENA.safePadding + ability.wallThickness,
  );

  caster.cooldowns.blockWall = ability.cooldown;
  caster.castFlash = WALL_CAST_FLASH_MS;
  startCastAnimation(caster);
  game.walls.push({
    ownerId: caster.id,
    x: wallCenter.x,
    y: wallCenter.y,
    direction: { ...caster.aim },
    length: ability.wallLength,
    thickness: ability.wallThickness,
    timer: ability.duration,
    maxTimer: ability.duration,
    color: ability.color,
  });

  burst(game, wallCenter.x, wallCenter.y, ability.color, 12, 18, 2, 280);
}

function castThunderStrike(game, caster, targetPoint) {
  const ability = SPELLS.thunderStrike;
  const rangedPoint = getAbilityTargetPoint(caster, "thunderStrike", targetPoint);
  const strikePoint = constrainToArena(
    {
      x: rangedPoint.x,
      y: rangedPoint.y,
    },
    ARENA.safePadding + ability.radius,
  );

  caster.cooldowns.thunderStrike = ability.cooldown;
  caster.castFlash = STRIKE_CAST_FLASH_MS;
  startCastAnimation(caster);
  game.strikes.push({
    ownerId: caster.id,
    abilityId: "thunderStrike",
    x: strikePoint.x,
    y: strikePoint.y,
    radius: ability.radius,
    timer: ability.castDelay,
    flashTimer: IMPACT_FLASH_MS,
    resolved: false,
  });
}

function canAct(mage) {
  return mage.health > 0 && mage.stunTimer <= 0;
}

function tryCast(game, caster, abilityId, targetPoint) {
  if (!canAct(caster) || caster.cooldowns[abilityId] > 0) {
    return false;
  }

  if (abilityId === "speedBoost") {
    castSpeedBoost(game, caster);
    return true;
  }

  if (abilityId === "immortality") {
    castImmortality(game, caster);
    return true;
  }

  if (abilityId === "blockWall") {
    castBlockWall(game, caster);
    return true;
  }

  if (abilityId === "thunderStrike") {
    castThunderStrike(game, caster, targetPoint);
    return true;
  }

  spawnProjectile(game, caster, abilityId, targetPoint);
  return true;
}

function updateMageTimers(mage, dtMs) {
  mage.stunTimer = Math.max(0, mage.stunTimer - dtMs);
  mage.boostTimer = Math.max(0, mage.boostTimer - dtMs);
  mage.slowTimer = Math.max(0, mage.slowTimer - dtMs);
  mage.immortalTimer = Math.max(0, mage.immortalTimer - dtMs);
  mage.castFlash = Math.max(0, mage.castFlash - dtMs);
  mage.castAnimationTimer = Math.max(0, mage.castAnimationTimer - dtMs);
  mage.hurtFlash = Math.max(0, mage.hurtFlash - dtMs * 2);

  for (const abilityId of Object.keys(mage.cooldowns)) {
    mage.cooldowns[abilityId] = Math.max(0, mage.cooldowns[abilityId] - dtMs);
  }
}

function applyMovement(mage, moveX, moveY, dtMs) {
  const direction = normalize(moveX, moveY, DIRECTION_SCALE);
  let speed = mage.boostTimer > 0 ? MAGE_STATS.boostedSpeed : MAGE_STATS.baseSpeed;

  if (mage.slowTimer > 0) {
    speed = scaleValue(speed, MAGE_STATS.slowedPercent);
  }

  mage.vx = divideRounded(direction.x * speed, DIRECTION_SCALE);
  mage.vy = divideRounded(direction.y * speed, DIRECTION_SCALE);
  moveEntity(mage, dtMs);
  mage.walkCycle += divideRounded(length(mage.vx, mage.vy) * dtMs * WALK_CYCLE_RATE, ONE_SECOND_MS);

  if (mage.walkCycle >= MAX_WALK_CYCLE) {
    mage.walkCycle -= MAX_WALK_CYCLE;
  }

  constrainToArena(mage, ARENA.safePadding + mage.radius);
}

function applyMoveTarget(mage, dtMs) {
  if (!mage.moveTarget) {
    mage.vx = 0;
    mage.vy = 0;
    return;
  }

  const gapX = mage.moveTarget.x - mage.x;
  const gapY = mage.moveTarget.y - mage.y;
  const gap = distance(mage.x, mage.y, mage.moveTarget.x, mage.moveTarget.y);

  if (gap <= MAGE_STATS.stopDistance) {
    mage.moveTarget = null;
    mage.vx = 0;
    mage.vy = 0;
    return;
  }

  applyMovement(mage, gapX, gapY, dtMs);
}

function castTargetForPlayer(player, abilityId, input) {
  if (abilityNeedsSelfTarget(abilityId)) {
    return { x: player.x, y: player.y };
  }

  return { x: input.mouse.x, y: input.mouse.y };
}

function updatePlayer(game, input, dtMs) {
  const player = game.player;

  setAimTowards(player, input.mouse.x, input.mouse.y);

  const commandedTarget = input.consumeMoveTarget();
  if (commandedTarget) {
    player.moveTarget = constrainToArena(
      {
        x: commandedTarget.x,
        y: commandedTarget.y,
      },
      ARENA.safePadding + player.radius,
    );
  }

  if (canAct(player)) {
    applyMoveTarget(player, dtMs);

    for (const slot of ABILITY_SLOTS) {
      if (input.wasPressed(slot.key)) {
        const abilityId = player.loadout[slot.id];
        tryCast(game, player, abilityId, castTargetForPlayer(player, abilityId, input));
      }
    }
  } else {
    player.vx = 0;
    player.vy = 0;
  }
}

function updateEnemy(game, dtMs) {
  const enemy = game.enemy;
  const player = game.player;

  if (enemy.health <= 0) {
    enemy.vx = 0;
    enemy.vy = 0;
    return;
  }

  const qAbilityId = enemy.loadout.q;
  const wAbilityId = enemy.loadout.w;
  const eAbilityId = enemy.loadout.e;
  const rAbilityId = enemy.loadout.r;
  const qAbility = SPELLS[qAbilityId];
  const wAbility = SPELLS[wAbilityId];
  const eAbility = SPELLS[eAbilityId];
  const rAbility = SPELLS[rAbilityId];

  const toPlayerX = player.x - enemy.x;
  const toPlayerY = player.y - enemy.y;
  const range = distance(enemy.x, enemy.y, player.x, player.y);
  const direction = normalize(toPlayerX, toPlayerY, DIRECTION_SCALE);

  setAimTowards(enemy, player.x, player.y);
  enemy.ai.strafeTimer -= dtMs;
  enemy.ai.decisionTimer -= dtMs;

  if (enemy.ai.strafeTimer <= 0) {
    enemy.ai.strafeSign *= -1;
    enemy.ai.strafeTimer = ENEMY_STRAFE_BASE_MS + pseudoRandomInt(game.time + enemy.health, ENEMY_STRAFE_VARIATION_MS);
  }

  if (canAct(enemy)) {
    let moveX = 0;
    let moveY = 0;

    if (range > 128) {
      moveX = direction.x;
      moveY = direction.y;
    } else if (range < 96) {
      moveX = -direction.x;
      moveY = -direction.y;
    } else {
      moveX = -direction.y * enemy.ai.strafeSign;
      moveY = direction.x * enemy.ai.strafeSign;
    }

    if (player.boostTimer > 0 && range < 138) {
      moveX -= scaleValue(direction.x, 65);
      moveY -= scaleValue(direction.y, 65);
    }

    applyMovement(enemy, moveX, moveY, dtMs);

    if (enemy.ai.decisionTimer <= 0) {
      const aimedPoint = qAbility.speed
        ? predictTargetPoint(enemy, player, qAbility.speed, qAbilityId === "shockBolt" ? 22 : 18)
        : { x: player.x, y: player.y };
      const controlPoint = wAbility.speed
        ? predictTargetPoint(enemy, player, wAbility.speed, 8)
        : { x: player.x, y: player.y };
      const utilityPoint = eAbility.speed
        ? predictTargetPoint(enemy, player, eAbility.speed, 16)
        : { x: player.x, y: player.y };
      const thunderScatterX = pseudoRandomSigned(game.time * 19 + enemy.health, 7);
      const thunderScatterY = pseudoRandomSigned(game.time * 23 + enemy.health, 7);

      if (eAbilityId === "speedBoost" && enemy.cooldowns[eAbilityId] <= 0 && (range > 156 || enemy.health < 30)) {
        tryCast(game, enemy, eAbilityId, { x: enemy.x, y: enemy.y });
      } else if (
        rAbilityId === "immortality" &&
        enemy.cooldowns[rAbilityId] <= 0 &&
        enemy.health * 100 < enemy.maxHealth * 34
      ) {
        tryCast(game, enemy, rAbilityId, { x: enemy.x, y: enemy.y });
      } else if (rAbilityId === "thunderStrike" && enemy.cooldowns[rAbilityId] <= 0 && range < 142) {
        tryCast(game, enemy, rAbilityId, {
          x: player.x + divideRounded(player.vx * 8, 100) + thunderScatterX,
          y: player.y + divideRounded(player.vy * 8, 100) + thunderScatterY,
        });
      } else if (wAbilityId === "blockWall" && enemy.cooldowns[wAbilityId] <= 0 && range < 104) {
        tryCast(game, enemy, wAbilityId, { x: player.x, y: player.y });
      } else if (wAbilityId === "stunShot" && enemy.cooldowns[wAbilityId] <= 0 && player.stunTimer < 250) {
        tryCast(game, enemy, wAbilityId, controlPoint);
      } else if (eAbilityId === "slowShot" && enemy.cooldowns[eAbilityId] <= 0) {
        tryCast(game, enemy, eAbilityId, utilityPoint);
      } else if (enemy.cooldowns[qAbilityId] <= 0) {
        tryCast(game, enemy, qAbilityId, aimedPoint);
      }

      enemy.ai.decisionTimer = ENEMY_DECISION_BASE_MS + pseudoRandomInt(game.time * 7 + enemy.health, ENEMY_DECISION_VARIATION_MS);
    }
  } else {
    enemy.vx = 0;
    enemy.vy = 0;
  }
}

function damageMage(game, target, amount, color) {
  if (target.immortalTimer > 0) {
    burst(game, target.x, target.y - 6, "#f5e2b2", 8, 18, 2, 220);
    return false;
  }

  target.health = Math.max(0, target.health - amount);
  target.hurtFlash = HURT_FLASH_MS;
  burst(game, target.x, target.y - 4, color, 8, 24, 2, 300, 20);
  return true;
}

function stunMage(game, target, duration) {
  target.stunTimer = Math.max(target.stunTimer, duration);
  burst(game, target.x, target.y - 8, "#b5f4ff", 8, 16, 2, 480);
}

function slowMage(game, target, duration) {
  target.slowTimer = Math.max(target.slowTimer, duration);
  burst(game, target.x, target.y - 6, "#8bcf9c", 8, 16, 2, 400);
}

function wallEndpoints(wall) {
  const perpendicularX = -wall.direction.y;
  const perpendicularY = wall.direction.x;
  const halfLength = Math.floor(wall.length / 2);

  return {
    ax: wall.x - projectDirection(perpendicularX, halfLength),
    ay: wall.y - projectDirection(perpendicularY, halfLength),
    bx: wall.x + projectDirection(perpendicularX, halfLength),
    by: wall.y + projectDirection(perpendicularY, halfLength),
  };
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const segmentLengthSquared = abX * abX + abY * abY;

  if (!segmentLengthSquared) {
    return distance(px, py, ax, ay);
  }

  const projection = (px - ax) * abX + (py - ay) * abY;

  if (projection <= 0) {
    return distance(px, py, ax, ay);
  }

  if (projection >= segmentLengthSquared) {
    return distance(px, py, bx, by);
  }

  const closestX = ax + divideRounded(abX * projection, segmentLengthSquared);
  const closestY = ay + divideRounded(abY * projection, segmentLengthSquared);
  return distance(px, py, closestX, closestY);
}

function projectileHitsWall(projectile, wall) {
  const { ax, ay, bx, by } = wallEndpoints(wall);
  return distanceToSegment(projectile.x, projectile.y, ax, ay, bx, by) <= projectile.radius + divideRounded(wall.thickness, 2);
}

function updateWalls(game, dtMs) {
  game.walls = game.walls.filter((wall) => {
    wall.timer -= dtMs;
    return wall.timer > 0;
  });
}

function updateProjectiles(game, dtMs) {
  game.projectiles = game.projectiles.filter((projectile) => {
    const ability = SPELLS[projectile.abilityId];
    const travel = divideRounded(length(projectile.vx, projectile.vy) * dtMs, ONE_SECOND_MS);

    moveEntity(projectile, dtMs);
    projectile.travelLeft -= travel;

    if (pseudoRandomInt(projectile.x + projectile.y + game.time, 100) > 38) {
      game.particles.push(
        createParticle(
          projectile.x,
          projectile.y,
          projectile.color,
          2,
          180,
          divideRounded(-projectile.vx * 8, 100),
          divideRounded(-projectile.vy * 8, 100),
        ),
      );
    }

    for (const wall of game.walls) {
      if (wall.ownerId !== projectile.ownerId && projectileHitsWall(projectile, wall)) {
        burst(game, projectile.x, projectile.y, wall.color, 8, 18, 2, 200);
        return false;
      }
    }

    const target = projectile.ownerId === game.player.id ? game.enemy : game.player;

    if (target.health > 0 && circleCollision(projectile, target)) {
      if (ability.damage) {
        damageMage(game, target, ability.damage, projectile.color);
      }

      if (ability.stunDuration) {
        stunMage(game, target, ability.stunDuration);
      }

      if (ability.slowDuration) {
        slowMage(game, target, ability.slowDuration);
      }

      burst(game, projectile.x, projectile.y, projectile.color, 10, 28, 2, 220);
      return false;
    }

    if (projectile.travelLeft <= 0 || !pointInArena(projectile.x, projectile.y, -18)) {
      return false;
    }

    return true;
  });
}

function resolveStrike(game, strike) {
  const ability = SPELLS[strike.abilityId];
  strike.resolved = true;
  strike.flashTimer = STRIKE_FLASH_MS;
  game.impactFlash = IMPACT_FLASH_MS;
  game.shakeTimer = SHAKE_MS;

  const target = strike.ownerId === game.player.id ? game.enemy : game.player;
  const hitDistance = distance(strike.x, strike.y, target.x, target.y);

  if (target.health > 0 && hitDistance <= strike.radius + target.radius) {
    const damage = ability.damagePercent ? scaleValue(target.maxHealth, ability.damagePercent) : ability.damage;
    damageMage(game, target, damage, ability.color);
  }

  burst(game, strike.x, strike.y, ability.color, 16, 36, 3, 480, 18);
}

function updateStrikes(game, dtMs) {
  game.strikes = game.strikes.filter((strike) => {
    if (!strike.resolved) {
      strike.timer -= dtMs;
      if (strike.timer <= 0) {
        resolveStrike(game, strike);
      }
      return true;
    }

    strike.flashTimer -= dtMs;
    return strike.flashTimer > 0;
  });
}

function updateParticles(game, dtMs) {
  game.particles = game.particles.filter((particle) => {
    particle.lifetime -= dtMs;

    if (particle.gravity) {
      const pendingGravity = particle.gravity * dtMs + particle.gravityCarryY;
      const gravityStep = divideRounded(pendingGravity, ONE_SECOND_MS);
      particle.gravityCarryY = pendingGravity - gravityStep * ONE_SECOND_MS;
      particle.vy += gravityStep;
    }

    moveEntity(particle, dtMs);
    return particle.lifetime > 0;
  });
}

function updateEndState(game) {
  if (game.player.health <= 0 && game.enemy.health <= 0) {
    game.result = "Empate arcano";
  } else if (game.enemy.health <= 0) {
    game.result = "Vitória";
  } else if (game.player.health <= 0) {
    game.result = "Derrota";
  }
}

export function createGame(playerSelection = {}) {
  const playerLoadout = normalizeLoadout(playerSelection.loadout, DEFAULT_PLAYER_LOADOUT);
  const playerStyle = normalizeStyle(playerSelection, DEFAULT_PLAYER_STYLE);
  const enemyLoadout = normalizeLoadout(DEFAULT_ENEMY_LOADOUT, DEFAULT_ENEMY_LOADOUT);
  const enemyStyle = normalizeStyle(DEFAULT_ENEMY_STYLE, DEFAULT_ENEMY_STYLE);

  return {
    time: 0,
    player: createMage(
      "player",
      "Você",
      ARENA.centerX - 106,
      ARENA.centerY + 8,
      COLORS.playerRobe,
      COLORS.playerGlow,
      playerStyle,
      playerLoadout,
    ),
    enemy: createMage(
      "enemy",
      "Rival",
      ARENA.centerX + 106,
      ARENA.centerY - 8,
      COLORS.enemyRobe,
      COLORS.enemyGlow,
      enemyStyle,
      enemyLoadout,
      true,
    ),
    crowd: createCrowd(),
    projectiles: [],
    particles: [],
    strikes: [],
    walls: [],
    impactFlash: 0,
    shakeTimer: 0,
  };
}

export function updateGame(game, input, dtMs) {
  if (game.result) {
    game.time += dtMs;
    game.impactFlash = Math.max(0, game.impactFlash - dtMs);
    game.shakeTimer = Math.max(0, game.shakeTimer - dtMs);
    updateParticles(game, dtMs);
    updateStrikes(game, dtMs);
    updateWalls(game, dtMs);

    if (input.wasPressed("Space")) {
      return createGame(selectionFromMage(game.player));
    }

    return game;
  }

  game.time += dtMs;
  game.impactFlash = Math.max(0, game.impactFlash - dtMs);
  game.shakeTimer = Math.max(0, game.shakeTimer - dtMs);

  updateMageTimers(game.player, dtMs);
  updateMageTimers(game.enemy, dtMs);
  updatePlayer(game, input, dtMs);
  updateEnemy(game, dtMs);
  updateWalls(game, dtMs);
  updateProjectiles(game, dtMs);
  updateStrikes(game, dtMs);
  updateParticles(game, dtMs);
  updateEndState(game);

  return game;
}
