import { ARENA, SPELLS, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./config.js";
import { angleToVector, clamp } from "./utils.js";

function textShadow(ctx, text, x, y, color = "#ffffff", align = "left") {
  ctx.textAlign = align;
  ctx.fillStyle = "rgba(8, 12, 24, 0.9)";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawEllipse(ctx, x, y, radiusX, radiusY) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
}

function drawBackground(ctx, game) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
  sky.addColorStop(0, "#31557c");
  sky.addColorStop(0.45, "#223e5d");
  sky.addColorStop(1, "#102139");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const arenaHorizon = Math.round(ARENA.centerY + ARENA.radiusY * 0.46);
  ctx.fillStyle = "#0b1422";
  ctx.fillRect(0, arenaHorizon, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - arenaHorizon);

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 52, ARENA.radiusY + 42);
  ctx.fillStyle = "#122238";
  ctx.fill();

  for (const spectator of game.crowd) {
    const bounce = Math.sin(game.time * 3 + spectator.bounce) * 0.6;
    ctx.fillStyle = spectator.color;
    ctx.fillRect(Math.round(spectator.x), Math.round(spectator.y + bounce), spectator.size, spectator.size);
  }

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 22, ARENA.radiusY + 14);
  ctx.fillStyle = "#0f1c2b";
  ctx.fill();
}

function drawField(ctx) {
  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX, ARENA.radiusY);
  ctx.fillStyle = "#356e2f";
  ctx.fill();

  ctx.save();
  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX, ARENA.radiusY);
  ctx.clip();

  const fieldTop = Math.round(ARENA.centerY - ARENA.radiusY);
  const stripeHeight = 18;
  const stripeCount = Math.ceil((ARENA.radiusY * 2) / stripeHeight) + 1;
  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    ctx.fillStyle = stripe % 2 === 0 ? "#3d7c34" : "#2f652b";
    ctx.fillRect(
      ARENA.centerX - ARENA.radiusX,
      fieldTop + stripe * stripeHeight,
      ARENA.radiusX * 2,
      stripeHeight,
    );
  }

  ctx.strokeStyle = "rgba(230, 247, 255, 0.36)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ARENA.centerX, ARENA.centerY - ARENA.radiusY);
  ctx.lineTo(ARENA.centerX, ARENA.centerY + ARENA.radiusY);
  ctx.stroke();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, 30, 30);
  ctx.stroke();
  ctx.restore();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX, ARENA.radiusY);
  ctx.strokeStyle = "#f3df80";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawGoals(ctx) {
  const goalPositions = [
    ARENA.centerX - ARENA.radiusX + 18,
    ARENA.centerX + ARENA.radiusX - 18,
  ];

  for (const x of goalPositions) {
    for (let ring = 0; ring < 3; ring += 1) {
      const offsetY = ARENA.centerY - 28 + ring * 24;
      ctx.strokeStyle = "#f6e298";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, offsetY, 9 - ring, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#8d7032";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, offsetY + 8);
      ctx.lineTo(x, ARENA.centerY + 42);
      ctx.stroke();
    }
  }
}

