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
  angleToVector,
  clampPointToDistance,
  circleCollision,
  constrainToArena,
  cooldownBag,
  distance,
  length,
  normalize,
  pointInArena,
  pseudoRandom,
} from "./utils.js";

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
    radius: MAGE_STATS.radius,
    aimAngle: isEnemy ? Math.PI : 0,
    health: MAGE_STATS.maxHealth,
    maxHealth: MAGE_STATS.maxHealth,
    cooldowns: cooldownBag(),
    stunTimer: 0,
    boostTimer: 0,
    slowTimer: 0,
    immortalTimer: 0,
    castFlash: 0,
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
          strafeTimer: 0.75,
          decisionTimer: 0.85,
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
    const ringOffset = 0.72 + pseudoRandom(index + 8) * 0.38;
    const x = ARENA.centerX + Math.cos(angle) * outerX * ringOffset;
    const y = ARENA.centerY + Math.sin(angle) * outerY * ringOffset * 0.9;

    spots.push({
      x,
      y,
      size: pseudoRandom(index + 3) > 0.6 ? 2 : 1,
      color: colors[index % colors.length],
      bounce: pseudoRandom(index + 20) * Math.PI * 2,
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
  };
}

function burst(game, x, y, color, count, speed, size = 2, lifetime = 0.35, gravity = 0) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + pseudoRandom(x * 12 + y * 7 + index) * 0.6;
    const velocity = speed * (0.45 + pseudoRandom(index + x) * 0.7);
    game.particles.push(
      createParticle(
        x,
        y,
        color,
        size,
        lifetime,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        gravity,
      ),
    );
  }
}

function handPosition(mage) {
  const direction = angleToVector(mage.aimAngle);
  return {
    x: mage.x + direction.x * 10,
    y: mage.y - 3 + direction.y * 7,
  };
}

function abilityNeedsSelfTarget(abilityId) {
  return abilityId === "speedBoost" || abilityId === "immortality";
}

function getAbilityTargetPoint(caster, abilityId, targetPoint) {
  const ability = SPELLS[abilityId];

  if (!ability.range) {
    return { x: targetPoint.x, y: targetPoint.y };
  }

  return clampPointToDistance(caster.x, caster.y, targetPoint.x, targetPoint.y, ability.range);
}

function predictTargetPoint(source, target, projectileSpeed, leadFactor = 0.45) {
  const gap = distance(source.x, source.y, target.x, target.y);
  const travelTime = gap / projectileSpeed;
  return {
    x: target.x + target.vx * travelTime * leadFactor,
    y: target.y + target.vy * travelTime * leadFactor,
  };
}

function spawnProjectile(game, caster, abilityId, targetPoint) {
  const ability = SPELLS[abilityId];
  const cappedTarget = getAbilityTargetPoint(caster, abilityId, targetPoint);
  const castAngle = Math.atan2(cappedTarget.y - caster.y, cappedTarget.x - caster.x);
  const direction = angleToVector(castAngle);
  const hand = handPosition(caster);

  caster.aimAngle = castAngle;
  caster.cooldowns[abilityId] = ability.cooldown;
  caster.castFlash = 0.28;

  game.projectiles.push({
    ownerId: caster.id,
    abilityId,
    type: abilityId,
    x: hand.x + direction.x * 5,
    y: hand.y + direction.y * 5,
    vx: direction.x * ability.speed,
    vy: direction.y * ability.speed,
    radius: ability.radius,
    damage: ability.damage ?? 0,
    color: ability.color,
    travelLeft: ability.range,
  });

  burst(
    game,
    hand.x + direction.x * 5,
    hand.y + direction.y * 5,
    ability.color,
    abilityId === "fireball" ? 6 : 4,
    22,
    2,
    0.22,
  );
}

function castSpeedBoost(game, caster) {
  const ability = SPELLS.speedBoost;
  caster.cooldowns.speedBoost = ability.cooldown;
  caster.boostTimer = ability.duration;
  caster.castFlash = 0.2;
  burst(game, caster.x, caster.y, ability.color, 12, 20, 2, 0.45);
}

