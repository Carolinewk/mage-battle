import { ARENA, COLORS, MAGE_STATS, SPELLS } from "./config.js";
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

function createMage(id, label, x, y, robeColor, glowColor, isEnemy = false) {
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
    castFlash: 0,
    hurtFlash: 0,
    walkCycle: 0,
    robeColor,
    glowColor,
    moveTarget: null,
    ai: isEnemy
      ? {
          strafeSign: 1,
          strafeTimer: 0.75,
          decisionTimer: 0.6,
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

function getSpellTargetPoint(caster, spellName, targetPoint) {
  const spell = SPELLS[spellName];

  if (!spell.range) {
    return { x: targetPoint.x, y: targetPoint.y };
  }

  return clampPointToDistance(caster.x, caster.y, targetPoint.x, targetPoint.y, spell.range);
}

function predictTargetPoint(source, target, projectileSpeed) {
  const gap = distance(source.x, source.y, target.x, target.y);
  const travelTime = gap / projectileSpeed;
  return {
    x: target.x + target.vx * travelTime * 0.45,
    y: target.y + target.vy * travelTime * 0.45,
  };
}

function spawnProjectile(game, caster, spellName, targetPoint) {
  const spell = SPELLS[spellName];
  const cappedTarget = getSpellTargetPoint(caster, spellName, targetPoint);
  const castAngle = Math.atan2(cappedTarget.y - caster.y, cappedTarget.x - caster.x);
  const direction = angleToVector(castAngle);
  const hand = handPosition(caster);

  caster.aimAngle = castAngle;
  caster.cooldowns[spellName] = spell.cooldown;
  caster.castFlash = 0.28;

  game.projectiles.push({
    ownerId: caster.id,
    type: spellName,
    x: hand.x + direction.x * 5,
    y: hand.y + direction.y * 5,
    vx: direction.x * spell.speed,
    vy: direction.y * spell.speed,
    radius: spell.radius,
    damage: spell.damage,
    color: spell.color,
    travelLeft: spell.range,
  });

  burst(
    game,
    hand.x + direction.x * 5,
    hand.y + direction.y * 5,
    spell.color,
    spellName === "fireball" ? 5 : 4,
    22,
    2,
    0.22,
  );
}

function castSpeedBoost(game, caster) {
  caster.cooldowns.speedBoost = SPELLS.speedBoost.cooldown;
  caster.boostTimer = SPELLS.speedBoost.duration;
  caster.castFlash = 0.2;
  burst(game, caster.x, caster.y, "#9effb4", 12, 20, 2, 0.45);
}

function castThunderStrike(game, caster, targetPoint) {
  const rangedPoint = getSpellTargetPoint(caster, "thunderStrike", targetPoint);
  const strikePoint = constrainToArena(
    {
      x: rangedPoint.x,
      y: rangedPoint.y,
    },
    ARENA.safePadding + SPELLS.thunderStrike.radius,
  );

  caster.cooldowns.thunderStrike = SPELLS.thunderStrike.cooldown;
  caster.castFlash = 0.35;
  game.strikes.push({
    ownerId: caster.id,
    x: strikePoint.x,
    y: strikePoint.y,
    radius: SPELLS.thunderStrike.radius,
    timer: SPELLS.thunderStrike.castDelay,
    flashTimer: 0.22,
    resolved: false,
  });
}

function canAct(mage) {
  return mage.health > 0 && mage.stunTimer <= 0;
}

function tryCast(game, caster, spellName, targetPoint) {
  if (!canAct(caster) || caster.cooldowns[spellName] > 0) {
    return false;
  }

  if (spellName === "speedBoost") {
    castSpeedBoost(game, caster);
    return true;
  }

  if (spellName === "thunderStrike") {
    castThunderStrike(game, caster, targetPoint);
    return true;
  }

  spawnProjectile(game, caster, spellName, targetPoint);
  return true;
}

function updateMageTimers(mage, dt) {
  mage.stunTimer = Math.max(0, mage.stunTimer - dt);
  mage.boostTimer = Math.max(0, mage.boostTimer - dt);
  mage.castFlash = Math.max(0, mage.castFlash - dt);
  mage.hurtFlash = Math.max(0, mage.hurtFlash - dt * 2);

  for (const spellName of Object.keys(mage.cooldowns)) {
    mage.cooldowns[spellName] = Math.max(0, mage.cooldowns[spellName] - dt);
  }
}

function applyMovement(mage, moveX, moveY, dt) {
  const direction = normalize(moveX, moveY);
  const speed = mage.boostTimer > 0 ? MAGE_STATS.boostedSpeed : MAGE_STATS.baseSpeed;

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

    if (input.wasPressed(SPELLS.fireball.key)) {
      tryCast(game, player, "fireball", { x: input.mouse.x, y: input.mouse.y });
    }

    if (input.wasPressed(SPELLS.stunShot.key)) {
      tryCast(game, player, "stunShot", { x: input.mouse.x, y: input.mouse.y });
    }

    if (input.wasPressed(SPELLS.speedBoost.key)) {
      tryCast(game, player, "speedBoost", { x: player.x, y: player.y });
    }

    if (input.wasPressed(SPELLS.thunderStrike.key)) {
      tryCast(game, player, "thunderStrike", { x: input.mouse.x, y: input.mouse.y });
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

    if (range > 116) {
      moveX = direction.x;
      moveY = direction.y;
    } else if (range < 84) {
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
      const aimedPoint = predictTargetPoint(enemy, player, SPELLS.fireball.speed);
      const stunPoint = predictTargetPoint(enemy, player, SPELLS.stunShot.speed);

      if (enemy.cooldowns.speedBoost <= 0 && (range > 142 || enemy.health < 38)) {
        tryCast(game, enemy, "speedBoost", aimedPoint);
      } else if (enemy.cooldowns.thunderStrike <= 0 && range < 155) {
        tryCast(game, enemy, "thunderStrike", {
          x: player.x + player.vx * 0.2,
          y: player.y + player.vy * 0.2,
        });
      } else if (enemy.cooldowns.stunShot <= 0 && player.stunTimer < 0.25) {
        tryCast(game, enemy, "stunShot", stunPoint);
      } else if (enemy.cooldowns.fireball <= 0) {
        tryCast(game, enemy, "fireball", aimedPoint);
      }

      enemy.ai.decisionTimer = 0.3 + pseudoRandom(game.time * 7 + enemy.health) * 0.15;
    }
  } else {
    enemy.vx = 0;
    enemy.vy = 0;
  }
}

function damageMage(game, target, amount, color) {
  target.health = Math.max(0, target.health - amount);
  target.hurtFlash = 0.35;
  burst(game, target.x, target.y - 4, color, 8, 24, 2, 0.3, 20);
}

function stunMage(game, target, duration) {
  target.stunTimer = Math.max(target.stunTimer, duration);
  burst(game, target.x, target.y - 8, "#b5f4ff", 8, 16, 2, 0.48);
}

function updateProjectiles(game, dt) {
  game.projectiles = game.projectiles.filter((projectile) => {
    const travel = Math.hypot(projectile.vx * dt, projectile.vy * dt);
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.travelLeft -= travel;

    if (pseudoRandom(projectile.x + projectile.y + game.time) > 0.38) {
      game.particles.push(
        createParticle(
          projectile.x,
          projectile.y,
          projectile.type === "fireball" ? "#ffd0a0" : "#d9fbff",
          2,
          0.18,
          -projectile.vx * 0.08,
          -projectile.vy * 0.08,
        ),
      );
    }

    const target = projectile.ownerId === game.player.id ? game.enemy : game.player;

    if (target.health > 0 && circleCollision(projectile, target)) {
      damageMage(game, target, projectile.damage, projectile.color);

      if (projectile.type === "stunShot") {
        stunMage(game, target, SPELLS.stunShot.stunDuration);
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
  strike.resolved = true;
  strike.flashTimer = 0.3;
  game.impactFlash = 0.22;
  game.shakeTimer = 0.26;

  const target = strike.ownerId === game.player.id ? game.enemy : game.player;
  const hitDistance = distance(strike.x, strike.y, target.x, target.y);

  if (target.health > 0 && hitDistance <= strike.radius + target.radius) {
    damageMage(game, target, SPELLS.thunderStrike.damage, "#fff2a1");
  }

  burst(game, strike.x, strike.y, "#fff5ad", 16, 36, 3, 0.48, 18);
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

export function createGame() {
  return {
    time: 0,
    player: createMage("player", "Você", ARENA.centerX - 92, ARENA.centerY + 8, COLORS.playerRobe, COLORS.playerGlow),
    enemy: createMage("enemy", "Rival", ARENA.centerX + 92, ARENA.centerY - 8, COLORS.enemyRobe, COLORS.enemyGlow, true),
    crowd: createCrowd(),
    projectiles: [],
    particles: [],
    strikes: [],
    impactFlash: 0,
    shakeTimer: 0,
  };
}

export function getSpellPreview(caster, spellName, targetPoint) {
  const spell = SPELLS[spellName];
  const cappedTarget = spell.range
    ? getSpellTargetPoint(caster, spellName, targetPoint)
    : { x: caster.x, y: caster.y };

  return {
    x: cappedTarget.x,
    y: cappedTarget.y,
    range: spell.range ?? 0,
    radius: spell.radius ?? spell.auraRadius ?? 0,
    color: spell.color,
  };
}

export function updateGame(game, input, dt) {
  if (game.result) {
    game.time += dt;
    game.impactFlash = Math.max(0, game.impactFlash - dt);
    game.shakeTimer = Math.max(0, game.shakeTimer - dt);
    updateParticles(game, dt);
    updateStrikes(game, dt);

    if (input.wasPressed("Space")) {
      return createGame();
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
  updateProjectiles(game, dt);
  updateStrikes(game, dt);
  updateParticles(game, dt);
  updateEndState(game);

  return game;
}