function drawProjectile(ctx, projectile) {
  if (projectile.type === "fireball") {
    ctx.fillStyle = "#ffdca8";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius - 1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.strokeStyle = "#dcffff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius - 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawSegment(ctx, startX, startY, endX, endY, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function drawStrike(ctx, strike, time) {
  if (!strike.resolved) {
    const pulse = 1 + Math.sin(time * 12 + strike.x) * 0.08;
    ctx.strokeStyle = "rgba(255, 242, 149, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, strike.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(156, 230, 255, 0.65)";
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, strike.radius * 0.66 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const alpha = clamp(strike.flashTimer / 0.3, 0, 1);
  ctx.strokeStyle = `rgba(255, 249, 194, ${alpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(strike.x - 3, 0);
  ctx.lineTo(strike.x + 4, strike.y - 12);
  ctx.lineTo(strike.x - 5, strike.y + 3);
  ctx.lineTo(strike.x + 2, strike.y + strike.radius);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 250, 210, ${alpha * 0.6})`;
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, strike.radius + 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx, particles) {
  for (const particle of particles) {
    const alpha = clamp(particle.lifetime / particle.maxLifetime, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    ctx.globalAlpha = 1;
  }
}

function drawStunEffect(ctx, mage, time) {
  for (let star = 0; star < 3; star += 1) {
    const angle = time * 8 + star * ((Math.PI * 2) / 3);
    const x = mage.x + Math.cos(angle) * 10;
    const y = mage.y - 19 + Math.sin(angle) * 4;
    ctx.fillStyle = "#d9fbff";
    ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
  }
}

function drawMage(ctx, mage, time) {
  const bob = Math.sin(mage.walkCycle) * (Math.hypot(mage.vx, mage.vy) > 1 ? 1.5 : 0.45);
  const x = Math.round(mage.x);
  const y = Math.round(mage.y + bob);
  const aim = angleToVector(mage.aimAngle);
  const perp = { x: -aim.y, y: aim.x };
  const walking = Math.hypot(mage.vx, mage.vy) > 1;
  const gait = Math.sin(mage.walkCycle * 1.15) * (walking ? 4.2 : 0.7);
  const sway = Math.cos(mage.walkCycle * 1.15) * (walking ? 2.4 : 0.8);
  const headX = x;
  const headY = y - 14;
  const shoulderX = x;
  const shoulderY = y - 7;
  const hipX = x;
  const hipY = y + 4;
  const wandHandX = x + aim.x * 9 + perp.x * 2;
  const wandHandY = shoulderY + aim.y * 8 + perp.y * 2;
  const wandTipX = wandHandX + aim.x * 9;
  const wandTipY = wandHandY + aim.y * 9;
  const wandAccentX = wandHandX + aim.x * 6;
  const wandAccentY = wandHandY + aim.y * 6;
  const offHandX = x - aim.x * 3 - perp.x * 6 + sway * 0.35;
  const offHandY = shoulderY + 1 - aim.y * 2 - perp.y * 4 + sway * 0.45;
  const leftFootX = x - 5 + gait;
  const rightFootX = x + 5 - gait;
  const footY = y + 14;
  const bodyColor = mage.isEnemy ? "#7b1f22" : "#4c215b";
  const hatColor = mage.robeColor;

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (mage.boostTimer > 0) {
    ctx.fillStyle = "rgba(145, 255, 176, 0.25)";
    ctx.beginPath();
    ctx.arc(x, y + 2, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  const trimColor = mage.isEnemy ? "#ffcd93" : "#f8de83";
  const darkTrim = mage.isEnemy ? "#341014" : "#24112c";

  ctx.fillStyle = mage.glowColor;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = "#f7d2b0";
  ctx.beginPath();
  ctx.arc(headX, headY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hatColor;
  ctx.beginPath();
  ctx.moveTo(headX - 2, headY - 12);
  ctx.lineTo(headX - 7, headY - 3);
  ctx.lineTo(headX + 4, headY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(headX - 6, headY - 4, 12, 2);
  ctx.fillStyle = trimColor;
  ctx.fillRect(headX - 1, headY - 9, 2, 2);

  drawSegment(ctx, shoulderX, shoulderY, hipX, hipY, bodyColor, 3);
  drawSegment(ctx, shoulderX, shoulderY, offHandX, offHandY, bodyColor, 2.5);
  drawSegment(ctx, shoulderX, shoulderY, wandHandX, wandHandY, bodyColor, 2.5);
  drawSegment(ctx, hipX, hipY, leftFootX, footY, bodyColor, 2.5);
  drawSegment(ctx, hipX, hipY, rightFootX, footY, bodyColor, 2.5);

  ctx.fillStyle = mage.robeColor;
  ctx.beginPath();
  ctx.arc(x, y - 1, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = darkTrim;
  ctx.beginPath();
  ctx.arc(offHandX, offHandY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(wandHandX, wandHandY, 2, 0, Math.PI * 2);
  ctx.fill();

  drawSegment(ctx, wandHandX, wandHandY, wandTipX, wandTipY, "#6f4725", 2);
  drawSegment(ctx, wandAccentX, wandAccentY, wandTipX, wandTipY, "#d6b16a", 1.2);
  ctx.fillStyle = "#efd8a8";
  ctx.beginPath();
  ctx.arc(wandHandX, wandHandY, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mage.castFlash > 0 ? mage.glowColor : trimColor;
  ctx.beginPath();
  ctx.arc(wandTipX, wandTipY, mage.castFlash > 0 ? 2.3 : 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (mage.castFlash > 0) {
    ctx.fillStyle = mage.glowColor;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(wandTipX, wandTipY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (mage.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${mage.hurtFlash * 0.6})`;
    ctx.fillRect(x - 12, y - 28, 24, 38);
  }

  if (mage.stunTimer > 0) {
    drawStunEffect(ctx, mage, time);
  }
}

function drawCrosshair(ctx, mouse, pulse) {
  const x = Math.round(mouse.x);
  const y = Math.round(mouse.y);
  const size = 6 + Math.sin(pulse * 8) * 1.2;

  ctx.strokeStyle = "rgba(242, 245, 255, 0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x - 1, y);
  ctx.moveTo(x + 1, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y - 1);
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

function drawMoveTarget(ctx, moveTarget, time) {
  if (!moveTarget) {
    return;
  }

  const pulse = 1 + Math.sin(time * 8) * 0.08;
  ctx.save();
  ctx.strokeStyle = "rgba(235, 248, 255, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(moveTarget.x, moveTarget.y, 8 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(121, 176, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(moveTarget.x, moveTarget.y, 13 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHealthBar(ctx, label, mage, x, y, align = "left") {
  const width = 118;
  const height = 12;
  const healthRatio = mage.health / mage.maxHealth;
  const startX = align === "right" ? x - width : x;

  ctx.fillStyle = "rgba(8, 12, 20, 0.82)";
  ctx.fillRect(startX, y, width, height);
  ctx.fillStyle = mage.robeColor;
  ctx.fillRect(startX + 1, y + 1, Math.max(0, (width - 2) * healthRatio), height - 2);
  ctx.strokeStyle = "rgba(242, 248, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(startX + 0.5, y + 0.5, width - 1, height - 1);

  textShadow(ctx, `${label} ${Math.ceil(mage.health)}`, align === "right" ? x : startX, y - 4, "#f3f6ff", align);
}

function drawCooldowns(ctx, player) {
  const order = [
    ["Q", "fireball"],
    ["W", "stunShot"],
    ["E", "speedBoost"],
    ["R", "thunderStrike"],
  ];

  const totalWidth = order.length * 52 + 18;
  const startX = Math.round(VIRTUAL_WIDTH / 2 - totalWidth / 2);
  const y = VIRTUAL_HEIGHT - 32;

  order.forEach(([label, spellName], index) => {
    const x = startX + index * 56;
    const cooldown = player.cooldowns[spellName];
    const maxCooldown = SPELLS[spellName].cooldown;

    ctx.fillStyle = "rgba(7, 12, 20, 0.84)";
    ctx.fillRect(x, y, 46, 22);
    ctx.strokeStyle = "rgba(235, 243, 255, 0.16)";
    ctx.strokeRect(x + 0.5, y + 0.5, 45, 21);

    if (cooldown > 0) {
      const ratio = cooldown / maxCooldown;
      ctx.fillStyle = "rgba(90, 129, 163, 0.5)";
      ctx.fillRect(x, y + 22 - ratio * 22, 46, ratio * 22);
      textShadow(ctx, cooldown.toFixed(cooldown >= 1 ? 1 : 2), x + 23, y + 15, "#eff4ff", "center");
    } else {
      textShadow(ctx, "ready", x + 23, y + 15, "#a5ffc2", "center");
    }

    textShadow(ctx, label, x + 4, y - 3, "#ffd86e");
  });
}

function drawOverlay(ctx, game) {
  ctx.font = "bold 8px monospace";
  drawHealthBar(ctx, "Você", game.player, 16, 15);
  drawHealthBar(ctx, "Rival", game.enemy, VIRTUAL_WIDTH - 16, 15, "right");
  drawCooldowns(ctx, game.player);

  textShadow(ctx, "Clique direito move | Mouse mira | QWER conjuram", VIRTUAL_WIDTH / 2, 16, "#d9e7ff", "center");

  if (game.player.stunTimer > 0) {
    textShadow(ctx, "Atordoado!", 52, 42, "#bdf5ff");
  }

  if (game.enemy.stunTimer > 0) {
    textShadow(ctx, "Rival atordoado", VIRTUAL_WIDTH - 52, 42, "#bdf5ff", "right");
  }

  if (game.result) {
    ctx.fillStyle = "rgba(5, 8, 20, 0.62)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.font = "bold 18px monospace";
    textShadow(ctx, game.result, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 8, "#fff4ba", "center");
    ctx.font = "bold 8px monospace";
    textShadow(ctx, "Pressione Espaco para recomecar", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 14, "#f0f5ff", "center");
  }
}

export function renderGame(ctx, game, input) {
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  ctx.font = "bold 8px monospace";
  drawBackground(ctx, game);

  const shakeX = game.shakeTimer > 0 ? Math.round(Math.sin(game.time * 70) * 2.6) : 0;
  const shakeY = game.shakeTimer > 0 ? Math.round(Math.cos(game.time * 55) * 1.8) : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawGoals(ctx);
  drawField(ctx);
  drawMoveTarget(ctx, game.player.moveTarget, game.time);

  for (const strike of game.strikes) {
    drawStrike(ctx, strike, game.time);
  }

  for (const projectile of game.projectiles) {
    drawProjectile(ctx, projectile);
  }

  drawMage(ctx, game.player, game.time);
  drawMage(ctx, game.enemy, game.time);
  drawParticles(ctx, game.particles);
  ctx.restore();

  if (input.mouse.inside && !game.result) {
    drawCrosshair(ctx, input.mouse, game.time);
  }

  if (game.impactFlash > 0) {
    ctx.fillStyle = `rgba(255, 248, 205, ${game.impactFlash * 0.65})`;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  drawOverlay(ctx, game);
}
