import { ABILITY_SLOTS, ARENA, SPELLS, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./config.js";
import { angleToVector, clamp } from "./utils.js";

const THEME = {
  midnight: "#0B1B2B",
  indigo: "#1A2740",
  forest: "#2F5D3A",
  emerald: "#1E4A34",
  burgundy: "#6E2233",
  gold: "#D4B06A",
  antiqueGold: "#B08A47",
  parchment: "#E8DCC2",
  walnut: "#4A3325",
  silver: "#AEB7C1",
  cyan: "#7FD6E5",
  violet: "#9D7BEA",
  ink: "#081018",
};

const ABILITY_OVERLAYS = {
  fireball: "rgba(215, 152, 87, 0.26)",
  shockBolt: "rgba(127, 214, 229, 0.26)",
  stunShot: "rgba(127, 214, 229, 0.24)",
  blockWall: "rgba(174, 183, 193, 0.24)",
  speedBoost: "rgba(139, 207, 156, 0.24)",
  slowShot: "rgba(139, 207, 156, 0.26)",
  thunderStrike: "rgba(157, 123, 234, 0.24)",
  immortality: "rgba(212, 176, 106, 0.24)",
};

function textShadow(ctx, text, x, y, color = "#ffffff", align = "left") {
  ctx.textAlign = align;
  ctx.fillStyle = "rgba(5, 9, 15, 0.94)";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawEllipse(ctx, x, y, radiusX, radiusY) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
}

function pathPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}

