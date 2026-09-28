// @ts-nocheck
import Pusher from 'pusher-js/react-native';

Pusher.logToConsole = true;

const pusher = new Pusher("2a365c8d4fd51cd8b223", {
  cluster: "ap2",
  forceTLS: true,
});

pusher.connection.bind('connected', () => {
  console.log('✅ Pusher connected successfully!');
  console.log('Connection ID:', pusher.connection.socket_id);
});

pusher.connection.bind('disconnected', () => {
  console.log('❌ Pusher disconnected');
});

pusher.connection.bind('state_change', (states) => {
  console.log('🔄 Pusher state changed:', states.previous, '→', states.current);
});

pusher.connection.bind('error', (err) => {
  console.error('⚠️ Pusher connection error:', err);
});

export default pusher;
