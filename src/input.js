import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./config.js";
import { clamp } from "./utils.js";

const PREVENT_DEFAULT_KEYS = new Set([
  "Space",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
]);

export function createInput(canvas) {
  const keysDown = new Set();
  const pressedKeys = new Set();
  const mouse = {
    x: VIRTUAL_WIDTH / 2,
    y: VIRTUAL_HEIGHT / 2,
    inside: false,
    rightDown: false,
  };
  let moveTarget = null;
  let queuedMoveTarget = null;

  let viewport = {
    x: 0,
    y: 0,
    width: canvas.width || VIRTUAL_WIDTH,
    height: canvas.height || VIRTUAL_HEIGHT,
  };

  function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const relativeX = clamp((rawX - viewport.x) / viewport.width, 0, 1);
    const relativeY = clamp((rawY - viewport.y) / viewport.height, 0, 1);

    mouse.x = Math.round(relativeX * VIRTUAL_WIDTH);
    mouse.y = Math.round(relativeY * VIRTUAL_HEIGHT);
    mouse.inside =
      rawX >= viewport.x &&
      rawX <= viewport.x + viewport.width &&
      rawY >= viewport.y &&
      rawY <= viewport.y + viewport.height;
  }

  window.addEventListener("keydown", (event) => {
    if (!keysDown.has(event.code) && !event.repeat) {
      pressedKeys.add(event.code);
    }

    keysDown.add(event.code);

    if (PREVENT_DEFAULT_KEYS.has(event.code)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    keysDown.delete(event.code);

    if (PREVENT_DEFAULT_KEYS.has(event.code)) {
      event.preventDefault();
    }
  });

  canvas.addEventListener("mousemove", updateMousePosition);
  canvas.addEventListener("mouseenter", updateMousePosition);
  canvas.addEventListener("mouseleave", () => {
    mouse.inside = false;
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
  canvas.addEventListener("mousedown", (event) => {
    updateMousePosition(event);

    if (event.button === 2) {
      mouse.rightDown = true;
      moveTarget = { x: mouse.x, y: mouse.y };
      queuedMoveTarget = moveTarget;
      event.preventDefault();
    }
  });
  canvas.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      mouse.rightDown = false;
      event.preventDefault();
    }
  });
  canvas.addEventListener("mousemove", (event) => {
    if (event.buttons & 2) {
      moveTarget = { x: mouse.x, y: mouse.y };
      queuedMoveTarget = moveTarget;
    }
  });

  window.addEventListener("blur", () => {
    keysDown.clear();
    pressedKeys.clear();
    mouse.inside = false;
    mouse.rightDown = false;
    moveTarget = null;
    queuedMoveTarget = null;
  });

  return {
    mouse,
    get moveTarget() {
      return moveTarget;
    },
    isDown(code) {
      return keysDown.has(code);
    },
    wasPressed(code) {
      return pressedKeys.has(code);
    },
    setMoveTarget(target) {
      moveTarget = target;
      queuedMoveTarget = target;
    },
    clearMoveTarget() {
      moveTarget = null;
      queuedMoveTarget = null;
    },
    consumeMoveTarget() {
      const nextTarget = queuedMoveTarget;
      queuedMoveTarget = null;
      return nextTarget;
    },
    setViewport(nextViewport) {
      viewport = nextViewport;
    },
    endFrame() {
      pressedKeys.clear();
    },
  };
}
