import { ARENA, SPELLS, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./config.js";
import { angleToVector, clamp } from "./utils.js";
import { getSpellPreview } from "./game.js";

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

  ctx.fillStyle = "#0b1422";
  ctx.fillRect(0, 188, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 188);

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

  for (let stripe = 0; stripe < 10; stripe += 1) {
    ctx.fillStyle = stripe % 2 === 0 ? "#3d7c34" : "#2f652b";
    ctx.fillRect(ARENA.centerX - ARENA.radiusX, 54 + stripe * 19, ARENA.radiusX * 2, 19);
  }

  ctx.strokeStyle = "rgba(230, 247, 255, 0.36)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ARENA.centerX, ARENA.centerY - ARENA.radiusY);
  ctx.lineTo(ARENA.centerX, ARENA.centerY + ARENA.radiusY);
  ctx.stroke();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, 26, 26);
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

function drawDashedCircle(ctx, x, y, radius, dashCount, color, alpha = 1, lineWidth = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  for (let dash = 0; dash < dashCount; dash += 1) {
    const start = (dash / dashCount) * Math.PI * 2;
    const end = start + (Math.PI * 2) / dashCount * 0.58;
    ctx.moveTo(x + Math.cos(start) * radius, y + Math.sin(start) * radius);
    ctx.arc(x, y, radius, start, end);
  }

  ctx.stroke();
  ctx.restore();
}

function drawSpellTelegraphs(ctx, game, input) {
  const player = game.player;
  const fireball = getSpellPreview(player, "fireball", input.mouse);
  const stunShot = getSpellPreview(player, "stunShot", input.mouse);
  const thunder = getSpellPreview(player, "thunderStrike", input.mouse);

  drawDashedCircle(ctx, player.x, player.y, fireball.range, 36, "#ff9445", 0.22);
  drawDashedCircle(ctx, player.x, player.y, stunShot.range, 30, "#7ee6ff", 0.22);
  drawDashedCircle(ctx, player.x, player.y, thunder.range, 42, "#fff09d", 0.18);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 148, 69, 0.38)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 4);
  ctx.lineTo(fireball.x, fireball.y);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 148, 69, 0.22)";
  ctx.beginPath();
  ctx.arc(fireball.x, fireball.y, SPELLS.fireball.radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(126, 230, 255, 0.48)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 4);
  ctx.lineTo(stunShot.x, stunShot.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(126, 230, 255, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stunShot.x, stunShot.y, SPELLS.stunShot.radius * 2.4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(140, 247, 168, 0.08)";
  ctx.beginPath();
  ctx.arc(player.x, player.y, SPELLS.speedBoost.auraRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(140, 247, 168, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 240, 157, 0.14)";
  ctx.beginPath();
  ctx.arc(thunder.x, thunder.y, thunder.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 240, 157, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 240, 157, 0.38)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(thunder.x, thunder.y);
  ctx.stroke();
  ctx.restore();
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
  const bodyTop = y - 9;
  const bookX = Math.round(x - aim.x * 4 - perp.x * 8);
  const bookY = Math.round(y - 6 - aim.y * 3 - perp.y * 8);
  const wandHandX = x + aim.x * 7 + perp.x * 3;
  const wandHandY = y - 5 + aim.y * 7 + perp.y * 3;

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
  const darkTrim = mage.isEnemy ? "#7b1f22" : "#4c215b";

  ctx.fillStyle = mage.glowColor;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = darkTrim;
  ctx.fillRect(x - 7, y - 1, 14, 10);

  ctx.fillStyle = mage.robeColor;
  ctx.fillRect(x - 8, bodyTop, 16, 15);
  ctx.fillRect(x - 10, y + 4, 20, 4);
  ctx.fillRect(x - 5, y + 8, 4, 4);
  ctx.fillRect(x + 1, y + 8, 4, 4);

  ctx.fillStyle = trimColor;
  ctx.fillRect(x - 1, bodyTop + 3, 2, 10);
  ctx.fillRect(x - 8, y + 4, 16, 1);

  ctx.fillStyle = darkTrim;
  ctx.fillRect(x - 9, y - 3, 4, 6);
  ctx.fillRect(x + 5, y - 3, 4, 6);

  ctx.fillStyle = "#f7d2b0";
  ctx.fillRect(x - 4, y - 13, 8, 7);
  ctx.fillRect(Math.round(bookX - 1), Math.round(bookY), 2, 2);
  ctx.fillRect(Math.round(wandHandX - 1), Math.round(wandHandY), 2, 2);

  ctx.fillStyle = darkTrim;
  ctx.fillRect(x - 8, y - 16, 16, 2);
  ctx.fillRect(x - 5, y - 22, 10, 6);
  ctx.fillRect(x - 3, y - 28, 6, 6);

  ctx.fillStyle = trimColor;
  ctx.fillRect(x - 2, y - 25, 1, 2);

  ctx.fillStyle = "#5a3118";
  ctx.fillRect(bookX - 5, bookY - 3, 10, 7);
  ctx.fillStyle = "#d8c093";
  ctx.fillRect(bookX - 4, bookY - 2, 4, 5);
  ctx.fillRect(bookX + 1, bookY - 2, 3, 5);
  ctx.fillStyle = "#b58958";
  ctx.fillRect(bookX, bookY - 3, 1, 7);
  ctx.fillStyle = "#845331";
  ctx.fillRect(bookX - 6, bookY - 3, 1, 7);

  ctx.strokeStyle = "#f3e8bf";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wandHandX, wandHandY);
  ctx.lineTo(wandHandX + aim.x * 15, wandHandY + aim.y * 15);
  ctx.stroke();

  ctx.fillStyle = mage.glowColor;
  ctx.beginPath();
  ctx.arc(wandHandX + aim.x * 15, wandHandY + aim.y * 15, mage.castFlash > 0 ? 4 : 3, 0, Math.PI * 2);
  ctx.fill();

  if (mage.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${mage.hurtFlash * 0.6})`;
    ctx.fillRect(x - 11, y - 29, 22, 42);
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
  drawSpellTelegraphs(ctx, game, input);
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
