import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./config.js";
import { createGame, updateGame } from "./game.js";
import { createInput } from "./input.js";
import { renderGame } from "./render.js";

const canvas = document.getElementById("game");
const lobby = document.getElementById("lobby");
const lobbyForm = document.getElementById("lobby-form");
const startDuelButton = document.getElementById("start-duel");
const openLobbyButton = document.getElementById("open-lobby");
const screen = canvas.getContext("2d");
screen.imageSmoothingEnabled = false;

const buffer = document.createElement("canvas");
buffer.width = VIRTUAL_WIDTH;
buffer.height = VIRTUAL_HEIGHT;
const context = buffer.getContext("2d");
context.imageSmoothingEnabled = false;

const input = createInput(canvas);
let mode = "lobby";
let game = null;
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

function readLobbySelection() {
  const formData = new FormData(lobbyForm);
  return {
    hatColor: formData.get("hat-color"),
    wandColor: formData.get("wand-color"),
    loadout: {
      q: formData.get("q-ability"),
      w: formData.get("w-ability"),
      e: formData.get("e-ability"),
      r: formData.get("r-ability"),
    },
  };
}

function showLobby() {
  mode = "lobby";
  lobby.hidden = false;
  openLobbyButton.hidden = true;
  input.clearMoveTarget();
  game = createGame(readLobbySelection());
  previousTime = performance.now();
}

function startDuel() {
  mode = "battle";
  lobby.hidden = true;
  openLobbyButton.hidden = false;
  input.clearMoveTarget();
  game = createGame(readLobbySelection());
  previousTime = performance.now();
}

startDuelButton.addEventListener("click", startDuel);
openLobbyButton.addEventListener("click", showLobby);
lobbyForm.addEventListener("input", () => {
  if (mode === "lobby") {
    game = createGame(readLobbySelection());
  }
});

let previousTime = performance.now();
showLobby();

function frame(now) {
  const dt = Math.min((now - previousTime) / 1000, 1 / 24);
  previousTime = now;

  if (mode === "battle") {
    game = updateGame(game, input, dt);
  }

  renderGame(context, game, input);

  screen.fillStyle = "#081018";
  screen.fillRect(0, 0, canvas.width, canvas.height);
  screen.imageSmoothingEnabled = false;
  screen.drawImage(buffer, viewport.x, viewport.y, viewport.width, viewport.height);

  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
