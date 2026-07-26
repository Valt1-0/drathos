import logger from "./logger";

// Standard mapping: https://w3c.github.io/gamepad/#remapping
const BUTTONS = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  SELECT: 8,
  START: 9,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

const AXIS_DEADZONE = 0.5;
const INITIAL_REPEAT_MS = 400;
const REPEAT_MS = 120;

const detectPadType = (id = "") => {
  const s = id.toLowerCase();
  if (/dualshock|dualsense|playstation|sony|054c/.test(s)) return "playstation";
  return "xbox";
};

class GamepadService {
  constructor() {
    this.listeners = new Map();
    this.buttonState = new Map();
    this.dirState = new Map();
    this.rafId = null;
    this.started = false;
    this.connected = 0;
    this.padType = "xbox";
    // Big Picture claims this to make the global spatial nav stand down
    this.exclusiveOwner = null;
    this._onConnect = () => this._updateConnected();
    this._onDisconnect = () => this._updateConnected();
  }

  getPadType() {
    return this.padType;
  }

  claimExclusive(owner) {
    this.exclusiveOwner = owner;
  }

  releaseExclusive(owner) {
    if (this.exclusiveOwner === owner) this.exclusiveOwner = null;
  }

  start() {
    if (this.started) return;
    this.started = true;
    window.addEventListener("gamepadconnected", this._onConnect);
    window.addEventListener("gamepaddisconnected", this._onDisconnect);
    this._updateConnected();
  }

  stop() {
    this.started = false;
    this._stopPolling();
    window.removeEventListener("gamepadconnected", this._onConnect);
    window.removeEventListener("gamepaddisconnected", this._onDisconnect);
  }

  _startPolling() {
    if (this.rafId !== null) return;
    const poll = () => {
      this._poll();
      this.rafId = requestAnimationFrame(poll);
    };
    this.rafId = requestAnimationFrame(poll);
  }

  _stopPolling() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.buttonState.clear();
    this.dirState.clear();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  _emit(event, payload) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        logger.warn(`[Gamepad] listener error on "${event}": ${err.message}`);
      }
    });
  }

  _updateConnected() {
    const pads = navigator.getGamepads?.() ?? [];
    const live = [...pads].filter(Boolean);
    const count = live.length;
    const type = count > 0 ? detectPadType(live[0].id) : this.padType;
    if (type !== this.padType) {
      this.padType = type;
      this._emit("typechange", { type });
    }
    if (count > 0 && this.connected === 0) this._emit("connected", { count, type });
    if (count === 0 && this.connected > 0) this._emit("disconnected", {});
    this.connected = count;
    if (count > 0) this._startPolling();
    else this._stopPolling();
  }

  _poll() {
    const pads = navigator.getGamepads?.() ?? [];
    const now = performance.now();
    const directions = { up: false, down: false, left: false, right: false };

    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;

      this._edge(pad, BUTTONS.A, "confirm");
      this._edge(pad, BUTTONS.B, "back");
      this._edge(pad, BUTTONS.X, "action");
      this._edge(pad, BUTTONS.Y, "secondary");
      this._edge(pad, BUTTONS.SELECT, "select");
      this._edge(pad, BUTTONS.START, "menu");
      this._edge(pad, BUTTONS.LB, "prevSection");
      this._edge(pad, BUTTONS.RB, "nextSection");

      directions.up ||= pad.buttons[BUTTONS.DPAD_UP]?.pressed || pad.axes[1] < -AXIS_DEADZONE;
      directions.down ||= pad.buttons[BUTTONS.DPAD_DOWN]?.pressed || pad.axes[1] > AXIS_DEADZONE;
      directions.left ||= pad.buttons[BUTTONS.DPAD_LEFT]?.pressed || pad.axes[0] < -AXIS_DEADZONE;
      directions.right ||= pad.buttons[BUTTONS.DPAD_RIGHT]?.pressed || pad.axes[0] > AXIS_DEADZONE;
    }

    for (const [dir, held] of Object.entries(directions)) {
      const state = this.dirState.get(dir);
      if (held && !state) {
        this.dirState.set(dir, { since: now, lastRepeat: now });
        this._emit("nav", { direction: dir });
      } else if (held && state && now - state.since > INITIAL_REPEAT_MS && now - state.lastRepeat > REPEAT_MS) {
        state.lastRepeat = now;
        this._emit("nav", { direction: dir, repeat: true });
      } else if (!held && state) {
        this.dirState.delete(dir);
      }
    }
  }

  _edge(pad, button, event) {
    const key = `${pad.index}:${button}`;
    const pressed = pad.buttons[button]?.pressed ?? false;
    const was = this.buttonState.get(key) ?? false;
    if (pressed && !was) this._emit(event, {});
    this.buttonState.set(key, pressed);
  }
}

export const gamepadService = new GamepadService();
