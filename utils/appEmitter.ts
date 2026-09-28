type EmitterCallback = (...args: any[]) => void;

class SimpleEventEmitter {
  private events: Record<string, EmitterCallback[]> = {};

  on(event: string, callback: EmitterCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EmitterCallback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(...args));
    }
  }
}

const appEmitter = new SimpleEventEmitter();

declare const global: typeof globalThis & {
  appEmitter?: SimpleEventEmitter;
};

global.appEmitter = appEmitter;

export default appEmitter;