function drawSegment(ctx, startX, startY, endX, endY, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function drawDiamond(ctx, x, y, size, fill, stroke = null) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function fillGlow(ctx, x, y, radiusX, radiusY, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  drawEllipse(ctx, x, y, radiusX, radiusY);
  ctx.fill();
  ctx.restore();
}

function drawPanel(
  ctx,
  x,
  y,
  width,
  height,
  {
    fillTop = "#34241b",
    fillBottom = "#121a27",
    border = THEME.antiqueGold,
    innerBorder = "rgba(232, 220, 194, 0.12)",
    glow = null,
  } = {},
) {
  if (glow) {
    fillGlow(ctx, x + width / 2, y + height / 2, width / 2 + 10, height / 2 + 8, glow, 0.14);
  }

  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, fillTop);
  gradient.addColorStop(1, fillBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.strokeStyle = innerBorder;
  ctx.strokeRect(x + 2.5, y + 2.5, width - 5, height - 5);

  ctx.fillStyle = border;
  ctx.fillRect(x + 1, y + 1, 2, 2);
  ctx.fillRect(x + width - 3, y + 1, 2, 2);
  ctx.fillRect(x + 1, y + height - 3, 2, 2);
  ctx.fillRect(x + width - 3, y + height - 3, 2, 2);
}

function drawBanner(ctx, x, y, width, height, color, accent) {
  ctx.fillStyle = THEME.antiqueGold;
  ctx.fillRect(x - 1, y - 2, width + 2, 2);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - 5);
  ctx.lineTo(x + width / 2, y + height);
  ctx.lineTo(x, y + height - 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.fillRect(x + 2, y + 2, width - 4, 2);
  ctx.fillRect(x + Math.floor(width / 2) - 1, y + 5, 2, height - 10);
}

function drawLantern(ctx, x, y, time, hue = THEME.gold) {
  const pulse = 0.16 + Math.sin(time * 3.2 + x * 0.1) * 0.04;
  fillGlow(ctx, x, y + 2, 8, 6, hue, pulse);
  ctx.fillStyle = THEME.antiqueGold;
  ctx.fillRect(x - 1, y - 4, 3, 3);
  ctx.fillStyle = THEME.parchment;
  ctx.fillRect(x, y - 3, 1, 2);
}

function drawSegmentedCircle(ctx, x, y, radius, segments, color, alpha = 1, lineWidth = 1.5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  for (let segment = 0; segment < segments; segment += 1) {
    const start = (segment / segments) * Math.PI * 2;
    const end = start + (Math.PI * 2) / segments * 0.56;
    ctx.moveTo(x + Math.cos(start) * radius, y + Math.sin(start) * radius);
    ctx.arc(x, y, radius, start, end);
  }

  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx, game) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
  sky.addColorStop(0, "#16243A");
  sky.addColorStop(0.36, THEME.indigo);
  sky.addColorStop(1, THEME.midnight);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  const glow = ctx.createRadialGradient(VIRTUAL_WIDTH / 2, 28, 12, VIRTUAL_WIDTH / 2, 28, 180);
  glow.addColorStop(0, "rgba(212, 176, 106, 0.14)");
  glow.addColorStop(0.45, "rgba(127, 214, 229, 0.06)");
  glow.addColorStop(1, "rgba(11, 27, 43, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, 110);

  ctx.fillStyle = "#0A121B";
  for (let x = -8; x < VIRTUAL_WIDTH + 40; x += 44) {
    ctx.fillRect(x, 0, 28, 26);
    ctx.fillRect(x + 5, 26, 18, 14);
    ctx.fillStyle = "rgba(212, 176, 106, 0.16)";
    ctx.fillRect(x + 11, 11, 3, 6);
    ctx.fillStyle = "#0A121B";
  }

  ctx.fillStyle = "#111C29";
  ctx.fillRect(0, 36, VIRTUAL_WIDTH, 18);

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY + 3, ARENA.radiusX + 70, ARENA.radiusY + 54);
  ctx.fillStyle = "#111922";
  ctx.fill();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY + 3, ARENA.radiusX + 56, ARENA.radiusY + 42);
  ctx.fillStyle = "#271B16";
  ctx.fill();

  const banners = [
    { x: 34, color: THEME.burgundy, accent: THEME.gold },
    { x: 98, color: "#2B3E6B", accent: THEME.silver },
    { x: 162, color: THEME.forest, accent: THEME.gold },
    { x: 226, color: THEME.burgundy, accent: THEME.parchment },
    { x: 290, color: "#2B3E6B", accent: THEME.cyan },
    { x: 354, color: THEME.forest, accent: THEME.gold },
    { x: 418, color: THEME.burgundy, accent: THEME.parchment },
  ];

  banners.forEach((banner, index) => {
    drawBanner(ctx, banner.x, 16 + (index % 2), 20, 22 + (index % 3), banner.color, banner.accent);
  });

  for (const spectator of game.crowd) {
    const bounce = Math.sin(game.time * 3 + spectator.bounce) * 0.5;
    const x = Math.round(spectator.x);
    const y = Math.round(spectator.y + bounce);
    const silhouette = spectator.y > ARENA.centerY ? "#150F0D" : "#17212D";
    const width = spectator.size + 1;
    const height = spectator.size + 2;

    ctx.fillStyle = silhouette;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = spectator.color;
    ctx.fillRect(x, y - 1, width, 1);
  }

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY + 3, ARENA.radiusX + 33, ARENA.radiusY + 22);
  ctx.fillStyle = "#0E1622";
  ctx.fill();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY + 2, ARENA.radiusX + 29, ARENA.radiusY + 19);
  ctx.strokeStyle = "rgba(176, 138, 71, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let lamp = 0; lamp < 14; lamp += 1) {
    const angle = -0.18 + (lamp / 14) * Math.PI * 2;
    const x = ARENA.centerX + Math.cos(angle) * (ARENA.radiusX + 38);
    const y = ARENA.centerY + Math.sin(angle) * (ARENA.radiusY + 27);
    drawLantern(ctx, Math.round(x), Math.round(y), game.time, lamp % 2 === 0 ? THEME.gold : THEME.cyan);
  }

  fillGlow(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 42, ARENA.radiusY + 26, THEME.cyan, 0.06);
}

function drawFieldRunes(ctx, time) {
  for (let rune = 0; rune < 12; rune += 1) {
    const angle = (rune / 12) * Math.PI * 2 + time * 0.05;
    const x = ARENA.centerX + Math.cos(angle) * (ARENA.radiusX - 18);
    const y = ARENA.centerY + Math.sin(angle) * (ARENA.radiusY - 12);
    const accent = rune % 2 === 0 ? THEME.gold : THEME.cyan;
    drawDiamond(ctx, Math.round(x), Math.round(y), 3, accent, "rgba(8, 16, 24, 0.5)");
    drawSegment(
      ctx,
      x,
      y,
      ARENA.centerX + Math.cos(angle) * (ARENA.radiusX - 10),
      ARENA.centerY + Math.sin(angle) * (ARENA.radiusY - 6),
      "rgba(232, 220, 194, 0.2)",
      1,
    );
  }
}

