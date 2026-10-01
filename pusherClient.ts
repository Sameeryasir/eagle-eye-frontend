// @ts-nocheck
import Pusher from 'pusher-js/react-native';

Pusher.logToConsole = false;

const pusher = new Pusher("2a365c8d4fd51cd8b223", {
  cluster: "ap2",
  forceTLS: true,
});

export default pusher;