function castImmortality(game, caster) {
  const ability = SPELLS.immortality;
  caster.cooldowns.immortality = ability.cooldown;
  caster.immortalTimer = ability.duration;
  caster.castFlash = 0.25;
  burst(game, caster.x, caster.y, ability.color, 14, 20, 2, 0.5);
}

function castBlockWall(game, caster) {
  const ability = SPELLS.blockWall;
  const direction = angleToVector(caster.aimAngle);
  const wallCenter = constrainToArena(
    {
      x: caster.x + direction.x * ability.wallDistance,
      y: caster.y + direction.y * ability.wallDistance,
    },
    ARENA.safePadding + ability.wallThickness,
  );

  caster.cooldowns.blockWall = ability.cooldown;
  caster.castFlash = 0.18;
  game.walls.push({
    ownerId: caster.id,
    x: wallCenter.x,
    y: wallCenter.y,
    angle: caster.aimAngle,
    length: ability.wallLength,
    thickness: ability.wallThickness,
    timer: ability.duration,
    maxTimer: ability.duration,
    color: ability.color,
  });

  burst(game, wallCenter.x, wallCenter.y, ability.color, 12, 18, 2, 0.28);
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
  caster.castFlash = 0.35;
  game.strikes.push({
    ownerId: caster.id,
    abilityId: "thunderStrike",
    x: strikePoint.x,
    y: strikePoint.y,
    radius: ability.radius,
    timer: ability.castDelay,
    flashTimer: 0.22,
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

function updateMageTimers(mage, dt) {
  mage.stunTimer = Math.max(0, mage.stunTimer - dt);
  mage.boostTimer = Math.max(0, mage.boostTimer - dt);
  mage.slowTimer = Math.max(0, mage.slowTimer - dt);
  mage.immortalTimer = Math.max(0, mage.immortalTimer - dt);
  mage.castFlash = Math.max(0, mage.castFlash - dt);
  mage.hurtFlash = Math.max(0, mage.hurtFlash - dt * 2);

  for (const abilityId of Object.keys(mage.cooldowns)) {
    mage.cooldowns[abilityId] = Math.max(0, mage.cooldowns[abilityId] - dt);
  }
}

function applyMovement(mage, moveX, moveY, dt) {
  const direction = normalize(moveX, moveY);
  let speed = mage.boostTimer > 0 ? MAGE_STATS.boostedSpeed : MAGE_STATS.baseSpeed;

  if (mage.slowTimer > 0) {
    speed *= MAGE_STATS.slowedMultiplier;
  }

  mage.vx = direction.x * speed;
  mage.vy = direction.y * speed;
  mage.x += mage.vx * dt;
  mage.y += mage.vy * dt;
  mage.walkCycle += length(mage.vx, mage.vy) * dt * 0.12;
  constrainToArena(mage, ARENA.safePadding + mage.radius);
}

function applyMoveTarget(mage, dt) {
  if (!mage.moveTarget) {
    mage.vx = 0;
    mage.vy = 0;
    return;
  }

  const gapX = mage.moveTarget.x - mage.x;
  const gapY = mage.moveTarget.y - mage.y;
  const gap = Math.hypot(gapX, gapY);

  if (gap <= MAGE_STATS.stopDistance) {
    mage.moveTarget = null;
    mage.vx = 0;
    mage.vy = 0;
    return;
  }

  applyMovement(mage, gapX, gapY, dt);
}

function castTargetForPlayer(player, abilityId, input) {
  if (abilityNeedsSelfTarget(abilityId)) {
    return { x: player.x, y: player.y };
  }

  return { x: input.mouse.x, y: input.mouse.y };
}

function updatePlayer(game, input, dt) {
  const player = game.player;

  player.aimAngle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);

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
    applyMoveTarget(player, dt);

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

function updateEnemy(game, dt) {
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
  const range = Math.hypot(toPlayerX, toPlayerY);
  const direction = normalize(toPlayerX, toPlayerY);

  enemy.aimAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  enemy.ai.strafeTimer -= dt;
  enemy.ai.decisionTimer -= dt;

  if (enemy.ai.strafeTimer <= 0) {
    enemy.ai.strafeSign *= -1;
    enemy.ai.strafeTimer = 0.8 + pseudoRandom(game.time * 10) * 0.5;
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
      moveX -= direction.x * 0.65;
      moveY -= direction.y * 0.65;
    }

    applyMovement(enemy, moveX, moveY, dt);

    if (enemy.ai.decisionTimer <= 0) {
      const aimedPoint = qAbility.speed
        ? predictTargetPoint(enemy, player, qAbility.speed, qAbilityId === "shockBolt" ? 0.22 : 0.18)
        : { x: player.x, y: player.y };
      const controlPoint = wAbility.speed
        ? predictTargetPoint(enemy, player, wAbility.speed, 0.08)
        : { x: player.x, y: player.y };
      const utilityPoint = eAbility.speed
        ? predictTargetPoint(enemy, player, eAbility.speed, 0.16)
        : { x: player.x, y: player.y };
      const thunderScatterX = (pseudoRandom(game.time * 19 + enemy.health) - 0.5) * 14;
      const thunderScatterY = (pseudoRandom(game.time * 23 + enemy.health) - 0.5) * 14;

      if (eAbilityId === "speedBoost" && enemy.cooldowns[eAbilityId] <= 0 && (range > 156 || enemy.health < 30)) {
        tryCast(game, enemy, eAbilityId, { x: enemy.x, y: enemy.y });
      } else if (
        rAbilityId === "immortality" &&
        enemy.cooldowns[rAbilityId] <= 0 &&
        enemy.health < enemy.maxHealth * 0.34
      ) {
        tryCast(game, enemy, rAbilityId, { x: enemy.x, y: enemy.y });
      } else if (rAbilityId === "thunderStrike" && enemy.cooldowns[rAbilityId] <= 0 && range < 142) {
        tryCast(game, enemy, rAbilityId, {
          x: player.x + player.vx * 0.08 + thunderScatterX,
          y: player.y + player.vy * 0.08 + thunderScatterY,
        });
      } else if (wAbilityId === "blockWall" && enemy.cooldowns[wAbilityId] <= 0 && range < 104) {
        tryCast(game, enemy, wAbilityId, { x: player.x, y: player.y });
      } else if (wAbilityId === "stunShot" && enemy.cooldowns[wAbilityId] <= 0 && player.stunTimer < 0.25) {
        tryCast(game, enemy, wAbilityId, controlPoint);
      } else if (eAbilityId === "slowShot" && enemy.cooldowns[eAbilityId] <= 0) {
        tryCast(game, enemy, eAbilityId, utilityPoint);
      } else if (enemy.cooldowns[qAbilityId] <= 0) {
        tryCast(game, enemy, qAbilityId, aimedPoint);
      }

      enemy.ai.decisionTimer = 0.52 + pseudoRandom(game.time * 7 + enemy.health) * 0.26;
    }
  } else {
    enemy.vx = 0;
    enemy.vy = 0;
  }
}

function damageMage(game, target, amount, color) {
  if (target.immortalTimer > 0) {
    burst(game, target.x, target.y - 6, "#f5e2b2", 8, 18, 2, 0.22);
    return false;
  }

  target.health = Math.max(0, target.health - amount);
  target.hurtFlash = 0.35;
  burst(game, target.x, target.y - 4, color, 8, 24, 2, 0.3, 20);
  return true;
}

function stunMage(game, target, duration) {
  target.stunTimer = Math.max(target.stunTimer, duration);
  burst(game, target.x, target.y - 8, "#b5f4ff", 8, 16, 2, 0.48);
}

function slowMage(game, target, duration) {
  target.slowTimer = Math.max(target.slowTimer, duration);
  burst(game, target.x, target.y - 6, "#8bcf9c", 8, 16, 2, 0.4);
}

function wallEndpoints(wall) {
  const direction = angleToVector(wall.angle);
  const perpendicular = { x: -direction.y, y: direction.x };
  return {
    ax: wall.x - perpendicular.x * (wall.length / 2),
    ay: wall.y - perpendicular.y * (wall.length / 2),
    bx: wall.x + perpendicular.x * (wall.length / 2),
    by: wall.y + perpendicular.y * (wall.length / 2),
  };
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const lengthSquared = abX * abX + abY * abY;

  if (!lengthSquared) {
    return distance(px, py, ax, ay);
  }

  const projection = ((px - ax) * abX + (py - ay) * abY) / lengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));
  const closestX = ax + abX * clampedProjection;
  const closestY = ay + abY * clampedProjection;
  return distance(px, py, closestX, closestY);
}