function drawField(ctx, time) {
  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 6, ARENA.radiusY + 6);
  ctx.fillStyle = THEME.walnut;
  ctx.fill();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 2, ARENA.radiusY + 2);
  ctx.fillStyle = "#302115";
  ctx.fill();

  ctx.save();
  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX, ARENA.radiusY);
  ctx.clip();

  const grass = ctx.createLinearGradient(0, ARENA.centerY - ARENA.radiusY, 0, ARENA.centerY + ARENA.radiusY);
  grass.addColorStop(0, "#355F3D");
  grass.addColorStop(0.45, THEME.forest);
  grass.addColorStop(1, THEME.emerald);
  ctx.fillStyle = grass;
  ctx.fillRect(ARENA.centerX - ARENA.radiusX, ARENA.centerY - ARENA.radiusY, ARENA.radiusX * 2, ARENA.radiusY * 2);

  const fieldTop = Math.round(ARENA.centerY - ARENA.radiusY);
  const stripeHeight = 16;
  const stripeCount = Math.ceil((ARENA.radiusY * 2) / stripeHeight) + 1;
  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    ctx.fillStyle = stripe % 2 === 0 ? "rgba(70, 111, 61, 0.28)" : "rgba(31, 74, 52, 0.22)";
    ctx.fillRect(
      ARENA.centerX - ARENA.radiusX,
      fieldTop + stripe * stripeHeight,
      ARENA.radiusX * 2,
      stripeHeight,
    );
  }

  for (let patch = 0; patch < 7; patch += 1) {
    const x = ARENA.centerX - ARENA.radiusX + 32 + patch * 48;
    const y = ARENA.centerY - 56 + (patch % 3) * 38;
    fillGlow(ctx, x, y, 18, 12, patch % 2 === 0 ? THEME.forest : THEME.emerald, 0.12);
  }

  ctx.strokeStyle = "rgba(174, 183, 193, 0.26)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ARENA.centerX, ARENA.centerY - ARENA.radiusY);
  ctx.lineTo(ARENA.centerX, ARENA.centerY + ARENA.radiusY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ARENA.centerX - ARENA.radiusX + 38, ARENA.centerY, 26, -1.05, 1.05);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ARENA.centerX + ARENA.radiusX - 38, ARENA.centerY, 26, Math.PI - 1.05, Math.PI + 1.05);
  ctx.stroke();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, 32, 32);
  ctx.strokeStyle = "rgba(212, 176, 106, 0.78)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, 22, 22);
  ctx.strokeStyle = "rgba(127, 214, 229, 0.45)";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX - 12, ARENA.radiusY - 8);
  ctx.strokeStyle = "rgba(212, 176, 106, 0.44)";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  drawFieldRunes(ctx, time);
  ctx.restore();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX, ARENA.radiusY);
  ctx.strokeStyle = THEME.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 4, ARENA.radiusY + 4);
  ctx.strokeStyle = "rgba(174, 183, 193, 0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = THEME.cyan;
  ctx.lineWidth = 7;
  drawEllipse(ctx, ARENA.centerX, ARENA.centerY, ARENA.radiusX + 1, ARENA.radiusY + 1);
  ctx.stroke();
  ctx.restore();
}

function drawStandards(ctx, time) {
  const sides = [
    { side: -1, banner: "#314575", accent: THEME.cyan },
    { side: 1, banner: THEME.burgundy, accent: THEME.gold },
  ];

  sides.forEach(({ side, banner, accent }) => {
    const x = ARENA.centerX + side * (ARENA.radiusX - 10);
    const topY = ARENA.centerY - 42;
    const baseY = ARENA.centerY + 46;

    ctx.strokeStyle = THEME.antiqueGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, baseY);
    ctx.stroke();

    ctx.fillStyle = banner;
    ctx.beginPath();
    ctx.moveTo(x, topY + 8);
    ctx.lineTo(x - side * 13, topY + 12);
    ctx.lineTo(x, topY + 19);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(x - side * 7), topY + 12, 4, 2);

    ctx.fillStyle = banner;
    ctx.beginPath();
    ctx.moveTo(x, topY + 26);
    ctx.lineTo(x - side * 11, topY + 30);
    ctx.lineTo(x, topY + 36);
    ctx.closePath();
    ctx.fill();

    drawLantern(ctx, Math.round(x), Math.round(baseY), time, accent);
  });
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

