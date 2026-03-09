import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./config.js";
import { createGame, updateGame } from "./game.js";
import { createInput } from "./input.js";
import { renderGame } from "./render.js";

const canvas = document.getElementById("game");
const screen = canvas.getContext("2d");
screen.imageSmoothingEnabled = false;

const buffer = document.createElement("canvas");
buffer.width = VIRTUAL_WIDTH;
buffer.height = VIRTUAL_HEIGHT;
const context = buffer.getContext("2d");
context.imageSmoothingEnabled = false;

const input = createInput(canvas);
let game = createGame();
let viewport = {
  x: 0,
  y: 0,
  width: VIRTUAL_WIDTH,
  height: VIRTUAL_HEIGHT,
};

function resize() {
  const width = Math.max(320, Math.floor(canvas.clientWidth));
  const height = Math.max(180, Math.floor(canvas.clientHeight));
  canvas.width = width;
  canvas.height = height;

  let scale = Math.floor(Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT));
  if (scale < 1) {
    scale = Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
  }

  viewport = {
    x: Math.floor((width - VIRTUAL_WIDTH * scale) / 2),
    y: Math.floor((height - VIRTUAL_HEIGHT * scale) / 2),
    width: Math.floor(VIRTUAL_WIDTH * scale),
    height: Math.floor(VIRTUAL_HEIGHT * scale),
  };

  input.setViewport(viewport);
}

window.addEventListener("resize", resize);
resize();

let previousTime = performance.now();

function frame(now) {
  const dt = Math.min((now - previousTime) / 1000, 1 / 24);
  previousTime = now;

  game = updateGame(game, input, dt);
  renderGame(context, game, input);

  screen.fillStyle = "#050916";
  screen.fillRect(0, 0, canvas.width, canvas.height);
  screen.imageSmoothingEnabled = false;
  screen.drawImage(buffer, viewport.x, viewport.y, viewport.width, viewport.height);

  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
