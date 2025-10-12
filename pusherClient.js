import Pusher from 'pusher-js/react-native';

// --- Pusher Client Configuration (MCP Context 7) ---
// Centralized Pusher instance for real-time chat functionality
// Business Rule: Configure with your Pusher credentials

// Enable logging (optional) - useful for debugging
Pusher.logToConsole = true;

// Create a pusher instance
const pusher = new Pusher("2a365c8d4fd51cd8b223", {
  cluster: "ap2", // Your Pusher cluster
  forceTLS: true, // Force TLS for secure connections
});

// --- Connection State Monitoring (MCP Context 7) ---
// Log connection events for debugging and monitoring

// Connection successful
pusher.connection.bind('connected', () => {
  console.log('✅ Pusher connected successfully!');
  console.log('Connection ID:', pusher.connection.socket_id);
});

// Connection disconnected
pusher.connection.bind('disconnected', () => {
  console.log('❌ Pusher disconnected');
});

// Connection state change
pusher.connection.bind('state_change', (states) => {
  console.log('🔄 Pusher state changed:', states.previous, '→', states.current);
});

// Connection error
pusher.connection.bind('error', (err) => {
  console.error('⚠️ Pusher connection error:', err);
});

export default pusher;