function drawWall(ctx, wall, time) {
  const alpha = clamp(wall.timer / wall.maxTimer, 0, 1);
  const { ax, ay, bx, by } = wallEndpoints(wall);

  ctx.save();
  ctx.globalAlpha = 0.42 + alpha * 0.28;
  drawSegment(ctx, ax, ay, bx, by, wall.color, wall.thickness + 3);
  ctx.globalAlpha = 1;
  drawSegment(ctx, ax, ay, bx, by, THEME.parchment, wall.thickness * 0.34);

  for (let rune = 0; rune < 3; rune += 1) {
    const t = rune / 2;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const pulse = 1 + Math.sin(time * 5 + rune + wall.x) * 0.25;
    drawDiamond(ctx, Math.round(x), Math.round(y), Math.max(2, Math.round(2 * pulse)), wall.color, THEME.parchment);
  }
  ctx.restore();
}

function drawProjectile(ctx, projectile) {
  const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
  const dirX = projectile.vx / speed;
  const dirY = projectile.vy / speed;

  if (projectile.type === "fireball") {
    fillGlow(ctx, projectile.x, projectile.y, projectile.radius + 7, projectile.radius + 6, THEME.gold, 0.22);
    ctx.fillStyle = "rgba(110, 34, 51, 0.45)";
    ctx.beginPath();
    ctx.ellipse(
      projectile.x - dirX * 5,
      projectile.y - dirY * 5,
      projectile.radius + 3,
      projectile.radius + 1,
      Math.atan2(dirY, dirX),
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = "#FFF0C8";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius - 1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (projectile.type === "shockBolt") {
    fillGlow(ctx, projectile.x, projectile.y, projectile.radius + 7, projectile.radius + 7, THEME.cyan, 0.2);
    drawSegment(
      ctx,
      projectile.x - dirX * 8,
      projectile.y - dirY * 8,
      projectile.x + dirX * 3,
      projectile.y + dirY * 3,
      "rgba(127, 214, 229, 0.72)",
      2,
    );
    drawSegment(
      ctx,
      projectile.x - dirX * 6 - dirY * 2,
      projectile.y - dirY * 6 + dirX * 2,
      projectile.x + dirX * 2 + dirY * 2,
      projectile.y + dirY * 2 - dirX * 2,
      "rgba(174, 183, 193, 0.58)",
      1,
    );
    ctx.fillStyle = "#E6FAFF";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius - 1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (projectile.type === "slowShot") {
    fillGlow(ctx, projectile.x, projectile.y, projectile.radius + 7, projectile.radius + 6, "#8bcf9c", 0.18);
    drawSegment(
      ctx,
      projectile.x - dirX * 7,
      projectile.y - dirY * 7,
      projectile.x + dirX * 2,
      projectile.y + dirY * 2,
      "rgba(139, 207, 156, 0.54)",
      2,
    );
    ctx.strokeStyle = THEME.parchment;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius + 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#EAF9EE";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius - 1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  fillGlow(ctx, projectile.x, projectile.y, projectile.radius + 6, projectile.radius + 6, THEME.cyan, 0.18);
  drawSegment(
    ctx,
    projectile.x - dirX * 8,
    projectile.y - dirY * 8,
    projectile.x + dirX * 2,
    projectile.y + dirY * 2,
    "rgba(174, 183, 193, 0.55)",
    2,
  );
  ctx.strokeStyle = THEME.silver;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius + 1.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#E6FAFF";
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius - 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawStrike(ctx, strike, time) {
  if (!strike.resolved) {
    const pulse = 1 + Math.sin(time * 10 + strike.x) * 0.05;
    fillGlow(ctx, strike.x, strike.y, strike.radius + 11, strike.radius + 11, THEME.violet, 0.12);
    ctx.fillStyle = "rgba(157, 123, 234, 0.12)";
    ctx.beginPath();
    ctx.arc(strike.x, strike.y, strike.radius, 0, Math.PI * 2);
    ctx.fill();

    drawSegmentedCircle(ctx, strike.x, strike.y, strike.radius * pulse, 10, THEME.gold, 0.9, 1.5);
    drawSegmentedCircle(ctx, strike.x, strike.y, strike.radius * 0.68 * pulse, 8, THEME.cyan, 0.7, 1);
    drawDiamond(ctx, strike.x, strike.y, 4, THEME.parchment, THEME.violet);
    return;
  }

  const alpha = clamp(strike.flashTimer / 0.3, 0, 1);
  ctx.save();
  ctx.strokeStyle = `rgba(232, 220, 194, ${alpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(strike.x - 10, 0);
  ctx.lineTo(strike.x - 2, strike.y - 18);
  ctx.lineTo(strike.x + 6, strike.y - 6);
  ctx.lineTo(strike.x - 1, strike.y + 2);
  ctx.lineTo(strike.x + 3, strike.y + strike.radius + 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(127, 214, 229, ${alpha * 0.78})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(strike.x - 8, 0);
  ctx.lineTo(strike.x + 1, strike.y - 15);
  ctx.lineTo(strike.x - 4, strike.y - 2);
  ctx.lineTo(strike.x + 1, strike.y + strike.radius + 4);
  ctx.stroke();
  ctx.restore();

  fillGlow(ctx, strike.x, strike.y, strike.radius + 12, strike.radius + 12, THEME.cyan, alpha * 0.18);
  ctx.fillStyle = `rgba(232, 220, 194, ${alpha * 0.45})`;
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, strike.radius + 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx, particles) {
  for (const particle of particles) {
    const alpha = clamp(particle.lifetime / particle.maxLifetime, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);

    if (particle.size > 1) {
      ctx.fillStyle = THEME.parchment;
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function drawStunEffect(ctx, mage, time) {
  for (let rune = 0; rune < 3; rune += 1) {
    const angle = time * 7 + rune * ((Math.PI * 2) / 3);
    const x = mage.x + Math.cos(angle) * 10;
    const y = mage.y - 18 + Math.sin(angle) * 5;
    drawDiamond(ctx, Math.round(x), Math.round(y), 3, THEME.cyan, THEME.parchment);
  }
}

function drawMage(ctx, mage, time) {
  const bob = Math.sin(mage.walkCycle) * (Math.hypot(mage.vx, mage.vy) > 1 ? 1.3 : 0.35);
  const x = Math.round(mage.x);
  const y = Math.round(mage.y + bob);
  const aim = angleToVector(mage.aimAngle);
  const perp = { x: -aim.y, y: aim.x };
  const walking = Math.hypot(mage.vx, mage.vy) > 1;
  const gait = Math.sin(mage.walkCycle * 1.2) * (walking ? 2.5 : 0.4);
  const sway = Math.cos(mage.walkCycle * 1.2) * (walking ? 1.8 : 0.6);
  const wandHandX = x + aim.x * 7 + perp.x * 3;
  const wandHandY = y - 2 + aim.y * 6 + perp.y * 3;
  const wandTipX = wandHandX + aim.x * 8;
  const wandTipY = wandHandY + aim.y * 8;
  const bookX = x - aim.x * 4 - perp.x * 7 + sway * 0.3;
  const bookY = y - 3 - aim.y * 2 - perp.y * 6 + sway * 0.2;
  const leftShoulderX = x - 4;
  const rightShoulderX = x + 4;
  const shoulderY = y - 4;
  const trimColor = mage.isEnemy ? THEME.gold : THEME.silver;
  const accentColor = mage.isEnemy ? THEME.gold : THEME.cyan;
  const cloakColor = mage.isEnemy ? "#401621" : "#202F4C";
  const mantleColor = mage.isEnemy ? "#552132" : "#25385A";
  const outline = "#100B0A";

  const cloak = [
    { x: x - 8, y: y - 7 },
    { x: x + 8, y: y - 7 },
    { x: x + 11, y: y + 3 },
    { x: x, y: y + 14 },
    { x: x - 11, y: y + 3 },
  ];

  const robe = [
    { x: x - 9, y: y - 6 },
    { x: x + 9, y: y - 6 },
    { x: x + 10, y: y + 5 },
    { x: x + 5 + gait * 0.3, y: y + 12 },
    { x: x - 5 - gait * 0.3, y: y + 12 },
    { x: x - 10, y: y + 5 },
  ];

  const mantle = [
    { x: x - 8, y: y - 8 },
    { x: x + 8, y: y - 8 },
    { x: x + 6, y: y - 2 },
    { x: x - 6, y: y - 2 },
  ];

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (mage.boostTimer > 0) {
    fillGlow(ctx, x, y + 4, 18, 12, accentColor, 0.18);
    drawSegmentedCircle(ctx, x, y + 4, 14, 10, accentColor, 0.65, 1.2);
  }

  if (mage.immortalTimer > 0) {
    fillGlow(ctx, x, y + 3, 20, 14, THEME.gold, 0.14);
    drawSegmentedCircle(ctx, x, y + 3, 17, 12, THEME.parchment, 0.72, 1.2);
  } else if (mage.slowTimer > 0) {
    fillGlow(ctx, x, y + 5, 15, 10, "#8bcf9c", 0.12);
  }

  fillGlow(ctx, x, y + 1, 15, 13, mage.glowColor, 0.12);

  drawSegment(ctx, rightShoulderX, shoulderY, wandHandX, wandHandY, mantleColor, 2);
  drawSegment(ctx, leftShoulderX, shoulderY, bookX, bookY, mantleColor, 2);

  pathPolygon(ctx, cloak);
  ctx.fillStyle = cloakColor;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  pathPolygon(ctx, robe);
  ctx.fillStyle = mage.robeColor;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  pathPolygon(ctx, mantle);
  ctx.fillStyle = mantleColor;
  ctx.fill();

  ctx.fillStyle = trimColor;
  ctx.fillRect(x - 6, y + 7, 12, 1);
  ctx.fillRect(x - 1, y - 5, 2, 11);
  ctx.fillRect(x - 6, y - 6, 2, 2);
  ctx.fillRect(x + 4, y - 6, 2, 2);

  ctx.fillStyle = THEME.walnut;
  ctx.fillRect(x - 5, y + 2, 10, 2);
  ctx.fillStyle = THEME.gold;
  ctx.fillRect(x - 1, y + 2, 2, 2);

  ctx.fillStyle = mage.isEnemy ? "#D9B79A" : "#E6C9B0";
  ctx.beginPath();
  ctx.arc(x, y - 10, 4.5, 0, Math.PI * 2);
  ctx.fill();

  const hood = [
    { x: x - 6, y: y - 12 },
    { x: x, y: y - 18 },
    { x: x + 6, y: y - 12 },
    { x: x + 4, y: y - 7 },
    { x: x - 4, y: y - 7 },
  ];
  pathPolygon(ctx, hood);
  ctx.fillStyle = mage.hatColor;
  ctx.fill();

  ctx.fillStyle = trimColor;
  ctx.fillRect(x - 2, y - 15, 4, 1);

  ctx.fillStyle = cloakColor;
  ctx.beginPath();
  ctx.arc(wandHandX, wandHandY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bookX, bookY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(Math.round(bookX - 6), Math.round(bookY - 4), 11, 8);
  ctx.fillStyle = mage.isEnemy ? "#5A2D1F" : "#33273F";
  ctx.fillRect(Math.round(bookX - 5), Math.round(bookY - 5), 10, 8);
  ctx.fillStyle = THEME.parchment;
  ctx.fillRect(Math.round(bookX - 3), Math.round(bookY - 4), 6, 6);
  ctx.fillStyle = trimColor;
  ctx.fillRect(Math.round(bookX), Math.round(bookY - 5), 1, 8);
  ctx.fillRect(Math.round(bookX - 4), Math.round(bookY - 2), 2, 1);

  drawSegment(ctx, wandHandX, wandHandY, wandTipX, wandTipY, THEME.walnut, 2);
  drawSegment(ctx, wandHandX + aim.x * 2, wandHandY + aim.y * 2, wandTipX, wandTipY, mage.wandColor, 1.2);
  ctx.fillStyle = mage.wandColor;
  ctx.beginPath();
  ctx.arc(wandHandX, wandHandY, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mage.castFlash > 0 ? mage.glowColor : mage.wandColor;
  ctx.beginPath();
  ctx.arc(wandTipX, wandTipY, mage.castFlash > 0 ? 2.4 : 1.6, 0, Math.PI * 2);
  ctx.fill();

  if (mage.castFlash > 0) {
    fillGlow(ctx, wandTipX, wandTipY, 6, 6, mage.glowColor, 0.28);
  }

  ctx.fillStyle = outline;
  ctx.fillRect(Math.round(x - 5 + gait), y + 12, 3, 2);
  ctx.fillRect(Math.round(x + 2 - gait), y + 12, 3, 2);

  if (mage.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${mage.hurtFlash * 0.45})`;
    ctx.fillRect(x - 12, y - 20, 24, 34);
  }

  if (mage.stunTimer > 0) {
    drawStunEffect(ctx, mage, time);
  }
}

function drawCrosshair(ctx, mouse, pulse) {
  const x = Math.round(mouse.x);
  const y = Math.round(mouse.y);
  const size = 6 + Math.sin(pulse * 8) * 1.1;

  drawSegmentedCircle(ctx, x, y, size + 2, 4, THEME.cyan, 0.72, 1.2);
  drawDiamond(ctx, x, y, 3, "rgba(232, 220, 194, 0.24)", THEME.gold);

  ctx.strokeStyle = "rgba(232, 220, 194, 0.86)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x - 2, y);
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y - 2);
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

function drawMoveTarget(ctx, moveTarget, time) {
  if (!moveTarget) {
    return;
  }

  const pulse = 1 + Math.sin(time * 8) * 0.08;
  fillGlow(ctx, moveTarget.x, moveTarget.y, 11, 11, THEME.cyan, 0.12);
  drawSegmentedCircle(ctx, moveTarget.x, moveTarget.y, 8 * pulse, 8, THEME.gold, 0.82, 1.5);
  drawSegmentedCircle(ctx, moveTarget.x, moveTarget.y, 13 * pulse, 12, THEME.cyan, 0.54, 1);
  drawDiamond(ctx, Math.round(moveTarget.x), Math.round(moveTarget.y), 4, "rgba(127, 214, 229, 0.18)", THEME.parchment);
}

function drawHealthBar(ctx, label, mage, x, y, align = "left") {
  const width = 136;
  const height = 26;
  const startX = align === "right" ? x - width : x;
  const accent = mage.isEnemy ? THEME.gold : THEME.cyan;
  const healthRatio = mage.health / mage.maxHealth;
  const crestX = align === "right" ? startX + width - 12 : startX + 12;

  drawPanel(ctx, startX, y, width, height, {
    fillTop: "#3A281D",
    fillBottom: "#111925",
    border: mage.isEnemy ? THEME.gold : THEME.silver,
    glow: mage.glowColor,
  });

  ctx.fillStyle = "rgba(232, 220, 194, 0.86)";
  if (align === "right") {
    ctx.fillRect(startX + 74, y + 4, 52, 7);
    textShadow(ctx, label, startX + 122, y + 10, THEME.midnight, "right");
  } else {
    ctx.fillRect(startX + 10, y + 4, 52, 7);
    textShadow(ctx, label, startX + 14, y + 10, THEME.midnight);
  }

  fillGlow(ctx, crestX, y + 18, 5, 5, mage.glowColor, 0.28);
  ctx.fillStyle = mage.robeColor;
  ctx.beginPath();
  ctx.arc(crestX, y + 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  const barX = startX + 24;
  const barY = y + 15;
  const barWidth = width - 48;
  ctx.fillStyle = "rgba(8, 12, 20, 0.86)";
  ctx.fillRect(barX, barY, barWidth, 7);

  const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  gradient.addColorStop(0, accent);
  gradient.addColorStop(1, mage.robeColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(barX + 1, barY + 1, Math.max(0, (barWidth - 2) * healthRatio), 5);

  ctx.strokeStyle = "rgba(212, 176, 106, 0.52)";
  ctx.strokeRect(barX + 0.5, barY + 0.5, barWidth - 1, 6);
  textShadow(ctx, `${Math.ceil(mage.health)}`, startX + width - 10, y + 22, THEME.parchment, "right");
}

function drawCenterPlaque(ctx) {
  const width = 156;
  const height = 22;
  const x = Math.round(VIRTUAL_WIDTH / 2 - width / 2);
  const y = 8;

  drawPanel(ctx, x, y, width, height, {
    fillTop: "#37261C",
    fillBottom: "#111A28",
    border: THEME.antiqueGold,
    glow: THEME.cyan,
  });

  ctx.font = "bold 7px monospace";
  textShadow(ctx, "CLUBE DE DUELO", VIRTUAL_WIDTH / 2, y + 9, THEME.gold, "center");
  textShadow(ctx, "mouse mira  |  qwer conjuram", VIRTUAL_WIDTH / 2, y + 17, THEME.cyan, "center");
  ctx.font = "bold 8px monospace";
}

function drawCooldowns(ctx, player) {
  const panelWidth = 248;
  const panelHeight = 42;
  const panelX = Math.round(VIRTUAL_WIDTH / 2 - panelWidth / 2);
  const panelY = VIRTUAL_HEIGHT - panelHeight - 6;
  drawPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
    fillTop: "#3C2A1E",
    fillBottom: "#111925",
    border: THEME.antiqueGold,
    glow: THEME.gold,
  });

  ABILITY_SLOTS.forEach((slot, index) => {
    const abilityId = player.loadout[slot.id];
    const spell = SPELLS[abilityId];
    const slotX = panelX + 8 + index * 58;
    const slotY = panelY + 8;
    const slotWidth = 52;
    const slotHeight = 26;
    const cooldown = player.cooldowns[abilityId];
    const maxCooldown = spell.cooldown;
    const ready = cooldown <= 0;

    drawPanel(ctx, slotX, slotY, slotWidth, slotHeight, {
      fillTop: ready ? "#1B2331" : "#161B25",
      fillBottom: "#0E141C",
      border: ready ? THEME.antiqueGold : "rgba(174, 183, 193, 0.28)",
      glow: ready ? spell.color : null,
    });

    ctx.fillStyle = ABILITY_OVERLAYS[abilityId];
    ctx.fillRect(slotX + 3, slotY + 3, slotWidth - 6, slotHeight - 6);

    if (cooldown > 0) {
      const ratio = cooldown / maxCooldown;
      ctx.fillStyle = "rgba(8, 12, 20, 0.58)";
      ctx.fillRect(slotX + 3, slotY + 3, slotWidth - 6, slotHeight - 6 - (slotHeight - 6) * ratio);
      textShadow(
        ctx,
        cooldown.toFixed(cooldown >= 1 ? 1 : 2),
        slotX + slotWidth / 2,
        slotY + 15,
        THEME.parchment,
        "center",
      );
    } else {
      fillGlow(ctx, slotX + slotWidth / 2, slotY + 13, 14, 8, spell.color, 0.12);
      drawDiamond(ctx, slotX + slotWidth / 2, slotY + 13, 3, THEME.parchment, spell.color);
    }

    ctx.font = "bold 7px monospace";
    textShadow(ctx, slot.label, slotX + 5, slotY + 7, THEME.gold);
    textShadow(ctx, spell.hudLabel, slotX + slotWidth / 2, slotY + 23, THEME.parchment, "center");
    ctx.font = "bold 8px monospace";
  });
}

function drawOverlay(ctx, game) {
  ctx.font = "bold 8px monospace";
  drawHealthBar(ctx, "VOCE", game.player, 12, 10);
  drawHealthBar(ctx, "RIVAL", game.enemy, VIRTUAL_WIDTH - 12, 10, "right");
  drawCenterPlaque(ctx);
  drawCooldowns(ctx, game.player);

  if (game.player.stunTimer > 0) {
    textShadow(ctx, "Atordoado", 18, 43, THEME.cyan);
  } else if (game.player.immortalTimer > 0) {
    textShadow(ctx, "Imortal", 18, 43, THEME.gold);
  } else if (game.player.slowTimer > 0) {
    textShadow(ctx, "Lento", 18, 43, "#8bcf9c");
  }

  if (game.enemy.stunTimer > 0) {
    textShadow(ctx, "Rival atordoado", VIRTUAL_WIDTH - 18, 43, THEME.cyan, "right");
  } else if (game.enemy.immortalTimer > 0) {
    textShadow(ctx, "Rival imortal", VIRTUAL_WIDTH - 18, 43, THEME.gold, "right");
  } else if (game.enemy.slowTimer > 0) {
    textShadow(ctx, "Rival lento", VIRTUAL_WIDTH - 18, 43, "#8bcf9c", "right");
  }

  if (game.result) {
    ctx.fillStyle = "rgba(5, 9, 15, 0.58)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const boxWidth = 188;
    const boxHeight = 70;
    const boxX = Math.round(VIRTUAL_WIDTH / 2 - boxWidth / 2);
    const boxY = Math.round(VIRTUAL_HEIGHT / 2 - boxHeight / 2);
    drawPanel(ctx, boxX, boxY, boxWidth, boxHeight, {
      fillTop: "#412C21",
      fillBottom: "#121B29",
      border: THEME.gold,
      glow: THEME.cyan,
    });

    ctx.font = "bold 18px monospace";
    textShadow(ctx, game.result, VIRTUAL_WIDTH / 2, boxY + 29, THEME.parchment, "center");
    ctx.font = "bold 8px monospace";
    textShadow(ctx, "Pressione Espaco para recomecar", VIRTUAL_WIDTH / 2, boxY + 48, THEME.cyan, "center");
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
  drawField(ctx, game.time);
  drawStandards(ctx, game.time);
  drawMoveTarget(ctx, game.player.moveTarget, game.time);

  for (const wall of game.walls) {
    drawWall(ctx, wall, game.time);
  }

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
    ctx.fillStyle = `rgba(232, 220, 194, ${game.impactFlash * 0.48})`;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  drawOverlay(ctx, game);
}
