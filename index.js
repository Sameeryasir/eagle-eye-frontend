import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

import App from './App';

// --- Initialize Pusher Client (MCP Context 7) ---
// Import pusherClient to initialize the connection when app starts
import './pusherClient';

console.log('🚀 App initializing with Pusher...');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
