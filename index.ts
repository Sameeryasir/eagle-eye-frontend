import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

import App from './App';
import './pusherClient';

console.log('🚀 App initializing with Pusher...');

registerRootComponent(App);
