// Simple Custom Event Emitter for App Communication (MCP Context 7)
// This allows different parts of the app to communicate without complex refs

class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }
}

// Create a global event emitter instance
const appEmitter = new SimpleEventEmitter();

// Make it available globally
global.appEmitter = appEmitter;

export default appEmitter;