function projectileHitsWall(projectile, wall) {
  const { ax, ay, bx, by } = wallEndpoints(wall);
  return distanceToSegment(projectile.x, projectile.y, ax, ay, bx, by) <= projectile.radius + wall.thickness / 2;
}

function updateWalls(game, dt) {
  game.walls = game.walls.filter((wall) => {
    wall.timer -= dt;
    return wall.timer > 0;
  });
}

function updateProjectiles(game, dt) {
  game.projectiles = game.projectiles.filter((projectile) => {
    const ability = SPELLS[projectile.abilityId];
    const travel = Math.hypot(projectile.vx * dt, projectile.vy * dt);
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.travelLeft -= travel;

    if (pseudoRandom(projectile.x + projectile.y + game.time) > 0.38) {
      game.particles.push(
        createParticle(
          projectile.x,
          projectile.y,
          projectile.color,
          2,
          0.18,
          -projectile.vx * 0.08,
          -projectile.vy * 0.08,
        ),
      );
    }

    for (const wall of game.walls) {
      if (wall.ownerId !== projectile.ownerId && projectileHitsWall(projectile, wall)) {
        burst(game, projectile.x, projectile.y, wall.color, 8, 18, 2, 0.2);
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

      burst(game, projectile.x, projectile.y, projectile.color, 10, 28, 2, 0.22);
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
  strike.flashTimer = 0.3;
  game.impactFlash = 0.22;
  game.shakeTimer = 0.26;

  const target = strike.ownerId === game.player.id ? game.enemy : game.player;
  const hitDistance = distance(strike.x, strike.y, target.x, target.y);

  if (target.health > 0 && hitDistance <= strike.radius + target.radius) {
    const damage = ability.damageRatio ? target.maxHealth * ability.damageRatio : ability.damage;
    damageMage(game, target, damage, ability.color);
  }

  burst(game, strike.x, strike.y, ability.color, 16, 36, 3, 0.48, 18);
}

function updateStrikes(game, dt) {
  game.strikes = game.strikes.filter((strike) => {
    if (!strike.resolved) {
      strike.timer -= dt;
      if (strike.timer <= 0) {
        resolveStrike(game, strike);
      }
      return true;
    }

    strike.flashTimer -= dt;
    return strike.flashTimer > 0;
  });
}

function updateParticles(game, dt) {
  game.particles = game.particles.filter((particle) => {
    particle.lifetime -= dt;
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
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

export function updateGame(game, input, dt) {
  if (game.result) {
    game.time += dt;
    game.impactFlash = Math.max(0, game.impactFlash - dt);
    game.shakeTimer = Math.max(0, game.shakeTimer - dt);
    updateParticles(game, dt);
    updateStrikes(game, dt);
    updateWalls(game, dt);

    if (input.wasPressed("Space")) {
      return createGame(selectionFromMage(game.player));
    }

    return game;
  }

  game.time += dt;
  game.impactFlash = Math.max(0, game.impactFlash - dt);
  game.shakeTimer = Math.max(0, game.shakeTimer - dt);

  updateMageTimers(game.player, dt);
  updateMageTimers(game.enemy, dt);
  updatePlayer(game, input, dt);
  updateEnemy(game, dt);
  updateWalls(game, dt);
  updateProjectiles(game, dt);
  updateStrikes(game, dt);
  updateParticles(game, dt);
  updateEndState(game);

  return game;
}
